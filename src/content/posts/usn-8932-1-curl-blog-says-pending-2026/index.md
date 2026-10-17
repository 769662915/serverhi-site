---
title: "USN-8932-1 Lists curl Versions. The Blog Says Pending."
description: "USN-8932-1, dated 14 October 2026, lists fixed curl versions for 20.04, 22.04, and 24.04. Ubuntu's curl blog table still says those releases are update pending."
pubDate: 2026-10-18
coverImage: "./cover.webp"
coverImageAlt: "A closed manila folder and a coiled ethernet cable on a steel shelf, warm side light, no labels."
category: security
tags: ["Ubuntu", "USN-8932-1", "curl", "CVE-2026-92392", "libcurl"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "20 minutes"
prerequisites:
  - "The Ubuntu release from /etc/os-release, not the release a neighboring host was imaged from"
  - "The installed curl version, read before you decide which sentence on the blog still applies"
  - "Ubuntu Pro if the notice marks the 20.04 package as an ESM fix"
osCompatibility: ["Ubuntu 20.04", "Ubuntu 22.04", "Ubuntu 24.04", "Ubuntu 26.04"]
---

Two Ubuntu pages about the same curl release do not have the same status. [USN-8932-1](https://ubuntu.com/security/notices/USN-8932-1), published 14 October 2026, says several security issues were fixed in curl, and it lists package versions for 20.04, 22.04, and 24.04. The [Ubuntu blog on the same vulnerabilities](https://ubuntu.com/blog/curl-vulnerabilities-fixes-available) still has a table that marks 14.04 through 24.04 as "Update pending," and it says updates for every supported release except 26.04 "will be available shortly." A notice that lists versions and a blog that says pending cannot both be the page you patch from, unless you decide which one you are reading.

We already had a notice number that was not the package people assumed. [USN-8933-1 is RabbitMQ. The Go fix is not](/posts/usn-8933-1-rabbitmq-not-golang-2026). We already had a kernel notice that was not the OEM build. [USN-8920-1 is a 5.4 kernel](/posts/ubuntu-usn-8920-5-4-not-oem-2026). We already had a patch set where one vendor shipped a different count than the headline. [X.Org patched twelve CVEs. Fedora shipped one](/posts/xorg-21-1-25-twelve-cves-2026). This week's curl pair is the same kind of split, inside one vendor's own pages.

## The high CVE is a 26.04 sentence

The blog says Daniel Stenberg published a post on 7 October 2026 describing a plan to release curl on 14 October 2026 to address 22 known security vulnerabilities. One of those is rated high: CVE-2026-92392. The others, the blog says, are low or medium. Ubuntu was in the embargo. Disclosure happened on the planned date. CVE-2026-92392, the blog says, only impacts Ubuntu 26.04 LTS, Resolute. The fix it prints for that release is curl 8.18.0-1ubuntu2.8, and it says that update addresses all of the vulnerabilities on 26.04, not only the high one.

The same blog table marks Trusty 14.04, Xenial 16.04, Bionic 18.04, Focal 20.04, Jammy 22.04, and Noble 24.04 as "Update pending" and "Not affected by CVE-2026-92392." "Not affected by the high CVE" and "update pending" are both in that cell. A 24.04 host is not waiting on CVE-2026-92392, if the blog's scope line holds. It may still be waiting, if you trust only that table, on the low and medium issues. Those are the issues the blog says the other releases are affected by, and the issues it says will be fixed shortly.

"Shortly" is not a version. The blog does not, in that paragraph, name 8.5.0-2ubuntu10.16 or 7.81.0-1ubuntu1.30. Those versions live on the notice. If you patched 26.04 to 8.18.0-1ubuntu2.8 because the blog said that release was fixed, you followed the only row in the blog table that says Fixed. If you are on 22.04 or 24.04 and you stopped because the table says pending, you followed the blog and not USN-8932-1.

## The notice already has versions for three LTS releases

USN-8932-1's package table, in the rows that rendered, lists:

24.04 noble, curl 8.5.0-2ubuntu10.16, and the libcurl packages named beside it at the same version: libcurl3t64-gnutls, libcurl4-gnutls-dev, libcurl4-openssl-dev, libcurl4t64.

22.04 jammy, curl 7.81.0-1ubuntu1.30, with libcurl3-gnutls, libcurl3-nss, libcurl4, libcurl4-gnutls-dev, libcurl4-nss-dev, and libcurl4-openssl-dev at that version.

20.04 focal, curl 7.68.0-1ubuntu2.25+esm10, marked Ubuntu Pro. The same ESM version is listed for the 20.04 libcurl packages on the [linuxsecurity.com copy of the notice](https://linuxsecurity.com/advisories/ubuntu/ubuntu-8932-1-curl).

A 20.04 fix that says Ubuntu Pro is not the same operation as a 24.04 pocket update. If `/etc/os-release` says 20.04 and Pro is not enabled, the version string on the notice is not a package your unauthenticated archive will necessarily offer. The notice is telling you where the fix lives. It is not telling you that `apt upgrade` on a machine without Pro will produce `7.68.0-1ubuntu2.25+esm10`.

The rendered USN table showed 24.04, 22.04, and 20.04. I am not going to claim the notice has no 26.04 row lower on the page. I did not get that row. The blog is the page that prints 8.18.0-1ubuntu2.8 for Resolute. The notice is the page that prints the three LTS versions above. Use the page that names your release's version. Do not average them.

The blog's recommended full upgrade is printed completely: `sudo apt update && sudo apt upgrade`. It also starts a targeted command. That second command stops, in the blog text, after `sudo apt u`. I am not going to finish it. A targeted upgrade you invent can miss libcurl while updating the curl binary, or the reverse. The notice lists both the binary and the libraries. If you only upgrade the `curl` package and leave `libcurl4` or `libcurl4t64` behind, you have not installed the row. Compare every package name in your release's row, not just the first one.

Read the installed version before you decide the blog's "pending" cell still describes you. This note is not quoting a check command from the blog, because the blog points at a command and the command did not come through with the table. The comparison itself is the point: the candidate version apt will install, against the USN string for your release. If they match, the notice's "fixed" sentence is the one that applies, whatever the blog table still says.

## The low and medium CVEs are not one scope

"Not affected by CVE-2026-92392" is not "not affected." The notice's details, for the issues that rendered with ids, split by release.

Stanislav Fort is credited with CVE-2026-86409: curl did not clear AWS SigV4 authentication state when `CURLOPT_AWS_SIGV4` was set to NULL. The notice says an attacker could possibly obtain sensitive information, and that this issue only affected 22.04 and 24.04. A 20.04 host is outside that sentence. A 26.04 host is not in that sentence either. Do not paste 86409 into a 20.04 ticket because the notice is titled curl.

CVE-2026-86414, also Stanislav Fort, is the proxy case: an HTTP proxy could trick libcurl into sending credentials to the proxy itself by answering a CONNECT with an unexpected authentication challenge. The paragraph that rendered does not limit this one to two releases. Absence of a limit in that paragraph is not proof every Ubuntu release is affected. It is proof the sentence you have does not contain the limit. If you need the affected list, the notice's per-CVE block is the place. A summary that says "all of these are 22.04 and 24.04 only" has already contradicted this paragraph, which did not say that.

CVE-2026-87862 is HSTS. Fort found that an includeSubDomains parent entry imported before a longer-lived child entry could cause curl to use unencrypted HTTP. Only 22.04 and 24.04, the notice says. CVE-2026-87863 is a different HSTS bug: max-age values that exceed calendar time bounds, possibly a denial of service or data loss, and only 24.04. Two HSTS ids, two scopes. A 22.04 host that patches for 87862 has not, by that sentence, patched a 24.04-only max-age bug, because the notice says 87863 did not affect it. A 24.04 host that treats "the HSTS one" as a single ticket has merged two ids.

CVE-2026-87864 is IMAP. Fort found that APPEND handling with `CURLOPT_CRLF` enabled could let overflow bytes be read as pipelined commands. The attacker in that sentence is authenticated. That is a narrower attacker than the proxy challenge in 86414, which does not say the attacker must already be a user of your IMAP server. Authenticated and unauthenticated are different patches in an incident writeup even when they ship in the same package version.

Joshua Rogers is credited with a use-after-free in FTP wildcard matching. The sentence stops at a crash, a denial of service, or execution, and it does not include a CVE id. I am not going to assign one. An FTP wildcard bug without an id in your notes is a reason to open the notice, not a reason to guess `CVE-2026-` and a number.

The blog's other pile, written without those ids attached one by one, includes credential leaks across connections and proxies, including Kerberos tickets; TFTP and IMAP state-machine problems; HTTP servers that can wipe or truncate cookie jars; HSTS expiration and durability; SSH host key checking; a data leak in the GnuTLS build; memory exhaustion; and two TLS-backend issues Ubuntu says it does not support. Some of those themes match ids above. Some do not have an id in this note. Twenty-two, the blog's count from Stenberg's plan, is not the number of ids printed here. A status report that says "we patched the 22" needs the notice's list, not this paragraph.

## What to do with the disagreement

Match the release first. On 26.04, the blog names 8.18.0-1ubuntu2.8 and says that release is affected by CVE-2026-92392. That is the high one. On 24.04, the notice names 8.5.0-2ubuntu10.16, and the blog says this release is not affected by 92392 and that an update was pending. On 22.04, the notice names 7.81.0-1ubuntu1.30. On 20.04, the notice names 7.68.0-1ubuntu2.25+esm10 and marks it Ubuntu Pro. If your installed version is already the notice's version, the blog's pending cell is stale relative to the notice, or you are looking at a mirror that has not caught up. If your installed version is older than the notice's version, the notice is the page with the target, and the blog is the page that told you to wait.

Do not treat 14.04, 16.04, or 18.04 as covered by the version rows above. They appear in the blog table as pending and not affected by 92392. They do not appear in the USN version rows this note could read. An old release with "update pending" and no version in the notice is not a release you should invent a package string for.

The packages are the other trap. curl the binary and libcurl the library are both in the notice. A container image that copies a patched `curl` binary into a root filesystem that still has the old `libcurl4t64` has updated the CLI and not the library most programs actually link. The 24.04 row uses the t64 library names. The 22.04 row still has `libcurl4` and the NSS variants. Copying a 24.04 package name onto a 22.04 `apt install` line will not find it. Copying a 22.04 name onto 24.04 has the same problem in the other direction.

`sudo apt update && sudo apt upgrade` is the command the blog prints in full. It is broader than curl. On a host where you cannot take every upgradable package, the notice's row is the list to target, and the blog's truncated targeted command is not a substitute you should complete from memory. After the upgrade, read the installed versions again. Pending, in the blog table, is a status word. The version string is the thing you can compare.

USN-8932-1 is curl. It is not USN-8933-1, and it is not a kernel notice. The high id, CVE-2026-92392, is the blog's 26.04 sentence. The versions for 20.04, 22.04, and 24.04 are the notice's sentences, dated the same day the blog still described those updates as shortly. If those two pages are still different when you read them, trust the version you can install, and write down which page you took it from.
