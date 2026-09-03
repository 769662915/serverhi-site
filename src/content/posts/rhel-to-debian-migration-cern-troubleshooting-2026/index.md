---
title: "RHEL to Debian: Debug the Migration CERN Just Committed To"
description: "CERN is moving 2,200+ accelerator machines to Debian 13. Here is how to troubleshoot the package, kernel, and service breakage that shows up when you leave RHEL."
pubDate: 2026-09-04
coverImage: "./cover.webp"
coverImageAlt: "A rack of industrial computers with a Debian terminal on the KVM screen showing apt and systemctl output"
category: "troubleshooting"
tags: ["Debian", "RHEL", "CentOS", "Linux", "migration", "troubleshooting"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: "intermediate"
estimatedTime: "35 minutes"
prerequisites:
  - "Root or sudo on a test host that can be rebuilt"
  - "A current RHEL/CentOS/Rocky inventory of packages and systemd units"
  - "Ability to boot a rescue image if the first Debian install misses a driver"
osCompatibility: ["Debian 13", "RHEL 8+", "Rocky 8+", "CentOS Stream 8+", "Ubuntu 22.04+ (for comparison)"]
---

CERN is leaving the Red Hat path. That sentence would have sounded like trolling five years ago. It is [now a MiniDebConf talk](https://www.phoronix.com/news/CERN-Goes-Debian-Leaving-RHEL).

The lab that co-maintained Scientific Linux, then spent a decade on CentOS, is putting more than 2,200 industrial and embedded accelerator computers on Debian 13 before the end of 2026. [Linuxiac's write-up of the plan](https://linuxiac.com/debian-13-is-taking-over-2200-control-systems-across-cern/) is not a desktop-preference thread. The machines sit next to accelerator hardware. They cannot be patched on a whim. Operating periods, technical stops, commissioning windows, and long shutdowns set the calendar. The Q4 2026 deadline is an accelerator deadline, not an IT one. If a kernel update misses that window, it waits. That is why the OS choice had to fit the hardware they already own, not the hardware a vendor would rather sell them in 2027.

The reason they moved is the part you should steal. A 2023 risk analysis said staying on RHEL would cost about CHF 5.4 million, force redesigns of roughly 11 hardware boards, pull in more electronics and software engineers, rewire racks, and still only have an optimistic 20 percent chance of a clean commissioning even if the replacement boards were bug-free. Phoronix quotes the engineers on the last straw: the default `-march=x86-64-v2` compiler flag as forced obsolescence for old hardware. CentOS Stream was considered as the "natural" next step. They still left.

This is a troubleshooting guide for the rest of us who will copy the decision on smaller iron and then spend a week staring at `apt` and `systemctl` wondering why a unit that was fine on Rocky is now dead.

## Confirm you are debugging the OS, not the board

CERN chose a software move because the hardware redesign was the expensive failure mode. Your first job on a failed cutover is the same: prove the box still sees its disks, NICs, and whatever PCI device the app actually uses.

Boot the Debian install or the rescue image. Check `lspci` and `ip link` before you touch apt sources. If a NIC or HBA is missing, you do not have a package problem. You have a kernel-module problem, and no amount of `apt install` of the userspace daemon will fix a driver that was never built for this ABI.

RHEL kernels carry a lot of out-of-tree and enterprise backport weight. Debian 13's kernel is a different set of configs. Firmware files live in `firmware-linux-nonfree` and friends, which are often in non-free-firmware, not in the default install. If `dmesg` says firmware missing, that is your ticket. Do not start rewriting unit files until `dmesg` is quiet about hardware.

Write down the kernel version you landed on. Yesterday we published a [Fraggap / CVE-2026-53362 patching note](/posts/linux-cve-2026-53362-ipv6-privilege-escalation/). Distro migration is not a substitute for that work. ZDNet's roundup of the same bug listed upstream stables at 6.1.177, 6.6.144, 6.12.95, 6.18.38, and 7.1.3. Debian 13 will have its own package name for the fix. Check it. A new distro with an old hole is not an upgrade.

## The name mapping will waste your first afternoon

The breakage that looks like "Debian is broken" is usually a renamed package.

`httpd` is `apache2`. `nginx` is still `nginx`, which is the exception that tricks you. `chronyd` is `chrony`. `firewalld` is probably `nftables` plus a pile of your own rules, unless you install firewalld anyway. `python3` is fine; `/usr/bin/python` may not exist. `cronie` is `cron`. `yum`/`dnf` is `apt`. `rpm -qa` is `dpkg -l`. `systemctl` is the one thing that does not rename itself, which is why people assume everything else is identical.

Before you migrate a host, dump the RHEL package list and the enabled units:

```bash
rpm -qa --qf '%{NAME}\n' | sort > /root/rhel-pkgs.txt
systemctl list-unit-files --state=enabled --no-legend | awk '{print $1}' > /root/rhel-units.txt
```

On the Debian side, do not try to install the RHEL names. Build a two-column map in a spreadsheet like an adult. The failures you will hit in the first hour are:

- A systemd unit that still says `Requires=network.service` when Debian wants `network-online.target` or `NetworkManager-wait-online.service`, depending on whether you kept ifupdown, systemd-networkd, or NetworkManager.
- A sysv-era `/etc/init.d` script that RHEL was ignoring because a unit file shadowed it. Debian may still run the init script if you copied `/etc` blindly.
- Timers versus cron. RHEL shops love `/etc/cron.d`. Debian will run those, but if you also enabled a `.timer` with the same job, you get double runs and a mysterious lock file.

If DNS looks "fine" but is not, you are probably fighting `systemd-resolved` versus a static `resolv.conf` you copied from Rocky. We already have a [DNS failure checklist](/posts/dns-resolution-failure-troubleshooting-guide-2026/). Use it. Do not chmod 644 `/etc/resolv.conf` and call it a day if resolved is still managing the stub.

## CERN's actual complaint: packaging, not systemd

Phoronix's summary of the MiniDebConf talk is the most useful sentence in the coverage for operators. The onboarding pain was not "apt is hard." It was the lack of standard tooling for automated building and publishing of packages, and tools that do not like multiple versions of the same package living side by side.

That is the RHEL muscle memory. `yum`/`dnf` plus an internal repo plus `module` streams plus a habit of shipping `foo-1.2` and `foo-1.3` as parallel RPMs. Debian's answer is usually: one version in the distro, a backport if you are lucky, and a PPA or a vendor repo if you are not. If your environment needs two OpenSSL ABIs or two Python minors on the same box, Debian will make you use containers, `/opt`, or a carefully pinned repo. Fighting that with `equivs` and force-installs is how you get an un-upgradable host.

If you maintain an internal package pipeline, budget time for:

- Replacing `mock`/`rpmbuild` with `sbuild` or `pbuilder`.
- Replacing a simple createrepo + httpd tree with `reprepro` or `aptly`.
- Deciding, in writing, that you will not ship two versions of `libfoo` on one OS. Put the second version in a container.

The accelerator constraint CERN described is the same constraint as a plant PLC network or a lab instrument rack: you cannot "just rebuild it on a new CPU baseline." If `-march=x86-64-v2` is what pushed them off RHEL, grep your own build logs for that flag before you congratulate yourself on a Rocky 9 upgrade. A distro default that silently drops your 2014 industrial PC is a production incident with a compiler error as the root cause.

## Services that start and then do nothing

After the packages install, you get the class of bugs that waste senior people: the unit is `active (running)` and the app is not doing work.

Check the user. RHEL RPM scripts often create `foo:foo` with a fixed UID. Debian packages may use `nobody`, `_foo`, or a dynamic UID. If your data directory is still owned by UID 994 from Rocky and the Debian daemon is UID 108, you get a service that "runs" and cannot write its own queue. `ls -ln` the data dir. Do not chown -R until you know which UID the new package expects.

Check the filesystem layout. RHEL-ish images love `/var/lib/foo`. Debian may have moved state to `/var/lib/foo/data` or under `/usr/lib`. Bind-mounting the old path without reading `debian/foo.install` is how you dual-write and then lose the new write on reboot.

Check [process supervision](/posts/linux-process-management-htop-guide-2026/) the boring way. `systemctl status` plus `journalctl -u foo -b` plus `htop` filtered to the UID. If the process is sleeping on a socket that nothing is connecting to, you have a listen-address problem (`127.0.0.1` vs `::` vs the old RHEL default of `0.0.0.0`). Debian's default sysctl and IPv6 stance will surprise people who copied `Listen 80` from a CentOS httpd snippet.

SELinux vs AppArmor is the other silent deny. Rocky with SELinux enforcing and a pile of `audit2allow` local modules will not translate. Debian 13 may ship AppArmor profiles that block the exact path your app wrote on RHEL for ten years. `journalctl` will mention apparmor if you look. `aa-status` tells you what is loaded. Do not disable AppArmor globally to "make the migration work." Put the path in the profile or you will do this again on the next CVE.

Logs move too. RHEL shops often point everything at `/var/log/messages` via rsyslog. Debian's default is journald first, with rsyslog optional. If your alerting greps a file that no longer exists, the app can be healthy and the pager still dark. Point the alert at `journalctl -u foo` or install rsyslog on purpose, not by accident from an old config tarball. Test the alert once on the clone before you cut.

## A cutover order that fails closed

Do not start with the box that talks to the PLC. Start with a clone.

1. Inventory packages, units, timers, crontab, sysctl, and listening ports on RHEL. Store the files off-box.
2. Install Debian 13 on identical hardware or a VM with the same PCI devices passed through. Confirm firmware and NICs first.
3. Install only the mapped packages. Do not rsync `/usr`. Rsync `/etc` only as a diff source, not as an overlay.
4. Bring the app up on a second IP or a maintenance VLAN. Compare `ss -lntp` to the inventory. Missing listen = missing package or a default bind change.
5. Cut DNS or the load balancer. Keep the RHEL host off but not wiped until you have a full business cycle.
6. Patch the Debian kernel for whatever is in CISA's catalog that week. Migration week is when people skip that, because the ticket already says "OS upgrade complete."

CERN cannot take the accelerator down to iterate. You probably can. Use that. The 20 percent success estimate they attached to the hardware-redesign path is the number I would write on the whiteboard if a vendor tells you to "just stay on RHEL and buy new boards." Software migrations are ugly. Board spins are uglier, and they still need an OS.

If your shop is still on CentOS 7 muscle memory, Debian 13 is not the only exit. Alma, Rocky, and a paid RHEL subscription are still valid if your hardware baseline already matches x86-64-v2 and your app vendor only tests RPMs. CERN left because that baseline was going to orphan machines they cannot replace on a purchasing cycle. Debug the compiler, the firmware, and the package names, in that order. The rest is systemd, and systemd is the part that actually stayed the same.
