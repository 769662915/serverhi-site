---
title: "Linux Swap and ZRAM: A Complete Configuration Guide for Server Performance"
description: "Learn how to configure Linux swap and ZRAM for optimal server performance. Covers swap partitions, swap files, ZRAM setup, swappiness tuning, and memory management best practices."
pubDate: 2026-08-24
coverImage: ./cover.webp
coverImageAlt: "Terminal showing Linux memory management commands and ZRAM configuration"
category: "server-config"
tags: ["Linux", "swap", "ZRAM", "memory management", "server performance"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: "intermediate"
estimatedTime: "25 minutes"
prerequisites:
  - "Basic Linux command line knowledge"
  - "Root or sudo access"
osCompatibility: ["Ubuntu 22.04+", "Debian 12+", "CentOS/RHEL 9+", "Fedora 38+"]
---

Memory management is one of the most impactful tuning areas for Linux servers. When physical RAM runs low, the kernel needs a fallback strategy. The traditional approach is swap, a dedicated partition or file on disk that holds inactive memory pages. The modern alternative is ZRAM, a compressed block device in memory that acts as swap without touching disk at all.

Understanding when and how to use each approach, and how to configure them together, can dramatically improve server performance. This guide walks through the complete setup, from basic swap configuration to advanced ZRAM tuning.

## What Is Swap and Why It Matters

Swap is the Linux kernel's safety valve for memory pressure. When the system runs out of physical RAM, the kernel moves inactive memory pages to swap space, freeing RAM for active processes. This prevents the OOM killer from terminating critical services, but it comes with a performance cost: accessing data from swap is orders of magnitude slower than accessing it from RAM.

The kernel manages swap through several parameters, most importantly `vm.swappiness`. This value controls how aggressively the kernel moves pages to swap. A higher value means the kernel uses swap more readily; a lower value means it tries harder to keep everything in RAM.

The default swappiness value on most distributions is 60, which works reasonably well for general-purpose systems. But servers with specific workloads, especially those with limited RAM or running memory-intensive applications, often benefit from tuned settings.

Swap also plays a role in memory overcommit. The kernel's overcommit settings determine whether it allows processes to allocate more memory than physically available. With swap configured, the kernel has somewhere to put pages when physical memory fills up, making overcommit safer. Without swap, aggressive overcommit can lead to immediate OOM events when memory runs out.

## Traditional Swap vs ZRAM

Traditional swap uses a disk partition or file as extended memory. The kernel compresses pages before writing them to swap, then decompresses when reading them back. The problem is disk I/O: even SSDs are slow compared to RAM, and the compression-decompression overhead adds latency on top of that.

ZRAM eliminates the disk I/O entirely. It creates a compressed block device in RAM and uses it as swap. Pages are compressed and stored in memory, typically achieving 2:1 or better compression ratios. This means a system with 4 GB of RAM can effectively have 6-8 GB of usable memory when ZRAM is configured correctly.

The tradeoff is that ZRAM consumes CPU cycles for compression. Modern CPUs handle this efficiently with hardware acceleration, but it is still a consideration for CPU-bound workloads. The benefit is that compressed memory access is vastly faster than disk access, making ZRAM the preferred choice for most modern Linux servers.

## When to Use ZRAM vs Traditional Swap

For most servers, ZRAM is the better primary choice. It provides the safety net of swap without the performance penalty of disk I/O. Traditional swap still has its place, but primarily as a secondary fallback.

Use ZRAM when:
- You have a server with 2-16 GB of RAM
- You want to maximize memory efficiency without adding physical RAM
- Your workload benefits from keeping more data in memory
- You need predictable performance under memory pressure

Keep traditional swap as a backup when:
- You have very limited RAM (under 1 GB) and need overcommit capability
- You run memory-hungry applications that may temporarily spike well beyond available RAM
- You need hibernation support (ZRAM cannot be hibernated to)

The recommended approach for most servers is to configure ZRAM as primary swap and a small traditional swap partition or file as a fallback. This gives you the performance benefits of ZRAM with the safety net of disk-based swap for extreme cases.

## Setting Up ZRAM on Linux

Most modern Linux distributions include ZRAM support out of the container. The easiest way to enable it is through systemd's zram-generator.

First, check if zram-generator is available:

```bash
systemctl status systemd-zram-setup@zram0.service
```

If the service exists, you can enable it:

```bash
sudo systemctl enable --now systemd-zram-setup@zram0.service
```

To configure ZRAM size, create or edit the configuration file:

```bash
sudo nano /etc/systemd/zram-generator.conf
```

Add the following configuration:

```ini
[zram0]
zram-size = min(ram / 2, 4096)
```

This sets ZRAM to half of physical RAM, capped at 4 GB. For most servers, this is a solid starting point.

After configuring, restart the service and verify:

```bash
sudo systemctl restart systemd-zram-setup@zram0.service
zramctl
```

The output should show the ZRAM device with its size and compression algorithm.

## Configuring Swappiness for ZRAM

This is where most people get confused. The standard advice of setting `vm.swappiness=10` is wrong for ZRAM. That value is appropriate for traditional disk-based swap, where you want to minimize disk I/O.

For ZRAM, the kernel documentation explicitly states that values above 100 can be appropriate. This is because swap I/O to ZRAM may be cheaper than reclaiming filesystem-backed pages. When data is in ZRAM, it is still in memory, just compressed. Reclaiming a page means writing it to disk (if dirty) or simply discarding it (if clean), both of which are slower than compressing it into ZRAM.

A good starting point for ZRAM is:

```bash
sudo sysctl vm.swappiness=100
```

To make this permanent, create a sysctl configuration file:

```bash
sudo nano /etc/sysctl.d/99-memory-tuning.conf
```

Add:

```
vm.swappiness = 100
```

Apply the changes:

```bash
sudo sysctl --system
```

The kernel documentation notes that the optimal value is workload-dependent. Test with your specific applications and adjust if needed. Change one setting at a time and monitor the results before making further adjustments.

## Sizing ZRAM Correctly

ZRAM size depends on your workload and available RAM. The default of `min(ram / 2, 4096)` works well for most servers, but you can tune it further.

For servers running memory-efficient workloads (web servers, API backends, databases with tuned buffers):

```ini
[zram0]
zram-size = ram / 2
```

For servers running compression-friendly workloads (text processing, logging, development environments):

```ini
[zram0]
zram-size = ram * 3 / 4
```

For servers with plenty of RAM (32 GB+) that rarely use swap:

```ini
[zram0]
zram-size = min(ram / 4, 2048)
```

Monitor your ZRAM usage with `zramctl` and `swapon --show`. If ZRAM usage consistently exceeds 50% of its allocated size, you may need to increase it. If it stays near zero, you can reduce it to free up RAM for other uses.

## Monitoring and Troubleshooting

After configuring ZRAM, monitor its behavior to ensure it is working as expected.

Check ZRAM status:

```bash
zramctl
```

This shows the device name, size, used amount, and compression algorithm.

Check swap usage:

```bash
swapon --show
free -h
```

The `free` command shows total swap, used swap, and available swap. For a well-tuned ZRAM setup, you should see swap usage that reflects actual memory pressure rather than premature swapping.

Watch for these signs of misconfiguration:

- **ZRAM full, traditional swap also in use**: Increase ZRAM size or check for memory leaks
- **ZRAM empty, OOM killer active**: Decrease swappiness or increase ZRAM size
- **High CPU usage from kswapd**: Your swappiness may be too high for your workload
- **Low compression ratio**: Your workload may not compress well; consider traditional swap instead

Use `vmstat 1` to watch swap activity in real time. The `si` and `so` columns show swap in and swap out operations per second. If you see consistent swap activity during normal operations, your server may need more RAM or better memory management.

The `/proc/swaps` file shows active swap devices and their usage. The `/proc/meminfo` file provides detailed memory statistics including swap totals, free swap, and cached memory. These files are useful for scripting automated monitoring or setting up alerts.

For production environments, consider setting up monitoring with Prometheus and node_exporter. The `node_memory_swap_total_bytes` and `node_memory_swap_free_bytes` metrics give you visibility into swap usage over time. Set alerts for when swap usage exceeds 50% of total swap space, as this indicates your server is under sustained memory pressure.

Log analysis can also reveal memory issues. Check `/var/log/syslog` or `journalctl -k` for OOM killer messages. If you see `Out of memory: Kill process` entries, your server is running out of memory and the kernel is terminating processes to survive. This is a clear signal that you need more RAM, better memory configuration, or both.

## Best Practices for Production Servers

Start with ZRAM as primary swap and a small traditional swap fallback. Configure ZRAM to half of physical RAM with `vm.swappiness=100`. Monitor for the first few days and adjust based on actual usage patterns.

Do not copy settings from forum posts without understanding them. Every server is different. The best configuration is the one you arrive at through careful testing and monitoring.

Document your memory tuning decisions. When something breaks at 3 AM, you want to know why `vm.swappiness` is set to 100 instead of the default 60. Future you will appreciate the notes.

Consider using TuneD for automated tuning. Profiles like `throughput-performance` and `virtual-guest` include sensible memory defaults that work well for many server workloads. You can override specific settings while benefiting from the profile's other optimizations.

For virtual machines and containers, memory management becomes even more important. VMs have fixed memory allocations, and overcommit can cause guest performance degradation. Containers share the host kernel's memory management, but cgroup limits mean OOM events can terminate individual containers without affecting the host.

When running databases on your server, pay special attention to swap behavior. PostgreSQL and MySQL both benefit from having large shared buffers in RAM. Swapping database pages to ZRAM is acceptable in mild cases, but heavy swap usage will degrade query performance. If your database is consistently swapping, it is time to add more RAM or tune the database's memory configuration.

For web servers handling many concurrent connections, memory per connection matters. Nginx typically uses 2-4 MB per worker process under moderate load. If you have 1,000 concurrent connections, that is 2-4 GB just for Nginx, plus application server memory, plus database connections. Plan your memory budget accordingly and use ZRAM as a cushion rather than a primary memory source.

The goal is not to avoid swap entirely. The goal is to use swap intelligently, so your server handles memory pressure gracefully instead of crashing or becoming unresponsive. A well-tuned ZRAM configuration gives you that grace period without the performance penalty of traditional swap.

Remember that memory tuning is not a one-time task. Workloads change, traffic patterns shift, and new applications get deployed to your infrastructure over time. Revisit your swap and ZRAM configuration periodically as well, especially after any significant infrastructure changes or upgrades. What worked perfectly six months ago may not be optimal today. Keep monitoring, keep testing, and keep adjusting to stay ahead of performance issues.
