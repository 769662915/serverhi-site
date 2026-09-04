---
title: "Plex Urges Update to 1.43.3: 300,000 Servers Are Exposed"
description: "Plex patched multiple security flaws with 1.43.3, but thousands of servers are still reachable online. Here's how to update on Docker, NAS, and Linux."
pubDate: 2026-09-05
coverImage: "./cover.webp"
coverImageAlt: "A server rack with a media streaming interface and a warning shield icon on a console screen"
category: "security"
tags: ["Plex Media Server", "security patch", "Linux server", "Docker", "CVE", "server hardening"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: "intermediate"
estimatedTime: "15 minutes"
prerequisites:
  - "Each Plex server you run, on any platform"
  - "A container runtime if you run Plex in Docker"
---

Plex pushed an emergency update this week, and if you are one of the thousands of people running a media server that is reachable from the internet, it is the kind of patch you should not sit on. The company released Plex Media Server 1.43.3 and Plex Desktop 1.115.0 to fix a set of security issues, and [researchers estimate](https://cybernews.com/security/plex-security-alert-urges-servers-update) that roughly 300,000 Plex servers can still be found online. The exact number matters less than the fact that a media server exposed to the open internet is a genuinely attractive target.

The catch is that Plex has not published technical details for these particular vulnerabilities yet. CVE identifiers have been requested, but the severity, attack requirements, and affected components are still undisclosed. That vagueness is itself a reason to update now, rather than wait for a proof-of-concept to show up in your logs.

## What the patch actually covers

Even without CVEs, [Plex's own changelog](https://cybersecuritynews.com/plex-fix-multiple-security-flaws) gives you a sense of what the update closes off. It mentions accepting crafted API requests with invalid URIs, a potential vulnerability in the CompanionProxy component that handles network traffic, and the ability to modify TranscoderH264Options and the TranscoderH264OptionsOverride preference over the network.

The third one is worth reading twice. Being able to alter transcoding preferences over the network, without authentication, would let someone reconfigure how your server handles media. The full picture is still unclear until Plex publishes details, but the changelog alone is enough to treat this as more than a routine release.

There is also older context that makes this urgent. Cybernews notes that over 2,400 instances are still vulnerable to CVE-2025-34158, a severe vulnerability from last year that allows privilege escalation, persistent unauthorized access, and makes it hard to properly revoke compromised credentials. And China-nexus cyber-espionage actors have been observed leveraging a hacked Plex instance as a command-and-control server to target routers. A media server is not just a way to stream movies. It is a foothold.

## Why a media server is a target

Plex Media Server is a self-hosted application that streams your personal collection of movies, TV shows, music, and photos to any device that can reach it. It is free, it is popular, and a lot of people expose it directly to the internet so they can watch their library from anywhere.

The problem is that a server designed to accept connections from all over the internet is exactly the kind of machine attackers probe. These deployments often live on home connections or small VPS boxes, they run on a mix of operating systems and NAS devices, and they are frequently not patched on a schedule. When someone compromises one, they usually get a machine with media, a local network behind it, and sometimes credentials that matter.

The risk framing is simple. A vulnerable media server can open the door to unauthorized access, data exposure, service disruption, or further compromise, depending on the nature of the flaw. Because the current flaws are undisclosed, the safest assumption is that they are exploitable until proven otherwise.

## The fall-out from last year's CVE

The reason the patch counts as urgent is not just the new bugs. It is what is still sitting unpatched in the wild. [Cybernews reports](https://cybernews.com/security/plex-security-alert-urges-servers-update) that over 2,400 Plex instances remain vulnerable to CVE-2025-34158, a severe vulnerability disclosed last year. That one is not any mystery. It allows privilege escalation, gives an attacker persistent unauthorized access, and is notoriously difficult to clean up, because the credentials it compromises do not get properly revoked.

The practical consequence of persistent access is that even patching the current release does not fully undo the damage on a machine that was hit earlier. If a host was compromised through the older flaw, you are not just applying a package update, you are looking at potential credential rotation and deeper inspection. That is why the advisory should prompt you to check not only that you are on 1.43.3, but that nothing has been living in your Plex instance since before you patched.

There is a specific pattern to watch for. China-nexus cyber-espionage actors have previously been observed taking over a Plex instance and using it as a command-and-control server to target and control routers. That is a bigger deal than a compromised media box, because it turns your streaming server into a pivot point into your home network. A Plex server that is only supposed to serve movies should never be generating traffic toward your router.

## Update on Docker

If you run Plex in a container, this is the deployment that needs the most attention, because containers hide the upgrade path a bit.

The first step is to pull a fresh image that contains the fixed Plex Media Server release. Follow Plex's official container deployment guidance, and make sure your image tag points at a build that is not stale. If you have been using a `latest` tag, you need to actually pull and restart, not assume that a restart picks up the new package. A container that restarted days ago is still running the old image unless you pull it.

In practice that means running something like a `docker compose pull` if you use Compose, or a `docker pull` on the image, and then a `docker compose up -d` to recreate the container with the new image. Then confirm the running container is on the pulled digest with `docker ps` and, if you need to be sure, `docker inspect` on the image ID. The telltale sign that nothing changed is an image that updates but a container that stays on the old image ID. Check that the container is actually recreated, not just restarted.

While you are in there, review the things that often get forgotten. Check the image tags you are pinning, look at the container restart policy so it comes back up after a crash, and audit the exposed ports. A Plex container that publishes ports to the whole internet without a reverse proxy in front of it is a much bigger attack surface than one that sits behind TLS and authentication. If you have a reverse proxy, verify that it is not forwarding arbitrary requests.

The container-specific angle is worth spelling out because it is the part people skip. The image is the fix. If you do not pull the new image, you are running the vulnerable version no matter how many times you restart the container.

## Update on Linux and NAS

For Linux hosts the fix is a straightforward package update, but the exact path depends on your distribution. Ubuntu and Debian systems use the Debian `.deb` package, while Fedora and CentOS-based deployments use the `.rpm` package. Download the correct file for your distro from Plex's official Media Server downloads page and install it. Confirm the installed version is 1.43.3 or later after you are done.

For Windows and macOS desktops with automatic updates enabled, make sure you are actually running the patched versions. If you have disabled auto-update, or the update failed silently, check the version string and update manually. Desktop users should move to Plex Desktop 1.115.0.

NAS devices are the fiddly case, because update availability is handled by the hardware vendor rather than Plex. On systems like QNAP, TerraMaster, Western Digital, Netgear, and Synology, you typically download the correct package for your NAS model and install it through the device's web-based app management interface. Follow the vendor-specific instructions, because the update paths differ significantly between these platforms.

## How to check you are patched

After you update, verify rather than assume. In the server web interface, look at the version number and confirm it is 1.43.3 or higher. On the desktop side, check for 1.115.0 or later. If the interface is not reachable, check the package version from the command line on a Linux host, or from the update log if you are on a NAS.

Then think about exposure. If your Plex server is reachable from the open internet and you do not need it to be, consider putting it behind a reverse proxy with authentication and TLS, or restricting access to a VPN. The simplest way to cut the risk from these undisclosed flaws is to stop being an easy target in the first place.

If you use a firewall, ensure that only the necessary port is open. Plex's default port is 32400, but exposing it to the whole world when you could use a VPN or a proxy is an unnecessary risk. The stronger your perimeter, the less a single unpatched service costs you.

The things worth checking beyond the version string are who can reach this. If remote access is enabled and you do not use it, turn it off. If Plex is bound to all interfaces but only used locally, bind it to a specific address or put it behind a reverse proxy. Media servers are a classic case where convenience quietly becomes exposure.

## What to do first

Prioritize in this order. Update the server you care most about first. If you expose Plex to the internet, or you have remote access enabled, or the server holds a large personal media library, treat the update as urgent.

The reason to move now is not that the sky is falling. It is that Plex has deliberately not disclosed details, which usually means the vulnerabilities were found and quietly fixed before attackers had a clean writeup. The window where you can patch without a known exploit is exactly the window you want to be in. A self-hosted service is only as secure as its update discipline, and a patch you can apply in fifteen minutes is a cheap upgrade over an incident.

If you manage more than one Plex server, do not do this piecemeal. Update every instance, including the NAS in the closet you forgot you had and the old Docker container on the homelab box. The exposed server in the fleet is the one that gets found.

For related hardening, our guide to patching the recent kernel flaw walks through updating a running Linux system safely, and the SSH hardening guide covers stopping brute-force attacks on exposed services. If your Plex runs in a container, the Docker secrets guide is worth a look before the next rebuild.
