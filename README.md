# OneTHU-plugin-hello

OneTHU 插件市场收录的示例插件：**插件特性全景展示**（v2.0），亦是新插件的开发模板。

## 特性覆盖

| 特性 | 对应入口 |
|---|---|
| 命令 + 结构化结果（markdown/items/kv） | 管理页命令「结构化结果演示」 |
| 确认弹窗（含 danger 红样式） | 命令「危险确认演示」/ 功能页按钮 |
| 通用表单弹窗（text/select/textarea） | 命令「定制问候（表单演示）」 |
| 剪贴板写入 | 命令「复制问候语」/ 功能页按钮 |
| 自建功能页（tab）+ 自由 DOM 渲染 | 侧栏「Hello」入口 |
| 全局 CSS 注入（`[data-plg]` 作用域规约） | `registerCss` |
| 原子化收藏（万物原子化体系） | 功能页「收藏当前计数」→ 收藏夹出现卡片 |
| OH 联动（反向被调） | 对 OH 说「用 Hello 插件打个招呼」→ `run_plugin_cmd` |
| OH 联动（正向调用） | 命令「问 OH 一句话」→ `plugins.call("onethu.harness","chat")` |

## 文件

- `plugin.js`：插件本体（单文件 ES 模块：`manifest` 导出 + 默认导出激活函数），分节注释对应各特性
- `test.mjs`：离线测试（mock 宿主 ctx，32 断言），`node test.mjs` 直跑

## 安装

OneTHU → 插件 → 安装面板「GitHub 仓库」输入 `smartThise/OneTHU-plugin-hello`。
（从 1.x 升级：管理页 Hello 卡片出现更新按钮，覆盖安装即可）

开发文档见 OneTHU 主仓库 `docs/plugin-development.md`（§6 UI 通道与结构化结果、§6.3 自建功能页、§6.4 原子化收藏、§9.4 OH 联动）。
