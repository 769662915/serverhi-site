---
title: "Patch the Management Console, Not Just the Switch"
description: "InfraTrust's September window logged 1,699 CVEs and 84 revised advisories. The management console that holds credentials is the config path."
pubDate: 2026-09-30
coverImage: "./cover.webp"
coverImageAlt: "An open equipment rack beside a separate laptop on a metal cart, cool white light, no vendor logos and no readable text."
category: server-config
tags: ["management console", "Eclypsium", "patch management", "SonicWall", "firmware"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "45 minutes"
prerequisites:
  - "An inventory of management interfaces, not only of the switches and firewalls they configure"
  - "Permission to restrict who can reach those interfaces, and to re-image an appliance if the vendor says clean-in-place is not enough"
  - "The September InfraTrust writeups below, plus the vendor advisory for any host you still expose"
osCompatibility:
  - "Any network whose firewalls, fabrics, or appliances are configured from a separate management console"
  - "Linux hosts that consume a vendor kernel advisory rather than a distro kernel you patch yourself"
---

The switch is not the config. The management console that pushes the switch's config is. [BleepingComputer on Sept. 23](https://www.bleepingcomputer.com/news/security/infratrust-report-warns-network-management-systems-under-attack) wrote up the September edition of Eclypsium's InfraTrust Pulse, and the sentence worth pinning to the change ticket is this one, from the report as they quote it: none of the products in that cluster is a firewall, a switch, a router, or a fabric. Each one is the console that configures them, holds their credentials, and provides a change-control path into all of them at once.

[Disaster Recovery Journal on Sept. 28](https://drj.com/industry_news/september-infratrust-pulse-1699-cves-show-why-infrastructure-patching-is-about-more-than-vulnerability-counts) uses the same window and the same counts, and argues the counts are the wrong sort key. I have not read the Eclypsium PDF. Both pieces are secondary. The numbers they share are specific enough to build a config check on, which is the job. We already walked one of the named bugs, the Cisco firewall management flaw, in [the KEV note on FMC, NetScaler, and Fortinet](/posts/cisa-kev-cisco-citrix-fortinet-patch-2026/). I am not walking that HTTP bypass again. The new fact is the class of machine, plus two tracking problems DRJ adds: advisories that change after you filed them, and one kernel bug that arrives as nineteen vendor tickets.

## The window, and why the count is a bad queue

Both outlets describe the same reporting period, Aug. 25 through Sept. 17. Vendors published 158 new security advisories covering 1,699 vulnerabilities, across 17 vendors in BleepingComputer's account. Forty-two advisories were critical. Eight carried a CVSS of 10.0. Seventy-one could be exploited remotely without authentication.

DRJ's point is the one I would put in the patch meeting before anyone sorts that spreadsheet by score. Some of those vulnerabilities were already being exploited. Others are dangerous mainly in combination. A 10.0 that is not reachable from your network is a different ticket from a 7.5 on the box that holds every switch credential. CVSS does not know which box that is. Your inventory does. If the inventory lists firewalls and does not list the management center, the inventory is a hardware list, not a config list.

I am not going to turn 1,699 into a burndown chart. You will not close 1,699 items because a newsletter said the month was heavy. You will close the ones that are reachable, that hold credentials, and that already have an exploit in the wild. That is DRJ's priority list, slightly reordered into a sentence an on-call can use: reachable, role, exploitation underway, what sits downstream if the box falls. A management console fails all four tests at once when it is on a routable interface. It is reachable. Its role is to configure everything else. Several of the flaws in this window were already exploited. Downstream is the entire fabric.

## The management console is a config store with a login page

BleepingComputer's cluster, beyond the Cisco firewall manager we already covered, is the list to add to inventory if it is not there. HPE Fabric Composer. EdgeConnect SD-WAN Orchestrator. NVIDIA Unified Fabric Manager. Dell SmartFabric Manager. SonicWall NSM On-Prem. Arista management interfaces. The report's line, quoted above, is that none of these is the forwarding device. They are the place the forwarding device's config and credentials live.

That changes the hardening you already know how to do on a switch. [Nginx hardening](/posts/nginx-security-hardening-guide-2026/) is about the process that answers on 443. A fabric composer is about the process that can log into every switch and push a change. Restricting SSH on the switch does not restrict the composer if the composer is how SSH gets configured. I have seen teams lock the leaf and leave the orchestrator on a flat management VLAN because "it's internal." Internal is not the same as unauthenticated-remote-safe. Seventy-one items in this window did not need a password. An internal scanner, a jumped workstation, or a VPN user is enough.

The SonicWall pair is the cleanest illustration of "the management UI is the bug," and it is a different product from NSM On-Prem, so do not collapse them. CVE-2026-83548 is a CVSS 10.0 unauthenticated server-side request forgery in the Appliance Work Place interface. CVE-2026-83549 is an OS command injection in the Appliance Management Console. InfraTrust, via BleepingComputer, says they chain to unauthenticated remote code execution. CISA put both in the Known Exploited Vulnerabilities catalog on Sept. 2. SonicWall has confirmed exploitation. The vendor's remediation, as reported, is not a config tweak you can feel good about. Upgrade to the latest hotfix. Investigate for compromise. Re-image physical appliances or redeploy virtual ones. Do not try to clean a compromised install in place.

I do not have the hotfix build number in either writeup. I am not going to invent one. "Latest hotfix" is the instruction, and it is only useful if you know which SMA 1000 units you still run and whether Work Place and the Management Console are reachable from anywhere except a jump host. If they are reachable from the user VPN, treat that as the finding, even before the version check. A patched console on a flat network is how the next unauthenticated bug becomes the same incident.

Cisco's CVE-2026-20079 is the same shape on a different vendor, and it is the one we already wrote. Maximum severity, authentication bypass on Secure Firewall Management Center, crafted HTTP to the web interface, commands as root. Cisco said on Sept. 9 that it was being exploited, and that its incident responders had known in August. CISA added it the same day as the confirmation. If your note from our earlier piece says "patched," the question this week is whether the management interface is still on a path an unauthenticated client can hit. A patch does not move a listener. Config does.

## One kernel defect, nineteen vendor clocks

BleepingComputer quotes the report on a tracking failure that will wreck a naive ticket system. One upstream defect created nineteen remediation tasks, each on a different vendor schedule, each with a different advisory number. The extract does not name that defect. I am not going to assume it is the CVE in the next paragraph.

DRJ names a specific fan-out. CVE-2026-31431, a Linux kernel privilege-escalation bug, has shown up in 19 advisories from six vendors. Dell accounts for 14 of them, across VxRail, PowerFlex, CyberSense, PowerProtect Data Manager, and Networking OS10. Nineteen and nineteen may be the same fact worded by two outlets. They may not be. BleepingComputer did not print 31431 in the text I have. DRJ did not use the phrase "nineteen remediation tasks." I will not merge them into one row in your tracker. I will tell you to search the tracker for 31431 and also to expect unnamed upstream bugs to arrive as a stack of vendor numbers that do not look related.

This is a server-config problem, not only a vulnerability-scanner problem. If you patch "the kernel" on Ubuntu by taking the distro advisory, you have one clock. If you also run VxRail, PowerFlex, and a Dell networking OS, you have Dell's clocks, and they are not yours. Closing the Ubuntu ticket and leaving the VxRail ticket because the CVE string did not match is how a single upstream bug survives in the cluster. The config check is dull. Export the advisory list. Group by CVE, not by vendor subject line. If 31431 appears fourteen times under Dell product names, it is one bug with fourteen change windows, and the windows are the work.

DRJ adds a second tracking failure that scanners treat as noise. During the same window, 84 existing advisories were revised without being newly published. Five of those revisions touched CVEs already in CISA's exploited-vulnerability catalog. An advisory you read on Sept. 1 and marked "accepted risk" may have been rewritten by Sept. 17. If your process snapshots the first version and never rereads, you are configuring the fleet against a document the vendor has replaced. I do not have the five CVE identifiers. The instruction that does not need them: any KEV item in your environment gets its advisory reopened when the vendor revises it, even if the scanner does not file a new ticket.

## Firmware settings are config, even when the package manager is quiet

The report also covers a UEFI Shell Secure Boot bypass that Eclypsium disclosed through CERT/CC. BleepingComputer's account: an attacker who can reach UEFI boot settings can launch an embedded UEFI Shell that is normally blocked during startup, then change Secure Boot settings in memory and run unsigned code before the operating system starts. Three CVE numbers came out of that disclosure. CVE-2026-20293 for Cisco. CVE-2026-33197 for AMI Aptio-based systems. CVE-2026-6485 for Insyde.

This will not show up as an apt upgrade on the Linux host you think you are administering, until the OEM maps it to a BIOS package. The config surface is the firmware setup, and who is allowed to enter it. A Secure Boot policy you set in the OS is not the policy if a shell that runs first can rewrite it in memory. I am not giving you a BIOS click-path. The vendors disagree, and these writeups do not include one. The check you can do this week without a vendor PDF: which of your hosts are Cisco, AMI Aptio, or Insyde, and is the firmware setup password the same string as the IPMI password you meant to rotate last year. Shared management passwords are how a boot-settings bug becomes a fleet bug.

Re-imaging, which SonicWall asked for on the SMA pair, is the same idea at the appliance layer. A management VM you "cleaned" by deleting a webshell is not a known state. A VM you redeployed from the vendor image, then reapplied your config from the repo, is a known state. If the config only lives in the appliance and not in a repo, the re-image is also the day you find out you cannot rebuild. That is a config-management finding. It is more useful than another CVSS sort.

## A pass you can finish this week

I am not writing a shell script for this, because the failing objects are not one operating system. The pass is an inventory correction.

Start with the consoles, not the switches. For each name in the BleepingComputer cluster that you actually run, write down the URL or the jump host, the accounts that can log in, and whether that URL answers from the user network. If it answers from the user network, that is the change. Put it behind the jump host before you argue about hotfix dates. [CIS-style hardening](/posts/automate-cis-benchmark-hardening-guide/) will not catch an orchestrator you never enrolled.

Then the fan-out. Search your tracker for CVE-2026-31431. If Dell products appear as separate advisories, keep them as separate change windows and one risk. Do not close the set because one of the fourteen is done. Search again for any advisory you closed between Aug. 25 and Sept. 17, and check whether the vendor revised it. DRJ says 84 were revised. You do not need to read 84. You need to reread the ones tied to a KEV entry. There were five such revisions in the window, and I cannot name them from these pieces. Your KEV-tagged tickets are the filter.

Then the appliances that say do not clean in place. SMA 1000 with either CVE-2026-83548 or CVE-2026-83549 is in that bucket if SonicWall's instruction, as BleepingComputer reports it, matches the SKU you run. Hotfix, investigate, re-image or redeploy. If you cannot redeploy because the config is only in the running box, export what you can before you wipe, and treat the missing repo as the follow-up ticket. A console you cannot rebuild is a console you will be tempted to "clean."

Firmware last, because it is the slow vendor. Cisco, AMI Aptio, Insyde, the three CVE numbers above. Identify the estate. Do not pretend an OS patch closed a boot-settings bug.

None of this requires believing that 1,699 is a meaningful queue. DRJ is right that the number is the least interesting line in the report. The interesting line is the one about the console. It holds the credentials. It is the change-control path. Patching the switch and leaving that path on a routable interface is not a partial fix. It is the old config, still running.
