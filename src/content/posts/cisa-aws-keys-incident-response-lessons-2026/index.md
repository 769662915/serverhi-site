---
title: "CISA Didn't Have an Incident Response Playbook When Its Own AWS Keys Leaked. Here's What Every DevOps Team Should Learn."
description: "The US government's cybersecurity agency got caught without an incident response plan when a contractor exposed AWS GovCloud keys on GitHub. The post-mortem is a masterclass in what not to do — and a checklist for teams that think 'it won't happen to us.'"
pubDate: 2026-07-17
coverImage: "./cover.webp"
coverImageAlt: "A terminal-style illustration of exposed AWS credentials on a GitHub repository with warning symbols and a broken padlock"
category: devops
tags: ["Security", "AWS", "Incident Response", "GitHub", "DevOps", "CISA"]
author: ServerHi Editorial Team
---

In May 2026, a security researcher at GitGuardian found something nobody wants to find: a public GitHub repository containing highly privileged AWS GovCloud keys and credentials for internal systems belonging to CISA — the US Cybersecurity and Infrastructure Security Agency, the federal body tasked with defending government networks.

The repository belonged to a CISA contractor who had uploaded it to their personal GitHub account. The researcher tried to alert the contractor. No response. The researcher then contacted independent journalist Brian Krebs, who reached CISA directly. Only then did the agency take the repository offline and begin revoking credentials.

Last week, CISA published its post-mortem. The headline finding was brutal: the agency did not have an incident response playbook for this kind of event. Its staff "had to spend time building one during the early stages of the incident."

If the organization responsible for telling everyone else how to handle cybersecurity incidents got caught without a playbook, the rest of us should probably check our own.

## What happened, step by step

The timeline, assembled from CISA's post-mortem and reporting by TechCrunch and KrebsOnSecurity, goes like this:

1. A CISA contractor uploaded sensitive credentials — AWS GovCloud access keys, internal system passwords, and code repository tokens — to a personal public GitHub repository. The repository was not part of CISA's official GitHub organization and was not managed under any organizational access controls.

2. GitGuardian's automated scanning detected the exposed credentials. A researcher manually verified the finding and attempted to contact the contractor who owned the repository. The contractor did not respond.

3. The researcher escalated to Brian Krebs, who contacted CISA directly. At this point, CISA's Office of the Chief Information Officer took what it described as "swift and comprehensive action within moments" — shutting down the repository, revoking all exposed credentials, and beginning its internal investigation on May 15.

4. During the investigation, CISA's incident response team realized it did not have a pre-built playbook for handling credential exposure incidents. Staff spent the early hours of the response writing procedures that should have existed before the incident began.

CISA has not disclosed how long the playbook gap delayed its response. A spokesperson declined to comment to TechCrunch on that question. But the implication is clear: when the organization responsible for federal cybersecurity does not have a pre-built response procedure, the delay is measured in hours at minimum — and in an incident where credentials are publicly exposed, hours matter. Every minute those keys sit in a public repo is a minute someone could be using them.

## The playbook problem

CISA's post-mortem states plainly that organizations should "prepare playbooks for all anticipated needs to ensure that organizations are ready to respond in the event of a security incident rather than scrambling to improvise one in real time."

This is good advice. It is also advice that CISA itself was not following. And that is the uncomfortable truth the post-mortem exposes: even organizations with deep security expertise, dedicated SOC teams, and federal-level resources can have glaring gaps in their preparedness.

The specific category of incident — contractor credential exposure on a public code repository — is not exotic. It is one of the most common security incidents in modern DevOps environments. GitHub scanned its public repositories and found over 12 million new secret exposures in 2025 alone, according to its own State of Secret Scanning report. Any organization with contractors, GitHub accounts, and AWS credentials should have a playbook for this.

CISA did not. And if CISA did not, your team might not either.

## What a credential exposure playbook should cover

Based on CISA's own post-mortem recommendations and industry best practices, here is what an incident response playbook for credential exposure needs to include:

**Detection and notification**: Who monitors for exposed secrets? Are you using GitHub's native secret scanning, GitGuardian, TruffleHog, or a comparable tool? What is the escalation path when a finding is confirmed — and does it work if the affected repository is owned by a contractor rather than your organization?

**Immediate containment**: The first action is always the same: revoke the exposed credentials. CISA did this correctly. The detail that matters is whether you have an automated mechanism for credential rotation or whether someone needs to manually log into the AWS console, find every affected key, and rotate it one at a time. CISA had to do the latter for its GovCloud environment, which involves additional compliance overhead. Your playbook should specify exactly which IAM roles, service accounts, and API keys need rotation and who has permission to do it.

**Scope assessment**: CISA confirmed within its investigation that no customer or mission data was exposed and that the leaked credentials were not used outside CISA environments. It was able to do this because its SOC had comprehensive logging. The post-mortem explicitly calls out logging as a critical capability: "continuous improvement of logging capabilities remains a key element of a strong security program." Your playbook needs to specify which logs to query (CloudTrail, VPC Flow Logs, GitHub audit logs) and what patterns to look for (unusual API calls, access from unexpected IP ranges, resource creation or modification events).

**Contractor and third-party controls**: This incident happened because a contractor had access to production credentials and the ability to store them in an unmanaged personal repository. CISA's recommendations include tighter controls over public code repository access. Practically, this means requiring contractors to use organization-managed GitHub accounts with branch protection rules, mandatory secret scanning, and restrictions on public repository creation.

**Communication plan**: CISA's playbook gap was partly a communication failure — the researcher could not reach the right person at the agency, and it took Krebs's intervention to trigger a response. Your playbook needs a security contact that external researchers can actually reach, and that contact needs to be public, monitored, and empowered to escalate.

## The logging lesson

One thing CISA got right: its SOC had the logs it needed to investigate. The post-mortem is unambiguous on this point. The agency was able to determine that no credentials had been used maliciously because its logging infrastructure captured the necessary telemetry.

This is not a given. Many organizations discover during an incident that the logs they need were not being collected, were stored with insufficient retention, or were in a format that made querying impractical. If you have not tested your logging pipeline by running a simulated credential exposure drill, you do not actually know whether your logs are sufficient — you are guessing.

AWS CloudTrail should be enabled across all accounts and regions, with logs centralized to a dedicated security account that the affected account cannot modify. GitHub audit logs at the organization level should capture repository creation, visibility changes, and access events. Both should feed into a SIEM or centralized logging platform with alerting rules for credential exposure patterns.

## The contractor risk

The uncomfortable subplot here is the contractor. CISA, like most large organizations, relies on contractors for development, operations, and consulting work. Those contractors have access to production systems and, inevitably, production credentials.

The industry's standard approach to this problem — "contractors should follow our security policies" — is not working. Contractors make mistakes. They use personal GitHub accounts for convenience. They hardcode credentials into scripts that end up in repositories. They leave organizations with the cleanup.

CISA's recommendation for tighter controls over public code repository access is a start, but it does not go far enough. Organizations should consider:

- Requiring all contractor work to happen inside organization-managed environments with pre-configured security controls
- Using short-lived credentials (AWS STS, HashiCorp Vault dynamic secrets) that expire before they can be leaked and abused
- Implementing pre-commit secret scanning that blocks commits containing credentials before they ever reach a repository — public or private
- Running regular credential audits that review all active IAM keys and flag any that are older than 90 days, unused, or excessively privileged

## What to do this week

If you read the CISA post-mortem and recognize your own organization in it, here is a concrete checklist for the next five business days:

1. **Run a secret scan on your GitHub organization.** Use GitHub's native tooling (free for public repos) or a third-party scanner like GitGuardian or TruffleHog. Do not assume you are clean because you have not had an incident. The whole point of CISA's story is that you do not know until you look.

2. **Check whether you have a credential exposure playbook.** If you do, test it with a tabletop exercise this week. If you do not, write one. Start with the four sections above: detection, containment, scope assessment, and communication. Accept that version 1 will be incomplete and plan to iterate.

3. **Audit your AWS IAM keys.** List every active access key across every account. Flag keys older than 90 days. Flag keys with wildcard permissions. Flag keys belonging to contractors. Rotate anything that looks suspicious.

4. **Verify your logging coverage.** Confirm CloudTrail is enabled in every region of every account. Confirm logs are shipping to a central location that the affected account cannot modify. Query a known event from last month to make sure the pipeline works end to end.

5. **Update your security.txt.** Publish a `security.txt` file at your organization's standard URL with a monitored contact for security researchers. CISA's incident might have been resolved hours or days faster if the GitGuardian researcher had known who to call.

CISA's post-mortem is valuable because it is honest. The agency that exists to tell everyone else to have incident response plans did not have one. It admitted that publicly and used the admission to make a broader point about preparedness. The least the rest of us can do is take the hint.

---

*Sources: TechCrunch (July 10, 2026); Infosecurity Magazine (July 10, 2026); CISA post-mortem report (July 2026).*
