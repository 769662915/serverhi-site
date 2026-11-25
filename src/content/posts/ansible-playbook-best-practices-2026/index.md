---
title: "Write an Ansible playbook whose second run has nothing to change"
description: "Manage a file on a local lab target, check the proposed diff, prove idempotence on the second run and change one variable to observe real drift."
pubDate: 2026-04-04
updatedDate: 2026-11-25
coverImage: "./cover.webp"
coverImageAlt: "Terminal-style illustration for Ansible Playbook Best Practices: Writing Maintainable Infrastructure as Code"
category: "devops"
tags: [DevOps, Ansible, IaC, Automation]
author: "ServerHi Editorial Team"
featured: false
draft: false
---

A green Ansible run can still report changes on every deployment. Try the desired state twice on the same host and inspect the second recap. The exercise below uses ansible-core, Python 3 and a fresh writable directory. It manages only a file inside that directory, without privilege escalation.

Save the following as `site.yml`. `ansible.builtin.copy` compares the target contents and mode with the declared values. A shell command that appends another line every time would give the next run a different starting state.

```yaml
- name: Manage the lab service settings
  hosts: localhost
  connection: local
  gather_facts: false
  vars:
    report_mode: daily
  tasks:
    - name: Write the reporting interval
      ansible.builtin.copy:
        dest: "{{ playbook_dir }}/report.conf"
        content: "mode={{ report_mode }}\n"
        mode: "0640"
```

## Check a change, then apply it twice

```bash
ansible-playbook --syntax-check -i localhost, site.yml
ansible-playbook --check --diff -i localhost, site.yml
ansible-playbook -i localhost, site.yml
cat report.conf
ansible-playbook -i localhost, site.yml
```

The trailing comma makes `localhost,` a one-host inline inventory. On a clean first application the copy task should report `changed` and the file should contain `mode=daily`. On the second application the recap should say `changed=0` and `failed=0`. Check mode predicts what a supported module would do; it does not replace that second run. Avoid showing diffs when a real file contains secrets.

## Make drift visible

Run `ansible-playbook -i localhost, site.yml -e report_mode=hourly`, inspect the file, and repeat with the same override. Expect one change followed by zero. If every run changes the file, look for a rendered timestamp or a shell task that has no state check.

For several environments, keep host membership in inventory, put the environment-specific interval in group variables and move shared tasks into a role when a second play actually uses them. If a change requires a service reload, have the file task notify a handler so a clean second run also avoids the reload. [Ansible playbooks](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_intro.html) · [Ansible copy module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html)

## Verification on November 25, 2026

In the localhost rehearsal the first apply changed one file. The second apply ended with `ok=1 changed=0 unreachable=0 failed=0` and the file contained the configured value.
