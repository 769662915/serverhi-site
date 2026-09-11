---
title: "GitHub Actions Grew Three Knobs. August Showed Why You Need Them"
description: "The 3 September changelog added a runner deprecation API, a least-privilege Dependabot permission, and job-level identity for reusable workflows. The August availability report is the incident those knobs exist for."
pubDate: 2026-09-12
coverImage: "./cover.webp"
coverImageAlt: "Server room aisle with a laptop showing a YAML file on a cart, cool overhead light, no neon."
category: devops
tags: ["GitHub Actions", "CI", "runners", "DevOps", "GITHUB_TOKEN"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "30 minutes"
prerequisites:
  - "Permission to edit .github/workflows and org Actions settings"
  - "Access to GitHub audit log or Actions usage"
osCompatibility:
  - "GitHub-hosted Ubuntu"
  - "Self-hosted Linux runners"
  - "GitHub Enterprise Cloud"
---

GitHub's 3 September changelog is short. [Three Actions updates: a REST API for runner version deprecations, a `vulnerability-alerts` permission on `GITHUB_TOKEN`, and four new `job` context fields for reusable workflows](https://github.blog/changelog/2026-09-03-github-actions-early-september-2026-updates). The August availability report is longer, because [Actions spent a peak sitting on a database that was already near the limit, then recovered through failover, manual throttles, and a bug that fed dead jobs to runners](https://github.blog/news-insights/company-news/github-availability-report-august-2026/).

This is an operations note. Pin versions. Shrink tokens. Know which workflow file actually ran. Have a path when the queue lies.

We already had a week of [HAProxy binaries you should verify](/posts/haproxy-ted-backdoor-verify-builds-2026/). CI is the other place a bad default becomes a fleet.

## The deprecation API is a calendar, not a blog post

Call `GET /actions/runners/deprecations/{version}` at repository, organization, or enterprise scope. The response includes `runner_version`, `runtime_deprecates_at`, and `registration_deprecates_at`. That split is the useful part. Registration dying first means you cannot add more machines of that version. Runtime dying later means the ones you already have will stop being allowed to pick up jobs.

If you still learn about image retirement from a changelog you forgot to subscribe to, you will learn during a Monday that all the `ubuntu-22.04` labels are pending and the queue is red. Put this endpoint on a weekly job. Fail the job when `runtime_deprecates_at` is inside 30 days and the org still has that runner version in use. Do not wait for GitHub to email the person who left.

Self-hosted fleets need this more than GitHub-hosted ones. GitHub-hosted images move on GitHub's clock. Your VM image moves on yours, until they refuse the agent. The API is how those clocks meet.

Related changelog noise from the same season, listed next to the 3 September post: Windows 11 arm64 VS2026 image generally available, Xcode 27 runner image in public preview, setup-java v5.5.0. Those are image stories. Treat them as reasons to read the deprecation API, not as reasons to rewrite every workflow tonight.

## `vulnerability-alerts` is a small permission on purpose

You can grant workflows read-only access to Dependabot alerts with `vulnerability-alerts` on `GITHUB_TOKEN`. Values: `read` or `none`. GitHub points at the workflow `permissions` key. The point is you no longer reach for a broader scope because you wanted a job to comment "this PR trips an alert."

Default `GITHUB_TOKEN` hygiene is still the job. Start every workflow with `permissions: {}` or an explicit least set. Add `vulnerability-alerts: read` only on the job that reads alerts. Do not put it on the job that publishes a container. The August incident is not a token incident. The token work is how you stop the next incident from being one.

If a reusable workflow in another repo is the thing that needs the alerts, remember that `GITHUB_TOKEN` in the called workflow is not always the caller's imagination of the token. Read the reusable-workflow permission docs before you assume `read` landed. The new `job.workflow_*` fields below exist because people have been wrong about which file is running.

## Reusable workflows finally know who they are

Four new `job` context properties:

- `job.workflow_ref` — full ref of the workflow file that defines the current job
- `job.workflow_sha` — commit SHA of that file
- `job.workflow_repository` — `owner/repo`
- `job.workflow_file_path` — path from repo root

GitHub is explicit: these are not the same as `github.workflow_ref` and `github.workflow_sha` when the job lives in a called reusable workflow. For a job defined in the top-level file, they match. They diverge when you `uses:` another workflow. They are not available on GitHub Enterprise Server.

This is the identity primitive you needed if you log, attest, or block. A called workflow that deploys should record `job.workflow_sha` in the release note. A policy job can refuse to run if `job.workflow_repository` is not in an allow list. Today a lot of orgs do that with convention and hope.

Wire it in slowly. Log the four fields on one production workflow for a week. Compare them to what you thought was running. If they differ, you have been attributing deploys to the caller. That is a documentation bug you can fix without a new platform.

## What August actually broke

The availability report is the part most changelog readers will skip. Do not. During a daily traffic peak, a burst of events hit a shared database Actions depends on, already near its limit. Write and query pressure saturated the primary. The internal service that turns events into runner assignments could not keep up. Runs failed to start or started late.

They failed the database primary over to a replica. That helped some and not enough. They throttled inbound event processing so the database could recover. There was no automatic circuit breaker that tripped when the database showed stress. Throttles were applied and tuned by hand. GitHub wrote that down as a learning. Believe them.

While core services came back, a latent bug assigned runners jobs that were no longer valid. Runners got stuck retrying dead work and held the queue. Fixes stopped the invalid acquire, drained queues, raised internal rate limits. A smaller set of self-hosted runners stayed stuck and were recovered manually. Some events from the incident could not be replayed and had to be re-triggered.

A second thread in the same report describes service mesh sidecars hitting CPU throttle and OOM during a deployment that reduced running pods, then cascading into cache, DNS, and API errors. Ingress had little headroom. I am repeating their sequence because it is the same class of failure you get in your own Kubernetes CI. A deploy that shrinks pods during peak is not a GitHub-only idea. It is a Tuesday.

## What you should change this week

1. Subscribe the changelog label for Actions, and add the deprecation API to cron. A markdown file in the repo that nobody reads is not a calendar.

2. Set explicit `permissions` on the workflows that still inherit defaults. Add `vulnerability-alerts: read` only where a job reads Dependabot. Leave it `none` everywhere else.

3. Log `job.workflow_ref` and `job.workflow_sha` in deploy jobs that call reusable workflows. If you attest, put those fields in the attestation.

4. For self-hosted runners, document who restarts a stuck worker. August required manual recovery for a subset. If your runbook says "wait for GitHub," you will wait through a queue of revoked jobs.

5. After any Actions incident, expect to re-trigger. GitHub said some events could not be replayed. Your release process should have a human-shaped "press the workflow again" step that does not require the original webhook.

6. If you are shopping for an exit hatch, Gitea 1.27.1 (early August) and Forgejo still advertise GitHub Actions-compatible YAML. [Tech Insider's 6 September comparison](https://tech-insider.org/gitea-vs-forgejo-vs-gitlab-2026) is a self-host note, not a migration plan. Compatibility is "minor changes," not zero. Do not flip orgs because of one bad August. Do keep a runner image you control.

A practical pattern for the deprecation API: one workflow in a private ops repo, on a weekly cron, with `vulnerability-alerts: none` and no write scopes. It calls the endpoint for each runner version you still ship. It opens an issue if `registration_deprecates_at` is inside 45 days. It pages if `runtime_deprecates_at` is inside 14. That is boring. Boring is the point. Changelog posts are for humans who already had coffee. The API is for the night the image vanishes.

Reusable workflows make the August bug more painful. If a called workflow is the thing that deploys, and runners chew revoked jobs, your caller stays green while the callee is stuck. `job.workflow_file_path` in the log is how you see that without SSHing into a runner. Add it to the first `run:` that prints env. You will use it twice a year and be glad.

GitHub-hosted larger runners and self-hosted both showed up in the leftover-stuck set. If you pay for larger runners, do not assume GitHub's recovery drains your queue automatically. The report says a subset needed a release. Your operator should know the button. If nobody owns that button, you will learn during an incident.

Gitea Actions picking up concurrency groups and per-job reruns in the 1.26 line is relevant only as a reminder that the YAML dialect is spreading. It is not a reason to stand up Gitea this weekend because GitHub had a bad peak. Mirror your critical workflows. Keep the runner image. That is the exit drill. The 3 September API is the stay-and-fix drill.

Print the deprecation timestamps next to the runner hostname in your inventory sheet. When someone asks why a box cannot register, you want a date, not a Slack thread.

None of this is a reason to leave GitHub this week. It is a reason to stop treating `runs-on: ubuntu-latest` and an implicit token as a platform. The 3 September knobs are small. The August report is the cost of not using knobs. Put the API on a calendar. Shrink the token. Record which YAML actually shipped the artifact. When the queue lies, you will at least know what you thought you ran.
