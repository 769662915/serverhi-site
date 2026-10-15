---
title: "USN-8920-1 Is a 5.4 Kernel. The OEM Fix Is Not."
description: "USN-8920-1 is a 5.4 kernel for 20.04 and 18.04. The 6.17 OEM fix is USN-8911-1. The three October notices do not share a CVE."
pubDate: 2026-10-16
coverImage: "./cover.webp"
coverImageAlt: "Three closed manila folders of different thicknesses on a steel rack shelf, with a coiled unplugged ethernet cable beside them."
category: linux
tags: ["Ubuntu", "USN-8920-1", "Linux kernel", "USN-8911-1", "USN-8923-1"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "20 minutes"
prerequisites:
  - "The Ubuntu security notice for the release you actually run, not a neighboring notice from the same week"
  - "A way to read the running kernel with uname -r before you decide which image package applies"
  - "Ubuntu Pro entitlement if the notice marks the package as Pro or FIPS"
osCompatibility:
  - "USN-8920-1 applies to Ubuntu 20.04 LTS and 18.04 LTS kernel packages named on that notice"
  - "USN-8911-1 applies to the 24.04 OEM 6.17 kernel, not to a generic 24.04 linux-image"
  - "USN-8923-1 applies to Ubuntu 16.04 LTS and 14.04 LTS 4.4 kernels named on that notice"
---

The notice number and the kernel you are running are not the same object. [Ubuntu's USN-8920-1](https://ubuntu.com/security/notices/USN-8920-1), published 13 October 2026, fixes kernel issues in packages for 20.04 LTS and 18.04 LTS. The image versions on that page are 5.4 builds. [USN-8911-1](https://ubuntu.com/security/notices/USN-8911-1), published 9 October 2026, is a 24.04 notice for linux-oem-6.17, and the image it names is linux-image-6.17.0-1033-oem at 6.17.0-1033.33. [USN-8923-1](https://ubuntu.com/security/notices/USN-8923-1), also published 13 October 2026, is a 16.04 and 14.04 notice. Its image names are 4.4 builds, and the page lists two CVE identifiers, both from 2022. Three notices in five days. I counted the CVE identifiers on each HTML page. 29, 12, and 2. None of the three sets overlap.

We already had a kernel batch that was a batch, not 1,313 separate fires. [Debian's October kernel mail was that batch](/posts/debian-1313-cve-kernel-batch-2026/). We already had a userspace update that was not the kernel. [X.Org 21.1.25 was twelve CVEs and a Fedora package, not a linux-image](/posts/xorg-21-1-25-twelve-cves-2026/). We already had an ISO date that was not a CVE list. [Arch's 2026.10.01 image was a re-enroll step](/posts/arch-linux-october-iso-tpm2-reenroll-2026/). This week is Ubuntu, and the mistake is installing the notice whose number you saw in a headline onto a machine whose `uname -r` is a different major. I am not going to write an exploit. The notices already say an attacker could possibly use the flaws to compromise the system. What follows is which package is on which page.

## USN-8920-1 is 20.04 and 18.04. The images are 5.4.

The publication line on USN-8920-1 is 13 October 2026. The releases line is 20.04 LTS and 18.04 LTS. The package names at the top of the notice are linux-aws-5.4, linux-aws-fips, linux-azure-fips, linux-ibm, and linux-ibm-5.4. That is not a generic linux-image-generic for a desktop 24.04 install. If your host is 24.04 and you only apt-installed linux-generic, this notice is not the one that moves your running kernel.

The version table is where the Pro and FIPS labels live, and they are not on every row. On 20.04 the notice lists linux-image-5.4.0-1111-ibm at 5.4.0-1111.116, marked Ubuntu Pro. It lists linux-image-5.4.0-1165-aws-fips at 5.4.0-1165.176+fips1, and linux-image-5.4.0-1170-azure-fips at 5.4.0-1170.176+fips1, both marked FIPS. The meta packages on that 20.04 block use a different punctuation: linux-image-aws-fips and linux-image-aws-fips-5.4 at 5.4.0.1165.112, linux-image-azure-fips and linux-image-azure-fips-5.4 at 5.4.0.1170.106, linux-image-ibm-5.4 and linux-image-ibm-lts-20.04 at 5.4.0.1111.140. The image build is 5.4.0-1111.116. The meta line is 5.4.0.1111.140. Those are not two spellings of one version. One has a hyphen and .116. The other has dots and .140. I am not going to collapse them.

On 18.04 the same notice lists linux-image-5.4.0-1111-ibm at 5.4.0-1111.116~18.04.1, and linux-image-5.4.0-1165-aws at 5.4.0-1165.176~18.04.1. The 18.04 AWS image name in that row is linux-image-5.4.0-1165-aws, not linux-image-5.4.0-1165-aws-fips. The 20.04 row with the same 1165.176 base is the fips build, 5.4.0-1165.176+fips1. The suffix is the difference. A note that says "1165.176, so both releases got the FIPS kernel" has deleted +fips1 and the ~18.04.1 suffix. The meta lines follow the same split. 18.04's linux-image-aws and linux-image-aws-5.4 are 5.4.0.1165.176~18.04.1. 18.04's linux-image-ibm and linux-image-ibm-5.4 are 5.4.0.1111.116~18.04.1. I did not see an 18.04 azure-fips version in the table slice I used. I am not going to invent one because the package list names linux-azure-fips at the top of the notice.

The subsystem list on USN-8920-1 is Ethernet bonding, network drivers, F2FS, the NFS server daemon, tracing, io_uring, the networking core, IPv6, the IUCV driver, Netfilter, and RxRPC. That list is not a severity ranking. It is the notice's map of where the fixes landed. A host that does not use F2FS is still on the notice if it is running one of the named images. I am not going to tell you to skip the reboot because you do not use IUCV.

## USN-8911-1 is the OEM 6.17 package. It is not linux-generic.

USN-8911-1 is dated 9 October 2026. The releases line is 24.04 LTS. The only source package named is linux-oem-6.17, described as the Linux kernel for OEM systems. The image is linux-image-6.17.0-1033-oem, version 6.17.0-1033.33. The meta names on the same page are linux-image-oem-24.04, linux-image-oem-24.04a, linux-image-oem-24.04b, linux-image-oem-24.04c, linux-image-oem-24.04d, and linux-image-oem-6.17. I did not see a separate version number printed next to each of those meta names in the slice I parsed. I am not going to copy 6.17.0-1033.33 onto oem-24.04a and call it confirmed. The image row is the one that carries 6.17.0-1033.33.

The subsystem list is longer than USN-8920-1's, and it is not the same list. Hardware crypto device drivers, the NVIDIA Tegra memory controller, network drivers, USB core, GFS2, OCFS2, SMB, SoundWire ASoC, B.A.T.M.A.N., the Ceph core library, IPv4, IPv6, Netfilter, Open vSwitch, RxRPC, SCTP, and TIPC. Network drivers, IPv6, Netfilter, and RxRPC appear in both notices' subsystem sentences. That overlap of words is not an overlap of CVE identifiers. I checked the CVE strings on the three HTML pages. The intersection is empty. A shared subsystem name means both notices touched that area of the tree. It does not mean the same bug, and it does not mean the same binary.

A 24.04 machine that is not on the OEM kernel does not get this fix by installing linux-image-5.4.0-1111-ibm. That package is the other notice, and it will not be the right architecture of answer even if apt will refuse it. `uname -r` is the check. If it does not start with 6.17.0-1033-oem, USN-8911-1 has not told you that your running image is the one it rebuilt. If it does, the version to look for after the update is 6.17.0-1033.33, which is the version the notice prints, not a version I am inventing from the image name alone. The image name already contains 6.17.0-1033. The .33 is the notice's ABI suffix. Both are on the page.

## USN-8923-1 is 4.4, and the CVE list is two identifiers

USN-8923-1 is also dated 13 October 2026. Same day as USN-8920-1. Different releases: 16.04 LTS and 14.04 LTS. The package names are linux, linux-aws, linux-fips, linux-kvm, and linux-lts-xenial. The image names include linux-image-4.4.0-1130-fips, linux-image-4.4.0-1161-kvm, linux-image-4.4.0-1198-aws, linux-image-4.4.0-289-generic, linux-image-4.4.0-289-lowlatency, and linux-image-4.4.0-1160-aws. Version strings on the page include 4.4.0-1130.137, 4.4.0-1160.166, 4.4.0-1161.172, 4.4.0-1198.213, 4.4.0-289.323, and a 14.04 string that begins 4.4.0-289.323~14. The scrape cut that last string before the rest of the suffix. I am not going to complete it as ~14.04.1. The notice is the place to read the full token.

The CVE list on that page is CVE-2022-49111 and CVE-2022-49114. Two identifiers. Both numbered in 2022. The subsystem sentence is SCSI and Bluetooth. That is the whole subsystem sentence. It is not the F2FS and io_uring sentence from USN-8920-1, and it is not the Tegra and Open vSwitch sentence from USN-8911-1. A weekly digest that says "Ubuntu patched the kernel on October 13" has merged two notices that share a date and do not share a CVE, a release, or a subsystem list.

I am not going to treat a 2022 CVE number as proof the bug is old news you can skip. The identifier's year is when it was assigned. The notice date is when this update shipped for these old releases. 16.04 and 14.04 are not the releases a new cloud image is on. They are still the releases this notice names. If you are on 24.04, this page is the wrong page. If you are still on 16.04 because a vendor image never moved, this is the page, and the two CVE identifiers are the ones to record, not the 29 from the OEM notice.

## The CVE sets do not overlap. A combined count deletes that.

USN-8911-1's page contains 29 CVE identifiers. USN-8920-1's page contains 12: CVE-2022-49149, CVE-2022-49170, CVE-2022-49182, CVE-2022-49201, CVE-2024-53187, CVE-2024-53210, CVE-2024-56763, CVE-2025-38724, CVE-2026-43456, CVE-2026-52910, CVE-2026-53131, and CVE-2026-53221. USN-8923-1's page contains the two 2022 identifiers above. I compared the three sets. No identifier appears on more than one notice.

29 plus 12 plus 2 is 43. I am doing that addition so you can see what a merged headline would print. I am not willing to publish 43 as Ubuntu's kernel CVE count for the week. The notices did not publish 43. They published three lists, for three package sets, on three pages. A scanner that files one ticket titled "Ubuntu kernel, 43 CVEs" has built an object the security notices do not have. The ticket that matches the pages is three tickets, or one ticket with three package rows.

The years inside USN-8920-1's list are also not one cohort. Four identifiers are CVE-2022, three are CVE-2024, one is CVE-2025, and four are CVE-2026. The notice does not rank them. I am not going to pull the four 2026 identifiers out and call them the only ones that matter. They shipped in the same package update as the 2022 identifiers. The package version is the unit you install. The CVE list is the unit you record.

## Reboot is on the notice. The ABI line is on USN-8920-1.

Each of these notices says that after a standard system update you need to reboot the computer to make all the necessary changes. That sentence is the operation. I am not going to turn it into a script. `apt` already knows how to install the metapackage if you have not removed it. The notice's own attention line, on the USN-8920-1 page, is the part a "just upgrade" note drops: because of an unavoidable ABI change, the kernel updates have a new version number, which requires you to recompile and reinstall any third-party kernel modules you have installed. Unless you manually uninstalled the standard kernel metapackages, a standard system upgrade performs that as well.

Third-party modules are the reason the version string matters. A DKMS module built against 5.4.0-1165 will not automatically be the right binary for 5.4.0-1165.176+fips1 versus the ~18.04.1 build. Those are different version strings on different release rows. I am not going to tell you the FIPS build and the 18.04 build are interchangeable because both contain 1165.176. The notice printed two suffixes. The suffix is the row.

Ubuntu Pro is not a suggestion I am adding. The 20.04 ibm image row and the FIPS rows are marked on the notice as Pro or FIPS updates. A machine without that entitlement can still read the notice. It cannot assume the package is in the pocket it usually updates from. I did not test an unauthenticated apt-cache. The label on the page is the constraint. If the pocket you update from does not contain 5.4.0-1111.116, the notice has not failed. The entitlement has not been attached.

What I would write in the change log, and not in a combined CVE count, is three lines. USN-8911-1, 9 October 2026, linux-image-6.17.0-1033-oem to 6.17.0-1033.33, if `uname -r` is that OEM kernel. USN-8920-1, 13 October 2026, the 5.4 image that matches the release and the cloud, including the Pro or FIPS mark if the row has one. USN-8923-1, 13 October 2026, the 4.4 image, and only if the host is still on 16.04 or 14.04. Then reboot. The notice says the reboot. I am not adding a second one.
