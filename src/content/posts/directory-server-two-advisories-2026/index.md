---
title: "Directory Server Has Two Advisory IDs. One Is the Critical."
description: "LinuxCompatible calls RHSA-2026:79217 the only Critical. An October 11 note says match RHSA-2026:64793. The two CVE lists do not match."
pubDate: 2026-10-14
coverImage: "./cover.webp"
coverImageAlt: "A dim server aisle with one open rack, a blank checklist on the rail, and a closed laptop, no logos and no readable text."
category: server-config
tags: ["Linux", "Red Hat", "Directory Server", "CVE", "patch management"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "25 minutes"
prerequisites:
  - "A way to read the installed 389-ds-base version and the module stream, not just the package name"
  - "Permission to update the directory server packages and restart the dirsrv instance"
  - "The advisory text for your exact RHEL major and support track, not a roundup headline"
osCompatibility:
  - "RHEL hosts running 389-ds-base or the redhat-ds:11 module, including Extended 4-year Support on RHEL 8"
  - "AlmaLinux and other RHEL-compatible directory servers only if their own advisory, not Red Hat's number, says so"
---

The package name and the advisory ID are not interchangeable. [Philipp Esselbach's October 9 roundup at LinuxCompatible](https://www.linuxcompatible.org/story/linux-security-roundup-rhel-directory-server-gets-only-critical-rating-as-vendors-ship-cves) says eight Linux vendors shipped a large security round, Red Hat handed out 48 errata, and exactly one of those errata is a Critical. The Critical, in that piece, lands on Red Hat Directory Server's redhat-ds:11 module. The advisory ID is RHSA-2026:79217. The track is Extended 4-year Support on RHEL 8.

[Abdalla Elmorsi's October 11 writeup](https://www.abdallaelmorsi.net/389-ds-base-critical-flaws-heap-overflow-and-auth-bypass-hit-rhel-and-almalinux-directory-server) is about the same software family and a different advisory number. He tells you to compare your installed 389-ds-base against RHSA-2026:64793 for RHEL 8, the corresponding RHEL 9 and 10 advisories, or ALSA-2026:64784 on AlmaLinux. He also cites the LinuxCompatible roundup as a source. The roundup's Critical ID and the ID he tells you to match are not the same string.

We already had a display-server drop where one vendor's notice was not the other's package. [X.Org's twelve CVEs were not Fedora's one shipped notice](/posts/xorg-21-1-25-twelve-cves-2026/). We already had a module that did not move when the server package did. [NGINX upgraded and the Brotli module did not](/posts/nginx-module-abi-mismatch-apt-2026/). We already had a CVE pile that was a batch, not a count of fires. [Debian's 1,313 kernel CVEs were that batch](/posts/debian-1313-cve-kernel-batch-2026/). This week's directory-server problem is a fourth shape: two secondary sources, two RHSA numbers, and a CVE list that grows when you change which ID you are reading.

I did not open access.redhat.com. The portal pages for RHSA-2026:79217 and RHSA-2026:64793 were not in the extracts I am writing from. What follows is what the October 9 roundup, the October 11 writeup, and a Tenable plugin page say about those IDs. If Red Hat's own text disagrees, the portal wins, and this piece is a map of the disagreement, not a substitute for the errata.

## RHSA-2026:79217 is the Critical in the roundup, and it is a module

Esselbach's lead is specific about the track. Red Hat's lone Critical is the redhat-ds:11 module, advisory RHSA-2026:79217, shipped for the Extended 4-year Support track on RHEL 8. "If you still run directory services on that track, this is the patch you should chase down first." That sentence is about a module stream on one support track. It is not a sentence about every host that has the string "directory" in an installed package.

The rest of Red Hat's 48 errata, in the same roundup, cluster at Important or below. Kernels took five Important updates plus a Moderate real-time variant, spread across RHEL 9, RHEL 10, two EUS tracks, and a RHEL 7 ELS holdout. OpenSSL and Python each picked up two Important advisories, split between RHEL 9 and RHEL 10. PostgreSQL is scattered across the 8.4, 8.6, and 8.8 Advanced Mission Critical, SAP, and Telecommunications tracks. Four Low-rated libxml2 advisories sit on the SAP and Extended Support lines. None of those IDs is 79217. A host that applied "the Important kernel erratum" has not applied the directory-server Critical. A host that applied 79217 has not, by that act, applied the kernel set.

[Tenable's plugin 364211](https://www.tenable.com/plugins/nessus/364211), dated in the search index as October 9, is titled "RHEL 8 : redhat-ds:11 (RHSA-2026:79217)." Tenable says it extracted the description block from the Red Hat advisory. I am treating that as Tenable's claim about the advisory text, not as a page I opened on the portal. The plugin lists eight CVEs: CVE-2026-11770, CVE-2026-11788, CVE-2026-15722, CVE-2026-18355, CVE-2026-18453, CVE-2026-18922, CVE-2026-19843, and CVE-2026-76560. Eight names. The LinuxCompatible lead does not print those names. If your ticket says "patched the Critical" and the ticket does not list eight identifiers, you have recorded Esselbach's severity and not Tenable's list.

The plugin also lists two bug fixes that are not CVEs. DIRSRV-897 and DIRSRV-902, both about replication total init when nsDS5ReplicaBindDNGroup is set after agreement creation. A security changelog and a replication bug can ship in the same advisory. Closing the CVE list does not tell you whether the replication fix is in the build you installed. That is a second check, and it is in the Tenable extract of 79217, not in the roundup's lead.

## RHSA-2026:64793 is the number in the October 11 writeup, and the list is four

Elmorsi says Red Hat shipped a Critical-rated update for 389-ds-base covering four vulnerabilities, and that the combined severity includes a CVSS 9.8. He is explicit that 9.8 is the score of the most severe of the four, not a blended score he invented, and that the other three carry their own lower scores. He does not print those three scores. I am not going to fill them in.

The four he names:

CVE-2026-18355, a heap buffer overflow via an integer underflow in SASL wrapped-record length handling, in `sasl_io_start_packet()`, triggerable from crafted SASL traffic.

CVE-2026-18453, a pre-authentication NULL pointer dereference via paged results combined with the USE_ONE_BACKEND control in shared search. No valid credentials required, in his account.

CVE-2026-18922, privilege escalation to Directory Manager via a stale identity left in a Cyrus SASL auxiliary property during PLAIN authentication. Directory Manager is the directory's root-equivalent account. It is not the host's root account. Those are different privileges, even when a compromise of one is operationally ugly.

CVE-2026-76560, an anonymous LDAP client defeating SELFDN ACI bind-rule checks via an empty bind DN.

Those four also appear in Tenable's eight for 79217. The other four in the Tenable extract do not appear in Elmorsi's list: CVE-2026-11770, a pre-authentication LDAP filter injection in the CleanAllRUV status check; CVE-2026-11788, a NULL pointer dereference in the deref control plugin BER parser; CVE-2026-15722, a pre-authentication stack buffer overflow in `get_ruvelement_from_berval()` via unbounded replica ID parsing; and CVE-2026-19843, command injection via an unescaped LDAP DN in the Cockpit 389 Console LDAP editor.

I am not going to declare that 64793 contains only four and 79217 contains eight. I did not open either erratum. I am saying the October 11 writeup, which points you at 64793, names four, and the Tenable page, which titles itself 79217, names eight, including those four. A checklist copied from Elmorsi will not mention the Cockpit console flaw. A checklist copied from Tenable will. If your console package and your directory daemon update on different schedules, that missing name is the one that falls between them.

Elmorsi cites ALSA-2026:64784 for AlmaLinux, and he says the fixed version differs by major release and update stream. Do not assume one version string covers RHEL 8, 9, and 10. The LinuxCompatible roundup's AlmaLinux section, in the same week, is a different set of advisories: six Important notices on October 7 and 8, including a BIND update, ALSA-2026:75767, with three denial-of-service CVEs. BIND is not 389-ds-base. An AlmaLinux host that applied the BIND Important has not, by that act, applied ALSA-2026:64784. I am not going to file the nameserver patch under the directory server because both are "infrastructure."

## The restart line is his, and OpenLDAP is a different tree

Elmorsi prints a check sequence. `rpm -q 389-ds-base` to see what is installed. Compare that version to the advisory for your major release, not to a single number you saw in a headline. `dnf update 389-ds-base`, then `systemctl restart dirsrv@`. He says restarting that instance is enough to load the patched binaries for this update, and a full reboot is not required for this package alone. That is his FAQ answer. It is not a sentence I pulled from RHSA-2026:79217. A maintenance window that also includes the kernel errata from the same Red Hat round is a different reboot question. Esselbach's kernel notes are the ones that usually want the reboot. Do not let a directory-server FAQ cancel a kernel reboot you have not read.

He also says FreeIPA depends on 389-ds-base, so a normal `dnf update` pulls the corrected build as a dependency, and you do not need a separate manual step for the directory component. You do need the update to finish on every IPA server in the topology, not only the first one you logged into. A replica that is still on the old build is still the old build. Agreement between masters is not a substitute for the package version on each host.

OpenLDAP, in his FAQ, is unaffected. These CVEs are in the 389-ds-base codebase, used by Red Hat Directory Server and the 389 Directory Server upstream. OpenLDAP is a separate tree. If your inventory says "LDAP" and does not say which implementation, the FAQ cannot clear you. `rpm -q 389-ds-base` returning "package not installed" is a useful negative. It does not tell you whether slapd from another source is on the box.

His anonymous-bind check is a log grep, not a patch. He suggests looking for `BIND dn=""` in `/var/log/dirsrv/slapd-<instance>/access` before you patch, because CVE-2026-76560 is about anonymous clients defeating a SELFDN ACI. An empty bind DN is the signature he tells you to look for. The grep does not fix the flaw. It tells you whether that pattern was already in the log. He is also clear that the commands are standard package checks, not output from his own host. He says that host does not run 389-ds-base. I am not going to treat his command block as a captured session from a directory server I can name.

## What to record, if you are not going to reopen the portal tonight

If you can open the portal, open it, and stop using this piece as the list. If you cannot, the minimum record that does not collapse the two IDs is short.

Write the installed package and the module stream, not "directory server." `redhat-ds:11` on RHEL 8 E4S is the thing Esselbach and Tenable are naming under 79217. `389-ds-base` on a version string you compared to 64793 is the thing Elmorsi is naming. A host can be one of those, or neither, or, if someone layered packages, more than one. I am not going to tell you a layered host is common. I am telling you a single checkbox cannot see the difference.

Write the advisory ID you actually matched, and the CVE names on that ID's text. If the text you matched is Tenable's extract of 79217, the names include the Cockpit editor flaw and the CleanAllRUV filter injection. If the text you matched is Elmorsi's four, those two names are absent, and so are 11788 and 15722. Absence in a blog post is not absence in the erratum. It is a reason to get the erratum before you close the ticket.

Write whether you restarted `dirsrv@` or rebooted. Elmorsi's "restart is enough" applies, in his words, to this update specifically. It does not apply to the kernel advisories sitting in the same vendor round. The roundup's point was that the Critical was the exception and the kernels were the volume. Patch priority, in Esselbach's lead, starts with the directory server, then the kernel reboots, then the Important and Moderate fixes. That order is a reading order. It is not a claim that one window has to do all 48 errata. It is a claim that "we did the Important ones" can skip the only Critical in the round, if the Critical was a module ID nobody pasted into the change ticket.
