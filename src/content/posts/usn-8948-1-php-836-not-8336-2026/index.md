---
title: "USN-8948-1 Fixes PHP 8.3.6. The Expected Build Is 8.3.36."
description: "USN-8948-1 lists php8.3 8.3.6-0ubuntu0.24.04.13 as fixed. Beaumont's expected upstream build, which PHP had not confirmed, was 8.3.36."
pubDate: 2026-10-24
coverImage: "./cover.webp"
coverImageAlt: "A closed notebook and a blank sticky note on a steel shelf, warm side light, no labels and no logos."
category: security
tags: ["Ubuntu", "USN-8948-1", "PHP", "CVE-2026-109618", "CVE-2026-109619"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "15 minutes"
prerequisites:
  - "The release name from /etc/os-release, not the PHP version a different host reported"
  - "The installed php package version, including the ubuntu revision after the hyphen"
---

The package that Ubuntu calls fixed does not look like the build Kevin Beaumont expected. [USN-8948-1](https://ubuntu.com/security/notices/USN-8948-1) lists `8.3.6-0ubuntu0.24.04.13` for the php8.3 packages on Ubuntu 24.04 LTS. [Cyber Kendra on October 21](https://www.cyberkendra.com/2026/10/php2shell-cve-2026-109618-cve-2026-109619.html) says Beaumont, via Tenable, reported the expected fixed builds as 8.5.12, 8.4.27, 8.3.36, and 8.2.35, and that PHP had not confirmed those numbers. 8.3.6 and 8.3.36 share a major and a minor. They are not the same upload. A check that waits for 8.3.36 on noble will sit there while the notice's fixed revision is already a string that starts with 8.3.6.

[Kingy's October 21 guide](https://kingy.ai/blog/php2shell-website-security-guide) cites the same notice and makes the point directly: distributions can apply a security patch while retaining an older upstream version number. The examples it prints are `8.3.6-0ubuntu0.24.04.13` for 24.04 and `8.1.2-1ubuntu2.28` for 22.04. Those match the rows I read on the USN page. An upstream-number comparison misses the revision. That is the whole operational difference.

We already had a notice whose versions were not the blog's status word. [USN-8932-1 listed curl builds the blog still called pending](/posts/usn-8932-1-curl-blog-says-pending-2026). We already had a USN that was one package and not the language runtime next to it. [USN-8933-1 was RabbitMQ, not the Go fix](/posts/usn-8933-1-rabbitmq-not-golang-2026). We already had a kernel USN that was not the OEM string. [USN-8920-1 was a 5.4 kernel](/posts/ubuntu-usn-8920-5-4-not-oem-2026). This one is PHP2Shell's two CVEs, and a fixed package whose version sorts below the build people will Google.

## USN-8948-1's 8.3.6 is not upstream 8.3.36

Read the notice's table as package versions, not as upstream tags.

On the USN page I extracted, Ubuntu 24.04 LTS noble lists `libapache2-mod-php8.3`, `php8.3-cgi`, `php8.3-cli`, and `php8.3-fpm` at `8.3.6-0ubuntu0.24.04.13`. Ubuntu 22.04 LTS jammy lists `libapache2-mod-php8.1`, `php8.1-cgi`, and `php8.1-cli` at `8.1.2-1ubuntu2.28`. The extract cut off at the jammy cli row. I am not going to invent a jammy fpm line I did not see, and I am not going to claim the notice omits it. Kingy names the 22.04 revision as `8.1.2-1ubuntu2.28` without listing every binary package. If you are on jammy, the revision is the part to match, on the package you actually have installed.

Two newer releases are on the same notice, and neither of them is 8.5.12. Ubuntu 26.10, stonking, lists `libapache2-mod-php8.5`, `php8.5-cgi`, `php8.5-cli`, and `php8.5-fpm` at `8.5.9-0ubuntu2.1`. Ubuntu 26.04 LTS, resolute, lists that same php8.5 set at `8.5.4-0ubuntu1.5`. Beaumont's expected 8.5 line was 8.5.12. 8.5.9 and 8.5.4 are lower than 8.5.12 if you compare the upstream triple and ignore the Ubuntu suffix. They are the versions the notice prints as the update. A script that treats "less than 8.5.12" as "still vulnerable" will flag both 26.10 and 26.04 after this USN, which is the false positive Kingy is warning about, applied to releases Kingy's two examples did not name.

The suffix is the patch. `8.3.6-0ubuntu0.24.04.13` is not "PHP 8.3.6 from 2024 with no security fix." The `.13` is a revision counter on the noble package. `8.5.9-0ubuntu2.1` is not "8.5.9 as upstream shipped it on a quiet Thursday." The `-0ubuntu2.1` is the distro build. I did not diff the patches. I am not claiming the Ubuntu revision contains every commit that would be in 8.3.36. I am claiming that the notice's fixed version and Beaumont's expected upstream version are different strings, and that only one of them is what `dpkg` will print on noble.

Cyber Kendra is explicit that PHP had not confirmed 8.5.12, 8.4.27, 8.3.36, and 8.2.35. Those four are "expected fixed builds," reported by Beaumont per Tenable, not a php.net tag I verified. The last regular builds Cyber Kendra cites, from the PHP news archive, were 8.5.11, 8.4.26, 8.3.35, and 8.2.34, released September 24. Even against that regular set, noble's 8.3.6 is far below 8.3.35, and 26.10's 8.5.9 is below 8.5.11. That gap is normal for a distro that froze an upstream and then backported. It is not normal to paste into a Slack line as "we are 30 point releases behind, so we are unpatched." Thirty is the distance from 8.3.6 to 8.3.36 if you subtract the patch numbers and forget that 8.3.36 was unconfirmed. 8.3.36 minus 8.3.6 is 0.30 only if you treat the last component as a decimal, which it is not. Patch versions are integers. The distance is 30 patch levels of upstream numbering, and the Ubuntu package was never on that numbering after the freeze. Do not subtract them and call the result a lateness score.

## The score is 9.2, or someone posted 10.0

The CVEs are the same pair. The score is not.

USN-8948-1 describes two issues and does not, in the extract I kept, print a CVSS number. CVE-2026-109618: PHP incorrectly handled out-of-memory conditions while processing requests, and a remote attacker could use this to execute arbitrary code. CVE-2026-109619: PHP incorrectly managed internal request state across worker reuse, and a remote attacker could use this to execute arbitrary code. That is the impact sentence. I am not adding a request shape, a header, or a payload. The notice did not print one in what I read, and a version-check does not need one.

Cyber Kendra rates both flaws 9.2 on CVSS v4.0, and says they sit in PHP core, not in a single plugin, theme, or framework. The same piece says Florian Roth posted that the PHP core had a remote code execution bug rated CVSS 10.0. 9.2 and 10.0 are both "critical" in the loose sense people use in chat. They are not the same vector string. v4.0 is named only on the 9.2. Roth's 10.0, as relayed, does not say v3 or v4 in the sentence I have. A ticket that says "CVSS 10, so drop everything" has picked the posted number over the 9.2 the article itself leads with. A ticket that says "9.2, so it can wait until Friday" has invented a scheduling rule the score does not contain. Neither number is on the USN extract. For an Ubuntu host, the notice's package version is the thing that changes the package. The score does not.

The clocks on October 21 should stay labeled too. Cyber Kendra says PHP shipped emergency patches that day, October 21, a day ahead of a planned October 22 disclosure, because details leaked. The release target it prints is 14:00 UTC, which it glosses as 7:30 p.m. IST. 14:00 UTC is 19:30 in India, and 7:30 p.m. is 19:30. Those two clocks agree with each other. They do not agree with a second time in the same piece: an advanced notice at 19:33 UTC. The extract does not pin 19:33 to a calendar date in the sentence I kept. I am not folding 19:33 UTC and 14:00 UTC into one hour. As of 11:35 UTC, Cyber Kendra says, the fix had not shipped and both CVE records were still reserved. 11:35 is before 14:00 on the same UTC day, if both times are October 21. That reading fits the words. It is still a snapshot from a news page, not a statement about October 24.

watchTowr, in that account, believed it had reproduced CVE-2026-109618. Benjamin Harris said the vulnerabilities are real, and withheld details until patches ship. I am withholding them too. Reproduction is not a version string. The version string is what this note is for.

## 8.1 is end of life upstream, and jammy still has a revision

Scope is three sentences that people will collapse into one.

Cyber Kendra: the affected range is not confirmed. The leak claimed every version since PHP 5, and the demo video references PHP 5.4.0 and later. Only supported branches 8.2, 8.3, 8.4, and 8.5 will get fixes. PHP 8.1, 8.0, 7.x, and 5.x are end of life and will get no official patch, though Linux distributions may backport fixes. "No official patch" and "distributions may backport" are both in that paragraph. Ubuntu 22.04's row is the backport case. jammy's fixed package is `8.1.2-1ubuntu2.28`. Upstream, on Cyber Kendra's telling, is not producing an 8.1.x security release. The USN is. A runbook that says "8.1 is EOL, skip it" will skip the only jammy package the notice updates. A runbook that says "install 8.2.35 on jammy" will ask apt for a version the 22.04 row does not list.

8.2 and 8.4 are the other gap. Beaumont's list includes 8.2.35 and 8.4.27. The USN rows I read are 8.5 on 26.10 and 26.04, 8.3 on 24.04, and 8.1 on 22.04. I did not see an 8.2 package or an 8.4 package in the extract. That does not mean no Ubuntu release ships them. It means this notice's visible rows, in what I kept, do not use those two upstream lines. If your host is on a third-party PHP repository, Kingy says the Ubuntu revisions cannot establish that repo's fix status. Debian is called out the same way. A noble version string copied onto a sury.org package or a container image built from source is a category error. The USN updates Ubuntu's packages. It does not stamp every PHP binary on the machine.

Kingy also says the two Ubuntu examples are not universal PHP version targets. 8.3.6-0ubuntu0.24.04.13 is a noble package revision. It is not the version you should expect on 26.04, where the notice prints 8.5.4-0ubuntu1.5. Copying the 24.04 string into a 26.04 check will fail closed or fail open depending on how sloppy the comparison is. Either way it is the wrong string.

I did not get a publication date off the USN extract. Kingy and Cyber Kendra are both dated October 21 in the search record and in Cyber Kendra's "today, October 21." I am not backdating the notice to the leak morning. The versions are what I read on the notice page. The date of the notice, if you need it for a change ticket, should be read off the page header I did not keep, not invented from the news cycle.

The php.net 2026 archive chunks I pulled showed earlier bugfix announcements. They did not include 8.5.12 or 8.3.36. Cyber Kendra already said PHP had not confirmed those expected numbers. A missing line in a truncated archive extract is not a second confirmation. I am not announcing that upstream never shipped. I am not announcing that it did.

## What to compare on the host

Compare the installed revision to the notice row for that release. Do not compare it to 8.3.36.

On 24.04, the fixed php8.3 packages in the extract are at `8.3.6-0ubuntu0.24.04.13`. On 22.04, the jammy rows I saw are at `8.1.2-1ubuntu2.28`. On 26.04, php8.5 is at `8.5.4-0ubuntu1.5`. On 26.10, php8.5 is at `8.5.9-0ubuntu2.1`. The binary package names differ: `libapache2-mod-php8.3` is not `php8.3-fpm`, and a host can have one without the other. Match the package you run, not a sibling package on a different SAPI. Kingy's point about reading the query output, rather than treating a nonzero apt status as proof PHP is absent, is the right kind of caution. I am not pasting an upgrade command. The notice's update instructions were not in the extract I kept, and a command I invent would be a third source.

If the installed version is already the notice's string, the USN's fix for that package is what Ubuntu shipped under that name. If it is an older revision of the same upstream base, you are looking at a package the notice has superseded, and the next step is the notice, not a tarball of 8.3.36. If the binary is not an Ubuntu package at all, USN-8948-1 does not tell you the fix level. That includes the "every version since PHP 5" claim, which Cyber Kendra marks as unconfirmed, and the 5.4.0 demo reference, which is a video's range and not a distro map.

Paste 9.2 if you are quoting Cyber Kendra's CVSS v4.0 line. Paste 10.0 only as what Roth posted, as that page relays it. Paste neither number as Ubuntu's score. Paste 8.3.36, 8.5.12, 8.4.27, and 8.2.35 only as Beaumont's expected builds via Tenable, unconfirmed by PHP as of that October 21 article. Paste 8.3.6-0ubuntu0.24.04.13 as noble's fixed php8.3 revision on USN-8948-1.

The number people will search is 8.3.36. The number noble's notice prints is 8.3.6, plus a revision. Those are not interchangeable, and the second one is the one `dpkg` can show you.
