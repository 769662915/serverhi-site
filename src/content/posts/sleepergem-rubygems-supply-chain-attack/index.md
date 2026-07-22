---
title: "SleeperGem Attack Hid Malware in Dormant RubyGems Packages for Years Before Striking Developer Machines"
description: "The SleeperGem supply chain attack reactivated packages dormant since 2017, impersonated Microsoft's Git Credential Manager, and avoided CI/CD detection. Here's how it worked and what to check on your systems."
pubDate: 2026-07-23
coverImage: "./cover.webp"
coverImageAlt: "A stylized terminal illustration showing a Ruby gem icon cracked open with malicious code tendrils spreading outward against a dark background with red warning accents and a glowing terminal green cursor."
category: "devops"
tags: ["RubyGems", "supply-chain", "malware", "DevOps", "security", "CI/CD"]
author: "ServerHi Editorial Team"
draft: false
---

A supply chain attack targeting the Ruby ecosystem managed to sit dormant for years before activating — and when it did, it specifically avoided build servers to focus exclusively on developer workstations.

Dubbed SleeperGem by researchers at StepSecurity, the campaign used three malicious RubyGems packages to deliver a persistent backdoor. Two of them had been published years ago and left untouched before receiving malicious updates. The third impersonated Microsoft's official Git Credential Manager.

The attack has implications for any developer or DevOps team that pulls Ruby dependencies, but the sophistication isn't in the malware itself. It's in the patience.

## The three packages

StepSecurity identified three malicious gems:

- **git_credential_manager** (versions 2.8.0–2.8.3), published July 18, 2026 — a direct impersonation of Microsoft's legitimate Git Credential Manager tool
- **Dendreo** (versions 1.1.3, 1.1.4), originally published in October 2017 and dormant since October 2020
- **fastlane-plugin-run_tests_firebase_testlab** (version 0.3.2), originally published in February 2018 and dormant since March 2019

The two older packages hadn't seen updates in years. Then, suddenly, new versions appeared — with no matching commits or tags in their source repositories. The updates were pushed directly to RubyGems, bypassing the normal release workflow. That alone should trigger a red flag for anyone reviewing dependency changes: if a new version shows up on the registry but doesn't exist in the source repo, something is wrong.

The maintainer accounts appear to have been compromised. The packages "Dendreo," "slackHtmlToMarkdown," "seo_optimizer," and "array_fast_methods" all belong to a single user account, "LR-DEV." The "fastlane-plugin-run_tests_firebase_testlab" gem belongs to a different account, "pinkroom," suggesting at least two accounts were breached to execute this campaign.

## The infection chain

The malware follows a two-stage delivery model. Each malicious gem release acts as a loader. When installed, it fetches a second-stage payload from an attacker-controlled Forgejo host. Before executing, it scans the environment for about 30 variables associated with CI/CD platforms: GitHub Actions, GitLab CI, CircleCI, Travis CI, Jenkins, Vercel, and others.

If any of those variables are present, the malware exits immediately. It doesn't want to run in ephemeral build environments where it'll be wiped after the pipeline finishes. It wants developer machines — persistent systems where it can install a native daemon and establish long-term access.

Once the environment check passes, the malware drops the daemon and sets up persistence. StepSecurity hasn't publicly detailed the full post-exploitation behavior, but the pattern — targeted developer machines, CI/CD avoidance, persistent daemons — points to credential theft and source code access as likely objectives. A developer workstation with access to private repositories, API keys, and deployment credentials is a far more valuable target than a temporary CI runner.

## The dependency chain: how it spreads

The real danger of this attack isn't just the three malicious packages. It's that "git_credential_manager" was added as a dependency to five other packages, including the two compromised ones. The full dependency web:

- **Dendreo** → depends on git_credential_manager
- **fastlane-plugin-run_tests_firebase_testlab** → depends on git_credential_manager
- **slackHtmlToMarkdown** → depends on git_credential_manager
- **seo_optimizer** → depends on git_credential_manager
- **array_fast_methods** → depends on git_credential_manager

If your project uses any of these five packages, and you ran `bundle update` or `gem update` after July 18, the malicious git_credential_manager would have been pulled in automatically. The attacker didn't need to compromise five separate packages directly. They compromised one — then used Ruby's dependency resolution to pull the rest along.

This is a textbook example of why dependency trust is transitive. You might audit your direct dependencies carefully and still get hit because one of them pulled in something malicious. Most teams don't review transitive dependency updates with the same scrutiny as direct ones. SleeperGem exploits that gap.

## The CI/CD evasion trick

The environment variable check is worth understanding because it's a pattern that will show up in future attacks.

The malware looks for variables that only exist inside CI/CD runners: `GITHUB_ACTIONS`, `GITLAB_CI`, `CIRCLECI`, `TRAVIS`, `JENKINS_HOME`, `VERCEL`, and about two dozen others. These are set automatically by the respective platforms when a pipeline runs. A normal Ruby process on a developer machine won't have any of them.

The logic is simple but effective. In a CI environment, the malware exits without doing anything. The build completes normally. The security scanner sees a clean run. Nobody investigates. Meanwhile, every developer who pulled the same dependency locally gets infected.

This also means that traditional CI-based security scanning won't catch this kind of threat. If your dependency scanning only runs in CI pipelines — and most do — the malware will see the CI environment variables, stay dormant, and pass the scan. The infection only activates when a human developer runs the code on their laptop.

## What to check right now

If you work with Ruby or have Ruby-based projects in your organization:

**Check your Gemfile.lock.** Look for any of the three malicious packages, especially git_credential_manager at versions 2.8.0 through 2.8.3. The legitimate Microsoft Git Credential Manager is a different package (likely installed via a different channel), so don't confuse the two.

**Audit dormant dependencies.** The two older packages — Dendreo and fastlane-plugin-run_tests_firebase_testlab — are particularly instructive. They were published years ago and sat untouched. Then they got malicious updates. If you have dependencies that haven't been updated in years, a sudden version bump should be treated as suspicious, not routine.

**Run dependency scans outside CI.** This is the hardest lesson from SleeperGem. CI-only scanning creates a blind spot that attackers are actively exploiting. Run `bundle audit` or your equivalent dependency scanner on developer machines as well as in pipelines. The malware specifically avoids CI environments, so the only way to catch it locally is to scan locally.

**Check for registry-only releases.** A new gem version on RubyGems with no corresponding tag or commit in the source repository is a strong indicator of compromise. Tools like `gem diff` can compare published gems against their source repos. You can also use:

```bash
# Check if git_credential_manager is installed locally
gem list git_credential_manager

# Audit entire project for known vulnerabilities
bundle audit check --update

# Check a specific gem's source repo for matching tags
gem info git_credential_manager -r
```

**Scan your CI logs retroactively.** If your CI pipeline pulled any of these packages between July 18 and now, the build may have completed normally (the malware detected CI variables and exited). But the dependency itself was still downloaded and cached. Check your CI dependency cache and build logs for any references to the malicious packages, even if the build passed.

**Monitor for suspicious daemons.** The SleeperGem malware installs a persistent daemon on developer machines. On macOS, check LaunchAgents and LaunchDaemons. On Linux, check systemd services, cron jobs, and init scripts for anything unfamiliar:

```bash
# Linux
systemctl list-units --type=service --state=running | grep -v -E '^(●|$)'
crontab -l

# macOS
launchctl list | grep -v com.apple
ls ~/Library/LaunchAgents/
```

## The broader pattern

SleeperGem isn't the first supply chain attack to use dormant package reactivation, and it won't be the last. The strategy works because it exploits assumptions most teams make: that old, unchanging dependencies are safe, and that CI-based scanning is sufficient.

Neither assumption holds. Old packages have maintainers, and maintainers can be compromised at any time. The accounts that published Dendreo in 2017 and fastlane-plugin-run_tests_firebase_testlab in 2018 likely had different passwords, different 2FA setups, and different threat models back then. Seven years is a long time for credentials to leak, for email accounts to be breached, or for maintainers to simply stop paying attention.

CI-based scanning is better than nothing, but it's not enough — especially when malware is designed to detect and evade it. The 30 environment variables that SleeperGem checks represent the major CI/CD platforms. Any malware author can add to that list. The only reliable defense is scanning everywhere: CI pipelines, developer workstations, staging environments, and anywhere else that dependencies get installed.

The RubyGems team has removed the malicious versions, but the lesson sticks: a dependency that hasn't changed in five years is not a safe dependency. It's a dependency with a five-year-old attack surface and a maintainer whose credentials might have been breached last week. Treat every update — especially from long-dormant packages — as potentially hostile until proven otherwise.

## Prevention: hardening your Ruby dependency pipeline

Three changes that make attacks like SleeperGem harder to pull off:

**Require 2FA for all maintainers.** RubyGems already supports this, but enforcement is opt-in. If you maintain gems, enable 2FA on your RubyGems account now. If you manage a team that publishes gems, make it mandatory. The compromised accounts in SleeperGem might not have had 2FA enabled.

**Pin dependencies with checksums.** Bundler supports a `Gemfile.lock` that locks exact versions, but it doesn't verify package integrity by default. Use `bundle lock --add-checksums` to add SHA256 hashes to your lockfile. This won't prevent a malicious update from being published, but it will prevent it from being installed silently — the checksum mismatch will fail the install.

**Monitor dormant packages.** Write a script that checks your dependency tree for packages that haven't been updated in over a year. Flag any sudden version bumps for manual review before allowing them into your build. The two older packages in SleeperGem would have triggered this check immediately.

These three changes won't stop every supply chain attack, but they raise the cost enough to make attackers look for easier targets. And right now, most Ruby projects don't have any of them in place.
