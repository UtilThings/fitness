import { watch } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const srcDir = resolve(root, "src");

const directories = [
  resolve(srcDir, "hooks"),
  resolve(srcDir, "lib"),
];

let timeout: ReturnType<typeof setTimeout> | undefined;
let building = false;
let pending = false;

async function build() {
  if (building) {
    pending = true;
    return;
  }

  building = true;

  try {
    console.log("\nBuilding PocketBase hooks...");

    const process = Bun.spawn(
      ["bun", "run", "src/build.ts"],
      {
        cwd: root,
        stdout: "inherit",
        stderr: "inherit",
      }
    );

    const exitCode = await process.exited;

    if (exitCode === 0) {
      console.log("Build completed successfully");
    } else {
      console.error(`Build failed: ${exitCode}`);
    }
  } finally {
    building = false;

    if (pending) {
      pending = false;
      await build();
    }
  }
}

// Compilación inicial
await build();

// Monitorear hooks y librerías
for (const directory of directories) {
  watch(
    directory,
    { recursive: true },
    (event, filename) => {
      if (!filename?.endsWith(".ts")) return;

      console.log(`Changed: ${filename}`);

      // Debounce para evitar múltiples builds
      clearTimeout(timeout);

      timeout = setTimeout(() => {
        void build();
      }, 150);
    }
  );

  console.log(`Watching: ${directory}`);
}
