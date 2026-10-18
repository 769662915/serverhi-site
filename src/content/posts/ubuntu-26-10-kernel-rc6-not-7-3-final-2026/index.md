---
title: "Ubuntu 26.10 Says Linux 7.3. The Package Is rc6."
description: "Phoronix and OMG Ubuntu say 26.10 ships Linux 7.3. Linuxiac and Heise say the kernel package is 7.3-rc6. Check uname before you trust the headline."
pubDate: 2026-10-19
coverImage: "./cover.webp"
coverImageAlt: "A laptop on a rack shelf showing a blurred kernel version line, a USB stick beside the keyboard, cool room light, no logos."
category: linux
tags: ["Ubuntu", "Linux 7.3", "uutils", "kernel", "26.10"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "20 minutes"
prerequisites:
  - "A throwaway VM, not a production host"
  - "The Ubuntu 26.10 ISO from Ubuntu's own release page, not a mirror blog"
  - "sudo in the VM, and a note of the scripts that call cp, mv, or rm"
osCompatibility:
  - "Ubuntu 26.10 (test only; kernel package reported as 7.3-rc6)"
  - "Ubuntu 26.04 LTS (the host you should still be patching)"
  - "Ubuntu 24.04 LTS (unrelated HWE stack)"
---

The headline and the package string are not the same kernel. [Michael Larabel's Phoronix note](https://www.phoronix.com/news/Ubuntu-26.10-Released), filed 15 October 2026 at 07:19 AM EDT, says Ubuntu 26.10 "Stonking Stingray" is out with the Linux 7.3 kernel in its near-final state. [Linuxiac the same day](https://linuxiac.com/ubuntu-26-10-released-with-gnome-51-linux-kernel-7-3-and-rust-coreutils) says the initial Ubuntu kernel package is based on Linux 7.3-rc6, not the final upstream release. [Heise, timestamped 15 October at 11:57 pm CEST](https://www.heise.de/en/news/Ubuntu-26-10-ships-with-Linux-7-3-and-an-AI-assistant-11489687.html), prints both halves: the release already includes kernel 7.3 even though that kernel has yet to be released, and the package is still 7.3-rc6 because the final upstream version is not out.

[We already had Snapshot 4 on Linux 7.2](/posts/ubuntu-2610-snapshot4-uutils-cp-2026), with the final ISO penciled for 15 October and 7.3 expected by then. [24.04.5 is still the LTS media with Linux 7.0](/posts/ubuntu-24-04-5-linux-7-lts-2026). [Arch's October ISO was a different re-enroll problem](/posts/arch-linux-october-iso-tpm2-reenroll-2026). This note is the interim that those three were waiting on. It is still a VM image. It is not a fleet upgrade.

## What "7.3" means on 15 October

Phoronix does not print the string rc6. It says the 7.3 kernel is in its near-final state, next to GNOME 51, a completed Rust Coreutils transition, Mesa 26.2, a tech preview of Myna speech-to-text, RISC-V desktop images, and amd64v3 install images. "Near-final" is Larabel's description of the upstream kernel's condition. It is not a filename. If you `uname -r` and the string contains `rc6`, you have not disproved Phoronix. You have found the package string Linuxiac and Heise printed, which Phoronix's lede did not.

[OMG Ubuntu](https://www.omgubuntu.co.uk/2026/10/ubuntu-2610-new-features) also says the release ships the Linux 7.3 kernel, plus GNOME 51 and Mesa 26.2, with nine months of support. Joey Sneddon's page, in the sections I used, does not mention a release candidate. Four write-ups, two wordings. Phoronix and OMG say 7.3. Linuxiac and Heise say the package you install is 7.3-rc6, because upstream 7.3 final is not out yet. Heise is explicit that "yet to be released" is about the upstream kernel, not about Ubuntu's ISO. The ISO is the thing that shipped on the 15th.

Our September note said Snapshot 4 carried the 7.2 series and that 7.3 was expected on the October ISO. The date arrived. The expectation was "7.3." The package reports that add rc6 are more specific than that expectation, not a reversal of the calendar. A beta-to-final jump that still says rc6 is a normal interim habit. It is also the reason you do not write "kernel 7.3 final" into an inventory sheet until `uname -r` agrees.

Nine months of support is OMG's phrase. Linuxiac says support until July 2027. Nine months from a 15 October release lands in July 2027. Linuxiac does not print the day of the month. I am not going to invent 15 July. If you need the cutoff for a compliance note, read the release notes, not a rounded "nine months."

## Check the string before you quote the headline

Boot the ISO in a VM. Do not point a production apt source at 26.10 because a blog said the kernel is 7.3.

```bash
uname -r
dpkg -l 'linux-image-*' | awk '/^ii/ {print $2, $3}'
```

You want the running string, not the metapackage name. If the running string is a 7.3-rc6 ABI, write rc6 in the ticket. If a later `apt upgrade` inside the VM pulls a final 7.3 package, write that string when you see it. The articles above describe the initial package. They are not a promise about the archive next Tuesday.

Phoronix lists the flavor ISOs that landed the same day: Edubuntu, Kubuntu, Lubuntu, Ubuntu Budgie, Ubuntu Cinnamon, Ubuntu Kylin, Ubuntu MATE, Ubuntu Studio, Ubuntu Unity, and Xubuntu, alongside the official Ubuntu images. A flavor can ship the same kernel metapackage and still carry a different desktop. `uname -r` does not care which flavor greeter you clicked. Check it anyway. Do not assume Kubuntu's image string matches Ubuntu desktop's because the announcement was shared.

Out-of-tree modules are the usual casualty of an rc kernel on a non-LTS image. DKMS packages built against 7.2, or against a 7.3 final that does not exist yet, will fail or will build against headers you do not have. That is a VM finding. It is not a reason to hold a 26.04 security update. [The LTS you should still be patching is 24.04.5's line and 26.04](/posts/ubuntu-24-04-5-linux-7-lts-2026), not this interim.

Heise says the release notes still list keyboard problems with Linux 7.3 on certain Snapdragon X2 Elite laptops. Linuxiac says hardware work in this image also targets Snapdragon X Elite and X2 Elite machines. "Targets" is not "fixed." If the laptop is an X2 Elite and the keyboard misbehaves in the live session, that matches Heise's reading of the release notes. It does not, by itself, tell you the bug is the rc6 string rather than a separate platform patch. File the symptom. Do not upgrade a fleet of those laptops to chase a kernel that Heise says is not final upstream.

## cp, mv, and rm are the holdouts that moved

The September snapshot note said draft release notes had moved the last GNU `cp`, `mv`, and `rm` to uutils, and that 26.04 LTS was still GNU for those three. Linuxiac now says the switch of the remaining commands, including `cp`, `mv`, and `rm`, is done, and that 26.10 uses the Rust implementations as the default core utilities. Heise says Canonical has completely replaced GNU Coreutils with uutils. It names `cp`, `rm`, and `ls` as examples of what the GNU tools are responsible for, then says 25.10 already used uutils but still kept GNU `cp`, `mv`, and `rm`. The holdouts Heise names are those three. `ls` is in the example list of what Coreutils covers. It is not, in that paragraph, listed as a command 25.10 had kept on GNU. Do not write a ticket that says `ls` just flipped. The commands the two October pieces and our September note agree on are `cp`, `mv`, and `rm`.

Phoronix says the Rust-based Coreutils transition is now fully completed. It does not reprint the command names. "Fully completed" is a status. The command list is Linuxiac's and Heise's. If a script breaks, the status line will not tell you which binary changed. The command list will.

In the VM:

```bash
cp --version
mv --version
rm --version
type -a cp mv rm
```

uutils and GNU do not print the same version banner. Read the banner. Do not assume `type -a` showing `/usr/bin/cp` means GNU. The path can stay familiar after the implementation changes. Then run the backup or deploy script you actually use, against a directory of junk files in the VM, and see whether flags you rely on still mean what they meant. Date preservation, interactive prompts, and trailing-slash behavior are the usual places a Rust rewrite of a 30-year utility disagrees with a script. I am not going to invent a flag that failed. The check is the point.

Leave 26.04 LTS on the GNU binaries until that VM run is boring. An interim release supported into 2027 is not the image you want under a payroll cron. Snapshot 4 was a test image. 26.10 final is still a non-LTS. "Final" here means Canonical published the release. It does not mean the kernel package stopped being an rc, and it does not mean your scripts were in the test matrix.

## The rest of the stack is not the kernel string

Mesa 26.2 shows up in Phoronix, Linuxiac, and OMG. That is a graphics stack, not a server requirement, unless the box is a workstation with a GPU you actually use. Linuxiac also says the App Center now uses one details page for Snap and DEB packages, and that there is a section for NVIDIA driver versions. Server images will not show you that page. Do not treat an App Center note as a `nvidia-driver` package change. If you need a driver pin, read the package name in apt, not the desktop store.

systemd 261, in Linuxiac's account, drops support for legacy System V service scripts. That is a sharper break than the kernel headline if you still have an `/etc/init.d` script on a host you were thinking of upgrading. 26.04 did not take this release. A VM of 26.10 will tell you whether a unit you wrote as a sysv script still starts. `systemctl status` on a unit that only existed as init.d is the test. I am not listing every script name. You know which ones you still have.

dbus-daemon is replaced by dbus-broker, Linuxiac says, with AppArmor restrictions still applied to D-Bus. That is a session and system bus change. It is not, in the paragraph I used, a list of broken desktop portals. If a service activation fails in the VM, look at the broker before you blame the kernel rc. Heise separately says support was removed for obsolete WEP networks and for the EGLStreams interface used by older Nvidia drivers. WEP should already have been gone. EGLStreams matters if you were holding an old proprietary driver stack. Neither sentence is the rc6 string.

OpenSSL 4 is Linuxiac's version claim, with Encrypted Client Hello, more QUIC, and post-quantum work. Sequoia PGP is available in Ubuntu's main repository in that same section. I am not walking a migration here. The fact worth keeping is the version number: a non-LTS image shipping OpenSSL 4 is not a reason to change the OpenSSL on 26.04. Packages built against one will not slide onto the other because the major version moved.

Myna is the speech-to-text preview. Phoronix calls it a tech preview and part of a contextual desktop effort. Linuxiac says it runs locally, does not send recorded audio to an external server, is not installed by default, and is still a technology preview. Heise calls it an optional AI assistant preview. OMG's dek mentions passkey sign-in at the login screen. I am not turning any of that into a setup guide. A preview that is not installed by default cannot be your outage. Installing it on a server image to "see the AI" is how a test VM becomes a microphone you did not inventory. Leave it off unless the test is specifically the speech stack.

OMG prints one command worth keeping, and it is a desktop annoyance, not a server fix. The new window-drag layout picker can be turned off with:

```bash
gsettings set org.gnome.shell.extensions.tiling-assistant enable-layout-picker false
```

That key is GNOME Shell. It does nothing useful on Ubuntu Server. I am including it so a desktop test VM is usable, not so anyone pastes it into cloud-init.

Rust 1.97.1 and OpenJDK 27 are Linuxiac's toolchain versions for this image. They are not the versions on 26.04. A developer who compiles on 26.10 and ships the binary to 26.04 has left the "what kernel is this" question and entered a glibc and toolchain question. Do that experiment in the VM. Do not make the 26.10 desktop the build box for the LTS fleet because the announcement said the toolchain is newer.

The decision is the same one the snapshot note already had, with a tighter kernel sentence. Download 26.10 if you want a VM. Read `uname -r` and write down rc6 if that is what it says, even when the headline says 7.3. Read `cp --version` before you trust a backup script. Keep 26.04 on the machines that have to boot on Monday. The October 15 date was the date we were waiting for. The package string is the part the date did not settle.
