---
title: "Migrating from cgroups v1 to v2: A Step-by-Step Guide for Linux Servers"
description: "Your distro is switching to cgroups v2 whether you like it or not. Here is how to migrate without breaking your containers, Kubernetes clusters, or monitoring tools."
pubDate: 2026-08-02
coverImage: "./cover.webp"
coverImageAlt: "Terminal window showing cgroups v2 migration commands on a dark background"
category: "linux"
tags: ["cgroups", "cgroups-v2", "linux-kernel", "systemd", "kubernetes", "migration"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: "intermediate"
estimatedTime: "30 minutes"
prerequisites:
  - "Linux server with root access"
  - "Familiarity with systemd and /proc filesystem"
osCompatibility: ["Ubuntu 22.04+", "Debian 12+", "RHEL 9+", "Fedora 31+", "AlmaLinux 9+"]
---

If you are running a Linux server in 2026, cgroups v2 is either already active or coming soon. Ubuntu 22.04 and later default to it. Fedora has used it since version 31. RHEL 9 ships with it enabled. And Kubernetes 1.25 and above require it for several features, including the MemoryQoS and PodAndContainerMetrics alpha gates.

The problem is that most server administrators never consciously chose cgroups v1. It was just there when the system booted. Migrating to v2 means understanding what changed, checking whether your workloads depend on v1-specific behavior, and then flipping the switch without taking down production services.

This is not optional anymore. The Linux kernel community has made it clear that cgroups v1 is in maintenance mode. New features and security fixes are being developed exclusively for v2. Staying on v1 means running a system that is gradually falling behind, with fewer eyes on the code that manages your most critical resource controls.

This guide walks through the entire process: checking your current status, preparing for migration, executing the switch, and handling the most common problems that come up. By the end, you will have a working cgroups v2 setup and the knowledge to troubleshoot whatever breaks along the way.

## What Changed Between cgroups v1 and v2

Control groups (cgroups) are the Linux kernel mechanism for limiting and isolating resource usage — CPU, memory, disk I/O, and network bandwidth — for processes and containers. Version 1, introduced in 2008, uses separate hierarchies for each resource controller. Version 2, stabilized in kernel 4.5 and default in most modern distributions, uses a single unified hierarchy.

The practical differences matter for anyone running containers or systemd services:

**Unified hierarchy**: In v1, each controller (cpu, memory, blkio, etc.) has its own hierarchy. In v2, all controllers share one hierarchy under `/sys/fs/cgroup/`. This simplifies management but changes how you interact with cgroup files.

**Controller delegation**: v2 introduces proper delegation semantics. A process can be given authority over a subdirectory of the cgroup tree without needing root access. This is critical for container runtimes, which need to manage cgroup settings for containers without running as root. In v1, delegation was messy and often required the container runtime to run as root or use complex workarounds. In v2, the delegation model is clean: you write the cgroup subtree_control file to enable specific controllers for a subtree, and the process managing that subtree can set resource limits without elevated privileges. This is one of the main reasons Kubernetes moved to require v2 for certain features.

**Resource distribution models**: v2 replaces the v1 "share" model with a "weight" model for CPU and a "max" model for memory. The weight model is more predictable under contention because it uses proportional distribution rather than shares that can be consumed by other groups.

**New controllers**: v2 adds new controllers like `io` (replacing `blkio` and `cfq`), `rdma` for remote direct memory access, and `hugetlb` for huge page management. These are not available in v1.

**Pressure stall information (PSI)**: v2 exposes PSI data through `/proc/pressure/` and per-cgroup `cpu.pressure`, `memory.pressure`, and `io.pressure` files. This tells you how much time processes spend waiting for resources, which is more useful than raw usage numbers for capacity planning.

## Check Your Current Status

Before migrating, verify whether you are already on v2. The quickest check:

```bash
stat -f -c %T /sys/fs/cgroup
```

If the output is `cgroup2fs`, you are on v2. If it is `tmpfs`, you are on v1 (or a hybrid setup).

A more detailed check:

```bash
cat /proc/filesystems | grep cgroup
```

If you see `cgroup2` listed, the kernel supports v2. If you also see `cgroup` without the `2`, the system is running v1 or a hybrid.

For systemd-based systems, check the default:

```bash
systemd-analyze --system 2>/dev/null | grep -i cgroup || systemctl --version | head -1
```

systemd 232 and later default to v2 when the kernel supports it. Older versions use v1 regardless of kernel support.

## Pre-Migration Checklist

Run through this list before touching anything:

**1. Check your container runtime**

Docker and containerd both support cgroups v2, but older versions may have issues. Docker 20.10+ and containerd 1.6+ are safe. If you are running an older Docker version, upgrade first.

```bash
docker version --format '{{.Server.Version}}'
containerd --version
```

**2. Check Kubernetes version**

Kubernetes 1.24 and earlier do not support cgroups v2. Version 1.25 added support, but some features require v2. If you are on Kubernetes 1.24 or earlier, upgrade before migrating.

```bash
kubectl version --short
```

**3. Check monitoring tools**

Prometheus node-exporter, cAdvisor, and similar tools may need updates to read cgroups v2 metrics correctly. The file paths and metric names are different in v2. For example, v1 memory stats come from /sys/fs/cgroup/memory/docker/<container>/memory.usage_in_bytes, while v2 stats come from /sys/fs/cgroup/system.slice/docker-<container>.scope/memory.current. If your monitoring dashboards break after migration, this path change is usually the reason.

**4. Check systemd version**

```bash
systemctl --version | head -1
```

systemd 232+ supports v2 natively. Earlier versions may need configuration changes. If your systemd version is older than 232, you have two options: upgrade systemd (which may require a distro upgrade) or stay on the hybrid compatibility mode until you can upgrade. Running a very old systemd with cgroups v2 can cause subtle issues with service resource accounting and OOM behavior.

**5. Check your initramfs**

Some distributions embed cgroup configuration in the initramfs. Regenerate it after changing kernel parameters:

```bash
# Ubuntu/Debian
update-initramfs -u

# RHEL/CentOS/Fedora
dracut -f
```

## The Migration Process

### Step 1: Enable the cgroups v2 Kernel Parameter

On most systems, you enable v2 by adding a kernel parameter. The exact method depends on your bootloader.

**Using grubby (RHEL, CentOS, Fedora, AlmaLinux):**

```bash
# Check current settings
grubby --info=ALL | grep args

# Add unified_cgroup_hierarchy=1
grubby --update-kernel=ALL --args="unified_cgroup_hierarchy=1"

# Verify
grubby --info=ALL | grep unified
```

**Using GRUB directly (Ubuntu, Debian):**

Edit `/etc/default/grub` and add to `GRUB_CMDLINE_LINUX`:

```
GRUB_CMDLINE_LINUX="systemd.unified_cgroup_hierarchy=1"
```

Then update GRUB:

```bash
update-grub
```

### Step 2: Regenerate Initramfs

This ensures the new kernel parameters are baked into the initial ramdisk:

```bash
# Ubuntu/Debian
update-initramfs -u -k all

# RHEL/CentOS/Fedora
dracut -f --kver $(uname -r)
```

### Step 3: Reboot

```bash
reboot
```

### Step 4: Verify

After reboot, confirm v2 is active:

```bash
stat -f -c %T /sys/fs/cgroup
# Should output: cgroup2fs

ls /sys/fs/cgroup/
# Should show unified hierarchy: cgroup.controllers, cgroup.subtree_control, etc.

# Check that systemd is using v2
systemd-analyze --system 2>/dev/null | grep -i cgroup || true
```

## Handling Common Migration Issues

### Docker Containers Failing to Start

If Docker containers fail after migration, the most common cause is that Docker was configured to use cgroups v1 paths. Docker 20.10 and later handle the transition automatically, but older versions or custom configurations can cause problems. The most visible symptom is containers that start but immediately exit with a cgroup-related error in the logs. Check Docker's daemon configuration:

```bash
cat /etc/docker/daemon.json
```

If you see `"exec-opts": ["native.cgroupdriver=cgroupfs"]`, remove it. Docker 20.10+ automatically detects cgroups v2.

For older Docker versions that cannot be upgraded, you can add:

```json
{
  "exec-opts": ["native.cgroupdriver=systemd"]
}
```

But upgrading Docker is the better solution.

### Kubernetes Pods Stuck in Pending

Kubernetes nodes that were running on cgroups v1 may have kubelet configured for v1 paths. After migration, kubelet needs to detect the new cgroup driver:

```bash
# Check kubelet configuration
cat /var/lib/kubelet/config.yaml | grep cgroupDriver
```

If it says `cgroupfs`, change it to `systemd` for cgroups v2:

```yaml
cgroupDriver: systemd
```

Restart kubelet:

```bash
systemctl restart kubelet
```

### Monitoring Tools Showing Wrong Metrics

Prometheus node-exporter versions before 1.5.0 may not correctly read cgroups v2 metrics. Upgrade to the latest version:

```bash
# If installed via package manager
apt update && apt upgrade prometheus-node-exporter  # Debian/Ubuntu
yum update prometheus-node-exporter  # RHEL/CentOS
```

cAdvisor (used by Kubernetes) needs version 0.47.0+ for full cgroups v2 support.

### systemd Services Not Starting

Some services may reference v1-specific cgroup paths in their unit files. Check for hardcoded paths:

```bash
grep -r "cgroup/" /etc/systemd/system/ /usr/lib/systemd/system/
```

If you find references like `/sys/fs/cgroup/cpu/` or `/sys/fs/cgroup/memory/`, these need to be updated to v2 paths. In v2, the path is simply `/sys/fs/cgroup/<slice>/<service>/`.

### Legacy Compatibility Mode

If you cannot migrate immediately, some distributions support a hybrid mode that runs both v1 and v2 simultaneously. On RHEL/CentOS:

```bash
grubby --update-kernel=ALL --args="systemd.unified_cgroup_hierarchy=0 systemd.legacy_systemd_cgroup_controller=1"
```

This runs systemd under v2 but keeps v1 available for containers and other tools. It is a temporary solution, not a long-term strategy. The hybrid mode adds complexity and can cause subtle bugs where resource accounting does not match expectations. If you find yourself in hybrid mode, plan a full migration within a few weeks rather than leaving it running indefinitely.

## Post-Migration Verification

After the migration is complete and services are running, run through these checks:

```bash
# 1. Verify all containers are running
docker ps --format "table {{.Names}}\t{{.Status}}"
kubectl get pods --all-namespaces | grep -v Running

# 2. Check systemd services
systemctl --failed

# 3. Verify cgroup hierarchy
ls -la /sys/fs/cgroup/

# 4. Check PSI data is available
cat /proc/pressure/cpu
cat /proc/pressure/memory
cat /proc/pressure/io

# 5. Run a stress test
stress-ng --cpu 2 --timeout 10s &
cat /sys/fs/cgroup/system.slice/stress-ng.scope/cpu.stat
```

## What You Gain

The migration is not just about keeping up with kernel defaults. cgroups v2 provides real benefits:

**Better resource accounting**: The unified hierarchy means resource usage is tracked consistently across all controllers. You get accurate numbers for CPU, memory, and I/O usage without having to reconcile data from separate hierarchies. This matters for capacity planning and billing. When you can see exactly how much CPU and memory each service consumes, you can right-size your infrastructure and stop paying for resources that go unused.

**Proper delegation**: Container runtimes can manage cgroup settings without root access. This improves security by reducing the privilege surface for container orchestration.

**Pressure stall information**: PSI tells you when processes are waiting for resources, not just how much they are using. This is the difference between knowing your server uses 80 percent of its memory and knowing that processes are stalling because they cannot allocate memory fast enough.

**Future compatibility**: New Linux kernel features are being developed exclusively for cgroups v2. Staying on v1 means missing out on improvements to resource management, security, and observability.

The migration takes 30 minutes on a single server and a bit more planning for a Kubernetes cluster. The result is a system that is easier to manage, more secure, and ready for whatever the kernel developers build next.

For teams managing large Kubernetes clusters, the migration timeline matters. Plan to migrate worker nodes first, then control plane nodes. Migrate one node at a time and verify workload health before moving to the next. If you are running a mixed-version cluster (some nodes on v1, some on v2), test thoroughly — the kubelet behaves differently depending on which cgroup driver it detects at startup.


## Real-World Migration Example

Here is what a migration looks like on a production Ubuntu 22.04 server running Docker containers:

```bash
# Step 1: Check current status
stat -f -c %T /sys/fs/cgroup
# Output: tmpfs (running v1)

# Step 2: Check Docker version
docker version --format '{{.Server.Version}}'
# Output: 24.0.7 (safe for v2)

# Step 3: Add kernel parameter
sudo sed -i 's/GRUB_CMDLINE_LINUX=""/GRUB_CMDLINE_LINUX="systemd.unified_cgroup_hierarchy=1"/' /etc/default/grub
sudo update-grub

# Step 4: Regenerate initramfs
sudo update-initramfs -u -k all

# Step 5: Reboot the server (manually or via your orchestration tool)

# Step 6: Verify after reboot
stat -f -c %T /sys/fs/cgroup
# Output: cgroup2fs (v2 active)

# Step 7: Verify containers
docker ps
# All containers should be running normally

# Step 8: Check systemd
systemctl --failed
# Should show no failed units
```

The entire process takes about 10 minutes of active work plus the reboot time. The key is verifying each step before moving to the next. If Docker containers fail after the reboot, do not panic. The most common fix is removing the native.cgroupdriver=cgroupfs setting from daemon.json and restarting Docker.

For Kubernetes clusters, the migration is more involved because you need to coordinate across multiple nodes. Migrate worker nodes one at a time. Cordon each node before migration, drain pods, migrate, verify, then uncordon. Leave the control plane for last since it is the most sensitive to configuration changes.

The bottom line: cgroups v2 is not a breaking change if you prepare properly. It is a necessary evolution that brings Linux resource management into alignment with how modern systems actually work. The unified hierarchy, proper delegation, and pressure stall information are not nice-to-haves. They are the foundation for the next generation of container orchestration, observability, and resource control.
