import { copyFileSync } from "node:fs";

copyFileSync(
  new URL("../appsscript.json", import.meta.url),
  new URL("../dist/appsscript.json", import.meta.url),
);
