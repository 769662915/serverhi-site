import type { Post } from './posts';

const topics = {
  docker: {
    icon: 'boxes',
    summary: 'Compose, container networking and volumes',
    tasks: [
      { label: 'Wait for a healthy Compose dependency', slug: 'docker-compose-health-checks-guide' },
      { label: 'Manage persistent Docker volumes', slug: 'docker-volume-management' },
      { label: 'Restore a Redis snapshot', slug: 'redis-container-setup' },
    ],
  },
  linux: {
    icon: 'linux',
    summary: 'Ubuntu, packages and system administration',
    tasks: [
      { label: 'Upgrade an Ubuntu LTS server', slug: 'ubuntu-26-04-lts-preview' },
      { label: 'Manage users and groups', slug: 'linux-user-group-management-complete-guide' },
      { label: 'Observe a Linux listener backlog', slug: 'linux-kernel-parameters-sysctl-tuning' },
    ],
  },
  'server-config': {
    icon: 'sliders',
    summary: 'Nginx, Apache and databases',
    tasks: [
      { label: 'Deploy an Nginx reverse proxy', slug: 'nginx-reverse-proxy-2026-02-07' },
      { label: 'Tune a PostgreSQL sort in one session', slug: 'postgresql-performance-tuning-ubuntu' },
      { label: 'Check a TLS certificate and its renewal', slug: 'ssl-tls-certificate-management' },
    ],
  },
  devops: {
    icon: 'branch',
    summary: 'CI/CD, automation and infrastructure as code',
    tasks: [
      { label: 'Verify an off-site PostgreSQL backup', slug: 'backup-strategies' },
      { label: 'Configure Terraform S3 state locking', slug: 'terraform-remote-state-management' },
      { label: 'Check whether a GitLab CI cache helps', slug: 'gitlab-ci-cd-pipeline-optimization' },
    ],
  },
  security: {
    icon: 'shield',
    summary: 'Access controls, firewalls and hardening',
    tasks: [
      { label: 'Review SSH server settings', slug: 'ssh-server-hardening' },
      { label: 'Check a Fail2Ban filter before using it', slug: 'linux-fail2ban-advanced-configuration' },
      { label: 'Understand SELinux and AppArmor denials', slug: 'selinux-apparmor-comparison-2026' },
    ],
  },
  troubleshooting: {
    icon: 'pulse',
    summary: 'Diagnose failing services and resource limits',
    tasks: [
      { label: 'Nginx returns 502', slug: 'nginx-502-bad-gateway-troubleshooting' },
      { label: 'A disk reports no free space', slug: 'linux-disk-space-analysis-tools' },
      { label: 'A container keeps restarting', slug: 'docker-container-crash-loop-troubleshooting' },
      { label: 'A systemd service fails to start', slug: 'systemd-failed-service-troubleshooting' },
    ],
  },
} as const;

export function getTopic(slug: string) {
  return topics[slug as keyof typeof topics];
}

export function publishedTasks(slug: string, posts: Post[]) {
  return getTopic(slug).tasks.filter(task => posts.some(post => post.slug === task.slug));
}
