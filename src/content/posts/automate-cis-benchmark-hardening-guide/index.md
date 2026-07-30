---
title: "Automating Linux Server Hardening with CIS Benchmarks: Stop Doing This Manually"
description: "The CIS benchmarks define over 200 security controls for a typical Linux server. Running through them manually takes hours and guarantees you'll miss something. Here's how to automate the entire process."
pubDate: 2026-07-31
coverImage: "./cover.webp"
coverImageAlt: "A terminal screen showing a completed CIS benchmark compliance report with green checkmarks and a score of 98%, rendered in terminal green on dark background"
category: "server-config"
tags: ["Linux", "Security", "CIS", "Hardening", "Automation", "Ubuntu"]
author: "ServerHi Editorial Team"
draft: false
difficulty: "intermediate"
estimatedTime: "25 minutes"
prerequisites:
  - "Basic Linux system administration"
  - "SSH access to a test server"
osCompatibility: ["Ubuntu 22.04", "Ubuntu 24.04", "Debian 12", "RHEL 9", "Rocky Linux 9"]
---

The Center for Internet Security publishes benchmarks that define baseline security configurations for virtually every operating system and application you run. The Ubuntu Linux benchmark alone contains over 200 individual controls covering filesystem permissions, service configurations, network settings, logging, and access management. A manual audit against these controls takes a competent sysadmin four to six hours per server. If you're managing a dozen servers, that's a full work week every quarter, assuming nothing else goes wrong. You'll miss things because you're human and because the benchmark PDF is 500 pages long. You'll burn an afternoon. And then you'll do it again next quarter when the benchmark updates.

Or you can automate the whole thing in under an hour of setup time and run compliance checks in under three minutes.

## What CIS Benchmarks Actually Cover

The CIS benchmarks aren't vague recommendations. They're specific, testable configurations. Each control defines exactly what state the system should be in and how to verify it. Here's the structure:

**Level 1 controls** are safe for production. They won't break applications or disrupt services. Things like ensuring `/tmp` is mounted with the `noexec` option, disabling unused filesystems like `cramfs` and `freevxfs`, or configuring password policies in `/etc/security/pwquality.conf`.

**Level 2 controls** provide defense in depth but may impact functionality. These include things like disabling USB storage at the kernel level, enforcing AppArmor or SELinux in enforcing mode with no unconfined processes, or restricting `at` and `cron` to authorized users only.

The benchmark groups controls into categories: initial setup, services, network configuration, logging and auditing, access control, and system maintenance. Each category has between 20 and 50 individual checks. Running them manually means typing commands, comparing output against expected values, and documenting results. Nobody does this correctly without tooling, and the people who claim they do have never been through an actual compliance audit where the auditor asks to see dated evidence for every control.

The CIS benchmarks get updated roughly every six to twelve months as new vulnerabilities are discovered and best practices evolve. The Ubuntu 22.04 benchmark you downloaded last year may already be superseded. Check the CIS website before starting a new hardening cycle to make sure you're working against the current version.

## Step 1: Install the Assessment Tool

The CIS provides a free Java-based assessment tool called CIS-CAT that runs against the official benchmark definitions and produces compliance reports suitable for auditors. It's thorough but heavy — it needs a JRE, downloads benchmark XML files, and takes several minutes per run. There's also an open-source alternative called `lynis` that maps roughly 80% of its checks to CIS controls and runs in seconds without Java. For this guide, we'll use `lynis` because it integrates cleanly into shell scripts and is the tool most teams actually adopt in practice. If you need formal compliance reporting for PCI DSS or SOC 2, you'll want CIS-CAT too, but start with lynis for operational hardening.

```bash
# Install lynis from the official repository
sudo apt update
sudo apt install lynis -y

# Verify installation
lynis --version
```

On RHEL-based systems, enable EPEL first:

```bash
sudo dnf install epel-release -y
sudo dnf install lynis -y
```

Lynis doesn't make changes to your system. It only audits. This is what you want for a first pass — you need to understand where you stand before you start modifying anything. Running `lynis audit system` as root gives it access to read all configuration files, check running processes, and verify kernel parameters. Without root, it skips several categories of checks and won't give you a complete picture.

## Step 2: Run Your Baseline Audit

Run the full audit against your server. The output goes to both the terminal and a log file. This first run will be noisy — expect dozens of warnings and suggestions — because no default OS installation ships with CIS-compliant settings. That's normal. The audit isn't telling you your server is broken. It's telling you where the gaps are between your current configuration and the community-vetted baseline.

```bash
sudo lynis audit system --quick
```

The `--quick` flag skips the interactive prompts that ask you to press Enter between sections. You'll see output scroll by as lynis checks hundreds of items. When it finishes, you get a summary that looks like this:

```
  Hardening index : 67 [###########       ]
  Tests performed : 258
  Plugins enabled : 1

  -[ Lynis 3.1.4 Results ]-
  Suggestions (84):
  Warnings (12):
```

The hardening index is a rough score. Don't obsess over it. Focus on the suggestions and warnings list, which are in the detailed report.

## Step 3: Read the Report and Prioritize

Lynis writes its full report to `/var/log/lynis-report.dat`. This file contains every test result, every suggestion, and every warning. You can read it directly, but it's easier to use lynis itself to extract what you need:

```bash
# Show all suggestions
sudo lynis show suggestions

# Show only warnings
sudo lynis show warnings

# Show suggestions for a specific category
sudo grep "FILE-6310\|AUTH-9286\|SSH-7408" /var/log/lynis-report.dat
```

Here's the prioritization strategy that works in practice:

**First pass — warnings only.** Warnings are things that are actively wrong, not just suboptimal. An SSH server configured to allow root login with password authentication will show as a warning because it's a direct attack vector. Fix all warnings before touching suggestions. If your server gets compromised while you're still working through cosmetic suggestions, the post-incident review won't care about your filesystem mount options.

**Second pass — Level 1 suggestions.** These are safe, production-compatible changes. Mounting `/tmp` with `nodev,nosuid,noexec`, setting password expiration policies, enabling auditd. You can run through these without worrying about breaking anything if you've already tested on a staging environment. A typical Ubuntu server will have 60-80 Level 1 suggestions on first audit. Most of them are one-line fixes.

**Third pass — Level 2 suggestions.** These require judgment. Disabling USB storage might break your backup workflow if you're writing to external drives. Enforcing SELinux in strict mode might prevent your application from accessing files it needs — especially if the application was installed outside the package manager or writes to non-standard directories. Apply these one at a time, test after each change, and document which ones you skip and why.

## Step 4: Automate the Fixes

Once you know what needs to change, scripting the remediation saves you from typing the same commands on every server. Here's a starter script that applies the most common Ubuntu Level 1 controls:

```bash
#!/bin/bash
# cis-level1.sh — Apply common CIS Level 1 hardening controls
# Test on a non-production system first

set -e

echo "Applying CIS Level 1 hardening..."

# 1. Filesystem hardening
echo "==> Hardening filesystems..."
cat >> /etc/fstab <<EOF
tmpfs /tmp tmpfs defaults,nodev,nosuid,noexec 0 0
EOF
mount -o remount /tmp

# Disable unused filesystems
echo "install cramfs /bin/true" > /etc/modprobe.d/cramfs.conf
echo "install freevxfs /bin/true" > /etc/modprobe.d/freevxfs.conf
echo "install jffs2 /bin/true" > /etc/modprobe.d/jffs2.conf
echo "install hfs /bin/true" > /etc/modprobe.d/hfs.conf
echo "install hfsplus /bin/true" > /etc/modprobe.d/hfsplus.conf
echo "install squashfs /bin/true" > /etc/modprobe.d/squashfs.conf
echo "install udf /bin/true" > /etc/modprobe.d/udf.conf

# 2. SSH hardening
echo "==> Hardening SSH..."
sed -i 's/^#PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/^#PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#MaxAuthTries.*/MaxAuthTries 4/' /etc/ssh/sshd_config
sed -i 's/^#ClientAliveInterval.*/ClientAliveInterval 300/' /etc/ssh/sshd_config
sed -i 's/^#ClientAliveCountMax.*/ClientAliveCountMax 0/' /etc/ssh/sshd_config
systemctl reload sshd

# 3. Password policy
echo "==> Configuring password policies..."
cat > /etc/security/pwquality.conf <<EOF
minlen = 14
dcredit = -1
ucredit = -1
ocredit = -1
lcredit = -1
EOF

# 4. Enable auditd
echo "==> Enabling auditd..."
systemctl enable auditd
systemctl start auditd

# 5. Configure sysctl network hardening
echo "==> Configuring network hardening..."
cat > /etc/sysctl.d/99-cis-hardening.conf <<EOF
net.ipv4.ip_forward = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.secure_redirects = 0
net.ipv4.conf.default.secure_redirects = 0
net.ipv4.conf.all.log_martians = 1
net.ipv4.conf.default.log_martians = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0
EOF
sysctl -p /etc/sysctl.d/99-cis-hardening.conf

echo "Done. Reboot recommended."
```

This script is intentionally conservative. It disables unused kernel modules, hardens SSH, sets password requirements, enables audit logging, and locks down network parameters. None of these changes should break a standard web server or database server workload. Run it on a staging environment before production, as always.

If you're managing more than three servers, put this script in your configuration management tool of choice. Ansible, Puppet, and Chef all have community-maintained CIS hardening roles that implement these controls with proper idempotency and rollback support. The script above is a starting point for understanding what's happening under the hood. Once you've validated the approach on a single server, move to a configuration management role so you're not SSH-ing into individual machines to apply patches.

## Step 5: Schedule Regular Audits

Hardening isn't a one-time event. Configurations drift. Package updates change default settings. New services get installed and open ports you didn't know about. Schedule a weekly audit and compare results against your baseline:

```bash
#!/bin/bash
# /etc/cron.weekly/cis-audit

REPORT_DIR="/var/log/cis-audits"
mkdir -p "$REPORT_DIR"

DATE=$(date +%Y-%m-%d)
lynis audit system --quick > "$REPORT_DIR/$DATE.txt" 2>&1

# Extract hardening index for trend tracking
INDEX=$(grep "Hardening index" "$REPORT_DIR/$DATE.txt" | awk '{print $4}')
echo "$DATE,$INDEX" >> "$REPORT_DIR/history.csv"

# Alert if score drops below threshold
if [ "$INDEX" -lt 70 ]; then
    echo "WARNING: CIS hardening index dropped to $INDEX on $(hostname)" | \
        mail -s "CIS Audit Alert" admin@example.com
fi
```

This gives you a CSV file tracking your hardening index over time, which is invaluable for audits and compliance reporting. When your compliance officer asks for evidence that servers were hardened and stayed hardened, you have a dated log of every audit result going back to whenever you set up the cron job. That CSV file, combined with the script you used to apply fixes, is a defensible compliance artifact.

If you're operating in a regulated environment, go one step further and ship these audit results to a centralized log system. Splunk, Elasticsearch, or even a simple rsyslog forwarder can collect the weekly audit reports from all your servers and give you a dashboard showing hardening scores across your fleet. When one server's score drops because someone installed a new service that opened unexpected ports, you'll see it in the dashboard before it becomes an incident.

## What CIS Benchmarks Can't Catch

CIS benchmarks are configuration-level controls. They verify that your SSH daemon doesn't allow root login, that your password policy requires 14 characters, and that unused kernel modules are disabled. They don't check whether your application code has SQL injection vulnerabilities. They don't verify that your IAM policies are correct or that your S3 buckets aren't public. Server hardening is one layer. Application security, network segmentation, and identity management are separate layers that require separate tooling.

Don't mistake a 95% CIS score for a secure system. It means your Linux configuration is solid. Measure the other layers too. A server that scores 100% on the CIS benchmark but runs a PHP application from 2017 with known remote code execution vulnerabilities is not a secure server. It's a securely configured server running vulnerable software, which is a distinction that matters when you're explaining to your CISO why the breach happened despite your "fully hardened" infrastructure.

The CIS benchmark is the floor, not the ceiling. It tells you that your operating system is configured according to a community-vetted baseline. Whether the rest of your stack meets the same standard is a separate investigation.

## When to Skip a Control

Not every CIS control applies to every server. If you're running a container host that mounts images at `/var/lib/docker`, the control that requires `/var` to be mounted with `nodev` will break Docker. Skip it and document the exception.

The same goes for `nosuid` on filesystems that need `suid` binaries. The `ping` command needs the `suid` bit on most distributions. The `sudo` command definitely needs it. CIS controls flag these as issues, but you override them with a documented exception, not by breaking your system.

Good hardening is specific to your workload. The CIS benchmark is a starting point, not a law. Apply what makes sense, document what you skip, and re-audit regularly to make sure the exceptions you granted last year still make sense today. Nothing undermines a security program faster than blindly applying every CIS control and then having to revert half of them when production breaks. Your ops team will stop trusting the benchmarks. Your security team will stop enforcing them. And you'll end up with the worst of both worlds: servers that are neither hardened nor operational.

The goal is not 100% compliance with a PDF. It's servers that are measurably harder to compromise than they were yesterday, with a process that makes that measurement repeatable and auditable. The CIS benchmark gives you the measurement. The automation gives you the repeatability. The rest is just doing the work.
