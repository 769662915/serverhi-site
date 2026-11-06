---
title: "GitHub Actions pull_request_target Blocked by Default"
description: "GitHub Actions pull_request_target will be blocked by default in public repositories starting December 2, 2026. Learn how to audit, migrate, and secure workflows."
pubDate: 2026-11-07
coverImage: "./cover.webp"
coverImageAlt: "A stainless steel cart with cardboard boxes, a closed laptop, and a blue Ethernet cable in a brightly lit data center aisle"
category: "devops"
tags: ["devops", "github-actions", "cicd", "security"]
author: "ServerHi Editorial Team"
draft: false
---

Starting December 2, 2026, the GitHub Actions pull_request_target event will be blocked by default across public repositories. The announcement, published on the official [GitHub Actions changelog](https://github.blog/changelog/2026-11-02-pull_request_target-blocked-by-default-december-2/), shifts one of the most common vectors for automated pipeline compromise into a restricted permission tier. For years, the `pull_request_target` trigger served as the standard mechanism for running automation on fork pull requests while granting access to repository secrets and write tokens. That privilege model also introduced severe security vulnerabilities when workflows checked out untrusted code from pull request forks.

Public repositories on GitHub Free, GitHub Team, and GitHub Enterprise Cloud are subject to this new default rule unless administrators set an explicit Actions event policy permitting the trigger. To help engineering teams and open-source maintainers detect breaking pipelines prior to permanent enforcement, GitHub scheduled two mandatory brownout testing windows during November 2026. Understanding how the default rule works, auditing existing workflow files, and migrating pipelines to safer architectural patterns will prevent sudden build failures during these brownout windows and ahead of the final December deadline.

## The enforcement timeline and brownout testing schedule

GitHub published the revised enforcement plan on November 2, 2026, extending an earlier schedule to give maintainers additional preparation time. From November 2 through December 2, 2026, GitHub Actions operates in evaluate mode for all public repositories without custom policies. In evaluate mode, workflows that trigger on `pull_request_target` continue to run normally, but GitHub records policy warnings in administrative dashboards and run summaries.

To expose silent dependencies before the policy becomes permanent, GitHub scheduled two temporary brownout windows. During these windows, evaluate mode pauses, and GitHub actively blocks unpermitted `pull_request_target` executions. Blocked workflows fail immediately upon trigger and display error annotations in the Actions log view.

The two brownout testing windows run on the following schedule:

- Window 1: Monday, November 9, 2026, from 16:00 to 18:00 UTC
- Window 2: Monday, November 16, 2026, from 16:00 to 18:00 UTC

On Wednesday, December 2, 2026, permanent enforcement begins. After this date, public repositories that lack an explicit policy allowing `pull_request_target` will reject the trigger permanently. Workflows configured solely with `on: pull_request_target` will not run, and multi-event workflows will ignore the pull request target event while continuing to fire on other configured triggers.

## Understanding the GitHub Actions pull_request_target risk model

To understand why GitHub chose to disable this trigger by default, teams must examine the security boundary separating forks from upstream repositories. In standard CI/CD configurations using the `pull_request` trigger, GitHub runs the workflow in the security context of the untrusted fork. The runner receives a read-only `GITHUB_TOKEN`, and GitHub hides all upstream repository secrets from the job environment. This isolation ensures that external contributors cannot submit pull requests containing code that prints secrets or pushes unwanted commits to upstream branches.

The `pull_request_target` trigger was introduced to solve a specific operational problem: automating tasks that require write permissions or base secrets on incoming pull requests. For example, a repository might use a bot to label pull requests, assign reviewers based on changed file paths, or check issue references against external trackers. Because the standard `pull_request` event has no write permissions on the base repository, `pull_request_target` runs in the context of the base repository default branch. It grants the workflow job a read and write `GITHUB_TOKEN` and populates the runner environment with all repository and organization secrets.

The risk emerges when a workflow combines this elevated execution context with code checked out from the pull request fork. If a workflow explicitly specifies the head commit of the pull request using `ref: ${{ github.event.pull_request.head.sha }}`, the runner downloads untrusted code submitted by the external author. If the workflow subsequently executes a build step, runs tests, invokes package managers, or parses untrusted input through shell scripts, the attacker code runs with full access to the base repository secrets and write tokens.

This pattern, documented extensively in the [GitHub Security Lab analysis on pwn requests](https://securitylab.github.com/research/github-actions-preventing-pwn-requests/), allows an attacker to exfiltrate deployment credentials, overwrite release tags, or compromise downstream delivery pipelines. Despite years of documentation warning against checking out untrusted code under `pull_request_target`, automated scanning regularly identifies thousands of public open-source projects running vulnerable configurations. Blocking the trigger by default shifts the responsibility from individual developers to an enforced platform baseline.

## Scope of the default policy and affected environments

The default policy change applies specifically to public repositories across GitHub Free, GitHub Team, and GitHub Enterprise Cloud organizations. Private and internal repositories remain unaffected by this change because fork boundaries within private organizations are governed by internal team access controls instead of open public forks. Self-hosted instances of GitHub Enterprise Server (GHES) are also excluded from this default cloud rollout, though enterprise administrators can configure equivalent policies manually.

Repositories and organizations that already maintain an explicit Actions event policy will not experience configuration overwrites. If an organization administrator previously defined workflow execution protections under organizational settings, that existing configuration takes precedence. The default block only takes effect when a repository or organization relies entirely on GitHub's inherited system defaults.

The decision to target public repositories reflects the asymmetrical risk profile of open-source development. In a public repository, any registered GitHub user can fork the repository, modify workflow files, craft malicious scripts, and submit a pull request. When maintainers merge or run automated checks on these contributions, vulnerable CI/CD setups execute external payloads automatically. Restricting this trigger by default prevents automated supply chain poisoning across the broader public ecosystem.

## Auditing workflows with Policy Insights and repository settings

Repository maintainers and DevOps teams should immediately audit their repositories to determine whether any active workflows rely on `pull_request_target`. GitHub provides administrative tooling to identify these dependencies before the November 9 brownout window.

Organization owners and repository administrators can review evaluate mode logs directly inside the GitHub web interface:

1. Open the repository or organization on GitHub.
2. Navigate to `Settings` and expand the `Actions` section in the left sidebar.
3. Click `Policies`, then select `Policy insights`.
4. Review the execution history table for workflows flagged with `pull_request_target`.

The Policy Insights dashboard lists every workflow run evaluated under the upcoming rule, indicating whether the run succeeded under evaluate mode and whether it will be blocked once enforcement goes live. If the table is empty, the repository has not executed `pull_request_target` jobs during the evaluation window.

In addition to using the web dashboard, teams should run local or automated scans across their `.github/workflows/` directories. A basic search across repository files identifies where the trigger appears:

```bash
git grep -n "pull_request_target" .github/workflows/
```

When analyzing matching workflow files, examine two elements: what permissions the job requests, and whether the job checks out external code. A workflow that uses `actions/checkout` with default settings checks out the base repository default branch, not the fork code. However, any workflow containing configuration similar to the following example represents an immediate security hazard:

```yaml
# Insecure pattern: pull_request_target checking out fork code
name: Insecure PR Build
on:
  pull_request_target:
    types: [opened, synchronize]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout untrusted code
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
      - name: Install dependencies and build
        run: |
          npm install
          npm test
```

Workflows matching this insecure pattern require immediate restructuring, as discussed in our guide on [GitHub Actions secrets management](/posts/github-actions-secrets-management-guide-2026). Checking out untrusted code while retaining base secrets grants external contributors access to the build environment.

## Migration paths and safe workflow architectures

Teams running `pull_request_target` workflows generally fall into one of three categories: workflows that never needed the trigger in the first place, metadata-only automation bots, and builds that require both test execution and writeback capabilities. Each category requires a distinct remediation approach.

### Path 1: Down-scoping to standard pull_request

Many projects adopted `pull_request_target` under the mistaken assumption that it was necessary for standard continuous integration checks on pull requests. Linters, formatting checkers, type analyzers, and unit test suites do not require write tokens or production secrets. For these workloads, the safest solution is replacing `pull_request_target` with the standard `pull_request` event.

```yaml
# Safe pattern: Standard pull_request for testing
name: Test Suite
on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Run unit tests
        run: |
          npm ci
          npm test
```

Under this configuration, GitHub executes the workflow in the isolated fork context. The job receives an unprivileged, read-only token and cannot access upstream secrets. The workflow will run smoothly without triggering policy blocks, and it eliminates the risk of fork-based credential leakage. Integrating standard test runs with automated validation steps reinforces pipeline reliability, as detailed in our analysis of [CI/CD automated pipeline validation](/posts/cicd-healthcheck-automation-pipeline-2026).

### Path 2: Retaining pull_request_target for metadata-only bots

If a workflow performs triage tasks such as applying labels, assigning project milestones, or posting standard welcome comments, it genuinely requires write permissions on the base repository. These workflows can continue using `pull_request_target`, provided they adhere strictly to metadata operations and never check out untrusted code.

To secure a metadata bot, declare minimal explicit permissions at the workflow or job level and omit the `actions/checkout` step entirely:

```yaml
# Safe pattern: Metadata-only bot without code checkout
name: PR Triage Bot
on:
  pull_request_target:
    types: [opened]

permissions:
  pull-requests: write
  issues: write

jobs:
  label:
    runs-on: ubuntu-latest
    steps:
      - name: Apply first-time contributor label
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.addLabels({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              labels: ['needs-triage']
            });
```

Because this workflow does not check out files or execute shell scripts from the incoming pull request, an attacker cannot manipulate the execution environment. Once the workflow is verified as safe, administrators can configure an explicit repository policy to permit the trigger, ensuring uninterrupted operation when the default block activates. When using third-party actions in these automation tasks, ensure you follow strict pinning standards, as examined in our review of [third-party action pin safety](/posts/actions-cool-tags-back-shai-hulud-2026).

### Path 3: The two-stage decoupling pattern with workflow_run

Complex CI/CD architectures frequently require running comprehensive tests on fork pull requests while also posting test summaries, coverage badges, or deployment previews that require base repository write permissions. Attempting to accomplish both goals inside a single `pull_request_target` job creates the vulnerability described earlier.

The recommended architectural solution separates untrusted execution from privileged reporting by pairing `pull_request` with `workflow_run`. This two-stage pattern isolates untrusted code while preserving the ability to post authenticated status checks.

In stage one, a standard `pull_request` workflow runs the test suite in an unprivileged runner. It exports test results, code coverage data, or build artifacts into a designated directory and uploads them as a workflow artifact:

```yaml
# Stage 1: .github/workflows/test.yml
name: PR Tests
on:
  pull_request:
    branches: [main]

jobs:
  run-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout pull request code
        uses: actions/checkout@v4
      - name: Run test suite
        run: |
          npm ci
          npm test -- --coverage --json --outputFile=test-results.json
      - name: Upload test artifacts
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: test-results.json
          retention-days: 1
```

In stage two, a separate workflow triggers on the completion of the `PR Tests` workflow. Because this second workflow triggers via `workflow_run`, it executes on the default branch in the context of the base repository. It downloads the test results artifact, parses the data, and posts status comments using authenticated permissions:

```yaml
# Stage 2: .github/workflows/report.yml
name: PR Report
on:
  workflow_run:
    workflows: ["PR Tests"]
    types: [completed]

permissions:
  pull-requests: write

jobs:
  publish-report:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - name: Download test artifacts
        uses: actions/download-artifact@v4
        with:
          name: test-results
          github-token: ${{ secrets.GITHUB_TOKEN }}
          run-id: ${{ github.event.workflow_run.id }}
      - name: Post comment to pull request
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const data = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));
            const prNumber = context.payload.workflow_run.pull_requests[0]?.number;
            if (prNumber) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: prNumber,
                body: `Tests completed successfully: ${data.numPassedTests} passed.`
              });
            }
```

This two-stage model adheres to the principle of least privilege explained in the [GitHub security hardening guide for Actions](https://docs.github.com/actions/security-guides/security-hardening-for-github-actions). The untrusted pull request code runs inside an isolated, read-only sandbox. The privileged reporting workflow operates strictly on static data artifacts, preventing foreign code from accessing base credentials or modifying the repository.

## Configuring explicit organization and repository policies

If your public repository contains verified, safe automation that requires `pull_request_target`, you must configure an explicit Actions event policy before December 2, 2026. Explicit policies override GitHub's system defaults and prevent automated blocks during the scheduled brownout windows.

To configure an explicit policy at the repository level:

1. In your repository on GitHub, open `Settings`.
2. Select `Actions` from the left menu and click `General`.
3. Locate the `Workflow execution protections` subsection under `Actions permissions`.
4. Review the event permissions list and select the option to explicitly allow `pull_request_target` events.
5. Save the configuration changes.

For engineering teams managing large numbers of public repositories under an organization or enterprise account, configuring policies individually is inefficient. Organization owners can apply a centralized policy:

1. Open organization `Settings`.
2. Select `Actions`, then `General`.
3. Under `Workflow execution protections`, configure the policy to allow `pull_request_target` across all repositories, or restrict the allowance to specific selected repositories.
4. Save the policy.

Setting an organization-wide policy provides uniform governance while allowing teams with legitimate triage bots to continue operating without disruption. However, granting organization-wide permission should always be accompanied by automated repository auditing. If an organization allows `pull_request_target` globally, individual repository maintainers could inadvertently reintroduce vulnerable code checkouts.

## Key migration takeaways for engineering teams

The transition away from unmanaged `pull_request_target` triggers marks a significant improvement in GitHub Actions security posture. Engineering organizations should treat the upcoming brownout dates as firm operational milestones:

- Check your repository Policy Insights under `Settings > Actions > Policies` to identify flagged workflows immediately.
- Participate actively in the brownout windows on November 9 and November 16, 2026, monitoring test runs between 16:00 and 18:00 UTC to catch pipeline failures before customers or contributors encounter them.
- Replace `pull_request_target` with standard `pull_request` triggers for test, lint, and build jobs that do not require upstream write tokens.
- Refactor reporting workflows that combine test execution and status comments into two-stage pipelines using `pull_request` and `workflow_run`.
- For metadata bots that genuinely require write access, remove all code checkout steps, declare strict minimal permissions, and configure an explicit repository or organization Actions policy before the December 2, 2026 enforcement deadline.

Proactive auditing over the coming days ensures that public CI/CD pipelines remain resilient, stable, and secure against automated supply chain vulnerabilities.
