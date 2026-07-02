---
title: "Linux Namespace Isolation: Understanding Container Foundations at the Kernel Level"
description: "A hands-on guide covering configuration, troubleshooting, and best practices for linux namespace isolation - understanding container foundations at the kernel level."
pubDate: 2026-04-12
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Linux Namespace Isolation: Understanding Container Foundations at the Kernel Level"
category: "linux"
tags: [Linux, Namespaces, Containers, Kernel]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

## What Are Linux Namespaces

Namespaces are the kernel feature that makes containers possible. Each namespace wraps a global system resource in an abstraction that makes it appear to processes within the namespace that they have their own isolated instance. Docker isn't magic — it's namespaces plus cgroups plus a union filesystem.

Linux provides eight namespace types:

| Namespace | Isolates | Used by Docker for |
|-----------|----------|-------------------|
| Mount (mnt) | Filesystem mount points | Container-specific /proc, /sys, rootfs |
| PID | Process IDs | PID 1 inside container, invisible host processes |
| Network (net) | Network interfaces, routes, firewall rules | Container's eth0, private localhost |
| UTS | Hostname and domain name | Container's own hostname |
| IPC | System V IPC, POSIX message queues | Isolated shared memory |
| User | UID and GID mappings | Root in container ≠ root on host |
| Cgroup | Cgroup view | Container sees only its own cgroup limits |
| Time | Boot and monotonic clocks | Different system time per container |

## Inspecting Namespaces

Every process belongs to one namespace of each type. See them via `/proc`:

```bash
# List namespaces of a process
ls -la /proc/1/ns/

# Check which namespace a container is in
docker inspect -f '{{.State.Pid}}' my-container
ls -la /proc/$(docker inspect -f '{{.State.Pid}}' my-container)/ns/
```

Two processes in the same namespace show the same inode number. Enter a container's namespaces with `nsenter`:

```bash
# Enter all namespaces of a container
sudo nsenter -t $(docker inspect -f '{{.State.Pid}}' my-container) \
  --mount --uts --ipc --net --pid -- /bin/bash

# Now you're "inside" the container from the host
hostname   # Shows container's hostname
ps aux     # Only container processes (due to PID namespace)
```

## Creating Namespaces Manually

You can create namespaces without Docker using the `unshare` command:

```bash
# New mount + PID + UTS namespace, run a shell
sudo unshare --mount --pid --uts --fork /bin/bash

# Inside this shell:
hostname isolated-box
mount -t proc proc /proc
ps aux
# Only shows processes in this PID namespace
```

## User Namespace Deep Dive

User namespaces are the most powerful for security. They allow a process to be "root" inside the namespace while being an unprivileged user on the host:

```bash
# Create a user namespace where you appear as root
unshare --user --map-root-user /bin/bash

# Inside: id shows uid=0
# Outside: process still runs as your real UID
```

This is how Docker rootless mode works — the Docker daemon runs as a regular user, and containers get user namespaces that map container-root to the host's unprivileged UID.

Check the UID mapping:

```bash
cat /proc/$(pgrep dockerd)/uid_map
#          0       1000          1
# container UID 0 → host UID 1000
```

## Network Namespace in Practice

Network namespaces are where most debugging happens:

```bash
# Create a network namespace
sudo ip netns add test-ns

# Run a command in that namespace
sudo ip netns exec test-ns ip addr
# Only loopback — no network yet

# Create a veth pair to connect namespaces
sudo ip link add veth0 type veth peer name veth1
sudo ip link set veth1 netns test-ns

# Inside the namespace
sudo ip netns exec test-ns ip addr add 10.0.0.2/24 dev veth1
sudo ip netns exec test-ns ip link set veth1 up
sudo ip netns exec test-ns ip link set lo up

# Outside
sudo ip addr add 10.0.0.1/24 dev veth0
sudo ip link set veth0 up

# Now ping across namespaces
ping 10.0.0.2
```

This is exactly what Docker does with `docker0` bridge + veth pairs for each container.

## Mount Namespace and Container Filesystems

Mount namespaces let containers have their own `/proc`, `/sys`, and root filesystem:

```bash
# Create a mount namespace with a new root
sudo unshare --mount --fork /bin/bash

# Mount a new proc
mount -t proc proc /proc

# Now /proc shows only this namespace's processes
ls /proc | grep -E '^[0-9]+$'
```

Docker combines mount namespaces with overlay filesystems to give each container its own root without copying the entire image.

## Why This Matters for Troubleshooting

Understanding namespaces helps you debug container problems:

- **"File not found" inside container but exists on host**: You're in different mount namespaces. Files outside the container's rootfs aren't visible.
- **"Connection refused" between containers**: Check that they share a network (same bridge, or linked via `--network`).
- **PID 1 behavior**: The process with PID 1 in a PID namespace handles signals differently. It won't receive SIGTERM unless explicitly handled.

## Practical Commands

```bash
# Find all network namespaces (including Docker containers)
sudo lsns -t net

# Find all processes in a specific namespace
sudo lsns -p $(docker inspect -f '{{.State.Pid}}' my-container)

# Exec into a container without Docker
sudo nsenter -t $(docker inspect -f '{{.State.Pid}}' my-container) -a /bin/bash
```

Namespaces are the kernel's isolation primitive. Everything Docker, Podman, and containerd do sits on top of these eight namespace types plus cgroups for resource control.