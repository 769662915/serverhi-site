---
title: "Ubuntu 24.04.5 Ships Linux 7.0. rc2 of 7.3 Is Already Loud"
description: "Canonical's fifth Noble point release puts Linux 7.0 on the install media. Torvalds called 7.3-rc2 unusually fat and joked about AI. Patch the LTS image you actually run. Do not confuse it with the mainline circus."
pubDate: 2026-09-13
coverImage: "./cover.webp"
coverImageAlt: "Rack server with a laptop showing a terminal kernel version string, cool aisle lighting, no logos."
category: linux
tags: ["Ubuntu", "Linux 7.0", "kernel", "LTS", "Torvalds"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "25 minutes"
prerequisites:
  - "Root or sudo on Ubuntu 24.04 LTS servers"
  - "A maintenance window for reboot after kernel install"
osCompatibility:
  - "Ubuntu 24.04 LTS"
  - "Ubuntu 24.04.5 install media"
  - "Mainline 7.3-rc testers only for the rc2 notes"
---

Two kernel stories landed in the same week. They are not the same job.

[Cyber Security News dated 11 September says Canonical shipped Ubuntu 24.04.5 LTS, the fifth maintenance image for Noble Numbat, with Linux 7.0 on the hardware enablement stack and the usual pile of security fixes](https://cybersecuritynews.com/ubuntu-24-04-5-lts-linux-7). That is the ISO you care about if you still provision 24.04.

[gHacks, working off Torvalds's 6 September note to the kernel mailing list, says Linux 7.3-rc2 is out and is heavier than an rc2 has any right to be](https://www.ghacks.net/2026/09/08/linux-7-3-rc2-arrives-heavier-than-usual-with-torvalds-joking-the-blame-falls-on-ai). Stable 7.3 is aimed at 18 October. That is mainline. It is not your LTS guest until a distro says so.

If you mix those two up, you will either skip a point release or you will install a release candidate on a box that pays rent.

We already had [CVE-2026-53362 on IPv6](/posts/linux-cve-2026-53362-ipv6-privilege-escalation/) and [OpenVPN 2.7.7](/posts/openvpn-2-7-7-security-update-linux-2026/). This is the distro-and-tree hygiene piece.

## What 24.04.5 actually is

A .5 image is not a new Ubuntu. It is 24.04 with the patches and the HWE kernel baked into the installer so a new VM does not spend the first hour catching up. Guru Baran's write-up is thin on a changelog table. Treat it as a pointer, not as Canonical's own notes. I could not pull a clean ubuntu.com blog page in this pass. Verify against `https://releases.ubuntu.com/24.04/` and the Noble release notes on Discourse before you mass-image anything.

The useful operational claim is still simple. New installs should come from 24.04.5 so you are not booting a two-year-old installer kernel. Existing 24.04 boxes should already have been taking `-updates` and `-security`. If they have unattended-upgrades on, a point release is mostly a media event. If they do not, it is a reminder you have been lying to yourself.

Check what you are running:

```bash
lsb_release -a
uname -r
apt-cache policy linux-generic-hwe-24.04 linux-image-generic
```

If `lsb_release` still says 24.04.2 and `uname` is a 6.x HWE you have not touched since last winter, you are the audience. `apt update && apt full-upgrade`, then reboot into the new ABI. Do not `dist-upgrade` across releases. Stay on Noble.

If you pin kernels because a vendor NIC blob hates HWE, document that pin in the same ticket as the 24.04.5 skip. Otherwise the next person will "fix" it.

HKCERT posted an Ubuntu kernel bulletin on 7 September. I am not pasting CVE IDs I did not extract. Pull the bulletin, match your `uname -r` to the package versions, and do not assume 24.04.5 media equals a live system that already rebooted.

## What Torvalds is actually complaining about

rc2 is the week after the merge window when the tree is supposed to calm down. This one did not. Torvalds did not name a single culprit. He mentioned a late EDAC pull that missed the window, filesystems landing together, a fat DRM pull, networking and BPF, driver trees. Then: "We'll obviously all blame it on AI," which gHacks is careful to flag as a joke without a confession.

The rest of that article is the part that will eat your weekend if you test mainline. Drivers were most of the diff. Tooling was about 20 percent of the non-driver volume. TCP and IPv6 fixes. ksmbd memory-safety. NTFS and XFS. AMD DRM. Nouveau display fixes for Blackwell, including HDMI vendor infoframes on GB20x, GCP AVMute offsets, vblank interrupts. Mohamed Ahmed said that work is on the road to HDMI 2.1, with a 2.147GHz pixel clock cap still in the way of FRL, DSC, and VRR.

Scheduler: Cache Aware Scheduling misfits on hybrid performance/efficiency CPUs. Kees Cook converting kmalloc() to kmalloc_obj() across hundreds of files. RandStruct disabled by default when a usable Rust toolchain is present, to break a circular dependency with Rust-in-kernel.

None of that belongs on a 24.04 production hypervisor this month.

Greg Kroah-Hartman, per gHacks, already called the cycle rough. His filtered USB queue was 1,732 of 4,807 messages, then 1,094 of 4,170 after clearing the obvious. He said pushing back on AI-generated submissions takes time even when the patch is wrong, because he still has to look.

If you maintain a driver out of tree, rc2 is your cue to build, boot, and file. If you run Ubuntu LTS, it is a spectator sport.

## A boring upgrade path for 24.04

1. Snapshot or take an LVM/ZFS snapshot. Cloud: image the disk. You know this. People still skip it.
2. `apt update && apt -s full-upgrade` and read the kernel packages. If `linux-image-7.0` or the HWE metapackage is in the list, you will reboot.
3. Check dkms: `dkms status`. NVIDIA, ZFS, WireGuard-out-of-tree, vendor SAN. If dkms will fail, fix that first.
4. Apply, reboot one canary, `dmesg -T | tail` and a network listener check, then the rest of the fleet.
5. Do not add a mainline PPA because someone on a forum said 7.3-rc2 feels fine.

Livepatch users: a point-release kernel ABI still wants a reboot if you want the HWE userspace stack that came with it. Livepatch is for CVEs on the kernel you already run.

We wrote about [not handing AI agents the host Docker socket](/posts/docker-socket-ai-agent-isolation-2026/). The rc2 noise is the same class of problem at a different layer. Unreviewed generated patches in USB and a generated "fix" in your guest are cousins. Your job is still to boot known packages from Ubuntu, not to roleplay as linux-next.

## cPanel is a different fire

If the box is a shared host, [cPanel disclosed CVE-2026-67401 in EmailTrack on 8 September](https://gbhackers.com/cpanel-emailtrack-sql-injection-flaw). Authenticated mail-capable accounts, SQL injection, arbitrary file create, root. All supported cPanel/WHM before the fixed versions. That is not a kernel story. It is the other thing you might have skipped this week while reading Torvalds jokes. Patch WHM first if you run it. Then come back to `uname`.

## What I would put in the ticket

Title: "24.04.5 / Linux 7.0 HWE, reboot window, leave 7.3-rc2 alone."

Body: media for new VMs is 24.04.5. Existing nodes take distro kernels via unattended-upgrades or a dated apt run. Canary, then batch. No mainline. Link the Cyber Security News item as the alert, Canonical's checksums as the artifact, gHacks as the "do not" appendix.

If your monitoring still alerts on `6.8.0-xx-generic` after the reboot, update the inventory, not the kernel.

Cloud images lag ISOs. If your packer template still points at an old 24.04.1 daily, new instances will boot, unattended-upgrades will catch them, and you will still pay for a surprise reboot in the first hour. Point the template at 24.04.5, bake, and stop pretending first-boot patching is a strategy.

Containers do not care about the guest kernel. The host does. If the node is 24.04 and the pods are distroless, the HWE reboot is still a node drain. Schedule it like a kubelet bump. Drain, reboot, uncordon. Do not roll all workers in one go because a blog said 7.0 is out.

NVIDIA and other proprietary modules remain the usual landmine. If `dkms status` is dirty, 24.04.5 will not save you. Match the module to the new ABI in a lab, then to prod. The Nouveau Blackwell notes in rc2 are interesting if you run that card without the proprietary driver. Most people reading this do not.

I would keep a one-line runbook in the same repo as the Terraform: "Noble HWE, reboot required, no mainline PPA, cPanel is a separate CVE." Future you will thank present you when Torvalds makes another joke and someone pastes it into Slack as an action item.

The Lion and the math papers can wait. Your guests cannot. Reboot the ones that already downloaded 7.0, and stop pasting rc2 into crontab because the mailing list was funny.

If you are on 22.04, this article is not your upgrade guide. Jammy is a different HWE train. Do not leap to 24.04.5 as a panic move because 7.0 is in a headline. Finish the CVE you already have, then plan the release jump with an actual test cluster.
