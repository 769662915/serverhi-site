---
title: "AnyDesk 8.0.3 Fixed It. The Changelog Said Crash."
description: "The Hacker News, Oct. 9: AnyDesk Linux 8.0.3 patched a pre-auth flaw in June. The changelog called it a crash. No CVE as of that story."
pubDate: 2026-10-10
coverImage: "./cover.webp"
coverImageAlt: "A closed laptop on a rack shelf beside a paper version checklist and a dark network switch, cool aisle light, no logos."
category: security
tags: ["AnyDesk", "Linux", "remote desktop", "TCP 7070", "patch management"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "25 minutes"
prerequisites:
  - "A host inventory that can show the installed AnyDesk Linux version, not a guess from the download page"
  - "Permission to upgrade the package or to restrict inbound TCP 7070 until the upgrade lands"
  - "A way to tell Linux hosts from Windows and macOS hosts, because AnyDesk's June statement split them"
osCompatibility:
  - "Linux hosts running AnyDesk builds at or before 8.0.2, especially 8.0.2"
  - "Not a Windows or macOS AnyDesk issue, according to AnyDesk's June statement quoted by The Hacker News"
---

The version and the sentence in the changelog are not the same fact. [Swati Khandelwal at The Hacker News on October 9, 2026](https://thehackernews.com/2026/10/researchers-publish-working-exploit-for.html) says security researchers published a working exploit for a pre-authentication remote code execution flaw in AnyDesk Linux that gives root before anyone approves the connection. AnyDesk patched it in version 8.0.3 in June. The changelog, which Khandelwal quotes, described the fix only as "fixed a bug that could lead to a crash." No CVE. No security advisory. The exploit code was released on October 8. The name on the write-up is AnyPwn. The bug class is a heap buffer overflow in the session protocol. I am not going to reproduce the packet layout, the length field, or the chain that turns the overflow into a command. If you need to confirm the bug exists, the advisory gap is the story. The exploit steps are not a troubleshooting guide.

Administrators should update AnyDesk Linux to at least 8.0.3. Khandelwal says the latest release is 8.1.0. Those are the two version numbers I will use. I do not have a command in the piece, and I am not going to invent `anydesk --version` or an apt line the article did not print. Compare the installed build to 8.0.2, 8.0.3, and 8.1.0 with whatever your package inventory already shows. If it shows 8.0.2, you are on the build the published exploit targets. If it shows something older, the researchers imply that earlier versions such as 8.0.1 may share the vulnerable code path, and they also say exploitation of those versions has not been confirmed. "May share" is not "proven on 8.0.1." Update anyway. Do not wait for a confirmation that makes the older build safe.

We have written the habit this bug dodges. [Debian's 1,313 kernel CVEs were a batch, not 1,313 fires](/posts/debian-1313-cve-kernel-batch-2026/). A scanner that keys off CVE IDs will not key off a crash line in a remote-desktop changelog. [Check Point's CVE-2026-85102 had a number and a LivePatch that was not the fix](/posts/checkpoint-cve-2026-85102-93616-2026/). This one does not have the number. The fix is still a version.

## What October 9 adds to a June patch

The timeline is the part that should change a ticket queue. The researchers announced the flaw on June 22. AnyDesk acknowledged it the next day and released 8.0.3 with the fix. Khandelwal is writing on October 9, after the exploit code landed on October 8. A patch that has been out since June is not a new patch. The new fact is that working exploit code is public, and that the public record AnyDesk left in the changelog still reads like a stability fix.

I tried to open the changelog URL the article cites. The fetch failed. I am quoting Khandelwal's quotation, not a page I rendered. If your change board wants the vendor sentence in the vendor's own HTML, open [the Linux changelog](https://anydesk.com/en/changelog/linux) yourself and search for 8.0.3. Do not let this article become the only copy of that sentence in the ticket. The sentence she prints is short enough to check: fixed a bug that could lead to a crash. If the page now says something more specific, the page wins. As of her October 9 story, it did not.

No CVE has been assigned as of October 9. AnyDesk has not issued a formal security advisory. That pair is why a vulnerability-management weekly will miss this if the weekly is a CVE import. You will not get a KEV date for a flaw that has no CVE. You also should not invent a severity score. I do not have a CVSS number in the piece. Pre-auth, remote, root, Linux, direct connection: that is the impact description Khandelwal is working from. It is enough to put the version check above a medium CVE that already has a number and a vendor advisory, if the host actually runs AnyDesk. It is not enough to invent a 9.8 and paste it into a slide.

The download page is a second record that can lie by omission. Khandelwal says AnyDesk's Linux download page no longer lists 8.0.2, though 8.0.2 still appears in the changelog. The researchers wrote that the vendor appears to have deleted the 8.0.2 build after their proof-of-concept video. "Appears" is their verb. I am not confirming a deletion. I am noting that a download page without 8.0.2 does not prove your installed package is gone. Packages do not uninstall themselves because a website dropped a row. Inventory the host. Do not inventory the marketing download list and call it the fleet.

## Direct TCP 7070 is the path they demonstrated

The published exploit works only over direct TCP connections on port 7070. It is probabilistic. The heap layout has to place a target object next to the overflowed buffer. Otherwise the service crashes instead of running the attacker's command. The offsets in the published code target a specific build, AnyDesk Linux 8.0.2. Other builds would need different values. That is as far as I will go into mechanism. A crash is still an outage. A root command is a compromise. Both are reasons to leave 8.0.2. Neither requires you to read the offsets.

The researchers say the same vulnerable code path is also reachable via AnyDesk's relay servers, which the software uses when a direct connection is unavailable. They validated that with an instrumentation trigger. They did not demonstrate the full exploit chain over relays. AnyDesk said in June that the vulnerability is limited to direct connections on Linux, connections that do not go through the relays, and that Windows and macOS are not affected. Hold both statements. The vendor says relays are outside the bug. The researchers say they can reach the code path through relays and have not shown the full chain there. "Not demonstrated" is not "safe." It is also not "proven." If your Linux hosts accept direct connections on 7070, you do not need the relay argument to justify the upgrade. The demonstrated path is enough.

If you cannot update today, Khandelwal's interim control is the one I will repeat and not expand: restrict access to TCP port 7070. She does not print a firewall snippet. I will not add one. Your existing host firewall, security group, or upstream ACL is the tool. The goal is that untrusted networks cannot open that port to the AnyDesk service until the package is 8.0.3 or newer. Whether the flaw is fully exploitable over relay connections remains unresolved. Restricting 7070 does not answer the relay question. It answers the path the published code actually uses.

Windows and macOS are out of scope for this flaw, on AnyDesk's June statement as quoted. Do not burn a Linux maintenance window on a Mac because the headline said AnyDesk. Do not skip a Linux VDI host because the laptop fleet is Windows. The split is the useful part of the vendor sentence. The rest of the vendor sentence, the crash wording, is the part that aged badly once the exploit was public.

## Do not merge this with the other AnyDesk incidents

Khandelwal separates two older stories, and a weekly roundup will try to fold them back in. CVE-2025-27918 was a heap buffer overflow fixed in version 7.0.0 in April 2025. It affected all AnyDesk platforms. The mechanism was an integer overflow in user image processing. That is not this session-protocol flaw, and it is not Linux-only. If a scanner finally shows CVE-2025-27918, that ticket is "are we still below 7.0.0," not "did we reach 8.0.3." A host can be patched for the 2025 bug and still be on 8.0.2. Check both versions if both bugs are in your queue. Do not close one because the other has a CVE and this one does not.

The early 2024 incident is a third item. AnyDesk's production systems were breached. Certificates were revoked. Passwords were reset. That is a vendor compromise, not this protocol bug. A host that reset a password in 2024 can still be running 8.0.2 in October 2026. A host that upgraded to 8.1.0 is not thereby proven clean of a 2024 certificate event. Different years, different actions. If your runbook has one row labeled "AnyDesk incident," split it before someone marks the row done because they clicked a password reset two years ago.

I am also not attaching a CVSS, a ransomware note, or an in-the-wild campaign count. Khandelwal's piece, in the sections I am using, does not give those. The public exploit is the escalation. It is not the same sentence as "we are seeing mass scanning." I will not add the scanning sentence to make the ticket louder. The ticket is already loud if Linux hosts run a remote-desktop service that was exploitable before the user accepted the session, and the vendor note called it a crash.

## A version check is the whole procedure

List Linux hosts that have AnyDesk installed. Read the installed version from the package database or from the vendor's own about box, whichever your inventory already trusts. Treat anything below 8.0.3 as needing the upgrade, with 8.0.2 as the build the October 8 code was written against. Prefer 8.1.0 if that is what the current download is, because Khandelwal calls it the latest release, not because I diffed the two changelogs. I did not. A jump from 8.0.3 to 8.1.0 may include unrelated fixes. Read them on the changelog page I could not fetch, then decide if you need them today. The security floor for this flaw is 8.0.3.

If the upgrade cannot land in this window, restrict TCP 7070 from untrusted sources and record the exception with a date. Do not record "monitoring." Monitoring a pre-auth flaw with public exploit code is not a control. A crash in the AnyDesk service after October 8 is a reason to pull the host off the network and check the version, not a reason to restart the service and call it the crash the changelog promised. I do not have indicators of compromise in the piece. I will not invent log lines.

[Ubuntu's CVE-2026-80521 was a case for checking the kernel rather than the container runtime](/posts/ubuntu-cve-2026-80521-docker-hosts/). This one is the inverse shape. The interesting package is AnyDesk, not the kernel, and the interesting absence is the CVE field your tracker imports. A fleet report that is green on CVE imports can still be running 8.0.2. Sort by package version. The changelog already told you the wrong story once.
