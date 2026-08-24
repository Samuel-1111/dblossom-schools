import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const aliases = [
  ["about", "#about"],
  ["academics", "#academics"],
  ["gallery", "#gallery"],
  ["events", "#events"],
  ["payment", "#payment"],
  ["complaint", "#complaint"],
] as const;

describe("public section aliases", () => {
  it.each(aliases)("routes /%s to the matching homepage section", (name, anchor) => {
    const source = readFileSync(`app/${name}/page.tsx`, "utf8");
    expect(source).toContain(`redirect(\"/${anchor}\")`);
  });
});
