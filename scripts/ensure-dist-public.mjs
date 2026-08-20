import { mkdir, writeFile } from "node:fs/promises";

await mkdir("dist/public", { recursive: true });
await writeFile("dist/public/.next-runtime", "Next.js runtime assets are served by the standalone application.\n");
