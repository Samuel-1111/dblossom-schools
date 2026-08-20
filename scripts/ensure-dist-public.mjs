import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });
await cp(".next/standalone", "dist", { recursive: true, verbatimSymlinks: true });
await cp(".next/static", "dist/.next/static", { recursive: true, verbatimSymlinks: true });

await mkdir("dist/public", { recursive: true });
await writeFile(
  "dist/public/.next-runtime",
  "Next.js runtime assets are served by the standalone application.\n",
);

await writeFile(
  "dist/package.json",
  JSON.stringify({ type: "module" }, null, 2) + "\n",
);

await writeFile(
  "dist/index.js",
  "import path from \"node:path\";\nimport { fileURLToPath } from \"node:url\";\nconst __dirname = path.dirname(fileURLToPath(import.meta.url));\nprocess.chdir(__dirname);\nawait import(\"./server.js\");\n",
);
