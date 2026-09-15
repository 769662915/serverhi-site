---
title: "CISA's Friday Deadline Already Passed. Check FMC, NetScaler, and Fortinet Anyway"
description: "KEV added Cisco FMC CVE-2026-20079 (CVSS 10), Citrix NetScaler CVE-2026-19490, and Fortinet CVE-2025-25249. Federal due date was 12 September. PivotC2 does not care that you are not a .gov."
pubDate: 2026-09-15
coverImage: "./cover.webp"
coverImageAlt: "Network cabinet with a firewall appliance and a laptop showing a command prompt, cool aisle lighting, no logos or readable IPs."
category: troubleshooting
tags: ["CISA", "KEV", "Cisco FMC", "Citrix", "Fortinet"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "35 minutes"
prerequisites: ["Admin on Cisco FMC, Citrix NetScaler, or Fortinet boxes you actually own", "Change window if you have to reboot an appliance", "Outbound access to vendor advisories"]
osCompatibility: ["Cisco Secure Firewall Management Center", "Citrix NetScaler", "Fortinet firewalls/management listed in CVE-2025-25249"]
---

[Last week's F5 piece was about a rootkit that hashes will not catch](/posts/f5-big-ip-poisonedrefresh-rootkit-2026). This week is dumber and more urgent. CISA put three appliance bugs in KEV and told federal civilian agencies to patch by 12 September. Today is the 15th. If you run Cisco FMC, Citrix NetScaler, or a Fortinet box and you treated that date as someone else's problem, you are late on a bug with a score of ten.

[The Hacker News summarized the add](https://thehackernews.com/2026/09/cisa-flags-exploited-cisco-citrix.html). [Security Affairs printed the identifiers](https://securityaffairs.com/198850/security/u-s-cisa-adds-cisco-google-chromium-v8-fortinet-and-citrix-netscaler-flaws-to-its-known-exploited-vulnerabilities-catalog.html). You need the identifiers, not the vibes.

## The three tickets

CVE-2026-20079 is Cisco Secure Firewall Management Center. Authentication bypass on the web interface. CVSS 10.0. Unauthenticated attacker sends crafted HTTP, runs scripts, can get root on the operating system under the GUI. Security Affairs' wording is "alternate path or channel." Cisco updated the advisory to say it saw exploitation in August. It did not add a novel. Management plane, internet-facing, root. If that box is how you push ACLs, it is not a side system.

This is not FMC's first KEV of 2026. Treat that as a pattern, not trivia. The management plane keeps showing up because it is a single pane that talks to every firewall you own.

CVE-2026-19490 is Citrix NetScaler, another authentication bypass using an alternate path or channel. The Hacker News, working from Previdian honeypots, logged 56 exploitation attempts since 3 September, 36 of them on the 8th. That is not a research scanner taking a polite look. That is a weekday spike. If your NetScaler still answers on an old management IP, assume the same traffic can find you.

CVE-2025-25249 is Fortinet, heap-based buffer overflow, multiple products. SOCRadar described a campaign dropping a Node.js remote-access trojan called PivotC2. The Hacker News numbers: on the order of 3,000 IP addresses targeted, 178 devices infected, mostly in the United States. Assessed as a Russian-speaking, money-driven actor. Earliest exploitation evidence in July 2026. CISA added it in September. The gap between July and a KEV listing is why "we'll wait for the catalog" is a bad patch policy.

Chromium V8 CVE-2026-87491 went into KEV in the same wave. If your jump box is Chrome, that is a different ticket. Do not let it steal the hour you owe the firewall controllers.

## Microsoft's 974 is not this article, except when it is

[The Register](https://www.theregister.com/security/2026/09/09/microsoft-breaks-patch-tuesday-record-with-974-cve-deluge/5295160) and [SecurityWeek](https://www.securityweek.com/microsoft-patches-record-974-vulnerabilities-including-two-exploited-zero-days/) counted 974 Microsoft CVEs on 8–9 September, including two exploited elevation bugs: CVE-2026-85880 in ALPC, CVE-2026-81963 in the Windows Update stack. CISA's federal date for those is 22 September. Adobe's Magento hole was 11 September. Servicing stack updates landed for Server 2012, 2012 R2, and 2016.

If you still have 2012 in the rack, that SSU is your problem. If you do not, do not hide in the 974-CVE headline. The appliance CVEs are the ones with a Friday that already happened.

## What to run, in order

Inventory first. Names, versions, whether the management interface is on a public address. You cannot patch a box you think is "behind the VPN" if the VPN is the box.

Cisco FMC. Pull Cisco's advisory for CVE-2026-20079 and match your exact train. Upgrade. Then confirm the GUI build string, not the calendar you remember. If FMC was reachable from the internet in August, you are in incident process, not patch process. Look at admin logs for unauthenticated hits. Do not factory-reset as a personality. Do export config, rebuild from known-good if the logs are a mess. Management-plane root is [HAProxy-Ted territory](/posts/haproxy-ted-backdoor-verify-builds-2026): the control plane is the prize.

NetScaler. Advisory for CVE-2026-19490. Build number, not marketing name. Take a screenshot of the firmware page before and after. If the box terminates ICA or is a gateway, schedule the reboot like you mean it. Honeypot volume on 8 September is your argument to the change board.

Fortinet. CVE-2025-25249 hits more than one product. Read the PSIRT, not a tweet. After the upgrade, hunt for PivotC2. Node.js RAT on a firewall is a strange sentence until it is your sentence. Unexpected node processes, odd outbound callbacks, new admin users. SOCRadar's 178 infections are not a rounding error you ignore because you are not in the 3,000.

KEV does not bind a private company. The people scanning NetScaler also do not bind themselves to .gov. BOD 22-01 is a federal clock. Your clock is "exploitation started in July and August."

## If you patched Friday

Good. Prove it. Write the version, the time, the person. Then check the management ACL. A patched FMC that still listens on 0.0.0.0 is a patched target. Put the GUI on a jump network. Turn off HTTP if HTTPS is an option, and do not congratulate yourself for that being the whole plan.

If you did not patch Friday, do not write a postmortem before the upgrade. Upgrade. Then write down why a CVSS 10 on the firewall brain waited for a blog post on Monday.

I do not have Cisco's private exploit notes. They said August and stopped. Citrix has the honeypot counts. Fortinet has a named RAT. That is more than most Tuesdays. It is enough to justify the reboot.

## A boring verification hour

Write a one-page ticket before you touch firmware. Hostname, current version, management IP, whether that IP is in a public scan, last backup time, who can log in if the GUI dies. If you cannot fill the page, you are not ready to patch, you are ready to lock yourself out.

FMC. After the upgrade, export a policy and diff it against yesterday's export. Root on the management OS is a chance to leave a quieter admin behind. New users, new API tokens, SSH keys you did not cut. If the box was on the internet in August, treat "we patched" as incomplete until that diff is empty of surprises.

NetScaler. The 36 hits on 8 September are why you do not wait for a quiet Friday. Take the gateway down in a change window and bring it up on the advisory build. Then from a laptop that is not on the box, hit the old management paths you used to leave open "just for the vendor." They should 404 or refuse. If they still answer, you applied a firmware file and kept the hole.

Fortinet. PivotC2 is Node. That is an odd resident on an appliance. If your vendor image should not ship a node runtime in that path, and you find one, you are past KEV and into IR. Snapshot logs off-box first. SOCRadar's 178 are a floor on someone else's visibility, not a ceiling on yours.

Windows-only shops still have homework. The 974-CVE Patch Tuesday is a different queue: ALPC and Update Stack as exploited EoP, SSU on the 2012 museum pieces, Adobe if you still run Magento like it is 2018. Do not merge that queue with the firewall brain. Two lists. Two owners. One week.

CISA's Friday was a federal date. Your date is the first morning you can prove the build string and the ACL. If that morning was last week, write it down. If it is this afternoon, stop reading and go.

Do not crowd-source the version string from Slack. Open the advisory, match the train, write the build you are on and the build you need. If your FMC is in a HA pair, patch the standby first and fail over on purpose, not by accident at 2 a.m. If your NetScaler is in a pair, same rule. If you have one Fortinet and no pair, you already know the risk; take the window anyway.

Aftercare is logs off-box. Management-plane exploits live in the GUI history you are about to overwrite. Copy them. If you have a SIEM, this is the week it earns the invoice. Search for the CVE strings, for new admin names, for node processes that do not belong, for HTTP 201s on paths that should be CSS. We already had that last trick on F5. Appliances rhyme.

Then close the ticket with three links: the advisory, the KEV entry, the change record. Future you will not remember that Friday was 12 September. Future you will remember whether the build string changed.

If you outsource the firewall to a partner, send them the three CVEs today and ask for the build strings in writing. "We are on the latest" is not a string. If they cannot produce one by close of business, you do not have a partner, you have a reseller with a logo. Pull the serials yourself. The KEV catalog is public. So is the embarrassment of explaining PivotC2 to a board because nobody wanted to reboot a pair.

That is the whole job: inventory, advisory, window, verify, logs, write it down. Everything else is a headline about 974 patches that does not touch the appliance in the closet.

Keep the three CVE numbers on a sticky note until the strings match. CVE-2026-20079, CVE-2026-19490, CVE-2025-25249. If a vendor ticket uses a different ID, you are in the wrong advisory. Fix that before you reboot.
