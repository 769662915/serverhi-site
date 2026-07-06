---
title: "Linux Disk Full? A Systematic Guide to Finding and Fixing the Problem"
description: "When your server hits 90% disk usage at 2 a.m., you need a process, not panic. This guide walks through the exact commands and workflow to find what's eating your disk and reclaim space without breaking running services."
pubDate: 2026-07-07
coverImage: "./cover.webp"
coverImageAlt: "A terminal-style illustration showing a Linux disk usage analyzer with colorful bar charts and directory tree, rendered in green-on-black terminal aesthetic"
category: troubleshooting
tags: [Linux, disk space, troubleshooting, du, ncdu, system administration]
difficulty: intermediate
estimatedTime: "15 minutes"
osCompatibility: [Ubuntu 24.04, Debian 12, RHEL 9]
---

A server running out of disk space is one of those problems that announces itself in the worst possible way. A database stops writing. A cron job fails silently for three days. Docker pulls start returning "no space left on device." And you're SSHing in at an hour you'd rather not think about.

The solution isn't to `rm -rf` something and hope. It's to follow a repeatable process that finds the real culprit and fixes it without collateral damage. Here's the workflow.

## Step 1: Get the Big Picture with df

Before you delete anything, understand what you're looking at.

```bash
df -h
```

This shows every mounted filesystem and its usage percentage. The `-h` flag gives human-readable sizes. Pay attention to the `Use%` column — that's what triggered the alert.

If you see 100% on `/` or `/var`, you have a filesystem-level problem. If it's a Docker overlay filesystem, the fix is different from a log directory. The `df` output tells you which.

```bash
df -hT
```

Adding `-T` shows the filesystem type. This matters because `xfs` and `ext4` handle inode exhaustion differently, and Docker overlay filesystems have their own cleanup commands.

## Step 2: Find the Largest Directories

Once you know which filesystem is full, drill down with `du`.

```bash
du -h --max-depth=1 / | sort -hr | head -20
```

This lists the 20 largest directories at the root level, sorted by size. On most Linux servers, the usual suspects appear quickly:

- `/var` — logs, Docker data, package caches
- `/home` — user data, but also abandoned core dumps
- `/tmp` — temporary files that never got cleaned
- `/usr` — usually static, but old kernels pile up in `/usr/src`

Don't run `du` on the entire filesystem recursively — on a large disk, that can take minutes. Use `--max-depth=1` to go one level at a time, then drill into the biggest offender.

```bash
du -h --max-depth=1 /var | sort -hr | head -10
```

## Step 3: Check for Deleted-But-Open Files

This one catches people off guard. When a process holds a file handle open and you delete the file, the space doesn't actually get freed until the process closes the handle or exits.

```bash
lsof | grep deleted | awk '{print $1, $2, $9}' | sort -u
```

If you see a large file in the output — especially a log file — restarting the owning process will release the space instantly. No need to delete anything else.

A common scenario: you rotated a log file but the application is still writing to the old (deleted) inode. The disk shows full, `du` can't find the space, but `lsof` reveals a 20 GB ghost file.

## Step 4: Clean Package Manager Caches

Package managers hoard downloaded packages by default. On a server that's been running for a year, the cache can be several gigabytes.

```bash
# Debian/Ubuntu
apt clean
apt autoremove --purge

# RHEL/Fedora
dnf clean all
```

On Ubuntu servers, old kernels accumulate in `/boot`. Remove them:

```bash
dpkg --list | grep linux-image | awk '{print $2}'
apt purge $(dpkg --list | grep -E 'linux-image-[0-9]' | grep -v $(uname -r) | awk '{print $2}')
```

That last command keeps the running kernel and removes everything else. Test it with `--dry-run` first if you're on a production machine.

## Step 5: Tame systemd Journal Logs

The systemd journal can grow unchecked, especially on servers that log verbose application output through systemd.

```bash
journalctl --disk-usage
```

If it's over 500 MB, set a size cap:

```bash
journalctl --vacuum-size=500M
journalctl --vacuum-time=7d
```

Make the limit permanent by editing `/etc/systemd/journald.conf`:

```ini
SystemMaxUse=500M
```

Then restart the service:

```bash
systemctl restart systemd-journald
```

## Step 6: Docker-Specific Cleanup

Docker's overlay2 storage driver is notorious for gradual disk consumption. Images pile up, volumes stick around after containers are removed, and build cache accumulates silently.

```bash
docker system df
```

This shows the breakdown: images, containers, local volumes, and build cache. To clean everything not actively in use:

```bash
docker system prune -a --volumes
```

The `-a` flag removes all unused images (not just dangling ones). The `--volumes` flag removes unused volumes. On a development server where images are pulled regularly, this can free 10-30 GB in one command.

If you can't prune everything, start with just dangling images:

```bash
docker image prune
```

## Step 7: Install ncdu for the Next Time

If you have one takeaway from this guide, let it be `ncdu`. It's an interactive terminal-based disk usage analyzer that turns the `du` workflow into something you can actually navigate.

```bash
apt install ncdu
ncdu /
```

Navigate with arrow keys, press `d` to delete, `?` for help. On a server with limited disk I/O, add `-x` to stay on one filesystem. It's faster than `du` for interactive exploration and gives you a visual map of where your disk space actually lives.

## The Workflow, Summarized

When disk space runs out, the order of operations is:

1. `df -h` — which filesystem is full?
2. `du -h --max-depth=1` — which directory is the culprit?
3. `lsof | grep deleted` — are there ghost files?
4. Clean caches, logs, old kernels.
5. Docker-specific cleanup if applicable.
6. Install `ncdu` so next time takes 30 seconds instead of 30 minutes.

The goal isn't to memorize every flag. It's to have a checklist you can run through at 2 a.m. when your brain is running on caffeine and adrenaline. Print this one and tape it to the proverbial wall.
