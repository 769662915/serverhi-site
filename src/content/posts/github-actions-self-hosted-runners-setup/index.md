---
title: "GitHub Actions Self-Hosted Runners: Setup, Scaling, and Security on Ubuntu"
description: "A hands-on guide covering configuration, troubleshooting, and best practices for github actions self-hosted runners - setup, scaling, and security on ubuntu."
pubDate: 2026-04-18
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for GitHub Actions Self-Hosted Runners: Setup, Scaling, and Security on Ubuntu"
category: "devops"
tags: [DevOps, GitHub Actions, CI/CD, Runners]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

## Why Self-Hosted Runners

A self-hosted runner executes jobs on a machine you maintain. Use it when the job needs a particular environment or private connectivity. Include operating-system updates, runner updates, network isolation and idle capacity in the cost estimate.

## Setup on Ubuntu

Add a runner at the repository, organization, or enterprise level. Repository-level is the simplest:

```bash
# Create a dedicated user
sudo useradd -m -s /bin/bash actions-runner
sudo -u actions-runner -i

# Use the package URL and SHA-256 from Settings → Actions → Runners → New self-hosted runner.
# Select your OS and architecture. Run the download, verification and extraction commands shown there.

# Configure
./config.sh --url https://github.com/your-org/your-repo --token YOUR_TOKEN

# Run
./run.sh
```

## Running as a Service

The runner provides a script to install itself as a systemd service:

```bash
sudo ./svc.sh install
sudo ./svc.sh start
sudo ./svc.sh status
```

This creates a systemd service that auto-starts on boot and restarts on failure.

## Security Hardening

**Network isolation**: Run the runner in an isolated VLAN or VPC. It needs outbound access to GitHub (github.com, api.github.com, *.actions.githubusercontent.com) and the endpoints required by its actual jobs. Check the current GitHub endpoint list when configuring egress.

**Ephemeral runners**: For sensitive workflows, register an ephemeral runner for one job:

```bash
./config.sh --url https://github.com/your-org/your-repo \
  --token YOUR_TOKEN \
  --ephemeral
```

The runner deregisters after one job. Its VM, disk and credentials still need a separate disposal or reimaging step before another job can inherit them. Forward diagnostic logs first.

**Resource limiting**: Use cgroups to limit runner resource usage:

```bash
# Limit runner to 2 CPUs and 4GB memory
sudo systemctl set-property actions.runner.* CPUQuota=200% MemoryMax=4G
```

**Label-based routing**: Assign labels for scheduling. Use runner-group and repository access policies to restrict who can schedule jobs:

```bash
./config.sh --url ... --token ... --labels self-hosted,linux,x64,production
```

In your workflow:

```yaml
jobs:
  deploy:
    runs-on: [self-hosted, production]
```

## Scaling with ARC

Actions Runner Controller (ARC) manages Kubernetes runner scale sets. Install the controller and the runner scale set as separate releases. Set the GitHub scope, authentication secret and capacity bounds, then route a test job by scale-set name. Keep runner credentials in the cluster secret store. [GitHub ARC quickstart](https://docs.github.com/en/actions/tutorials/use-actions-runner-controller/quickstart)

## Common Issues

**Runner offline in GitHub UI**: Check if the run.sh process is alive. Network issues between the runner and GitHub are the most common cause.

**Disk space exhausted.** Run `docker system df -v` and `du -sh /home/actions-runner/actions-runner/_work` (adjust for your installation). Drain the runner before cleaning a workspace. Preserve logs and any job outputs that have yet to be collected. Remove only directories belonging to confirmed finished jobs.

**Runner version mismatch.** Compare the installed version against Settings → Actions → Runners and use the package and verification instructions for the correct architecture. Verify that the updated runner accepts a harmless test job. [GitHub runner management](https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners)

## Monitoring

Check runner health:

```bash
# List runner processes
ps aux | grep Runner.Listener

# Check runner logs
journalctl -u actions.runner.* -f

# Check disk usage
du -sh /home/actions-runner/actions-runner/_work
```

## Estimate the bill from job time

**Price check, November 25, 2026.** The standard Linux 2-core x64 GitHub-hosted runner is $0.006 per billed minute. For a private repository on GitHub Free, the account has $12 of shared included compute per month. Count the minutes jobs actually run, rounded up per job. A day with no jobs adds no hosted runner minutes. Public repositories running eligible standard GitHub-hosted jobs have different billing.

If a single lane is busy for all 43,200 minutes of a 30-day month, gross compute is $259.20. With the full $12 allowance available, the estimate is $247.20 before storage, taxes or other usage. At 1,000 billed minutes, gross compute is $6, which fits inside an unused $12 allowance. A hypothetical $20/month self-hosted VM can incur that fee even when idle. Add its storage, network, backup and operator time and compare measured duration for the same job. [Runner rates](https://docs.github.com/en/billing/reference/actions-runner-pricing) · [Compute included with your plan](https://docs.github.com/en/billing/reference/product-usage-included) · [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
