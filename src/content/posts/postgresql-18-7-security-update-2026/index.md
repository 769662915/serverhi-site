---
title: "PostgreSQL 18.7 Patches 52 Flaws After Public RCE Exploit"
description: "PostgreSQL 18.7, 17.12, 16.16, 15.20 and 14.25 fix 52 flaws. CVE-2026-116331 lets any login role run code as the database user, and exploit code is now public."
pubDate: 2026-11-26
coverImage: "./cover.webp"
coverImageAlt: "A dim server room with a rack of database servers, one status light glowing amber, cool light, no logos and no readable text."
category: "security"
tags: ["PostgreSQL", "Security", "CVE", "Linux", "Database"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "25 minutes"
prerequisites:
  - "A way to read the PostgreSQL version the server is actually running, not only the version named in a ticket or a compose file"
  - "Permission to upgrade the database server, or a confirmed note that it is a managed service"
  - "A note of whether the server runs on a Linux package, in a container, or as a managed service"
osCompatibility:
  - "PostgreSQL 18.6 and earlier, 17.11 and earlier, 16.15 and earlier, 15.19 and earlier, 14.24 and earlier"
  - "Debian and Ubuntu with the PGDG apt repository, RHEL and Fedora with dnf, or the official postgres container image"
---

On 12 November 2026 the project shipped 18.7, 17.12, 16.16, 15.20 and 14.25, fixing 52 vulnerabilities. Thirty-two of them score 8.8, the highest in the release. Two of the flaws let an authenticated database user run code on the server, and six days after the release researchers published working exploit primitives for one of them. The fix for every supported branch is a minor version upgrade and a restart. The work that takes time is finding every server, every container and every backup host that still runs the old binaries.

The [release announcement](https://www.postgresql.org/about/news/postgresql-187-1712-1616-1520-1425-and-19-rc-2-released-3442/) lists the five versions and the CVE pages behind them. The announcement also shipped PostgreSQL 19 RC2 alongside the security releases. The 18.7 line is a patch release: nothing in it changes SQL behavior except the security fixes. That matters for scheduling, because a minor PostgreSQL upgrade does not require a dump and restore, and it does not change the on-disk format. It still needs a restart, and the restart is the part that needs a maintenance window.

## What the November release fixes

The headline numbers come from the release itself: 52 vulnerabilities fixed across five branches, with 32 of them rated 8.8. The [CVE-2026-116331 page](https://www.postgresql.org/support/security/CVE-2026-116331/) and the [CVE-2026-6460 page](https://www.postgresql.org/support/security/CVE-2026-6460/) describe the two flaws that dominate the release, and both are type confusion bugs that turn a database login into code execution on the server.

| Branch | Affected versions | Fixed version |
| --- | --- | --- |
| PostgreSQL 18 | 18.0 through 18.6 | 18.7 |
| PostgreSQL 17 | 17.0 through 17.11 | 17.12 |
| PostgreSQL 16 | 16.0 through 16.15 | 16.16 |
| PostgreSQL 15 | 15.0 through 15.19 | 15.20 |
| PostgreSQL 14 | 14.0 through 14.24 | 14.25 (end of life) |

CVE-2026-116331 is a type confusion in the min/max aggregate optimization, rated CVSS 3.1 8.8 High. CVE-2026-6460 is a type confusion in composite types, also rated 8.8, and the researcher who reported it traces the underlying behavior to a commit from May 2004. The release also contains a flaw that needs no login at all: CVE-2026-116322 lets an unauthenticated client trigger a restart of PostgreSQL 18 servers. Three of the 8.8-rated flaws sit in pg_dump and pg_restore, including CVE-2026-116314, where a crafted archive makes pg_restore run code as the user who started it. The client tools need the update on every machine that runs backups or restores, including machines that do not host a database.

Most of the 8.8 entries share one shape: an authenticated user, low complexity, no user interaction, and full compromise of confidentiality, integrity and availability within the database host. The attacker does not need a superuser account. A login role with the privileges an application already has is enough. That is why the triage question is not "do we expose PostgreSQL to the internet" but "which roles can log in, and what can they create."

The release also closes a door that has been open for years. PostgreSQL 14.25 is the final release of the PostgreSQL 14 line, which reached end of life on 12 November 2026. Version 13 reached that point a year earlier, so the November release contains nothing for 13 or any older version. Teams still running those versions get no upstream fix, and the vulnerable code exists there too: a source audit found CVE-2026-6460 in every version back to PostgreSQL 8.4.

## How CVE-2026-116331 turns a login into code execution

CVE-2026-116331 lives in the planner's min/max aggregate optimization. When a query asks for the minimum or maximum of a column, the planner can skip a full scan and read the extreme value straight from a B-tree index. That shortcut is only safe when the aggregate returns the same type it takes in. The planner trusted the SORTOP option on a user-defined aggregate to mean exactly that, and it never checked the promise.

The check sits in `fetch_agg_sort_op()` in `src/backend/optimizer/plan/planagg.c`. The function reads the sort operator from the aggregate's catalog entry and hands it back. It never compares `pg_proc.prorettype`, the aggregate's declared return type, with the type of its single argument. A custom aggregate can accept `int8`, keep the maximum in an `int8` state, and convert the result to `text` in its final function. That declaration is valid SQL. The planner then replaces the scan with an index lookup that returns the extreme row directly, skipping the final function entirely.

The confusion follows from how PostgreSQL passes values. On a 64-bit build, an `int8` travels by value in an 8-byte Datum, while `text` travels by reference as a pointer. The executor reads the result as the declared output type, so it treats the integer bits as a pointer to `text`. Repeating the pattern with different type pairs turns the confusion into a read, and then into control-flow hijacking: a leaked heap address defeats address-space layout randomization, and a forged expanded-object header passed to a function such as `length()` reaches an indirect call that ends in `system()`. The research behind this chain was published by Depthfirst on 18 November 2026, and the analysis that documents it is dated 19 November 2026.

The chain needs very little privilege. Any PostgreSQL login role can create the objects in its temporary schema, because TEMPORARY is granted to PUBLIC by default. A default login role can create a temporary table, a B-tree index on it, a function and an aggregate in `pg_temp`, and then run the aggregate over the indexed column. The planner takes the index shortcut, the final function never runs, and the caller reads raw input bytes as a pointer. It needs no superuser account, no CREATE privilege on a shared schema and no special extension. The application role that already connects to the database is enough, which is why this flaw matters for every team that hands database logins to application accounts, contractors or tenants.

The fix is narrow. `fetch_agg_sort_op()` now reads the aggregate's `pg_proc` signature and returns InvalidOid when the types do not match, so `can_minmax_aggs()` returns false and the planner does not build a MinMaxAggPath. The aggregate then runs through its normal transition and final functions, and the caller receives the declared `text` value instead of the raw `int8`. Tom Lane committed the change on the REL_18_STABLE branch on 9 November 2026, and it was backpatched through versions 14 to 19. An existing mismatched aggregate keeps working on the released branches through its normal functions; the planner simply stops using the index shortcut for it. On the master branch, a new declaration with mismatched SORTOP types is rejected outright.

No exploitation in the wild has been reported, and the flaw is not in the CISA Known Exploited Vulnerabilities catalog as of 19 November 2026. That status dates from 19 November. The trigger and the exploit primitives are public since 18 November, and the advisory explains how each step of the chain works. A scanner that only checks the version string will mark the server clean the moment the package is installed, even before the restart that actually loads the fixed binary.

## CVE-2026-6460 and the 22-year-old type confusion

CVE-2026-6460 is the other flaw that defines this release. The PostgreSQL advisory describes it as a type confusion vulnerability that allows a user who can create database objects to execute arbitrary code as the operating system user running the database. The attack changes the data type of a column, or of a composite type's attribute, while the server still holds values stored under the old type. PostgreSQL then reads those bytes as the new type.

Security researcher Mehmet Ince published a write-up on 9 November 2026 demonstrating the exploit on PostgreSQL 18.6. He traces the underlying behavior to a commit from May 2004, which is why the coverage calls it a 22-year-old bug. The write-up shows a login role with the lowest privileges crashing the server, and it does not include the commands for the final step that runs code on the server. As of 13 November 2026 the PostgreSQL project had reported no attacks using the vulnerability.

The fix for CVE-2026-6460 is larger than the one for CVE-2026-116331. It adds version tracking to composite type values so the server can detect a value that no longer matches its type, along with new locking and dependency checks around type changes. That size has a practical consequence for the upgrade: full protection also requires rebuilding any C-language extensions installed on the server. A minor version upgrade that replaces the server binary but leaves an old C extension in place does not finish the job. The extension rebuild belongs in the same maintenance window as the restart, not in a follow-up ticket.

The same research that produced the PostgreSQL chain reached further. Depthfirst demonstrated the same technique in MySQL 26.7.0 and 26.7.1 (CVE-2026-101786, CVSS 7.2, fixed in Oracle's October 2026 Critical Patch Update), in Oracle Database (CVE-2026-114819, CVSS 9.9, fixed in the November 2026 Critical Security Patch Update) and in ClickHouse 26.7.5.10, where no CVE had been named as of 19 November 2026. The Oracle case is the one that needs no account: it chains with a GraphQL flaw in Oracle REST Data Services and reaches the database engine from an exposed HTTP endpoint before a login. The PostgreSQL, MySQL and ClickHouse chains each need a database session, but the session can be the least-privileged role the application already uses.

## Check whether your servers are exposed

The first check is the version the server is actually running, which only the process itself can report.

```sql
psql -c "SELECT version();"
```

Compare the result with the fixed-version table above. Anything below 18.7 on the 18 line, 17.12 on the 17 line, 16.16 on the 16 line, 15.20 on the 15 line or 14.25 on the 14 line is unpatched. The same check applies to containers: the image tag in a compose file says what should be running, and `SELECT version()` says what is running. For PostgreSQL in Docker, the [setup guide](/posts/postgresql-docker-setup/) covers how the official image is wired into a compose stack, and the version check is the same query against the container's port.

The second check is who can build the objects the CVE-2026-116331 chain needs. Run this query in every database the server hosts, because TEMPORARY is granted per database:

```sql
SELECT r.rolname
FROM pg_roles r
WHERE r.rolcanlogin
  AND has_database_privilege(r.oid, current_database(), 'TEMPORARY');
```

A role that appears in the output can build the objects the published chain needs. A default login role can do all four in `pg_temp`: a table, an index, a function and an aggregate. The list is usually longer than people expect, because application accounts, reporting accounts and contractor accounts all tend to hold the default grant.

The third check looks for a mismatched aggregate that is already installed:

```sql
SELECT n.nspname, p.proname,
       format_type(p.prorettype, NULL) AS result_type,
       format_type(p.proargtypes[0], NULL) AS input_type
FROM pg_aggregate a
JOIN pg_proc p ON p.oid = a.aggfnoid
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE a.aggsortop <> 0
  AND p.pronargs = 1
  AND p.prorettype <> p.proargtypes[0];
```

Any row is an aggregate that declares a sort operator but returns a different type from its input. The patch stops the planner from using it, so a row is not proof of compromise. It is a configuration that should not exist, and it is worth investigating even after the upgrade.

If statement logging is enabled, the PostgreSQL logs can show whether anyone tried the chain. Search for temporary object creation and SORTOP aggregates:

```bash
grep -Ei "create (temp|temporary) table|create aggregate|sortop|pg_temp\." /var/log/postgresql/postgresql-*.log
```

If `pg_stat_statements` is installed, the same search runs against recorded queries. Check the `postgres` service account for unexpected child processes, files in `/tmp`, or outbound connections around the time of any suspicious statements. No indicators of compromise have been published for CVE-2026-116331, so these checks find the objects and the statements the published chain uses; they cannot prove that an attempt succeeded. Default PostgreSQL logging does not record every statement, so the absence of log entries is not evidence that no attempt happened.

## Patch in the right order

On Debian or Ubuntu, update the package for the branch you run:

```bash
sudo apt update
sudo apt install --only-upgrade postgresql-18
```

Replace `postgresql-18` with `postgresql-17`, `postgresql-16`, `postgresql-15` or `postgresql-14` to match the server. On RHEL, Fedora or a distribution that uses the PostgreSQL packages, the equivalent is `sudo dnf update postgresql-server postgresql`, or the versioned package such as `postgresql18-server` for the community packages.

The running server keeps using the old binaries until PostgreSQL restarts, so plan a restart once the packages are installed. Rebuild or update every C-language extension at the same time as the server, because the CVE-2026-6460 fix is not complete without it. Then verify the running server after the restart:

```bash
psql -c "SHOW server_version;"
```

The version string should read 18.7, 17.12, 16.16, 15.20 or 14.25 for the branch. Run the aggregate audit query again after the upgrade; a mismatched aggregate should still be listed, but the planner no longer uses the index shortcut for it. Removing or replacing it is still the right follow-up, because the declaration itself is wrong.

In a container, pull the fixed image tag and recreate the container:

```bash
docker pull postgres:18.7
docker stop <container> && docker rm <container>
```

Use `postgres:17.12`, `postgres:16.16`, `postgres:15.20` or `postgres:14.25` for the older branches. Pulling the image alone does not change the running server, and a container that was started from an old image keeps the old binary until it is recreated. The official `postgres` image had more than 12.5 billion pulls on Docker Hub when checked on 19 November 2026, which is a measure of how many deployments the tag update touches. The [performance tuning guide](/posts/postgresql-performance-tuning-ubuntu/) is a useful companion here only for the verification step: after the restart, the same queries that measure buffer and connection behavior confirm the server is actually serving on the new binary.

On a managed service, apply the provider's minor-version upgrade. Amazon RDS and Aurora PostgreSQL, Neon, Supabase, Google Cloud SQL and Azure Database for PostgreSQL each publish their own fixed minor versions, so check the provider's list before scheduling the maintenance window. The version check after the upgrade is the same `SHOW server_version;` query.

Update the client packages on any machine that runs pg_dump or pg_restore as well, because three of the 8.8-rated flaws are in those tools. A backup host that restores archives from another party is exposed through CVE-2026-116314 even though it hosts no database. The machine that runs the nightly restore test needs the new client package just as much as the server does.

Triage the fleet by exposure, not by version number alone. Servers that accept logins from roles you do not fully trust go first, including read-only roles: six of the flaws in this release only need a database user, so a read-only login without CREATE is enough for some of them. Internet-facing servers go before internal ones, and servers with C extensions go in the same window as the restart, because the extension rebuild is part of the fix. The habit of sorting by CVE count instead of by exposure is the same mistake this site has written about before: [Debian's 1,313 kernel CVEs were a batch, not 1,313 fires](/posts/debian-1313-cve-kernel-batch-2026/), and the count alone never told anyone which machine to patch first.

## If you cannot patch yet

Revoking TEMPORARY from PUBLIC in every database raises the bar for the published CVE-2026-116331 chain:

```sql
REVOKE TEMPORARY ON DATABASE <database> FROM PUBLIC;
```

Remove or replace every aggregate returned by the audit query, keep the server on a private network, and restrict which roles can log in. Revoking the privilege removes the grant the published chain relies on, but it does not fix the planner. A role with CREATE on a schema can still build a temporary table and an aggregate, and a superuser can do anything. The revocation buys time while the update is scheduled. Only the upgrade removes the planner bug.

Teams on PostgreSQL 13 or older have a harder decision, because there is no upstream fix to schedule. TuxCare released builds with the High-severity fixes for PostgreSQL 8.4 through 14 on 15 November 2026, three days after the upstream release. In those builds, CVE-2026-6460 is fixed in PostgreSQL 14 on EL9 and partially fixed in versions below 14, where the backport includes the dependency checks and locking but not the version tracking. Customers on those versions should also limit who can log in to the database: remove unused roles and restrict network access to the database port to the hosts that need it.

One caveat for scanners: a backported build keeps its original PostgreSQL version number, so a scanner that reads only the version string may report the server as vulnerable after the fix is installed. The vendor publishes machine-readable security data for its builds, so a scanner that reads those formats can see which CVEs a build has fixed. The version string alone is not a reliable patch check on a backported build, and it is not a reliable patch check on a server that has not been restarted either.

## How this article was put together

Every version number, date and CVE identifier in this article comes from a page opened during the writing of it. The release dates and fixed versions come from the PostgreSQL announcement of 12 November 2026 and the CVE pages for CVE-2026-116331 and CVE-2026-6460. The mechanism of the min/max aggregate flaw, the exploit timeline and the fix commit come from the Ostorlab analysis dated 19 November 2026, which links the Depthfirst research published on 18 November. The release totals, the CVE-2026-6460 write-up and the end-of-life backport status come from the TuxCare analysis published on 16 November and updated on 20 November 2026, with the C-extension rebuild requirement and the unauthenticated restart flaw from The Hacker News report of 13 November 2026. No part of this article is based on a lab test run for it: the behavior described here is the behavior the vendors and researchers documented, and the commands are the checks and upgrades those sources publish.

Readers can verify the central claims directly. `SELECT version();` shows the running branch, the pg_roles query lists the roles that hold TEMPORARY on each database, and the aggregate audit query shows whether a mismatched SORTOP aggregate exists. Compare the version against the fixed-version table, and compare the aggregate results against the rule that an aggregate's return type must match its single input type. The release notes for 18.7 record the same rule in one line: the planner no longer generates an index-based plan for an aggregate whose input and output types do not match.

PostgreSQL 14 is done, and the clock on the older branches is the same one that has always applied to them. The November release fixes 52 flaws in the versions the project still supports, and the two type confusion bugs in it are the kind that do not need a privileged account. Check the version, check the roles, patch the branch, restart the server, and update the machines that run the backups.
