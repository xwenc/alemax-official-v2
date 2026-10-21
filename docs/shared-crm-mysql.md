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

## 二、迁移已有生产官网，然后停止旧 MySQL

确认磁盘有足够空间保存数据库和上传文件备份。迁移期间官网短暂停止写入，CRM 继续运行。

```bash
cd /opt/alemax-official-v2
sudo bash deploy/ec2/migrate-to-crm-mysql.sh
```

脚本会：

1. 校验配置、确认旧容器属于官网项目、目标是另一个 MySQL 服务器且官网目标库为空。
2. 构建应用镜像，然后停止官网 web、worker、api，阻止迁移期间写入。
3. 将旧官网 SQL 和上传文件备份到 `backups/shared-mysql-时间/`，生成校验和。
4. 将 SQL 导入 CRM 中的 `alemaxsite`，核对源库与目标库每张表的记录数。上传文件继续使用原官网 `cms_uploads` 卷。
5. 运行部署脚本，等待官网健康检查以及 `/admin`、`/en`、`/es` 检查通过。
6. 禁用 `alemax-official-db-1` 的自动重启，并停止它。保留旧容器和旧数据卷。

失败时脚本不会删除旧库或清空目标库。查看输出中的备份位置并排查错误；目标导入过数据后再次执行会拒绝覆盖，不能直接重试整个迁移。若仅最后部署失败，修正后运行 `deploy.sh`，验证正常后执行下面的旧容器停止命令。

```bash
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml ps
sudo docker stats --no-stream
sudo docker inspect alemax-official-db-1 --format '{{.State.Status}} restart={{.HostConfig.RestartPolicy.Name}}'
```

最后一项应为 `exited restart=no`。还需检查官网后台、图片、文章、SEO、翻译，以及 CRM 登录和业务数据。若迁移成功但旧容器停止步骤失败：

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
