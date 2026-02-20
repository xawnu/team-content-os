import fs from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

export default function VersionPage() {
  const p = path.join(process.cwd(), "docs", "VERSION_EXPLANATION.md");
  const content = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "版本说明文件不存在。";

  return (
    <main className="min-h-screen bg-zinc-50 p-6 text-zinc-900 md:p-8">
      <div className="mx-auto max-w-5xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-2xl font-bold">版本介绍</h1>
        <pre className="whitespace-pre-wrap text-sm leading-7 text-zinc-700">{content}</pre>
      </div>
    </main>
  );
}
