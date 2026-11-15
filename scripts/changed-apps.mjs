import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function discoverApps(root) {
  const directory = resolve(root, "apps");
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `apps/${entry.name}`)
    .filter((app) => existsSync(resolve(root, app, "package.json")))
    .sort();
}

export function selectApps(apps, paths) {
  const selected = new Set();
  for (const path of paths) {
    if (path.startsWith("apps/")) {
      const app = path.split("/").slice(0, 2).join("/");
      if (apps.includes(app)) selected.add(app);
      // Unknown app-level configuration may affect any remaining app.
      else return apps;
    } else if (!/^(?:docs\/|[^/]+\.md$)/i.test(path)) {
      // Lockfiles, workspace, tooling, workflows and unknown root files:
      // conservatively check every app. Documentation alone needs none.
      return apps;
    }
  }
  return [...selected].sort();
}

export function changedPaths(root, base, head) {
  // --no-renames includes both paths of moves across app boundaries.
  return execFileSync(
    "git",
    ["diff", "--name-only", "--no-renames", "-z", base, head],
    {
      cwd: root,
      encoding: "utf8",
    },
  )
    .split("\0")
    .filter(Boolean);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = process.cwd();
  const apps = discoverApps(root);
  const [base, head = "HEAD"] = process.argv.slice(2);
  const selected = base
    ? selectApps(apps, changedPaths(root, base, head))
    : apps;
  const matrix = JSON.stringify({ app: selected });
  console.log(matrix);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      `matrix=${matrix}\ncount=${selected.length}\n`,
    );
  }
}
