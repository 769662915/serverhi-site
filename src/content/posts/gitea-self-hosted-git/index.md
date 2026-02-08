# Backup repositories (tar preserves permissions)
cd /var/lib/gitea
tar czf $BACKUP_DIR/repos_$DATE.tar.gz data/repositories

# Backup custom configuration
cp /etc/gitea/app.ini $BACKUP_DIR/app.ini_$DATE

# Keep only recent backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $DATE"
```

Add to crontab for automated daily backups:

```bash
# crontab -e
0 2 * * * /usr/local/bin/backup-gitea.sh >> /var/log/gitea-backup.log 2>&1
```

### Restoration Procedures

To restore from backup:

```bash
# Restore database
docker exec -i gitea-db psql -U gitea < latest_backup.sql

# Restore repositories
cd /var/lib/gitea
tar xzf /backups/repos_latest.tar.gz

# Verify permissions
chown -R git:git data/repositories
chmod -R 755 data/repositories
```

## Administration and Maintenance

Keep your Gitea installation healthy through regular maintenance.

### Health Checks

```bash
# Check container health
docker ps | grep gitea

# Monitor logs
docker logs --tail 100 gitea

# Check database connectivity
docker exec gitea gitea doctor --conn-check
```

### Updates

```bash
# Update Docker container
docker pull gitea/gitea:latest
docker stop gitea
docker rm gitea
docker run -d [same parameters as before]

# Update binary (non-Docker)
cd /tmp
wget https://dl.gitea.io/gitea/1.21.0/gitea-1.21.0-linux-amd64
sudo systemctl stop gitea
sudo cp gitea-1.21.0-linux-amd64 /usr/local/bin/gitea
sudo systemctl start gitea
```

## Conclusion

Gitea provides a powerful, self-hosted Git solution suitable for teams of any size. Start with Docker deployment for simplicity, configure PostgreSQL for production reliability, and add Nginx with HTTPS for secure access. Set up organizations and teams to manage access effectively, and integrate with your development workflow through SSH configuration and webhooks.

Regular backups and monitoring ensure your Git infrastructure remains reliable. As your team grows, Gitea scales to handle increased load while maintaining the simple, fast experience that distinguishes it from heavier alternatives.

---

**Related Guides:**
- [CI/CD Pipeline Setup](/posts/cicd-pipeline-setup)
- [Docker Compose Tutorial](/posts/docker-compose-tutorial)
- [Git Server Configuration](/posts/git-server-setup)