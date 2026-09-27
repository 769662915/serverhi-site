---
title: "actions-cool Came Back With the Old Tags"
description: "actions-cool issues-helper and maintain-one-comment were live again from Sept. 16. May 18 tags were still malicious. Older SHA pins were spared."
pubDate: 2026-09-28
coverImage: "./cover.webp"
coverImageAlt: "A server aisle in cool light, a rack pulled forward, a blank runbook on the rail and a red string tag on a handle."
category: devops
tags: ["GitHub Actions", "actions-cool", "supply chain", "SHA pinning", "CI"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "40 minutes"
prerequisites:
  - "Permission to search workflow files and Actions run history in the repos you operate"
  - "A list of secrets those workflows can read, from the repo, environment, or org"
  - "A maintenance window to rotate anything a job actually ran between Sept. 16 and Sept. 25"
osCompatibility:
  - "Any OS that runs GitHub Actions, including self-hosted Linux runners"
  - "The check is on workflow YAML and run logs, not on a specific distro package"
---

Two third-party GitHub Actions that GitHub had pulled after the May 2026 Mini Shai-Hulud campaign were reachable again on September 16. The release tags were not cleaned first. [The Hacker News on Sept. 25](https://thehackernews.com/2026/09/compromised-github-actions-came-back.html), quoting Socket researcher Karlo Zanki, says those tags still pointed at the malicious content introduced on May 18, so any workflow that referenced either action by a version tag started downloading and executing that payload on its next run.

[BleepingComputer on Sept. 26](https://www.bleepingcomputer.com/news/security/github-actions-re-enabled-with-mini-shai-hulud-payload-still-active) names the actions: `actions-cool/issues-helper` and `actions-cool/maintain-one-comment`. Socket found the tags resolving to a commit whose `index.js` still carried the obfuscated payload. The exposure window they give starts on September 16 between 11:09 and 18:16 GMT+2, and runs through September 25.

This is not a new implant and not a new account takeover. Zanki's line, via The Hacker News, is that no new code was published and no configuration on your side had to change. The tag became downloadable again. That was enough.

The September 12 note on [Actions platform knobs](/posts/github-actions-september-2026-updates/) is a different problem. Those were GitHub's own API and permission changes. This is a third-party action whose mutable tag came back dirty. If you only checked GitHub's changelog, you did not check this.

## What the actions are, and what they are not

Socket, quoted by The Hacker News, describes both actions as issue and comment housekeeping. They close inactive issues, look at newly opened ones, or keep a single bot comment up to date. Workflows that call them usually run on a daily schedule or when someone opens an issue or a pull request. That schedule is why the re-enablement did not need a victim to click anything. Socket's estimate is that most affected repositories probably ran the payload within a day of the repos coming back, with no further move from the attacker.

The May campaign, as BleepingComputer summarizes it, hit 323 npm packages and 639 package versions, with malware aimed at developer tokens, credentials, and CI secrets. The two actions were part of that wave. After the May 18 compromise, GitHub's security team removed them so downstream workflows could not download the malware. The September event is those repositories becoming accessible again with the old tags intact. The Hacker News says they have since been disabled a second time. Visiting either repo now shows a GitHub Staff message: access disabled for a terms-of-service violation, and the owner can contact GitHub Support.

A disabled repo today does not unwind a job that already ran on September 17. If your workflow used a version tag, the question is the run history, not the current 404.

I am not going to describe the payload. Both outlets say it harvested credentials from the CI job and that the malicious copy lived in `index.js`. You do not need the script to decide whether a run was exposed. You need the action reference and the date of the run.

## Who was in range

The Hacker News is explicit about the negative case. Workflows that pin either action to the full commit SHA of a version from before May 18, 2026 were not affected. A tag moves. A full SHA does not. Zanki's point is that a mutable tag can be compromised, contained, and then reactivated without any edit to your workflow file. SHA pinning removes that dependency on the upstream repository's state.

Everyone else who referenced `actions-cool/issues-helper` or `actions-cool/maintain-one-comment` by tag was in range from the September 16 window until the repos were pulled again. BleepingComputer puts that active period from September 16 through September 25. "Last Wednesday" in the Sept. 26 piece is when Socket checked the tags and still found them on the malicious commit. That Wednesday is September 23. So a check mid-window still saw the bad tags. Do not assume a job on September 20 was clean because nobody filed a new CVE that morning.

Self-hosted runners do not get a pass. The action runs in the job, on whatever runner the workflow selected. A GitHub-hosted runner and a Linux box in your rack both execute `index.js` if the job used the tag. The secret blast radius differs. A self-hosted runner that mounts internal network credentials or a Docker socket has more to steal than a hosted runner with a default `GITHUB_TOKEN`. The [GTIG note on token theft from Actions runners](/posts/google-gtig-ai-coding-tools-security-2026/) is the adjacent case. This incident is the third-party action, not an AI coding tool. The rotation step is the same shape.

Org-level and reusable workflows count. A single composite workflow that calls `issues-helper` infects every caller that used the tag. Search the org, not the one repo you remember editing.

## Find the actions-cool references

From a checkout that includes the workflows you actually run, search for both names. A tag pin and a SHA pin look different. You want both hits, then you sort them.

```bash
git grep -n -E 'actions-cool/(issues-helper|maintain-one-comment)' -- '*.yml' '*.yaml'
```

If the org uses reusable workflows in another repo, grep that repo too. GitHub's search UI is fine if the YAML is not all in one clone. The string to refuse is the action name plus an `@` that is not a 40-character SHA.

A dangerous line looks like this:

```yaml
- uses: actions-cool/issues-helper@v2
```

The version tag in that example is illustrative. Neither writeup printed the tag names that were malicious, and I will not invent `v1` or `v2` as the dirty ones. Any tag is the problem they described. The safe pattern they described is a full commit SHA from a version published before May 18, 2026:

```yaml
- uses: actions-cool/issues-helper@<40-char SHA from before 2026-05-18>
```

You only keep that SHA if you have verified it. Socket's advice, via BleepingComputer, is to remove the reference or pin a verified clean commit. "Verified" is your job. Look at the commit date on GitHub for that SHA. If you cannot see the repo because GitHub Staff disabled it, you cannot verify a new pin against the upstream today. Removal is the available move until the repo exists again and you can read the history.

Also search for the actions in composite actions and in docs that tell people to paste a snippet. A README in a template repo will reintroduce the tag the week after you delete it from production.

## Review runs since September 16

A reference in git is not proof a job ran. A missing reference in today's default branch is not proof it never ran. Tags get deleted in a cleanup commit after the bad week. The run log is the record.

In the Actions tab, filter workflow runs from September 16 through September 25, inclusive, in the timezone you operate. BleepingComputer's start window is GMT+2 on September 16, late morning to early evening. If your runners are on UTC, that is 09:09 to 16:16 UTC. Jobs before that window on September 16 are outside the start time they published. Jobs after the repos were disabled again need the disable time, which these two articles do not stamp more tightly than "disabled a second time" by the Sept. 25 Hacker News story and "through September 25" in the Sept. 26 BleepingComputer piece. Review the whole span. A false positive review is cheaper than a missed rotation.

Open a run that used either action. You are looking for a step whose name matches the action, and for whether that step completed. A skipped job did not execute `index.js`. A failed job might have executed it before the failure. If the log shows the step started, treat the secrets that job could read as exposed. Socket's recommendation is to review runs since September 16 and rotate secrets accessible to workflows that ran an affected tag.

Write down three columns before you rotate anything: workflow name, run URL, secrets in scope. Rotating from memory is how a org secret used by a different workflow gets forgotten, and how a fine-grained token in a single environment gets missed.

## Rotate in an order that does not race the next schedule

These actions were often on a daily schedule. If you rotate a token and leave the tag in the YAML, the next scheduled run pulls the same payload, if the repo is up, or fails closed, if it is still disabled. Removal first, then rotation. The other way around spends a new secret on a dirty job.

Order that matches the advice in the two pieces, applied to a normal org:

1. Delete the `uses:` lines or replace them with a SHA you have actually checked, in every repo and reusable workflow the grep found.
2. Merge that change, or push it to the default branch if that is how this org ships workflow fixes. A pull request that sits over a weekend does not stop a schedule on the default branch.
3. Re-run the grep. Template repos and `.github` repos are the usual misses.
4. For each run in the September 16 to September 25 window whose step started, list secrets. Include `GITHUB_TOKEN` if the workflow could use it to push or to read packages, and include any cloud keys, npm tokens, or deploy keys in the environment.
5. Rotate those. Then revoke the old values. A rotation that leaves the old token valid is a note, not a cutoff.
6. Check the runner if it is self-hosted and the job ran there. A hosted runner dies with the job. A self-hosted runner keeps whatever the step wrote to disk. The articles do not publish a file list. Look for unexpected files in the workspace and in the runner's tool cache from those dates, then rebuild the runner if you cannot account for them. Rebuilding is slower than a grep and faster than arguing about a maybe-wiped disk.

The [TeamPCP pipeline piece](/posts/cicd-supply-chain-security-teampcp-2026/) walked through a dependency that stole secrets at scale. The mechanic here is narrower and easier to miss: your YAML did not change, the tag's target did, and then the tag's target was allowed to be downloaded again. A software bill of materials that records the action name without the SHA would have looked clean on both May 19 and September 17. That is the argument for pinning, and it is Zanki's argument, not a general sermon about supply chain.

If the grep is empty and you have never used either action, you are done. Write that down so the next person does not repeat the search at midnight. If the grep is empty and a run in that window still shows the action, the YAML was removed after the run. Rotate anyway. The file today is not the file the runner used.
