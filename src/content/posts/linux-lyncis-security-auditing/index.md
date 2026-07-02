---
title: "Automated Linux Security Auditing with Lynis: Full System Scan and Remediation"
description: "A hands-on guide covering configuration, troubleshooting, and best practices for automated linux security auditing with lynis - full system scan and remediation."
pubDate: 2026-04-18
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Automated Linux Security Auditing with Lynis: Full System Scan and Remediation"
category: "security"
tags: [Security, Lynis, Auditing, Linux]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

## What Lynis Audits

Lynis is an open-source security auditing tool that scans your Linux system for vulnerabilities, misconfigurations, and compliance gaps. It checks over 300 items across authentication, file permissions, kernel parameters, installed packages, logging, and network configuration. After a scan, it produces a report with findings, suggestions, and a hardening score.

## Installation

```bash
# Via apt
sudo apt install lynis -y

# Or from source for the latest version
git clone https://github.com/CISOfy/lynis
cd lynis
```

## Running a Full Audit

```bash
sudo lynis audit system
```

The scan takes 2-5 minutes and produces output to the terminal and `/var/log/lynis.log`. At the end, you'll see:

```
Lynis security scan details:
  Hardening index : 67 [########......]
  Tests performed : 258
  Plugins enabled : 0
```

The hardening index is a score from 0-100. Below 60 needs immediate attention. 60-80 is decent. Above 80 is well-hardened.

## Understanding the Report

The full report is at `/var/log/lynis-report.dat`. Key sections:

```bash
# View the report
sudo cat /var/log/lynis-report.dat

# Filter for warnings
sudo grep "warning" /var/log/lynis.log

# Filter for suggestions
sudo grep "suggestion" /var/log/lynis.log
```

Warnings indicate configuration issues. Suggestions are recommendations for improvement. Not every suggestion applies to every environment — use judgment.

## Common Findings and Fixes

**"No password set for single-user mode"** (SUG-0214):

```bash
# Set a root password for recovery mode
sudo passwd root
```

**"Default umask could be more strict"** (AUTH-9328):

```bash
# /etc/login.defs
UMASK 027
```

**"Sysstat is not installed"** (ACCT-9630):

```bash
sudo apt install sysstat -y
sudo systemctl enable sysstat
```

**"SSH option PermitRootLogin should be set to 'no'"** (SSH-7412):

```bash
# /etc/ssh/sshd_config
PermitRootLogin no
```

**"No firewall found"** (FIRE-4512):

```bash
sudo apt install ufw -y
sudo ufw allow ssh
sudo ufw enable
```

**"Kernel parameters could be hardened"** (KRNL-6000):

```bash
# /etc/sysctl.d/99-hardening.conf
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
```

## Running Targeted Audits

Focus on specific areas:

```bash
# Only authentication checks
sudo lynis audit system --tests-from-group authentication

# Only kernel checks
sudo lynis audit system --tests-from-group kernel

# Only networking
sudo lynis audit system --tests-from-group networking
```

## Customizing the Audit

Create a custom profile to skip tests that don't apply:

```bash
# /etc/lynis/custom.prf
skip-test=SSH-7408  # Skip SSH protocol version check if using modern SSH
skip-test=PKGS-7392  # Skip package audit if using custom repos
```

## Automating Lynis

Schedule weekly scans with systemd timer:

```bash
# /etc/systemd/system/lynis-audit.service
[Unit]
Description=Lynis security audit

[Service]
Type=oneshot
ExecStart=/usr/sbin/lynis audit system --cronjob --quiet
```

```bash
# /etc/systemd/system/lynis-audit.timer
[Unit]
Description=Weekly Lynis audit

[Timer]
OnCalendar=Mon *-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

The `--cronjob` flag makes Lynis run non-interactively and automatically upload data (opt-in) to the Lynis community for benchmarking.

## Tracking Improvement Over Time

Compare reports:

```bash
# Save report after each scan
sudo cp /var/log/lynis-report.dat /var/log/lynis/lynis-report-$(date +%Y%m%d).dat

# Compare hardening index over time
grep "hardening_index" /var/log/lynis/lynis-report-*.dat
```

## Integrating with Compliance

Lynis maps findings to compliance standards (PCI-DSS, HIPAA, ISO 27001, SOC 2). Generate a compliance report:

```bash
# Show what's tested for specific standards
sudo lynis show details PCI-DSS
sudo lynis show details HIPAA
```

## Caveats

- Lynis flags issues that may be intentional in your environment. Don't blindly apply every suggestion.
- Some tests require specific packages. Lynis skips them gracefully.
- Lynis is a point-in-time audit. Combine with file integrity monitoring (AIDE) and intrusion detection (auditd) for continuous security.

## Summary

Run `lynis audit system` monthly, address warnings first, then work through suggestions. Track your hardening index over time — it's a simple metric that shows whether your security posture is improving or degrading.