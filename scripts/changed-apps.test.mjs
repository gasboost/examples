import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { changedPaths, discoverApps, selectApps } from "./changed-apps.mjs";

const apps = ["apps/alpha", "apps/beta"];

test("selects only the changed app, without duplicates", () => {
  assert.deepEqual(
    selectApps(apps, ["apps/beta/src/main.ts", "apps/beta/package.json"]),
    ["apps/beta"],
  );
});

test("selects multiple apps for parallel matrix execution", () => {
  assert.deepEqual(
    selectApps(apps, ["apps/beta/src/main.ts", "apps/alpha/src/main.ts"]),
    apps,
  );
});

test("common and unknown root changes select every app", () => {
  for (const path of [
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "package.json",
    "biome.json",
    "scripts/changed-apps.mjs",
    ".github/workflows/ci.yml",
    "new-config.json",
    "apps/config.json",
  ]) {
    assert.deepEqual(selectApps(apps, [path]), apps, path);
  }
});

test("documentation-only and empty changes produce an empty matrix", () => {
  assert.deepEqual(selectApps(apps, ["README.md", "docs/development.md"]), []);
  assert.deepEqual(selectApps(apps, []), []);
  assert.deepEqual(selectApps([], ["pnpm-lock.yaml"]), []);
});

test("discovers apps dynamically and includes both sides of a rename", (t) => {
  const root = mkdtempSync(join(tmpdir(), "gasboost-ci-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, encoding: "utf8" });
  for (const app of [...apps, "apps/docs-only"])
    mkdirSync(join(root, app), { recursive: true });
  for (const app of apps) writeFileSync(join(root, app, "package.json"), "{}");
  assert.deepEqual(discoverApps(root), apps);
  git("init", "-q");
  git("config", "user.email", "ci@example.invalid");
  git("config", "user.name", "CI test");
  writeFileSync(
    join(root, apps[0], "old name.ts"),
    "export const value = 1;\n",
  );
  git("add", ".");
  git("commit", "-qm", "initial");
  const base = git("rev-parse", "HEAD").trim();
  git("mv", "apps/alpha/old name.ts", "apps/beta/new name.ts");
  git("commit", "-qm", "move across apps");
  assert.deepEqual(
    selectApps(discoverApps(root), changedPaths(root, base, "HEAD")),
    apps,
  );
});
