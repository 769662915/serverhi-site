---
title: "Linux OOM Killer: How to Diagnose and Prevent Out-Of-Memory Process Kills"
description: "A practical guide to understanding, diagnosing, and preventing Linux OOM Killer events on production servers — from reading kernel logs to configuring cgroup memory limits."
pubDate: 2026-06-24
coverImage: "./cover.webp"
coverImageAlt: "Linux terminal showing OOM Killer diagnostic output on a dark server screen"
category: "troubleshooting"
tags: ["OOM Killer", "Linux", "Memory", "Systemd", "Troubleshooting", "Production", "cgroups"]
author: "ServerHi Editorial Team"
draft: false
difficulty: "intermediate"
estimatedTime: "20 minutes"
prerequisites:
  - "Access to a Linux server with root or sudo privileges"
  - "Basic familiarity with systemd and journalctl"
  - "Understanding of Linux memory management concepts"
osCompatibility: ["Ubuntu 22.04", "Ubuntu 24.04", "Debian 12", "Rocky Linux 9"]
---

## What Is the Linux OOM Killer?

The Out-Of-Memory (OOM) Killer is a built-in Linux kernel mechanism that activates when the system runs critically low on available memory. When no more memory can be allocated — and swap space (if configured) is exhausted — the kernel must free memory to keep the system from completely freezing. Its solution: select a process to terminate.

While this sounds dramatic, the OOM Killer is actually a safety feature. Without it, the kernel would be unable to satisfy any memory allocation requests, potentially causing a full system crash. Instead, the OOM Killer evaluates all running processes, assigns each a score based on memory usage and other factors, and terminates the one with the highest score.

For production server administrators, unexpected OOM kills can cause service outages, data loss, and hard-to-diagnose downtime. Understanding how the OOM Killer works and how to prevent it from targeting critical services is essential for reliable server operation.

## How the OOM Killer Selects a Victim

The kernel calculates an **oom_score** for every process. This score ranges from 0 (never kill) to 1000 (always kill first). Several factors influence this score:

- **Memory usage** — processes consuming more RAM get higher scores
- **Process runtime** — newer processes are slightly more likely targets
- **User privileges** — root processes may receive some protection
- **oom_score_adj** — a tunable value from -1000 (never kill) to +1000 (always kill) that adjusts the final score

The effective score formula is roughly:

```
effective_score = oom_score * (1 + oom_score_adj / 1000)
```

Setting `oom_score_adj` to `-1000` completely protects a process from the OOM Killer, while `+1000` guarantees it will be the first victim.

## Step 1: Check If the OOM Killer Has Struck

When a process disappears without explanation, the OOM Killer is often the culprit. Here are the primary ways to confirm:

### Using dmesg

The quickest method is searching the kernel ring buffer for OOM-related messages:

```bash
sudo dmesg -T | grep -i "oom\|out of memory\|killed process"
```

A typical OOM kill entry looks like this:

```
[Jun 24 03:14:22] java invoked oom-killer: gfp_mask=0x6200ca(GFP_HIGHUSER_MOVABLE), order=0, oom_score_adj=0
[Jun 24 03:14:22] Out of memory: Killed process 4521 (mysqld) total-vm:8234560kB, anon-rss:4123456kB
```

This tells you exactly which process was killed (mysqld, PID 4521), how much virtual memory it had allocated, and how much physical RSS memory it was using.

### Using journalctl

On systems using systemd, the kernel logs are also captured in the journal:

```bash
sudo journalctl -k --grep="oom\|out of memory" --since "24 hours ago"
```

The `-k` flag filters to kernel messages only. You can adjust the `--since` window based on when you suspect the event occurred.

### Checking System Logs

On some distributions, OOM events are also written to `/var/log/kern.log` or `/var/log/syslog`:

```bash
sudo grep -i "oom-killer" /var/log/kern.log
```

## Step 2: Analyze the OOM Event

Once you've confirmed an OOM kill, the kernel's detailed output provides valuable diagnostic information. A full OOM report includes:

```
[  +0.001234] Mem-Info:
[  +0.000012] active_anon:523456 inactive_anon:12345 isolated_anon:0
[  +0.000010]  active_file:234 inactive_file:567 isolated_file:0
[  +0.000008]  unevictable:0 dirty:12 writeback:0 unstable:0
[  +0.000006]  slab_reclaimable:34567 slab_unreclaimable:45678
[  +0.000004]  mapped:67890 shmem:12345 pagetables:23456
[  +0.000002]  free:1234 free_pcp:567 free_cma:0
[  +0.000001] Node 0 active_anon:2093824kB inactive_anon:49380kB
[  +0.000001] Node 0 DMA free:3456kB min:1234kB low:2345kB high:3456kB
[  +0.000001] oom-kill:constraint=CONSTRAINT_NONE,nodemask=(null),cpuset=/,task=mysqld,pid=4521,uid=999
```

Key fields to examine:

- **active_anon** vs **free** — shows how much memory was actively in use versus available
- **slab_reclaimable** and **slab_unreclaimable** — kernel cache memory that could potentially be freed
- **task=** and **pid=** — identifies the killed process
- **constraint** — shows what limited the memory (e.g., cgroup, memcg, or global)

## Step 3: Monitor Current Memory State

Before implementing fixes, understand your current memory situation:

```bash
free -h
```

This gives a human-readable overview:

```
               total        used        free      shared  buff/cache   available
Mem:            15Gi       12Gi       456Mi       234Mi       2.5Gi       2.1Gi
Swap:          2.0Gi       1.8Gi       256Mi
```

Pay attention to the **available** column, not just **free**. The available figure accounts for reclaimable cache and is a better indicator of how much memory can actually be used by applications.

For per-process breakdown:

```bash
ps aux --sort=-%mem | head -20
```

This shows the top 20 memory-consuming processes, helping identify which services are the biggest memory users.

## Step 4: Protect Critical Services with oom_score_adj

One of the most practical interventions is adjusting the OOM score for critical services. For example, you might want to protect your database while allowing a batch processing job to be killed first.

### Setting oom_score_adj for a Running Process

To reduce the OOM score for a specific PID:

```bash
# Protect a MySQL process (lower score = less likely to be killed)
echo -500 | sudo tee /proc/$(pgrep mysqld)/oom_score_adj
```

To make a process extremely vulnerable (e.g., a disposable worker):

```bash
echo 500 | sudo tee /proc/$(pgrep batch-worker)/oom_score_adj
```

### Making oom_score_adj Persistent with systemd

The `/proc` approach only lasts until the process restarts. For permanent configuration, use systemd's `OOMScoreAdjust` directive.

Edit the service unit file:

```bash
sudo systemctl edit mysql.service
```

Add the following:

```ini
[Service]
OOMScoreAdjust=-500
```

Then reload and restart:

```bash
sudo systemctl daemon-reload
sudo systemctl restart mysql.service
```

Verify the setting:

```bash
cat /proc/$(pgrep mysqld)/oom_score_adj
```

You should see `-500` as the output.

### Recommended oom_score_adj Values

| Service Type | Recommended Value | Rationale |
|---|---|---|
| Database (MySQL, PostgreSQL) | -500 to -800 | Data integrity critical |
| Web server (Nginx, Apache) | -300 to -500 | Service availability |
| SSH daemon | -900 | Must remain accessible |
| Application server | -200 to -300 | Moderate protection |
| Batch jobs / workers | +200 to +500 | Acceptable to sacrifice |
| Memory-heavy caches | +100 to +300 | Can be restarted cleanly |

## Step 5: Configure Memory Limits with cgroups

The OOM Killer operates at the system level by default. With cgroups, you can set memory limits for specific services, creating isolated memory pools that prevent one runaway process from affecting the entire system.

### Using systemd Resource Controls

systemd provides a clean interface for cgroup memory limits:

```bash
sudo systemctl edit nginx.service
```

Add memory limits:

```ini
[Service]
MemoryMax=2G
MemoryHigh=1536M
```

- **MemoryHigh** — throttles the process when memory exceeds this threshold, applying memory pressure
- **MemoryMax** — hard limit; the kernel will OOM-kill processes in this cgroup if they exceed it

### Monitoring cgroup Memory Usage

Check current cgroup memory consumption:

```bash
systemctl show nginx.service --property=MemoryCurrent
```

Or use `systemd-cgtop` for a real-time overview of all cgroup resource usage:

```bash
systemd-cgtop
```

## Step 6: Add or Expand Swap Space

Swap provides a safety net when physical memory is exhausted. While swap is slower than RAM, it gives the OOM Killer time to act gracefully rather than immediately terminating processes.

### Creating a Swap File

```bash
# Create a 4GB swap file
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Making Swap Persistent

Add the swap file to `/etc/fstab`:

```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Tuning Swap Usage

The `vm.swappiness` kernel parameter controls how aggressively the kernel swaps memory pages. Values range from 0 (avoid swapping) to 100 (swap aggressively):

```bash
# Check current value (default is usually 60)
cat /proc/sys/vm/swappiness

# Reduce swap aggression for database servers
sudo sysctl vm.swappiness=10

# Make persistent
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

For database-heavy workloads, a lower swappiness value (10-20) is usually appropriate. For general-purpose web servers, the default of 60 works well.

## Step 7: Set Up OOM Monitoring and Alerts

Don't wait for users to report downtime. Set up monitoring to detect OOM events proactively.

### Simple Log-Based Monitoring

Create a script that checks for recent OOM events:

```bash
#!/bin/bash
# /usr/local/bin/check-oom.sh

OOM_COUNT=$(journalctl -k --grep="oom-killer" --since "1 hour ago" | wc -l)

if [ "$OOM_COUNT" -gt 0 ]; then
    echo "WARNING: $OOM_COUNT OOM kill(s) detected in the last hour"
    journalctl -k --grep="oom-killer" --since "1 hour ago"
    # Add your alert mechanism here (email, Slack webhook, etc.)
fi
```

Schedule it via cron:

```bash
# Check every 15 minutes
*/15 * * * * /usr/local/bin/check-oom.sh
```

### Using eBPF for Advanced OOM Monitoring

For more sophisticated monitoring, eBPF tools can trace OOM events in real-time with minimal overhead:

```bash
# Install bpfcc-tools
sudo apt install bpfcc-tools

# Trace OOM kills with process details
sudo oomkill-bpfcc
```

This provides real-time OOM kill notifications with full process details, including cgroup information and memory statistics at the moment of the kill.

## Common OOM Killer Scenarios and Solutions

### Scenario 1: Java Application Consumes All Memory

Java's heap is not always visible to the kernel's memory accounting unless properly configured.

**Solution:** Set JVM memory limits that account for total container memory:

```bash
# Limit heap to 75% of container memory, reserving room for native memory
java -XX:MaxRAMPercentage=75.0 -XX:+UseContainerSupport -jar app.jar
```

### Scenario 2: MySQL Gets Killed During Peak Traffic

Database processes often grow memory usage under heavy query loads.

**Solution:** Configure MySQL's memory limits and protect it with oom_score_adj:

```ini
# In /etc/mysql/mysql.conf.d/mysqld.cnf
[mysqld]
innodb_buffer_pool_size = 2G    # Set to ~50-70% of available RAM
max_connections = 150           # Limit concurrent connections
performance_schema = OFF        # Disable if memory is tight
```

```bash
# Protect from OOM Killer
sudo systemctl edit mysql.service
# Add: OOMScoreAdjust=-500
```

### Scenario 3: Docker Container OOM Killed

Docker containers have their own memory limits managed by cgroups:

```bash
# Run container with memory limit and swap
docker run --memory=1g --memory-swap=1.5g --oom-kill-disable=false myapp

# Check container OOM events
docker inspect --format='{{.State.OOMKilled}}' container_name
```

The `--oom-kill-disable=false` flag (which is the default) allows the OOM Killer to terminate the container when it exceeds its memory limit, rather than hanging the host system.

## Prevention Checklist

- [ ] **Set appropriate memory limits** for all critical services using systemd `MemoryMax`
- [ ] **Configure oom_score_adj** to protect databases and SSH, sacrifice batch workers
- [ ] **Add swap space** as a safety net (at least 1-2GB on production servers)
- [ ] **Tune vm.swappiness** based on workload type
- [ ] **Set JVM/container memory limits** proportional to available system memory
- [ ] **Monitor for OOM events** using journalctl-based scripts or eBPF tools
- [ ] **Review application memory usage** regularly with `ps` and `systemd-cgtop`
- [ ] **Test OOM behavior** in staging by artificially constraining memory with `systemd-run --scope -p MemoryMax=500M`

## Conclusion

The Linux OOM Killer is both a necessary safety mechanism and a potential source of unexpected downtime. By understanding how it selects victims, monitoring for its activity, and proactively configuring memory limits and OOM scores, you can ensure that your most critical services survive memory pressure events while disposable workloads take the hit.

The key is defense in depth: configure application-level memory limits, set appropriate cgroup boundaries, tune OOM scores to reflect service criticality, and maintain swap as a last-resort buffer. With these measures in place, your production servers will handle memory pressure gracefully rather than suffering unpredictable service outages.
