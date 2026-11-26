---
title: "Patch the Ubuntu Kernel: USN-9173-1, USN-9183-1, Reboot"
description: "USN-9173-1 and USN-9183-1 bring kernel 6.8.0-151.151 to Ubuntu 24.04 LTS. Check if a host is affected, install the fix, and plan the reboot."
pubDate: 2026-11-27
coverImage: "./cover.webp"
coverImageAlt: "A dim server room with a rack of Linux servers and a terminal window showing a kernel update in progress, warm amber status lights, no logos and no readable text."
category: "linux"
tags: ["Linux", "Ubuntu", "patch management", "Security", "Kernel"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "25 minutes"
prerequisites:
  - "A Ubuntu 24.04 LTS or 22.04 LTS host with sudo access, or a list of hosts to check"
  - "A way to run commands on each host, and a note of which services on it cannot stop without warning"
  - "A note of any third-party kernel modules in use, such as out-of-tree drivers or ZFS modules"
osCompatibility:
  - "Ubuntu 24.04 LTS (generic and FIPS kernels)"
  - "Ubuntu 22.04 LTS (generic kernel)"
---

Ubuntu published two kernel security notices in two days. [USN-9173-1](https://ubuntu.com/security/notices/USN-9173-1) arrived on 19 November 2026 for the standard kernel on 24.04 LTS and 22.04 LTS, and [USN-9183-1](https://ubuntu.com/security/notices/USN-9183-1) followed on 20 November 2026 for the FIPS kernel on 24.04 LTS. Both point at the same base build, 6.8.0-151.151. Both carry the same warning: the update changes the kernel ABI, so third-party modules need rebuilding, and the host needs a reboot before the new kernel runs.

This guide is about the work around the patch. It does not repeat the CVE lists, and it does not revisit the KVM flaw covered in the [November 22 KVM article](/posts/kvm-cve-2026-99312-linux-stable-kernels/). The question here is narrower and more practical: how to tell whether a host is affected, how to install the update cleanly, what the ABI change means for modules outside the Ubuntu archive, and how to schedule the reboot so services come back in the right order. Every version number and date in this guide comes from the Ubuntu notices themselves, and every check in it is a command the reader can run on their own host.

## What the two notices cover

USN-9173-1 covers the standard kernel and its cloud variants on Ubuntu 24.04 LTS and 22.04 LTS. The package list names linux, linux-aws, linux-aws-fips, linux-gcp, linux-gcp-6.8, linux-gke, linux-gkeop, linux-ibm, linux-ibm-6.8, linux-oracle-6.8 and linux-vmware. The fixed generic kernel on 24.04 LTS is linux-image-6.8.0-151-generic, version 6.8.0-151.151. The cloud builds carry their own numbers: AWS lands on 6.8.0-1070.76, GCP on 6.8.0-1074.82, GKE on 6.8.0-1069.78, IBM on 6.8.0-1070.71 and VMware on 6.8.0-1011.11. A host running one of the cloud kernels compares its installed version against the matching row, not against the generic number.

The notice describes fixes across a long list of subsystems: the block layer, the cryptographic API, ACPI drivers, the drivers core, the Ublk userspace block driver, bus devices, the hardware random number generator core, clock framework and clocksource drivers, hardware crypto device drivers, CXL drivers, the buffer sharing and synchronization framework, the DMA engine subsystem, the DPLL subsystem, EDAC, the eXpress Data Path, the kernel build system, the Intel NPU driver, the Compute Acceleration Framework, and the ARM64, PowerPC, RISC-V, S390 and x86 architectures. The list is broad, and most servers use the code paths it names, so the decision is rarely whether to install the update. The decision is when to reboot for it.

USN-9183-1 is the FIPS counterpart, published a day later. It covers Ubuntu 24.04 LTS only, and it names a single package: linux-fips. The fixed version is linux-image-6.8.0-151-fips, version 6.8.0-151.151+fips1. The base build number matches the generic kernel exactly, and the +fips1 suffix is the only thing that sets the two apart. That shared number can mislead a quick check. A host running the generic kernel is covered by USN-9173-1, and a host running the FIPS kernel is covered by USN-9183-1. The version string alone does not say which notice applies; the package name does.

A third notice in the same week is worth a mention for Azure hosts. [USN-9170-4](https://ubuntu.com/security/notices/USN-9170-4), published on 24 November 2026, covers the 5.4 Azure kernel on Ubuntu 20.04 LTS and 18.04 LTS. It fixes flaws in IPv4 networking, the Ethernet bridge, Netfilter, the SCTP protocol and the XFRM subsystem, with the fixed version 5.4.0-1174.180 on both releases. It carries the same ABI warning as the other two. If the fleet includes older Azure images, they belong on a separate patch list with their own version target.

| Notice | Published | Releases | Kernel | Fixed version |
| --- | --- | --- | --- | --- |
| USN-9173-1 | 19 Nov 2026 | 24.04 LTS, 22.04 LTS | Generic and cloud kernels | 6.8.0-151.151 |
| USN-9183-1 | 20 Nov 2026 | 24.04 LTS | FIPS kernel | 6.8.0-151.151+fips1 |
| USN-9170-4 | 24 Nov 2026 | 20.04 LTS, 18.04 LTS | Azure 5.4 kernel | 5.4.0-1174.180 |

## Check whether a host is affected

The first command on any host is the one that shows what is actually running:

```bash
uname -r
```

The output is the running kernel, and it is the only version that matters for exposure. A host that reports 6.8.0-151-generic is running the fixed build. A host that reports an older 6.8.0 build is running a kernel the notice replaces. The check takes seconds, and it is worth running before opening any ticket, because the installed package list and the running kernel can disagree. A host can have the fixed package installed and still be running the old kernel until it reboots.

The second command shows what apt can see:

```bash
apt list --upgradable
```

If linux-image-generic or the matching cloud metapackage appears in the list, the fix is available and not yet installed. If nothing kernel related appears, either the host is already patched or its package lists are stale. Run `sudo apt update` first when the output looks empty on a host that has not been updated in a while, then check again. The update refreshes the lists; it installs nothing on its own.

The third check confirms which kernel packages are installed, and whether the standard metapackages are still in place:

```bash
dpkg -l | grep linux-image
```

The output shows every installed kernel image. Look for the metapackage line, such as linux-image-generic, and for the concrete image, such as linux-image-6.8.0-151-generic. The metapackage is what pulls in future kernel updates automatically. A host that has the concrete image but no metapackage will not pick up the next kernel update on its own, and that is a configuration problem worth fixing at the same time as this patch. The notices say the same thing in their own words: unless the standard kernel metapackages were manually removed, a standard system upgrade performs the update automatically.

FIPS hosts need one extra check. The running kernel name tells the story: a FIPS kernel shows up as 6.8.0-151-fips in `uname -r`, and the installed package is linux-image-fips. A host that runs the generic kernel does not need the FIPS notice, and a host that runs the FIPS kernel does not need the generic one. Mixing the two up wastes a maintenance window on the wrong package. The `pro status` command shows whether Ubuntu Pro FIPS is enabled on the host, which settles the question when the kernel name alone is unclear.

Cloud hosts need the same care with a different target. An AWS host runs linux-image-aws, a GCP host runs linux-image-gcp, and each has its own fixed version from the notice table. Comparing an AWS host against the generic 6.8.0-151.151 number gives a wrong answer in both directions: the numbers never match, so the check either alarms on a patched host or clears an unpatched one. Match the installed package name to the notice table first, then compare the version.

Two more checks belong in the same pass. The first is disk space in /boot, because a kernel install that runs out of room fails halfway and leaves a mess:

```bash
df -h /boot
```

Old kernels pile up on hosts that have run for years, and /boot is often a small partition. If it is nearly full, remove old kernels with `sudo apt autoremove --purge` before installing the new one, and confirm the currently running kernel is not among the ones being removed. The second check is for held packages:

```bash
apt-mark showhold
```

A held linux-image-generic package blocks the update silently. The upgrade command finishes without error and installs nothing, and the host stays exposed. A hold is sometimes deliberate, for example when a driver is pinned to a kernel version, and that is a reason to plan rather than a reason to skip. Note the hold, find out why it exists, and clear it in the same window as the driver work.

## Install the update

With the checks done, the install itself is short:

```bash
sudo apt update
sudo apt upgrade linux-image-generic
```

On a FIPS host, the package is linux-image-fips instead of linux-image-generic. On a cloud host, it is the matching metapackage, such as linux-image-aws or linux-image-gcp. Installing the metapackage rather than a single versioned image keeps the host on the update track for the next kernel release as well.

The upgrade command installs the new kernel image alongside the old one. It does not remove the running kernel, and it does not switch the running kernel. That is by design. The new image sits in /boot and becomes the default for the next boot, while the current session keeps running the old kernel. Nothing about the system changes until the reboot, which is why the install step and the reboot step can sit in different maintenance windows when they have to.

After the install, verify what landed:

```bash
dpkg -l | grep linux-image-6.8.0-151
```

The fixed image should appear in the list. Then check whether the system is asking for a reboot:

```bash
cat /var/run/reboot-required
```

When the file exists, the system has recorded that a reboot is needed. The companion file /var/run/reboot-required.pkgs lists the packages that asked for it, and the kernel package should be among them. These two files are the simplest record of the patch state on a host. They are also easy to collect across a fleet: a host with the file present has the new kernel installed and waiting, and a host without it either has not installed the update or has already rebooted.

Unattended upgrades change the timing of this step. A host with unattended-upgrades enabled may already have the new kernel image installed, with the reboot still pending. That is a normal state. It is also the reason the check commands above matter more than the install command. On a fleet, the useful question is rarely whether apt ran. It is which hosts have the file /var/run/reboot-required present and which kernel each one is actually running.

## The ABI change and third-party modules

Both notices carry the same warning, and it deserves a careful read: "Due to an unavoidable ABI change the kernel updates have been given a new version number, which requires you to recompile and reinstall all third party kernel modules you might have installed." The ABI is the interface between the kernel and the modules that plug into it. When the ABI changes, a module built against the old kernel does not load into the new one. The module has to be rebuilt against the new kernel headers, and then reinstalled.

Most hosts never notice this, because their modules come from the Ubuntu archive and are rebuilt by the update itself. The warning is aimed at the hosts that run modules from outside the archive: out-of-tree drivers for storage controllers and network cards, proprietary GPU drivers, ZFS modules, and WireGuard or other modules installed from source. Those modules do not rebuild themselves unless something is set up to do it.

DKMS is the usual answer, and the check for it is one command:

```bash
dkms status
```

The output lists each DKMS module and the kernel versions it is built for. After the new kernel is installed, each module should show a build for 6.8.0-151-generic or the matching kernel. A module that only lists older kernels needs a rebuild before the reboot, or it will be missing when the host comes back up. The rebuild command is `sudo dkms autoinstall`, run after the new kernel headers are installed. The headers come with the kernel update when the linux-headers-generic metapackage is installed, and that metapackage is worth checking on any host that uses DKMS. Without headers, DKMS has nothing to build against, and the rebuild fails at the exact moment it is needed.

Modules installed without DKMS need manual work. The vendor or the project that ships the module publishes its own rebuild steps, and those steps have to happen between the kernel install and the reboot. This is the step most likely to be forgotten in a hurried patch window, and it is the step with the most visible failure mode: the host reboots, the module is absent, and a filesystem, a network card or a GPU stops working. The fix is a short inventory before the install, not a rescue after the reboot. List the modules that are not from the archive, note how each one is rebuilt, and run the rebuild before scheduling the reboot.

A related check is the bootloader. The new kernel becomes the default boot entry, and the old kernel stays available as a fallback entry. On a host that boots through GRUB, the fallback is what saves the day if the new kernel fails to boot. Confirm the old kernel is still installed before rebooting, and do not purge old kernels until the new one has booted successfully at least once. The `apt autoremove --purge` step from the earlier check belongs after the reboot, not before it.

## Plan the reboot

The notices are direct about the reboot: "After a standard system update you need to reboot your computer to make all the necessary changes." A kernel update is not complete when the package is installed. It is complete when the host is running the new kernel, and that only happens after a reboot. Any report that counts a host as patched before its reboot is counting the install, not the fix.

Livepatch changes the timing, but it does not remove the reboot. Canonical Livepatch applies fixes for selected kernel flaws to the running kernel without a reboot. It covers many kernel vulnerabilities, and it is a reasonable way to shorten the exposure window while the reboot is being scheduled. It does not install a new kernel image, and it does not change the running kernel version. After an ABI-changing update like this one, the running kernel stays on the old ABI until the host reboots, no matter what Livepatch has applied. The status command shows what Livepatch is doing on a host:

```bash
canonical-livepatch status
```

Treat Livepatch as a bridge to the reboot, not as a substitute for it. A host with Livepatch enabled still needs a window, and the window still needs a plan.

The needrestart tool helps decide what the reboot actually interrupts. It lists the services that are using outdated libraries or files after an update:

```bash
sudo needrestart -r l
```

The output names the services that need a restart, which is useful for the services that share the host with the kernel update. A database or a web server that needs a restart after a library update can be restarted in the same window as the kernel reboot, or it can be handled separately. The tool does not make the decision; it gives the list the decision is based on.

For a single host, the reboot plan is a short list: warn whoever uses the services on it, stop or drain the services that need a clean shutdown, reboot, and then check the host came back on the new kernel. The check after the reboot is the same command as before:

```bash
uname -r
```

The output should now read 6.8.0-151-generic, or the matching FIPS or cloud kernel. If it still shows the old version, the host booted the wrong entry, and the bootloader configuration needs a look before anything else. A second check confirms the services came back: the services that were running before the reboot should be running after it, and the logs should show a clean start rather than a crash loop.

For a fleet, the same steps run in waves. Patch a small group first, reboot it, and watch it for a day before moving to the next group. The first wave should include hosts that look like the rest of the fleet, not the least important ones, because the point of the wave is to learn whether the new kernel and the rebuilt modules behave. Database hosts, hosts with out-of-tree drivers, and hosts with tight uptime promises go in later waves, after the first wave has shown the update is safe. Each wave gets its own window, and each window ends with the same check: `uname -r` on every host, and the service list compared against the pre-reboot list.

The timing question has a simple answer. The notices were published on 19 and 20 November, and the fix has been available since then. Hosts that face the internet, hosts that run untrusted workloads, and hosts that hold data worth protecting go first. Internal hosts with no exposure can wait for their normal window, but they still need one. An unpatched kernel on an internal host is a foothold for anything that gets past the edge, and the reboot is the only step that actually applies the fix.

## How this guide was put together

Every version number, date and subsystem list in this guide comes from the three Ubuntu security notices linked in the text: USN-9173-1, USN-9183-1 and USN-9170-4. The notices were read on 27 November 2026, and the facts were taken from the pages themselves rather than from summaries. The notices do not name individual CVE numbers in the text that was available, so this guide names none. Any CVE list attached to these notices elsewhere is outside what was verified here.

The commands in this guide are standard Ubuntu and Debian tooling, presented as steps the reader runs and checks on their own hosts. No lab environment was used to produce this guide, and no output shown here is a claim about a test run. The verification steps are written so the reader can confirm each result directly: `uname -r` shows the running kernel, `dpkg -l` shows the installed image, /var/run/reboot-required shows whether a reboot is pending, and `dkms status` shows whether each module is built for the new kernel. If a command gives a different result from the one described, the command output is the truth, and the guide is the thing to re-read.

## Checklist

- Run `uname -r` on each host and note the running kernel.
- Match the installed kernel package to the right notice and the right fixed version.
- Check /boot space and held packages before installing.
- Install the kernel metapackage for the host: generic, FIPS, or the cloud variant.
- Confirm the fixed image is installed and /var/run/reboot-required exists.
- Rebuild third-party modules with DKMS, or by the vendor steps, before rebooting.
- Reboot in waves, starting with a small group that looks like the rest of the fleet.
- After each reboot, run `uname -r` again and confirm the services came back clean.
- Only then remove old kernels, and only after the new kernel has booted once.

The patch itself takes minutes. The planning around it is the work, and it is the part that keeps a routine kernel update from turning into an outage. USN-9173-1 and USN-9183-1 are already a week old, and the fixed kernel has been in the archive since the notices were published. The hosts that still need attention are the ones nobody has checked yet, so the first command on the list is the one to run now.
