---
title: "ca-certificates USN-8944-1 Drops One Root, Not Eight Keys."
description: "USN-8944-1 removes emSign ECC Root CA - G3 from ca-certificates. Go 1.27.3 blocks eight intermediate keys. Those are not the same update."
pubDate: 2026-10-22
coverImage: "./cover.webp"
coverImageAlt: "An open server-rack door, a stamped paper certificate, and a sealed envelope on a steel shelf, cool room light, no logos."
category: server-config
tags: ["ca-certificates", "USN-8944-1", "eMudhra", "NSS", "Go"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "25 minutes"
prerequisites:
  - "The package name on the host, not the browser version you updated this morning"
  - "Whether the workload uses the distro bundle, certifi, or a Java store"
  - "A rebuild path for images, because updating the host does not rewrite a built image"
osCompatibility:
  - "Ubuntu 22.04, 24.04, 26.04, and 26.10 if you are applying USN-8944-1"
  - "Any host whose TLS client uses NSS, Go, certifi, or webpki-roots"
  - "This is a trust-store update, not a kernel upgrade and not a Docker Desktop bump"
---

The browser block and the package update do not name the same object. [Ubuntu's USN-8944-1](https://ubuntu.com/security/notices/USN-8944-1), published October 20, removes the emSign ECC Root CA - G3 certificate from ca-certificates because intermediate CA certificates were compromised. [The Hacker News the same day](https://thehackernews.com/2026/10/eight-emudhra-ca-keys-compromised.html) is about eight intermediate keys. A root leaving a bundle and eight intermediates being rejected in a TLS stack are related. They are not one apt line, and they are not one date.

If your change ticket says "we updated Chrome, so the servers are done," you have closed the wrong item. Chrome can block intermediates in hours. A container image keeps the CA files it was built with until you rebuild it.

## ca-certificates on Ubuntu is one root, four package strings

USN-8944-1 says a standard system update will make all the necessary changes. The corrected package versions it lists:

| Release | ca-certificates |
| --- | --- |
| 26.10 | 20260816ubuntu0.26.10.1 |
| 26.04 LTS | 20260816ubuntu0.26.04.1 |
| 24.04 LTS | 20260816ubuntu0.24.04.1 |
| 22.04 LTS | 20260816ubuntu0.22.04.1 |

Do not paste 26.04's string onto 24.04. The version suffix is the release. `20260816ubuntu0.26.04.1` is not the package name for jammy, and `20260816ubuntu0.22.04.1` is not the package name for resolute. I would check `dpkg -l ca-certificates` and match the row, not the adjective "latest."

The notice has a second sentence that does not cover every row in that table. In Ubuntu 22.04 LTS, 24.04 LTS, and 26.04 LTS, the package contained outdated CA certificates, and this update refreshes them to the 2.90 Mozilla bundle. That sentence names three LTS releases. It does not name 26.10. 26.10 is in the version table, and it gets the root removal, because the removal sentence is the overview and is not limited to those three. I am not going to tell you 26.10 also moved to bundle 2.90. The notice did not say that. If your audit checklist says "all four releases refreshed to Mozilla 2.90," you added a release the "in addition" paragraph left out.

The reason line is intermediate certificates compromised. The object removed is a root, emSign ECC Root CA - G3. Removing a root is broader than distrusting eight intermediates that chained through it, or through something else. [A DEV Community note on October 21](https://dev.to/jamilxt/after-the-emudhra-ca-incident-update-more-than-your-browser-3m52), citing Google, says Chrome is also removing that root from the Chrome Root Store, expected to reach devices that rely on the store on October 27, 2026, PDT, and that some legitimate certificates under the root may stop working. Google, in that account, tells affected site operators to move to another hierarchy in the Chrome Root Store. That root removal is broader than the initial block of the eight compromised intermediate keys. If a site you operate chains to emSign ECC Root CA - G3 and it is not one of the eight intermediates, the USN can still break it. The notice does not list the leaf certificates that will fail. You find those by knowing your own chain, not by assuming only the eight keys matter.

On Debian-style systems, the same DEV note says `update-ca-certificates` rebuilds the system certificate directories and bundle from the package. Updating the package without the trigger that rebuilds the bundle is how people "install the USN" and still serve the old file to clients that read `/etc/ssl/certs`. A standard system update, which is what Ubuntu says is sufficient, is supposed to include that. If you copied the .deb onto a machine and did not run the maintainer scripts, you did not do what the notice said.

## Eight keys, six website intermediates, and a root with a different calendar

The report time is specific. [CSO Online](https://www.csoonline.com/article/4238338/google-mozilla-revoke-emudhra-intermediates-after-private-key-compromise.html) quotes Dennis Jackson, of Mozilla's engineering team, in a public bug: on October 17 at 20:06 UTC, Mozilla received a report at certificates@mozilla.org, forwarded by the Chrome Root program, that the private keys of eight eMudhra intermediate certificates had been compromised. An attacker with any of those keys could impersonate any website or service. Mozilla independently recovered the keys later that day.

[SecurityWeek](https://www.securityweek.com/browsers-block-emudhra-intermediate-cas-over-recoverable-private-keys/) says Mozilla and Google blocked the certificates in Firefox and Chrome on October 17. Apple blocked them on October 19. Microsoft on October 20. The Hacker News agrees on Apple's October 19 and Microsoft's October 20, and says Chrome and Firefox blocked the eight certificates within hours of an October 17 evening report, after Chrome verified the findings. I am not going to collapse "within hours of the 17th" and "October 20" into one browser update. The 17th block and the 20th root removal are both in the record. They do different jobs.

The Hacker News says no TLS certificate chaining to the six intermediates used for websites had been logged to Certificate Transparency before Chrome's block, so none could have been trusted by default in Chrome or any browser that requires CT. Six, not eight. The report is eight keys. The CT sentence is six intermediates used for websites. I do not have a sentence that explains the other two. I am not going to guess that they were not website CAs. I am going to keep eight and six as two counts from the same article. The DEV note, citing Google, says no TLS certificates under six affected intermediates were in CT logs before blocking. Same six. If your incident note says "no certificates were issued under the eight keys," you have upgraded a six-intermediate CT sentence into an eight-key claim the pages did not make. SecurityWeek adds that not all clients enforce CT, so absence from the logs is not absence from every verifier.

Google's explanation, via SecurityWeek, is insufficient randomness in key generation. Anyone who can recover the keys can forge trusted HTTPS certificates against clients that have not removed trust. eMudhra, via CSO, says the affected intermediates were created during a key-generation ceremony in April 2025, that root private keys were not affected, and that other intermediate authorities were not affected. The company's claim that roots were not affected sits next to a root removal. Those can both be true. A root can be uncompromised and still be the trust anchor you no longer want, because the intermediates under it were generated badly. Do not "correct" the USN by refusing to remove the root on the grounds that eMudhra said the root key is fine. The USN's reason is the intermediates. The object it removes is the root.

The Hacker News says Mozilla removed emSign ECC Root CA - G3 from NSS on October 20. NSS 3.131.1, in its table, removes that root from the trusted list, released October 20. Chrome will remove the same root in version 43 of its root store and is reviewing emSign Root CA - G1. October 27 PDT, in the DEV note, is when Google expects the Chrome Root Store change to reach devices. October 20 is when NSS and the Ubuntu notice shipped. A laptop that updated Firefox on the 17th and a server that installed USN-8944-1 on the 20th did not perform the same change on the same day. Write both dates if both systems are in scope.

eMudhra's trust-services repository carried no notice as of October 20, The Hacker News says. I would not wait for that page to match the USN before patching. The vendor notice lag is already in the writeup.

## Go wants a rebuild. Node does not have a release yet.

The Hacker News table is the part to paste into a service inventory, because it is not a browser list.

Go 1.27.3 and 1.26.10 reject any chain containing one of the eight keys. CVE-2026-111943. Released October 20. Rebuild required. The filter sits in the standard library, on Go's own verifier and on the macOS and Windows system-verifier paths, and there is no setting to turn it off. A program picks it up only when rebuilt with the new toolchain. Installing the toolchain on a build laptop and shipping the old binary is not the fix. Go's release notes, The Hacker News says, cite "specific security concerns around their operation" and do not name the CA on the issue. If your ticket title is only "eMudhra," a Go bump that never mentions eMudhra can look unrelated. The CVE is the join key. [The last Go line on this site was not this CVE](/posts/usn-8933-1-rabbitmq-not-golang-2026). Do not close 111943 because a different advisory mentioned Go.

Firefox 158.0.1, ESR 115.43.1, and ESR 153.5.1 carry the OneCRL block for installations that cannot receive Remote Settings. CVE-2026-113470. Released October 20. The DEV note says OneCRL reached Firefox users with standard configurations in under three hours. That fast path is not the ESR box that cannot phone home. If you pin Firefox ESR in a kiosk image, you want the version, not the "under three hours" sentence.

Python certifi 2026.10.19 drops emSign ECC Root CA - G3 from the bundle. A virtualenv that vendors certifi will not notice the Ubuntu package. Rust webpki-roots 1.0.10 drops the same root. Homebrew's ca-certificates formula at 2026-09-25_1 excludes three names by public key: emSign ECC Root CA - G3, emSign Root TLS CA - G3, and AAA Certificate Services. That is a wider exclusion than the USN sentence, which names only emSign ECC Root CA - G3. I am not going to add the extra two names to an Ubuntu changelog. I am going to say a Mac built with that Homebrew formula is not on the same exclusion list as an Ubuntu box that only installed USN-8944-1.

Node.js has no release in the table. A draft change, pull 66871, would block the eight keys. Pending. Composer ca-bundle has an open change, pull 154, that would remove the root. Pending. "We updated everything that has a CVE" is false for those two until the releases exist. Track them. Do not mark them done.

Cloudflare, via CSO, learned of the compromise on October 19 and said so in an October 20 incident report. It deployed mitigations across its CDN, developer services, and Zero Trust products, updated shared trust stores and base images, and released updates for Cloudflare One clients and Cloudflare Tunnel. Its security review had not identified active exploitation on Cloudflare services. That is Cloudflare's statement about Cloudflare. It is not a finding about your origin. If you run cloudflared from an image built before those client updates, the host USN does not replace the tunnel binary's trust store. Update the client the report named, then check the version you deployed, not the version on the laptop that downloaded it.

## A rebuilt image is the check, not a browser screenshot

The DEV note's inventory is the server-config sequence I would actually run, minus the urge to delete certificates by hand.

List the clients that make outbound TLS calls. Production services, build runners, containers, monitoring agents, scripts. Record where each one gets its roots: the operating-system bundle, an application bundle, a language runtime, a container image, or a file mounted at runtime. Update through the owner of that store. For Ubuntu, that owner is ca-certificates at the version in the USN for that release. For a browser, update the browser and confirm the version. Do not assume another distribution shipped the same package. The DEV note says that explicitly, and the USN is an Ubuntu notice.

For containers, updating the host does not rewrite CA files inside an image that is already built. Rebuild from an updated base, deploy it, and check the image you deployed. A `docker exec` against yesterday's tag will show yesterday's bundle no matter how current the VM is. Java is separate again. Updating the Linux bundle does not change a JVM trust store the process was configured to use. Identify the store the running process actually loads.

Do not start by deleting a certificate from `/etc/ssl/certs` with `rm`. The next package update can put it back, and a manual removal can break a name you still need. Do not disable certificate verification to "get past" a failure after the root drop. That removes the check the update was meant to restore. The DEV note says this, and it is the line I would put above the commands.

Custom roots you added for a proxy or a mesh are not this incident. Leave them in the inventory. Do not purge the file because it is not in Mozilla's bundle.

I would verify with the chain your service presents, not with a screenshot of Chrome on a workstation. The DEV note's `openssl s_client -connect` example shows the chain an endpoint presents. It does not scan your trust roots, and a valid result does not prove every application has current revocation data. Run the client that fails, from the image that fails. A laptop test is a different trust store.

Cross-signed copies did not widen the risk in Chrome or Firefox, The Hacker News says, because both stopped trusting Sectigo's AAA Certificate Services root for websites in April 2025, and Chrome's root store file does not carry it. Apple's root list for iOS 26 and macOS 26, published December 2025, includes it. That is a phone and a Mac, not your Ubuntu bundle. Homebrew's formula excluding AAA Certificate Services is a third policy. Three stores, three answers. [Two advisory IDs for one directory product were already a reason not to merge rows](/posts/directory-server-two-advisories-2026). This is the same mistake with roots.

## What the ticket should say

Ubuntu: install the ca-certificates version USN-8944-1 lists for the release you run, and confirm the bundle rebuilt. The removal is emSign ECC Root CA - G3. The extra Mozilla 2.90 refresh is stated for 22.04, 24.04, and 26.04 LTS, not for 26.10.

Go services: rebuild with 1.27.3 or 1.26.10. The filter is eight keys, CVE-2026-111943, and it does not mention eMudhra in the release note The Hacker News quotes.

Python: certifi 2026.10.19 if that is the bundle you ship. NSS consumers: 3.131.1. Firefox ESR that cannot take Remote Settings: 158.0.1 or the ESR builds named above, not "users got OneCRL in three hours."

Node and Composer: still pending in the table I read. Do not check them off.

Cloudflare Tunnel and One clients: the October 20 report names updates. The host package does not apply them.

The eight keys were blocked in browsers on October 17. The root left NSS and Ubuntu's package on October 20. Chrome's root-store removal is expected October 27 PDT, and it can affect legitimate certificates under that root. If the ticket has one date, it is already wrong.
