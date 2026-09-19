/**
 * Hello 示例插件 2.0 —— OneTHU 插件特性全景展示
 *
 * 覆盖：命令与结构化结果 / 确认与表单弹窗 / 剪贴板 / 自建功能页（tab）/
 * 全局 CSS / 原子化收藏 / OH 双向联动（被 OH 调用 ↔ 调用 OH）。
 * 可直接作为新插件的开发模板：删掉不需要的段落即可。
 */

export const manifest = {
  id: "onethu.example.hello",
  name: "Hello 示例插件",
  version: "2.0.3",
  description:
    "特性全景示例：结构化结果、确认/表单弹窗、剪贴板、自建功能页、全局 CSS、原子化收藏、OH 双向联动。可作为开发模板。",
  repo: "https://github.com/smartThise/OneTHU-plugin-hello",
  // ui=弹窗/表单/剪贴板写/收藏/tab；css=注入全局样式（安装确认重点说明）；
  // storage=计数状态持久化；plugins:call=正向调 OH（ask-oh 命令）
  permissions: ["user:read", "ui", "css", "storage", "plugins:call"],
};

const TAB_ID = "main";
const PAGE_KEY = `plugin:${manifest.id}:${TAB_ID}`;

/** 计数状态：模块级变量，激活时从插件私有 storage 恢复（宿主 ctx 上没有约定字段） */
let count = 0;

export default async function activate(ctx) {
  count = Number(ctx.onethu.storage.get("count") ?? 0);

  /* ────────── ① 全局 CSS（天马行空的样式；作用域规约 [data-plg="<id>"]） ────────── */
  ctx.registerCss(`
    [data-plg="${manifest.id}"] .hello-card {
      border: 1px solid var(--border); border-radius: 12px;
      padding: 14px 16px; background: var(--surface);
      display: flex; flex-direction: column; gap: 10px; max-width: 520px;
    }
    [data-plg="${manifest.id}"] .hello-title { font-size: 15px; font-weight: 700; }
    [data-plg="${manifest.id}"] .hello-streak { font-size: 28px; font-weight: 800; color: #e8543f; }
    [data-plg="${manifest.id}"] .hello-row { display: flex; gap: 8px; flex-wrap: wrap; }
    [data-plg="${manifest.id}"] .hello-hint { font-size: 11px; color: var(--text-3); line-height: 1.6; }
  `);

  /* ────────── ② 原子化收藏：注册原子种类，让插件结果可收进用户收藏夹 ──────────
     key 约定 "<tabId>~<原子key>"：点击收藏卡片可深链回对应 tab。 */
  ctx.registerAtom({
    group: "Hello 示例",
    resolve: (key) => {
      // 形如 "main~count:3"
      const m = /^main~count:(\d+)$/.exec(key);
      if (!m) return null; // 返回 null = 原子已失效（收藏夹降级显示）
      return { title: `Hello 计数 ${m[1]}`, sub: "来自 Hello 示例插件" };
    },
  });

  /* ────────── ③ 自建功能页（tab）：侧栏出现「Hello」入口，容器内全权渲染 ────────── */
  ctx.registerTab({
    id: TAB_ID,
    title: "Hello",
    iconSvg: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="8" cy="8" r="6.2"/><path d="M5.5 8h5M8 5.5v5"/></svg>',
  });

  ctx.onethu.ui.onTabReady(PAGE_KEY, (root) => {
    // 容器可能多次就绪（页面重建）——渲染写成幂等：先清空再挂
    root.innerHTML = "";
    root.dataset.plg = manifest.id;
    const n = count;
    root.innerHTML = `
      <div class="hello-card">
        <div class="hello-title">Hello 特性全景</div>
        <div class="hello-streak">${n}</div>
        <div class="hello-row">
          <button class="btn btn-primary" data-act="inc">点我 +1</button>
          <button class="btn btn-ghost" data-act="fav">收藏当前计数</button>
          <button class="btn btn-ghost" data-act="copy">复制问候</button>
          <button class="btn btn-ghost" data-act="confirm">弹个确认</button>
        </div>
        <div class="hello-hint">
          · 「收藏当前计数」进侧栏收藏夹（万物原子化），点击卡片可深链回本页<br>
          · OH 联动：在左下角对话面板说「用 Hello 插件打个招呼」试试
        </div>
      </div>`;
    root.querySelector('[data-act="inc"]')?.addEventListener("click", async () => {
      count += 1;
      ctx.onethu.storage.set("count", String(count));
      const card = root.querySelector(".hello-card");
      if (card) card.querySelector(".hello-streak").textContent = String(count);
    });
    root.querySelector('[data-act="fav"]')?.addEventListener("click", async () => {
      // 收藏进用户收藏夹：kind 自动补全为本插件；展示元数据走 registerAtom.resolve
      ctx.onethu.favorites.add(`main~count:${count}`);
      ctx.onethu.ui.toast("已收进收藏夹");
    });
    root.querySelector('[data-act="copy"]')?.addEventListener("click", async () => {
      const u = await ctx.onethu.session.username();
      await ctx.onethu.ui.clipboard.write(`Hello, ${u ?? "OneTHU"}!`);
      ctx.onethu.ui.toast("已复制问候语");
    });
    root.querySelector('[data-act="confirm"]')?.addEventListener("click", async () => {
      const yes = await ctx.onethu.ui.confirm("这是一个应用内确认弹窗（Promise 化）。\n危险操作可传 {danger: true} 换红色样式。", { danger: false });
      ctx.onethu.ui.toast(yes ? "你点了确认" : "你取消了");
    });
  });

  /* ────────── ④ 命令区：管理页执行，展示结构化结果与各种弹窗 ────────── */
  ctx.log("Hello 插件已激活（2.0 特性全景）");

  // 保留 1.0 的最小示例
  ctx.registerCommand({ id: "who", title: "我是谁" }, async () => {
    const u = await ctx.onethu.session.username();
    return u ? `你好，${u}` : "尚未登录";
  });

  // 表单弹窗：收集参数 → 确认 → 结构化结果
  ctx.registerCommand({ id: "greet-form", title: "定制问候（表单演示）" }, async () => {
    const f = await ctx.onethu.ui.form("定制问候", [
      { key: "name", label: "称呼", kind: "text", required: true, placeholder: "留空用登录名" },
      { key: "style", label: "风格", kind: "select", required: true, options: [
        { value: "normal", label: "正常" },
        { value: "shout", label: "大声" },
        { value: "poem", label: "中二" },
      ] },
      { key: "note", label: "附言", kind: "textarea", placeholder: "可选" },
    ]);
    if (!f) return "已取消";
    const name = f.name?.trim() || (await ctx.onethu.session.username()) || "OneTHU";
    const lines = {
      normal: `你好，${name}！`,
      shout: `你好呀——${name.toUpperCase()}！！！`,
      poem: `星辰为证，${name}，今日也请多指教。`,
    };
    const text = lines[f.style] ?? lines.normal;
    const ok = await ctx.onethu.ui.confirm(`发送这条问候？\n\n${text}`, { danger: false });
    if (!ok) return "已取消";
    return {
      text: "问候已生成",
      markdown: `> ${text}${f.note ? `\n>\n> 附言：${f.note}` : ""}`,
      kv: [{ k: "称呼", v: name }, { k: "风格", v: f.style }],
    };
  });

  // 结构化结果：markdown 表格 + 条目列表 + 键值对（管理页结果区渲染）
  ctx.registerCommand({ id: "showcase", title: "结构化结果演示" }, async () => {
    return {
      text: "四类区块一次看全",
      markdown: "| 区块 | 说明 |\n|---|---|\n| text | 顶部摘要行 |\n| markdown | GFM 表格/代码块 |\n| items | 条目卡片 |\n| kv | 键值汇总 |",
      items: [
        { title: "表格", subtitle: "markdown 区块", meta: "支持 GFM 语法" },
        { title: "条目卡片", subtitle: "items 区块", meta: "title 必填，subtitle/meta 可选" },
      ],
      kv: [{ k: "插件版本", v: manifest.version }, { k: "当前计数", v: String(count) }],
    };
  });

  // OH 联动（正向）：插件调用 OH 对话（onethu.plugins.call 走宿主门禁）
  ctx.registerCommand({ id: "ask-oh", title: "问 OH 一句话", inputLabel: "想问 OH 什么？" }, async (input) => {
    const q = String(input ?? "").trim() || "用一句话介绍你自己";
    try {
      const r = await ctx.onethu.plugins.call("onethu.harness", "chat", q);
      const ans = r?.answer ?? JSON.stringify(r).slice(0, 200);
      return { text: "OH 回答：", markdown: ans };
    } catch (e) {
      return `调用失败：${String(e instanceof Error ? e.message : e).slice(0, 160)}\n（OH 需已配置模型源）`;
    }
  });

  // OH 联动（反向）：本命令会被 OH 的 list_plugin_cmds 发现，
  // 对 OH 说「用 Hello 插件打个招呼」即可触发 run_plugin_cmd 调到这里。
  ctx.registerCommand({ id: "hello-oh", title: "向 OH 打招呼（供 OH 联动调用）" }, async () => {
    const u = await ctx.onethu.session.username();
    return `Hello from 插件！${u ? `你好，${u}。` : ""}我是经 OH 的 run_plugin_cmd 被调用的。`;
  });

  // 剪贴板写（ui 权限）
  ctx.registerCommand({ id: "copy-greet", title: "复制问候语" }, async () => {
    const u = await ctx.onethu.session.username();
    await ctx.onethu.ui.clipboard.write(`Hello, ${u ?? "OneTHU"}!`);
    return "已复制到剪贴板";
  });

  // 确认弹窗（danger 样式演示）
  ctx.registerCommand({ id: "confirm-danger", title: "危险确认演示" }, async () => {
    const yes = await ctx.onethu.ui.confirm("这会清空 Hello 的计数，确定？", { danger: true });
    if (yes) {
      count = 0;
      ctx.onethu.storage.set("count", "0");
      return "计数已清零";
    }
    return "已取消";
  });
}
