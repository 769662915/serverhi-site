---
title: "Microsoft's July 2026 Patch Tuesday: 570 Flaws, 3 Zero-Days, and Why Your Patching Window Just Shrunk"
description: "Microsoft dropped a record-breaking 570 security fixes this Patch Tuesday, including two actively exploited zero-days. But the real story is why patch volumes are exploding — and what AI-powered exploit generation means for server admins."
pubDate: 2026-07-16
coverImage: "./cover.webp"
coverImageAlt: "A terminal-style illustration showing a shield icon cracking under a flood of red vulnerability alerts, with a green progress bar indicating patching in progress. Dark background with terminal-green accents."
category: "security"
tags: ["Patch Tuesday", "Microsoft", "Vulnerability Management", "Server Security", "Zero-Day", "Patching", "2026"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: "intermediate"
---

Microsoft's July 2026 Patch Tuesday landed with a number that made every sysadmin do a double-take: 570 security flaws fixed in a single update cycle. The previous record, set earlier this year, was around 150. This is not an incremental increase. It is a step change in the vulnerability landscape, and the underlying cause — AI-powered discovery tools finding bugs at machine speed — means it will not be the last record-breaking month we see. This batch includes 59 Critical vulnerabilities — 48 of them remote code execution — and three zero-days, two of which were already being exploited in the wild before patches shipped ([BleepingComputer, July 14](https://www.bleepingcomputer.com/news/microsoft/microsoft-july-2026-patch-tuesday-fixes-massive-570-flaws-3-zero-days/)).

If you manage Windows Server in a hybrid environment, this is not a "test for a week and deploy" situation. Here is what you need to know and how to prioritize.

## The Three Zero-Days You Cannot Ignore

Two of the three zero-days were actively exploited. One was publicly disclosed but not yet weaponized at patch time. Here is the breakdown:

**CVE-2026-50359 — SharePoint Server Elevation of Privilege (Actively Exploited).** An attacker can escalate privileges over the network by exploiting a missing authentication check in SharePoint. The Cybersecurity and Infrastructure Security Agency (CISA) added this to its Known Exploited Vulnerabilities list on July 1, two weeks before the patch shipped — meaning federal agencies were already required to address it before Microsoft had a fix. Microsoft's mitigation guidance: enable the Antimalware Scan Interface (AMSI) on the SharePoint server and set Request Body Scan mode to Full. If you cannot patch immediately, implement this workaround today ([BleepingComputer, July 14](https://www.bleepingcomputer.com/news/microsoft/microsoft-july-2026-patch-tuesday-fixes-massive-570-flaws-3-zero-days/)).

**RoguePlanet — Windows Defender Elevation of Privilege.** This flaw allows an attacker to gain SYSTEM-level privileges through Windows Defender. The fix is included in this month's cumulative update. Do not defer it.

The mechanism is particularly dangerous because it exploits the very tool meant to protect the system. An attacker who already has a foothold on a server — through a phishing compromise or a compromised service account — can leverage this vulnerability to escalate from a limited user context to full SYSTEM access. Once at SYSTEM level, the attacker owns the machine. Patching this within 48 hours should be your minimum target.

**CVE-2026-54995 — Windows RMCAST Remote Code Execution (Critical).** The Reliable Multicast Transport Driver has a critical RCE vulnerability. If your servers have RMCAST enabled — it is on by default in many configurations — this is your highest-priority fix after the exploited zero-days. Check your environment:

```powershell
Get-WindowsOptionalFeature -Online | Where-Object FeatureName -like "*RMCAST*"
```

If the feature is present and enabled on any server with network exposure, patch it immediately. The attack vector is network-based, meaning an unauthenticated remote attacker can trigger code execution without user interaction. In CVSS terms, that is about as bad as it gets.

Beyond the three zero-days, two other vulnerabilities in this batch deserve attention. CVE-2026-55010 affects Minecraft Bedrock Dedicated Server with a Critical RCE. CVE-2026-58647 is a Power BI Report Server spoofing vulnerability that could let attackers manipulate reports viewed by decision-makers. Neither is actively exploited yet, but both affect server components widely deployed in enterprise environments.

## The Number That Changes Everything: 570

Fifty-nine Critical vulnerabilities is not a typo. For context, a typical Patch Tuesday averages 70 to 90 total fixes, with 10 to 15 Critical. This month is roughly 4× the norm.

The spike is not random. Chris Goettl at Ivanti noted that other major vendors are seeing the same trend. Adobe announced it is moving to twice-monthly security bulletins. Google shipped over 900 security fixes in June 2026 alone. Cisco, Mozilla, and Oracle are all accelerating their patch cadences ([Krebs on Security, July 14](https://krebsonsecurity.com/2026/07/microsoft-patches-a-record-570-security-flaws/)).

The common thread is AI-powered vulnerability discovery. Automated fuzzing tools backed by large language models are finding bugs faster than human researchers ever could. More bugs found means more patches shipped. The pipeline is scaling up, and July 2026 is the month that scaling became impossible to miss.

Here is another way to think about the acceleration: in 2020, a busy Patch Tuesday meant 120 fixes. In 2023, the record was 150. This month, we hit 570. The growth is not linear — it is compounding, and the slope of that curve suggests next year's record could easily break 1,000. Organizations that plan their patching capacity around last year's numbers are already behind.

## AI Is Also Shortening the Exploit Window

The other half of this story is even more important for server admins. It is not just that more bugs are being found — the time between disclosure and weaponization is collapsing.

Satnam Narang, senior staff research engineer at Tenable, flagged something unsettling: Anthropic's Mythos model was able to produce proof-of-concept exploits for 13 of 14 vulnerabilities that Microsoft had rated "Exploitation Less Likely" or "Exploitation Unlikely" ([Krebs on Security, July 14](https://krebsonsecurity.com/2026/07/microsoft-patches-a-record-570-security-flaws/)). These ratings are based on human attacker capability. AI changes the math.

The SharePoint zero-day is a case in point. Microsoft rated it "less likely" to be exploited — and CISA added it to the Known Exploited Vulnerabilities list the same month. The exploitability index, as Narang put it, was "centered around humans, not AI tools." That framework no longer holds.

For Linux server admins managing Windows hosts in a mixed environment, the implication is clear: your patching SLA needs to shrink. A "test for two weeks, deploy in week three" cycle might have been defensible when exploit development took skilled humans days or weeks. When an AI can generate a working exploit in minutes from a patch diff, that window is a liability.

## What to Patch First

With 570 fixes, you need a triage strategy. Here is a practical order of operations:

1. **Zero-days first.** CVE-2026-50359 (SharePoint) and RoguePlanet (Defender) are being actively exploited. These go to the top of the list for any exposed server.
2. **Critical RCEs on internet-facing services.** CVE-2026-54995 (RMCAST) and any other Critical-rated RCE with a network attack vector should be your second priority. If the service is reachable from the internet, patch it within 24 hours.
3. **Critical RCEs on internal services.** Still urgent, but if network segmentation is in place, you have slightly more time. Do not wait more than 72 hours.
4. **Everything else.** Prioritize by CVSS score and exposure. If a server has no public-facing services and strong network isolation, standard change control applies.

If you are running Windows Server Core installations — which many Linux admins do in homelab and small business environments — you are already better protected than full GUI installs. Fewer components means fewer attack surfaces. But the zero-days in this batch affect core Windows components, not optional features, so Core is not a free pass.

## The Bigger Picture

The 570-flaw Patch Tuesday is not a one-off. It is a leading indicator of a new normal where AI-driven discovery tools flood vendors with vulnerability reports, and AI-driven exploit generation shrinks the time defenders have to respond. The patching treadmill is speeding up, and the organizations that adapt their processes — shorter test cycles, automated deployment pipelines, immutable infrastructure where possible — are the ones that stay ahead.

### How to Automate Patch Deployment

If you are still logging into each server individually to run Windows Update, this month should be the one where you stop doing that. Here are three approaches that scale:

**Option 1: PowerShell with PSWindowsUpdate.** Install the module on each server and run a scheduled task:

```powershell
Install-Module PSWindowsUpdate -Force
Get-WUInstall -AcceptAll -AutoReboot -Category "Security Updates"
```

Wrap this in a script that targets your server inventory, runs pre-patch snapshots, applies updates, and verifies services come back online. A basic version takes 30 minutes to set up and saves hours every month.

**Option 2: Ansible for Windows.** If you already use Ansible for Linux configuration management, the `ansible.windows.win_updates` module handles Windows update orchestration. Define a playbook that rolls updates across your Windows Server fleet with batching and health checks between groups:

```yaml
- name: Apply security updates
  ansible.windows.win_updates:
    category_names:
      - SecurityUpdates
      - CriticalUpdates
    reboot: true
    reboot_timeout: 600
```

**Option 3: Windows Server Update Services (WSUS).** For larger environments, WSUS gives you approval control and deployment rings. Sync the July updates, approve them for a test ring of non-critical servers first, verify stability, then push to production. The extra step adds maybe 48 hours to your timeline — which used to be fine, but with AI-generated exploits circulating within hours of patch release, consider shrinking that window.

### The Supply Chain Angle Nobody Is Talking About

The Minecraft Bedrock Dedicated Server received a Critical RCE fix (CVE-2026-55010) in this batch. A game server sounds low stakes until you realize how many organizations run Minecraft servers for internal team building, education programs, or community engagement on infrastructure that has access to internal networks. A game server RCE is a pivot point into your environment. Treat it as seriously as any other Critical on your network.

The broader point: 570 vulnerabilities is too many to triage manually. If your organization does not have an automated asset inventory that maps every server to its installed Microsoft products and their patch status, you are flying blind on a month like this. The $0 solution is PowerShell + Windows Update API. The paid solutions — Qualys, Tenable, Rapid7 — earn their subscription cost in a month with 59 Criticals.

### The Linux Admin Perspective

Most readers of this site manage Linux as their primary environment, with Windows servers in the mix for Active Directory, Exchange, or legacy applications. The temptation is to treat Windows patching as a lower priority because "the important stuff runs on Linux." That logic breaks when a compromised Windows Server with domain admin credentials gives an attacker lateral movement into your Linux infrastructure.

Patch your Windows boxes with the same rigor you apply to `apt update && apt upgrade` on your Linux fleet. The only difference is the tooling. The urgency is the same. When a single Patch Tuesday drops 570 fixes including actively exploited zero-days, the distinction between "Windows patching" and "security maintenance" disappears. They are the same thing, and they both need to happen before the weekend.

If your current patch management strategy involves waiting for the monthly cumulative update and testing for a week first, July 2026 is a good time to revisit that.

---

**Sources:**
- [BleepingComputer: Microsoft July 2026 Patch Tuesday fixes 570 flaws, 3 zero-days](https://www.bleepingcomputer.com/news/microsoft/microsoft-july-2026-patch-tuesday-fixes-massive-570-flaws-3-zero-days/) (July 14, 2026)
- [Krebs on Security: Microsoft Patches a Record 570 Security Flaws](https://krebsonsecurity.com/2026/07/microsoft-patches-a-record-570-security-flaws/) (July 14, 2026)
