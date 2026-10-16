---
title: "USN-8933-1 Is RabbitMQ. The Go Fix Is Not."
description: "USN-8933-1 is rabbitmq-server, and the version changes with the release. USN-8883-2 is golang-1.23 on 22.04 only. Restart is a separate line."
pubDate: 2026-10-17
coverImage: "./cover.webp"
coverImageAlt: "Three closed folders of different thicknesses on a steel shelf, with a coiled ethernet cable and a small brass key."
category: server-config
tags: ["Ubuntu", "USN-8933-1", "RabbitMQ", "USN-8883-2", "golang"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "20 minutes"
prerequisites:
  - "The Ubuntu release you actually run, from /etc/os-release, not the release a neighboring host was imaged from"
  - "A way to read the installed rabbitmq-server and golang-1.23 versions before you decide which notice applies"
  - "Ubuntu Pro if the notice marks the package as Pro or Legacy Support"
osCompatibility: ["Ubuntu 16.04", "Ubuntu 18.04", "Ubuntu 20.04", "Ubuntu 22.04", "Ubuntu 24.04", "Ubuntu 26.04"]
---

Friday's list is not one update. [LWN's security updates for Friday, October 16, 2026](https://lwn.net/Articles/1101015), puts USN-8933-1 on rabbitmq-server for 16.04, 18.04, 20.04, 22.04, 24.04, and 26.04, dated 2026-10-16. The same table puts USN-8883-2 on golang-1.23 for 22.04 only, dated 2026-10-15. Those are different packages, different notice IDs, and different release sets. A change window that "applies the Friday Ubuntu updates" has not named a package yet.

We already had a kernel notice that was not the OEM fix. [USN-8920-1 is a 5.4 kernel. The OEM fix was a different ID](/posts/ubuntu-usn-8920-5-4-not-oem-2026/). We already had a module that did not move when the web server did. [NGINX upgraded. The Brotli module did not](/posts/nginx-module-abi-mismatch-apt-2026/). We already had two advisory IDs for one directory product. [One of them was the critical. The other was not the same notice](/posts/directory-server-two-advisories-2026/). This week's pair is a broker and a Go toolchain. I am not going to give you one apt line for both.

## USN-8933-1 is rabbitmq-server. The version is not shared.

[Ubuntu's notice](https://ubuntu.com/security/notices/USN-8933-1) lists a package version per release. They are not a family you can round.

26.04 LTS, resolute, wants rabbitmq-server 4.0.5-10ubuntu5.2. 24.04 LTS, noble, wants 3.12.1-1ubuntu1.7. 22.04 LTS, jammy, wants 3.9.27-0ubuntu0.6. 20.04 LTS, focal, wants 3.8.3-0ubuntu0.3+esm2, and the notice marks that fix as available with Ubuntu Pro. 18.04 LTS, bionic, wants 3.6.10-1ubuntu0.5+esm1, also Ubuntu Pro. 16.04 LTS, xenial, wants 3.5.7-1ubuntu0.16.04.4+esm3, Ubuntu Pro via the Legacy Support add-on.

4.0.5 and 3.5.7 are not a typo. They are ten years of RabbitMQ packaging sitting on one notice because the notice covers six releases, not because one binary serves all six. If you copy the 26.04 version string onto a 22.04 host, apt will not quietly translate it. If you copy the 22.04 string onto a 20.04 host, you have also skipped the Pro marker. The esm suffix is the marker. A host without the entitlement that the notice names will not get that build from the archive you think you are using.

LWN's row lists the same six release numbers. It does not list the version strings. The version strings live on the Ubuntu notice. An automation that opens LWN, sees "rabbitmq-server," and upgrades to "latest" has done a different operation from pinning the version the notice printed for that release. Latest on a mirror that is not the release's pocket is how a 26.04 package name ends up in a 22.04 log. I would print the release and the version on the change ticket before I ran the upgrade.

## The CVEs on that notice do not share a release list.

The notice is one ID. The issues inside it are not one audience. I am using the "only affected" clauses Ubuntu printed. Where the extract did not include that clause, I am not going to invent a release list.

CVE-2026-67404 is OAuth2 SSL options when no CA certificates were available. Ubuntu says an attacker could possibly bypass TLS verification. The notice says this issue only affected Ubuntu 26.04 LTS. A 22.04 broker is not in that sentence. Patching 22.04 does not close a 26.04-only issue, and refusing to patch 22.04 because "the TLS bypass is 26.04 only" ignores the other CVEs on the same page.

CVE-2026-67409 is HTTP response status codes when fetching JWKS keys, a possible denial of service. Only 22.04, 24.04, and 26.04. CVE-2026-67238 is ETF-encoded PID node names, also a possible denial of service, same three releases. CVE-2026-67239 is TLS peer-certificate DNs in the stream management UI, a possible cross-site scripting issue, same three releases. If you run 20.04, those three clauses do not name you. CVE-2026-66070 does.

CVE-2026-66070 is CORS wildcard origin configuration, a possible cross-site request forgery. Ubuntu says it only affected 18.04, 20.04, 22.04, 24.04, and 26.04. 16.04 is on the package table and is not in that list. I am not going to conclude that 16.04 has nothing to install. The version table still has a 16.04 build. I am going to conclude that this particular CVE's affected line and the package table are not the same list. A ticket that says "16.04 is out of scope because the CORS issue starts at 18.04" has used one CVE to delete a row the notice still printed.

CVE-2026-66077 is TLS peer-certificate DNs in the management UI, a possible cross-site scripting issue. The extract does not attach an "only affected" clause to it. I will not pretend that means every release, and I will not pretend it means the same three as the stream-UI issue. The management UI and the stream management UI are different sentences, CVE-2026-66077 and CVE-2026-67239. Same theme, different scope language. If you need the missing clause, open the notice. Do not borrow the neighboring CVE's release list.

## The restart line is on the RabbitMQ notice. It is not on the Go notice.

Ubuntu's update instructions for USN-8933-1 say a standard system update will make all the necessary changes, and then they add a second sentence: after that update you need to restart rabbitmq-server to make all the necessary changes. Both sentences use "all the necessary changes." They are not redundant. The first is the package. The second is the running broker. An apt upgrade that exits 0 while the old beam process is still bound to the port has done the first sentence. `systemctl status rabbitmq-server` is how you check the second, and the notice does not print that command. I am not going to invent a systemctl line and attribute it to Ubuntu. I am going to say the notice names the service to restart, and a config review that stops at "package installed" has not finished the notice.

There is no config-file diff in the extract. I am not going to tell you to rewrite rabbitmq.conf because a CORS CVE exists. The correction Ubuntu printed is a package version, then a restart. If your broker's CORS configuration is a choice you made on purpose, the notice does not say the package will revert it. It says the server incorrectly handled wildcard origin configuration. Read your own config after the restart if wildcard origin is something you set. That read is yours. It is not a step the notice numbered.

## USN-8883-2 is Go 1.23 on jammy. USN-8883-1 already skipped it.

[USN-8883-2](https://ubuntu.com/security/notices/USN-8883-2) is the other Friday-adjacent Ubuntu row on the LWN table, dated 2026-10-15, release 22.04, package golang-1.23. The notice says USN-8883-1 fixed the vulnerability in Go 1.18, 1.21, and 1.24. This update is the corresponding fix for Go 1.23. The package versions on 22.04 are golang-1.23, golang-1.23-go, and golang-1.23-src, each at 1.23.1-1~22.04.3.

The issue, as the original advisory details on that page state it, is in Go's x/net/idna package. Certain Punycode-encoded labels that decoded to ASCII-only labels were handled incorrectly. An attacker could possibly bypass hostname-based access controls and escalate privileges. That is a hostname check, not a RabbitMQ management UI. A host that does not have golang-1.23 installed does not have this package line to upgrade. A 24.04 host is not in USN-8883-2's release column on the LWN table. Do not install jammy's 1.23.1-1~22.04.3 string on noble because both notices were on Friday's page.

The Go notice's update instructions, in the extract, say a standard system update will make all the necessary changes. They do not add a restart-the-service sentence. Anything you built with the vulnerable toolchain is a separate question the notice does not answer in the text I have. I am not going to tell you to rebuild every container because the idna package was wrong. I am going to tell you to check whether golang-1.23 is installed on 22.04, and whether the version is at least 1.23.1-1~22.04.3, before you close USN-8883-1 as "done" on a jammy image that still has 1.23.

That is the config mistake. USN-8883-1 and USN-8883-2 share a number and a hyphen. They do not share a Go minor. Closing -1 on a box whose `go version` is 1.23 leaves the minor the second notice exists to cover. The rabbitmq notice does not close it either.

## The rest of the Friday table is not these two notices.

LWN's page is a table of other people's advisories too. I am not going to summarize advisories I did not open. I am going to use the rows as ID separators, so a Friday checklist does not collapse them.

The same LWN table lists USN-8922-2 as linux-azure on 16.04, dated 2026-10-15. I did not open that notice for this piece. It is not USN-8933-1, and it is not USN-8920-1, which was a 5.4 kernel notice rather than an OEM fix. Three USN numbers in two days is not one kernel. If the host is 16.04 and the package is linux-azure, the ID to read is USN-8922-2. If the package is rabbitmq-server, the ID is USN-8933-1, including the 16.04 version string with the Legacy Support marker.

SUSE-SU-2026:4686-1 is openssh on SLE12, dated 2026-10-15. SUSE-SU-2026:24157-1 is bind on SLE16.0, dated 2026-10-15. An openssh update for SLE12 does not configure named on SLE16, and neither ID is an apt package. Oracle's ELSA-2026-83460, on the same Friday table, is idm:DL1 for OL8, dated 2026-10-16. I do not have that advisory's text. I have the row. Identity Management on Oracle Linux 8 is not RabbitMQ on Ubuntu, even if both showed up on October 16.

The practical order on an Ubuntu host is short, and it is release-shaped. Read the release. If RabbitMQ is installed, match USN-8933-1's version for that release, respect the Pro marker on 16.04, 18.04, and 20.04, upgrade, then restart rabbitmq-server. If the release is 22.04 and golang-1.23 is installed, match USN-8883-2's 1.23.1-1~22.04.3, and do not treat USN-8883-1 as having already done that. If the host is not Ubuntu, leave the USN version strings alone and open the SUSE or Oracle ID that names your product.

A version check is the step the notice assumes and does not spell out. `apt-cache policy rabbitmq-server` will show the candidate you are about to install. Compare that candidate to the string on USN-8933-1 for your release, not to the string for the release you wish you were on. If the candidate is older than the notice and the notice's row is marked Ubuntu Pro, the missing piece is the entitlement, not a second USN number. If the candidate is newer than the notice, you are not "behind" this ID. Newer is not the same fact as "this CVE is fixed," but it is a reason to stop and read the changelog instead of downgrading to the printed string. I am not going to tell you to pin a downgrade. The notice says update to those versions. It does not say roll back a later build.

## The configuration work is the clause that names your release.

I am not going to add a hardening guide the notices did not print. The October 16 pages printed IDs, versions, affected-release clauses, and one restart. The configuration work is applying the clause that names your release, and not the one that merely sat on the same table.
