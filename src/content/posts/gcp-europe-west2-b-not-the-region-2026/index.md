---
title: "The Zone Is europe-west2-b. The Note Said Region."
description: "The Oct. 20 London outage started at 06:08 UTC. The first status line named the region. The power quote named zone b only."
pubDate: 2026-10-21
coverImage: "./cover.webp"
coverImageAlt: "A closed laptop on a metal rack shelf beside a blank status printout and an unplugged power lead, cool room light, no logos."
category: troubleshooting
tags: ["Google Cloud", "europe-west2", "outage", "zone failure", "incident response"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "20 minutes"
prerequisites:
  - "The zone string from the resource, not the region you remember deploying"
  - "A way to tell an existing workload from a create call you are about to make"
  - "The status page, not a bank-app screenshot, as the clock you write into the ticket"
osCompatibility:
  - "Any project with resources in europe-west2, especially zone europe-west2-b"
  - "Workloads that only fail when they call a London-region API, even if the VM itself is elsewhere"
  - "This is not a kernel patch and not a Docker Desktop upgrade"
---

The first status sentence and the later power sentence do not name the same scope. [The Register's earlier October 20 piece](https://www.theregister.com/paas-and-iaas/2026/10/20/google-clouds-london-zones-takes-a-nap-multiple-services-disrupted/5304084) quotes Google Cloud's status page: "Multiple Google Cloud services are experiencing elevated errors and intermittent network failures in europe-west2 region." Region. [The later piece](https://www.theregister.com/paas-and-iaas/2026/10/20/google-cloud-says-a-power-event-caused-todays-outage/5304160) quotes a different update: "A power event caused an outage within europe-west2-b zone. The power event is mitigated. We are seeing the recovery of services and are prioritizing the recovery of existing workloads. Customers may not be able to yet create new workloads."

If your resource is in europe-west2-c, the first sentence includes you and the second may not. If you only read the headline, you will not notice. The headline on the early piece already says europe-west2-b. The status quote under it says the region. Both can be in one article. They are not one filter.

[Azure taught the same lesson with two incidents and two region lists](/posts/azure-two-incidents-gateway-regions-2026). Do not merge them because the vendor name matches. Do not merge these because both lines say London.

## Type europe-west2-b before you type the region

The Register's own prose, in both pieces, types the zone as europe-west-2-b. Hyphen before the 2. The status quote it prints uses europe-west2-b. No hyphen before the 2. Google's zone identifiers do not take that extra hyphen. If you paste the Register's prose string into a filter, you are searching for a zone that is not the zone in the quote.

I am not going to "correct" the article by silently rewriting it, and I am not going to paste the hyphenated form into a command. The string I would type, because it is the string inside the quotation marks, is europe-west2-b. The region string in the earlier quote is europe-west2. Three characters, the hyphen and the b, are the difference between "my zone" and "the whole London region." Cyber Kendra's timeline uses europe-west2-b for the power event and Europe-West2 for the region in its 14:40 BST status line. Same split, different capitalization. The identifier you match against the API is the lowercase form in the quote.

The early piece also says europe-west2-b is one of three local availability zones in the London region, meant to limit the blast of a hardware failure. A zone failure that shows up as a region-scoped status line is how a single-zone service and a regional service page different people. The Reddit line The Register quotes is the crude version: one zone takes a nap and your non-HA service is in it. That is a design comment from a user, not a Google RCA. It is still the right first question. Is the resource pinned to b, or does the product span the region?

## Clocks, in the order the pages actually printed them

Downtime began at 06:08 UTC. Both Register pieces say 0608 UTC. [Cyber Kendra](https://www.cyberkendra.com/2026/10/google-cloud-outage-revolut-hsbc-lloyds-down-in-the-uk.html) cites Cloudflare Radar recording a sharp rise in connection failures to europe-west2 from about 06:00 UTC. About 06:00 and 06:08 are not the same timestamp. Radar is a rise in failures toward the region. The Register's 06:08 is the start it gives for the zone playing up. Keep both. Do not average them to 06:04.

At that early stage Google had no workaround. The Register quotes "None for now now," including the doubled word, and says Google planned to update customers at around 09:30 UTC. No estimated recovery time in that first writeup. The headline says as much. If your ticket from 07:00 UTC says "Google promised recovery by 09:30," you upgraded an update time into a fix time. 09:30 was when they planned to speak, not when they planned to be done.

Cyber Kendra's noon note still had engineers investigating. At 12:12 BST it says Google identified the power event in europe-west2-b, said it had been mitigated, and expected partial recovery of infrastructure services within 30 minutes. 12:12 BST is 11:12 UTC. I am not using an 11:36 UTC figure that showed up in a search snippet of the same page. The extract says 12:12 BST.

At 12:58 BST, which is 11:58 UTC, Cyber Kendra says services were recovering, existing workloads were being prioritised over new ones, and the tentative full-recovery time was 14:00 BST. The Register's later piece times a status update at 11:58 UTC and says full recovery of workloads should be "completed, tentatively" by 13:00 UTC. 14:00 BST and 13:00 UTC are the same moment. The two articles are describing one estimate, not two. The word both of them force you to keep is tentatively.

Cyber Kendra's status line as of 14:40 BST, 13:40 UTC: the power event is mitigated, most workloads in the London region are recovering, the last posted estimate for full recovery of existing workloads was 14:00 BST, and customers may not yet be able to launch new workloads. Shortly before 14:00 BST, the same piece says most workloads in the region were recovering. "Most" is a population word. It is not your project.

[Reuters](https://www.reuters.com/world/europe/google-cloud-services-experience-outage-europe-2026-10-20) does not, in the text I have, carry the zone-b power quote or the 13:00 UTC estimate. It says Google's engineering team was investigating an issue that affected the London-based europe-west2 data centre, primarily designed for customers in the UK and Ireland, and that Google did not immediately answer a request for further detail. Reuters is the region-and-investigation snapshot. The Register's second piece is the power-and-zone snapshot. If you cite Reuters for the cause, you are ahead of what Reuters printed.

## Existing workloads and new ones failed on different verbs

The sentence to paste into the ticket is the one The Register quotes from the status page after the power event was called mitigated. Recovery of existing workloads is the priority. Customers may not yet be able to create new workloads. Cyber Kendra's 12:58 BST update and its 14:40 BST status repeat that split: existing first, new creates still not promised.

A VM that is already running and a `create` that is timing out are not one symptom. If your on-call chat says "GCP is down" because a pipeline could not launch a job, and the serving path is up, you may be in the second half of that sentence only. Do not restart the serving path to fix a create. Do not tell the business the zone is still dark because a new node failed to join after the power event was marked mitigated.

The early status list of affected products, confirmed in both Register pieces, is specific: BigQuery Data Transfer Service, Cloud Filestore, Cloud Run, App Engine, NetApp Volumes, Google Kubernetes Engine, and Managed Service for Apache Kafka. The Register prints "Data TransferService" as one glued word in the extract. I am reading that as the Data Transfer Service product, and I would not open a ticket titled TransferService. If your failing product is not on that list, the list does not explain you, even if your project is in London. GKE is on the list. A node pool create is a new workload. A pod that was already scheduled is an existing one. The status sentence separates those. Your runbook should too.

Dr Amro Al-Said Ahmad, a lecturer at Keele, told The Register he estimates 38 services were down. That is his estimate. It is not the seven-name list, and it is not a Google count. I am not going to page someone because a lecturer's total is larger than the products named in the article. I am going to check the product I run against the named list, then against the project, then against whether I am creating or serving.

Google, asked for more detail, pointed The Register back at the status page. Cyber Kendra says the company has not said whether the fault was grid supply, backup generators, or on-site electrical equipment, and that no post-incident report had been published yet. I am not going to invent which of those it was. "Power event" is the vendor noun. Mitigated is the vendor verb for the event, not for every create call. Those are different.

## Customer lists are not your blast radius

The Register's Down Detector list, in the early piece, names Lloyds Bank, HSBC, Royal Mail, Rightmove, DPD, BT, Cloudflare, Screwfix, and Revolut. The later piece asks how those same names melted and answers power. Reuters' Downdetector paragraph names Lloyds, HSBC, Bank of Scotland, Rightmove, DPD, NHS England, and Royal Mail, and separately reports that a person familiar with the matter tied a Revolut outage to the Google Cloud disruption. Cyber Kendra, shortly before 14:00 BST, says report numbers for Rightmove, Halifax, and NHS services had started to fall, and that Revolut's stayed elevated longer.

Bank of Scotland is on Reuters' tracker list and not on the Register's. Halifax is on Cyber Kendra's falling-reports line and not on the Register's morning list. BT, Cloudflare, and Screwfix are on the Register's list and not in the Reuters paragraph I have. NHS England is on Reuters and Cyber Kendra, not in the Register's morning nine. If you union them into "UK finance and the NHS were down," you have built a blast radius none of the pieces printed.

Lloyds, to Reuters, said its app was operating normally and that some customers were having trouble with certain online services. That is not "Lloyds is down," even though Lloyds is on every tracker list above. Revolut's own statement, in the early Register piece, is the one to keep if someone asks about money: a disruption affecting multiple services, and "all our customers' money and data are safe." A safe-money statement is not a statement that the API you call was up. It is a statement from Revolut about Revolut. Your bucket is not their ledger.

Downdetector, Reuters notes, aggregates user reports. Actual impact may vary. A spike on a tracker is a reason to check your probe. It is not a reason to fail over a zone you are not in.

## A 20-minute pass that does not invent a command

I am not pasting a `gcloud` one-liner. None of these pieces contain one, and the hyphenated zone string in The Register's prose is exactly the kind of thing a copied command would get wrong.

First, write the symptom as create or serve. A new Cloud Run revision, a new GKE node, a new Filestore instance, a Kafka topic that will not create: that is the "may not be able to yet create new workloads" sentence, still open at 14:40 BST in Cyber Kendra's status even after mitigation. An existing revision that started erroring at 06:08 UTC is the outage window, and it may already be in the "prioritising existing workloads" recovery. Do not use one probe to close the other.

Second, paste the zone from the resource. Match it to europe-west2-b, typed as in the status quote, not as in the article's unquoted prose. If you are in europe-west2-a or europe-west2-c, you are outside the power quote and inside the earlier region sentence. Check the product list before you decide the region sentence covers you. If you are not in europe-west2 at all, a London bank app being down does not put you in this incident. [A module that fails because the package and the server upgraded on different days](/posts/nginx-module-abi-mismatch-apt-2026) is a local mismatch. Do not reboot it because Cloudflare Radar moved.

Third, split the clocks in the ticket. 06:08 UTC start, from The Register. About 06:00 UTC on Radar, from Cyber Kendra, labeled as Radar. 09:30 UTC as a planned update, not a recovery. 12:12 BST as identification and mitigation of the power event, partial infrastructure recovery expected within 30 minutes. 11:58 UTC / 12:58 BST as the tentative 13:00 UTC / 14:00 BST full-recovery estimate for workloads, with existing ahead of new. 14:40 BST as "most" of the region recovering, new creates still not cleared. If your customer note says "resolved at 11:58 because they said mitigated," you resolved the power event and left the create path open.

Fourth, do not wait on a generator-versus-grid theory. It is not in the status quotes. Google pointed reporters at the status page. The post-incident report, as of Cyber Kendra's writing, was not published. Your follow-up is whether this project is single-zone in b, and whether create calls have a second zone. That is a design check you can do without the RCA. The RCA will not arrive faster because you rebuilt the cluster.

[NVIDIA's driver floor and a cloud power event](/posts/nvidia-sept-30-driver-floors-linux-2026) are not the same Tuesday. If a GPU node in europe-west2-b failed to reschedule after 06:08 UTC, the zone sentence is the one to test first. A driver version from September does not explain a London power quote. Check the zone. Then check whether you were creating or serving. Then check the clock you actually observed against the list above, instead of against a bank's app icon.
