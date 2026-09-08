---
title: "OpenVPN 2.7.7 Fixes Seven CVEs. Patch Linux First."
description: "OpenVPN 2.7.7 patches CVE-2026-84732 on every platform, hardens Linux Netlink, and stops --stale-routes-check from deleting static routes. Here is how to upgrade and verify."
pubDate: 2026-09-09
coverImage: "./cover.webp"
coverImageAlt: "A Linux terminal on a server KVM showing an openvpn version string, rack lights in the background."
category: linux
tags: ["OpenVPN", "Linux", "CVE", "VPN", "security updates"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "25 minutes"
prerequisites:
  - "Root or sudo on the VPN concentrator"
  - "A known-good package source or upstream tarball"
osCompatibility:
  - "Ubuntu 24.04"
  - "Debian 12"
  - "RHEL 9"
---

VPN concentrators age in place. The package is old, the tunnel still up, nobody wants to be the person who bounced 400 remote staff. [Linuxiac](https://linuxiac.com/openvpn-2-7-7-released-with-seven-security-fixes) and [9to5Linux](https://9to5linux.com/openvpn-2-7-7-released-with-various-improvements-bug-and-security-fixes) both logged OpenVPN 2.7.7 this week as a security release: seven CVE-tracked bugs, Linux Netlink hardening, and a route-gc bug that was deleting routes you meant to keep.

If you only remember one identifier, remember [CVE-2026-84732](https://cybersecuritynews.com/openvpn-fixes-7-security-flaws). It is the reliability-layer bug that is not Windows-only.

This is the same instinct as last night's [HAProxy "Ted" write-up](/posts/haproxy-ted-backdoor-verify-builds-2026/): know the bytes in the daemon that sits on the edge. OpenVPN is not accused of shipping a backdoor here. It is accused of being unpatched.

## What 2.7.7 actually patches

Linuxiac's list is the one to keep next to `apt changelog`.

CVE-2026-84732 hits the reliability layer on all platforms. Cybersecurity News describes two failure modes: an unbounded reliable TLS timeout, and acknowledging packets that cannot be outstanding. The practical impact they list is denial of service through TLS handshake mishandling. That is a concentrator problem. Someone who can speak the protocol can waste workers. They do not need a Windows box to try.

The other six CVEs in the table are Windows-flavored:

- CVE-2026-84256 — `CreateProcess()` command-line quoting and cmd.exe special characters, in combination with a validation script and a rogue CA
- CVE-2026-84226 — tapctl invoking `netsh.exe` without a full path (binary hijack / path abuse)
- CVE-2026-82312 — NULL DACLs on a service exit event and a netsh guard semaphore; one local user interfering with another's OpenVPN process
- CVE-2026-78221 — openvpnserv, wrong NRPT domain size with UTF-8 internationalized names, buffer overread
- CVE-2026-78043 — openvpnserv allowing `/` in config paths, bypassing admin-restricted config locations
- CVE-2026-81738 — off-by-one in the temporary buffer guard for `write_dhcp_search_str()`

9to5Linux is explicit: those six are Windows builds. If your concentrator is Debian, they are not why you are patching. They are why your laptop fleet's official OpenVPN client still needs the same version.

Beyond CVEs, Cybersecurity News notes the EPOCH data-channel format now keeps four future keys instead of sixteen. Less log noise, less memory on busy links. 9to5Linux adds that OpenVPN no longer rewrites a zero UDP checksum (RFC 768) and stops resetting the HMAC key on every packet.

None of that is a feature drop you schedule a town hall for. It is the difference between a daemon you can defend and a daemon you are hoping nobody probes.

The Windows quoting bug is worth one extra sentence even on a Linux-only staff meeting, because someone will ask. CVE-2026-84256 is `CreateProcess()` plus characters that `cmd.exe` treats as special, plus a validation script, plus a rogue CA. That is a chain, not a remote unauth RCE you throw on the dashboard in red. Still patch the Windows client. Do not let the chain become the reason you delay the Linux box that has the all-platform DoS.

## The one CVE that hits Linux too

CVE-2026-84732 is the shared one. Reliability layer, every platform. Unbounded TLS timeout plus acks for packets that should not be in flight.

Read that as: handshake state machine can be poked into a bad mood. On a Linux server with thousands of half-open clients, "bad mood" looks like CPU and file descriptors, not a pop-up.

You do not need a public proof of concept to justify the upgrade. You need the version string to change. Treat this the way you treated [nginx 1.29.5](/posts/nginx-1-29-5-security-update/): read the note, pick a window, ship it.

If your OpenVPN is the community 2.7 line from distro packages, wait for the rebuilt `.deb` / `.rpm` with 2.7.7 in the changelog. If you compile from upstream, take the tarball 9to5Linux points at on the project GitHub and rebuild in CI, not on the concentrator.

Compiling on the edge box is how you get surprises. The HAProxy story this week was compiled-in malware. Different threat. Same reason not to keep `gcc` on the VPN host.

## Netlink replies can lie

Linux-specific hardening in 2.7.7: the client validates Netlink replies against the request that produced them. Linuxiac and 9to5Linux both mention it. Cybersecurity News credits researcher Joshua Rogers for suggesting it.

Netlink is how user space talks to the kernel about routes and links. If you accept any reply that happens to arrive, you accept a confused or hostile message that was not yours. Checking that the reply matches the request is the kind of fix that sounds pedantic until the day it is not.

This is not a CVE in the table. It is still a reason Linux shops cannot say "those bugs are Windows" and go back to sleep.

If you run OpenVPN inside a network namespace, or you push routes into a table that other processes also Netlink, you want this validation. You will not see a new config knob. You will see it by being on 2.7.7.

## Route-check bug that deleted static routes

9to5Linux documents a reliability bug that will explain a ticket you might already have. `--stale-routes-check` was deleting permanent routes, not only the dynamic cached ones. Routes installed by `--iroute` and `--ifconfig-push` were getting swept. The fix introduces route flags and restricts the check to the routes that are supposed to expire.

If you have been chasing "CCD iroute vanished after N hours" and blaming the firewall, look at the version and at that flag. A security release that also stops deleting your static routes is the kind of coincidence that gets admins to patch.

Take a `ip route show` dump before the upgrade. Take one after. Diff them. If a /32 you push to a road warrior is missing in staging, you found the old bug. If it is missing after 2.7.7, you have a different problem.

## How to see your version and upgrade

```bash
openvpn --version
# or
/usr/sbin/openvpn --version
```

You want 2.7.7 in that first line. 2.7.6 or anything in 2.6 is the reason you are in this article.

If `openvpn --version` is missing, you are on a custom prefix. Try `/usr/local/sbin/openvpn --version` before you assume the package is absent. Custom prefixes are how two binaries survive a "successful" apt upgrade.

Debian/Ubuntu, after the security archive has the build:

```bash
sudo apt update
apt-cache policy openvpn
sudo apt install --only-upgrade openvpn
openvpn --version
```

RHEL-family, same idea with `dnf update openvpn` once the advisory exists. Do not jump to a random Copr because a blog said 2.7.7. Pin the advisory ID in the change ticket.

If you are on the official community repos or a vendor overlay, confirm the package signature and the changelog mention CVE-2026-84732. A version bump without the reliability-layer fix is not this release.

Restart is not optional. `systemctl restart openvpn` or the instance unit you actually use (`openvpn-server@server`, `openvpn@client`). Then:

```bash
systemctl is-active openvpn-server@server
journalctl -u openvpn-server@server -n 50 --no-pager
```

Look for the version in the startup banner and for TLS handshakes succeeding. Do this in a maintenance window if you do not have a second concentrator. If you do have a pair, patch the passive node, fail over, patch the other.

Keep a spare client config on a laptop that is not the box you just bounced. If the restart goes wrong, you still need a tunnel to the site. That laptop should already be on 2.7.7, or you are using the vulnerable client to fix the server, which is a joke you will only tell once.

Config files do not need a rewrite for this advisory. Do not "clean up" while you patch. `--stale-routes-check` behavior changes; leave the flag as it was unless you were hitting the deletion bug and want to re-enable it with eyes open.

If you terminate UDP on a non-standard port, say so in the ticket so the person watching `ss` does not declare the upgrade dead. 1194 is a habit, not a requirement. The hash and the version banner matter more than the port.

Client fleet: Linux laptops get the same package. Windows laptops need 2.7.7 because that is where six of the seven CVEs live. A patched server talking to a vulnerable Windows client is only half a job. Ship the Windows build through whatever you use for [SSH hardening](/posts/ssh-hardening-fail2ban-guide-2026/), the same change process, different binary.

## Verify the binary after the package lands

```bash
dpkg -l openvpn
rpm -q openvpn
which openvpn
readlink -f "$(which openvpn)"
sha256sum "$(readlink -f "$(which openvpn)")"
```

Record the hash in the ticket. Compare it with another host you upgraded from the same mirror. If they disagree, stop and figure out which mirror is lying.

```bash
apt-cache show openvpn | sed -n '1,40p'
```

You want the changelog reference, not a mystery rebuild. On systems with `debsums` or `rpm --verify`, run that too.

OpenVPN is less of a "compile it yourself" culture than HAProxy in some shops, which is good. If you *do* build from source, build in CI, sign the artifact, copy the artifact. Do not `make install` on the box that terminates TLS for the company.

Check listening state after restart:

```bash
ss -ulnp | grep openvpn
ss -tlnp | grep openvpn
```

UDP 1194 or whatever you moved to should be the process you just hashed. If a second openvpn is bound to the old port, you failed over in your head and not on disk.

## Windows CVEs you can ignore on a Linux concentrator (and why dual-stack shops cannot)

If every tunnel endpoint you care about is a Linux server talking to Linux servers, the CreateProcess and tapctl bugs are someone else's Tuesday. Still install 2.7.7 for CVE-2026-84732 and Netlink.

If you have Windows road warriors, and you do, even if the wiki says otherwise, those six CVEs are yours. Path abuse on `netsh`, NULL DACLs, config paths with `/`, NRPT buffer overread. Local users on a shared workstation are in that threat model. So is a laptop that ran a random "VPN helper."

Do not split the story in the status meeting. "Linux servers patched, Windows clients next sprint" is how you stay on 2.7.6 where it hurts.

The EPOCH key-retention change and the HMAC/UDP checksum behavior are extra reasons to test a single high-throughput tunnel in staging. If you wrap OpenVPN in a firewall that is picky about checksums, 9to5Linux's RFC 768 note is your hint to watch packet captures once, not to redesign the overlay.

If you terminate OpenVPN on a firewall appliance that vendors slowly, open a ticket with the vendor the same day and ask for the 2.7.7 advisory ID. Appliance lag is how concentrators stay on 2.6 into next year. Community Linux boxes should not wait for the appliance.

Patch the concentrator. Patch the clients. Write the hash down. Then go back to ignoring OpenVPN until the next advisory, which is the actual job.
