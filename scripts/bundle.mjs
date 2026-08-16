import { build } from "esbuild";
import { readFileSync } from "node:fs";

// Both committed bundles had NO build script and no bundler dependency, so the shipped
// artifacts were UNREPRODUCIBLE: a source fix could land while the plugins kept serving
// whatever was committed, and no gate would object because the tests run against src/.
//
// Flags recovered from the shipped artifacts rather than guessed:
//   __commonJS / __toESM helpers  -> esbuild, bundle: true
//   line-2 createRequire banner   -> format esm, platform node, this exact shim
//   line-1 shebang                -> each entry is a bin
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

// NO SHEBANG IN THE BANNER. Both entries already start with one and esbuild preserves it;
// a second emits `#!/usr/bin/env node` on line 2, which is a syntax error, not a comment.
const banner =
  "import { createRequire as __createRequire } from 'node:module';" +
  "import { fileURLToPath as __fileURLToPath } from 'node:url';" +
  "import { dirname as __dirnameOf } from 'node:path';" +
  "const require = __createRequire(import.meta.url);" +
  "const __filename = __fileURLToPath(import.meta.url);" +
  "const __dirname = __dirnameOf(__filename);";

// One repo, two shipped plugins. Both take their version from THIS package.json, which is
// the point: the versions previously lived in three places (here and each plugin.json) with
// nothing comparing them, and the servers reported 2.0.0 while the manifests said 2.1.1.
const TARGETS = [
  { entry: "src/gemini/index.ts", out: "plugins/llm-gemini/bundle/index.mjs" },
  { entry: "src/openai/index.ts", out: "plugins/llm-openai/bundle/index.mjs" },
];

for (const { entry, out } of TARGETS) {
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    target: "node20",
    format: "esm",
    banner: { js: banner },
    outfile: out,
    logLevel: "warning",
    define: { __PKG_VERSION__: JSON.stringify(pkg.version) },
  });
  console.log(`bundled ${entry} -> ${out} (version ${pkg.version})`);
}
