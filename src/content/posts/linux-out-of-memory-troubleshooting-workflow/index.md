---
title: "Out of Memory on Production: A Methodical Troubleshooting Workflow for Linux Servers"
description: "A hands-on guide covering configuration, troubleshooting, and best practices for out of memory on production: a methodical troubleshooting workflow for linux servers."
pubDate: 2026-04-23
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Out of Memory on Production: A Methodical Troubleshooting Workflow for Linux Servers"
category: "troubleshooting"
tags: [Linux, OOM, Memory, Troubleshooting]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

## The Methodical OOM Workflow

When a production process is killed by the OOM killer, don't just restart. Find the root cause.

### Step 1: Confirm OOM

```bash
dmesg -T | grep -i "out of memory"
dmesg -T | grep -i "killed process"
```

### Step 2: Historical Memory State

```bash
journalctl -u postgresql.service --since "1 hour ago" | tail -50
sar -r | tail -20
```

If you have Prometheus: `node_memory_MemAvailable_bytes`.

### Step 3: Current Memory

```bash
free -h
cat /proc/meminfo
ps aux --sort=-%mem | head -20
```

Key metrics: `MemAvailable`, `CommitLimit` vs `Committed_AS`, `Cached`.

### Step 4: Check for Leaks

```bash
while true; do
    ps -o pid,rss,comm -p $(pgrep suspicious) >> /tmp/memlog.txt
    sleep 10
done
```

Check `/proc/PID/smaps` for detailed memory maps. `Pss` (Proportional Set Size) is the most accurate metric.

### Step 5: Process Spikes

```bash
ps aux | wc -l
ps aux | awk '{print $1}' | sort | uniq -c | sort -rn | head -10
```

### Step 6: Page Cache Analysis

```bash
grep -E "^(Dirty|Writeback):" /proc/meminfo
```

High Dirty pages with slow disk = kernel cannot reclaim cache fast enough.

### Step 7: Overcommit Settings

```bash
cat /proc/sys/vm/overcommit_memory
# 0: heuristic (default), 1: always, 2: never
```

For databases: `vm.overcommit_memory=2` with `vm.overcommit_ratio=80`.

### Step 8: Prevention

**Systemd memory limits:**

```ini
[Service]
MemoryMax=2G
MemoryHigh=1.5G
```

**OOM score protection for critical services:**

```bash
echo -1000 > /proc/$(pgrep sshd)/oom_score_adj
```

**Add swap buffer:**

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
```

**Prometheus alert:**

```promql
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
/ node_memory_MemTotal_bytes > 0.9
```

The best OOM event is the one you see coming 30 minutes before it happens.