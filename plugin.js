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
  version: "2.1.1",
  description:
    "特性全景示例：结构化结果、确认/表单弹窗、剪贴板、自建功能页、全局 CSS、原子化收藏、桌面小组件、系统通知、OH 双向联动。可作为开发模板。",
  repo: "https://github.com/smartThise/OneTHU-plugin-hello",
  // ui=弹窗/表单/剪贴板写/收藏/tab；css=注入全局样式（安装确认重点说明）；
  // storage=计数状态持久化；plugins:call=正向调 OH（ask-oh 命令）；
  // widget=声明桌面小组件（Android）；notify=发系统通知（三端）
  permissions: ["user:read", "ui", "css", "storage", "plugins:call", "widget", "notify"],
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

  /* ────────── ③ 桌面小组件（Android）：声明「显示什么」，渲染由宿主与原生完成 ──────────
     插件代码在桌面上跑不起来（小组件由 AppWidgetHolder 在独立进程渲染，没有 WebView 与
     会话），所以这里只能声明。宿主预留 3 个槽位，按声明顺序占位；用户把「OneTHU 插件
     小组件 1」放到桌面即可看到本卡片。rows 里的 { atom } 会走上面注册的原子解析。 */
  ctx.registerWidget({
    id: "streak",
    title: `Hello 计数 ${count}`,
    rows: [
      { atom: `main~count:${count}` },              // 原子行：宿主解析出标题与说明
      { text: "特性全景示例", sub: "来自 Hello 插件" },  // 字面行
    ],
    target: PAGE_KEY,                                // 点击回本插件功能页
  });

  /* ────────── ④ 自建功能页（tab）：侧栏出现「Hello」入口，容器内全权渲染 ────────── */
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
      const yes = await ctx.onethu.ui.confirm(
        "这是一个应用内确认弹窗（Promise 化）。\n危险操作可传 {danger: true} 换红色样式，并用 {title, confirmText} 自定标题与确认按钮。",
        { danger: false },
      );
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

  // 系统通知（三端）：排一条 10 秒后的通知，顺带演示结构化结果
  ctx.registerCommand({ id: "notify-me", title: "发一条系统通知（10 秒后）" }, async () => {
    const r = await ctx.onethu.notify.send({
      title: "Hello 通知",
      body: `当前计数 ${count}`,
      afterSeconds: 10,
      key: "demo",                 // 同 key 覆盖同一条，重复点不会堆一堆
      page: PAGE_KEY,              // 点击回到本插件功能页
    });
    if (!r.ok) {
      // 失败时顺手查状态并请求授权（用户点这个命令就是明确意图，弹系统框不唐突）
      const st = await ctx.onethu.notify.status(true);
      return {
        text: `发送失败：${r.reason ?? "未知原因"}`,
        kv: [
          { k: "平台后端", v: st.backend },
          { k: "已授权", v: st.granted ? "是" : "否" },
        ],
      };
    }
    return {
      text: "已排程，约 10 秒后弹出系统通知",
      items: [
        { title: "通知 id", subtitle: r.id, meta: "同 key 重复发送会覆盖" },
        { title: "点击通知", subtitle: `会回到 ${PAGE_KEY}`, meta: "落点深链" },
      ],
      kv: [{ k: "平台", v: (await ctx.onethu.notify.status()).backend }],
    };
  });

  // 桌面小组件槽位查询：告诉用户该把哪个「OneTHU 插件小组件 N」放到桌面
  ctx.registerCommand({ id: "widget-slot", title: "我的小组件占哪个槽位" }, async () => {
    const mine = ctx.onethu.widget.list();
    const total = ctx.onethu.widget.slots();
    if (!mine.length) return "本插件没有声明小组件";
    const occupied = mine.filter((w) => w.slot);
    return {
      text: `共 ${total} 个槽位，本插件占用 ${occupied.length} 个`,
      items: mine.map((w) => ({
        title: w.title,
        subtitle: w.slot ? `放到桌面：「OneTHU 插件小组件 ${w.slot}」` : "未占槽位（槽位被更早的插件占满）",
        meta: `id ${w.id}`,
      })),
    };
  });

  // 确认弹窗（danger 样式演示）
  ctx.registerCommand({ id: "confirm-danger", title: "危险确认演示" }, async () => {
    // 危险样式建议显式给 title / confirmText：宿主的兜底文案是「此操作不可撤销，请确认
    // / 确认执行」，写死场景措辞会让不同场景串味（宿主侧 R21c 实录：忽略作业弹窗曾整屏
    // 显示退选文案）。
    const yes = await ctx.onethu.ui.confirm("这会清空 Hello 的计数，确定？", {
      danger: true,
      title: "清空计数，请确认！",
      confirmText: "确认清空",
    });
    if (yes) {
      count = 0;
      ctx.onethu.storage.set("count", "0");
      return "计数已清零";
    }
    return "已取消";
  });
}
