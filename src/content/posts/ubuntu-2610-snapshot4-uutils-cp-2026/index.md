---
title: "Ubuntu 26.10 Snapshot 4: Linux 7.2, and cp Is Finally Rust"
description: "Snapshot 4 ships Linux 7.2. Draft notes say uutils now covers cp, mv, and rm. Test it in a VM. Leave 26.04 LTS on GNU until backup scripts run."
pubDate: 2026-09-19
coverImage: "./cover.webp"
coverImageAlt: "Two terminal windows on a desk, one showing a kernel version string too blurred to read, a USB stick beside the keyboard, cool rack lighting, no logos."
category: linux
tags: ["Ubuntu", "uutils", "coreutils", "Linux 7.2", "26.10"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "30 minutes"
prerequisites:
  - "A throwaway VM, not a production host"
  - "sudo and enough disk for an Ubuntu 26.10 snapshot ISO"
  - "A copy of the backup or deploy scripts you actually run"
osCompatibility:
  - "Ubuntu 26.10 Snapshot 4 (test only)"
  - "Ubuntu 26.04 LTS (still GNU cp/mv/rm)"
  - "Ubuntu 24.04 LTS (unrelated HWE stack)"
---

[24.04.5 put Linux 7.0 on the Noble install media](/posts/ubuntu-24-04-5-linux-7-lts-2026/). That is the LTS you should still be patching. This week is the interim.

[9to5Linux's Marcus Nestor filed Snapshot 4 on 17 September](https://9to5linux.com/ubuntu-26-10-stonking-stingray-snapshot-4-is-out-for-public-testing-with-linux-7-2). Ubuntu 26.10, Stonking Stingray, last static snapshot before beta. The kernel on the image is the 7.2 series. Final release is penciled for 15 October, with 7.3 expected by then. Beta is next week, 24 September. Heise and Phoronix spent the same 48 hours on a quieter line in the draft release notes: default coreutils are now entirely [uutils](https://www.heise.de/en/news/Ubuntu-completes-Rust-transition-11456680.html). `cp`, `mv`, and `rm` were the last GNU holdouts. They are not, on 26.10.

Do not install this ISO on anything that takes a payroll. Snapshot 4 is a test image. Daily builds are even newer and even less of a promise. The point of this article is a VM checklist: kernel string, which `cp` binary you have, and the scripts that will notice.

## What Snapshot 4 actually is

Development of 26.10 started 30 April 2026 off 26.04 LTS, Resolute Raccoon. Snapshot 4 is the fourth and last of those monthly milestones, aimed at early adopters and app developers. 9to5Linux lists the usual flavor ISOs: Desktop, Server, Kubuntu, Xubuntu, Lubuntu, Edubuntu, Studio, Budgie, Cinnamon, Unity, Kylin, MATE. Download from Canonical's announcement page, not from a random mirror blog.

The stacks Canonical is still swapping closer to beta: onboarding, on-device speech-to-text, a package-agnostic App Center. Server people can ignore most of that. Care about Linux 7.2 on the snapshot versus 7.3 on the October ISO, Mesa 26.2 and GNOME 51 on the desktop images, and the coreutils switch that hits Server as hard as Desktop.

[We already wrote a 7.1 admin note](/posts/linux-kernel-7-1-server-admin-guide/). 7.2 on a pre-release is not an invitation to `apt full-upgrade` a fleet. It is an invitation to boot a VM, run `uname -r`, and see whether your out-of-tree module still loads.

9to5Linux is explicit: daily images have newer packages than the snapshot; both are pre-release; neither belongs on production. I will repeat that once more because someone will skip it. Snapshot 4 is for a VM.

## The Rust switch that 26.04 refused

Ubuntu put uutils in as default coreutils in 25.10. [Heise's Moritz Förster](https://www.heise.de/en/news/Ubuntu-completes-Rust-transition-11456680.html) reminds you that 26.04 LTS still shipped GNU `cp`, `mv`, and `rm`. Those three rewrite directory trees. Audits cared. In April Canonical said uutils still had eight open TOCTOU bugs on them: time-of-check versus time-of-use, the window where a path or symlink changes between the safety check and the write. They delayed the cutover.

[Phoronix on 16 September](https://www.phoronix.com/news/Ubuntu-Completes-Rust-Coreutils) says the 26.10 draft notes now claim "100%" Rust Coreutils, and that upstream uutils is "all well" enough for `cp`/`mv`/`rm`. Heise says the notes name those three as the remaining GNU tools that have now moved. There was no separate Canonical blog post. You find it by reading the notes.

For scripts, both writeups say the names and GNU options stay. `cp -a`, `find … -exec rm`, `du -sh` should work. Deviations are treated as bugs, not as a new dialect. That is the project policy. It is not a warranty that your 400-line backup wrapper, which greps a GNU error string, will stay green.

Heise also notes the packaging trick from 25.10: coreutils has to exist while dpkg unpacks packages. Debian alternatives and simple redirects were not good enough. Canonical built a swap mechanism so `cp` is never missing mid-upgrade. If your config-management assumes `update-alternatives --config cp`, that assumption was already wrong last year.

## Check the binary before you trust a script

On a 26.10 snapshot VM:

```bash
uname -r
dpkg -S "$(readlink -f "$(command -v cp)")"
cp --version
mv --version
rm --version
```

You want two facts. Kernel is 7.2.something. `cp --version` talks about uutils, not GNU coreutils. If `cp` still says GNU, you are not on the image you think you are, or you overrode PATH with a toolkit that ships its own coreutils.

On 26.04 LTS, the same commands should still show GNU for those three. That split is the whole operational story this month. LTS is conservative. 26.10 is the cutover. Do not "harmonize" them in Ansible until you have a diff from a real run.

Throw your actual jobs at the VM, not a toy:

```bash
# archive copy the way your backup role does it
cp -a /var/lib/example /tmp/example-copy
# cross-filesystem move, if you have a second mount
mv /tmp/example-copy /mnt/scratch/
# find+rm the way log cleanup does it
find /tmp -name 'example-*' -exec rm -rf {} +
```

Watch exit codes and stderr. If a wrapper parses "cannot remove" or "omitting directory" and those strings moved, the wrapper is the bug. File it against the wrapper, then against uutils if the flag really diverged.

TOCTOU was the reason these three waited. I am not going to tell you the eight issues are gone because a draft note said 100%. I am going to tell you to run the recursive copy as a user who should not be able to race a symlink in the destination, and to keep `cp`/`mv`/`rm` out of world-writable staging directories the same way you already should.

## Kernel 7.2 is a guest, not a fleet target

Snapshot 4's 7.2 is for module and userspace smoke. DKMS NVIDIA, ZFS, WireGuard if you still build it out of tree, your vendor's telemetry kmod. Load them. Reboot. Load them again. [7.1 already changed enough that we wrote it up](/posts/linux-kernel-7-1-server-admin-guide/). 7.2 will have its own regressions. The October ISO is supposed to land on 7.3. Testing 7.2 still teaches you whether 26.10's userspace, including uutils, hates your initramfs hooks.

Do not enable a 26.10 proposed pocket on a 26.04 host "just to get Rust cp." That is how you turn an LTS into a mixed-version science project. If you need the new `cp` for a reason, you need a 26.10 VM, not a pin.

[26.04 LTS preview is still the upgrade conversation for production](/posts/ubuntu-26-04-lts-preview/). 24.04 is supported. 26.10 is nine months of new kernel and a finished uutils cut. Use it as a canary OS, not as the new standard image.

## A one-hour lab, in order

1. Download Snapshot 4 Server ISO from Canonical, not a scraper's mirror.
2. Boot a VM with two disks if your move jobs cross filesystems.
3. Record `uname -r` and the three `--version` lines in the ticket.
4. Run the backup role, the log-clean role, and one deploy that copies a tree as a non-root user.
5. Diff a GNU 26.04 run against the 26.10 run on the same fixture. Names of files, modes, xattrs if you use them.
6. Reboot onto 7.2 twice. Confirm DKMS.
7. Stop. Do not leave the VM on a public IP.

Beta lands 24 September if Canonical holds the date 9to5Linux printed. Final 15 October. Between now and then, uutils bugs belong on the snapshot, not on the LTS you bill against.

The headline is two switches at once. Linux 7.2 is the noisy one. `cp` changing implementation under the same argv is the one that will page you at 02:00 because a cleanup job parsed the wrong sentence. Check the version string. Keep 26.04's GNU trio until that ticket is boring.

## Where scripts actually break

GNU-specific long options that nobody documents in your playbook are the first landmine. `cp --preserve=xattr` versus `cp --preserve=all` versus a uutils synonym that is one enum off. Run the help on both VMs and diff it:

```bash
cp --help > /tmp/cp-gnu.txt    # 26.04
cp --help > /tmp/cp-uu.txt     # 26.10
diff -u /tmp/cp-gnu.txt /tmp/cp-uu.txt
```

Same for `mv` and `rm`. You are looking for flags your roles pass, not for a philosophy argument about Rust. If `--remove-destination` or a sparse-file option moved, the role needs a guard on `VERSION_ID`.

BusyBox on the installer and on recovery images is a third implementation. Rescue shells are not uutils and not GNU. Do not write a postmortem that says "Ubuntu's cp" when the broken box was busybox `cp` in initramfs. `ls -l $(command -v cp)` in the failing environment is the first reply in the incident channel.

SELinux and AppArmor profiles that key off `/usr/bin/cp` inode or a specific ELF note will need a rest. If your CIS hardening ships a hash of GNU coreutils, 26.10 will fail the control until you update the baseline. That is expected. Do not "fix" it by copying GNU `cp` into `/usr/local/bin` and hoping PATH order saves you on a sudo that resets PATH.

Heise's packaging note is the upgrade-path warning. The 25.10 mechanism exists so `cp` is present while unpacking. If you overlay a third-party coreutils package from an old PPA, you can break that invariant. Disable leftover PPAs before you even think about a 26.10 upgrade next year. Snapshot 4 is where you discover the PPA, not October 16 in production.

## What I would not do

I would not rebuild 24.04 images around 26.10 userspace. Noble's 7.0 HWE and Stingray's 7.2 are different kernels with different DKMS matrices. I would not set `RUST_BACKTRACE=1` globally because a blog said uutils is Rust. I would not file "100% complete" as a security sign-off. TOCTOU was the delay. The notes say the holdouts moved. Your recursive-delete tests say whether that was true for your trees.

I would keep a 26.04 VM next to the 26.10 VM for a month and replay the same fixture. When the diffs are empty three weeks running, you can talk about a canary host. Until then, Snapshot 4 is a lab ISO with a loud kernel and a quieter `cp`.

Beta is 24 September, if the 9to5Linux calendar holds. Use the beta for the second pass. Use the final 15 October image for the third. None of those passes is a fleet rollout. The fleet stays on an LTS until the boring ticket is closed.

## A note on 24.04 versus 26.10

People will try to collapse this week into one upgrade story. Resist it. 24.04.5 is an LTS point release with Linux 7.0 on the media. 26.04 is the current LTS. 26.10 is a nine-month interim whose job is to soak 7.2/7.3 and a finished uutils cut so 27.04 has fewer surprises. Mixing those three in one image pipeline is how you get a host that cannot tell you which `rm` ran.

If a developer laptop is already on 26.10 snapshot because they wanted GNOME 51, that is their problem until they share a script that assumes GNU `cp` stderr. Put the version check in CI:

```bash
if cp --version 2>&1 | grep -qi uutils; then
  echo "uutils cp; run the expanded fixture"
fi
```

That is ugly. It is also cheaper than a backup job that deleted the wrong tree because a flag was a no-op. Snapshot 4 is out so you can find that no-op now, on a VM, with Linux 7.2 in `uname` as a side effect.
