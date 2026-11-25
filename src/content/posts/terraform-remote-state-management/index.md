---
title: "Terraform S3 state locking and migration from DynamoDB"
description: "Enable native S3 lockfiles, scope IAM to the state and lock keys, and move older runners off DynamoDB without allowing independent writers."
pubDate: 2026-04-07
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Terraform Remote State Management: S3 Backend Configuration and Best Practices"
category: "devops"
tags: [DevOps, Terraform, IaC, AWS]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

**Updated November 25, 2026.** Terraform 1.10 added S3-native state locking. HashiCorp marks DynamoDB-based locking as deprecated. The migration matters when an older runner and a newer workstation can both write to the same state. [S3 backend reference](https://developer.hashicorp.com/terraform/language/backend/s3) · [Terraform 1.10 release](https://github.com/hashicorp/terraform/releases/tag/v1.10.0)

## A new state backend

Create a private S3 bucket, enable versioning, restrict access and choose encryption before initialization. State can contain credentials and resource attributes even when CLI output marks a value sensitive. The example uses an illustrative bucket name. Replace it with your own and start with a disposable state key.

```hcl
terraform {
  required_version = ">= 1.10.0, < 2.0.0"
  backend "s3" {
    bucket       = "example-organization-tf-state"
    key          = "lab/network/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
```

Scope `s3:ListBucket` to the bucket and relevant prefix. The default-workspace state object needs `s3:GetObject` and `s3:PutObject`. Its sibling `lab/network/terraform.tfstate.tflock` needs `s3:GetObject`, `s3:PutObject` and `s3:DeleteObject` for the lock lifecycle. The state object itself does not require deletion for normal operations in the default workspace. Non-default workspaces use different paths and permissions. With a customer-managed KMS key, grant the required KMS access to the execution role as well. Use a short-lived role and keep credentials out of configuration and plan files.

## Keep old and new clients coordinated

1. Inventory all writers, including scheduled CI jobs, recovery tools and developers' CLI versions. Record the exact bucket, key, region, workspace and DynamoDB table. Back up the current version and confirm you can retrieve it into a private directory.
2. For a mixed-version transition, keep legacy clients on their existing DynamoDB configuration. Configure upgraded clients with both `dynamodb_table` and `use_lockfile = true` for the same backend, and grant access to both locks. Legacy clients can reject the newer option. One population using only DynamoDB and another using only S3 would be able to write concurrently.
3. Prove that the two clients contend on disposable state. Once all writers support S3 and have upgraded, schedule the change to S3-only configuration across those clients. Retire legacy permissions and the table only after checking all scheduled and recovery paths.

For a lock configuration change on the **same state location**, initialize each updated working directory with `terraform init -reconfigure`. Moving state to a different backend or key is a separate operation. Stop writers, make a protected copy, use `terraform init -migrate-state` with the correct source available, and compare `terraform state list` before and after. A blank plan against the intended resources helps catch a wrong workspace or key.

## Rehearse contention

In a test project that uses an inexpensive local-only resource such as `terraform_data`, start an interactive `terraform apply` with a small pending change. While it waits for approval and holds the lock, use a second initialized directory targeting the same lab key. Run `terraform plan -lock-timeout=5s` and inspect the lock error. Cancel the first operation, wait for it to exit, then repeat the plan. The second plan should now be able to acquire the lock. During migration, repeat with the two supported client configurations. This procedure describes a rehearsal on your own backend. It does not establish the state of a production AWS account.

If a lock remains after a failed job, check the owner, job and active processes. Only release a known abandoned lock from your own operation and record the lock ID. For a missing or unexpected state, confirm the account, bucket, key and workspace before inspecting version history. [Terraform state locking](https://developer.hashicorp.com/terraform/language/state/locking) · [Terraform init](https://developer.hashicorp.com/terraform/cli/commands/init)

## Verification on November 25, 2026

Terraform 1.10.5 and 1.9.8 used a local S3/DynamoDB API emulator and disposable state keys. With S3-only locking, a second 1.10.5 client timed out while the first awaited approval. With a dual-lock 1.10.5 client holding the state, the DynamoDB-only 1.9.8 client also timed out. Both acquired the lock after the first operation was cancelled. AWS IAM permissions and production network behavior require a separate check.
