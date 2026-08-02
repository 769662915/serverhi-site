---
title: "Your Server's OOM Killer Is Not the Problem — Your Memory Configuration Is"
description: "A systematic guide to understanding Linux memory pressure, monitoring PSI, tuning swap and overcommit settings, and preventing the OOM killer from terminating your processes."
pubDate: 2026-08-03
coverImage: "./cover.webp"
coverImageAlt: "Terminal screen showing memory monitoring commands with green text on dark background"
category: "linux"
tags: ["Linux", "memory-management", "OOM-killer", "PSI", "swap", "server-administration"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: "intermediate"
estimatedTime: "25 minutes"
prerequisites:
  - "Basic Linux command line experience"
  - "Understanding of server resource monitoring"
osCompatibility: ["Ubuntu 22.04+", "Debian 11+", "RHEL 9+", "AlmaLinux 9+"]
---

When a Linux server kills one of your processes unexpectedly, the first instinct is to blame the OOM killer. It feels arbitrary, hostile, and unfair. But the OOM killer is not the disease. It is the immune response. By the time it shows up, something else has already gone wrong, and understanding what that something else is will save you from a cycle of adding RAM, watching processes die, adding more RAM, and watching them die again.

This guide walks through the tools and techniques for reading Linux memory pressure before it reaches the point of process termination. It covers the commands you need, the metrics that matter, the settings you should tune, and the mistakes that keep servers in a permanent state of memory crisis.

## Why Linux Uses Memory the Way It Does

Linux treats free memory as wasted memory. The kernel aggressively caches file data and disk blocks in RAM because accessing cached data is orders of magnitude faster than reading from disk. This means that a Linux server with 32 GB of RAM and 200 MB of "free" memory is not necessarily in trouble. The rest of that RAM is doing useful work as cache, and the kernel will reclaim it instantly if an application requests memory.

This behavior confuses administrators who are used to the Windows model, where free memory is treated as a health indicator. On Linux, the relevant metric is not free memory. It is available memory, which accounts for reclaimable cache. When available memory drops to near zero and the kernel cannot reclaim cache fast enough, the system enters memory pressure, and that is when things start to go wrong.

Understanding this distinction is the first step. The second is knowing how to monitor it.

## The Four Tools You Need

There are dozens of memory monitoring tools on Linux. Four of them give you everything you need to understand what is happening on your server.

### vmstat

The most immediate way to see memory pressure is vmstat. Run it with a one-second interval:

```
vmstat 1
```

The columns that matter are si (swap in), so (swap out), free, b (blocked processes), and wa (I/O wait). If you see continuous swap activity, increasing blocked processes, and rising I/O wait, your system is under memory pressure. The OOM killer is not far behind.

What makes vmstat useful is its real-time nature. You can watch memory pressure develop over seconds, which tells you whether the problem is persistent or a transient spike. A system that occasionally swaps for a few seconds and then stabilizes is healthy. A system that continuously swaps with processes piling up in the blocked state is heading for trouble.

### free

The free command gives you a snapshot of memory usage:

```
free -h
```

Focus on the available column, not the free column. On a healthy Linux server, free memory should be low because the kernel is using it for cache. Available memory tells you how much RAM applications can actually use without triggering reclaim activity. If available memory is consistently below 10-15% of total RAM, you have a problem.

The swap line matters too. A small amount of swap usage is normal and healthy. Heavy, continuous swap usage is not. If your swap is growing steadily over time, something is leaking memory or your workload has outgrown the available RAM.

### sar

If sysstat is installed, sar gives you historical memory data:

```
sar -r 1
```

The metrics to watch are %memused, kbcommit, and %commit. A consistently high commit ratio, meaning the system has committed more memory than it physically has, indicates allocation pressure. This does not always translate to immediate problems, but it means you are running on the edge. Any spike in memory demand will push you over.

The value of sar over vmstat is that it tracks trends. You can look back at yesterday's data and see whether memory usage was climbing gradually, which suggests a leak, or spiking at specific times, which suggests a scheduled process that needs its memory allocation tuned.

### PSI (Pressure Stall Information)

Modern Linux kernels, 4.20 and later, expose Pressure Stall Information through the /proc filesystem:

```
cat /proc/pressure/memory
```

The output shows two values: some and full. The some value tells you what percentage of time at least one task was stalled waiting for memory. The full value tells you what percentage of time the entire workload was stalled. Both should be as close to zero as possible on a healthy server.

PSI is the most direct measurement of memory pressure because it measures contention, not usage. A system can be using 95% of its RAM and have zero PSI if the kernel can reclaim cache fast enough to satisfy allocations. A system can be using 60% of its RAM and have high PSI if applications are competing for memory faster than the kernel can provide it.

This is the metric that traditional monitoring misses. Most monitoring tools report memory usage, which tells you how much RAM is occupied. PSI tells you how much pain that usage is causing, which is what actually determines whether your processes survive.

## The Settings That Matter

Linux gives you several kernel parameters that control memory behavior. Most servers run with defaults that were chosen for general-purpose workloads. If your server runs specific applications, these defaults may not be optimal.

### vm.overcommit_memory

This setting controls how the kernel handles memory allocation requests. The default value, 0, uses a heuristic that allows overcommit within reason. For databases and applications that allocate large contiguous memory blocks, this can lead to the OOM killer firing even when the system appears to have enough total memory.

Setting vm.overcommit_memory to 2 tells the kernel to never overcommit. The kernel will reject allocation requests that would exceed total RAM plus swap. This prevents the OOM killer from firing due to overcommit, but it also means applications may fail to allocate memory even when the system has capacity available through cache reclaim.

For most production servers running databases, setting vm.overcommit_memory to 2 and configuring an appropriate amount of swap gives you the most predictable behavior. The application will fail fast with an allocation error rather than silently consuming memory that triggers the OOM killer later.

### vm.swappiness

This controls how aggressively the kernel moves anonymous memory pages to swap. The default value, 60, is reasonable for general-purpose servers. For database servers, values between 10 and 30 often work better because databases benefit from keeping their working set in RAM.

Setting swappiness to 0 is a common mistake. It does not disable swap. It tells the kernel to avoid swapping until memory is nearly exhausted, at which point it swaps aggressively all at once, causing a performance cliff. A moderate value like 10 or 20 gives the kernel permission to swap gently, keeping the most active pages in RAM while moving idle pages to swap gradually.

### vm.min_free_kbytes

This sets the minimum amount of RAM the kernel keeps free for emergency allocations. The default is usually too low for servers with large amounts of RAM. A value between 65536 and 131072, which is 64 MB to 128 MB, gives the kernel enough headroom to handle sudden allocation spikes without immediately triggering reclaim or the OOM killer.

## Common Mistakes That Keep You Stuck

The most common pattern I see on servers that repeatedly hit OOM is this: the administrator adds RAM, the problem goes away temporarily, and then it comes back. This happens because adding RAM treats the symptom, not the cause.

**Looking only at free memory.** Low free memory on Linux is normal. The kernel caches everything it can. If you are monitoring free memory and alarming when it drops below some threshold, you are alarming on a feature, not a bug.

**Ignoring swap because "swap is bad."** Small amounts of swap are healthy. They give the kernel a place to move idle pages, keeping active pages in faster RAM. The problem is not swap itself. It is continuous, heavy swap activity, which indicates the system does not have enough RAM for its workload.

**Increasing RAM without investigation.** Adding memory may delay the OOM killer, but it often hides memory leaks, poorly configured applications, or oversized caches. The root cause remains, and it will eventually consume whatever RAM you add.

**Never monitoring PSI.** Traditional monitoring focuses on resource usage. PSI measures resource contention. A server can show 90% memory usage with zero pressure, or 50% memory usage with high pressure. The usage number alone does not tell you which situation you are in.

## A Practical Workflow

When a process gets killed by the OOM killer, the worst thing you can do is immediately add RAM. More memory just delays the inevitable if the underlying problem is a memory leak, an oversized cache, or an application that allocates more than it needs. Follow this workflow instead:
The goal is not to prevent the OOM killer from working. The goal is to make sure it never has a reason to. That means understanding where your memory is going, whether your applications are using it efficiently, and whether your kernel parameters are tuned for your actual workload rather than for a generic server that does not exist.

1. Check dmesg for the OOM killer log entry. It tells you which process was killed and why.
2. Run vmstat 1 for 60 seconds and watch for sustained swap activity and blocked processes.
3. Check free -h and focus on the available column, not free.
4. Read /proc/pressure/memory. If the some value is consistently above 1%, you have real pressure.
5. Look at the process that was killed. Is it leaking memory? Is it allocating more than it needs? Is it running alongside other processes that are also memory-hungry?
6. Tune the application before tuning the kernel. Most OOM problems are application problems, not kernel problems.
7. If tuning the application is not enough, adjust vm.swappiness, vm.overcommit_memory, and vm.min_free_kbytes.
8. Add RAM only after you have exhausted configuration and application-level fixes.

The OOM killer is doing its job. It is protecting the rest of your system from a runaway process. The question is not how to stop it from killing processes. The question is why the process needed killing in the first place.
