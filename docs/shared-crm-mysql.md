# 官网共用 CRM MySQL（EC2）

官网生产配置 `compose.ec2.yaml` 已移除常驻 MySQL 服务。官网和 CRM 使用同一个 MySQL 8.4 **容器进程**，但官网单独使用 `alemaxsite` 数据库和 `alemaxsite` 账号，不使用 CRM 的业务表或应用账号。预计释放原官网 MySQL 进程占用的约 438 MiB（以实际运行情况为准）。本地开发 compose 不变。

正常运行的官网服务只有 api、worker、web。`db-client` 是 maintenance profile 下按需启动并退出的 MySQL 命令行客户端，不运行 mysqld，不占用数据库数据卷。官网不会启动、停止或删除 CRM MySQL。

## 一、准备服务器和数据库账号

以下命令在 EC2 上运行。先拉取包含本次修改的代码；已有官网部署**不要直接运行 deploy.sh**，先执行迁移步骤。

```bash
cd /opt/alemax-official-v2
cp -p .env.ec2 .env.ec2.before-shared
chmod 600 .env.ec2.before-shared
sudo docker inspect alemax-crm-mysql-1 --format '{{.State.Status}}'
sudo docker network inspect alemax_shared --format '{{range .Containers}}{{println .Name}}{{end}}'
openssl rand -hex 32
```

保存最后生成的 64 位十六进制密码，作为官网专用数据库密码。确认网络列表包含 `alemax-crm-mysql-1`。当前 CRM 仓库已配置这个网络；如果生产环境名称不同，先核对实际配置，再调整 `CRM_MYSQL_NETWORK` 和 `MYSQL_HOST`。

进入 CRM MySQL；在提示时输入 **CRM MySQL root 密码**（不是官网密码，也不是 CRM 后台登录密码）：

```bash
sudo docker exec -it alemax-crm-mysql-1 mysql -u root -p
```

执行以下 SQL，把 `PASTE_GENERATED_HEX_PASSWORD` 替换为刚生成的密码。不要修改 CRM 原有数据库、用户或 root 密码。

```sql
CREATE DATABASE alemaxsite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'alemaxsite'@'%' IDENTIFIED BY 'PASTE_GENERATED_HEX_PASSWORD';
GRANT ALL PRIVILEGES ON alemaxsite.* TO 'alemaxsite'@'%';
SHOW GRANTS FOR 'alemaxsite'@'%';
EXIT;
```

脚本限定库名和账号为 `alemaxsite`，避免配置错误时向 CRM 业务库导入官网表。若 CREATE 报已存在，先核查该库的数据和账号，不要删除或覆盖。

编辑官网 `.env.ec2`：

```dotenv
MYSQL_HOST=mysql
MYSQL_DATABASE=alemaxsite
MYSQL_USER=alemaxsite
MYSQL_PASSWORD=刚生成的64位十六进制密码
CRM_MYSQL_NETWORK=alemax_shared
CMS_SEED_ON_START=false
```

保留其他官网配置。新的生产配置不再需要 `MYSQL_ROOT_PASSWORD`；旧值已在 `.env.ec2.before-shared` 中备份，供旧栈回滚使用。不要复制 CRM 的应用数据库账号。

## 二、从 backups 数据库备份导入，然后停止旧 MySQL

将要恢复的官网 MySQL SQL 文件放在项目的 `backups/` 下，明确传入文件路径，支持 `.sql` 和 `.sql.gz`。脚本不再从旧官网容器导出数据库；旧容器已经删除也可以运行。不会自动挑选“最新”文件。

```bash
cd /opt/alemax-official-v2
sudo bash deploy/ec2/migrate-to-crm-mysql.sh backups/initial-migration-20261019T184131Z/database.mysql.sql
```

压缩 SQL 示例（替换为实际文件路径）：

```bash
sudo bash deploy/ec2/migrate-to-crm-mysql.sh backups/你的备份目录/database.sql.gz
```

`alemax-initial-migration-*.tar.gz` 是迁移包，不是压缩 SQL，需要先解包，再指定其中的 `database.mysql.sql`。请使用希望恢复的数据时间点：迁移完成后展示的是所选备份的数据，备份之后的修改不会自动同步。

脚本会：

1. 校验文件位于本项目 backups 目录、格式有效、目标官网库为空。旧容器存在时验证其官网项目标签。
2. 构建应用镜像，将选定 SQL 固定保存到新的 `backups/shared-mysql-时间/` 目录。有同目录 `SHA256SUMS` 时核验所选 SQL 的校验和。
3. 停止官网 web、worker、api，并备份当前上传文件，CRM 继续运行。
4. 导入选定 SQL，检查三个核心表。有同目录 `manifest.json` 时，再核对其中列出的表的记录数；没有清单时无法核对原始记录数。
5. 运行部署脚本，等待健康检查以及 `/admin`、`/en`、`/es` 检查通过。
6. 旧官网 MySQL 容器仍存在时，禁用其自动重启并停止它，保留旧数据卷；容器已删除则跳过。

图片继续使用现有 `cms_uploads` 卷；此脚本不会从备份包恢复图片。如果上传卷也丢失，应改用首次部署的 `import-initial.sh` 恢复完整迁移包。

失败时不自动清空数据库。导入过数据后不能直接重跑整个迁移脚本；检查迁移记录目录和报错，处理部分导入状态。若仅最后部署失败，修正后运行 `deploy.sh`，验证正常后再停止旧容器。

```bash
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml ps
sudo docker stats --no-stream
sudo docker inspect alemax-official-db-1 --format '{{.State.Status}} restart={{.HostConfig.RestartPolicy.Name}}'
```

若旧容器仍在，最后一项应为 `exited restart=no`；已删除则 inspect 会提示不存在。还需检查官网后台、图片、文章、SEO、翻译，以及 CRM 登录和业务数据。若迁移成功但旧容器停止步骤失败：

```bash
sudo docker update --restart=no alemax-official-db-1
sudo docker stop alemax-official-db-1
```

不要执行 `docker compose down -v`，不要删除旧 MySQL 数据卷，不要把两个 MySQL 进程挂到同一个数据目录。稳定运行并完成异地备份后，再另行清理旧卷。

## 三、首次部署（没有旧官网容器）

完成第一节的数据库、账号和网络准备后，使用现有的本地迁移包：

```bash
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml build api
sudo bash deploy/ec2/import-initial.sh /absolute/path/to/migration-bundle
sudo bash deploy/ec2/deploy.sh
```

不要运行旧文档中的 `up -d db`。导入脚本现在直接连接共享服务器的独立官网库，并拒绝非空目标库。

## 四、日常部署和备份

```bash
sudo bash deploy/ec2/deploy.sh
sudo bash deploy/ec2/backup.sh
```

部署前会检查共享数据库连接。备份脚本只导出 `alemaxsite` 和官网上传文件，只短暂停止官网应用，不停止 CRM 或共享 MySQL。共享数据库必须先由 CRM 启动；服务器重启时 CRM MySQL 的 `unless-stopped` 策略负责恢复该容器。官网应用同样自动重启。

## 五、失败回滚

回滚期间暂停官网写入。下面使用保留的旧官网数据库卷和迁移前环境文件，不影响 CRM MySQL：

```bash
cd /opt/alemax-official-v2
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml stop web worker api
sudo docker compose --env-file .env.ec2.before-shared -f deploy/ec2/compose.standalone.rollback.yaml up -d --wait
```

回滚配置使用原项目名及原数据卷名称。旧栈恢复后，后续操作应明确使用这个回滚配置，不要再运行默认部署脚本。新官网库若已经产生新增数据，旧库不包含这些变更；应先导出新库并制定数据合并方案，不能直接切回。不要将官网 SQL 导入 CRM 的业务数据库。
