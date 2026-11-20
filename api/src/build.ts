import { Glob } from "bun";
import { resolve, relative, dirname, join } from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { watch } from "node:fs";

const root = process.cwd();
const srcDir = resolve(root, "src");
const hooksDir = resolve(srcDir, "hooks");
const libDir = resolve(srcDir, "lib");

const outDir = resolve(root, "pb_hooks");
const outLibDir = resolve(outDir, "lib");

// Limpiar salida anterior
await rm(outDir, { recursive: true, force: true });

// Descubrir archivos TypeScript
const getFiles = (dir: string): string[] =>
  Array.from(
    new Glob("**/*.ts").scanSync({
      cwd: dir,
      absolute: true,
      onlyFiles: true,
    })
  ).filter((file) => !file.endsWith(".d.ts"));

// 1. Compilar librerías CommonJS
const libs = getFiles(libDir);

if (libs.length > 0) {
  const result = await Bun.build({
    entrypoints: libs,
    outdir: outLibDir,
    root: libDir,
    target: "browser",
    format: "cjs",
    splitting: false,
    minify: false,
    sourcemap: "none",
    naming: "[dir]/[name].js",
  });

  if (!result.success) {
    console.error(result.logs);
    process.exit(1);
  }

  console.log(`Libraries compiled: ${libs.length}`);
}

// 2. Transpilar hooks
const transpiler = new Bun.Transpiler({
  loader: "ts",
  target: "browser",
});

const hooks = getFiles(hooksDir);

for (const hook of hooks) {
  const source = await Bun.file(hook).text();
  const output = transpiler.transformSync(source);

  const relativePath = relative(hooksDir, hook);

  const destination = join(
    outDir,
    relativePath.replace(/\.ts$/, ".pb.js")
  );

  await mkdir(dirname(destination), {
    recursive: true,
  });

  await Bun.write(destination, output);

  console.log(`Hook compiled: ${relativePath}`);
}

console.log("PocketBase build completed successfully");
