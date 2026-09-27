# dsh-story-mode — 项目索引

> 最后核验日期：**2026-09-27**（`pnpm run typecheck` / `pnpm test` 14 用例全绿；已公开推送）

## 项目定位

DeepSeek Harness 外部插件：给深深加「剧情模式」开关（WebUI 设置页按钮 + `story_mode` 工具 on/off/status）。开启后以当前人格身份进入剧情扮演，并把会话工作区 `story/` 下的 `.md` / `.txt` 文档作为场景与须知注入 system prompt；关闭即恢复，无需重启。

## 权威版本

- `package.json#name` = `@dsh-external/dsh-story-mode`，`version` = **0.1.1**，license MIT
- **远端**：<https://github.com/xianshu-virtuous/dsh-story-mode>（public；topics：`dsh-plugin` `deepseek-harness`）
- 入口：`main` = `lib/index.js`；`exports` 含 `./client`（`lib/client.js`）、`./invariant`（`lib/invariant.js`）
- 包管理器：pnpm（`pnpm-lock.yaml`）
- 源码结构：`src/index.ts`、`src/invariant.ts`、`src/story-store.ts`、`src/shared/directive.ts`、`src/client/`（`index.ts` + `StoryModeSettingsSection.tsx`）
- 测试：`tests/directive.spec.ts`、`tests/story-store.spec.ts`（14 用例，vitest）

## 活动里程碑

- `2026-09-27` — 首次纳入版本控制并按模块分组提交（11 个提交：scaffold → host 四个模块 → client → 两个测试 → lib → docs → lock），同日公开推送。
- `2026-09-27` — 达标修复：新增 `.gitignore`、**移除安装期 `prepare`**。
- 收录推进：收录 PR 待提（awesome 列表要求仓库创建满 1 天），素材见工作区 `docs/context/awesome-submission/`。

## 主要阻塞与风险

- **用户数据**：开关状态在 `$DSH_HOME/plugins/dsh-story-mode/state.json`（仓库之外），公开仓库不得包含该文件。
- **仓库内不存在 `story/` 目录**：剧情文档由使用方放在**会话工作区**（会话 cwd）的 `story/` 下，不是插件仓库内容；插件只读取、不写回。
- `storyDir` 相对路径相对会话工作区解析，也支持绝对路径；文档总字符数超过 `maxChars`（默认 12000）时按文件名顺序截断。
- 状态文件缺失或损坏时按默认关闭处理，不能让 Harness 启动失败。
- **`lib/` 是已跟踪的构建产物**：改 `src/` 后必须 `pnpm run build` 再提交。
- **不得声明安装期生命周期脚本**（`prepare` / `postinstall`）：pnpm 10+ 会拦截依赖的构建脚本（需 `allowBuilds`）而使 `dsh plugin add` 失败，插件市场也据此判为不可安装。

## 专题文档

- 仓库规则（自动注入）：`AGENTS.md`
- 使用、配置与工具说明：`README.md`
- 动态上下文：`docs/context/`（尚未创建，按需建立 NOW / MAP / RUNBOOK / DECISIONS / RISKS；旧内容进 `history/`）
