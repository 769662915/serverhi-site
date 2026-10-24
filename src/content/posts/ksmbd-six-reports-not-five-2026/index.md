---
title: "KSMBD Has No CVE Yet. One Count Is Six. Another Is Five."
description: "Cyber Kendra counted six ZDI reports on Oct. 21 and 22. Another writeup counted five. As of Oct. 23, the KSMBD pair still had no CVE."
pubDate: 2026-10-25
coverImage: "./cover.webp"
coverImageAlt: "A closed notebook and a blank sticky note on a steel shelf, warm side light, no labels and no logos."
category: troubleshooting
tags: ["Linux", "kernel", "troubleshooting", "Samba"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "15 minutes"
prerequisites:
  - "A shell on the host you mean to check, not a container that hides the host module list"
  - "The unit or module name ksmbd, if the distro ships it, rather than a Samba service name guessed from port 445"
---

Two writeups counted the same mailing-list drop and did not land on the same integer. [Cyber Kendra](https://www.cyberkendra.com/2026/10/linux-ksmbd-rce-flaws-zdi-public-mailing-list.html) says Trend Micro's Zero Day Initiative sent six vulnerability reports to public Linux kernel mailing lists on October 21 and 22, 2026, before fixes existed. [Pasquale Pillitteri's note](https://pasqualepillitteri.it/en/news/26511/linux-kernel-ksmbd-vulnerabilities-leaked-before-patch) says five reports, on October 21, copied to the public lists. Both agree on the pair that matters for a file server: ZDI-CAN-33774 and ZDI-CAN-33549, remote code execution in ksmbd, each scored 9.0. As of October 23, Cyber Kendra says neither has a fix in mainline and neither has a CVE identifier. Pillitteri says no patch had landed in a stable kernel release. A ticket that searches the tracker for a CVE number is searching for an identifier these pages say was not assigned yet.

We already split a package version from the build someone expected, in [the PHP USN note](/posts/usn-8948-1-php-836-not-8336-2026), and a kernel label from the package that actually shipped, in [the Ubuntu 26.10 note](/posts/ubuntu-26-10-kernel-rc6-not-7-3-final-2026). This one is the same shape. The headline count is not the exposure check. The exposure check is whether ksmbd is loaded, and which of the two identifiers matches the feature you actually turned on.

## Six reports, or five, and the sixth may not be the kernel

Cyber Kendra's six, as listed: ZDI-CAN-33774 and ZDI-CAN-33549 in ksmbd; ZDI-CAN-33367, a local privilege escalation in skb_zerocopy, CVSS 7.8, which kernel developers had already been told about the previous week, with a patch expected; ZDI-CAN-34068, an out-of-bounds write in vmwgfx, CVSS 8.8; ZDI-CAN-34076, an information leak in the NVMe-over-fabrics target, CVSS 8.6; and ZDI-CAN-32005, a stack buffer overflow in ConnMan, which runs outside the kernel.

Pillitteri's table has the first five of those ideas and drops ConnMan. It also declines to print CVSS for ZDI-CAN-34068 and ZDI-CAN-34076, marking severity "not stated," where Cyber Kendra prints 8.8 and 8.6. And it dates the send to October 21, not October 21 and 22. A tracker import that requires one date and one severity for "the ZDI batch" will fail this set honestly. The batch is not one bug. The two pages do not even agree how many rows it has.

[gbhackers, dated October 23](https://gbhackers.com/critical-unpatched-linux-kernel-vulnerabilities-accidentally-disclosed-including-two-remote-code-execution-flaws), does not spend its extract on the count. It spends it on the two ksmbd identifiers and on Greg Kroah-Hartman questioning why the reports went out without patches. Whether the send was accidental is, in that piece, unconfirmed. It says the reports credit Trend Micro's AI scanner, and that updated kernel guidance treats AI-discovered bugs as already public. That guidance claim is gbhackers' account of the kernel side. It is not a CVE assignment. As of October 23, the same piece says ZDI had not publicly clarified the submission.

There is a second "six" in Cyber Kendra's close, and it is a trap. The same week, researcher Hyunwoo Kim disclosed an Infinity Core set of six Linux kernel privilege-escalation bugs. Six and six. Different bugs, different names. A channel summary that says "six kernel bugs, patch your SMB" has glued Kim's set to ZDI's mail. Do not.

Older ksmbd ZDI numbers are a third trap. Cyber Kendra notes ZDI-22-1690, December 2022, an unauthenticated remote code execution flaw in the same server, and ZDI-26-573, August 2026, a pre-authentication memory leak rated 9.3. Those are not ZDI-CAN-33774 and not ZDI-CAN-33549. A host patched for the August leak is not, on these pages, described as patched for this week's pair. This week's pair, as of October 23, had no mainline fix to be patched to.

## The two KSMBD scores are not the same exposure

ZDI-CAN-33774, in Cyber Kendra, can be triggered without logging in, on a server running ksmbd on port 445. gbhackers describes it as a race in queued network requests, inconsistent handling, out-of-bounds access, potential remote code execution, CVSS 9.0. Pillitteri files it under ksmbd request handling, remote code execution, CVSS 9.0. The operational sentence for a ticket is the Cyber Kendra one: no login, port 445, ksmbd running. The race detail is a mechanism. It is not a recipe, and this note is not going to turn it into one.

ZDI-CAN-33549 is the narrower door. gbhackers says it is an integer underflow in ksmbd's SMB Direct path, and that exposure depends on configuration and on whether SMB Direct is enabled. Pillitteri is more specific about the conditions it is willing to print: a network card with RDMA, a writable ksmbd share, and a client that negotiates SMB Direct. Cyber Kendra's mitigation line matches the shape of that condition from the other direction: if ksmbd has to stay, leave SMB Direct disabled unless the network depends on RDMA. A host with ksmbd on 445 and SMB Direct off is in the conversation for 33774, if Cyber Kendra's unauthenticated claim holds, and out of the conditions Pillitteri lists for 33549. Writing "both RCEs, same exposure" erases that split.

No page in this set prints a kernel version range. Not a minimum, not a "fixed in" release, because the point of the stories is that a fix was not in mainline or stable as of October 23. A runbook that says "upgrade to 6.x.y" is inventing the version. Watch the distribution tracker, which is Cyber Kendra's instruction, rather than inventing a version to type into apt.

Samba is the other name people will type. gbhackers says ksmbd is distinct from Samba, so a system using Samba alone is not automatically affected. Port 445 being open does not tell you which daemon owns it. `ss` or an equivalent will show the listener. It will not, by itself, tell you the binary. The module check is the next command, not a substitute for knowing you run Samba.

## What to run, and what not to conclude

Cyber Kendra's check is short: `systemctl status ksmbd` or `lsmod | grep ksmbd`. If the module is loaded and you do not need the kernel server, stop the service, unload with `modprobe -r ksmbd`, and blacklist it so it does not return on the next boot. If you do need it, the same piece says keep port 445 off the public internet, remove guest-accessible shares, leave SMB Direct disabled unless RDMA is actually required, and watch the distro security tracker for a backport.

Those are checks and shutdowns. They are not a proof that the race is reachable on your build, and they are not a proof that it is not. The pages do not give a kernel range. A loaded module means you are in the population the notices are talking about. An unloaded module means this pair is not your SMB stack, assuming the module name on your distro is `ksmbd` and not a vendor rename these articles do not mention. I did not find a rename in these sources. If `lsmod` is quiet and a `ksmbd` unit does not exist, write that down. Do not write "patched."

`modprobe -r` fails when the module is busy. That is ordinary. It means something still has the server open. Stopping the unit first is why Cyber Kendra lists stop before unload. Forcing a removal is not in the article, and it is a good way to take a file share down without learning anything about the bug. Blacklist is the persistence step. A reboot without a blacklist brings the module back if a unit or a dependency loads it. Check after the reboot, not only before.

Guest shares are a separate sentence from the unauthenticated claim. Cyber Kendra says remove guest-accessible shares if ksmbd must stay. ZDI-CAN-33774, in that same piece, does not require a login. Removing guests does not, on the text I have, close an unauthenticated path. It is still the instruction they printed. Do it. Do not describe it as the fix.

SMB Direct is the lever that maps to ZDI-CAN-33549. Leave it off unless the network depends on RDMA. If the network does depend on RDMA, Pillitteri's conditions are the ones to put in the ticket: RDMA NIC, writable share, client negotiating SMB Direct. "We use SMB" is not that sentence. A datacenter share and a laptop with the module loaded for a test are not the same exposure, and the pages give you the words to say which is which.

## What does not belong in the same change window

vmwgfx is a graphics driver for VMware guests. NVMe-over-fabrics is a storage target. skb_zerocopy is a networking copy path, local privilege escalation, and Cyber Kendra says a patch was already expected because someone else had reported it the previous week. ConnMan is userspace. None of these is a reason to schedule an SMB maintenance window, and an SMB window is not a reason to tell the virtualization owner that vmwgfx is handled.

If you are the person who owns all of them on one fleet, split the tickets. ksmbd gets the "no CVE yet, no mainline fix as of October 23, check the module" ticket. skb_zerocopy gets the "patch expected, local, not the file server" ticket. vmwgfx and nvmet get their own, with the severity conflict noted: 8.8 and 8.6 in Cyber Kendra, not stated in Pillitteri. ConnMan gets a userspace ticket, and it is the row that explains how one writer counted five kernel reports and another counted six sends.

Do not bundle Hyunwoo Kim's six local privilege escalations into any of those. Do not close ZDI-CAN-33774 because a host already carries a fix for ZDI-26-573. The August identifier is a memory leak rated 9.3. This week's identifiers are a different pair, and the pages say the fix was not in the tree yet.

## What to put on the ticket

Write the date of the check, and the date of the sources: reports public October 21, and in Cyber Kendra's telling also October 22; status "no CVE, no mainline fix" as of October 23. Write both identifiers. Next to ZDI-CAN-33774, write Cyber Kendra's exposure line: ksmbd, port 445, no login required, in that article's account. Next to ZDI-CAN-33549, write SMB Direct, and Pillitteri's three conditions if you are deciding whether the narrower bug is in play. Write Samba as a negative: gbhackers says Samba alone is not this module.

Paste the command output, not a paraphrase. `systemctl status ksmbd` and `lsmod | grep ksmbd` either show a unit and a module or they do not. If you unload, paste the blacklist line and the after-reboot `lsmod`. If you cannot unload because the share is required, paste the decisions you can point at: 445 not on the public internet, guest shares removed, SMB Direct off or explicitly required. Leave the kernel version in the ticket as the running version, for the tracker later. Do not write it as the affected range. Nobody in these sources published one.

Then stop. A longer ticket that explains the race well enough to reproduce it is not a troubleshooting note. The distro tracker is the next input. Until it names a package, the honest status is the one the pages already used on October 23: known identifiers, no CVE, module on or module off.
