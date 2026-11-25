---
title: "Test Helm chart values, upgrades and rollback with a ConfigMap"
description: "Create a small chart, render two value sets, install it into a disposable namespace, then read the live object before and after rollback."
pubDate: 2026-04-16
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Kubernetes Helm Chart Best Practices: Templates, Values, and Structure"
category: "devops"
tags: [DevOps, Kubernetes, Helm, Charts]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

A values file can parse correctly and still fail to change the Kubernetes object you expected. A small ConfigMap makes the path from default value to rendered manifest to live object easy to inspect. This example uses Helm 3 and an existing disposable Kubernetes context with permission to create one namespace.

Create `demo/Chart.yaml`:

```yaml
apiVersion: v2
name: demo
description: A configuration-value rehearsal
type: application
version: 0.1.0
```

Create `demo/values.yaml` with the default setting:

```yaml
message: daily
```

Create `demo/templates/settings.yaml`. Using the release name in the object name lets separate releases coexist in the same namespace. Quoting the value keeps a string such as `"true"` a string in the resulting manifest.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-settings
data:
  message: {{ .Values.message | quote }}
```

## Render before contacting the cluster

Save `message: hourly` in `hourly.yaml` beside the chart directory. Run:

```bash
helm lint ./demo
helm template schedule ./demo
helm template schedule ./demo -f hourly.yaml
```

The first manifest should contain `message: "daily"` and the second `message: "hourly"` under `data`. If the manifest still says daily, check the key's name and nesting. Linting alone cannot tell you that a valid but unused override reached the template. [Helm values files](https://helm.sh/docs/chart_template_guide/values_files/)

## Read the live object at each revision

Check `kubectl config current-context`. In a fresh namespace reserved for this drill, install the chart, upgrade it, then roll back:

```bash
helm install schedule ./demo --namespace serverhi-helm-lab --create-namespace
kubectl -n serverhi-helm-lab get configmap schedule-settings -o jsonpath='{.data.message}{"\n"}'
helm upgrade schedule ./demo --namespace serverhi-helm-lab -f hourly.yaml
helm history schedule --namespace serverhi-helm-lab
kubectl -n serverhi-helm-lab get configmap schedule-settings -o jsonpath='{.data.message}{"\n"}'
helm rollback schedule 1 --namespace serverhi-helm-lab
kubectl -n serverhi-helm-lab get configmap schedule-settings -o jsonpath='{.data.message}{"\n"}'
```

Expect daily, hourly and daily for a new release whose first revision you verified. For an existing release, identify the intended revision from its history. A manifest rollback cannot undo a database migration or external side effect. Remove the lab release with `helm uninstall schedule -n serverhi-helm-lab` and remove the namespace only if it was created exclusively for the exercise.

## Verification on November 25, 2026

Helm 3.22.1 installed the ConfigMap into a disposable K3s namespace. Revision 2 changed the observed value from `daily` to `hourly`. Rolling back to revision 1 returned the live value to `daily`. This chart tests API configuration and has no application Pod to check.
