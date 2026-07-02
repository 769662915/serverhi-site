---
title: "SSL/TLS Certificate Expiry: Averted Disasters and Automated Renewal Troubleshooting"
description: "A hands-on guide covering configuration, troubleshooting, and best practices for ssl/tls certificate expiry - averted disasters and automated renewal troubleshooting."
pubDate: 2026-04-20
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for SSL/TLS Certificate Expiry: Averted Disasters and Automated Renewal Troubleshooting"
category: "troubleshooting"
tags: [SSL, TLS, Certificates, Troubleshooting]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

## Why File Integrity Monitoring

Intrusion detection starts with knowing what changed. If an attacker modifies a system binary, adds a backdoor to SSH, or replaces a configuration file, you need to know immediately. AIDE (Advanced Intrusion Detection Environment) creates a cryptographic baseline of your filesystem and alerts on any deviation.

Unlike real-time tools like auditd, AIDE is a periodic integrity checker. It's simple, reliable, and has no runtime overhead. Run it once a day and get a report of every changed file.

## Installation and Initialization

```bash
sudo apt install aide -y
sudo aideinit
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
```

## Configuration Rules

Rules in `/etc/aide/aide.conf` define what to check for each file pattern:

```
NORMAL = p+i+n+u+g+s+m+c+acl+selinux+xattrs+sha512
DIR = p+i+n+u+g+acl+selinux+xattrs
LOG = p+u+g+n+i+S
```

Rule components: p=permissions, i=inode, n=links, u=user, g=group, s=size, m=mtime, c=checksum.

```bash
# Critical system binaries
/bin NORMAL
/sbin NORMAL
/usr/bin NORMAL
/usr/sbin NORMAL

# Configuration files
/etc NORMAL
!/etc/mtab
!/etc/machine-id

# Log files - only track ownership
/var/log LOG
```

## Running Checks

```bash
sudo aide --check
# Silent output = no changes = good

# After legitimate changes, update baseline:
sudo aide --update
sudo mv /var/lib/aide/aide.db.new /var/lib/aide/aide.db
```

## Automating with Systemd

Create `/etc/systemd/system/aide-check.service` and `.timer` for daily runs. The check takes 2-5 minutes and should run during low-activity periods.

## What to Monitor

Essential paths: `/bin`, `/sbin`, `/usr/bin`, `/usr/sbin`, `/etc`, `/lib`, `/boot`. Exclude: `/var/log`, `/tmp`, `/proc`, `/sys`, database data directories.

## Summary

Install AIDE, configure rules for critical paths, initialize baseline, automate daily checks, update baseline after every legitimate change. A clean AIDE report every morning means your filesystem is intact.