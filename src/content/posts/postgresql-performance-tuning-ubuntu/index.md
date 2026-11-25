---
title: "PostgreSQL tuning on Ubuntu: measure a sort before changing work_mem"
description: "Use EXPLAIN to compare a disk-spilling sort with an in-memory sort, then roll back a session-level change and estimate the cost of concurrent queries."
pubDate: 2026-04-11
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for PostgreSQL Performance Tuning on Ubuntu: Configuration Parameters That Matter"
category: "server-config"
tags: [PostgreSQL, Performance, Ubuntu, Database]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

A slow report sorts a large result. Before allocating memory globally, find out whether that sort spills to disk. A sequential scan, a poor cardinality estimate or a client waiting on a lock calls for a different fix. This exercise uses PostgreSQL 16 and a temporary table to keep the input constant.

## Reproduce one sort

Connect with `psql` to a disposable database on Ubuntu. Run the whole exercise in the **same connection**. The first part builds 100,000 moderately wide keys. A sufficiently small memory setting should force the sort to use temporary files.

```sql
SHOW work_mem;
BEGIN;
CREATE TEMP TABLE sort_lab AS
  SELECT md5(i::text) AS sort_key FROM generate_series(1, 100000) AS g(i);
ANALYZE sort_lab;
SET LOCAL max_parallel_workers_per_gather = 0;
SET LOCAL work_mem = '64kB';

EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
  SELECT sort_key FROM sort_lab ORDER BY sort_key;

SET LOCAL work_mem = '32MB';
EXPLAIN (ANALYZE, BUFFERS, TIMING OFF)
  SELECT sort_key FROM sort_lab ORDER BY sort_key;
ROLLBACK;
SHOW work_mem;
```

Read the `Sort Method` line. An external merge with a `Disk` figure identifies a spill; quicksort with a `Memory` figure identifies an in-memory sort. Compare the rows returned and any temporary blocks read or written. If both runs fit in memory or the plan has no sort, the example has not demonstrated a benefit from raising this limit. The final `SHOW` should match the initial value. [PostgreSQL EXPLAIN](https://www.postgresql.org/docs/16/sql-explain.html)

## Decide how widely to apply the result

`work_mem` applies to individual operations. Multiple sorts or hash operations and multiple workers can allocate memory within one query; several concurrent reports multiply demand again. For example, eight active sessions each using two 32 MiB sorts can use roughly 512 MiB for those sorts alone. Budget the rest of the server separately, including shared buffers and other processes. Hash operations have their own multiplier. [PostgreSQL memory settings](https://www.postgresql.org/docs/current/runtime-config-resource.html)

For one reporting job, measure a transaction-local change using its actual data and concurrent workload. Compare repeated runs in alternating order and record the plan and temporary I/O. If latency barely changes, investigate the rest of the plan before changing the instance default. An index that supplies the required order may let the database avoid the sort entirely.

## Verification on November 25, 2026

In PostgreSQL 16.15 the first query used an external merge with 3,680 kB of disk. With the larger session setting it used quicksort with 7,760 kB of memory. The recorded single executions took 36.363 ms and 28.517 ms respectively. Their sort methods are reproducible checks; the timings include the effects of this VM and cache state.
