---
title: "Helm 3's Last Feature Drop Was Last Week. Helm 4 Breaks --wait First"
description: "9 September was Helm 3's last limited feature release. Security patches run to 10 February 2027. Install Helm 4 in parallel and fix watch RBAC before CI does it for you."
pubDate: 2026-09-16
coverImage: "./cover.webp"
coverImageAlt: "Laptop on a server-room cart showing a terminal with a helm command, cool aisle lighting, no readable cluster names."
category: devops
tags: ["Helm", "Kubernetes", "CI", "RBAC", "GitOps"]
author: "ServerHi Editorial Team"
featured: false
draft: false
difficulty: intermediate
estimatedTime: "40 minutes"
prerequisites:
  - "kubectl access to a non-prod cluster"
  - "Permission to change CI helm image and RBAC for the deploy service account"
osCompatibility:
  - "Linux CI runners"
  - "kubectl against Kubernetes 1.28+"
---

Helm 3 is not dead. It is finished adding things.

[George Jenkins posted the updated end-of-life note on 2 June](https://helm.sh/blog/helm-v3-end-of-life). The extra limited feature release landed 9 September 2026. Kubernetes client libraries only. No other backports. After that, bug fixes are done. Security patches continue until 10 February 2027. Then nothing: no client bumps, no CVEs, no Wednesday drops.

If your pipeline still pins `alpine/helm:3.14` because it "just works," last Wednesday was the reminder. The original Helm 4 launch post still lists older dates. Ignore those. The June note extended security three months past November 2026. Print 10 February 2027 on the runbook.

## What you actually got in Helm 4

[Matt Farina shipped v4.0.0 on 12 November 2025 at KubeCon NA](https://helm.sh/blog/helm-4-released). First major version in six years. The features that matter on a cluster, not in a keynote:

Server-side apply is on for new releases. Wait uses kstatus instead of the old poll. Post-renderers are plugins, including Wasm. Chart archives can be built so the tarball hashes. The SDK import path is `helm.sh/helm/v4`. There is an experimental v3 chart API, off by default. Do not use it in production because a blog told you to be modern.

[WZ-IT's July migration note is the one I would hand a platform team](https://wz-it.com/en/knowledge/kubernetes/migrate-helm-3-to-helm-4). Helm 4 reads existing Helm 3 releases. There is no `2to3` rewrite of storage. Charts with `apiVersion: v2` run. That is the good news. The bad news is silent CLI breaks, not a storage migration.

## The first failure will be --wait

Helm 4's `--wait` needs the `watch` verb on the resources in the chart (HIP-0022). List is not enough. If the deploy service account cannot watch, `--wait` fails immediately, before you get to argue about the image tag.

Check it in the namespace you actually ship to:

```bash
kubectl auth can-i watch deployments.apps --as=system:serviceaccount:NAMESPACE:SA -n NAMESPACE
kubectl auth can-i watch statefulsets.apps --as=system:serviceaccount:NAMESPACE:SA -n NAMESPACE
```

Repeat for the other kinds in the chart. If the answer is no, patch the Role before you bump the binary in CI. This is the stumbling block WZ-IT puts first because it is the one that pages people at 4 p.m.

New releases use server-side apply. Old Helm 3 releases stay on client-side apply until you move them. Mixed field ownership is a real fight if a controller and Helm both think they own `spec.replicas`. Plan one chart at a time in staging. Do not flip 80 charts on a Monday.

## CI scripts that will fail on Tuesday

`helm registry login` wants a domain, not a path. If your job logs into `ghcr.io/myorg`, cut it to `ghcr.io`.

`--atomic` is `--rollback-on-failure`. `--force` is `--force-replace`. The old flags warn. Warnings in a log nobody reads are how you discover the removal later. `--create-pods` is gone. Delete it.

Post-renderers: an executable path on `--post-renderer` does not work. It has to be a plugin name. If your GitOps path was `helm template | kustomize`, you already were not using Helm's post-renderer. If you were passing a binary path, rewire it as a plugin before the Helm 4 image is the only image.

Install Helm 4 next to Helm 3. They see the same cluster. `helm template` and `helm upgrade --dry-run` in staging will show the RBAC miss and the flag miss without touching prod. [Argo CD users should treat this as a controller image bump plus a values audit](/posts/argocd-gitops-kubernetes-setup-guide-2026/), not as a new religion. [Terraform-plus-Argo setups need the same helm binary the pipeline uses](/posts/gitops-argocd-terraform-practical-guide-2026/).

## A sequence that does not require heroics

1. Put Helm 4 on a laptop and on a non-prod runner. Leave Helm 3 on prod until a chart has survived a real upgrade in staging.
2. For each chart you care about, run `helm template` and a dry-run upgrade against a copy of prod values.
3. Add `watch` where `--wait` is on. Confirm with `can-i`.
4. Change registry login, flags, post-renderers in the workflow file. [If GitHub Actions is your runner, pin the helm version like you pin everything else](/posts/github-actions-september-2026-updates/).
5. Upgrade one release in staging. Read `helm get manifest` and the live object for field manager conflicts.
6. Only then change the prod image.

SDK users: move imports to `helm.sh/helm/v4` in a branch, run tests, then cut. Do not let a library bump ride along with a production deploy.

## The date that actually hurts

9 September was not a cliff. 10 February 2027 is. After that date a Helm 3 CVE sits there. Kubernetes will keep moving. Client library drift is how you get a pipeline that cannot talk to the API server you just upgraded.

Helm 4.3.x is already what helm.sh shows in the doc header next to 3.22.0. You do not need 4.0.0 nostalgia. You need a binary that still gets patches in 2027.

I do not want a platform-wide "Helm 4 day." I want a ticket per chart, RBAC first, flags second, SSA third. The 2-to-3 migration taught people to fear majors. This major is smaller and ruder about `--wait`. Fix the Role. Then swap the image. Then stop arguing about whether 3.22 is "fine" in January.

## What kstatus wait actually does to a deploy

Helm 3's `--wait` was a poll loop with opinions. Helm 4 asks kstatus whether the object is ready. That is better when CRDs are honest about their conditions. It is worse when a chart ships a Job that never reports the way kstatus expects, or a Deployment whose progress deadline is shorter than the image pull. You will see `--wait` fail on things that "worked" because Helm 3 got bored and exited 0.

Read the chart. If it contains a Job, a hook, or an operator, dry-run is not enough. Upgrade in staging with `--wait --timeout 10m` and sit there. If it fails, dump `kubectl describe` on the object Helm named, not on a random pod. Missing `watch` looks like an API error immediately. A kstatus mismatch looks like a timeout. Those are different tickets.

`--rollback-on-failure` (the old `--atomic`) still exists. Test it once. Server-side apply plus rollback is not the same code path as Helm 3's three-way merge plus rollback. I want a screenshot of a failed staging upgrade that actually rolled back, not a wiki sentence that says it will.

## Plugins, Wasm, and the GitOps renderer

The redesigned plugin system is why post-renderers moved. Helm 4 can load Wasm plugins. That is interesting for supply chain if you pin hashes. It is also a way to get a surprise interpreter in CI. If you do not need a plugin, do not install one. If you need Kustomize, keep the pipe outside Helm until the plugin is a pinned artifact in your repo, not a curl from a gist.

Artifact Hub did not go away. Chart provenance still matters. Reproducible chart archives are the quiet Helm 4 feature I actually want: the tarball you pushed is the tarball you tested. Turn that on in the chart build job before you argue about Wasm.

HIP-0012 was the process document for keeping Helm 3 alive during Helm 4. The June blog is the amendment. Teams that bookmarked the November 2025 launch post still quote July 2026 bugfix and November 2026 security. Those dates are stale. Put the June URL in the ticket. When someone says "we have until November," send them February 10, 2027.

## A boring inventory

List every place a helm binary runs: laptops, GitHub Actions, GitLab runners, Argo CD repo-server, Terraform `helm` provider, that one Jenkins box nobody owns. They will not upgrade together. That is fine. They must not silently mix flags. A laptop on Helm 4 talking `--rollback-on-failure` into a runner on Helm 3 is how you get a wiki that lies.

```bash
helm version
helm list -A
helm get metadata RELEASE -n NAMESPACE
```

If `helm list` on v4 shows the v3 releases, you are in the "no storage migration" world WZ-IT described. Good. If a release goes missing, stop. You pointed at the wrong kube context, not a new storage format.

Do not convert charts to the experimental v3 API to look busy. `apiVersion: v2` is the production line. Experimental stays off.

February 2027 is five months out from today if you start now, and one panicked weekend if you start after the holiday freeze. Last week's 9 September drop was the last courtesy feature. There will not be another.

If Argo CD renders charts, bump the repo-server image in a staging instance and sync a copy of one Application. If the sync hangs, look at RBAC inside the destination cluster, not at git. If Terraform's helm provider pins a provider version that still shells out to Helm 3, that is a second ticket. Provider bumps have a habit of landing in the same PR as an unrelated module change. Split them.

OCI registries: test `helm push` and `helm pull` against the registry you actually use, not against a toy. Login-domain-only has already bitten people who stuffed a namespace into the host field. Do that test on a laptop before CI becomes the first reporter.

I would rather a slow chart-by-chart file than a war room in February. Helm 4 is available. Helm 3 is on security-only after last week. That is the whole memo.
