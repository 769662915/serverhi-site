---
title: "GitHub Actions Self-Hosted Runners: Setup, Scaling, and Security on Ubuntu"
description: "A hands-on guide covering configuration, troubleshooting, and best practices for github actions self-hosted runners - setup, scaling, and security on ubuntu."
pubDate: 2026-04-18
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for GitHub Actions Self-Hosted Runners: Setup, Scaling, and Security on Ubuntu"
category: "devops"
tags: [DevOps, GitHub Actions, CI/CD, Runners]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

## Why Self-Hosted Runners

GitHub-hosted runners are convenient but have limits: 6-hour job timeout (72h for larger plans), fixed hardware specs, and metered minutes. Self-hosted runners give you unlimited minutes, custom hardware, and access to your private network — all without leaving your infrastructure.

The trade-off: you manage the runner and its security. A compromised runner in your network can be a serious incident.

## Setup on Ubuntu

Add a runner at the repository, organization, or enterprise level. Repository-level is the simplest:

```bash
# Create a dedicated user
sudo useradd -m -s /bin/bash actions-runner
sudo -u actions-runner -i

# Download the runner
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64.tar.gz \
  -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-linux-x64-2.321.0.tar.gz
tar xzf actions-runner-linux-x64.tar.gz

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

**Network isolation**: Run the runner in an isolated VLAN or VPC. It needs outbound access to GitHub (github.com, api.github.com, *.actions.githubusercontent.com) but nothing else by default.

**Ephemeral runners**: For sensitive workflows, use ephemeral runners that self-destruct after each job:

```bash
./config.sh --url https://github.com/your-org/your-repo \
  --token YOUR_TOKEN \
  --ephemeral
```

The runner deregisters itself after one job, preventing any persistence.

**Resource limiting**: Use cgroups to limit runner resource usage:

```bash
# Limit runner to 2 CPUs and 4GB memory
sudo systemctl set-property actions.runner.* CPUQuota=200% MemoryMax=4G
```

**Label-based routing**: Assign labels to runners so only specific workflows use them:

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

GitHub's Actions Runner Controller (ARC) runs runners as Kubernetes pods:

```bash
helm repo add actions-runner-controller https://actions-runner-controller.github.io/actions-runner-controller
helm upgrade --install arc actions-runner-controller/actions-runner-controller \
  --set authSecret.create=true \
  --set authSecret.github_token="YOUR_PAT"
```

This auto-scales runners based on workflow queue depth. Each runner is an ephemeral pod — clean environment every time.

## Common Issues

**Runner offline in GitHub UI**: Check if the run.sh process is alive. Network issues between the runner and GitHub are the most common cause.

**Disk space exhausted**: Docker images and build artifacts accumulate. Set up cleanup:

```bash
# Clean Docker regularly
docker system prune -af --filter "until=24h"

# Remove runner work directories older than 1 day
find /home/actions-runner/_work -maxdepth 1 -mtime +1 -exec rm -rf {} +
```

**Runner version mismatch**: GitHub periodically updates the runner. The runner will warn and eventually refuse to accept jobs. Update:

```bash
cd /home/actions-runner/actions-runner
./config.sh remove --token YOUR_TOKEN
# Download new version
curl -o actions-runner-linux-x64.tar.gz -L NEW_VERSION_URL
tar xzf actions-runner-linux-x64.tar.gz
./config.sh --url ... --token ...
```

## Monitoring

Check runner health:

```bash
# List runner processes
ps aux | grep Runner.Listener

# Check runner logs
journalctl -u actions.runner.* -f

# Check disk usage
du -sh /home/actions-runner/_work
```

## Cost Comparison

GitHub Actions free tier: 2000 minutes/month (private repos). At $0.008/minute beyond that, a runner using 24/7 would cost ~$345/month. A self-hosted runner on a $20/month VPS gives you unlimited minutes and often better performance for build-heavy workloads.

## Summary

Self-hosted runners give you unlimited CI/CD minutes and custom hardware. Start with one repository-level runner, harden it with ephemeral mode or network isolation, set up automatic cleanup for disk space, and consider ARC for Kubernetes-based auto-scaling if your workload grows beyond a single runner.