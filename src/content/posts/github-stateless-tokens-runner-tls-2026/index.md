---
title: "New GitHub App Tokens Are 520 Characters, Not 40"
description: "New GitHub App tokens are about 520 characters, not 40. Runner enforcement already started, and GHE.com drops X25519-only TLS on Oct. 7."
pubDate: 2026-10-04
coverImage: "./cover.webp"
coverImageAlt: "A dim office desk with a monitor showing a blurred terminal, a blank notebook and a pen, cool overhead light, no logos and no readable text."
category: devops
tags: ["GitHub Actions", "GitHub Apps", "self-hosted runners", "TLS", "GHE"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "45 minutes"
prerequisites:
  - "A GitHub App that mints installation tokens, or a workflow that stores those tokens in a fixed-width field"
  - "If you run self-hosted runners on GitHub Enterprise Cloud, a way to read the runner version on each machine"
  - "If you use GitHub Enterprise Cloud with data residency, a TLS client or proxy you can inspect before Oct. 7"
osCompatibility:
  - "GitHub Enterprise Cloud, including data-residency hosts for the TLS change"
  - "Self-hosted Actions runners that register to GitHub Enterprise Cloud"
---

Three changelog posts landed in the last week, and only one of them is still in the future. [On Oct. 2 GitHub said the stateless installation-token rollout is done](https://github.blog/changelog/2026-10-02-stateless-github-app-installation-tokens-rolled-out). [On Sept. 28 it moved self-hosted runner enforcement up to Sept. 29](https://github.blog/changelog/2026-09-28-self-hosted-runner-version-enforcement-date-has-moved). [On Sept. 30 it set Oct. 7 as the day X25519-only TLS stops working for GitHub Enterprise Cloud with data residency](https://github.blog/changelog/2026-09-30-x25519-only-tls-ends-for-ghe-com-on-september-15). I am treating them as one operations list. A token format, a runner version, and a TLS group are the same kind of failure: a client that assumed last year's shape.

We wrote the runner install path in [self-hosted runners, the long way](/posts/github-actions-self-hosted-runners-setup/). We wrote the early-September Actions knobs in [three settings GitHub added, and why August made them necessary](/posts/github-actions-september-2026-updates/). We wrote the tag-reuse incident in [actions-cool came back with the old tags](/posts/actions-cool-tags-back-shai-hulud-2026/). This week is not a new product. It is the date those assumptions expire.

## The new GitHub App token is about 520 characters

The staged rollout began on April 27, 2026. The Oct. 2 post says it is complete. By default, newly minted GitHub App installation tokens are in the stateless `ghs_APPID_JWT` format. GitHub's reason, in that post, is faster issuance and validation, and better reliability of the API. I cannot check the latency claim from the changelog. I can check the format, because the format is what breaks a column.

Installation tokens still start with `ghs_`. They are now about 520 characters long instead of 40. If you stored the token in a `varchar(40)`, a 64-character buffer, a log line you truncate, or a test fixture copied from a 2024 sample, new tokens will not fit. Old tokens keep working until they expire. The expiration is still one hour. So the breakage is not "everything failed on Oct. 2." It is "the next mint, in any app that has rolled onto the default, no longer fits the field."

Permissions, repository scoping, and the installation access token REST endpoint are unchanged. That is the sentence that will get someone to skip the migration. The endpoint is the same. The secret it returns is not the same length. A client that only checks the `ghs_` prefix will accept the new token and then fail later, when a database insert truncates it or a header proxy rejects a long Authorization value. I would look for the length assumption before I look for a new API host. There is no new host in this post.

The temporary request header `X-GitHub-Stateless-S2S-Token` was how you could ask for the new format on demand while the rollout was partial. GitHub will deprecate that header on Nov. 30, 2026. After that date the header is ignored, and all eligible apps always receive stateless tokens. If you added the header to force the new format in a canary, remove it from production before Nov. 30, after you have watched both shapes succeed. Leaving a header that the server will stop honoring is not a security bug by itself. It is a lie in your client: you will think you are opting in, and you will be on the default either way.

What I would actually check this week:

- Find every place an installation token is persisted. Column width, secret store limits, structured logs that clip fields, and fixtures in tests.
- Mint one token from a non-production app and measure the length. Expect something near 520, still prefixed `ghs_`. Do not paste it into a ticket.
- Confirm the one-hour expiry is still what your refresh loop assumes. A longer token does not mean a longer life.
- If any client sends `X-GitHub-Stateless-S2S-Token`, put Nov. 30 on the calendar and delete the header once both formats have been seen.

I am not printing a sample token. A 520-character secret does not belong in a blog, and the changelog does not include one. The format name `ghs_APPID_JWT` is the template. Your app id and the JWT payload are the variable part. If your parser splits on underscore and assumes exactly two fields, read the template again before you ship the split.

## Runner enforcement already started

The Sept. 28 post is easy to misread if you only see "date has moved" and feel relief. The date moved earlier, not later. The change shipped Monday, Sept. 28, 2026. Full enforcement began Tuesday, Sept. 29, 2026, instead of whatever date had been announced before. Today is Oct. 4. The enforcement date is in the past.

The requirements did not change with the date. Self-hosted runners below version `2.329.0` cannot register or reregister. Existing runners below the minimum version required to execute workflow jobs stop running jobs, even if they were registered before. That second minimum is higher than `2.329.0`, and the changelog extract does not print the number. I am not going to invent it. GitHub points at a REST API for runner version deprecations that returns registration and runtime deprecation dates for a given version. If you need the job-execution floor, ask that API. Do not copy a version from a forum post into an Ansible pin because this article left a blank.

The failure mode is quiet if you are not watching the runner page. A runner that cannot reregister fails the next time the process restarts, or the next time the registration token is renewed. A runner below the job floor can sit in the pool looking registered and then refuse work. Both show up as queued workflows, not as a red banner that says "you missed Sept. 29." If your Monday morning is a pile of queued jobs on Enterprise Cloud and the GitHub-hosted runners are fine, the self-hosted fleet is the first place I would look, and I would look at version before I look at disk.

We already have a setup guide for the runner binary. This post is the reason to re-read the version step. An image you baked in the spring can be under `2.329.0` and still be the image your autoscaler launches. Updating the documentation does not update the AMI. The check is the version string on the machine that is supposed to take the job, not the version in the repo's README.

A practical pass:

- List runners and record the version. Anything under `2.329.0` cannot register again. Treat a restart of that process as an outage you have already scheduled by doing nothing.
- For runners at or above `2.329.0`, query the deprecation API before you assume they can still execute jobs. The changelog says the execution floor is higher. Get the number from GitHub, then pin it.
- If jobs are queued only on the self-hosted labels, compare those labels to GitHub-hosted runs of the same workflow. A split result is a runner problem. A failure on both is a workflow problem.
- Do not "fix" this by switching a production job to a public runner to get through the day, unless you have already decided that code can leave the network. The version bump is smaller than that decision.

## Oct. 7 is a TLS allow-list, and it is not github.com

Beginning Oct. 7, 2026, GitHub Enterprise Cloud with data residency will refuse TLS connections from clients that offer only X25519 for key agreement. The endpoints still support the FIPS-approved groups P-256 (`secp256r1`) and P-384 (`secp384r1`). Current browsers, operating systems, GitHub CLI releases, and the TLS libraries people usually ship already offer P-256. GitHub's line is that most customers do not need to do anything. I believe the "most," and I would still find the clients that are not most.

You are in the affected set if an application, a proxy, a security appliance, or a TLS library is configured to offer only X25519. That configuration shows up in locked-down egress proxies more often than in laptops. A developer laptop that can open the GitHub website is not the test. The test is the machine that talks to your `ghe.com` host from CI, from a registry proxy, or from a management tool someone hardened in 2024 by deleting every key-exchange group except the one a blog called modern.

Before Oct. 7, the changelog's list is short. Update the operating system, the runtime, the GitHub CLI, the proxy, and the TLS libraries to supported versions. Remove any X25519-only configuration. Make sure P-256 is enabled. You may also enable P-384. After Oct. 7, an X25519-only client cannot complete HTTPS to those endpoints. SSH is not part of this change. If your deploy path is `git+ssh` and never HTTPS, this post is not your outage. If your deploy path is HTTPS through a corporate TLS interceptor, it might be.

The slug on the changelog URL still says September 15. The title says October 7. I am following the title and the body, both of which say Oct. 7, 2026. A slug that was not renamed is not a second deadline. It is a leftover from an earlier draft of the same retirement. Do not build a calendar entry for Sept. 15 off the URL.

Scope is the other place people will over-apply this. The change is GitHub Enterprise Cloud with data residency. It is not, in this post, a change to the public github.com API. If you do not have a data-residency host, do not spend the week rebuilding every container's OpenSSL. If you do have one, the clients that talk to it are the list, including the ones inside CI images that nobody opens until the job fails.

A short test, if you own that host:

- From the CI image, not from your laptop, confirm the client offers P-256. A laptop success does not count.
- If a proxy terminates TLS, check the proxy's offered groups. The proxy is the client GitHub sees.
- Leave SSH alone unless you were already rotating keys for another reason. This changelog does not ask you to.
- If you cannot tell whether a box is X25519-only, GitHub's post says to contact GitHub Support rather than guess. I would rather you do that than disable TLS verification to "get past Oct. 7."

## What I would do before Friday

Oct. 7 is Wednesday. Nov. 30 is the header. Sept. 29 already happened. The order is the runner fleet first, because that failure is available today, then the TLS clients that talk to a data-residency host, then the token length, which breaks on the next mint rather than on a clock you can see.

I would not bundle these into a platform rewrite. A column widened to fit 520 characters, a runner image at a version the deprecation API still allows to run jobs, and a proxy that offers P-256, are three small changes. The way they become an incident is a buffer from 2024, an AMI from the spring, and a proxy profile someone named "modern curves." The changelog posts are short on purpose. The work is finding the client that still believes the old length, the old runner, and the single curve.
