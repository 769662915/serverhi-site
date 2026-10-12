---
title: "X.Org Patched Twelve CVEs. Fedora Shipped One."
description: "X.Org's Oct. 7 advisory fixes xorg-server 21.1.25 and Xwayland 24.1.14. One glamor issue skips the 21.1 line. Fedora 44's notice is Xwayland only."
pubDate: 2026-10-13
coverImage: "./cover.webp"
coverImageAlt: "A dim server aisle with one open rack, a paper checklist clipped to the rail, and a closed laptop, no logos and no readable text."
category: security
tags: ["X.Org", "Xwayland", "Linux", "patch management", "CVE"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "20 minutes"
prerequisites:
  - "A package inventory that can show the installed xorg-server and Xwayland versions separately"
  - "Permission to upgrade the display-server packages, or a maintenance window if the session has to restart"
  - "A way to tell a bare Xorg seat from a Wayland session that still runs Xwayland"
osCompatibility:
  - "Hosts running X.Org X server older than 21.1.25, or Xwayland older than 24.1.14"
  - "Fedora 44 has a published Xwayland advisory; this pass did not find a matching Fedora xorg-server notice"
---

The version string and the package name are not interchangeable. [X.Org's security advisory dated October 7, 2026](https://lists.x.org/archives/xorg/2026-October/062294.html) covers issues in the X server before xorg-server 21.1.25 and in Xwayland before xwayland 24.1.14, and it says the fixes ship in those two releases. [Peter Hutterer's announce for xorg-server 21.1.25](https://lists.x.org/archives/xorg-announce/2026-October/003748.html) went out at 01:45 UTC that morning. [The Xwayland 24.1.14 announce](https://lists.x.org/archives/xorg-announce/2026-October/003749.html) followed at 01:54 UTC. Nine minutes. Two packages. A host that updates one of them has not updated the other.

We have already had a fix that hid inside a crash line. [AnyDesk 8.0.3 patched a pre-auth Linux flaw in June, and the changelog said crash](/posts/anydesk-linux-803-changelog-crash-2026/). We have already had a pile of kernel CVE identifiers that were a batch, not a count of fires. [Debian's 1,313 kernel CVEs were that batch](/posts/debian-1313-cve-kernel-batch-2026/). We have already had a CVE whose LivePatch was not the fix. [CVE-2026-85102 was that one](/posts/checkpoint-cve-2026-85102-93616-2026/). This week's display-server drop is a fourth shape: twelve identifiers, two tarballs, and at least one issue the advisory says does not apply to the 21.1 server line.

## X.Org listed twelve names, and one skips the 21.1 line

[9to5Linux on October 7](https://9to5linux.com/multiple-security-issues-patched-in-xorg-server-21-1-25-and-xwayland-24-1-14) says twelve security issues were patched, and that they apply to both X.Org Server and Xwayland. The identifiers it prints are CVE-2026-88812, CVE-2026-93515, CVE-2026-93516, CVE-2026-93517, CVE-2026-93518, CVE-2026-93519, CVE-2026-93520, CVE-2026-93521, CVE-2026-93522, CVE-2026-93523, CVE-2026-93524, and CVE-2026-93536. That is a list of twelve. It is not, by itself, a statement that each one is present in each package.

The advisory body contradicts the "both packages" sentence for one of them. In the section on the Glamor CopyArea heap buffer overflow, the advisory says the issue does not affect xorg-server 21.1.x, and that the fix is in xwayland 24.1.14. 9to5Linux attaches that bug class to CVE-2026-93522. [GamingOnLinux the same day](https://www.gamingonlinux.com/2026/10/xorg-server-21-1-25-and-xwayland-24-1-14-released-due-to-more-security-issues) repeats the advisory's line: this issue does not affect xorg-server 21.1.x, fixed in xwayland 24.1.14. So a secondary writeup and the advisory agree with each other, and they disagree with 9to5Linux's blanket "both."

The announces make the disagreement sharper rather than cleaner. Hutterer's xorg-server 21.1.25 note lists CVE-2026-93522 among the issues in that day's advisory. The excerpt we could read ran through CVE-2026-93524 and then stopped. I am not going to claim the server announce omits CVE-2026-93536. I did not see the rest of that message. The Xwayland 24.1.14 announce, nine minutes later, lists twelve names and includes both CVE-2026-93522 and CVE-2026-93536, the GestureBuildSprite use-after-free. Listing a CVE in an announce is not the same sentence as "this branch is vulnerable." The advisory is the sentence that says the glamor issue does not affect 21.1.x. The server announce still names CVE-2026-93522. If you patch only because a name appeared in a list, you can update a package for a bug it did not have, and you can still miss the package the advisory actually named as the fix.

I am not reproducing the request paths, the length fields, or the drawable conditions. Those are in the advisory for people who need to confirm the bug class. They are not a troubleshooting procedure, and they are not something to paste into a test client on a production seat. The impact classes the advisory and 9to5Linux attach to this batch are enough to decide whether to patch: double free, use-after-free, heap buffer overflow, out-of-bounds read or write, information disclosure, denial of service, and in several cases potential arbitrary code execution. Which class belongs to which CVE is in the advisory. A scanner that only knows "twelve X.Org CVEs" will not know that one of them skips the 21.1 line.

## An authenticated X client is not AnyDesk's bug

The advisory's wording, on the issues we could read, is an authenticated X client. That is a session that can already speak the X protocol to the server. It is not a pre-authentication remote code execution against a closed port, which is the shape of the AnyDesk Linux flaw we wrote up on October 10. Confusing the two will send you looking for the wrong exposure.

An authenticated-client bug still matters on a multi-user machine, on a host that forwards X, and on a seat where a compromised local account is not supposed to become code execution in the server. It matters less, as a drive-by, than a bug that needs no login. I am not going to rank these twelve as "local only, ignore them." I am going to stop the ranking at the adjective the advisory used. If your threat model is a remote attacker with no X credentials, this batch is not the AnyDesk note. If your threat model includes users who can open clients, the version check below is the work.

9to5Linux says the bugs can lead to heap corruption, denial of service, or potentially information disclosure, and then gets more specific per CVE. GamingOnLinux, reprinting the advisory, uses the same impact language on the entries it quotes. I am attributing the per-CVE impact to those writeups and to the advisory, not restating a trigger. Credit, where the advisory excerpt named it, runs through TrendAI's Zero Day Initiative. CVE-2026-93524 is credited to WONJOON HWANG, with ZDI-CAN-32408. Other entries in the excerpt are credited to an anonymous reporter working with the same program. A ZDI identifier is a disclosure channel. It is not proof the bug is being exploited on your host, and it is not a reason to wait for a breach headline before you look at the package version.

## Fedora shipped Xwayland. That notice is not the X server.

The distro page we could actually read is narrow. [LWN's copy of the Fedora update notification](https://lwn.net/Articles/1099531), dated October 9, 2026 at 01:08 UTC, is FEDORA-2026-2448dda850. The package is xorg-x11-server-Xwayland, version 24.1.14, release 1.fc44, product Fedora 44. The changelog line says the update to Xwayland 24.1.14 is a CVE fix and then lists the same twelve identifiers, including CVE-2026-93522 and CVE-2026-93536. The previous changelog entry on that notice is 24.1.13-2, a rebuild by Fedora Release Engineering on July 17, 2026. So Fedora's Xwayland package moved from a July rebuild of 24.1.13 to 24.1.14-1, and the notice says why.

The command in that notice is `dnf upgrade --advisory FEDORA-2026-2448dda850`, run with the privileges your shop already uses for advisory upgrades. I am quoting Fedora's line. I am not translating it into apt, zypper, or pacman. Those translations are how a real command becomes a guessed one.

What the notice does not contain is xorg-server 21.1.25. I did not find a Fedora xorg-server advisory in this pass. Absence from one search is not proof the package is missing from the mirrors. It is proof you should not mark the X server done because the Xwayland advisory ID came back clean. On Fedora 44, check both package names. On any other distribution, 9to5Linux's practical line is the one I will repeat without adding a command: patch when 21.1.25 and 24.1.14 land in the stable repositories you actually install from. An upstream announce on October 7 is not a statement that your mirror had the build on October 8.

There is a third version string on the same announce list that morning, and it is a trap if you sort numerically. The message after the Xwayland announce is titled xorg-server 26.0.99.903. I did not read that body. A 26.0.99 pre-release number is higher than 21.1.25 and it is not the version the security advisory names. If a status script treats "highest version heard that day" as "patched," it will point at a tarball the advisory did not call the fix. The advisory's fixed versions are 21.1.25 and 24.1.14. Full stop, until you have read the 26.0.99.903 note yourself and it says otherwise. I have not, so I will not.

## What to compare on the host

You want two versions, not one. The X server package and the Xwayland package install side by side on a lot of desktop hosts, because a Wayland session still runs X clients through Xwayland, and a recovered Xorg seat still runs the server. Updating the one you happen to have a unit file for is how the other one sits at 24.1.13 or 21.1.24 through the next reboot.

Compare what the package manager shows with 21.1.25 and with 24.1.14. If Xwayland is older than 24.1.14, the advisory wants that update even when you do not think of the machine as an Xorg desktop. If the X server is older than 21.1.25, the advisory wants that update too, with the glamor caveat kept in view: CVE-2026-93522, as the advisory describes that issue, is not why you are moving the 21.1 line. The other names on the list are. I am not going to drop CVE-2026-93522 from the Xwayland check just because the server line is exempt. Xwayland's announce includes it.

A Wayland-only kiosk that never starts Xwayland is the edge case the package list will not explain for you. If the Xwayland package is not installed, there is nothing to upgrade under that name. Confirm the absence with the package database. Do not confirm it by assuming a compositor sticker on the login screen means the compatibility server was never packaged. Plenty of "Wayland" images still ship Xwayland for a tray icon.

After the upgrade, the session that is already running is still the old code until it restarts. That is ordinary for a display server, and it is why this is a maintenance-window item on a shared seat rather than a silent library bump. I am not going to invent a restart command. Your display manager already has one. The check that matters first is the version the package database will report after the transaction, not the version a running process inherited at login.

## Upstream names and distro names are not the same string

The advisory says xorg-server 21.1.25 and xwayland 24.1.14. Fedora's notice says xorg-x11-server-Xwayland-24.1.14-1.fc44. Those strings will not match a naive equality check. The upstream tarball name, the distro source package, and the distro binary package pick up prefixes and a release suffix. If your inventory looks for the literal token `xwayland-24.1.14` and the rpm is named `xorg-x11-server-Xwayland-24.1.14-1.fc44`, a broken matcher reports "not installed" on a host that already has the fix. Read the version field, not the full filename, and read it on both binary packages if the distro splits them.

Fedora's July 17 line is a reminder that a rebuild is not a version bump. 24.1.13-2 was a rebuild for the release, dated July 17, 2026, by Fedora Release Engineering. A host that "updated in July" can still be on 24.1.13. The CVE fix is the move to 24.1.14, dated in this notice as the October 9 advisory, with upstream announce on October 7. July is not close enough.

I am also not going to treat "Xorg" on a process list as proof of which package is live. A process named Xorg can be the standalone server. An Xwayland process is the other package. A compositor that is not Xorg at all can still spawn Xwayland when an old client starts. The package database is the list. The process list is what happens to be running this hour. Check the database first. Then decide whether the running session is still the old build.

9to5Linux's recommendation is to patch once the releases are in the stable repos. Fedora has already said, for one product and one package, that this happened: Xwayland 24.1.14-1.fc44, advisory FEDORA-2026-2448dda850, notice dated October 9. The X server package on that same product was not in the notice we read. Twelve CVE identifiers do not collapse into one rpm. If the inventory shows a single green check, read the package name on the check before you close the ticket.

