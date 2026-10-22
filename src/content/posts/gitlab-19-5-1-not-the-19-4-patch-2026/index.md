---
title: "19.5.1 Is Not the Patch for a 19.4 GitLab."
description: "GitLab's Oct. 21 patch says CVE-2026-110264 is fixed at 19.5.1, and also at 19.4.3, 19.3.6, and 18.11.13. A 19.4 host is not done because 19.5.1 exists."
pubDate: 2026-10-23
coverImage: "./cover.webp"
coverImageAlt: "A closed clipboard and a short ethernet cable on a steel server shelf, warm side light, no readable version numbers."
category: devops
tags: ["GitLab", "CVE-2026-110264", "self-managed", "patch release", "CI"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "25 minutes"
prerequisites:
  - "The installed GitLab version from the admin banner or gitlab-rake, not the version a blog said to install"
  - "Whether the host is CE or EE, because two of the lower-scored issues in this release are EE-only"
  - "A maintenance window, because the fixed build depends on which minor you are already on"
osCompatibility: ["GitLab CE", "GitLab EE", "self-managed"]
---

The patch page lists seven fixed builds. A headline that keeps one of them will leave the other six hosts unpatched, or it will push a minor upgrade nobody's change window allowed. [GitLab's October 21 patch document](https://docs.gitlab.com/releases/patches/patch-release-gitlab-19-5-1-released) is titled for 19.5.1, 19.4.3, 19.3.6, 19.2.9, 19.1.9, 19.0.10, and 18.11.13. [CyberSecurityNews the next morning](https://cybersecuritynews.com/12-year-old-gitlab-vulnerability/) says the fixes were published October 21 and that CVE-2026-110264, CVSS 10.0, reaches back to GitLab 7.0, released in 2014. The Hacker News headline the same day says a CVSS 10.0 flaw could allow unauthenticated remote code execution across 12 years of releases. I could read that headline. I could not read the article body. The version table I am willing to patch from is GitLab's, not a headline's.

We already had a notice whose blog still said pending. [USN-8932-1 lists curl versions the blog had not caught up to](/posts/usn-8932-1-curl-blog-says-pending-2026). We already had a package row that was one build behind the release note. [Desktop 4.96.0 was not the 4.95 row](/posts/docker-desktop-496-not-495-2026). We already had an upgrade that fails for a reason that is not the version string you typed. [Kubernetes 1.35 will not boot a cgroup v1 node](/posts/kubernetes-1-35-cgroup-v1-check-2026). GitLab 19.5.1 is the same class of problem. The string in the URL is not the string every vulnerable host should land on.

## CVE-2026-110264 is the 10.0. The page has other scores

GitLab titles CVE-2026-110264 as an integer overflow in the regular expression compiler, affecting CE and EE. The impacted range is all versions from 7.0 before 18.11.13, 19.0 before 19.0.10, 19.1 before 19.1.9, 19.2 before 19.2.9, 19.3 before 19.3.6, 19.4 before 19.4.3, and 19.5 before 19.5.1. The CVSS line next to that entry is 10.0, vector `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H`. PR:N and UI:N are why the headlines can say unauthenticated. The vector is GitLab's. The word RCE is CyberSecurityNews's table and The Hacker News headline. GitLab's title in the extract I used says integer overflow in the regular expression compiler. CyberSecurityNews's table says an integer overflow while compiling a specially crafted regular expression could allow an unauthenticated attacker to execute code on the GitLab server. Those two sentences match closely enough that I am treating them as the same issue. I am not treating every other CVE on the page as the same issue.

The reporter line GitLab prints for this one is joaxcar, through HackerOne. CyberSecurityNews does not name the reporter in the paragraphs I kept. A writeup that credits a different handle has mixed entries. The page has several thank-you lines. altair00 is attached, in the extract, to a credentials issue scored 4.3, not to the 10.0.

CyberSecurityNews says the patch release addresses 12 vulnerabilities overall. I did not get twelve fully separated entries out of the chunked doc page. I can name the ones whose titles and scores stayed attached to each other, and I can refuse the ones whose descriptions arrived glued. The 12 is CyberSecurityNews's count of the release. It is not a count I re-derived by listing titles. If you need the twelfth name, open the doc. Do not let me invent it.

The ones I can keep distinct:

| CVE | What the page calls it | Score I will stand on | Who |
| --- | --- | --- | --- |
| CVE-2026-110264 | Regex compiler integer overflow | 10.0, GitLab and CyberSecurityNews | CE and EE |
| CVE-2026-15723 | OmniAuth-to-LDAP auto-linking | 8.2, CyberSecurityNews's table | CE and EE |
| CVE-2026-112212 | OAuth/OIDC discovery cache poisoning | 7.5, CyberSecurityNews; a 7.5 vector is also on the GitLab extract | CE and EE |

GitLab's extract also has an unauthenticated credential-retrieval issue scored 4.3, impacted from 17.6.5 before 19.3.6, 19.4 before 19.4.3, and 19.5 before 19.5.1, reported by altair00. The CVE number did not stay glued to that paragraph in the extract, so I am not assigning one. I am also not folding it into CVE-2026-110264 because both can be described as unauthenticated. One is CVSS 10.0 and a regex compiler. The other is CVSS 4.3 and response headers, in the paragraph that says an unauthenticated user could have retrieved sensitive internal server credentials due to improper filtering of internal response headers. PR:L is in that 4.3 vector, which is a worse fit for "no login at all" than the 10.0 vector's PR:N. I would not brief a manager that every unauthenticated line on this page is a 10.0.

EE-only items are a third pile. The extract includes an approval-policy bypass on protected branches, EE, from 17.4, scored 3.1, and a Duo availability lock bypass, EE, from 19.2, scored 2.7. A CE host does not become safe by ignoring them, because the 10.0 is CE and EE. A CE host also does not need an EE-only Duo fix explained as if it were the reason for the page. Read the edition before you read the score.

## GitLab 19.5.1 fixes the 19.5 line. It is not the only fixed build

This is the part a CI job will get wrong if the job's only pin is the version in the URL.

GitLab says the fix was backported to 18.11.13, 19.0.10, 19.1.9, and 19.2.9, in addition to the standard patch releases. The impacted line fills in the rest: 19.3 before 19.3.6, 19.4 before 19.4.3, 19.5 before 19.5.1. Put the title and the impacted line together and the fixed builds are:

| Your minor | Fixed build |
| --- | --- |
| Anything from 7.0 up through the 18.11 line | 18.11.13 |
| 19.0 | 19.0.10 |
| 19.1 | 19.1.9 |
| 19.2 | 19.2.9 |
| 19.3 | 19.3.6 |
| 19.4 | 19.4.3 |
| 19.5 | 19.5.1 |

A host on 19.4.2 is before 19.4.3. It is in the impacted range. Installing 19.5.1 also leaves that range, because 19.5.1 is not before 19.5.1. Both can be a fix. They are not the same change. Jumping from 19.4 to 19.5 is a minor upgrade. Landing on 19.4.3 is a patch on the minor you already run. CyberSecurityNews's piece, in the text I kept, tells you the flaw and the date. It does not, in those paragraphs, print this table. A runbook that says "upgrade to 19.5.1" is choosing the top row of the title. It is a valid choice if your compatibility window includes 19.5. It is a false instruction if the platform team froze 19.4 for the quarter.

The 18.11.13 backport is the one a long-lived host needs to see. "From 7.0 before 18.11.13" means a 16.x or a 17.x or an early 18.x is not patched by being old. It is patched by getting to 18.11.13, or by moving onto one of the 19.x fixed builds. I am not going to recommend a skip-level upgrade path. I am going to say the doc's floor for that long range is 18.11.13, and that "we are not on 19" is not a mitigation.

GitLab 7.0's 2014 date is CyberSecurityNews's, not a sentence I found on the doc page. Roughly 12 years, from 2014 to 2026, is also CyberSecurityNews's arithmetic, and it matches The Hacker News headline's "12 years." CyberSecurityNews adds the sentence the headline does not have room for: that history does not mean attackers have been using the bug for 12 years. The advisory, it says, does not report confirmed attacks and does not provide a public exploit. A scanner that marks every GitLab since 2014 as "actively exploited" has upgraded a version range into an incident report. The range is real. The confirmed-attack line, in that article, is absent.

There is a forum thread whose title I can read and whose body I could not fetch: a self-hosted GitLab CE 19.5.1 that asks to update even though it is already the latest. I am not quoting a fix from a thread I did not read. I am noting that "19.5.1" and "the admin banner says update" can show up in the same week as a critical patch, and that a banner is not a version. Check the installed build. The banner is a second document. We have already watched a package row and a release note disagree by one build. This would be the same check.

## The 8.2 and the 7.5 do not have the 10.0's version floor

If you only patch for the regex bug, you can still miss the floor on the neighbors, because their ranges are shorter.

CyberSecurityNews scores CVE-2026-15723 at 8.2. Its table says improper input handling during OmniAuth-to-LDAP account linking could let an authenticated attacker take over an LDAP-backed account when SAML and LDAP auto-linking are both enabled. Authenticated, and both features on. That is not the 10.0's PR:N. A host that does not use SAML-to-LDAP auto-linking is outside the condition CyberSecurityNews states. A host that does is not safe because someone briefed only the regex CVE. GitLab's title for 15723 matches that feature area: improper authentication in OmniAuth-to-LDAP auto-linking email lookup. The extract did not keep a clean impacted-version line for 15723 separate from the next CVE's paragraph. I will not invent "from 7.0" for an 8.2 that the other article does not date to 2014.

CVE-2026-112212, 7.5 on CyberSecurityNews's table, is poisoned OAuth and OpenID Connect discovery responses that could redirect certain flows to an attacker-controlled server. The GitLab extract has a matching description, an unauthenticated user poisoning a shared cache's OAuth/OIDC discovery document, scored 7.5, impacted from 18.3 before 19.3.6, 19.4 before 19.4.3, and 19.5 before 19.5.1. The 7.5 vectors are close but not identical on the page scraps I have. CyberSecurityNews prints 7.5 and the effect. GitLab's extract prints `CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:C/C:H/I:L/A:L` next to the cache-poison paragraph. UI:R is user interaction. The 10.0 vector's UI:N is not. A ticket that says "same as the critical, just lower" has erased the interaction bit.

The version floor is the operational difference. The cache-poison range in that extract starts at 18.3, not at 7.0. A 16.11 host can be inside the regex bug's range and outside this cache-poison range. Patching to 18.11.13 covers the regex line's long tail. It does not, by itself, tell you whether 18.11.13 includes the 7.5 fix. The backport sentence I have, "backported this fix to 18.11.13, 19.0.10, 19.1.9, and 19.2.9," sits under the CVE-2026-110264 heading. "This fix" is the regex fix until the page says otherwise. I will not assume the 7.5 rode along on the 18.11 backport without a line that says so. On 19.3, 19.4, and 19.5, the fixed builds named for the cache-poison range match the fixed builds named for the regex bug: 19.3.6, 19.4.3, 19.5.1. Same landing zone, different start.

The 4.3 credential issue starts at 17.6.5, again in the extract, and shares those same three landing zones for the 19.3, 19.4, and 19.5 lines. A 19.4.3 upgrade that you scheduled for the 10.0 also clears the "before 19.4.3" clause on the 4.3 and on the 7.5, if you trust the extract's version lines. That is a reason to prefer the doc's per-minor fixed build over a single slogan. It is not a reason to skip reading which CVE your scanner actually flagged.

## What I would check before the pipeline bumps the image

Read the installed version first. The admin banner is not the version, especially in a week when a forum title says 19.5.1 still asks to update. Map the minor to the table above. If you are on 19.4, 19.4.3 is the patch build. 19.5.1 is a different minor. If you are below 18.11.13 and not already on a fixed 19.x, the doc's long-range floor is 18.11.13.

Then read the CVE your scanner named. CVE-2026-110264 is the 10.0, CE and EE, unauthenticated in the vector, regex compiler, from 7.0. CVE-2026-15723 is the 8.2, authenticated, and it needs SAML plus LDAP auto-linking in the description CyberSecurityNews printed. CVE-2026-112212 is the 7.5 discovery-cache issue, with a floor at 18.3 in the GitLab extract, not at 7.0. The 4.3 header issue is real in the extract and is not the 10.0. The EE-only 3.1 and 2.7 are not a reason for a CE host to ignore the regex bug, and they are not the regex bug.

CyberSecurityNews says it has not seen a public exploit or a confirmed attack in the advisory. That is a reason to patch on a window you control, not a reason to wait for a logo to appear in a breach blog. The 12-year figure is an age of the code path, dated by that article to the 7.0 release in 2014. It is not a dwell-time measurement. The Hacker News headline uses the 12 years. I did not get its body, so I am not using it for versions. The versions are on the doc page, and there are seven of them.
