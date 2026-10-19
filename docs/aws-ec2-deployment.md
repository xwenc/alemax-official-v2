# ALEMAX 官网：AWS EC2 部署

适用于本仓库 `xwenc/alemax-official-v2`。参考 CRM 附件的 Ubuntu + Docker Compose + Caddy + GitHub OIDC/SSM 架构，已按官网服务及私有 API 调整。本文和模板没有使用 CRM 的 AWS 账号、实例 ID 或部署凭证。仅生成文件，不会自动创建云资源或发布网站。

## 文件清单与架构

| 文件 | 用途 |
| --- | --- |
| `compose.ec2.yaml` | 独立生产配置，固定项目名 `alemax-official`，数据库、上传图片持久化，日志轮转 |
| `deploy/ec2/ec2.env.example` | 生产环境模板，复制到根目录 `.env.ec2` |
| `deploy/ec2/Caddyfile` | 宿主机 Caddy，HTTPS + 主域名跳转 |
| `deploy/ec2/validate-env.py` | 检查环境变量和端口，不输出秘密值 |
| `deploy/ec2/deploy.sh` | 加锁、检查配置、先构建再更新、等待健康检查、验证实际页面 |
| `deploy/ec2/backup.sh` | 短暂停止写入，同步备份 MySQL 和上传图片 |
| `deploy/ec2/iam-trust-policy.json` | GitHub OIDC 角色信任模板 |
| `deploy/ec2/iam-deploy-policy.json` | 对指定实例下发 SSM 命令的权限模板 |
| `.github/workflows/deploy-ec2.yml` | main 分支指定提交部署，需配置变量后启用 |

```text
浏览器 → EC2 宿主机 Caddy :443 → 127.0.0.1:3100 → Next.js web
                                                    ↓ 私有网络
                                                FastAPI api → MySQL db
                                                翻译 worker → DeepL
```

与 CRM 的关键区别：**不要将 `/api/*`、`/media/*` 或 `/cms/*` 转发给 FastAPI**。官网的 `/api/admin` 是 Next.js 认证代理，图片也是 Next.js 代理。Caddy 所有请求都转发到 web；数据库、API、worker 不发布宿主机端口。内部 API Key 不进入浏览器。

## 1. EC2、网络和磁盘

选择 Ubuntu 24.04 LTS x86_64。可从 2 核、4 GiB 内存、40 GiB 加密 gp3 磁盘开始，根据构建和流量调整；这不是性能或费用保证。绑定 Elastic IP，再将实际域名 DNS 指向该 IP。

安全组仅开放公网 TCP 80、443；需要 SSH 时将 22 限制为自己的公网 IP。不要开放 3100、8000、3306。SSM 需要实例可访问 AWS HTTPS 服务及正常 DNS，不需要额外入站端口。

若与 CRM 共用机器，已有 CRM Caddy 站点保持原样，官网新增两个独立域名块。官网默认只监听本机 3100，避免占用 CRM 的 3000。两套应用共用内存、CPU、磁盘，部署前确认余量。只有 4 GiB 时同时构建多个 Next.js 项目可能内存不足。

Cloudflare 初次部署可使用 DNS only；确认 Caddy 证书生效后再按需开启代理，SSL 模式使用 Full (strict)。生产域名若不同，修改 Caddyfile、SITE_ORIGINS、Turnstile 允许域名，保持一致。不要在官网 DNS 尚未切换时直接替换已有主站。

## 2. 安装基础软件

按 [Docker Ubuntu 官方安装步骤](https://docs.docker.com/engine/install/ubuntu/)安装 Docker Engine、Buildx 和 Compose 插件，按 [Caddy 官方安装步骤](https://caddyserver.com/docs/install)安装宿主机 Caddy。另需 `git`、`curl`、`python3`、`gzip`、`tar`、`util-linux`（flock）。

```bash
sudo apt update
sudo apt install -y git curl python3 gzip tar util-linux
sudo systemctl enable --now docker caddy
sudo docker compose version
```

上面的命令不负责安装 Docker/Caddy 本身，必须先完成官方安装步骤。如果 Docker/Caddy 软件源失败，不绕过签名校验；修复软件源后再继续。

## 3. 私有仓库访问与首次克隆

使用 `ubuntu` 用户创建单独的只读 GitHub Deploy Key，公钥添加到当前官网仓库 Settings → Deploy keys，私钥保存在 EC2，不提交到 Git。配置 `~/.ssh/config`，确认只读仓库拉取正常；首次连接对照 GitHub 官方 SSH 指纹确认主机身份。

```bash
sudo mkdir -p /opt/alemax-official-v2
sudo chown ubuntu:ubuntu /opt/alemax-official-v2
git clone git@github.com:xwenc/alemax-official-v2.git /opt/alemax-official-v2
cd /opt/alemax-official-v2
```

不要复用附件中 CRM 的仓库地址和部署路径。生产代码目录不要保留受 Git 跟踪文件的人工修改，环境配置放在被忽略的 `.env.ec2`。

## 4. 配置环境

```bash
cp deploy/ec2/ec2.env.example .env.ec2
chmod 600 .env.ec2
```

编辑 `.env.ec2`，替换所有 `REPLACE_` 占位值。分别运行 `openssl rand -hex 32` 生成不同的数据库密码、内部 API Key 和会话密钥。数据库密码用十六进制，避免拼接 DATABASE_URL 时产生转义错误；管理员密码至少 12 字符。

- `WEB_PORT=3100` 必须与 Caddy 的上游端口一致。
- `SITE_ORIGINS` 使用精确 HTTPS 来源，不带路径或尾斜杠。
- SMTP 配置在 Next.js 服务端；587 使用 STARTTLS，465 使用直接 TLS，发件人需被服务商授权。
- 生产询盘需要正确的 Turnstile 公钥、私钥及允许域名。预检会阻止缺少 CAPTCHA、SMTP_HOST、SMTP_FROM 的配置。
- DeepL 可不配置，留空时手动编辑西语；`DEEPL_GLOSSARY_ID` 没有可用 EN → ES 词典时保持为空。详见 [DeepL 文档](deepl-guide.md)。
- `CMS_SEED_ON_START=true` 只在内容表为空时导入仓库内的初始内容；不会导入你本机 SQLite 中后续编辑的内容，也不会复制本机上传图片。
- 文件不通过 shell `source` 加载，由 Docker Compose 解析；密码含 `$` 时按 Compose dotenv 的规则使用单引号。不要把整个配置输出到日志。

### 数据迁移注意

新配置固定 Compose 项目名，默认新建 `alemax-official_mysql_data` 和 `alemax-official_cms_uploads`。如果服务器已有内容或之前使用 `compose.yaml` 部署，不要误以为新 volume 会自动包含旧数据。先备份旧库和上传目录，再明确选择迁移数据或复用旧 volume。不要直接覆盖已有生产数据库。

现有开发数据是 SQLite，不能直接交给生产 MySQL。若需保留本地编辑的内容，先另行完成跨数据库迁移和验证；本部署包不会自动转换或覆盖生产内容。

## 5. 首次启动与检查

```bash
sudo bash deploy/ec2/deploy.sh
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml ps
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml logs --tail=100 web api worker
curl -f http://127.0.0.1:3100/en -o /dev/null
curl -f http://127.0.0.1:3100/es -o /dev/null
```

部署脚本先构建镜像，构建失败不替换旧容器，再运行 `up --wait`，最后访问 `/admin`、`/en`、`/es` 检查 CMS 数据链路。worker 没有健康探针；容器 Running 不能证明 DeepL 额度、词典或实际翻译正常，需后台提交任务并查看 worker 日志验证。

务必显式使用 `--env-file .env.ec2 -f compose.ec2.yaml`，不要混用默认 Compose 或开发配置；不要在生产执行 `npm run dev`。

## 6. Caddy HTTPS

确认 DNS 指向目标实例，TCP 80/443 可达。将 `deploy/ec2/Caddyfile` 中的站点块添加到 `/etc/caddy/Caddyfile`。如果机器已有 CRM 配置，应合并站点块，不能覆盖整个文件。

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo journalctl -u caddy -n 80 --no-pager
curl -I https://www.alemaxglobal.com/en
curl -I https://alemaxglobal.com/en
```

Caddy 以域名为站点地址时可自动管理 HTTPS，前提是 DNS、端口与证书验证条件满足。参见 [自动 HTTPS](https://caddyserver.com/docs/automatic-https)。当前配置不自动修改 DNS 或创建 AWS 资源。

上线后实际验证：后台登录、发布内容、图片加载、EN/ES 切换、Cookie 弹窗、询盘邮件、DeepL 翻译。SMTP 外联或邮件服务商限制需要单独核对。

## 7. SSM 与 GitHub OIDC 自动部署

1. 给 EC2 绑定具有 `AmazonSSMManagedInstanceCore` 的实例角色，确认 SSM Agent 已启动且实例在当前区域在线。不要同时安装 Snap 和 deb 两套 Agent。
2. IAM 创建或复用 GitHub OIDC Provider，URL 为 `https://token.actions.githubusercontent.com`，Audience 为 `sts.amazonaws.com`。
3. 用 `deploy/ec2/iam-trust-policy.json` 创建 GitHub 部署角色，替换账号 ID 和 **实际 main 分支 subject**。
4. 用 `iam-deploy-policy.json` 替换区域、账号和实例 ID，授予该角色向单个实例执行 `AWS-RunShellScript` 及读取结果的权限。
5. 仓库 Actions secrets 添加 `AWS_REGION`、`AWS_ROLE_ARN`、`EC2_INSTANCE_ID`。无需长期 AWS Access Key。
6. 手动首次部署成功后，添加 Repository variable `EC2_DEPLOY_ENABLED=true`，才会启用 main 的 push 和手动部署。

工作流固定为 `/opt/alemax-official-v2`、Git 操作用户 `ubuntu`。如果路径或用户不同，先修改工作流。

OIDC subject 不能复制 CRM 的 ID。传统格式是 `repo:xwenc/alemax-official-v2:ref:refs/heads/main`，启用不可变 subject 的仓库则包含 owner/repo 数字 ID。必须以当前仓库实际声明为准。仓库增加 GitHub Environment 后 subject 也会改变。模板故意保留占位符，不能原样提交为 IAM 策略。[GitHub 官方说明](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)

工作流使用固定提交的 AWS 凭证 Action，通过 SSM 下发命令，验证工作树干净、获取 main 并检查目标 SHA 属于 main 历史，检出本次 SHA，运行部署脚本，轮询命令到成功或失败。SSM 默认 root 执行，Git 操作显式切回 ubuntu 使用其 Deploy Key。

本工作流没有 CI 测试阶段、自动回滚或零停机保证；启用前应在提交端或另建 CI 跑项目测试。重跑旧的 main 工作流可能部署旧提交，操作前确认 SHA。部署超时后 SSM 命令可能仍运行，应先检查原命令，不要重复提交。

## 8. 备份与恢复

在部署间隙执行（会短暂停止官网 web、api、worker，数据库保持运行）：

```bash
sudo bash deploy/ec2/backup.sh
```

生成 `backups/<UTC时间>/database.sql.gz`、`uploads.tar.gz`、代码 SHA 和 SHA256 校验文件。备份不包含环境密钥，需单独安全保存 `.env.ec2`。将备份复制到异机或受控 S3 桶，配置保留策略并实际测试恢复；命名 volume 不是备份。脚本不会自动上传 S3、删除旧备份或创建定时任务。

恢复必须在已确认的目标环境操作；下面命令会覆盖同名记录和上传文件，先保留当前备份。在项目目录设置 `BACKUP_DIR` 为实际备份目录：

```bash
BACKUP_DIR=/opt/alemax-official-v2/backups/替换为备份时间
(cd "$BACKUP_DIR" && sha256sum -c SHA256SUMS)
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml stop web worker api
gzip -dc "$BACKUP_DIR/database.sql.gz" | sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml exec -T db sh -c \
  'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE"'
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml run --rm --no-deps -T --entrypoint tar api \
  -C /app/uploads -xzf - < "$BACKUP_DIR/uploads.tar.gz"
sudo docker compose --env-file .env.ec2 -f compose.ec2.yaml start api worker web
```

在干净目标数据库/上传 volume 上恢复最可靠；向非空库导入不会删除备份中不存在的新增表，上传解压也不会删除多余文件。恢复后重新运行健康检查并验证图片和内容。不要使用 `docker compose down -v`，它会删除数据卷。

## 9. 更新、回滚与排错

- 更新代码：由 GitHub 工作流部署，或人工确认目标提交后运行部署脚本；不要在生产目录盲目 `reset --hard`。
- 回滚优先在 GitHub revert 问题提交再部署。旧代码不自动回滚数据库，必须先检查结构兼容并保留备份。不要清理所有旧镜像或 volumes。
- Caddy 502：检查 loopback 3100、web 日志和容器健康状态。
- API 出错：查看 `api` 日志；翻译请求详情查看 `worker` 日志。
- 图片 404：检查上传 volume、图片 URL 和对应语言是否已发布。
- 数据库初始化失败：检查独立 hex 密码、磁盘和 db 日志。已有 MySQL volume 不会随环境变量修改自动改密码。
- 构建内存不足：调整实例/可用内存，避免 CRM 与官网并行构建；部署先构建镜像不会使单机部署变成零停机。
- OIDC 拒绝：核对 provider、aud、实际 sub 和分支；SSM 拒绝：核对区域、实例 ARN、实例角色与 Agent。
- 日志中禁止输出完整 Compose config、密钥或翻译正文。`validate-env.py` 只显示字段名和验证结果。

## 官方参考

- [AWS SSM 实例角色](https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-instance-permissions.html)
- [AWS SSM SendCommand](https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_SendCommand.html)
- [Docker Ubuntu 安装](https://docs.docker.com/engine/install/ubuntu/)
- [Caddy 配置反向代理](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [GitHub OIDC 与 AWS](https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws)

## 本地验证范围

本部署包已完成 Compose 配置解析、Shell 与工作流脚本语法检查、IAM JSON/YAML 解析、4 项生产配置检查测试，以及官方 Caddy 容器中的配置验证。未连接 AWS，未进行真实 EC2 构建、证书申请、邮件投递或恢复演练；这些需按本文在目标环境验收。

可重复执行的本地检查：

```bash
docker compose --env-file deploy/ec2/ec2.env.example -f compose.ec2.yaml config --quiet
bash -n deploy/ec2/deploy.sh deploy/ec2/backup.sh
python3 -m unittest discover -s deploy/ec2 -p 'test_*.py'
```
