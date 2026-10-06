---
title: "Two Azure Incidents. Don't Merge the Region Lists."
description: "Azure's Sept. 29 Sweden Central AI outage ran about 5 hours 55 minutes. ExpressRoute issues started 20:30 UTC Sept. 30. Region counts: 18, or 19."
pubDate: 2026-10-07
coverImage: "./cover.webp"
coverImageAlt: "Two blank paper printouts, one short and one long, beside unplugged ethernet cables and a closed laptop on a beige desk."
category: troubleshooting
tags: ["Azure", "ExpressRoute", "VPN Gateway", "outage", "hybrid cloud"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "25 minutes"
prerequisites:
  - "A way to tell whether the failing path is Azure OpenAI or Foundry in Sweden Central, or a gateway service such as ExpressRoute or VPN Gateway"
  - "The region name your resource actually sits in, not the region you meant to deploy"
  - "Access to the Azure status history for Sept. 29 through Oct. 1, 2026, plus whatever your own probes logged in that window"
osCompatibility:
  - "Any host that reaches Azure over ExpressRoute, VPN Gateway, or Application Gateway"
  - "Azure VMware Solution in the regions named below, with the four-region exception called out"
  - "This is not a Linux kernel patch. Do not mix it up with last week's Debian advisory"
---

The status sentence and the resource you are holding are not automatically the same incident. [The Register's Oct. 1 report](https://www.theregister.com/off-prem/2026/10/01/azure-maintenance-mess-disrupted-hybrid-clouds-vpns-cloudy-vmware-services/5300333) says Microsoft told users of ExpressRoute Gateway, VPN Gateway, and Azure VMware Service that they might see degraded or interrupted network connectivity, and that some network management operations would be hard to perform. The event it times starts at 20:30 UTC on 30 September 2026. [shattered.io on Oct. 2](https://shattered.io/azure-outage-2-incidents-18-regions-2026) puts a second, earlier incident beside that one: Azure OpenAI Service, Foundry Agent Service, Foundry Models, and Cognitive Services, in Sweden Central only, starting 10:00 UTC on Sept. 29, for about 5 hours 55 minutes. If your alert fired in Stockholm on the 29th and your alert fired on a VPN tunnel on the 30th, you have two tickets. Merging them into "Azure was down" will send the wrong person to the wrong blade.

The headline number is already a trap. shattered.io's title frames two incidents and 18 regions inside about 40 hours. That 40-hour span is the distance from the start of the first incident to the end of the second, not 40 hours of one outage. The Sweden Central window is under six hours. The gateway window, in that same piece, runs from 20:30 UTC on Sept. 30 to 02:15 UTC on Oct. 1, about 5 hours 45 minutes, with some third-party trackers logging full mitigation closer to 6 hours 17 minutes. Add the gap between them and you can get a "40 hours" headline. You cannot get a single root cause out of the addition.

[BigGo's Oct. 1 account](https://finance.biggo.com/news/d9307983-5b75-4692-bb05-adbebd020274) is about the gateway incident, and it counts 19 regions, not 18. The extra name is Australia East. I am not going to average 18 and 19 into 18.5. The troubleshooting move is to write down which list you are using, then check your region against that list, then check a second list before you tell a customer their region was clean.

## Split the tickets before you split the hair

Sweden Central, per shattered.io, is an AI-service incident. The services named are Azure OpenAI, Foundry Agent Service, Foundry Models, and Cognitive Services. One region. Start 10:00 UTC on Sept. 29. Duration about 5 hours 55 minutes. If your symptom was a model call, an agent run in Foundry, or a cognitive API in that region, this is the row. If your symptom was a site-to-site tunnel in UK South, this row does not explain it, even if both rows say Microsoft.

The gateway incident is the wide one. shattered.io preserves Microsoft's wording: starting at 20:30 UTC on 30 September 2026, customers using gateway services may be experiencing degraded or interrupted network connectivity. The services it attaches to that sentence are ExpressRoute Gateway, VPN Gateway, Azure Firewall, Application Gateway, Web Application Firewall, and Azure VMware Solution. The Register's first version of the story names ExpressRoute Gateway, VPN Gateway, and Azure VMware Service, then updates at 03:30 UTC on Oct. 1 to add Azure Firewall, Application Gateway, and Web Application Firewall as impacted, and to say Microsoft had mitigated the incident. Read the update time. A story filed while the event was open and a story updated after mitigation are both useful, and they are not the same snapshot.

BigGo times the same start two other ways, which helps if your on-call chat is not in UTC. 20:30 UTC on Sept. 30 is 5:30 a.m. Japan time on Oct. 1, and 4:30 p.m. EDT on Sept. 30. If someone says "the Oct. 1 Japan morning outage" and someone else says "the Sept. 30 evening outage," they may be pointing at one start. Confirm before you open a third incident.

I am not going to repeat a "four hours later" bridge I cannot make fit the timestamps. Sweden Central's roughly 5 hour 55 minute window from 10:00 UTC on Sept. 29 ends in the afternoon of the 29th, UTC. The gateway start is 20:30 UTC on the 30th. That is the next day, not the next coffee. shattered.io's table is the source I will use for the clocks. If another paragraph in the same piece compresses the gap, the table wins.

## Eighteen Azure names, then a nineteenth

The Register, at the time of writing, lists 18 regions: West US, West US 3, North Europe, West Europe, France Central, UK West, UK South, Switzerland North, Southeast Asia, East Asia, Japan West, Korea Central, South Africa North, UAE North, Mexico Central, Germany North, South India, and Jio India Central. shattered.io prints the same 18 for the gateway incident. BigGo prints those and adds Australia East, and calls the total 19.

If your resource is in Australia East, you are in the disagreement. Do not close the ticket because two writeups omitted you, and do not page the continent because one writeup included you. Pull the status history for that region and your own probe. The published lists are secondary. They are still better than a Slack message that said "global."

The Register is explicit that the list is what it had at the time of writing, and that Azure VMware Service was not impacted in the last four of those 18: South Africa North, UAE North, Mexico Central, and Germany North. BigGo says the same four were not impacted for Azure VMware Service, even while counting 19 regions for the connectivity incident overall. So a region can be on the gateway list and off the AVS list. If you run AVS in Germany North, the gateway writeup is not your blast radius by default. If you run ExpressRoute in Germany North, it may be. Service name first, region second. Reversing that order is how people reboot the wrong appliance.

West US and West US 3 are both on the 18. West US 2 is not, in the lists I am using. "West US" in a chat is not a region string. Make someone paste the resource's location field. Japan West is on the list. Japan East is not, in these three pieces. East Asia and Southeast Asia are both on it. UK West and UK South are both on it. If you have a pair for redundancy and both names appear, your redundancy did not save you from this particular list. That is the design lesson, and it does not require a new architecture diagram tonight.

## Data plane, management plane, redundancy

BigGo is the piece that separates Azure Firewall's data plane from its control plane in plain language. No impact on data-plane traffic had been confirmed at that time. Management operations, resource creation, updates, and rule changes, might fail or delay. If your firewall was still passing packets and you could not push a rule, you were in the failure mode that sentence describes. Do not "fix" a passing data plane by failing over a tunnel that was not the broken layer. Do not tell the business the firewall was down because the portal button spun.

VPN Gateway gets a similar split in more than one outlet. The Register says some affected VPN Gateways saw reduced redundancy rather than a complete loss of connectivity. BigGo says the same thing in its own wording: connections not completely lost, reduced redundancy rather than a full outage. A tunnel that is up on one path and down on the other will look healthy in a ping and unhealthy in a graph that expects two. Check the redundancy counter instead of trusting the session state alone. If you only pinged through and called it green, you may have been on the surviving leg for the whole window.

ExpressRoute is the service the updates keep returning to. The Register, as of 23:13 UTC, quotes Microsoft seeing continued recovery across impacted ExpressRoute gateways and monitoring that the recovery stayed durable. BigGo, at 7:35 a.m. Japan time, says ExpressRoute gateways were showing significant recovery, and that the infrastructure maintenance tied to the outage had been halted. "Significant recovery" is not "your circuit is up." It is a vendor sentence about a population of gateways. Your circuit still needs your probe.

The sentence I would paste into the ticket is the one both The Register and shattered.io carry, from Microsoft: some supporting network management components have not recovered automatically and are contributing to management operation failures in a subset of affected regions. Engineering was restoring those components using alternate healthy instances where available. Connectivity coming back and the portal still failing is not a contradiction. It is the update. If you declared the incident over at the first green probe, you may still have been unable to change a route. Leave the management-plane check open until a write succeeds, not until a ping succeeds.

BigGo's 10:36 a.m. Japan time update says most affected regions were showing recovery, and that configuration changes which had worked elsewhere were being applied to five remaining regions: France Central, North Europe, Southeast Asia, UK South, and UK West. If you were in one of those five, "most regions are recovering" was a true sentence that did not include you yet. Time-box your customer note to your region. A global all-clear copied from a headline will be wrong for the tail.

## What Microsoft said caused it, and what it did not say

The Register's subheading is blunt: Microsoft broke its own cloud but is not sure how. The body is more careful, and the careful version is the one to keep. Microsoft's status page, the piece says, had paused the infrastructure servicing activity associated with the onset of the event. The investigation, at that writing, continued to show a correlation between the event and infrastructure operating system servicing activity. Correlation is the word. The Register also says Microsoft did not know what happened, or why, at that point. BigGo likewise says the company identified a correlation with its own infrastructure OS maintenance, halted those operations, and that the root cause remained under investigation in the update it was summarizing.

I am not going to promote correlation into a kernel bug, a bad package name, or a change ticket you can grep. None of these three pieces print a KB, a build number, or a tracking ID I am willing to repeat. If your process requires a vendor RCA before you close, you do not have it from the Oct. 1 and Oct. 2 reporting. You have a paused servicing activity, a correlation, a mitigation claim at 03:30 UTC on Oct. 1 in The Register's update, and a tail of management components that did not recover on their own.

That is enough to stop a local "fix" that makes things worse. Do not upgrade a gateway firmware on the theory that you are behind. Do not rebuild an ExpressRoute circuit because a blog said maintenance. The maintenance in question was Microsoft's infrastructure OS servicing, and they paused it. Your job is to identify which of your dependencies sat in the named services, in a named region, during a named window, and whether the thing that failed was the path or the ability to change the path.

[A management console that stays broken after the box looks up](/posts/infratrust-management-console-config-2026) is a pattern this site has already had to say out loud. This Azure window is the cloud version. The packet path and the API that edits the packet path failed on different clocks. Write both clocks into the ticket or you will "resolve" the wrong one.

## A 25-minute pass that does not invent commands

I am not pasting an `az` one-liner I did not take from Microsoft's writeup, because these sources do not contain one. The pass is a worksheet.

First, name the symptom in one line. Model or agent errors in Sweden Central on Sept. 29 belong on the AI ticket. Tunnel, firewall management, Application Gateway, or AVS trouble from 20:30 UTC Sept. 30 belong on the gateway ticket. If you have both, you have both. Do not let the louder one delete the quieter one.

Second, paste the region string from the resource, not from memory. Compare it to the Register's 18 and to BigGo's 19. If you are Australia East, you are in the conflict, and your probe is the tie-break. If you are AVS in South Africa North, UAE North, Mexico Central, or Germany North, the Register and BigGo both say that service was not in the impact set, even though the region appears on the gateway list. Confirm against your VM nodes anyway if users said they were down. A press list is not a heartbeat.

Third, split data plane from management plane for Firewall and for VPN. Passing traffic with a failed rule update is the BigGo firewall sentence. Up, but less redundant, is the VPN sentence in The Register and in BigGo. A single ping is the wrong tool for the second one. Look at whatever counter you already use for the second tunnel. If you do not have that counter, the follow-up work is to add it, not to argue about this outage forever.

Fourth, do not close on the mitigation headline. The Register's 03:30 UTC Oct. 1 update says mitigated, and also widens the product list. shattered.io notes that management components in a subset of regions did not come back by themselves. BigGo's five-region tail is France Central, North Europe, Southeast Asia, UK South, and UK West, as of 10:36 a.m. Japan time. If your region is in that tail, your all-clear is later than the headline. Record the time a management write succeeded.

Fifth, keep this out of the kernel queue. [Debian's 1,313 CVE batch](/posts/debian-1313-cve-kernel-batch-2026) is a different week and a different machine. [A deadline that already passed on a node](/posts/cisa-kernel-kev-deadline-passed-2026) is also not this. Patching a Linux host will not repair an ExpressRoute gateway Microsoft paused servicing on. It might still be the right patch for a different ticket. It is the wrong patch for this one.

The useful artifact is a short note with two start times, two service lists, your region, whether you were data-plane-down or management-plane-down, and the time a change actually applied. Eighteen or nineteen can stay in a footnote with the outlet names attached. The footnote is how you avoid sounding more certain than The Register was willing to sound on the night Microsoft paused its own servicing and said the investigation was still correlating.
