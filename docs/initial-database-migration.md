> **生产数据库配置已更新：** 当前官网共用 CRM MySQL 的独立 `alemaxsite` 库。请先按 [共享数据库迁移指南](shared-crm-mysql.md) 操作；下文中独立 `db` 服务、`MYSQL_ROOT_PASSWORD`、`up -d db` 和 `exec db` 命令仅适用于旧版独立数据库部署，不适用于当前生产配置。

# 首次部署：将本地数据库同步到生产 MySQL

本项目本地开发使用 SQLite，EC2 生产使用 MySQL 8.4。不能把 SQLite 的 `.db` 文件复制进 MySQL 数据卷，也不能直接导入 SQLite 的 `.dump`。

本文使用专用导出脚本生成 MySQL 建表和数据 INSERT SQL，再将数据库和上传图片作为同一迁移包同步。该流程只用于**首次部署的空数据库**，不是日常双向同步或增量合并工具。

## 1. 本次已经生成的文件

本次迁移包位于项目根目录：

```text
backups/initial-migration-20261019T184131Z/
├── database.mysql.sql
├── uploads.tar.gz
├── manifest.json
└── SHA256SUMS
```

| 文件 | 内容 |
| --- | --- |
| `database.mysql.sql` | MySQL 8.4 建表、索引和完整数据；不是 SQLite SQL |
| `uploads.tar.gz` | 本地 `backend/.local/uploads` 中的上传图片，保留文件名 |
| `manifest.json` | 导出时间、各表行数、上传文件 SHA256 |
| `SHA256SUMS` | 校验 SQL、图片包和 manifest 是否完整 |

同时提供完整压缩包 `backups/alemax-initial-migration-20261019T184131Z.tar.gz`，包含上述目录，可一次上传。若使用压缩包，在服务器以 ubuntu 用户执行：

```bash
tar -xzf /home/ubuntu/alemax-initial-migration-20261019T184131Z.tar.gz -C /home/ubuntu
```

解压后按下面步骤校验并导入，不要将外层压缩包直接传给 MySQL。

本次导出包含 `cms_content` **88** 条、`cms_translation_jobs` **12** 条、`inquiries` **0** 条，以及上传图片 **1** 个。这是导出时的快照；本地继续编辑后需要重新导出。

内容包括：英文与西语草稿、SEO 标题/描述、富文本正文、产品关系、排序、版本号、审核状态，以及两种语言各自已发布快照。翻译历史记录也保留。未发布的草稿导入后仍然不会出现在前台。

SQL 不包含 `.env`、管理员密码、内部 API Key、SMTP 密钥或 DeepL 密钥；这些仍需单独配置在服务器 `.env.ec2`。数据库可能包含内容、错误记录或联系信息，迁移包应按敏感数据管理。本次导出目录和文件权限分别为 700/600，整个 `backups/` 已被 Git 忽略，不提交到公开仓库。

## 2. 重新导出最新本地数据

为保证数据库和图片对应，先暂停后台编辑和上传，等待翻译任务完成，然后停止本地 `npm run dev`。脚本使用 SQLite backup API 获取一致的数据库快照，不修改源库；图片目录也应在导出期间保持不变。

在本地项目根目录执行：

```bash
backend/.venv/bin/python scripts/export-local-mysql.py
```

需要先安装 `backend/requirements.txt` 中的依赖。脚本默认读取：

```text
backend/.local/cms.db
backend/.local/uploads/
```

如果开发配置使用其他数据库或上传路径，必须显式指定，不能误导出默认旧库：

```bash
backend/.venv/bin/python scripts/export-local-mysql.py \
  --database /absolute/path/to/cms.db \
  --uploads /absolute/path/to/uploads \
  --output /absolute/path/to/new-migration-directory
```

输出目录必须不存在，避免覆盖旧快照。脚本发现未知表、缺失的已引用图片、图片目录中的软链接，或仍有 queued/running 翻译任务时会中止；排查后使用新的输出目录重试，不将半成品上传到服务器。

macOS 校验示例：

```bash
cd backups/initial-migration-20261019T184131Z
shasum -a 256 -c SHA256SUMS
```

实际使用重新导出后显示的目录名。

## 3. 准备 EC2 和生产配置

先按 [EC2 部署文档](aws-ec2-deployment.md)完成 Docker、Git、仓库克隆、环境变量和镜像构建准备。项目路径采用：

```text
/opt/alemax-official-v2
```

本次导入前，**不要先运行完整的 `deploy.sh` 或默认 `compose up`**，否则 API 启动可能自动创建表并导入仓库初始数据，数据库就不再为空。

在 EC2 项目根目录执行：

```bash
cp deploy/ec2/ec2.env.example .env.ec2
chmod 600 .env.ec2
```

编辑 `.env.ec2`：

1. 填写新的生产 MySQL 密码、管理员密码、会话密钥、内部 API Key、Turnstile 和 SMTP 等参数。
2. 将 `CMS_SEED_ON_START=false`，避免首次导入时意外使用仓库初始数据。
3. 保持 `WEB_PORT`、Caddy、域名、`SITE_ORIGINS` 一致。
4. 不要复制本地 `API_INTERNAL_URL=http://127.0.0.1:8000` 到生产：生产 Compose 已正确设置 `http://api:8000`。

数据库名称与用户均为 `alemax`，由生产 Compose 配置。生产数据库密码可以与本地不同，数据 SQL 不包含账户设置。

构建镜像，但只启动数据库：

```bash
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml build
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml up -d --wait --wait-timeout 240 db
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml ps
```

此时只应有 db 运行，api/web/worker 不应启动。不要提前启用 GitHub 自动部署；`EC2_DEPLOY_ENABLED` 保持未设置或 false，直到首次导入验收完成。

## 4. 安全上传迁移包

在本地执行，将示例主机名、密钥路径及迁移目录改为实际值：

```bash
scp -i /path/to/ec2-key.pem -r \
  backups/initial-migration-20261019T184131Z \
  ubuntu@EC2_ELASTIC_IP:/home/ubuntu/
```

不要将占位的 `EC2_ELASTIC_IP` 原样执行。若采用 SSM/S3 传输，也应使用受控访问，不把 SQL 放到公开下载地址。

在 EC2 校验：

```bash
cd /home/ubuntu/initial-migration-20261019T184131Z
chmod 700 .
chmod 600 database.mysql.sql uploads.tar.gz manifest.json SHA256SUMS
sha256sum -c SHA256SUMS
```

四个文件必须来自同一次导出，不能混用不同快照的 SQL 和图片包。

## 5. 执行首次导入

进入 EC2 项目目录，执行：

```bash
cd /opt/alemax-official-v2
sudo bash deploy/ec2/import-initial.sh \
  /home/ubuntu/initial-migration-20261019T184131Z
```

脚本将：

1. 验证迁移包的 SHA256、图片包路径和每个图片文件的摘要。
2. 拒绝在 api/web/worker 运行时导入。
3. 检查目标数据库**没有任何表**，上传 volume 也为空；非空则中止，不覆盖。
4. 将图片还原到 `cms_uploads` volume，再执行 MySQL SQL。
5. 自动比对各表实际行数与预期行数，不一致则报错停止。

本次预期结果：

```text
cms_content           actual_rows=88  expected_rows=88
cms_translation_jobs  actual_rows=12  expected_rows=12
inquiries             actual_rows=0   expected_rows=0
```

重新导出后的预期值以包内 `manifest.json` 为准。当前导入脚本会自动比较行数，不会自动启动站点。确认行数一致后继续。

SQL 使用 UTF-8/utf8mb4 和十六进制字符串表达式，保留西语重音、中文、引号、换行及 JSON 转义，不要手动全局替换 SQL 的反斜杠或中文。SQL 无 DROP/REPLACE，不会主动删除已有表；然而 MySQL DDL 不是整个文件的原子事务，导入失败时可能留下已建表或图片，不能直接重复导入。

### 如果目标数据库已经不是空库

停止导入，不要执行 `down -v`，也不要直接 DROP。先查明是否已有线上编辑、发布、询盘及上传图片，并用 `backup.sh` 或等效方式备份。若只是误启动生成的初始数据，也要确认确实可丢弃，再由维护人员清理目标或准备新的空数据库/volume。此脚本故意不会自动删除生产数据。

如果导入中途失败，同样先保留现场并查明原因；确认目标仍是可丢弃的首次部署环境后，重新准备空目标再导入，不用 `mysql --force` 跳过错误。

## 6. 启动、验证和切换域名

```bash
sudo bash deploy/ec2/deploy.sh
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml ps
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml logs --tail=100 api worker web
```

本地接口测试：

```bash
curl -f http://127.0.0.1:3100/en -o /dev/null
curl -f http://127.0.0.1:3100/es -o /dev/null
```

数据库行数检查：

```bash
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml exec -T db sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE" -e "SELECT COUNT(*) FROM cms_content; SELECT COUNT(*) FROM cms_translation_jobs; SELECT COUNT(*) FROM inquiries;"'
```

然后按 EC2 文档配置 Caddy、DNS、HTTPS，并在浏览器验收：

- 以生产管理员密码登录后台，确认 88 条内容和实际编辑文案。
- 核对英文、西语、SEO 字段、富文本、分类关系、排序和发布版本。
- 打开一张已上传的 `/media/...` 图片，确认文件可访问。
- 区分草稿和发布版本：导入不会自动发布本地尚未发布的图片或文案。
- 检查 Cookie 弹窗、询盘邮件和翻译。历史 failed 翻译任务仍保留失败状态，不代表此次迁移失败；需要时人工重试。
- 确认没有启动本地残留 queued/running 任务，避免意外覆盖西语或消耗 DeepL 额度。

确认无误后再正式切换官网流量、启用 `EC2_DEPLOY_ENABLED=true`。此后所有编辑以生产数据库为准，不要再次导入旧的本地 SQL 覆盖线上内容。

## 7. 留存与回退

上线前后分别留存完整数据库与图片备份，参见 EC2 文档的 `backup.sh`。迁移包是某个时间点的数据，不会自动追踪后续线上修改。

首次部署失败时可暂停域名切换或维持旧站，保留迁移包进行排查。上线后回退必须使用已验证的备份恢复流程，数据库、上传图片、代码版本和环境配置需要配套，不能只回滚 Git 提交。不要通过开放 3306 来方便导入，使用 SSH/SSM 在 EC2 内执行。

迁移完成后按保留策略保存受控离线副本，清理服务器临时上传包；不要在没有其他有效备份时删除唯一副本。

## 本次导出验证结果

已在隔离的 MySQL 8.4 容器中实际导入本次 SQL，并逐条比较三个表的全部字段：88 条内容、12 条翻译记录、0 条询盘与本地 SQLite 一致；JSON 字段按结构比较，已验证英西语文本、富文本、SEO 和发布快照没有差异。上传图片包摘要也已验证。测试容器未发布端口、未连接生产数据库，验证后已删除。

该验证针对本次快照，不代表已在 EC2 完成部署；后续重新导出仍应核对包摘要和服务器导入结果。
