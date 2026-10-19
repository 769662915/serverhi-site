---
title: "Desktop 4.96.0 Is Oct. 19. The Package Row Is 4.95."
description: "Docker's release notes date Desktop 4.96.0 to Oct. 19, with Engine 29.9.1. The Chocolatey table I read still topped out at 4.95.0, dated Oct. 14."
pubDate: 2026-10-20
coverImage: "./cover.webp"
coverImageAlt: "A closed laptop on a rack shelf beside a plain USB stick, cool room light, the screen dark, no logos."
category: docker
tags: ["Docker Desktop", "Docker Engine", "containerd", "Chocolatey", "upgrade"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "15 minutes"
prerequisites:
  - "A machine you can afford to update, not the only Docker host in production"
  - "docker version and the Desktop About box, so you can write down the string you actually have"
  - "The release notes page open, not a package-mirror screenshot"
osCompatibility:
  - "Docker Desktop 4.96.0 (docs date 2026-10-19; rollout may lag)"
  - "Docker Desktop 4.95.0 (docs date 2026-10-12; Chocolatey row said Oct. 14)"
  - "Docker Desktop 4.63 or newer if you only need the agent plugin from the earlier note"
---

The release notes and the package table are not on the same version. [Docker's Desktop release notes](https://docs.docker.com/desktop/release-notes/), read on October 20, date 4.96.0 to 2026-10-19. The updates block on that version lists Docker Engine v29.9.1, containerd v2.4.2, and Docker Agent v1.149.0. [The Chocolatey community package page](https://community.chocolatey.org/packages/docker-desktop), in the table extract from the same morning, still has Docker Desktop 4.95.0 as the top row, last updated Wednesday, October 14, 2026. I did not see 4.96.0 in that extract. A host that "matches latest" depends on which latest you opened.

[We already had the agent plugin on Desktop 4.63 and newer](/posts/docker-agent-yaml-desktop-463-2026), from the docker-agent README, not from a version race. [We already had the Hub token move](/posts/docker-hub-cve-2026-105445-pat-moved-2026), which is a registry advisory, not a Desktop bump. [We already had a module that did not follow the package it was built against](/posts/nginx-module-abi-mismatch-apt-2026). This note is the same habit on Docker's own version string: the docs date, the engine build, and the mirror row do not have to move on the same day.

## 4.96.0 is a date, and then a list of component versions

The release notes page says releases are gradually rolled out. If the latest version is not yet available to you, allow some time. Updates typically become available within a week of the release date. That sentence is the reason a missing 4.96.0 on October 20 is not, by itself, a failed install. October 19 plus a week is October 26. I am not telling you to wait until the 26th. I am saying the page you are using as "latest" has already told you the binary can lag the note.

4.96.0's updates block, as I read it, is:

| Component | Version on the 4.96.0 note |
| --- | --- |
| Credential helpers | v0.9.10 |
| containerd | v2.4.2 |
| Docker Desktop Build | v0.39.0 |
| Docker Offload | v0.7.4 |
| docker pass | v0.3.0 |
| Docker Engine | v29.9.1 |
| Docker Buildx | v0.38.0 |
| Docker Agent | v1.149.0 |

Those are eight strings. `docker version` will not print all of them. The engine line is the one `docker version` is likely to show as Server Version, if the engine that started is the one the note shipped. Client and server can disagree if the CLI and the engine were updated on different days. I am not going to tell you that a Server Version of 29.9.1 proves you are on Desktop 4.96.0. It is consistent with that note. It is not a Desktop build number. The About box, or `docker version` if it prints a Desktop line on your platform, is the Desktop string. Write both down before you call an upgrade done.

The same 4.96.0 block lists bug fixes that are operational, not marketing. On all platforms, the note says it fixed an error dialog that could close unexpectedly on systems under memory pressure. It fixed Docker Desktop's internal DHCP replies being sent onto the host's physical network. It fixed the reclaimable space on the Images view staying at 0 when a local image has no history. The DHCP line is the one I would actually test if I were on a network that should not see Desktop's internal replies. The note does not print a CVE id next to it. I am not going to invent one. A fix in release notes is a fix in release notes. It is not an advisory number until an advisory prints one.

Debian and RPM, on the 4.96.0 download block I parsed, showed a dash where Windows, Mac, and Arch had a checksum link. I am not going to treat the dash as "no Linux build." It is what the HTML showed in that cell. If you install from a distro package, check the checksum the way that package's own page tells you to, and do not assume the Mac checksum link applies.

## 4.95.0 is October 12 on the docs, and October 14 on the package row

The release notes date 4.95.0 to 2026-10-12. The updates I captured there are Docker Compose v5.6.0, Docker Offload v0.6.73, Docker Scout CLI v1.26.0, and Docker Agent v1.145.0. I did not see an Engine version in that 4.95.0 updates list. The previous note, 4.94.0, is dated 2026-10-05 and lists Docker Engine v29.8.2, containerd v2.3.6, and Docker Agent v1.144.0. So the engine string I can attach to a note before 4.96.0, from the text I kept, is 29.8.2 on October 5, and 29.9.1 on October 19. The October 12 note did not, in the block I saved, name an engine. If your Server Version is 29.8.2, you are consistent with 4.94.0's list, not with 4.96.0's. You might also be on 4.95.0 with an engine line the 4.95.0 block did not repeat. I am not going to close that gap by guessing.

Chocolatey's top row, in the extract, is Docker Desktop 4.95.0, 2541 downloads, last updated Wednesday, October 14, 2026, status Approved. The next row is 4.94.0, last updated Wednesday, October 7, 2026. The docs date for 4.95.0 is October 12. The package row's last-updated date is October 14. Both can be true. A release note date and a community-package upload date are different clocks. What they cannot be is one sentence: "4.95.0 came out on October 14." The note says October 12. The package page says the row was last updated on October 14. If your change ticket needs a date, pick the document.

The weekly cadence on that Chocolatey table, 4.95.0 on October 14 and 4.94.0 on October 7, looks tidy. The docs are also weekly, but the dates are October 19, October 12, and October 5, not the Chocolatey Wednesdays. October 19 was a Monday. October 12 was a Monday. October 14 was a Wednesday. The package row is two days after the 4.95.0 note, and it had not, in the extract I read on October 20, grown a 4.96.0 row for the Monday note. That is a lag of at least one note, as of the extract. It is not a statement that Chocolatey will never list 4.96.0. It is a statement that "the package page's top row" and "the release notes' top heading" were different strings on the morning I read them.

## Agent 1.149.0 is not the 4.63 install floor

The October 11 note on this site said Desktop 4.63 and newer already includes the `docker agent` plugin, because that is what the docker-agent README said. The release notes page, read today, dates 4.63.0 to 2026-03-02. That date was not in the October 11 note. I am adding it only as the date on the same release-notes page, not as a correction of the README's install floor. 4.63 remains the floor for "the plugin is already there," if you are still following the README. 4.96.0 is a different question: which Agent build you have, not whether the plugin exists.

4.94.0 lists Docker Agent v1.144.0. 4.95.0 lists v1.145.0. 4.96.0 lists v1.149.0. That is a jump of four agent builds from the October 12 note to the October 19 note, and a jump of five from October 5. I counted those from the version suffixes. The release notes do not print a changelog line that says "four agent builds." If `docker agent` works, you have cleared the 4.63 floor. If you need the agent build named on the October 19 note, you need a Desktop that actually shipped 1.149.0, which the note attaches to 4.96.0. A 4.95.0 install, even a fresh one from the Chocolatey row dated October 14, is attached in the docs to agent 1.145.0, not 1.149.0.

containerd moves on a different counter. 4.94.0 lists containerd v2.3.6. 4.96.0 lists v2.4.2. 4.95.0's updates block, in what I saved, does not mention containerd. Same gap as the engine. Do not invent a 4.95.0 containerd string because the neighbors have one.

## The October 14 blog is not a Desktop version

[Docker's Harbor and Sandboxes post, dated October 14](https://www.docker.com/blog/harbor-docker-sandboxes-run-safe-reproducible-agent-evals), says Harbor can now run every eval task in Docker Sandboxes, and that Sandboxes are MicroVM environments for agents such as Claude Code, Codex, and Cursor. It says you can start for free on local Sandboxes and scale to Cloud Sandboxes. October 14 is also the Chocolatey last-updated date for the 4.95.0 row. Those two October 14s are not the same release. The blog does not print 4.95.0 or 4.96.0 in the extract I used. A ticket that says "we took the October 14 Docker update" has to say whether it means the package row, the Harbor blog, or neither, because the Desktop note for that week was October 12, and the next Desktop note was October 19.

The blog's neighboring card, in the page chrome, points at the Hub token advisory from October 1. That advisory is the one this site already split from a "secret moved" headline. It is not a reason to upgrade Desktop to 4.96.0, and 4.96.0's DHCP fix is not a reason to rotate a Hub token. Different documents. Different actions.

## Check the string you have before you quote the note

On a machine you can update, not the only engine a deploy depends on, read the version before you pull.

```bash
docker version
```

Write down Client and Server. Then open Docker Desktop's About box, or the equivalent on Linux, and write down the Desktop version. Compare that string to the release notes, not to a screenshot of a package table from last week.

If About says 4.96.0, the note you want is the October 19 block: Engine v29.9.1, containerd v2.4.2, Agent v1.149.0, Buildx v0.38.0. If Server Version is not 29.9.1, you do not have the engine line that note listed. Do not "fix" it by editing a dashboard to say 29.9.1. Find out which engine actually started.

If About says 4.95.0, you are on the October 12 note, even if Chocolatey says the package row was touched on October 14. The agent string that note lists is v1.145.0. The engine string is the one that note did not repeat in the updates block I saved. Read `docker version` and keep that output. Do not backfill 29.8.2 from the October 5 note unless that is the string you actually see.

If About says 4.63 through 4.94, the agent plugin can still be present. That was the README's point, and it is still the point. It is not 4.96.0. The rollout sentence says a note can exist for a week before the binary is offered to you. October 20 is one day after October 19. A missing update button is compatible with the page's own rollout line. It is also compatible with a mirror that has not built the package. Those are different waits. The docs page tells you about the first. The Chocolatey extract, as of this morning, is evidence of the second only for that one community package, not for Docker's own download buttons.

The page also says Desktop versions older than six months from the latest release are not available for download. If latest is 4.96.0 on October 19, six months back is the middle of April. 4.63.0 is dated March 2 on that same page, which is more than six months before October 19. I am not going to tell you the March build disappeared from every mirror. I am telling you the release notes page says builds older than six months from latest are not offered for download there. If a script still pins 4.63.0 by URL from Docker's current download list, that pin can fail for a reason that has nothing to do with the agent plugin still being the right install floor. The floor and the download availability are different sentences. Write both, or you will "fix" a 404 by jumping to 4.96.0 on a host that only needed `docker agent` to print help.
