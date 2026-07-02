---
title: "Jenkins Pipeline Shared Libraries: Reusable CI/CD Code Across Teams"
description: "A hands-on guide covering configuration, troubleshooting, and best practices for jenkins pipeline shared libraries: reusable ci/cd code across teams."
pubDate: 2026-04-21
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Jenkins Pipeline Shared Libraries: Reusable CI/CD Code Across Teams"
category: "devops"
tags: [DevOps, Jenkins, Pipeline, CI/CD]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

## The Copy-Paste Problem

After your third Jenkins pipeline, the same 50 lines of Groovy appear everywhere: Docker build steps, Slack notifications, artifact uploads. Shared libraries extract reusable code into a versioned, testable repository.

## Repository Structure

```
jenkins-shared-library/
  vars/           # Callable functions: dockerBuild.groovy, notifySlack.groovy
  src/            # Groovy classes: com/myorg/DockerUtils.groovy
  resources/      # Templates and config files
```

Configure in Jenkins: Manage Jenkins → Configure System → Global Pipeline Libraries.

## Global Variables (vars/)

`vars/dockerBuild.groovy`:

```groovy
def call(Map config = [:]) {
    def imageName = config.imageName ?: env.BUILD_TAG
    pipeline {
        agent any
        stages {
            stage('Build') {
                steps { script { docker.build(imageName, '.') } }
            }
        }
    }
}
```

Usage: `@Library('myorg-lib') _` then `dockerBuild(imageName: "myregistry.com/app:${BUILD_NUMBER}")`.

## Shared Classes (src/)

`src/com/myorg/DockerUtils.groovy`:

```groovy
package com.myorg
class DockerUtils implements Serializable {
    def steps
    DockerUtils(steps) { this.steps = steps }
    def buildAndPush(String name, String registry) {
        steps.sh "docker build -t ${registry}/${name} ."
        steps.sh "docker push ${registry}/${name}"
    }
}
```

Usage: `def docker = new com.myorg.DockerUtils(steps); docker.buildAndPush('app', 'registry.example.com')`.

## Versioning

Tag releases: `git tag v1.0.0 && git push --tags`. Reference in pipelines: `@Library('myorg-lib@v1.0.0') _`.

## Migration Strategy

Find code repeated 3+ times across Jenkinsfiles, extract to `vars/`, test in one pipeline, roll out. For complex logic with 3+ methods, use `src/` classes. Version with git tags for production pipelines.