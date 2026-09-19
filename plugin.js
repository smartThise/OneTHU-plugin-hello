export const manifest = {
  id: "onethu.example.hello",
  name: "Hello 示例插件",
  version: "1.0.0",
  description: "最小示例：展示 onethu.* 基本用法，可作为开发模板",
  permissions: ["user:read"],
};

export default async function activate(ctx) {
  ctx.registerCommand({ id: "who", title: "我是谁" }, async () => {
    const u = await ctx.onethu.session.username();
    return u ? `你好，${u}` : "尚未登录";
  });
}
