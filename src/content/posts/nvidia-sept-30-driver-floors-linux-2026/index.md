---
title: "NVIDIA's Sept. 30 List: Four Driver Builds, Then Update"
description: "GamingOnLinux lists four safe NVIDIA Linux driver builds from the Sept. 30 bulletin. The high scores are local memory bugs. Guest drivers are a separate row."
pubDate: 2026-10-02
coverImage: "./cover.webp"
coverImageAlt: "A server chassis with the side panel off and a GPU seated in the tray, cool white bench light, no vendor logos and no readable text on the board."
category: troubleshooting
tags: ["NVIDIA", "GPU driver", "Linux", "CVE", "patch management"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "30 minutes"
prerequisites:
  - "A way to read the running NVIDIA driver version on the host, not the version pinned in an image you have not rebuilt"
  - "Permission to install the vendor driver build for the branch you are actually on"
  - "The Sept. 30 NVIDIA GPU Display Driver bulletin and the GamingOnLinux summary below"
osCompatibility:
  - "Linux hosts running an NVIDIA GPU display driver in the branches the bulletin names"
  - "vGPU and guest-driver installs, which use a different version string than the host display driver"
---

The NVIDIA host driver is the thing to patch. The container that happens to see the GPU is not. [GamingOnLinux on Sept. 30](https://www.gamingonlinux.com/2026/09/nvidia-security-bulletin-for-sept-30-notes-many-gpu-issues) read NVIDIA's display-driver bulletin and printed the four Linux builds it is willing to call safe: 615.71.09, 610.57.04, 595.91.07, and 580.178.04. If you are in one of those series and your build number is below the one in that list, the article's instruction is to update.

[NVIDIA's own bulletin](https://nvidia.custhelp.com/app/answers/detail/a_id/5861/~/security-bulletin%3A-nvidia-gpu-display-driver---september-2026) is a set of wide tables. The Linux branch header I could read covers R595, R580, and R570, and then a long CVE list. A guest-driver row I could read pairs "all versions prior to and including 20.1" with 595.71.05 on one side and 20.2 / 595.91.07 on the other. I am not going to pretend I retyped every cell. The operational sentence I will use is GamingOnLinux's, because it is a sentence and not a table I might mis-align. The bulletin is the primary page. The four builds are the check.

We already had this shape once this month. [CVE-2026-80521 was a kernel bug, and the Docker version was the wrong place to look](/posts/ubuntu-cve-2026-80521-docker-hosts). Same habit here. `nvidia-smi` on the container is often the host driver leaking through. The version that matters is the one the host is running. The bulletin does not print a shell one-liner. Reading the running driver and comparing it to those four floors is the whole troubleshooting step.

## The four NVIDIA driver floors, and the branch you are not on

GamingOnLinux's safe list is series-specific. 615.71.09 is not a fix for a 595 machine, and 595.91.07 is not a fix for a 580 machine. "Below those version numbers" means below the floor inside the series you are on. A 580.178.04 host is at the floor that article names for that series. A 580.169.something host, if that build exists, is under it. I am not going to invent intermediate build numbers the summary did not print. If your reported version is not in the 615, 610, 595, or 580 series at all, the summary does not give you a fifth floor. That is when you go to the bulletin table instead of guessing that "newer than 580" is the rule.

The bulletin's Linux branch line names R595, R580, and R570 as the branches whose CVE list that table addresses. R570 is on the bulletin and not in the four-build sentence I quoted. I will not paper over that. If you are on an R570 build, GamingOnLinux's four numbers do not include your floor. Use the bulletin's R570 row, not a neighboring series. I could not read a clean R570 fixed-build cell in the extract. Saying "I did not get that cell" is more useful than borrowing 580.178.04 for a branch it was not printed against.

The guest-driver fragment is a different product. Versions prior to and including 20.1, a 595.71.05 figure in the same row, and a fixed side of 20.2 / 595.91.07. A vGPU guest reporting 20.1 is not a host reporting 595.71.05, even if both numbers appear in one row of a wide table. Write down which string you actually got. If it looks like 20.x, you are in the guest-driver column. If it looks like 595.x, you are in the host display-driver series GamingOnLinux already floored at 595.91.07. Mixing those strings is how a change ticket closes the wrong package.

Windows is in the same bulletin and is not this host. The Windows branch table I could read also covers R595, R580, and R570, with its own CVE list. Do not patch a Linux node from the Windows column, and do not tell a Windows admin that 595.91.07 is their build. This note is the Linux check.

## What the high scores actually are

GamingOnLinux pulled the Linux rows and dropped some Windows-only issues. I am using the rows whose text says Linux. Scores are CVSS base scores as that article prints them. I have not reproduced any of them.

CVE-2026-47595 is a kernel-mode permissions bug. An unprivileged user can write to read-only memory because the permissions are not preserved. Score 7.8, high. The impact line is code execution, privilege escalation, data tampering, denial of service, and information disclosure. CVE-2026-47489 is the sibling wording: permissions on read-only memory might not be preserved, same 7.8, same impact class, Linux kernel-mode layer. CVE-2026-47596 is narrower in the impact line and still high: unprivileged write to read-only memory, score 7.0, code execution and privilege escalation. Three bugs, one family. The attacker in the text is local and unprivileged, not a remote scanner with no account.

CVE-2026-47554 is the odd one in the high set. Improper verification of cryptographic signatures may let signature verification be bypassed under memory pressure. Score 7.1, high. Impacts listed: denial of service and data tampering. The text does not say "unprivileged user" in the sentence I have. It says the bypass can happen under memory pressure. I will not add "local only" to a CVE whose sentence did not say it, and I will not add "remotely exploitable" either. Memory pressure is the condition they named. Your log, if this is the one you are worried about, is a signature check failing open when the machine is already short of RAM. That is a different hunt from a crafted ioctl.

The medium cluster is mostly denial of service, score 5.5, and it is where a shared GPU box feels this bulletin even if nobody is trying to get root.

CVE-2026-47517: a local user submits a crafted ioctl, null pointer dereference, denial of service. CVE-2026-47534: divide by zero in the kernel-mode layer, Windows and Linux, denial of service. CVE-2026-47557: an unprivileged user causes a NULL pointer dereference, denial of service. CVE-2026-47566: an unprivileged user triggers a memory leak on error paths, kernel memory exhaustion, denial of service. CVE-2026-47567: uncontrolled resource consumption by exhausting the DRM VMA offset address space, denial of service. CVE-2026-47568: uncontrolled kernel log generation from an interface that emits unrate-limited error messages, denial of service.

Read that last pair as capacity bugs. A process that can open the driver interface can burn kernel memory or fill the log disk. On a single-user workstation that is an annoyance. On a multi-tenant GPU host it is a noisy neighbor with a kernel path. [The kernel deadline note from earlier this month](/posts/cisa-kernel-kev-deadline-passed-2026) was about a different bug and a CISA date. This bulletin, in the text I have, does not say these CVEs are in the KEV catalog. Do not file them as known-exploited because a newsletter was long. File them because the driver branch is below the floor and the interface is reachable by accounts you do not fully trust.

## A use-after-free that I will not assign to your branch

[Red Hat's page for CVE-2026-47579](https://access.redhat.com/security/cve/cve-2026-47579) describes a use-after-free in the NVIDIA GPU display driver's kernel mode: a local user gets the system to touch memory after it was freed. Successful exploitation could mean code execution, privilege escalation, tampering, information disclosure, or denial of service. The page I could read did not give a fixed build, and it did not say the flaw is Linux-only.

In the NVIDIA bulletin extract, 47579 appears in the Windows branch CVE list, not in the Linux branch list I was able to read. I am not going to move it. If your scanner flags 47579 on a Linux host, the next click is the bulletin row for your branch, not this paragraph. A scanner that marks "under investigation" on a Red Hat product is telling you Red Hat has not finished the mapping. That is a status, not a patch command. We hit the same class of kernel privilege bug in [CVE-2026-53362](/posts/linux-cve-2026-53362-ipv6-privilege-escalation), and the lesson was the same: the CVE name is not the package name.

## The check, in the order that does not close the wrong ticket

Write down the running host driver version before you open the bulletin. The string is the one the host driver reports. A Dockerfile that says `nvidia/cuda` and a node that has not been rebooted since August are different machines. If the string is 595.something and it is below 595.91.07, GamingOnLinux says that series is not at the safe build. Same comparison for 615.71.09, 610.57.04, and 580.178.04, each inside its own series. If the string is a 20.x guest driver, use the guest row, and do not celebrate because the host's 595 package was already current. They are not the same install.

Then decide whether the box is shared. The 7.8 memory-permission bugs are local unprivileged writes. Any account that can reach the device node is in the threat model those descriptions use. A GPU node that runs other people's containers, a render farm, a lab machine with student logins: those are the hosts I would put at the top of the queue. A desktop with one admin and a locked sshd is still affected if the version is below the floor. It is just a smaller set of people who can try the ioctl.

I am not shipping a proof of concept, and I am not telling you to test the null dereference to see if you are vulnerable. The version check is the test the bulletin supports. If the package manager and the running driver disagree after the update, you rebooted into the old module. That disagreement is the second check, and it is more common than a failed download. `nvidia-smi` after the reboot should show the floor you meant to install, or higher, in the same series. If it shows the old build, the package update did not land in the running kernel. Look at the module, not at the changelog you already read.

The bulletin is large. GamingOnLinux's writer said it was the most issues they had seen in one drop, and guessed that more AI-assisted hunting might be why, pointing at the same pattern in the Linux kernel and at Canonical speeding Ubuntu kernel updates. That is a theory about volume. It is not a count of how many of these bugs are in the wild. I do not have an exploitation report in these pages. The action does not depend on one. Below the floor, in a series the summary named, update. On a branch the summary did not floor, read the bulletin cell before you type the package name.
