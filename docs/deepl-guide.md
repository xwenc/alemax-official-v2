# DeepL 配置与故障排查

本文整理本项目英语 → 西语自动翻译过程中遇到的配置、术语表、请求格式与日志问题。

## 1. 基础配置

需要 DeepL **API 账户和 API Key**。网页翻译器账户的订阅与 API 服务需要区分，申请入口见 [DeepL Developers](https://www.deepl.com/en/developers)。

```dotenv
DEEPL_API_KEY=填写自己的API密钥
DEEPL_API_URL=https://api-free.deepl.com/v2/translate
DEEPL_GLOSSARY_ID=
```

- API Free 使用 `https://api-free.deepl.com`；API Pro 使用 `https://api.deepl.com`。按自己的 API 套餐选择，本文命令使用 Free 地址。
- `DEEPL_GLOSSARY_ID` 是可选项，没有术语表时保持为空，普通翻译仍可工作。
- 本地开发读取 `.env`，再读取 `.env.development.local`；后者覆盖前者，已有进程环境变量优先。
- 修改配置后重启 API 和翻译 worker。已运行进程不会自动读取新的环境文件。
- 密钥只放在服务器环境配置中，不写入前端代码、文档、截图或 Git。若已在截图中暴露，应撤销并生成新密钥。

## 2. 终端中的 API Key

项目环境文件不会自动变成当前终端的环境变量。如果命令使用 `$DEEPL_API_KEY`，需要先在当前终端设置它。

macOS 默认 zsh：

```bash
read -s "DEEPL_API_KEY?请输入 DeepL API Key: "
echo
export DEEPL_API_KEY
```

不要将真实密钥粘贴到聊天或公开日志中。完成后可执行：

```bash
unset DEEPL_API_KEY
```

若返回以下错误，通常是当前终端变量为空：

```text
Authorization header is missing API key.
Add API key after scheme 'DeepL-Auth-Key'.
```

正确的请求头格式是：

```text
Authorization: DeepL-Auth-Key <自己的API密钥>
```

## 3. 获取正确的 glossary_id

`glossary_id` 是 DeepL 创建术语表后返回的 ID，不能自己编造 UUID，也不是 API Key。术语表必须对当前 API Key 可用。

### 查询现有术语表

```bash
curl https://api-free.deepl.com/v3/glossaries \
  -H "Authorization: DeepL-Auth-Key $DEEPL_API_KEY"
```

若返回 `{"glossaries":[]}`，需要先创建术语表。

### 创建包含 EN → ES 词典的术语表

```bash
curl -X POST https://api-free.deepl.com/v3/glossaries \
  -H "Authorization: DeepL-Auth-Key $DEEPL_API_KEY" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "name": "ALEMAX English-Spanish",
    "dictionaries": [{
      "source_lang": "en",
      "target_lang": "es",
      "entries": "Calcium Stearate\tEstearato de calcio\nPotassium Sorbate\tSorbato de potasio",
      "entries_format": "tsv"
    }]
  }'
```

从成功响应中复制 `glossary_id`，写入实际使用的环境文件：

```dotenv
DEEPL_GLOSSARY_ID=返回的glossary_id
```

随后重启 API 和 worker。

### 查询指定术语表的词典方向

先设置自己的真实术语表 ID：

```bash
export DEEPL_GLOSSARY_ID='替换为自己的术语表ID'

curl "https://api-free.deepl.com/v3/glossaries/$DEEPL_GLOSSARY_ID" \
  -H "Authorization: DeepL-Auth-Key $DEEPL_API_KEY"
```

检查响应的 `dictionaries`，本项目需要包含 `source_lang: en`、`target_lang: es`。只有术语表 ID 存在还不够。

## 4. 为现有术语表添加 EN → ES 词典

```bash
curl -X PUT \
  "https://api-free.deepl.com/v3/glossaries/$DEEPL_GLOSSARY_ID/dictionaries" \
  -H "Authorization: DeepL-Auth-Key $DEEPL_API_KEY" \
  -H "Content-Type: application/json" \
  --data-raw '{
    "source_lang": "en",
    "target_lang": "es",
    "entries": "Calcium Stearate\tEstearato de calcio\nSilicon Dioxide\tDióxido de silicio\nPotassium Sorbate\tSorbato de potasio",
    "entries_format": "tsv"
  }'
```

此 `PUT` 请求会创建该语言方向的词典；若 EN → ES 词典已存在，则整体替换该方向的条目。执行前确认已包含需要保留的术语。其他语言方向的词典不受此请求替换。

如果只是更新 DeepL 上的词典，项目使用的 ID 没变，无需重启服务，回后台点击 **Retry translation** 即可。

## 5. entries 如何填写

`entries` 是术语对字符串，不是整个页面的正文。每行一组“源术语 → 目标译法”，无需表头。

### CSV

`entries_format` 设置为 `csv`，最简单的 `entries` 内容是：

```text
Hello,Hola
```

对应 JSON：

```json
{
  "source_lang": "en",
  "target_lang": "es",
  "entries": "Hello,Hola",
  "entries_format": "csv"
}
```

这是适合排查输入格式问题的最小示例。含逗号、双引号的术语需要遵循 CSV 引号规则。

### TSV

`entries_format` 设置为 `tsv`。英文与西语之间使用真正的 Tab，不是空格；不同条目用换行分隔。

下面的示例包含实际 Tab：

```text
Hello	Hola
Calcium Stearate	Estearato de calcio
```

对应 JSON 请求体：

```json
{
  "source_lang": "en",
  "target_lang": "es",
  "entries": "Hello\tHola\nCalcium Stearate\tEstearato de calcio",
  "entries_format": "tsv"
}
```

注意语言方向：`Hello → Hola` 是英语 → 西语，`Hello → Guten Tag` 的目标是德语，不适用于本项目的西语术语。

## 6. 为什么输入框中的 \t 变成了 \\t

需要区分普通表单字段和原始 JSON 编辑器：

| 输入位置 | 应输入的内容 | 序列化结果 |
| --- | --- | --- |
| 普通 `entries` 表单字段 | `Hello`、真正的 Tab、`Hola` | JSON 显示 `"Hello\tHola"` |
| 原始 JSON 请求体 | `"entries": "Hello\tHola"` | JSON 解析后得到真正的 Tab |
| 普通字段中手动键入反斜杠和字母 t | 字面文本 `Hello\tHola` | JSON 显示 `"Hello\\tHola"`，解析后仍是反斜杠和 t |

普通输入框中的字面 `\t` 会被 JSON 序列化再次转义，形成 `\\t`。这不是 TSV 分隔符，因此可能返回 **Invalid entries**。

在普通输入框中可以粘贴真正的 Tab；直接按 Tab 键往往会切换焦点。若网页会把 Tab 转为空格，使用原始 JSON 或本文的终端命令。终端命令中单引号包围 JSON，`\t` 原样传给 JSON 解析器，由解析器转换为 Tab。

## 7. 本项目翻译 payload 的含义

```python
payload = {
    'text': [protect(obj[key]) for obj, key in items],
    'source_lang': 'EN',
    'target_lang': 'ES',
    'tag_handling': 'xml',
    'ignore_tags': ['keep'],
    'preserve_formatting': True,
}
if settings.deepl_glossary_id:
    payload['glossary_id'] = settings.deepl_glossary_id
```

- `source_lang` 和 `target_lang` 指定本次翻译方向。
- `protect()` 与 XML 的 `keep` 标签保护品牌、编号、化学式等内容。
- `glossary_id` 只选择已有术语表，**不会创建词典或添加 EN → ES 方向**。
- 本项目还包含少量内置术语映射，不配置 DeepL 术语表也可翻译。

## 8. 常见错误与处理

| 错误 | 含义与排查 |
| --- | --- |
| 缺少 API Key | 检查终端变量或 API、worker 的运行环境；不是只检查文件里有没有写 |
| HTTP 404 | 本次曾因配置的术语表不存在于当前账号中而出现；先查询 ID，若未配置术语表则检查请求地址和代理 |
| HTTP 400：No dictionary found for language pair EN-ES | ID 有效，但该术语表缺少 EN → ES 词典；使用第 4 节添加 |
| HTTP 400：Invalid entries | 检查 `entries_format` 与内容是否一致，是否误填整个 JSON，是否将 Tab 写成字面 `\t`，是否有空条目 |
| 泛化的 Check credentials/quota and retry | 旧版本统一错误提示，不代表已经确定是密钥或额度问题；需结合具体状态和参数定位 |

本次排查中曾确认：密钥有效但术语表不存在会导致 404；后来术语表存在但没有 EN → ES 词典，DeepL 明确返回 400。不要把所有失败都当作额度不足。

项目已增加针对部分 400、404 的配置提示，但带术语表的所有 400 不一定都是语言对问题，仍需结合实际配置排查。

## 9. 为什么服务器看不到 print

翻译在独立的 **worker** 中运行，API 进程只负责提交任务。翻译函数里的输出应在 worker 日志中查看，而不是仅查看 API 日志。

此外：

- 请求日志只有实际处理翻译任务时才输出，worker 空闲时不会触发该行。
- worker 修改代码后需要重启；API 的热重载不代表 worker 同时热重载。
- Python 在容器中可能缓冲标准输出。本项目镜像已设置 `PYTHONUNBUFFERED=1`，worker 使用 `logging` 输出启动、请求计数和响应状态。
- 日志占位符数量要与参数一致，例如三个 `%s/%d` 对应三个参数。不要额外传入整个 `payload`，否则会发生日志格式错误，并可能暴露正文。
- 不记录 API Key、Authorization 请求头或完整翻译正文。

Docker 更新并查看 worker 日志：

```bash
docker compose up -d --build worker
docker compose logs -f worker
```

若同时修改了 API 环境配置：

```bash
docker compose up -d --build api worker
```

本地开发停止原有进程后重新运行：

```bash
npm run dev
```

看到 `Translation worker started; waiting for queued jobs.` 后，在后台点击 **Retry translation**。失败记录不会仅因配置修改而自动变为成功。

## 10. 建议的排查顺序

1. 确认当前终端或 worker 实际加载了 API Key。
2. 确认 API Free / Pro 请求地址与套餐一致。
3. 查询术语表，确认当前 Key 可访问该 ID。
4. 确认词典包含 EN → ES 方向。
5. 用一组 `Hello → Hola` 验证 CSV 或 TSV 格式。
6. 更新服务配置后重启 API、worker。
7. 在后台重试，并查看 worker 日志。
8. 翻译完成后审核西语草稿，再单独发布。

## 官方参考

- [DeepL 开发者入口](https://www.deepl.com/en/developers)
- [管理术语表：创建、查询及更新词典](https://github.com/DeepL/api-docs/blob/main/docs/customize/managing-glossaries.mdx)
- [文本翻译请求参数](https://developers.deepl.com/api-reference/translate/request-translation)
- [认证说明](https://developers.deepl.com/docs/getting-started/auth)
