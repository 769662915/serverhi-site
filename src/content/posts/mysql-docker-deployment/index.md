version: '3.8'

services:
  mysql-primary:
    image: mysql:8.0
    container_name: mysql-primary
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    volumes:
      - mysql_primary:/var/lib/mysql
      - ./primary.cnf:/etc/mysql/conf.d/primary.cnf:ro
    ports:
      - "3306:3306"
    networks:
      - db-network
    command: --server-id=1 --log-bin=mysql-bin --binlog-format=ROW
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

  mysql-replica:
    image: mysql:8.0
    container_name: mysql-replica
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
    volumes:
      - mysql_replica:/var/lib/mysql
      - ./replica.cnf:/etc/mysql/conf.d/replica.cnf:ro
    depends_on:
      - mysql-primary
    networks:
      - db-network
    command: --server-id=2 --log-bin=mysql-bin --binlog-format=ROW --read-only=ON --log-slave-updates=ON
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  db-network:
    driver: bridge

volumes:
  mysql_primary:
  mysql_replica:
```

### Configuring Replication

After starting containers, configure replication manually or through initialization scripts:

```sql
-- On primary, create replication user
CREATE USER 'repl_user'@'%' IDENTIFIED BY 'repl_password';
GRANT REPLICATION SLAVE ON *.* TO 'repl_user'@'%';

-- Show master status
SHOW MASTER STATUS;

-- On replica, start replication
CHANGE REPLICATION SOURCE TO
    SOURCE_HOST='mysql-primary',
    SOURCE_USER='repl_user',
    SOURCE_PASSWORD='repl_password',
    SOURCE_LOG_FILE='mysql-bin.000001',
    SOURCE_LOG_POS=123;

START REPLICA;
```

### Backup and Recovery

Implement regular backups for production databases:

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
CONTAINER="mysql-primary"

docker exec $CONTAINER mysqldump \
  -u root -p"${MYSQL_ROOT_PASSWORD}" \
  --single-transaction \
  --quick \
  --lock-tables=false \
  ${MYSQL_DATABASE} > ${BACKUP_DIR}/backup_${DATE}.sql

# Keep only last 7 days of backups
find ${BACKUP_DIR} -name "backup_*.sql" -mtime +7 -delete
```

### Performance Tuning

Optimize MySQL container performance for production workloads:

```ini
[mysqld]
# InnoDB settings for production
innodb_buffer_pool_size = 4G
innodb_buffer_pool_instances = 4
innodb_log_file_size = 1G
innodb_log_buffer_size = 64M
innodb_flush_log_at_trx_commit = 1
innodb_flush_method = O_DIRECT
innodb_file_per_table = 1

# Connection settings
max_connections = 500
wait_timeout = 600
interactive_timeout = 600

# Query cache disabled in MySQL 8.0
# query_cache_type = 0

# Thread pool
thread_pool_size = 32

# Binary logging
server-id = 1
log_bin = /var/log/mysql/mysql-bin.log
binlog_format = ROW
sync_binlog = 1
max_binlog_size = 1G
binlog_expire_logs_seconds = 604800
```

```bash
# Run with performance tuning
docker run \
  --name mysql-optimized \
  --memory=8G \
  --cpus=4 \
  -e MYSQL_ROOT_PASSWORD=secure_password \
  -v mysql_optimized:/var/lib/mysql \
  -v ./performance.cnf:/etc/mysql/conf.d/performance.cnf:ro \
  -d mysql:8.0
```

## Troubleshooting Common Issues

Database container issues often relate to permissions, networking, or configuration.

### Connection Problems

When applications cannot connect to MySQL containers:

```bash
# Verify MySQL is accepting connections
docker exec mysql-container mysql -u root -p -e "SHOW DATABASES"

# Check MySQL network configuration
docker exec mysql-container mysql -u root -p -e "SHOW VARIABLES LIKE 'skip_networking'"

# Verify container networking
docker network inspect app-network

# Test connectivity between containers
docker run --rm --network app-network mysql:8.0 \
  mysql -h mysql-app -u root -p -e "SELECT 1"
```

### Permission and Volume Issues

Volume permission problems prevent MySQL from starting:

```bash
# Check container logs for permission errors
docker logs mysql-container

# Recreate volume with correct permissions
docker volume create mysql_data_new
docker run --rm -v mysql_data:/var/lib/mysql_old \
  -v mysql_data_new:/var/lib/mysql \
  alpine:latest \
  sh -c "cp -r /var/lib/mysql_old/* /var/lib/mysql/"
docker volume rm mysql_data
docker volume rename mysql_data_new mysql_data

# Verify volume ownership
docker run --rm -v mysql_data:/var/lib/mysql alpine:latest \
  ls -la /var/lib/mysql | head -5
```

### Performance Degradation

Monitor and address performance issues:

```bash
# Check MySQL status
docker exec mysql-container mysql -u root -p -e "SHOW GLOBAL STATUS"

# View slow queries
docker exec mysql-container mysql -u root -p -e \
  "SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10"

# Check InnoDB buffer pool usage
docker exec mysql-container mysql -u root -p -e \
  "SHOW GLOBAL VARIABLES LIKE 'innodb_buffer_pool_size';"
```

## Conclusion

Docker containers provide an excellent platform for MySQL deployments, balancing ease of use with production capability. Start with basic persistent volume configuration, add security hardening appropriate to your threat model, and implement replication and backup procedures for production reliability.

Remember that containerization adds minimal overhead for most workloads, but I/O-intensive applications may require careful volume configuration or host-based storage for optimal performance. Test backup and recovery procedures regularly to ensure you can recover from failures when they occur.

---

**Related Guides:**
- [PostgreSQL Docker Setup](/posts/postgresql-docker-setup)
- [Redis Container Deployment](/posts/redis-container-setup)
- [Docker Compose Tutorial](/posts/docker-compose-tutorial)