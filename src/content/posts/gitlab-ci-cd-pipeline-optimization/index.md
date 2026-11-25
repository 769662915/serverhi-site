---
title: "Measure a GitLab CI dependency cache with a lockfile change"
description: "Cache npm downloads by lockfile, keep build outputs in job artifacts, and compare cold, warm and invalidated pipelines on the same runner class."
pubDate: 2026-04-10
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal illustration accompanying this server operations guide"
category: "devops"
tags: [DevOps, GitLab, CI/CD, Optimization]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

A slow pipeline may be waiting for a runner, fetching packages, compiling or uploading results. In the GitLab job trace, separate queue time from execution time and identify the slow step. This example addresses repeated npm downloads for a project that commits `package-lock.json` and defines `npm test`.

## Cache downloads within the checkout

Use a Docker or Kubernetes executor that supports the project's Node image; select the Node major your lockfile and tests support. The runner must have a reusable local cache or a configured shared cache backend. In `.gitlab-ci.yml`:

```yaml
test:
  image: node:22-bookworm-slim
  cache:
    key:
      prefix: npm-node22
      files:
        - package-lock.json
    paths:
      - .npm/
    policy: pull-push
  script:
    - npm ci --cache .npm --prefer-offline
    - npm test
```

`npm ci` still constructs dependencies from the lockfile and checks consistency. The cache holds downloaded packages under the project directory, which GitLab Runner can archive. A protected branch may have a different cache namespace. An ephemeral runner without shared storage can miss even when the key matches. A cache miss should cost time, not change the result. [GitLab cache examples](https://docs.gitlab.com/ci/caching/examples/) · [npm ci](https://docs.npmjs.com/cli/v10/commands/npm-ci)

## Compare three runs

| Run | What to hold constant or change | What to inspect |
|---|---|---|
| Cold | Select a new cache key and keep runner class, tests and dependency lock fixed. | Log the restore miss, install time, test result and time spent uploading the cache. |
| Warm | Run the same commit and key on a runner that can access that cache. | Look for a successful extraction. Compare install time and total job time, including the upload. |
| Invalidation | Change a dependency through npm and commit the resulting lockfile. | Confirm the derived key changes, dependencies are installed correctly and tests still pass. |

A noisy one-off comparison cannot support a percentage improvement. Repeat the cold/warm pair and record the range. If archive transfer costs more than the downloads it replaces, reduce the cached paths or restrict which job writes the cache. Keep generated binaries, reports and handoffs to downstream jobs in **artifacts** with an explicit lifetime. Artifacts identify an output of a particular job, whereas the cache may be evicted at any time. [GitLab caching behavior](https://docs.gitlab.com/ci/caching/) · [Job artifacts](https://docs.gitlab.com/ci/jobs/job_artifacts/)

## Verification on November 25, 2026

We tested the npm part in a Node 22 container with one locked dependency and a known passing assertion. A cold install and a second, offline install from the warmed cache produced the same test result. Changing the dependency produced a different lockfile hash and a fresh cache also passed. GitLab Runner’s remote transfer, queue time and billing depend on the actual project and were outside this local test.
