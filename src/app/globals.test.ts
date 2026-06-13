import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "vitest";

const styles = readFileSync(join(process.cwd(), "src/app/globals.scss"), "utf8");

describe("global toast positioning", () => {
  test("places fixed toast notifications at the top right of the viewport", () => {
    expect(styles).not.toMatch(/--dss-toast-center-offset/);
    expect(styles).toMatch(/\.dss-toast-stack\s*{[\s\S]*inset-inline-start:\s*auto/);
    expect(styles).toMatch(/\.dss-toast-stack\s*{[\s\S]*inset-inline-end:\s*\$spacing-05/);
    expect(styles).toMatch(/\.dss-toast-stack\s*{[\s\S]*inline-size:\s*min\(calc\(100vw - #\{\$spacing-07\}\), 18rem\)/);
    expect(styles).not.toMatch(/\.dss-toast-stack\s*{[\s\S]*translateX\(-50%\)/);
  });
});

describe("production management table layout", () => {
  test("allows the history table container to shrink inside the page gutter", () => {
    expect(styles).toMatch(
      /\.dss-production-management-page\s*{[\s\S]*>\s*\.cds--data-table-container\s*{[\s\S]*min-inline-size:\s*0/,
    );
  });
});
