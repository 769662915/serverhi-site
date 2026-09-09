---
title: "Google Says Attackers Are Going After AI Coding Tools"
description: "GTIG maps token theft from GitHub Actions runners and junk in hidden AI workspaces. What to change on Linux CI and laptops this week."
pubDate: 2026-09-10
coverImage: "./cover.webp"
coverImageAlt: "Linux workstation with a terminal and a closed laptop, cable lock on the desk, overhead office light, no neon."
category: security
tags: ["GitHub Actions", "supply chain", "AI coding", "Linux", "GTIG"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "30 minutes"
prerequisites:
  - "Admin access to CI runners and developer Linux boxes"
  - "Ability to rotate GitHub and package-registry tokens"
osCompatibility:
  - "Ubuntu 24.04"
  - "Debian 12"
  - "RHEL 9"
---

Google Threat Intelligence Group told [Infosecurity Magazine](https://www.infosecurity-magazine.com/news/ai-coding-tools-threat-actors/) that AI coding tools are now a primary target, not a side channel. The write-up ties that shift to large software supply-chain breaks in 2025 and early 2026. If you run Linux CI, or you let agents touch a repo, this is an operations story.

The useful pieces are specific. A stealer called Dustmaker pulls tokens out of GitHub Actions runner process memory, then publishes poisoned packages that still pass automated "the AI coding bot trusted this" checks. The same family drops files into hidden project directories that assistants already use, so the junk looks like developer noise. A cluster tracked as UNC6780 harvests credentials for AI tools and sells them on.

We already argued [not to hand agents the host Docker socket](/posts/docker-socket-ai-agent-isolation-2026/). This week's report is the next layer: the agent does not need root on the box if it can steal the token the pipeline already trusts.

## What GTIG actually described

I am repeating the magazine's summary of Google's report, not a lab write-up. Do not treat this as a how-to. Treat it as a list of places your current controls are blind.

**Runner memory.** GitHub Actions runners hold tokens in process memory while a job runs. If malware on that runner can read that memory, it gets a credential that looks legitimate to GitHub and to whatever package registry the workflow publishes to. Signing and "the CI said so" then work against you.

**Hidden workspaces.** Coding assistants create cache and scratch directories inside a repo or under the user's home. Attackers who can write there do not need a flashy implant name. They need a file your model will read the next time someone says "fix the tests." That is a prompt-injection path that looks like a project file.

**Credential resale.** UNC6780, in the magazine's telling, is not always the group that burns the token. They collect access to AI tools and sell it. Your incident timeline may start with a random publish, not with the actor who first sat on the laptop.

Two other sketches in the same article are about using the tools as builders, not only as loot. A Chinese-nexus group tried to lean on Gemini to assemble an automated pentest agent. A financially motivated group used an AI coding chatbot plus a bundle of agent instructions to stand up a multi-agent credential-harvesting campaign in under six hours after they already had a foothold in someone's cloud. The second case matters for IR: once the cloud is open, the time to a working harvester is now a workday, not a sprint.

None of that requires you to ban Copilot on moral grounds. It requires you to assume the assistant's workspace and the runner's memory are part of the attack surface you already failed to list.

## CI runners: treat them like production, because they publish

If a GitHub Actions runner can push a package, it is a production identity. Most shops still treat it like a cheap VM.

Do this week:

1. **Ephemeral runners, or as close as you can get.** Persistent self-hosted runners that sit for weeks are where stealers live. If you cannot go ephemeral, rotate the box on a calendar you would accept for a bastion.
2. **Least token, shortest life.** Fine-grained PATs or GitHub's job-scoped tokens beat a classic PAT taped into `secrets.GITHUB_TOKEN` plus five extra scopes "just in case." If the job only needs `packages:write` on one repo, that is the scope.
3. **Do not let the runner install random Actions from tags that move.** Pin by commit SHA. We covered the wider [CI supply-chain version of this](/posts/cicd-supply-chain-security-teampcp-2026/). The GTIG note is why: a compromised package that still "passes AI trust checks" is exactly the failure pin-by-SHA is for.
4. **Lock down outbound from the runner.** If the job does not need to hit a random IP on 443, do not give it the internet. Stealers need a place to send memory dumps.
5. **Separate publish jobs from test jobs.** The matrix that runs unit tests should not hold the npm/PyPI token. Split the workflow. Compromise of a test image should not equal a package publish.

Self-hosted on Kubernetes? The runner pod is a privileged-adjacent identity even if you did not set `privileged: true`. It has a service account, it has a GitHub token, it can often talk to your internal registry. NetworkPolicy and a dedicated namespace are not optional cosmetics.

GitHub-hosted runners are not magic. They reduce persistence. They do not stop a malicious step in *your* workflow from reading the token the job already has. Read your own YAML.

## Developer Linux boxes: the hidden directory problem

Assistants will keep writing under `.cursor/`, `.github/copilot/`, `.aider/`, vendor cache dirs, and whatever new folder ships next month. You will not win by memorizing names. You will win by policy.

On managed Linux laptops:

- Inventory those directories once. `find` from `$HOME` and from each repo root for dot-directories owned by editor plugins. Put the list in the team wiki. Update it when you add a tool.
- If your DLP or audit agent can watch new files in those paths, turn that on. The whole point of "blend into developer noise" is that nobody looks there.
- Do not store long-lived cloud keys in the same profile that runs an agent. Use a separate user or at least a separate `aws` profile that the agent cannot read. Yes, this is annoying. So is rotating every token after a laptop stealer.
- SSH keys stay behind the agent. If the assistant needs git, give it HTTPS with a short-lived credential, not `~/.ssh/id_ed25519`. We already walked [SSH hardening](/posts/ssh-hardening-fail2ban-guide-2026/) for servers. The same instinct applies to the laptop that checks out production charts.

If you cannot control laptops, control what they can publish. Protected branches, required reviews, and package-registry allowlists catch a surprising amount of "the agent committed a helper script." Reviews fail if reviewers rubber-stamp AI diffs. Say that out loud in the next standup.

## What not to do

Do not try to reproduce Dustmaker. You do not need a PoC to rotate a token.

Do not dump process memory on a runner "to see if it looks like the report." That is how you turn an incident into two incidents.

Do not paste customer code into a random chatbot to "ask if this is malware." That is how you enlarge the blast radius.

Do not treat Chrome as unrelated if your admins live in a browser. Google shipped Chrome 152.0.7977.82 on Linux for [CVE-2026-85046](https://www.securityweek.com/google-patches-6th-chrome-zero-day-of-2026/), a V8 type-confusion bug it says was exploited. It is the sixth Chrome zero-day of 2026. Patch the admin workstations. That is a one-line apt/dnf, not a research project.

## A two-hour drill that fits a Tuesday

Hour one: list every GitHub App, PAT, and registry token that a runner or an IDE plugin can use. Kill anything unused. Shorten anything that can be shortened. Confirm publish rights live in one job, not in `ci.yml` line 4.

Hour two: pick one repo that uses an AI assistant. List hidden directories. Confirm they are in `.gitignore` if they should be, and that secrets scanners see them if they should not be ignored. Then patch Chrome on the box you are using to read this.

Write down what you could not do in two hours. That list is the actual backlog. GTIG did not invent a new class of failure. They described the one you get when the pipeline trusts a robot and the robot's workspace is untracked.

If your answer is "we already banned AI tools," check whether that ban is real on self-hosted runners and on contractors' laptops. UNC6780 does not care about your wiki policy. They care whether a token is still in memory.

## Logging you actually need

Most shops log `git push` and forget the rest. For this threat model you want three extra trails.

Runner start and stop, including image digest and who scheduled the workflow. If Dustmaker-style memory theft happens, you need to know which AMI or pod image was warm.

Package publish events with the actor type. Human vs GitHub App vs `GITHUB_TOKEN`. If a package went out at 03:00 from a workflow that does not usually publish, that is your page.

File creates under hidden assistant directories on managed laptops, even at low fidelity. You will get noise. You will also get the first look at a drop that `git status` never showed because it was gitignored.

If you have no endpoint agent on Linux developer boxes, start with auditd watches on those paths for the people who can publish. Perfect coverage is a fantasy. Coverage of the ten humans with `packages:write` is not.

## Package registries

PyPI, npm, and your internal Artifactory trust CI more than they trust people. That was the point. It is also why a stolen runner token is worth more than a stolen laptop password.

Turn on mandatory 2FA for human publishes. Require a trusted publisher / OIDC where the registry supports it, so there is no long-lived token in `secrets` at all. Yank privileges from tokens that can publish *and* delete. Deletion is how a bad actor hides the first bad version.

Hold a 24-hour delay on latest tags for internal libraries if you can stand it. Supply-chain breaks in 2025 and early 2026, the period GTIG pointed at, often lived in the gap between publish and the first human noticing.

When you rotate after a scare, rotate the registry token, the GitHub token, and any cloud role the workflow assumed. One leftover role is enough.

The report will get a prettier PDF than this page. Your job is still the same: shrink what a runner can do, watch the folders your tools hide, and patch the browser your admins use to approve the next workflow.

Chrome 152.0.7977.82 is the Linux build SecurityWeek listed for CVE-2026-85046. The other 2026 Chrome zero-days in that roundup were CVE-2026-2441, 3909, 3910, 5281, and 11645. You do not need the V8 details. You need the package version on every jump box that opens github.com. Then go back to the runner list. That is the actual work today.
