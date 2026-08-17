---
title: "Your CI/CD Pipeline Is the Next Target: Lessons from the TeamPCP Supply Chain Attack"
description: "How 2,500+ companies lost 78,330 secrets through a single compromised dependency - and the practical steps to protect your pipelines."
pubDate: 2026-08-18
coverImage: "./cover.webp"
coverImageAlt: "CI/CD pipeline security concept with shield and pipeline visualization"
category: "devops"
tags: ["CI/CD", "Supply Chain Security", "DevOps", "Security", "Pipeline", "TeamPCP", "LiteLLM"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: "intermediate"
estimatedTime: "20 minutes"
prerequisites:
  - "Basic understanding of CI/CD concepts"
  - "Familiarity with GitHub Actions or GitLab CI"
  - "Understanding of package managers (npm, pip, apt)"
osCompatibility: ["Ubuntu 22.04", "Ubuntu 24.04", "Debian 12"]
---

## The Incident That Changed Everything

In March 2026, a threat actor group called TeamPCP pulled off what security researchers now call the largest supply chain attack targeting AI infrastructure ever recorded. The numbers are staggering: 2,500+ companies exposed, 434,000 CI/CD pipelines potentially compromised, and 78,330 secrets exfiltrated from 2,186 organizations in just five days.

The target wasn't some obscure tool. It was LiteLLM, a popular open-source AI proxy used by thousands of companies to manage their LLM API calls. But here's the thing — LiteLLM was never directly attacked. The real vulnerability was in its CI/CD pipeline.

If you're running any kind of automated build system, this should make you very uncomfortable. Let me walk you through what happened, why it matters, and how to protect your own pipelines.

## How the Attack Actually Worked

### The Chain of Compromise

The attack chain was elegant in its simplicity:

1. **Step 1**: TeamPCP compromised the Trivy security scanner
2. **Step 2**: LiteLLM's CI pipeline installed Trivy unpinned from the system package manager (apt)
3. **Step 3**: The compromised Trivy flowed into LiteLLM's build automatically
4. **Step 4**: Malicious versions 1.82.7 and 1.82.8 were published to PyPI
5. **Step 5**: Every organization using these versions had their CI/CD secrets harvested

The malicious packages were available for only about 40 minutes. But in that window, the automated nature of CI/CD systems meant that thousands of pipelines installed the poisoned dependencies at machine speed.

### Why CI/CD Pipelines Are Perfect Targets

CI/CD systems have a unique property that makes them irresistible to attackers: **they run with broad privileges and install dependencies automatically**.

Think about it. Your GitHub Actions workflow probably has access to:
- Repository secrets (API keys, tokens)
- Docker Hub credentials
- Cloud provider access keys
- Deployment tokens
- Database connection strings

When a developer pushes code, the pipeline runs without human intervention. If a dependency is compromised during that window, the stolen credentials flow directly to the attacker.

As CloudSEK's research noted: "Automated pipelines amplify a brief compromise. CI/CD systems install dependencies at machine speed and often run with broad privileges."

### The LiteLLM Case Study

LiteLLM is a critical piece of infrastructure for many AI-powered applications. It provides a unified API for calling multiple LLM providers (OpenAI, Anthropic, Google, etc.) and includes features like rate limiting, cost tracking, and fallback routing. Because it handles API keys for multiple providers, its CI/CD pipeline had access to a treasure trove of credentials.

The attack worked because:
1. **Trivy was installed unpinned**: LiteLLM's CI used `apt-get install trivy` without specifying a version
2. **No hash verification**: There was no mechanism to verify the integrity of the installed package
3. **Automatic execution**: The compromised scanner ran during the build process
4. **Credential harvesting**: The malicious code searched for and exfiltrated environment variables and secrets

This is particularly insidious because Trivy is itself a security tool. Organizations installed it to scan for vulnerabilities, but the compromised version became the vulnerability.

## The Real Cost: What 78,330 Secrets Means

Let's put those numbers in perspective. The 78,330 stolen secrets included:

- **Cloud credentials**: AWS access keys, Azure service principals, GCP service accounts
- **Source code access**: GitHub tokens, GitLab PATs
- **Deployment tokens**: Kubernetes service accounts, Docker registry passwords
- **API keys**: OpenAI, Anthropic, and other AI service credentials
- **Database credentials**: Connection strings with full access

For many organizations, these weren't just test credentials. They were production secrets that could lead to:
- Full infrastructure compromise
- Data exfiltration from production databases
- Lateral movement to other systems
- Ransomware deployment
- Supply chain attacks on their own customers

### The Ripple Effect

What makes this attack particularly dangerous is the cascading nature of supply chain compromises. When TeamPCP stole credentials from Organization A, they could use those to:
1. Access Organization A's code repositories
2. Find hardcoded secrets in source code
3. Use those secrets to access Organization A's cloud infrastructure
4. Pivot to Organization A's customers and partners
5. Compromise those downstream organizations too

This is why the "434,000 CI/CD pipelines potentially compromised" number is so alarming. The initial breach affected 2,186 organizations directly, but the stolen credentials could potentially reach far more.

## Practical Defense: A Layered Approach

You can't prevent every supply chain attack, but you can make your CI/CD pipelines significantly harder to compromise. Here's a practical, set upable defense strategy.

### 1. Pin Your Dependencies

The single most effective defense against this type of attack is **pinning dependencies to specific versions with cryptographic hashes**.

**Bad (what LiteLLM's CI did):**
```bash
# Never do this in CI
apt-get install -y trivy
pip install litellm
```

**Good (pinned with hashes):**
```bash
# Pin to exact version with hash verification
pip install litellm==1.82.6 --hash=sha256:abc123...

# For apt packages, pin to specific version
apt-get install -y trivy=0.52.0
```

**For npm/pip/pipx, use lock files:**
```bash
# Python
pip install -r requirements.txt  # requirements.txt should have hashes

# Node.js
npm ci  # Uses package-lock.json exactly
# Never npm install in CI
```

### 2. Use Private Package Registries

Block public package registries in your CI environments. Route all dependency installations through your own mirror where you control what gets approved.

**GitHub Actions example:**
```yaml
steps:
  - name: Configure pip to use private registry
    run: |
      pip config set global.index-url https://your-private-pypi.example.com/simple/
      pip config set global.trusted-host your-private-pypi.example.com
```

**For npm:**
```yaml
steps:
  - name: Configure npm registry
    run: |
      echo "//npm.your-company.com/:_authToken=${{ secrets.NPM_TOKEN }}" > .npmrc
      echo "registry=https://npm.your-company.com/" >> .npmrc
```

### 3. set up Secrets Management

**Principle of least privilege**: Every secret in your CI/CD should be:
- Short-lived (expire in hours, not months)
- Narrowly scoped (minimum required permissions)
- Rotated regularly (automated rotation)

**Example: Using OIDC for AWS (no long-lived credentials):**
```yaml
# GitHub Actions with OIDC
permissions:
  id-token: write
  contents: read

steps:
  - name: Configure AWS Credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: arn:aws:iam::123456789:role/github-actions
      aws-region: us-east-1
```

**Compare with the old way:**
```yaml
# NEVER DO THIS
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### 4. Monitor Pipeline Activity

Set up alerts for suspicious CI/CD behavior:
- Unusual dependency installations
- Access to secrets outside normal patterns
- Exfiltration attempts (large data transfers)
- New workflow runs from unknown sources

**GitHub Actions example with StepSecurity or similar:**
```yaml
steps:
  - name: Audit pipeline behavior
    uses: step-security/audit-action@v1
    with:
      fail-on-severity: high
```

### 5. Generate and Track SBOMs

A Software Bill of Materials (SBOM) gives you visibility into every dependency your pipeline uses. After the TeamPCP incident, organizations that had SBOMs could immediately identify affected components.

**Generate SBOM with Syft:**
```bash
# Install syft
curl -sSfL https://raw.githubusercontent.com/anchore/syft/main/install.sh | sh -s

# Generate SBOM for your project
syft dir:. -o spdx-json > sbom.json

# Scan for vulnerabilities
grype sbom:./sbom.json
```

### 6. set up Branch Protection

make sure your CI/CD pipelines only run on approved code:
- Require PR reviews before merging
- Block direct pushes to main branches
- Use CODEOWNERS for sensitive files
- Require status checks to pass before merge

### 7. Use Docker Content Trust

When pulling Docker images in your CI/CD pipelines, enable Content Trust to verify image signatures:

```bash
# Enable Docker Content Trust
export DOCKER_CONTENT_TRUST=1

# Only pull verified images
docker pull your-registry/your-image:tag
```

### 8. set up Network Segmentation

Isolate your CI/CD infrastructure from production systems:
- Run CI runners in a separate network segment
- Use jump hosts for production access
- set up strict firewall rules
- Monitor cross-segment traffic

## Real-World set upation: GitHub Actions Hardening

Here's a complete example of a hardened GitHub Actions workflow that set ups multiple layers of defense:

```yaml
name: Secure CI/CD Pipeline

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read
  security-events: write

jobs:
  secure-build:
    runs-on: ubuntu-latest
    environment: production
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 1  # Shallow clone for security
          
      - name: Generate SBOM
        uses: anchore/sbom-action@v0
        with:
          artifact-name: sbom.spdx.json
          
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
          
      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: us-east-1
          
      - name: Build and push Docker image
        run: |
          # Pin base images with digest
          docker build --build-arg BASE_IMAGE=python:3.11-slim@sha256:abc123...
          docker push ${{ secrets.ECR_REGISTRY }}/${{ secrets.ECR_REPOSITORY }}:${{ github.sha }}
          
      - name: Verify image signature
        run: |
          cosign verify --key cosign.pub ${{ secrets.ECR_REGISTRY }}/${{ secrets.ECR_REPOSITORY }}:${{ github.sha }}
```

This workflow shows several key security practices: it uses OIDC for cloud authentication instead of long-lived secrets, generates an SBOM for dependency tracking, scans for vulnerabilities, and verifies container image signatures. Each layer adds defense in depth, making it much harder for a single compromised dependency to compromise the entire pipeline.

## Quick Audit Checklist

Before you close this article, run through this checklist on your own CI/CD setup:

- [ ] Are all dependencies pinned to specific versions?
- [ ] Do you use lock files (package-lock.json, requirements.txt with hashes)?
- [ ] Are public registries blocked in CI environments?
- [ ] Are secrets short-lived and narrowly scoped?
- [ ] Do you use OIDC or similar for cloud provider authentication?
- [ ] Is pipeline activity monitored and alerted on?
- [ ] Do you generate SBOMs for your builds?
- [ ] Are branch protections enabled on all repositories?
- [ ] Have you audited your CI/CD secrets in the last 30 days?
- [ ] Do you know which pipelines can access production systems?
- [ ] Is Docker Content Trust enabled for image pulls?
- [ ] Are your CI runners isolated from production networks?

## What To Do Right Now

If you're reading this and realizing your CI/CD setup is more vulnerable than you thought, here's a prioritized action list:

**This Week:**
1. Rotate all CI/CD secrets that could have been exposed
2. Check if any of your projects use LiteLLM versions 1.82.7 or 1.82.8
3. Pin all dependencies in your most critical pipelines

**This Month:**
4. set up a private package registry
5. Switch to OIDC for cloud provider authentication
6. Set up pipeline activity monitoring

**This Quarter:**
7. Generate SBOMs for all projects
8. Conduct a full CI/CD security audit
9. set up automated dependency scanning
10. Create an incident response plan for supply chain attacks

## The Bigger Picture

The TeamPCP incident isn't an isolated event. It's part of a growing trend where attackers target the software supply chain instead of the software itself. As CloudSEK warned: "AI infrastructure is becoming a strategic target. Gateways, agents, vector stores, model endpoints, and MCP servers sit between sensitive data and systems capable of taking action."

### Why AI Infrastructure Is Especially Vulnerable

AI systems have unique attack surfaces that traditional software doesn't:
- **Model weights and training data** can be poisoned to introduce backdoors
- **API keys for LLM providers** (OpenAI, Anthropic) give attackers access to expensive compute resources
- **Vector databases** containing sensitive embeddings can be exfiltrated
- **MCP servers and AI agents** often have elevated privileges to interact with external systems
- **Prompt injection attacks** can manipulate AI behavior through crafted inputs

When attackers compromise an AI tool's CI/CD pipeline, they don't just get code access — they get the keys to the entire AI infrastructure stack.

### The Shared Responsibility Problem

Many organizations assume their cloud providers handle security. But the supply chain attack model shifts responsibility to the consumer. Your cloud provider secures the infrastructure, but you're responsible for:
- The code you deploy
- The dependencies you install
- The secrets you manage
- The access controls you configure

This shared responsibility model means that even organizations using enterprise-grade cloud services can be compromised through their own CI/CD pipelines.

Your CI/CD pipeline is the single point of trust in your software delivery process. If that trust is broken, everything downstream is compromised. The investment you make in securing it today will save you from being the next headline.

The question isn't whether you'll face a supply chain attack. It's whether you'll be ready when it happens.

## Further Reading

- [CloudSEK: 2,500+ Companies Exposed in AI Supply Chain Breach](https://www.cloudsek.com/blog/ai-supply-chain-breach-2500-companies-434000-cicd-pipelines)
- [StepSecurity: Team PCP Supply Chain Attack Analysis](https://www.stepsecurity.io/blog/teampcp-supply-chain-attack-cicd-secrets-cloudsek-disclosure)
- [NIST SBOM Guidelines](https://www.nist.gov/artificial-intelligence/executive-order-safe-secure-and-trustworthy-artificial-intelligence)
- [OpenSSF Supply Chain Security Best Practices](https://openssf.org/projects/supply-chain/)
- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)

---

*This article was researched and written on August 18, 2026. The threat landscape evolves rapidly, so always verify the latest security advisories and best practices for your specific environment.*
