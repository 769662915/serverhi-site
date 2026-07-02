---
title: "File Integrity Monitoring with AIDE: Detect Unauthorized Changes on Linux Servers"
description: "A hands-on guide covering configuration, troubleshooting, and best practices for file integrity monitoring with aide: detect unauthorized changes on linux servers."
pubDate: 2026-04-21
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for File Integrity Monitoring with AIDE: Detect Unauthorized Changes on Linux Servers"
category: "security"
tags: [Security, AIDE, Integrity, Linux]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

## Why File Integrity Monitoring

Intrusion detection starts with knowing what changed. If an attacker modifies a system binary, adds a backdoor to SSH, or replaces a configuration file, you need to know immediately. AIDE creates a cryptographic baseline of your filesystem and alerts on any deviation.

```bash
sudo apt install aide -y
sudo aideinit
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
```

## Configuration

Rules in `/etc/aide/aide.conf` define what to check:

```
NORMAL = p+i+n+u+g+s+m+c+acl+selinux+xattrs+sha512
```

Rule components: p=permissions, i=inode, n=links, u=user, g=group, s=size, m=mtime, c=checksum.

```bash
/bin NORMAL
/sbin NORMAL
/usr/bin NORMAL
/etc NORMAL
!/etc/mtab
/var/log LOG
```

## Running Checks

```bash
sudo aide --check
# Silent output means no unauthorized changes

# After legitimate changes, update baseline:
sudo aide --update
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
```

## Automation

Create systemd timer for daily checks. The scan takes 2-5 minutes — schedule during low activity.

## Key Paths to Monitor

Monitor: `/bin`, `/sbin`, `/usr/bin`, `/etc`, `/lib`, `/boot`. Exclude: `/var/log`, `/tmp`, `/proc`, `/sys`, database data directories.

AIDE + auditd = comprehensive file integrity coverage. AIDE catches what happens between real-time checks; auditd catches what happens in real time.