---
title: "Compare I/O schedulers on the device behind a Linux workload"
description: "Identify the actual block queue, compare two supported schedulers with reads from a disposable file, then put the original selection back."
pubDate: 2026-04-20
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Linux I/O Scheduling: Choosing the Right Scheduler for Database and Web Servers"
category: "linux"
tags: [Linux, I/O, Performance, Kernel]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

A database's data directory can sit on LVM, a virtual disk or a cloud volume. Start at the mount, follow the block-device tree and apply a test to the queue that actually serves the I/O. On a shared host, changing that queue affects other applications. Use a disposable VM with a dedicated test filesystem for the comparison.

```bash
findmnt -T /var/tmp
lsblk -o NAME,TYPE,PKNAME,SIZE,MOUNTPOINTS
```

For a VM whose mount is on a partition of `vda`, read `/sys/block/vda/queue/scheduler`. Replace `vda` with the device you verified. The name in brackets is active. If the driver offers only `[none]`, record that finding and end the comparison here. Some storage stacks do their scheduling below the guest.

## Keep the file and the read workload constant

The shell below writes a new 64 MiB file under `/var/tmp`. Verify there is space and that the directory belongs to the device under test. It never points fio at a raw block device. Set `candidate` to an **available** name different from the active one.

```bash
device=vda
selector="/sys/block/$device/queue/scheduler"
cat "$selector"
original=$(sed -n 's/.*\[\([^]]*\)\].*/\1/p' "$selector")
candidate=mq-deadline
```

```bash
(
  set -eu
  grep -qw -- "$candidate" "$selector"
  test -n "$original" && test "$candidate" != "$original"
  lab=$(mktemp -d /var/tmp/serverhi-io.XXXXXXXX)
  trap 'printf "%s\n" "$original" | sudo tee "$selector" >/dev/null; rm -f "$lab/probe"; rmdir "$lab"' EXIT
  dd if=/dev/zero of="$lab/probe" bs=1M count=64 conv=fsync status=none
  for policy in "$original" "$candidate"; do
    printf '%s\n' "$policy" | sudo tee "$selector" >/dev/null
    cat "$selector"
    fio --name=read-probe --filename="$lab/probe" --readonly --rw=randread \
      --ioengine=libaio --direct=1 --iodepth=8 --bs=4k --size=64M \
      --time_based --runtime=10 --group_reporting
  done
)
cat "$selector"
```

Read the completion latency percentiles alongside IOPS. Lower mean latency with worse tail latency may be a poor trade for a database waiting on synchronous requests. Repeat the trials in the opposite order and record the kernel, storage class, block size, queue depth and concurrent traffic. A short random-read trial measures this one workload. It cannot predict performance for mixed writes or a different volume class. The final bracketed selection should match the starting one. [Linux scheduler selection](https://docs.kernel.org/block/switching-sched.html) · [fio documentation](https://fio.readthedocs.io/en/latest/fio_doc.html)

## Verification on November 25, 2026

On a virtual `vda` device under Linux 6.8.0-147, one pair of ten-second runs logged 99th-percentile read completion latencies of 124 µs with `mq-deadline` and 130 µs with `none`. Both ran against the same 64 MiB file. The scheduler returned to `mq-deadline`. This single pair is too small to rank the policies for a physical disk.
