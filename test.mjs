/**
 * Hello 插件离线测试：mock 宿主 ctx，验证特性注册齐全 + 命令可跑。
 * 跑法：node test.mjs
 */
import { manifest, default as activate } from "./plugin.js";

let pass = 0, fail = 0;
const eq = (name, a, b) => {
  if (JSON.stringify(a) === JSON.stringify(b)) pass++;
  else { fail++; console.error(`✗ ${name}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`); }
};

/* ── mock 宿主 ── */
const storeMap = new Map();
const registered = { commands: new Map(), tabs: [], css: [], atoms: [] };
const calls = [];
const ctx = {
  registerCommand: (cmd, run) => registered.commands.set(cmd.id, { cmd, run }),
  registerTab: (t) => registered.tabs.push(t),
  registerCss: (css) => registered.css.push(css),
  registerAtom: (def) => registered.atoms.push(def),
  log: () => {},
  onethu: {
    session: { username: async () => "测试同学" },
    ui: {
      toast: (m) => calls.push(["toast", m]),
      confirm: async (m) => { calls.push(["confirm", m]); return true; },
      form: async (t, fields) => { calls.push(["form", t]); return { name: "小明", style: "poem", note: "" }; },
      clipboard: { write: async (t) => calls.push(["copy", t]) },
      getTabRoot: () => null,
      onTabReady: (k, cb) => { calls.push(["tabready", k]); return () => {}; },
    },
    storage: { set: (k, v) => storeMap.set(k, v), get: (k) => storeMap.get(k) ?? null },
    plugins: {
      call: async (pid, cid, input) => { calls.push(["plugins.call", pid, cid, input]); return { answer: "我是 OH" }; },
      list: async () => [],
    },
    favorites: { add: (key) => calls.push(["fav", key]), list: () => [] },
  },
};

/* ── 断言：manifest ── */
eq("id", manifest.id, "onethu.example.hello");
eq("permissions 含 ui", manifest.permissions.includes("ui"), true);
eq("permissions 含 css", manifest.permissions.includes("css"), true);
eq("permissions 含 storage", manifest.permissions.includes("storage"), true);

/* ── 断言：activate 注册齐全 ── */
await activate(ctx);
eq("命令数量", registered.commands.size >= 6, true);
for (const id of ["who", "greet-form", "showcase", "ask-oh", "hello-oh", "copy-greet", "confirm-danger"]) {
  eq(`命令 ${id} 已注册`, registered.commands.has(id), true);
}
eq("tab 已注册", registered.tabs.length, 1);
eq("tab pageKey", registered.tabs[0].id, "main");
eq("css 已注入", registered.css.length, 1);
eq("css 作用域规约", registered.css[0].includes(`[data-plg="${manifest.id}"]`), true);
eq("原子已注册", registered.atoms.length, 1);
eq("原子 resolve 命中", registered.atoms[0].resolve("main~count:3")?.title, "Hello 计数 3");
eq("原子失效返回 null", registered.atoms[0].resolve("main~gone"), null);
eq("tabready 已订阅", calls.some((c) => c[0] === "tabready"), true);

/* ── 断言：命令可跑 ── */
eq("who", await registered.commands.get("who").run(), "你好，测试同学");
const greet = await registered.commands.get("greet-form").run("");
eq("greet-form 结构化", typeof greet === "object" && typeof greet.markdown === "string", true);
eq("greet-form 用了表单+确认", calls.some((c) => c[0] === "form") && calls.some((c) => c[0] === "confirm"), true);
const show = await registered.commands.get("showcase").run();
eq("showcase 四区块", Array.isArray(show.items) && Array.isArray(show.kv) && !!show.markdown, true);
const oh = await registered.commands.get("ask-oh").run("你是谁");
eq("ask-oh 调 OH", calls.some((c) => c[0] === "plugins.call" && c[1] === "onethu.harness"), true);
eq("ask-oh 返回 markdown", typeof oh.markdown === "string", true);
eq("hello-oh 文案", (await registered.commands.get("hello-oh").run()).includes("run_plugin_cmd"), true);
const cp = await registered.commands.get("copy-greet").run();
eq("copy-greet 写剪贴板", calls.some((c) => c[0] === "copy" && String(c[1]).includes("测试同学")), true);
eq("danger 确认", (await registered.commands.get("confirm-danger").run()), "计数已清零");
eq("storage 落盘", storeMap.get("count"), "0");

/* ── 断言：收藏链路 ── */
ctx.onethu.favorites.add("main~count:5");
eq("favorites.add 调用", calls.some((c) => c[0] === "fav" && c[1] === "main~count:5"), true);

console.log(`结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
