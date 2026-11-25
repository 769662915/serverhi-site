---
title: "Linux disk space triage: blocks, inodes and open deleted files"
description: "Read df, du and lsof against the affected mount to separate three causes of ENOSPC before deciding which data can be moved or archived."
pubDate: 2026-04-05
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Linux Disk Space Crisis: Tools and Commands to Find What's Eating Your Storage"
category: "troubleshooting"
tags: [Linux, Disk Space, Troubleshooting, ncdu]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

An application writing to `/var/lib/app` reports “No space left on device.” Run the first checks against that path. A spacious root filesystem doesn't help a full volume mounted below it.

```bash
findmnt -T /var/lib/app
df -hT /var/lib/app
df -i /var/lib/app
```

## Choose the next measurement

| Example from the affected mount | Likely constraint | Next measurement |
|---|---|---|
| 39 GiB of 40 GiB in use, 15% of inodes used | Allocated blocks | Measure directories on that filesystem, then drill into one large directory. |
| 12 GiB of 40 GiB in use, all inodes allocated | Number of files | Count entries by directory. A queue holding millions of small files can fill the inode table. |
| `df` shows a full mount, but its visible files account for much less | Blocks held by an open deleted file, or a different accounting boundary | Check open file handles and confirm the mount, snapshots and permissions. |

On GNU/Linux, substitute the verified mountpoint for `/var`:

```bash
sudo du -x -h --max-depth=1 /var | sort -h
sudo du -x --inodes --max-depth=1 /var | sort -n
sudo lsof +L1
```

`-x` keeps the walk on the selected filesystem. `lsof +L1` lists open files whose hard-link count is below one. Match the device and size to the full mount, then identify the owning process. A pathname disappearing from a listing does not release blocks while a process still holds the last open descriptor. Prefer a service's documented log-reopen operation. Schedule a restart with its owner if reopening is unavailable.

## Confirm what was recovered

Write down the starting block and inode counts. If the mount holds a queue, drain or expire entries through the queue's owning application. If it holds container data, inspect volume ownership and retention before reclaiming storage. Removing another directory entry for an already unlinked log cannot close the open descriptor.

Repeat `df -hT` and `df -i` on the original path. Verify that the affected service can complete a normal write and its backlog is falling. On a snapshotting filesystem, check its own allocation tools if the figures still disagree. [GNU df](https://www.gnu.org/software/coreutils/manual/html_node/df-invocation.html) · [GNU du](https://www.gnu.org/software/coreutils/manual/html_node/du-invocation.html)

## Verification on November 25, 2026

On two small disposable ext4 filesystems, filling the first with one file left zero available blocks and 116 free inodes. Creating empty files on the second used all 128 inodes while about 12 MiB remained free. A separate test left a deleted 1 MiB file open in a Python process. `lsof +L1` identified its process and file descriptor.
