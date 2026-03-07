---
title: "Linux Performance Troubleshooting: Complete Guide for Server Administrators"
description: "Master Linux performance troubleshooting with this comprehensive guide. Learn to diagnose and fix CPU, memory, disk I/O, and network bottlenecks using modern tools."
pubDate: 2026-03-07
author: "ServerHi Editorial Team"
category: "linux"
coverImage: "./cover.webp"
coverImageAlt: "Linux server performance monitoring dashboard showing CPU, memory, disk I/O, and network metrics"
tags: ["Linux", "Performance", "Troubleshooting", "Monitoring", "System Administration"]
---

## Introduction: Why Performance Troubleshooting Matters

Slow servers cost money. Whether it's a web application responding sluggishly, a database struggling under load, or a batch job taking hours longer than expected, performance issues directly impact user experience and business outcomes.

This guide teaches you systematic Linux performance troubleshooting using both classic tools and modern observability platforms. By the end, you'll be able to quickly identify and resolve bottlenecks in any Linux system.

**What you'll learn:**
- Systematic troubleshooting methodology
- CPU, memory, disk I/O, and network diagnostics
- Essential tools: htop, iostat, perf, eBPF
- Real-world case studies and solutions

**Time required:** 20 minutes to read, lifetime to master
**Skill level:** Intermediate

---

## The Troubleshooting Methodology

Before diving into tools, understand the systematic approach:

### USE Method (Utilization, Saturation, Errors)

For every resource, check:
1. **Utilization**: How busy is the resource?
2. **Saturation**: Is there a queue of waiting work?
3. **Errors**: Are there hardware or software errors?

### Top-Down Approach

```
1. System level: Is the whole system slow?
2. Subsystem level: CPU, memory, disk, or network?
3. Process level: Which process is the culprit?
4. Code level: What's the specific bottleneck?
```

### Quick Health Check

Start with this 30-second assessment:

```bash
# System overview
uptime           # Load averages
free -h          # Memory usage
df -h            # Disk space
iostat -x 1 1    # Disk I/O
vmstat 1 1       # Overall system stats
```

---

## CPU Performance Troubleshooting

### Understanding CPU Metrics

| Metric | What It Means | Good Value |
|--------|--------------|------------|
| us (user) | Application CPU usage | < 70% |
| sy (system) | Kernel CPU usage | < 30% |
| wa (iowait) | Waiting for I/O | < 10% |
| id (idle) | Unused CPU | > 20% |
| load average | Processes waiting for CPU | < CPU cores |

### Essential CPU Tools

**htop - Interactive Process Viewer**

```bash
# Install
sudo apt install htop  # Debian/Ubuntu
sudo yum install htop  # RHEL/CentOS

# Run
htop

# Key shortcuts:
# P - Sort by CPU
# M - Sort by Memory
# F - Filter processes
# k - Kill process
# H - Show/hide help
```

**Interpreting htop output:**
```
CPU[||||||||||    75%]     Tasks: 245, 1256 thr; 4 running
Mem[||||||||||||||| 12.4G/16G]   Load average: 2.45 1.89 1.67
```

### Advanced CPU Diagnostics

**perf - Linux Performance Counters**

```bash
# Install
sudo apt install linux-tools-$(uname -r)

# Record CPU samples for 10 seconds
sudo perf record -g -a sleep 10

# View results
sudo perf report

# Top functions by CPU time
sudo perf top
```

**pidstat - Per-process Statistics**

```bash
# Install (sysstat package)
sudo apt install sysstat

# Monitor CPU every 1 second
pidstat -u 1

# Monitor specific PID
pidstat -p 1234 -u 1

# Show threads
pidstat -t -p 1234 1
```

### Case Study: High CPU Usage

**Scenario:** Server running at 100% CPU

**Diagnosis:**
```bash
# 1. Check load average
uptime
# Output: load average: 8.45, 6.21, 4.89

# 2. Identify top CPU consumers
top -bn1 | head -20

# 3. Deep dive into process
pidstat -p 1234 -u 1

# 4. Profile with perf
sudo perf top -p 1234
```

**Solution:**
```bash
# If it's a run-away process
renice +10 -p 1234  # Lower priority
# or
kill -15 1234       # Graceful termination
kill -9 1234        # Force kill (last resort)

# If it's a service
sudo systemctl restart service-name
```

---

## Memory Performance Troubleshooting

### Understanding Memory Metrics

```bash
free -h
#               total        used        free      shared  buff/cache   available
# Mem:           15Gi       8.2Gi       4.1Gi       256Mi       3.2Gi        12Gi
# Swap:         4.0Gi          0B       4.0Gi
```

**Key columns:**
- **used**: Actual memory in use
- **free**: Completely unused memory
- **buff/cache**: File system cache (reclaimable)
- **available**: Memory available for new applications

### Memory Troubleshooting Tools

**vmstat - Virtual Memory Statistics**

```bash
# Run every 1 second
vmstat 1

# Output interpretation:
# procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
#  r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
#  2  0      0 4123456 256789 3456789    0    0    12    45  234  567 25  5 68  2  0
#
#  r: Processes waiting for CPU (high = CPU bottleneck)
#  b: Processes in uninterruptible sleep (high = I/O bottleneck)
#  si/so: Swap in/out (non-zero = memory pressure)
#  bi/bo: Blocks read/written
#  wa: I/O wait percentage
```

**Identify Memory Hogs**

```bash
# Top processes by memory
ps aux --sort=-%mem | head -20

# Detailed memory info per process
for file in /proc/*/status ; do
    awk '/VmSize|Name/{printf $2 " "; print $3} ' $file 2>/dev/null
done | sort -k2 -n -r | head -20
```

**Monitor Memory in Real-time**

```bash
# Watch memory changes
watch -n 1 'free -h'

# Detailed monitoring
watch -n 1 'cat /proc/meminfo | head -20'
```

### Understanding Swap and OOM

**Check swap usage:**
```bash
swapon --show
cat /proc/sys/vm/swappiness  # Default: 60
```

**OOM (Out of Memory) Killer:**
```bash
# Check OOM events
dmesg | grep -i "out of memory"
journalctl -k | grep -i "oom"

# View OOM score
cat /proc/1234/oom_score
```

### Case Study: Memory Leak

**Scenario:** Application slowly consuming all memory

**Diagnosis:**
```bash
# 1. Track memory over time
vmstat 5 12

# 2. Identify growing process
ps aux --sort=-%mem | head -10

# 3. Monitor specific process
watch -n 5 'cat /proc/1234/status | grep -E "VmSize|VmRSS|VmSwap"'

# 4. Check for memory fragmentation
cat /proc/buddyinfo
```

**Solution:**
```bash
# Short term: Restart service
sudo systemctl restart application

# Long term: Set memory limits
# In systemd service file:
[Service]
MemoryLimit=2G

# Or with cgroups
sudo systemd-run --scope -p MemoryLimit=2G /path/to/application
```

---

## Disk I/O Performance Troubleshooting

### Understanding I/O Metrics

**iostat output:**
```
Device            r/s     w/s     rkB/s     wkB/s   rrqm/s   wrqm/s  %util await  r_await  w_await
sda              45.2    23.1    2345.6    1234.5     2.3     15.6   78.5   12.3    8.5     18.2
```

| Metric | What It Means | Good Value |
|--------|--------------|------------|
| %util | Device utilization | < 80% |
| await | Average I/O wait time (ms) | < 10ms |
| r_await | Read wait time | < 5ms |
| w_await | Write wait time | < 10ms |
| rkB/s, wkB/s | Throughput | Depends on workload |

### Disk I/O Tools

**iostat - I/O Statistics**

```bash
# Install (sysstat package)
sudo apt install sysstat

# Extended statistics every 1 second
iostat -x 1

# For specific device
iostat -x /dev/sda 1
```

**iotop - Real-time I/O Monitoring**

```bash
# Install
sudo apt install iotop

# Run (requires root)
sudo iotop

# Show only processes doing I/O
sudo iotop -o

# Batch mode for logging
sudo iotop -b -n 10 > iotop.log
```

**pidstat for I/O**

```bash
# Per-process I/O stats
pidstat -d 1

# Specific process
pidstat -d -p 1234 1
```

**Check Disk Health**

```bash
# SMART status
sudo smartctl -a /dev/sda

# Quick health check
sudo smartctl -H /dev/sda
```

### Case Study: High I/O Wait

**Scenario:** System sluggish, high iowait

**Diagnosis:**
```bash
# 1. Check overall I/O wait
vmstat 1
# Look at 'wa' column (> 20% indicates problem)

# 2. Identify I/O heavy processes
sudo iotop -o

# 3. Check disk utilization
iostat -x 1

# 4. Find processes with open files
sudo lsof +D /path
```

**Common Solutions:**

```bash
# 1. Reduce swappiness (if swapping)
sudo sysctl vm.swappiness=10

# 2. Increase read-ahead
sudo blockdev --setra 4096 /dev/sda

# 3. Schedule I/O intensive tasks for off-peak
sudo nice -n 19 backup-script.sh

# 4. Use ionice for process priority
sudo ionice -c2 -n7 -p 1234
```

---

## Network Performance Troubleshooting

### Network Metrics to Monitor

| Metric | Tool | Good Value |
|--------|------|------------|
| Bandwidth usage | iftop, nethogs | < 80% of capacity |
| Packet loss | ping, mtr | < 0.1% |
| Latency | ping, mtr | < 50ms (local), < 200ms (global) |
| Connections | ss, netstat | Depends on application |
| Retransmissions | netstat -s | < 1% |

### Network Diagnostic Tools

**ss - Socket Statistics**

```bash
# All connections
ss -tunap

# Listening ports
ss -tlnp

# Established connections
ss -tn state established

# Connection statistics
ss -s
```

**iftop - Real-time Bandwidth**

```bash
# Install
sudo apt install iftop

# Run on interface
sudo iftop -i eth0

# Show port numbers
sudo iftop -np
```

**mtr - Network Diagnostics**

```bash
# Install
sudo apt install mtr

# Run diagnostic
mtr -rwb100 google.com

# Output shows packet loss at each hop
```

**nethogs - Per-process Bandwidth**

```bash
# Install
sudo apt install nethogs

# Run
sudo nethogs eth0
```

### Case Study: Network Latency

**Scenario:** Application experiencing timeouts

**Diagnosis:**
```bash
# 1. Test basic connectivity
ping -c 10 target-server.com

# 2. Trace route with statistics
mtr -rwb100 target-server.com

# 3. Check for connection issues
ss -tn state time-wait | wc -l

# 4. Monitor network errors
netstat -i
```

**Solutions:**

```bash
# Increase TCP buffer sizes
sudo sysctl -w net.ipv4.tcp_rmem="4096 87380 67108864"
sudo sysctl -w net.ipv4.tcp_wmem="4096 65536 67108864"

# Enable TCP BBR congestion control
sudo sysctl -w net.ipv4.tcp_congestion_control=bbr

# Reduce TIME_WAIT connections
sudo sysctl -w net.ipv4.tcp_tw_reuse=1
```

---

## Comprehensive Monitoring Solutions

### Prometheus + Grafana Stack

**Installation:**

```bash
# Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*

# Install Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xvfz node_exporter-*.tar.gz

# Start services
./prometheus --config.file=prometheus.yml &
./node_exporter &
```

### eBPF-Based Tools (Modern Approach)

**bcc-tools installation:**

```bash
# Ubuntu/Debian
sudo apt install bpfcc-tools

# RHEL/CentOS
sudo yum install bcc-tools
```

**Useful eBPF tools:**

```bash
# CPU profiling
sudo profile-bpfcc -p 1234

# Disk I/O latency
sudo biopattern

# Network monitoring
sudo tcptop

# Memory allocation
sudo memleak
```

---

## Performance Troubleshooting Checklist

Use this checklist for systematic diagnosis:

### Quick Assessment (5 minutes)

- [ ] `uptime` - Check load average
- [ ] `free -h` - Check memory
- [ ] `df -h` - Check disk space
- [ ] `iostat -x 1 1` - Check disk I/O
- [ ] `vmstat 1 1` - Overall system health

### CPU Investigation

- [ ] `htop` - Identify top CPU consumers
- [ ] `pidstat -u 1` - Per-process CPU stats
- [ ] `perf top` - Profile CPU usage

### Memory Investigation

- [ ] `vmstat 1` - Check for swapping
- [ ] `ps aux --sort=-%mem` - Top memory consumers
- [ ] `cat /proc/meminfo` - Detailed memory info

### Disk I/O Investigation

- [ ] `iostat -x 1` - Device utilization
- [ ] `iotop` - Per-process I/O
- [ ] `pidstat -d 1` - Process I/O stats

### Network Investigation

- [ ] `ss -tunap` - Active connections
- [ ] `iftop` - Bandwidth usage
- [ ] `mtr target` - Network path analysis

---

## Summary

Linux performance troubleshooting requires:

1. **Systematic approach**: Use USE method and top-down diagnosis
2. **Right tools**: Master htop, vmstat, iostat, perf, and eBPF tools
3. **Understanding metrics**: Know what good looks like
4. **Practice**: Build intuition through experience

**Key takeaways:**
- Start with quick health checks before deep diving
- Correlate metrics across CPU, memory, disk, and network
- Use modern eBPF tools for deeper insights
- Establish baselines to identify anomalies

**Resources:**

- [ Brendan Gregg's Performance Page](http://www.brendangregg.com/linuxperf.html)
- [Linux Performance Analysis in 60,000 Milliseconds](https://netflixtechblog.com/linux-performance-analysis-in-60-000-milliseconds-accc10403c55)
- [eBPF Tools Documentation](https://ebpf.io/)
- [Prometheus Documentation](https://prometheus.io/docs/)
