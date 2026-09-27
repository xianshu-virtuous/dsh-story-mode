# DSH Story Mode（剧情模式）

一个 DeepSeek Harness 外部插件，给深深加一个「剧情模式」开关：

- **开关即时生效**：开启后以当前人格（whale-companion 注入的深深人设）为身份进入剧情扮演，关闭后恢复正常对话，**无需重启**。
- **工作区文档即场景**：开启时读取当前会话工作区 `story/` 目录下的 `.md` / `.txt` 文件，作为场景与须知注入 system prompt。
- **双入口控制**：WebUI 设置页新增「剧情模式」页面（按钮开关 + 文档清单），也提供 `story_mode` 工具（on / off / status），模型在对话中即可切换。

## 工作方式

插件注册一个追加 system prompt section（order 15，紧随 whale-companion 人格 section），每次组装时同步读取开关状态：

- 关闭：section 返回空串，不参与组装，对话行为不变。
- 开启：注入 `<story-mode>` 指令，包含「以当前人格身份扮演」的边界规则，以及工作区读取到的全部剧情文档正文（`【文件名】` 分段）。

开关状态持久化在 `$DSH_HOME/plugins/dsh-story-mode/state.json`；剧情文档放在工作区（会话 cwd）下的 `story/` 目录，文件名任意（如 `scene.md` 场景、`rules.md` 须知、`characters.md` 人物卡），按文件名排序注入。文档总字符数超过 `maxChars`（默认 12000）时按顺序截断。

## 配置

在 `cordis.patch.yml` 中可覆盖：

```yaml
- insert:
    - id: dsh-story-mode
      name: '@dsh-external/dsh-story-mode'
      config:
        enabled: true        # 插件总开关，false 完全禁用
        storyDir: story      # 剧情文档目录；相对路径相对会话工作区解析，也支持绝对路径
        maxChars: 12000      # 注入 system prompt 的文档总字符上限
```

## 工具

`story_mode` 工具参数：

- `action: 'on'` — 开启剧情模式（保存状态，下一轮请求即生效）。
- `action: 'off'` — 关闭剧情模式，恢复正常对话。
- `action: 'status'` — 查询当前状态与已加载文档清单（不含正文，省 token）。

## 安装

```powershell
pnpm install
pnpm run typecheck
pnpm test
pnpm run build
dsh plugin --profile web add F:\dsh\dsh-story-mode
```

然后重新启动 `dsh web`。设置页路径：设置 → 剧情模式。

## 与 whale-companion 的关系

本插件只注入「扮演指令 + 场景文档」，不包含人格文本，也不覆盖任何 system prompt。身份仍由 whale-companion 的深深人设提供；剧情模式只决定「以该人格身份进入扮演、场景是什么」。两个插件可独立安装使用。
