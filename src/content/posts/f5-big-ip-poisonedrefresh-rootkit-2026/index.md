---
title: "F5 BIG-IP APM Grew a Fileless Rootkit. Hashes Will Not Save You"
description: "Sophos and ESET describe PoisonedRefresh: a Linux implant that serves a PHP web shell from memory on BIG-IP APM webtop files. Disk looks clean. Check mmap, a pipe, and HTTP 201 pretending to be CSS."
pubDate: 2026-09-14
coverImage: "./cover.webp"
coverImageAlt: "Network rack with an F5-style appliance silhouette and a laptop showing a terminal, cool aisle lighting, no logos."
category: security
tags: ["F5", "BIG-IP", "rootkit", "PHP", "Linux"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: advanced
estimatedTime: "40 minutes"
prerequisites: ["Root or equivalent on BIG-IP APM", "Ability to inspect Apache workers and HTTP logs", "Change window if you have to rebuild the box"]
osCompatibility: ["F5 BIG-IP APM with webtop", "Apache + PHP on the management/data plane you actually run"]
---

A load balancer that still answers health checks is not therefore clean. [We already had that sentence for HAProxy](/posts/haproxy-ted-backdoor-verify-builds-2026/). This week it is F5, and the file on disk is the wrong place to look.

[BleepingComputer, working from Sophos](https://www.bleepingcomputer.com/news/security/hackers-breach-f5-big-ip-apm-devices-to-deploy-linux-rootkit), describes a Linux rootkit in BIG-IP Access Policy Manager environments that intercepts PHP file loading and injects a web shell into memory. ESET's name for it is PoisonedRefresh. The PHP files on disk do not change. File integrity monitoring passes. The Apache process is not running the file you hashed.

## How they got in, as far as the writeups go

Sophos treats this as a second stage. The likely door is CVE-2025-53521, a critical unauthenticated RCE on BIG-IP APM when an access policy sits on a virtual server. F5 had it as a denial-of-service bug first, then reclassified it as RCE in March. [Security Affairs, repeating Sophos](https://securityaffairs.com/198746/malware/poisonedrefresh-a-fileless-linux-rootkit-that-injects-php-web-shells-into-f5-big-ip-apm), says Shadowserver saw 795 internet-exposed endpoints at disclosure. If that box is still on the public internet with APM webtop, you are not doing a theoretical exercise.

First stage, still per Sophos: a modified Linux `umount` binary that infects `/usr/sbin/httpd`, tampers with SELinux, and embeds itself in BIG-IP upgrade images so a "patch the box" cycle does not wash it off. Second stage is the memory implant.

[CSO Online](https://www.csoonline.com/article/4220693/stealth-rootkit-targeting-f5-big-ip-could-expose-enterprise-identity-gateways.html) is the piece that should rearrange your incident playbook. Sean Malone, CISO at BeyondTrust: the significance is not only that the shell is stealthier. It defeats the assumption most response playbooks rest on, that the file on disk tells you what the server is running.

If your IR runbook starts with `sha256sum` on the PHP tree, you will close the ticket and stay owned.

## What the implant actually does

Sophos: custom ELF loading, function hooking, runtime patching, aimed at APM webtop, not generic Apache. Strings hidden with RC4. Execution before `main()` by intercepting `__libc_start_main`. Hook on `apr_dso_load`. When PHP opens one of three legitimate webtop scripts and maps it, the implant returns a different view.

The three files:

- `apm_css.php3`
- `full_wt.php3`
- `webtop_popup_css.php3`

On disk they stay the vendor file. In the worker they start with a web shell. The shell takes specially formatted "magic" requests, decrypts them, runs them through PHP `eval()`, and answers HTTP 201 with a CSS content type. That is a command channel dressed as a stylesheet.

Those filenames are why this is not a random LAMP rootkit. They exist because APM webtop exists. If you do not run webtop, you still want the CVE closed. You do not need to memorize the PHP names.

## What to look for without trusting the filesystem

Security Affairs lists Sophos's indicators. I am copying the ones that are actually operational:

- Unusual `mmap()` or `mprotect()` shortly after `libphp` loads inside Apache workers
- Reads of `/proc/self/maps` followed by permission changes
- Local socket `/run/bigtlog.pipe`
- HTTP 201 responses with `Content-Type: text/css` that are not a real CSS or asset request
- SELinux policy that you did not change
- BIG-IP upgrade images that do not match vendor

Sample hash they published:

`26bd5b0722d1dbab5db749a063c49bc8638653ac2addfead7a9cb3d6d57bccc9`

A hash of a sample in a lab is not a detector on your box. Use it in a malware repo search. Do not `grep` the live PHP tree and call it done.

Practical order if you run APM webtop:

1. Assume CVE-2025-53521 is in play until you can prove the build is past the fixed version F5 documented. I am not pasting a TMOS string from memory. Read the F5 notice for 53521 and compare `tmsh show sys version`.
2. Pull HTTP logs for `201` plus `text/css` on those three script names. A stylesheet should not be created as a 201 from a magic query string.
3. On a suspect device, inspect Apache workers for `mprotect` after PHP load. If you do not have tracing, you are already past "quick grep" and into rebuild.
4. Treat `/run/bigtlog.pipe` as hostile if you did not put it there.
5. Do not "clean" PHP files. They are already clean. Rebuild from known vendor images, on hardware you trust, after rotating every identity the APM had. APM is an identity gateway. The point of the implant is that identity.

If the upgrade image is poisoned, a normal F5 upgrade is a persistence mechanism. Sophos said the installer embeds in upgrade images. That means your patch window can re-infect you. Vendor image checksums from F5, not from the box you already do not trust.

## What not to do

Do not take the box out of service, hash `/var`, and put it back. Malone's line is the whole article.

Do not copy-paste a generic Linux rootkit killer. This hooks APR and PHP mmap on a specific appliance. Your Ubuntu playbook is the wrong genus.

Do not leave APM webtop on the internet while you "monitor." 795 exposed at disclosure was already too many.

[Google's warning about attackers going after AI coding tools](/posts/google-gtig-ai-coding-tools-security-2026/) is a different perimeter. This one is the device that already sits in front of people. If PoisonedRefresh is on it, the webtop is the attacker's CSS file.

## Logging you can turn on without pretending you have a memory forensics lab

If the box is still in production and you cannot take a memory dump tonight, you can still make the command channel noisy.

- Log method, status, content-type, and query string for the three webtop PHP names. A GET that returns 200 and real CSS is boring. A POST or a weird query that returns 201 and `text/css` is the implant talking.
- Alert on new Unix sockets under `/run` that are not in your baseline. `bigtlog.pipe` is the published name. Attackers rename things. Baseline is the control, not the string.
- Compare running `httpd` to the vendor package. First stage infects `/usr/sbin/httpd`. That is a binary problem, like Ted-in-HAProxy, except the second stage then lies about PHP. Check both.
- Snapshot SELinux. If enforcing flipped or a module landed that you did not document, that is persistence, not a coincidence.

Do this from a jump host you trust. Do not install extra agents on the F5 to "help investigate." The appliance is the crime scene.

If you do not run APM, still patch 53521 if F5 says your module is in scope. RCE on an identity box does not require webtop to ruin your week. The memory shell is the webtop-shaped payload. The CVE is the door.

Network control: APM webtop does not belong on 0.0.0.0/0. Put it behind your VPN or a source-IP allow list. 795 exposed endpoints were a gift. Stop being on that list.

Patch 53521. Look for 201s that think they are stylesheets. If either looks wrong, rebuild. The disk will lie to you until you do.
