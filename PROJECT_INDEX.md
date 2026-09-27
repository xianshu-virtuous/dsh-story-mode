# dsh-story-mode — 项目索引

## 项目定位
DeepSeek Harness 外部插件：给深深加「剧情模式」开关（WebUI 设置页按钮 + `story_mode` 工具 on/off/status）。开启后以当前人格身份进入剧情扮演，并把会话工作区 `story/` 下的 `.md` / `.txt` 文档作为场景与须知注入 system prompt；关闭即恢复，无需重启。

## 权威版本
- `package.json`：`name` = `@dsh-external/dsh-story-mode`，`version` = `0.1.1`
- 入口：`main` = `lib/index.js`；`exports` 含 `./client`（`lib/client.js`）、`./invariant`（`lib/invariant.js`）
- 包管理器：pnpm（存在 `pnpm-lock.yaml`）
- 源码结构：`src/index.ts`、`src/invariant.ts`、`src/story-store.ts`、`src/shared/directive.ts`、`src/client/`（`index.ts` + `StoryModeSettingsSection.tsx`）
- 测试：`tests/directive.spec.ts`、`tests/story-store.spec.ts`

## 活动里程碑
- **非 git 仓库，无提交历史**（目录下无 `.git`；`git log` / `git status` 均报 `not a git repository`），因此无法提供提交级里程碑。本仓库亦无 `.gitignore`。

## 主要阻塞与风险
- 无版本控制：缺少提交历史与回滚点，改动无法追溯；如需版本化需由主人明确授权后另行处理（本次未初始化）。
- 仓库内不存在 `story/` 目录：剧情文档由使用方放在**会话工作区**（会话 cwd）的 `story/` 下，不是插件仓库内容；不要把它当成仓库资产。
- 用户数据风险：开关状态在 `$DSH_HOME/plugins/dsh-story-mode/state.json`（仓库之外），公开仓库不得包含该文件。
- 仓库内无 `.gitignore`（已核验），`node_modules/`、`lib/` 均存在于工作目录中。

## 最后核验日期
2026-09-24（本次核验基于 `README.md`、`package.json`、目录清单与 `git status` 只读探测，未运行构建或测试）

## 专题文档
- 仓库规则（自动注入）：`AGENTS.md`
- 使用、配置与工具说明：`README.md`
- 动态上下文：`docs/context/`（本仓库当前尚未创建该目录，按需建立 NOW / MAP / RUNBOOK / DECISIONS / RISKS；旧内容进 `history/`）
