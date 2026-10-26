---
title: "20.04's PHP Is 7.4.3. Not 7.4.33."
description: "USN-8948-2 puts Ubuntu 20.04 php7.4 at 7.4.3-4ubuntu2.29+esm5. The 7.4.33 build is ondrej, and it is not published for 20.04."
pubDate: 2026-10-27
coverImage: "./cover.webp"
coverImageAlt: "An open binder and a rubber stamp on a server-closet shelf under fluorescent light, no screens."
category: "server-config"
tags: ["Ubuntu", "PHP", "Nginx", "USN-8948-2", "php-fpm"]
author: "ServerHi Editorial Team"
draft: false
---

The version you will grep for is not the version on the 20.04 notice. [USN-8948-2](https://ubuntu.com/security/notices/USN-8948-2), published October 21, 2026, lists Ubuntu 20.04's php7.4 packages at 7.4.3-4ubuntu2.29+esm5, and it marks them Ubuntu Pro. [The October 24 writeup that says the patch is in Ubuntu 20.04 Pro](https://pasqualepillitteri.it/en/news/26862/php2shell-php-74-patch-ubuntu-20-04-pro-hosting) uses 7.4.33 as the example of a number that does not move when a backport lands. 7.4.33 is a real string. It is not the string in USN-8948-2's 20.04 row. If you are confirming a focal box, `dpkg` has to print 7.4.3-4ubuntu2.29+esm5 or later. `php -v` printing 7.4.33 does not mean you installed that notice.

This is a package-string note, plus the nginx status code that lies. [USN-8948-1's 8.3.6 versus the 8.3.36 people expected](/posts/usn-8948-1-php-836-not-8336-2026) was the supported-release notice. [The Brotli module that did not move with nginx](/posts/nginx-module-abi-mismatch-apt-2026) was a different file. Focal's trap is the 7.4.3 prefix, and a 403 that ISPConfig will turn into a 500 if the map is missing.

## USN-8948-2's 20.04 row is 7.4.3, Pro, esm5

The notice text says USN-8948-1 fixed 22.04, 24.04, 26.04, and 26.10, and that USN-8948-2 provides the corresponding updates for 14.04, 16.04, 18.04, and 20.04. The page spells corresponding wrong, "corrosponding." I am not building a patch plan on a typo. I am not ignoring the release list around it. 26.10 is in that sentence. A summary that stops at 26.04 has dropped a release the notice named.

The 20.04 packages in the table I read:

| Package | Version | Access |
| --- | --- | --- |
| php7.4 | 7.4.3-4ubuntu2.29+esm5 | Ubuntu Pro |
| php7.4-cli | 7.4.3-4ubuntu2.29+esm5 | Ubuntu Pro |
| php7.4-fpm | 7.4.3-4ubuntu2.29+esm5 | Ubuntu Pro |
| php7.4-cgi | 7.4.3-4ubuntu2.29+esm5 | Ubuntu Pro |
| libapache2-mod-php7.4 | 7.4.3-4ubuntu2.29+esm5 | Ubuntu Pro |

7.4.3 is the upstream-looking prefix Ubuntu froze in the focal pocket. The security revision is `-4ubuntu2.29+esm5`. A scanner that wants PHP_VERSION_ID above 7.4.33 will mark this package vulnerable after it is patched, because 7.4.3 is less than 7.4.33 as a version comparison that ignores the Debian revision. A scanner that wants the esm5 suffix will mark an unpatched 7.4.3-4ubuntu2.28 box correctly and will also mark a patched box correctly, if it compares the full string. The check the hardening README prints is the one that matches the notice:

```bash
dpkg -s php7.4-cli | grep ^Version
```

You want `7.4.3-4ubuntu2.29+esm5` or later. Not `7.4.33`. Not a green check from `php -v` alone. The October 24 article is right that `php -v` cannot see a backport. It is easy to misread the example. The sentence says the package stays at 7.4.33, "or whatever number the distribution packaged it under." The parenthetical is the part that covers Ubuntu. The 7.4.33 is the part people will paste into a grep. On 20.04 the distribution's number is the 7.4.3 string above. Paste that.

The same notice has other .33 strings, and they are not 7.4.33 either. Ubuntu 16.04's php7.0 row is 7.0.33-0ubuntu0.16.04.16+esm22. That is php7.0, Pro, a different release. A search for "33" across the notice will hit 16.04 and miss the point of the 20.04 row, which has no 33 in it. 18.04 is php7.2 at 7.2.24-0ubuntu0.18.04.17+esm14. 14.04 is php5 at 5.5.9+dfsg-1ubuntu4.29+esm18. Four releases, four prefixes. One notice. Do not install the 16.04 php7.0 package on a 20.04 host because both pages mentioned a 33.

Pro is not a footnote. The table marks the 20.04 builds Ubuntu Pro. The notice is an ESM update. `pro status` on a machine that is not attached lists services that are available, not services that are active. The hardening notes say to check `attached` in `pro status --format json` before you trust the table. I am not going to restate Canonical's free-tier eligibility. The README records that ubuntu.com/pro, the 2022 announcement, the FAQ, and the personal terms do not use one sentence. If the box belongs to a client, ask Canonical. The version string does not answer that question. It answers whether the package is the esm5 build.

## 7.4.33-31 exists, and not for 20.04

The ondrej build is where 7.4.33 becomes a real package, on a different set of releases. The php2shell-hardening README, fetched with the notice, says that on October 21 `php7.4 1:7.4.33-31` was published for Debian 11, 12, and 13, and for Ubuntu 22.04, 24.04, and 26.04. The changelog line it cites is "Avoid state corruption via bailout" for CVE-2026-109618 and CVE-2026-109619, backported from 8.2.35. The next sentence is the one to underline: there is no such build for Ubuntu 20.04 or Debian 10.

So a runbook that says "install 7.4.33-31 on every PHP 7.4 host" will succeed on jammy and noble and fail, or no-op, on focal. Focal's fix is the Pro package at 7.4.3-4ubuntu2.29+esm5. Mixing the two strings is how a 20.04 host stays on the vulnerable pocket while the ticket is closed against 7.4.33.

There is a second trap if 7.4 came from the ondrej PPA on a 20.04 machine. Those packages carry epoch `1:`. The README's example is `1:7.4.33-20+ubuntu20.04.1`. Apt sees an epoch 1 package as newer than Ubuntu's epoch-less ESM build, so it will not move to 7.4.3-4ubuntu2.29+esm5 on its own. You install the ESM versions explicitly. The PPA's focal packages were removed in June 2025 and the downloads 404, so the README's advice is to `dpkg-repack` what is installed before you switch. I am not going to paste a longer migration than that. The point is that "apt upgrade" is not the confirmation. `dpkg -s` is.

Upstream's own October 21 releases are a third list, and they are not focal either. The October 24 article and the README agree on 8.5.12, 8.4.27, 8.3.36, and 8.2.35. PHP 8.1 and older do not get a project release. Minimal source branches exist for 7.4, 8.0, and 8.1. A focal box does not become safe by being told to `apt install php8.3` unless you meant to change the major version. The supported path on 20.04, in the notice, is the esm5 build of php7.4. [The 8.3.6 string on USN-8948-1](/posts/usn-8948-1-php-836-not-8336-2026) was noble's package. It is not focal's package. Do not copy it down a release.

The October 21 morning article, timestamped 08:51 UTC, said the fixed versions had not been published yet and pointed at a 14:00 UTC patch window. That was true of the hour it was written. By the notice's publication date, the same calendar day, USN-8948-2 had a version table. Do not keep the morning FAQ's "not published" next to an evening `dpkg` check. The versions moved. The 7.4.33 example in the later article did not become the 20.04 row.

## A 403 without the volatile map is a 500 on ISPConfig

The edge rules are a stopgap, and the status code is the part that will page the wrong person.

php2shell here is CVE-2026-109618 and CVE-2026-109619. The hardening repo is explicit that the rules are unofficial, that they block legitimate uploads, and that PHP says only an update is a complete fix. Use them on routes that do not take uploads, in staging first. The nginx files in that repo are the ones I am citing, not a paraphrase of a screenshot I did not take.

`nginx/php2shell-maps.conf` is included in the `http` context. The multipart detector maps `$request_method:$content_type`. POST, PUT, and PATCH with a Content-Type that PHP will treat as multipart set `$pp_mp` to 1. PUT and PATCH are in the regex because PHP 8.4's `request_parse_body()` parses multipart on those methods too. A rule that only matches POST is the older grammar. The comma form matters. PHP lowercases Content-Type and truncates at the first semicolon, comma, or space, then looks for `boundary`. `multipart/form-data,boundary=x` is multipart to PHP. A pattern that requires a semicolon or whitespace after `form-data` misses the comma. The map's regex allows `;`, `,`, or whitespace, or the end of the header.

Upload routes are a second map, on `$request_uri`, not on `$uri`. `$uri` becomes `/index.php` after `try_files`. An exception written against `$uri` will not see `/upload`. The shipped examples are `/upload`, `/api/upload`, and `/wp-admin/async-upload.php`, anchored so `/upload` does not also open `/uploads-report`. Adapt the list. An empty exception list blocks every multipart POST. A sloppy exception list leaves the parser exposed on the route you meant to save, because the parser runs before application code and before login.

The error-page map is the line the October 21 article called out, and the repo marks it critical. With `error_page 403 ...` and `recursive_error_pages on`, which the repo calls the ISPConfig default, a plain `if ($pp_block_mp) { return 403; }` triggers an internal redirect. The redirect re-evaluates the `if` with the same method and Content-Type. Nginx logs a rewrite cycle and answers HTTP 500. PHP is still not reached. The client sees 500. The log fills. The block "worked" and the status code lied.

The guard is `$pp_errpage`, a map on `$uri` with `volatile`, matching `^/error/[0-9]{3}\.html$`. `$uri` changes to the error page on the internal redirect. `$request_uri` does not. Without `volatile`, nginx reuses the value computed before the redirect, and the cycle stays. The repo says this was verified on nginx 1.24 and in production. The final map sets `$pp_block_mp` to 1 only when the three flags concatenate to `100`: multipart, not an upload route, not the error page. That map is `volatile` too.

The server snippet is one line, inside `server`, before the locations that pass to PHP:

```nginx
if ($pp_block_mp) { return 403; }
```

`return 444` drops the connection and avoids the error-page redirect. The snippet says to use 444 only if you do not use `error_page`. If you do, keep 403 and keep the map. A copy-paste that takes the 403 and skips the maps will produce the 500. A copy-paste that takes 444 onto an ISPConfig host will skip the error page the panel expects. Match the pair to the host.

Apache's parallel footgun is the variable name. The README says to use `%{HTTP:Content-Type}`, not `%{CONTENT_TYPE}`. `.htaccess` can be ignored under `AllowOverride` limits, `ProxyPassMatch`, or a rule placed after an earlier `[L]`. A 403 you cannot see in the access log may be a rule that never loaded. Check the loaded config, not the file you edited.

## Do not turn upload progress back on with the October 21 packages

CVE-2026-115560 is the third id, dated October 23, 2026, in the README, with no release yet. The October 21 versions do not contain that fix. The mitigation the repo says PHP asks for is `session.upload_progress.enabled = 0`. The October 24 article says the same thing in the FAQ: after the patch is verified, the multipart blocking rules can come off where possible, and the upload-progress line stays off until CVE-2026-115560 is fixed.

Those are two different removals. Taking the nginx map out after `dpkg` shows esm5 is what the "after the update" section allows, on a branch that actually got the two October 21 fixes. Turning upload progress back on because "we patched" re-opens the third bug. The README lists three conditions that have to be true together for that bug: `session.serialize_handler` set to `php_binary` or `php_serialize`, the application switching it to `php` with `ini_set()` before `session_start()`, and upload progress still enabled. Applications that never change the handler can leave the feature on, and the repo gives a grep for the `ini_set`. I am not going to tell every pool to flip the setting without that grep. I am going to say the October 21 packages are not a reason to flip it back on.

The morning article's note that one researcher thought `session.upload_progress` covered only one of the two original bugs still matters as a limit, not as a substitute for the notice. Disabling the setting is not the esm5 package. The esm5 package is not a reason to skip the third CVE. A ticket that says "patched, rules removed, upload progress restored" has done the first removal and undone the mitigation the later CVE still wants.

Confirm the package. Then decide about the maps. Then leave upload progress off until a release note names CVE-2026-115560. The 7.4.33 you were going to grep for is a different distribution's number, on a release this notice does not use for 20.04.
