---
title: "Read InnoDB buffer pool pressure before tuning MySQL 8"
description: "Compare interval read counters on a repeatable workload, check the server memory budget, and rehearse a reversible InnoDB buffer pool resize."
pubDate: 2026-04-16
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for MySQL 8 Performance Tuning: InnoDB Buffer Pool, Query Cache, and Connection Pooling"
category: "server-config"
tags: [MySQL, Performance, InnoDB, Database]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

The InnoDB buffer pool holds table and index pages. A growing lifetime read counter cannot tell you whether a report running now is short of memory. Take two measurements around the same workload. MySQL 8 removed the old query cache; options for that cache in a MySQL 5 configuration are obsolete.

## Collect one interval

On a non-production MySQL 8 server, record the version and current allocation. Keep the administrative connection open so the saved value is available for rollback.

```sql
SELECT VERSION(), @@GLOBAL.innodb_buffer_pool_size, @@GLOBAL.max_connections;
SET @saved_pool = @@GLOBAL.innodb_buffer_pool_size;
SHOW GLOBAL STATUS WHERE Variable_name IN
  ('Innodb_buffer_pool_reads','Innodb_buffer_pool_read_requests',
   'Threads_connected','Threads_running');
```

Run a representative **read-only** application query with the same filter and data in each trial. Record elapsed time, its execution plan, and the counters immediately afterward. Subtract the first snapshot from the second. `Innodb_buffer_pool_reads` counts logical reads that had to be read from disk, while `Innodb_buffer_pool_read_requests` counts logical read requests. For example, 80 additional disk reads out of 20,000 requests is 0.4% for the interval. If the request delta is zero there is no ratio. On a shared instance other sessions contribute, so label the observation accordingly. [MySQL status variables](https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html)

## Try a bounded change

Only use the following **256 MiB lab example** if the machine or container has enough memory above that allocation for the operating system, per-connection buffers, and other services. Check peak usage under load. The server rounds requested sizes to the supported allocation granularity. Use a dedicated admin session with permission to change dynamic global variables.

```sql
SET GLOBAL innodb_buffer_pool_size = 268435456;
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_resize_status';
SELECT @@GLOBAL.innodb_buffer_pool_size;
```

Wait for the resize to finish. Warm each workload in the same way, repeat the measurement, and compare disk-read deltas and latency at the same concurrency. A full table scan or a badly chosen index can dominate both results. For a connection backlog, inspect pool limits and `Threads_running` before using scarce memory for more simultaneous sessions.

Restore the previous setting in the original admin connection and verify the effective size and resize status again:

```sql
SET GLOBAL innodb_buffer_pool_size = @saved_pool;
SELECT @@GLOBAL.innodb_buffer_pool_size;
SHOW GLOBAL STATUS LIKE 'Innodb_buffer_pool_resize_status';
```

Persist a change in the appropriate instance configuration only after a measured improvement fits the memory budget. A `SET GLOBAL` used in this drill is temporary. [MySQL online buffer pool resizing](https://dev.mysql.com/doc/refman/8.4/en/innodb-buffer-pool-resize.html)

## Verification on November 25, 2026

On MySQL 8.0.46 in a disposable Ubuntu VM, the requested 128 MiB pool grew to 256 MiB and returned to 128 MiB. A repeated, warmed primary-key lookup returned the same row. The global physical buffer-pool read counter stayed at 822 between those samples. This small workload showed no reduction in physical reads.
