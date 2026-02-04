import { build } from "esbuild";
import { rm, readFile } from "fs/promises";

async function buildBackend() {
  // Clean previous build
  await rm("dist", { recursive: true, force: true });

  console.log("building server...");

  // Read package.json to externalize all runtime dependencies
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));

  await build({
    entryPoints: ["server/index.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node18",
    outfile: "dist/index.cjs",

    // ✅ CRITICAL FIX:
    // Externalize ALL dependencies so Node resolves them at runtime
    external: Object.keys(pkg.dependencies || {}),

    define: {
      "process.env.NODE_ENV": '"production"',
    },

    minify: true,
    sourcemap: false,
    logLevel: "info",
  });

  console.log("Backend build complete ✅");
}

buildBackend().catch((err) => {
  console.error("Backend build failed ❌");
  console.error(err);
  process.exit(1);
});
