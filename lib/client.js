window.__ModuleLoader__.load({
	id: "@dsh-external/dsh-story-mode",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0story-css:F:\dsh\dsh-story-mode\src\client\StoryModeSettingsSection.module.css.mjs
		const css = ".YXqywW_section{border:1px solid var(--dsw-alias-border-normal);background:var(--dsw-alias-bg-layer-1);border-radius:8px;gap:16px;width:min(760px,100%);padding:20px;display:grid}.YXqywW_heading{align-items:center;gap:12px;display:flex}.YXqywW_heading h2,.YXqywW_heading p{margin:0}.YXqywW_heading h2{color:var(--dsw-alias-label-primary);font-size:18px;line-height:26px}.YXqywW_heading p{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}.YXqywW_crest{background:var(--dsw-alias-brand-primary);width:42px;height:42px;mask:var(--maid-bow-art) center / contain no-repeat;border-radius:50%;flex:0 0 42px}.YXqywW_actions{justify-content:space-between;align-items:center;gap:12px;display:flex}.YXqywW_meta{color:var(--dsw-alias-label-tertiary);font-size:12px}.YXqywW_docs{border:1px solid var(--dsw-alias-border-normal);background:var(--dsw-alias-bg-layer-2);border-radius:6px;gap:8px;padding:12px 14px;display:grid}.YXqywW_docsHeading{color:var(--dsw-alias-label-primary);justify-content:space-between;align-items:baseline;gap:12px;font-size:13px;font-weight:600;display:flex}.YXqywW_docsHeading small{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400}.YXqywW_docs ul{gap:6px;margin:0;padding:0;list-style:none;display:grid}.YXqywW_docs li{color:var(--dsw-alias-label-secondary);justify-content:space-between;align-items:center;gap:12px;font-size:13px;display:flex}.YXqywW_docs li code,.YXqywW_path code{color:var(--dsw-alias-label-primary);font:12px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace}.YXqywW_docs li span{color:var(--dsw-alias-label-tertiary);font-size:12px}.YXqywW_empty{color:var(--dsw-alias-label-tertiary);margin:0;font-size:13px;line-height:20px}.YXqywW_warn{color:var(--dsw-alias-warning-primary,#b7791f);margin:0;font-size:12px}.YXqywW_path{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px}.YXqywW_error{color:var(--dsw-alias-error-primary);margin:0;font-size:13px}@media (width<=640px){.YXqywW_section{padding:14px}.YXqywW_actions{flex-direction:column;align-items:flex-start}}";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=\"@dsh-external/dsh-story-mode/StoryModeSettingsSection.module.css\"]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@dsh-external/dsh-story-mode";
			tag.dataset.pluginCss = "@dsh-external/dsh-story-mode/StoryModeSettingsSection.module.css";
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var StoryModeSettingsSection_module_css_default = {
			"docs": "YXqywW_docs",
			"section": "YXqywW_section",
			"crest": "YXqywW_crest",
			"warn": "YXqywW_warn",
			"error": "YXqywW_error",
			"meta": "YXqywW_meta",
			"path": "YXqywW_path",
			"heading": "YXqywW_heading",
			"empty": "YXqywW_empty",
			"docsHeading": "YXqywW_docsHeading",
			"actions": "YXqywW_actions"
		};
		//#endregion
		//#region src/client/StoryModeSettingsSection.tsx
		const ENDPOINT = "/api/dsh-story-mode/state";
		const IDLE_STATE = {
			enabled: false,
			updatedAt: "",
			storyDir: null,
			documents: [],
			truncated: false,
			loading: true,
			error: null
		};
		/** 剧情模式设置页：显示当前开关状态、切换按钮与已加载的剧情文档清单。 */
		function StoryModeSettingsSection(_props) {
			const [state, setState] = (0, react.useState)(IDLE_STATE);
			const [saving, setSaving] = (0, react.useState)(false);
			const refresh = () => {
				setState((current) => ({
					...current,
					loading: true,
					error: null
				}));
				requestState().then((value) => {
					setState({
						...value,
						loading: false,
						error: null
					});
				}, (reason) => {
					setState((current) => ({
						...current,
						loading: false,
						error: reason instanceof Error ? reason.message : String(reason)
					}));
				});
			};
			(0, react.useEffect)(() => {
				refresh();
				const timer = window.setInterval(refresh, 8e3);
				return () => {
					window.clearInterval(timer);
				};
			}, []);
			const toggle = async (enabled) => {
				setSaving(true);
				try {
					const response = await fetch(ENDPOINT, {
						method: "PUT",
						headers: {
							"content-type": "application/json",
							"x-dsh-story-mode": "1"
						},
						body: JSON.stringify({ enabled })
					});
					const body = await responseBody(response);
					if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : `HTTP ${response.status}`);
					refresh();
				} catch (reason) {
					setState((current) => ({
						...current,
						error: reason instanceof Error ? reason.message : String(reason)
					}));
				} finally {
					setSaving(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: StoryModeSettingsSection_module_css_default.section,
				"data-story-mode-settings": true,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: StoryModeSettingsSection_module_css_default.heading,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: StoryModeSettingsSection_module_css_default.crest,
							"aria-hidden": "true"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("h2", { children: "剧情模式" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", { children: state.loading ? "正在读取状态…" : state.enabled ? "已开启：以当前人格身份进入剧情扮演" : "已关闭：正常对话" })] })]
					}),
					state.error === null ? null : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: StoryModeSettingsSection_module_css_default.error,
						role: "alert",
						children: state.error
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: StoryModeSettingsSection_module_css_default.actions,
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Button, {
							disabled: saving || state.loading,
							onClick: () => {
								toggle(!state.enabled);
							},
							children: saving ? "正在切换…" : state.enabled ? "关闭剧情模式" : "开启剧情模式"
						}), state.enabled && state.updatedAt !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: StoryModeSettingsSection_module_css_default.meta,
							children: ["开启于 ", formatTime(state.updatedAt)]
						}) : null]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: StoryModeSettingsSection_module_css_default.docs,
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: StoryModeSettingsSection_module_css_default.docsHeading,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "剧情文档" }), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("small", { children: "放在工作区 story/ 目录下的 .md / .txt 文件" })]
							}),
							state.documents.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: StoryModeSettingsSection_module_css_default.empty,
								children: "暂无剧情文档。可在当前工作区创建 story/ 目录，放入 scene.md（场景）、rules.md（须知）等文件。"
							}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", { children: state.documents.map((doc) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: doc.name }), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", { children: [doc.chars.toLocaleString(), " 字符"] })] }, doc.name)) }),
							state.truncated ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: StoryModeSettingsSection_module_css_default.warn,
								children: "部分文档因超出注入上限被截断。"
							}) : null,
							state.storyDir !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
								className: StoryModeSettingsSection_module_css_default.path,
								children: ["目录：", /* @__PURE__ */ (0, react_jsx_runtime.jsx)("code", { children: state.storyDir })]
							}) : null
						]
					})
				]
			});
		}
		async function requestState() {
			const response = await fetch(ENDPOINT, { cache: "no-store" });
			const body = await responseBody(response);
			if (!response.ok) throw new Error(typeof body.error === "string" ? body.error : `HTTP ${response.status}`);
			return {
				enabled: body.enabled === true,
				updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : "",
				storyDir: typeof body.storyDir === "string" ? body.storyDir : null,
				documents: Array.isArray(body.documents) ? body.documents.filter((d) => typeof d === "object" && d !== null && typeof d.name === "string" && typeof d.chars === "number").map((d) => ({
					name: d.name,
					chars: d.chars
				})) : [],
				truncated: body.truncated === true,
				loading: false,
				error: null
			};
		}
		async function responseBody(response) {
			const text = await response.text();
			try {
				return JSON.parse(text);
			} catch {
				throw new Error(`剧情模式接口返回了无效响应（HTTP ${response.status}）。`);
			}
		}
		function formatTime(iso) {
			const date = new Date(iso);
			if (Number.isNaN(date.getTime())) return iso;
			return date.toLocaleString("zh-CN", { hour12: false });
		}
		//#endregion
		//#region src/client/index.ts
		const name = "dsh-story-mode-client";
		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "story-mode",
				order: 40,
				label: "剧情模式"
			}, StoryModeSettingsSection));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		exports.name = name;
		return module.exports;
	}
});
