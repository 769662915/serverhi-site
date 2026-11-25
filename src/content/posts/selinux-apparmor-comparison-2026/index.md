---
title: "Read an access denial on SELinux and AppArmor systems"
description: "Identify the active confinement policy on RHEL or Ubuntu, interpret a denied file read and choose a narrow correction you can verify."
pubDate: 2026-04-04
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for SELinux vs AppArmor: Choosing the Right Linux Security Module in 2026"
category: "security"
tags: [Security, SELinux, AppArmor, Linux]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

A web server receives a permission error reading a file under a new document root. Ordinary Unix permissions and a mandatory access policy can both deny that read. Establish the service account, the file path and the timestamp before changing policy. Reproduce the **ordinary request** on a test host and look up the matching log entry.

## Find the policy that applies to the service

| Inspect | SELinux on a typical enforcing RHEL 9 server | AppArmor on Ubuntu with a confined service |
|---|---|---|
| Mode | `getenforce` and `sestatus` | `sudo aa-status` lists loaded profiles and their modes. |
| Subject and object | `ps -eZ` shows process contexts. `ls -Zd /srv/site /srv/site/index.html` shows file contexts. | Identify the program's loaded profile and resolved path. A loaded framework alone does not imply the particular service has a profile. |
| Denial record | `sudo ausearch -m AVC -ts recent`. Look for the source type, target type, object class and requested permission. | `sudo journalctl -k -b`. Find `apparmor="DENIED"`, the named `profile`, `operation`, `name` and denied mask. Check the audit log as well if auditd is collecting events. |

SELinux evaluates policy between labelled subjects and objects. A move or a restore can leave an unexpected file label. AppArmor profiles commonly authorize file access by path, so moving the served file can put it outside the profile's allowed paths. Also check parent-directory traversal, file ownership and service configuration in either case.

## Work a denial back to one file

**SELinux example.** If the AVC shows an HTTP service reading a file with an unexpected target type, compare `ls -Z` with `matchpathcon /srv/site/index.html`. Use `restorecon -n -v /srv/site/index.html` to preview a relabel according to the configured mapping. For a nonstandard document root, first verify which persistent file-context mapping is appropriate for the service and whether it needs read-only or write access. Retest a known page and inspect the resulting context. [Red Hat SELinux troubleshooting](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/troubleshooting-problems-related-to-selinux_using-selinux)

**AppArmor example.** A record with `operation="open"`, `name="/srv/site/index.html"` and `denied_mask="r"` tells you which read the named profile stopped. Check the profile's local include and packaging conventions. If the path is meant to be served, review a narrow read rule for that file or dedicated tree, validate and reload the specific profile in a lab. Verify that the intended file is readable and an unrelated private path remains protected. [Ubuntu AppArmor documentation](https://documentation.ubuntu.com/server/how-to/security/apparmor/)

For an existing fleet, the distribution's supported policy, available service profiles, team experience and audit tooling are more useful selection criteria than a general security ranking. Record the old mapping or local rule before editing it. A successful test means one intended request succeeded **with enforcement still active**.
