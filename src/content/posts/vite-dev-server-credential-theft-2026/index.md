---
title: "Exposed Vite Dev Servers Are Being Mined for AWS Keys"
description: "F5 tracked a month of scans against internet-facing Vite. CVE-2026-39364 bypasses file reads. Patch, close 5173, and rotate anything that lived in .env."
pubDate: 2026-09-21
coverImage: "./cover.webp"
coverImageAlt: "Laptop on a server-room cart showing a terminal window with no readable text, cool white lighting, no vendor logos."
category: security
tags: ["Vite", "CVE-2026-39364", "AWS", "Azure", "credentials"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "25 minutes"
prerequisites:
  - "Ability to upgrade the Vite version in each exposed project"
  - "Firewall or security-group access to close port 5173"
  - "Permission to rotate AWS, Azure, and .env secrets"
osCompatibility:
  - "Vite 7.1.0 through 7.3.2, and Vite 8 before 8.0.5"
  - "Any host that published the dev server beyond localhost"
---

If you started Vite with `--host` so a coworker could click the preview, F5 thinks scanners already tried to read your `.env`.

[Bill Toulas at BleepingComputer dated the campaign to 14 September](https://www.bleepingcomputer.com/news/security/hackers-target-exposed-vite-dev-servers-to-steal-aws-azure-secrets). Attackers are mass-scanning internet-exposed Vite development servers for AWS and Azure credentials. The exploit is CVE-2026-39364, a high-severity file-read bypass. [Shweta Sharma at CSO Online put the CVSS at 8.2 the next day](https://www.csoonline.com/article/4222259/exposed-vite-servers-are-being-probed-for-aws-and-azure-credentials-2.html), citing F5 threat researcher Adam Metcalfe-Pearce.

This is not last week's [GKE Fragnesia breakout](/posts/gke-fragnesia-cve-2026-46300-ubuntu-nodes/). That was a node. This is a developer laptop, a Docker publish, or a forgotten cloud VM still serving port 5173. Same class of lesson we keep writing down: the thing you thought was loopback is on the internet.

## What CVE-2026-39364 actually lets them read

Toulas: the flaw allows bypassing file read and access controls in Vite 7.1.0 through 7.3.2, and in the 8.x branch before 8.0.5. It was disclosed on 7 April. An unauthenticated attacker manipulates query parameters on an HTTP GET and pulls files in plaintext from locations that should have been out of reach.

That is a dev-server bug, not a production-build bug. Production Vite apps are static files plus whatever you bolted on. The campaign is aimed at `vite` while it is still the bundler talking to your disk.

F5's target list, via BleepingComputer:

- `.env`, `.env.production`, `.env.local`, and other environment files
- AWS credential files from several possible home directories
- AWS configuration files and credential backups
- Azure credentials and access tokens
- Terraform state and variable files
- Serverless configuration and state
- `/proc/self/environ`, `/proc/1/environ`, and `/proc/self/cwd/.env`
- `/etc/passwd`

Metcalfe-Pearce, quoted at CSO: the scanning fleet did not hunt a single file. It cycled wordlists of environment files, AWS keys, Azure tokens, and infrastructure-as-code state. They also tried traversal and encoding variants, including double-encoded sequences, to get past reverse proxies and WAF normalization.

If you put a Vite preview behind nginx and assumed the WAF would eat `../`, read that sentence again.

## Scale, source IPs, and the older Vite bugs riding along

[SC Media's brief, still pointing at F5](https://www.scworld.com/brief/mass-scanning-campaign-targets-vite-development-servers-for-cloud-credentials): more than 800 attacks and about 32,000 events in a month. Most of the observed activity came from the United States, Belgium, and the Netherlands. Operators used Google Cloud IP ranges.

Toulas lists the noisiest addresses as 34.14.15.105, 34.16.200.129, and 34.11.196.206. Block them if you have a cheap deny list. Do not pretend a three-IP block is the fix. The next scan will come from a fourth.

The same busy addresses also hit older Vite access-control bugs: CVE-2025-30208, CVE-2025-31125 (flagged as actively exploited), and CVE-2024-45811. Patching only 2026-39364 on a box that still has 2025-31125 open is how you get a second ticket next week.

I am not publishing the wordlists. F5 already did, for people who need them to hunt. You need the version number and the listen address.

## How a localhost server ends up on the internet

Vite binds to localhost on purpose. F5's list of how people undo that is short and embarrassing:

- the `--host` flag
- `server.host` in config
- Docker port mappings that publish 5173 to `0.0.0.0`

The Docker case is the one that belongs on this site. `ports: ["5173:5173"]` on a cloud VM is not a preview. It is an open file server with your IAM user in a text file. We already argued [not to hand AI agents the host Docker socket](/posts/docker-socket-ai-agent-isolation-2026/) and [not to treat writable volumes as harmless](/posts/k8s-137-emptydir-noexec-bind-2026/). Publishing the dev port is the same family of mistake: you optimized for a demo and left the kitchen door off the latch.

Kubernetes Ingress pointed at a Vite service is worse, because you thought TLS made it a product. TLS does not stop an unauthenticated GET.

If your developers run Vite on a laptop with Tailscale or a company VPN, you still want the bind on loopback. The overlay is the access path. `--host 0.0.0.0` plus a public interface is how 32,000 events happen.

## What to do this afternoon

Order of operations, not a culture deck.

1. Find listeners. On the box: `ss -lntp | grep 5173`. In the cloud: security groups and load balancers with 5173, plus any Ingress that forwards to a Vite service. In Docker: `docker ps --format '{{.Ports}} {{.Names}}'` and look for 5173 on 0.0.0.0.

2. Upgrade Vite past 7.3.2 on the 7.x line, or to 8.0.5 or later on 8.x. CSO's range is 7.1.0 through versions before 7.3.2, and Vite 8 before 8.0.5. If `npm ls vite` still shows 7.2.something, you are in the window.

3. Stop publishing the port. Remove `--host`. Set `server.host` back to localhost. Delete the Docker publish. Block 5173 at the security group even after you think you closed the process. Toulas also says to block suspicious `/@fs/` requests. That path is how Vite serves files from disk. If a reverse proxy must stay, deny `/@fs/` from the internet.

4. Do not trust crawler User-Agent strings as a filter. The scanners will spoof Googlebot. UA allowlists are not access control.

5. If 5173 was reachable, rotate. Not "the AWS key you remember." Everything in every `.env*` that box could read, AWS credentials in home directories, Azure tokens, Terraform state, serverless configs. SC Media's line is blunt: if servers were exposed, rotate all secrets. Assume `/proc/self/environ` leaked the same values the file did.

6. Hunt the three IPs in your WAF and VPC flow logs, then hunt `/@fs/` and encoded `..` on 5173. A hit in April after the disclosure is as interesting as a hit this month.

[Build-time secrets do not belong in the image](/posts/docker-buildkit-secrets-guide-2026/). Runtime secrets do not belong in a file the bundler can GET. If your preview environment needs cloud credentials to start, it should be an ephemeral task role, not a laptop IAM user pasted into `.env.local`.

## What this is not

It is not "Vite is unsafe in production." Production should not be running the dev server. If it is, you have a bigger ticket than this CVE.

It is not a Kubernetes CVE. You can still get owned through a Service that fronts Vite.

It is not proof that the three Google Cloud IPs are a named group you should write into a threat report. They are the noisy ones F5 published. Attribution beyond that is not in these write-ups.

Patch the bundler. Close the port. Rotate the keys. Then go find the next compose file that published 5173 because someone wanted to see the app on their phone.

## A rotation list that matches what they asked for

If 5173 answered on a public address after 7 April, when the CVE was disclosed, treat the box as a file server that already ran their wordlist. Do not rotate "the AWS key" and go to lunch.

Start with every `.env`, `.env.local`, `.env.production`, and `.env.development` that lived on that machine or in that container. Those files are the first row in Toulas's list because they are the first row in everyone else's repo. Then AWS: `~/.aws/credentials`, `~/.aws/config`, and the backup copies people leave in `~/Downloads` after a "temporary" fix. Then Azure tokens and the CLI cache. Then Terraform state and `terraform.tfvars`. Then serverless state. Then anything that was in the process environment, because `/proc/self/environ` and `/proc/1/environ` are on the same shopping list. `/etc/passwd` is there too. It is not your IAM user. It is a map of local accounts for the next step.

Rotate in the cloud first, files second. An access key that still works in IAM is still a live incident after you delete `.env`. Invalidate Azure tokens, not just the file that stored them. If Terraform state had a database password, change the database. If a serverless config had a webhook secret, rotate the webhook. SC Media's "all secrets" is annoying because it is correct.

After rotation, grep history. Shell history, CI logs, chat pastes, the S3 bucket someone used to share a `.env` that "wasn't prod." The scanners wanted files. Humans already copied the same files.

## `/@fs/` and the proxy you thought was helping

Vite's `/@fs/` path is how the dev server reads files off disk for the browser. Toulas's mitigation is not poetry: block suspicious `/@fs/` from the internet. If you put nginx in front of Vite so you could use HTTPS for a demo, you may have given the scanner a 443 that still speaks `/@fs/`. Double-encoded traversal exists in this campaign because people did exactly that and then trusted WAF normalization.

A reverse proxy does not make a dev server a product. It makes the bug reachable on a port your security group already allows. If you must keep a preview, put it on a VPN or an identity-aware proxy that requires a company account, bind Vite to loopback, and let the proxy be the only listener on 0.0.0.0. Deny `/@fs/` at that proxy anyway. A preview that cannot read `../.env` is still a preview.

Do not filter on User-Agent. Toulas says not to trust crawler UAs. The three Google Cloud IPs are a hunt list for last month, not a firewall policy for next month.

## Older CVEs, same port

CVE-2025-30208, CVE-2025-31125, and CVE-2024-45811 are on the same busy IPs. 31125 is flagged as actively exploited. A host that "only" needed 2026-39364 and never got the 2025 patches is a host that has been in the window twice. `npm ls vite` in every repo that published a preview, including the intern's fork that still has a compose file. Lockfiles lie if someone ran `npx vite` against a different tree.

Kubernetes does not save you. A ClusterIP Service is fine until an Ingress or a LoadBalancer publishes it. NodePort 5173 on a cloud node is the Docker publish with extra steps. Same hunt: listeners, version, secrets.

This is a Wednesday job, not a quarter-long program. The CVE is from April. The scans F5 counted are a month of 800-plus attacks and 32,000 events. If your 5173 was open, you are late. Rotate anyway. Then check the laptop that ran `npm run dev -- --host` on cafe wifi last month. That box is in the same wordlist. So is the Codespaces preview you forgot to shut down.
