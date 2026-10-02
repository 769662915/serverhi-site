---
title: "Arch Linux 2026.10.01: Update, Then Re-enroll"
description: "Arch Linux 2026.10.01 ships kernel 7.2.7 and systemd 262 for new installs. Existing LUKS hosts on mkinitcpio 42 still have to re-enroll TPM2."
pubDate: 2026-10-03
coverImage: "./cover.webp"
coverImageAlt: "An open laptop on a bench beside a small TPM chip on an anti-static mat, cool shop light, no vendor logos and no readable text on the screen."
category: linux
tags: ["Arch Linux", "mkinitcpio", "TPM2", "systemd", "LUKS"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "40 minutes"
prerequisites:
  - "A running Arch install, or a plan to boot the 2026.10.01 ISO for a new one"
  - "If you unlock LUKS with TPM2 and the systemd mkinitcpio hook, the Sept. 22 Arch news post and the cryptenroll man page"
  - "Root on the machine you are about to update, and a recovery path if the disk does not unlock"
osCompatibility:
  - "Arch Linux hosts that pull mkinitcpio 42 or newer"
  - "New installs from the Arch Linux 2026.10.01 ISO"
---

The October ISO is a new-install image. The footgun is older than the ISO, and it hits machines you already have. [Linuxiac on Oct. 1](https://linuxiac.com/arch-linux-october-2026-iso-is-out-with-linux-kernel-7-2-7-systemd-262) says Arch Linux 2026.10.01 ships Linux 7.2.7, up from 7.2.2 in last month's image, plus systemd 262 and mkinitcpio 42.1. [The Arch news post that actually matters](https://archlinux.org/news/mkinitcpio-42-requires-manual-intervention-for-tpm2-based-unlocking-of-luks-devices) is dated Sept. 22, signed by David Runge, and it does not care whether you downloaded an ISO. If you unlock LUKS with a TPM2 and you use the systemd hook in mkinitcpio 42 or newer, the PCR values you pinned are no longer the values the initramfs measures.

We wrote a different Arch incident in [the AUR supply-chain piece](/posts/arch-linux-aur-supply-chain-attack-2026/). We wrote a different distro's snapshot in [Ubuntu 26.10's cp change](/posts/ubuntu-2610-snapshot4-uutils-cp-2026/). The sandboxing guide in [systemd service hardening](/posts/linux-systemd-service-hardening/) is about unit files, not about the initramfs measuring a new unit into PCR. This is the monthly image, the package pile inside it, and the one manual step the ISO announcement keeps pointing at.

## What the Arch Linux 2026.10.01 image changed

Linuxiac's list is the one to keep next to the download. Kernel 7.2.7. systemd 262. GRUB 2.16. mkinitcpio 42.1. Bash 5.3.20. curl 8.22. OpenSSL 3.6.5. util-linux 2.42.4. XFSProgs 7.2. cryptsetup 2.8.8. Mesa 26.2.3 is in the dek of that same piece. The toolchain line is LLVM and Clang 23.1.1, Go 1.27.1, Git 2.56, Node.js 26.10, and .NET 10 refreshed to 10.0.12. Virtualization and containers: QEMU 11.1.1, VirtualBox 7.2.20, containerd 2.4.1, Podman 6.1.3, Buildah 1.45.1, crun 1.30.1. The rest of the "worth mentioning" pile is Nginx 1.30.5, OpenMPI 5.0.11, OpenCV 5.0, Nextcloud 35, OpenJDK 27, NVIDIA CUDA 13.4.2, and Flatpak 1.18.4.

[9to5Linux's ISO note the same day](https://9to5linux.com/arch-linux-iso-release-for-october-2026-ships-with-the-archinstall-4-5-installer) does not add a second kernel version. It adds the installer. Archinstall 4.5 is on the image. The features it lists there are RT kernel variants from upstream, AArch64 support for GRUB and Limine EFI installs, an AArch64 root partition type GUID, and optdepends support for the linux-firmware package. A longer note from [Sept. 29](https://9to5linux.com/archinstall-4-5-arch-linux-installer-adds-aarch64-support-for-grub-and-limine) is where the smaller behavior changes live, and I will get to those after the boot problem, because a new installer does not unlock a disk you already encrypted.

Both writeups say the same thing about machines that are already Arch. Do not reinstall. Do not treat the ISO as a patch file. `sudo pacman -Syu` is the update. The image name is 2026.10.01, and it is on the official download page and the mirrors for people doing a fresh setup. If your host has been updating through September, a lot of this pile is already on disk. The ISO is a snapshot of that pile for someone who is not on disk yet.

I would not read the version list as a changelog you must act on item by item. OpenCV 5.0 and Nextcloud 35 matter if you run those packages. They do not matter to a host that only boots, unlocks a LUKS volume, and runs sshd. CUDA 13.4.2 matters if you install the NVIDIA userspace stack from Arch packages, and it does not replace the driver-branch check we wrote about on the proprietary side. Sort the list by what the machine actually has installed. `pacman -Q` beats a blog's bullet list. The bullet list is how you notice that mkinitcpio moved to 42.1, which is the version that drags the Sept. 22 news back into the present.

## The PCR break is the part that can leave you at a prompt

Runge's post is short, and the short version is the one to follow. Starting with mkinitcpio `42-1`, the systemd hook includes `systemd-pcrosseparator.service`. Arch says that inclusion is what systemd v261 intended, and the news post links the systemd NEWS entry for that intent. The inclusion changes measurements of PCR values 0-7, 9, and 12-14. If you configured the systemd hook, and your LUKS unlock depends on those values, you re-enroll the TPM2 you are using.

The post does not print a copy-paste enroll command. I am not going to invent one. It points at `systemd-cryptenroll(1)` and at the ArchWiki page on systemd-cryptenroll when you are using pinned values. It points at `systemd-pcrlock(8)` when you rely on custom policies and `systemd-pcrlock-make-policy.service` is disabled. Those are different tools for different enrollments. If you do not know which one you used, find out before you update a remote machine and close the laptop. A wrong re-enroll is not a no-op. A skipped re-enroll, on a policy that bound those PCRs, is a disk that will not unlock on the next boot.

9to5Linux dates the announcement to Sept. 22 and repeats the PCR list. That is useful as a second copy of the same warning, not as a new fact. The primary page is the Arch news item. If your initramfs does not use the systemd hook, this particular break is not yours. If you unlock with a passphrase and the TPM2 slot is unused, this break is not yours either. The people who get hurt are the ones who did the "right" thing last year: systemd hook, TPM2, PCR policy, no passphrase typed at boot. The hook grew a service. The measurement moved. The policy did not know.

There is a spelling in the unit name that looks like a typo and is not one you should "fix" in a local copy. The news post writes `systemd-pcrosseparator.service`. That is the string to search for in the packaged hook, not a cleaned-up "pcr0separator" you invented. If the unit on disk does not match the news post, stop and read the installed hook before you re-enroll against a guess.

I would also not assume that "I updated in September, so I already did this." The ISO is Oct. 1. The news is Sept. 22. A host that updated mkinitcpio past 42-1 and rebooted successfully either did not bind those PCRs, or someone already re-enrolled, or the reboot has not happened yet. Check the installed version and the enroll date. Do not check your memory of whether the boot "felt fine."

## systemd 262 is on the ISO, and it is a larger release than the PCR line

The ISO ships systemd 262. [Linux Journal on Sept. 24](https://www.linuxjournal.com/content/systemd-262-released-static-pid-1-intel-tdx-tpm-improvements-and-new-container-features) says the final tag was Sept. 22, after three release candidates, and that the release was already entering Fedora 45 and Debian Unstable. The Arch image picking it up in the October snapshot is consistent with that calendar. It is not an Arch-only fork.

The feature Linux Journal leads with, and the one I would not confuse with the PCR break, is a build option: systemd as a single statically linked PID 1 and executor, aimed at very small containers. That is a compile-time shape for a minimal image. It is not what your desktop or your server got because pacman pulled systemd 262. Your host still has the normal dynamically linked install unless you went out of your way to build the static configuration. Do not "enable" a static PID 1 because a release note mentioned it.

The same piece lists Intel TDX support in `systemd-vmspawn`, next to AMD SEV-SNP, and TPM work that is adjacent to the enroll problem without being the same problem: Storage Root Key pinning, Argon2id PIN enrollment, and new `systemd-cryptenroll` functionality. Adjacent is the right word. The reason your existing LUKS unlock may fail is the pcrosseparator unit inside the mkinitcpio systemd hook, which Arch attributes to systemd v261's intent, not to a new flag in 262. Read 262 if you use vmspawn or you are about to re-enroll and want the current cryptenroll behavior. Do not read 262 as the cause of the Sept. 22 news post. The dates sit on top of each other. The causes do not.

Linux Journal also mentions an AI/LLM canary in systemd's development process, meant to catch unreviewed generated contributions. That is a project-process note. It is not an Arch packaging change, and it is not something you configure on a host. I am including it so a reader who hits the release writeup does not go looking for a canary unit in `/usr/lib/systemd`.

## Archinstall 4.5 is for the machine you have not built yet

If you are already installed, skip this section and go back to the TPM2 check. Archinstall 4.5 is the guided installer on the new ISO, and [the Sept. 29 note](https://9to5linux.com/archinstall-4-5-arch-linux-installer-adds-aarch64-support-for-grub-and-limine) says you do not have to wait for that ISO to try the installer itself. From the live environment of a current image you can run `pacman -Sy archinstall` and then `archinstall -v` to see what you got. That updates the installer package. It does not apply the October kernel to a disk you have not partitioned.

The behavior changes worth knowing before you trust a saved config are concrete. The declarative summary method now covers all sub-configs, so an old partial summary may not round-trip the way it did. Hyprland, Labwc, Niri, and Sway profiles switch from polkit to systemd-logind. Intel open-source post-Gen12 picks up `vpl-gpu-rt` and `libvpl`. Print service packages gain Ghostscript. The Cockpit package uses `cockpit-storaged` instead of `udisks2`. The EFI partition mount uses `fmask=0177`. The installer asks about encrypting saved credentials only when you are actually saving credentials. `systemd-python` was downgraded to avoid a dependency install failure. Wi-Fi SSIDs that contain spaces were missing from the scan list, and that is fixed. Summary labels moved to sentence case. A disk-menu import cycle and a table-data mapping bug are in the fix list too.

None of that is a reason for an installed server to download the ISO. It is a reason not to replay a year-old archinstall JSON and assume the profile names still mean the same packages. If you automate installs, read the 4.5 notes before the next run, especially the polkit-to-logind switch on those four desktop profiles and the EFI fmask. A server install that never selects a desktop profile will not hit the logind change. It can still hit `fmask=0177` if the EFI mount options are part of your saved config. Check the summary screen. The installer reworded the section about limited space on the ISO as well, which is a hint that the image is still tight and that "add every optional package" remains a way to fail a live session.

AArch64 support for GRUB and Limine EFI, and the AArch64 root partition type GUID, matter if you are installing on that architecture. They are not a silent change for an x86_64 reinstall you were not planning to do. RT kernel variants from upstream are an option in the installer, not a default I can confirm from these notes as forced. If you need the RT kernel, select it. If you do not, do not let a release-note headline talk you into it.

## What I would do on a host that is already up

First, decide whether the TPM2 warning applies. Look at the mkinitcpio hooks. If `systemd` is not in the hook list, the Sept. 22 post is not your boot path. If it is, and a LUKS volume unlocks from the TPM, assume the PCR list in Runge's post is in play until you have checked the policy: values 0-7, 9, and 12-14. Then use the tool that matches how you enrolled. Pinned values go through systemd-cryptenroll and the wiki page the news post names. Custom policies with the make-policy service disabled go through systemd-pcrlock. Do this with a passphrase slot still present, or with a recovery image you have actually booted once. I am not going to pretend a wiki link is a rescue plan. If the only unlock path is the TPM and you re-enroll wrong, you will want that ISO for a reason that has nothing to do with kernel 7.2.7.

Second, update the installed system with `sudo pacman -Syu` if you were going to update anyway. The October ISO is not a required download for that. Read pacman's prompts. mkinitcpio will rebuild the initramfs as part of pulling the new hook. That rebuild is the moment the measurement changes. Re-enrolling after the new image is what the news post is for. Re-enrolling before you understand the new measurement is how people burn a PCR policy and then blame the kernel.

Third, ignore the parts of the version list that are not installed. Git 2.56 and Node.js 26.10 are real updates in the September pile Linuxiac summarized. They are not a security advisory, and this article is not going to invent CVEs for them. OpenSSL 3.6.5 and curl 8.22 are the ones I would actually want on a server that talks to the network, because those packages are in the path of ordinary administration. Wanting them is not the same as claiming a specific flaw. The sources I have describe a snapshot, not a vulnerability note. If a CVE lands against one of these versions, it will land as its own advisory. Do not treat a monthly ISO announcement as that advisory.

The split is simple enough to write on a sticky note. New machine: 2026.10.01, kernel 7.2.7, archinstall 4.5, read the summary before you save the credentials and the EFI options. Old machine: `pacman -Syu`, then the Sept. 22 test. If the systemd hook unlocks LUKS against those PCRs, re-enroll with the tool you enrolled with. The ISO will not do that step for you. It was never meant to.
