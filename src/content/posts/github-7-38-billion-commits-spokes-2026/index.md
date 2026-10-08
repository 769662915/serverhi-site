---
title: "GitHub Logged 7.38 Billion Commits in September."
description: "GitHub's September commit count is 7.38 billion, more than five times last year. The 35x write figure is an internal benchmark. No rollout date."
pubDate: 2026-10-09
coverImage: "./cover.webp"
coverImageAlt: "Five identical hard drives stacked on a cart beside a rack server with an amber status light in a beige machine room."
category: devops
tags: ["GitHub", "Git", "Spokes", "CI", "coding agents"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "25 minutes"
prerequisites:
  - "Permission to read branch protection and Actions usage on one busy repository, not necessarily admin on the org"
  - "A rough idea which workflows run on push versus on pull request"
osCompatibility:
  - "The architecture in the source posts is GitHub.com's Spokes storage, not a distro package"
  - "The checks at the end apply to GitHub.com and to self-hosted Git servers that clone on every push"
  - "No specific Ubuntu or Debian version is implicated"
---

September's commit count is not a vibe about AI. [Brian Celenza on the GitHub Blog](https://github.blog/engineering/architecture-optimization/building-git-infrastructure-for-agent-scale-development), posted Oct. 6, says developers and agents made 7.38 billion commits on GitHub that month, more than five times as many as a year earlier. [Tom Smith at DevOps.com](https://devops.com/coding-agents-broke-gits-scaling-math-github-is-rebuilding-to-keep-up), two days later, uses the same 7.38 billion and the same five-times line. The number is stable across both pieces. What it is not: a date when your repository moves off the current storage system. Celenza says the rebuild is underway while GitHub keeps running. Smith says GitHub did not share a rollout timeline, or say whether customers will have to change anything. A follow-up post is supposed to cover the architecture. Until that post exists, the 35x write number later in this piece is a benchmark, not a migration window.

This is not [the token-length change](/posts/github-stateless-tokens-runner-tls-2026). It is not [the old Actions tags that came back](/posts/actions-cool-tags-back-shai-hulud-2026). It is not a Helm flag. Those were things you could grep on a runner this week. This one is GitHub telling you the storage math under `git push` assumed a person, and that agents do not push like a person. Your job is to find out which of your own systems still assume the person.

## Which multiple belongs to which count

Celenza separates the curves, and Smith repeats most of them. If a slide puts "5x" next to "Actions" it has mixed two rows.

Commits, September 2026: 7.38 billion, more than five times a year earlier. That is the row people will quote, because it is the one that sounds like a code explosion. It is a commit count. It is not the event count, and it is not the push count.

Total Git activity, September 2025 to August 2026: from 218.2 billion events a month to 473.3 billion. Celenza calls that more than 2x. Smith prints the same two figures and does not need a third. 473.3 divided by 218.2 is a bit over 2.1, which is why "more than 2x" fits and "5x" does not. Do not let the commit multiple colonize this row. A year of events doubling is a different story from a month of commits quintupling. Both can be true. They are not interchangeable in a capacity plan.

Pushes: 4.9x year over year, from 0.69 billion a month to 3.35 billion. Celenza's point is that thousands of agents on their own branches still converge on one architectural point when they push. The 4.9x is the write pressure. The 7.38 billion commits are how many snapshots those pushes are carrying. A team that squashes ten agent checkpoints into one push changes the second number's meaning for review, and it does not, by itself, remove the push from the 4.9x curve. Smith makes that process point later. Keep the raw counts in separate cells until you have decided what you squash.

Pull request merges: nearly 4x the volume of a year ago, in Celenza's wording. Smith says the same "nearly 4x." This is the row that lands on one ref if you use trunk-based development, a release train, or a merge queue. Celenza lists those three funnels explicitly. The merge multiple is why a single branch pointer becomes the hot object. It is not a suggestion that you should stop using merge queues. It is a description of where the merges already go.

Actions: 3.26 billion runs in September. Celenza says more than 4x a year ago. Smith says 4x. I am not sanding "more than 4x" down to Smith's shorter phrase, and I am not inflating Smith's phrase into Celenza's. Cite the blog when you need the inequality. Cite DevOps.com when you are quoting the recap. The integer that both pieces share is 3.26 billion. That is the fan-out. Celenza's example is CI and code scanning cloning or fetching the same branch tip thousands of times a minute. Each push becomes a pile of reads. Scaling the reads is the easy half, he says. The writes are the hard half, because a push has to be stored durably and made visible before the next agent or CI job can build on it.

One repository, August: roughly a billion requests, the busiest on the platform. Celenza calls the gap between a typical repository and that end of the distribution wider than most people expect. Smith repeats the billion. If your repo is not that repo, you are not off the hook. Celenza's line, which Smith also picks up, is that engineering for that scale raises the floor for everyone. The maintainer with a volunteer pull request and the student opening a first PR are supposed to get the same foundation. "We are small" is not a design assumption GitHub is willing to keep building around. It is also not a reason for you to ignore a clone storm on a repo that only feels busy on weekday afternoons.

## What GitHub's Spokes still does on a push

The current system has a name. Spokes stores every repository as a full copy on the local disks of several fileservers, five by default. Celenza points at an older infrastructure post for the name. Those disks are why Git operations can read native repository data with low latency, and the extra copies are both redundancy and a way to spread reads. When a push updates a reference, a three-phase commit uses a quorum so that CI, the web UI, and API clients see a consistent repository. He says that pairing serves a billion repositories today.

The failure mode is the sentence Smith quotes and Celenza wrote. Every replica participates in every write, so a push is only as fast as the slowest replica in its set. Adding replicas to absorb read load makes writes slower. At ordinary volume the tradeoff is fine. At the top of the curve it is a ceiling. Add a read replica and you add write overhead. Lose a replica and you lose read capacity. Lose quorum and writes stop. Durability and scale are the same mechanism. That is the math agents break, because an agent in a tight loop commits or checkpoints after nearly every action. Latency a human never notices becomes the bound on the agent's speed. The agent is waiting on the slowest of five copies, plus the reads those pushes detonate.

I cannot see Spokes from a customer shell. `git remote -v` will not print "five fileservers." Do not go looking for a knob that turns the copy count down. The five is GitHub's default for GitHub's disks. What you can see is the symptom Celenza describes if your own push latency moves: the agent loop, or your own script, stalls on the push, and the CI system then clones the tip you just moved. Those are two clocks. The first is write latency. The second is read fan-out. A dashboard that only shows Actions minutes will miss the first clock. A dashboard that only shows `git push` time will miss the bill for the second.

Smith adds the person GitHub did not need for the architecture post. Mitch Ashley, at The Futurum Group, says the rebuild is happening because agents commit at machine speed and the old architecture assumed a person pushing a finished change. Faster pushes move the bottleneck to review. Branch protections and required reviews still run at human speed. Agent commits build verification debt faster than a team can hire reviewers to clear it. His recommendation is specific: require agent changes to carry evidence of what ran and why before they reach a protected branch. That recommendation is Ashley's, as Smith quotes him. It is not a new GitHub setting announced on Oct. 6. Celenza's promise is that the protections you already have stay. Ashley's point is that those protections are now the slow part, and the evidence has to show up in the change itself or the human review cannot keep up.

## What the new design coordinates, and what it stops coordinating

Celenza is explicit about the critical path. The part of a push that needs agreement is the reference update, the moment the branch pointer moves. Storing objects, validating connectivity, and secret scanning are more work, and most of that work can happen in parallel with other writes. Shrink the coordinated step to the pointer move, and the rest should not delay the acknowledgment. That is a design claim about a system still being built. Smith reports it as the plan. Neither piece says your push is already taking that shorter path.

Maintenance moves off the serving path. Compaction and garbage collection currently run on the same hosts that answer live Git requests. In the new architecture, separate workers handle that against durable storage, so a busy repository can be optimized in the background without slowing pushes and fetches. If you have ever watched a self-hosted Git server get slow on a day when `git gc` decided to run, you already know why he wants those jobs off the request path. GitHub is describing its own hosts. The lesson for a self-hosted box is the same shape, and it is not a command I am going to invent for every distro.

Storage and compute split. Authoritative repository data lives in Azure Blob Storage, which already replicates at Azure scale. Lightweight read workers sit in front and cache what a request needs. Read capacity can grow without adding another durable copy, so a CI fan-out does not tax every push. If a compute worker dies, Celenza says that is closer to a cache miss than a durability event. A replacement can serve immediately and fill the cache as traffic arrives. Workers can be added for a burst, a release, a new agent fleet, and removed when the burst ends, instead of provisioning for peak in advance.

The benchmark is one sentence, and it has a ceiling built into the verb. In internal benchmarks, the design has delivered up to 35 times higher write throughput. "Up to" is doing real work. Smith prints the same 35 times and the same "internal benchmarks." There is no customer percentile, no repository that has been moved, and no date. Celenza says a later post will go deeper into the architecture and the path that got them there. Smith says GitHub did not say whether you will need to change anything. I would read those two sentences as the same caution. The principles he does commit to are the ones that keep your current controls: branching, review, merge, and history stay; reliability is the measure; people remain able to review, understand, and approve. Branch protections, required reviews, audit logs, and repository visibility stay in place. A faster pointer update is not a request that you turn required reviews off. Ashley, via Smith, wants the opposite pressure: more evidence on the change, not less review.

Secret scanning is on the list of work that can leave the critical path. That is not "secret scanning goes away." It is "secret scanning should not be the thing a push waits on before the ref moves." If your compliance story assumed the push acknowledgment meant the scan had finished, write that assumption down and check it when the follow-up architecture post lands. I am not going to tell you the scan already moved. Celenza is describing the redesign. The current three-phase commit is still the system he says is serving repositories today.

## What to check before the follow-up post

Smith's practical close is the part I would actually run this week, because it does not depend on Azure Blob being your storage. Plenty of internal systems were sized for a person finishing a change and then pushing. Self-hosted Git servers, artifact repositories, CI runners, and pipelines that clone on every push are on his list. If one agent produces dozens of commits in the time a developer produces one, every downstream system feels it. Find where push latency, clone storms, and single-branch contention would show up in your environment. He would rather you answer that in planning than during an outage. So would I.

I am not giving you a GitHub API you do not have. The checks below use things the two posts already imply you can see: how often you push, what your workflows trigger on, and whether a protected branch is where agent commits land.

Look at one busy repo's push pattern before you look at org-wide charts. Celenza's pain is concentrated. A repository that receives agent checkpoints all day will tell you more than an average across dormant forks.

```
git log --since="14 days ago" --pretty="%ad" --date=short | sort | uniq -c | sort -nr | head
```

That count is commits, not pushes. If the number jumped and your review queue did not, you are already in Ashley's verification debt, even if GitHub has not moved you to the new storage. If the number did not jump, you may still be cloning on every push. The Actions multiple is a platform figure. Your bill is the workflow file.

See which workflows run on `push` rather than on `pull_request`. A full pipeline on every agent checkpoint is the cost Smith flags. I would not delete the pipeline. I would see whether the expensive jobs are on the trigger that agents hit in a loop.

```
grep -n "push:" .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null || true
```

Jobs that only need to run when a human opens a PR should not be on `push` if agents push after every edit. Jobs that need to run on the default branch after merge can stay on `push` to that branch. Celenza's merge-queue point is why the default-branch ref is the hot one. Constraining the expensive workflow to that ref is a local decision. It is not in the GitHub post as a sample file. It follows from Smith's warning about cost per checkpoint.

Branch protection is the control both posts say remains. I would read it, not assume it.

```
gh api repos/:owner/:repo/branches/main/protection --jq '{reviews:.required_pull_request_reviews,checks:.required_status_checks.contexts}'
```

Replace `main` if the default branch is not `main`. If `gh` is not installed, the same page is in the repository settings under branch protection. What you want to see is a required review or a required check that an agent cannot satisfy by pushing harder. Ashley's "evidence of what ran and why" has to be something that check can see: a CI conclusion, a summary the agent wrote into the PR, a test log. A green dot from a workflow that did not run the tests you care about is not evidence. It is a shortcut past the human speed he is worried about.

Self-hosted Git is the other clock, and it is the one Celenza is not rebuilding for you. If your runners clone a full repository on every push from an agent fleet, you have built a small Spokes: every clone is a read storm, and a `git gc` on the same box as the SSH daemon is maintenance on the serving path. You do not need Azure to decide that those two jobs should not share a disk at the hour the agents are busiest. Smith lists artifact repositories in the same breath. A registry that accepts a push per checkpoint will fill the disk the Git server was using for objects. Look at that disk before you look at a 35x slide.

None of this requires you to believe the internal benchmark. Up to 35 times, on GitHub's hardware, in a test they have not described in customer terms, is a reason for them to keep building. It is not a reason for you to retune timeouts to a latency you do not have yet. The numbers you can use this week are the ones both posts print about last month, and the trigger lines in your own workflow files. The follow-up architecture post is the one that gets to say whether your push path changed. Until it does, Spokes is still five copies and a quorum, and your reviewers are still the slow replica.
