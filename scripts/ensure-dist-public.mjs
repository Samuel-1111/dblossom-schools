import { cp, mkdir, rm, writeFile } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp(".next/standalone", "dist", { recursive: true, verbatimSymlinks: true });
await mkdir("dist/.next", { recursive: true });
await cp(".next/static", "dist/.next/static", { recursive: true, verbatimSymlinks: true });
await mkdir("dist/public", { recursive: true });
await writeFile("dist/public/.next-runtime", "Next.js runtime assets are served by the standalone application.\n");
await writeFile("dist/package.json", JSON.stringify({ type: "module" }, null, 2) + "\n");
await writeFile("dist/index.js", "process.env.NODE_ENV ||= \"production\"; process.env.PORT ||= \"3000\"; await import(\"./server.js\");\n");
