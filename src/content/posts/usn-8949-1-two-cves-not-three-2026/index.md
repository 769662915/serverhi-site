---
title: "USN-8949-1 Names Two CVEs. The Roundup Says Three."
description: "USN-8949-1 names CVE-2026-101258 and CVE-2026-103226. LinuxSecurity's lede says three Ghostscript flaws. libgs10 is 24.04; libgs9 is 22.04."
pubDate: 2026-10-26
coverImage: "./cover.webp"
coverImageAlt: "A server-closet shelf with two manila folders, a rubber stamp, blank paper, and a small printer under fluorescent light."
category: "linux"
tags: ["Ubuntu", "Ghostscript", "USN-8949-1", "libgs", "CVE-2026-101258"]
author: "ServerHi Editorial Team"
draft: false
---

The count in the roundup is not the count in the notice. [USN-8949-1](https://ubuntu.com/security/notices/USN-8949-1) describes two Ghostscript issues, CVE-2026-101258 and CVE-2026-103226. [LinuxSecurity's October 21 writeup](https://linuxsecurity.com/advisories/ubuntu/ubuntu-8949-1-ghostscript) opens with a different integer: Ubuntu fixed three Ghostscript vulnerabilities affecting releases 16.04 through 26.10. The same page's reference line prints the two CVE IDs and stops. If you are patching from the lede, you will go looking for a third identifier the notice text I retrieved does not name.

This is a package note, not a kernel note. [Ubuntu 26.10's kernel string and the rc6 package](/posts/ubuntu-26-10-kernel-rc6-not-7-3-final-2026) were a different mismatch. [USN-8948-1's PHP version](/posts/usn-8948-1-php-836-not-8336-2026) was a different notice. Ghostscript's trap is the binary package name, which changes between 22.04 and 24.04, and a pair of 9.26 builds that are not the same revision.

## USN-8949-1 names two CVEs, and what each one says

CVE-2026-101258 is the sandbox one. Rick de Jager found that Ghostscript incorrectly handled memory under certain circumstances when processing PostScript documents. If a user or an automated system is tricked into processing a specially crafted document, an attacker could possibly bypass the sandbox and execute arbitrary code. That is the notice's wording. "Possibly" is in the sentence. I am not upgrading it to "will."

CVE-2026-103226 is the font one. Ghostscript incorrectly handled memory when converting certain fonts. A crafted file could make Ghostscript crash, or possibly execute arbitrary code. The notice does not, in the paragraph I used, call this one a sandbox bypass. LinuxSecurity's title, "Ubuntu Ghostscript Fixes Sandbox Bypass and Code Execution," matches the pair if you let the first CVE carry the sandbox and either CVE carry code execution. It does not create a third bug. The lede's "three" is the problem. The title's two effects are already in the two IDs.

The reference line on the roundup is the line I would trust over the lede, and only because it matches the notice: CVE-2026-101258, CVE-2026-103226. Severity on that roundup page is labeled important. The notice itself, in the text I pulled, does not need the roundup's severity word to tell you to update. A standard system update is the instruction. The version table is how you check the update landed.

I did not find a third CVE ID in the notice details. I am not going to invent CVE-2026-something so the lede becomes true. If Ubuntu adds an ID later, the notice will have three lines. On October 26 it had two.

## libgs10 and libgs9 are not a typo

The fixed packages split on the release boundary between jammy and noble.

| Release | Package | Version |
| --- | --- | --- |
| 26.10 stonking | libgs10, libgs10-common | 10.07.1~dfsg-1ubuntu2.1 |
| 26.04 LTS resolute | libgs10, libgs10-common | 10.06.0~dfsg-3ubuntu1.2 |
| 24.04 LTS noble | libgs10, libgs10-common | 10.02.1~dfsg1-0ubuntu7.10 |
| 22.04 LTS jammy | libgs9, libgs9-common | 9.55.0~dfsg1-0ubuntu5.15 |
| 20.04 LTS focal | libgs9, libgs9-common | 9.50~dfsg-5ubuntu4.15+esm3 |
| 18.04 LTS bionic | libgs9, libgs9-common | 9.26~dfsg+0-0ubuntu0.18.04.18+esm6 |
| 16.04 LTS xenial | libgs9, libgs9-common | 9.26~dfsg+0-0ubuntu0.16.04.14+esm11 |

`apt install libgs10` is a reasonable command on 24.04, 26.04, and 26.10. It is the wrong name on 22.04, 20.04, 18.04, and 16.04. Those four ship libgs9. A config-management snippet that pins `libgs10` because the newest LTS uses it will fail the package lookup on jammy, and the failure will look like a mirror problem. It is a rename. Check `dpkg -l 'libgs*'` before you copy a version string into an Ansible task.

The versions are not interchangeable across the rename, and they are not interchangeable inside libgs10 either. 26.10's fix is 10.07.1~dfsg-1ubuntu2.1. 26.04's is 10.06.0~dfsg-3ubuntu1.2. 24.04's is 10.02.1~dfsg1-0ubuntu7.10. Note the `dfsg` versus `dfsg1`. 26.10 and 26.04 use `dfsg`. 24.04 and 22.04 use `dfsg1`. If you paste 10.07.1~dfsg-1ubuntu2.1 into a noble pin, apt will not find that string. Noble's string has `dfsg1` and `10.02.1` and `ubuntu7.10`.

20.04, 18.04, and 16.04 are Ubuntu Pro lines in the notice. Focal is `+esm3`. Bionic is `+esm6`. Xenial is `+esm11`, and the notice marks it as Ubuntu Pro via the Legacy Support add-on. A machine without Pro will not see those esm revisions in the ordinary pocket. `apt update` succeeding is not the same as the esm pocket being enabled. If `apt-cache policy libgs9` on focal does not show `9.50~dfsg-5ubuntu4.15+esm3`, you are not on the build the notice names.

LinuxSecurity's version block, for the releases it printed in full, matched the notice through 18.04's esm6 string. I am not claiming the roundup mistyped the package versions. I am claiming the lede mistyped the count. The 16.04 string in my first pull of that page was cut off. The notice's xenial string is the one in the table above. Use that, not a truncated blog cell.

## 9.26 is two packages

18.04 and 16.04 both sit on upstream 9.26. That is where a copied pin goes wrong even after you have remembered libgs9.

Bionic: `9.26~dfsg+0-0ubuntu0.18.04.18+esm6`

Xenial: `9.26~dfsg+0-0ubuntu0.16.04.14+esm11`

The `18.04.18` and `16.04.14` segments are not decoration. Neither is esm6 versus esm11. A host that is 16.04 and "updated to 9.26" may already have been on 9.26 for years. The notice's fix is the esm11 revision, not the upstream tuple. `ghostscript --version` printing 9.26 does not tell you which Ubuntu revision you have. `dpkg -l libgs9` does.

22.04 is not in that pair. Jammy's fix is 9.55.0~dfsg1-0ubuntu5.15. If a runbook says "Ghostscript 9.26 or later is patched," it has erased jammy's 9.55 pin and noble's 10.02 pin and the two 10.0x pins above them. Later-than-9.26 is not the test. The test is the version string for the release you are on.

Codenames in the notice are worth writing down once, because a script that matches on "noble" will miss a host that only knows itself as 24.04, and a script that matches on 26.04 will miss the word resolute if that is all the mirror path contains. 26.10 is stonking. 26.04 is resolute. 24.04 is noble. 22.04 is jammy. 20.04 is focal. 18.04 is bionic. 16.04 is xenial. The notice uses both the number and the name. Your inventory should too.

## What to run, and what not to copy from the neighbor notices

On a Pro-entitled or currently supported host, the notice's own instruction is a normal update. Then check the package, not the marketing name.

```bash
apt-get update
apt-get install --only-upgrade libgs10 libgs10-common
dpkg -l libgs10 libgs10-common
```

That pair is for 24.04 and newer. On 22.04 and older, swap in libgs9 and libgs9-common. I am not giving you one command that works on every release, because the notice does not have one package name. If the upgrade reports the package is already the newest version and the version is older than the table, you are looking at the wrong pocket or the wrong name. `apt-cache policy libgs10` on jammy should fail to find a candidate. That failure is expected. Switch names. Do not add a random PPA to manufacture libgs10 on 22.04.

Image builds that vendor a .deb need the filename, not "latest ghostscript." Compare what the image has to the row for that release, including `dfsg` versus `dfsg1`. I do not have the previous noble revision from the notice text. I have the fixed one: `10.02.1~dfsg1-0ubuntu7.10`. If your pin file says anything else, the image is not on this notice yet, or the pin was copied from 26.04.

## Holds and phased mirrors will lie about "already newest"

`apt-get install --only-upgrade` reports success when the candidate equals the installed version. That report does not read USN-8949-1. If a host is held, or if unattended-upgrades has not caught up, or if the mirror you use is a snapshot from October 20, the candidate can be older than the table and apt will still sound finished.

Check the candidate, not the exit code.

```bash
apt-cache policy libgs10
apt-cache policy libgs9
```

On noble you want the libgs10 candidate to show `10.02.1~dfsg1-0ubuntu7.10`. On jammy you want libgs9 at `9.55.0~dfsg1-0ubuntu5.15`, and you want libgs10 to have no candidate. On focal, if the candidate is `9.50~dfsg-5ubuntu4.15` without `+esm3`, Pro is not in the sources you just updated. The notice's focal fix is the esm3 revision. Shipping the non-esm string and calling the ticket done is how the roundup's confidence gets into a changelog.

Phased updates are a separate delay. Ubuntu sometimes rolls a pocket out as a percentage. A notice dated October 21 does not promise your mirror offered the build on October 21 afternoon. LinuxSecurity's timestamp is 10:55 AM EDT that day. Your `apt update` at 11:00 AM EDT might still have been early. Re-check the policy output on October 26 before you close the ticket from a stale log. The version string is the close condition. The USN id in a comment is not.

A container base image tagged `ubuntu:24.04` is not a version pin. The tag moves. A Dockerfile that ran `apt-get upgrade` last month does not contain `ubuntu7.10` unless the layer was rebuilt after the pocket carried it. Rebuild, then `dpkg -l` inside the image. Do not assume the host's upgrade updated the image. They do not share an apt database.

The source package name in the roundup is ghostscript, "PostScript and PDF interpreter." The binary packages in the notice table are libgs10 or libgs9, plus the matching `-common` package. If your inventory groups by source package, one ghostscript row is fine. If it groups by the name you pass to apt, you need the libgs name for that release, or the upgrade command will no-op on a package that is not installed. `dpkg -l ghostscript` can show a metapackage while the library the notice lists is the thing with the CVE. Upgrade the name in the table. Then upgrade the metapackage if you want the binary clients, but do not stop at the metapackage and skip libgs because the lede said "Ghostscript."

Automation that files one ticket per USN should key off the id USN-8949-1, not off the word three. A parser that reads "three Ghostscript vulnerabilities" and opens three subtasks will invent a third CVE the reference line does not contain. Parse the CVE list. If the list has two IDs, open two, or open one ticket with two IDs. The lede is prose. The reference line is the list.

Poppler's USN-8950-1 landed the same day and is a different library. c-ares is USN-8951-1, also October 21, and it is not Ghostscript either. [The 5.4 kernel note](/posts/ubuntu-usn-8920-5-4-not-oem-2026) does not patch `gs`. If your scan dumped every October 21 USN into one ticket, split them before you assign the package. A Ghostscript ticket closed because someone upgraded poppler is not closed.

Automated pipelines that render PostScript or fonts are the path the notice describes: a user or an automated system tricked into processing a crafted file. A print server, a thumbnailer, a mail gateway that runs `gs` on attachments, a CI job that converts untrusted uploads. Those are the places the sandbox bypass matters. A desktop that never opens foreign PostScript is a smaller exposure, and the notice does not rank hosts for you. It gives you the version. Install that version on the hosts that run `gs`, and do not let a roundup's "three" send you hunting an ID that is not in the table.
