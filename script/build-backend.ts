import { build as esbuild } from "esbuild";
import { rm } from "fs/promises";
import { readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
// NOTE: jsonwebtoken and bcryptjs should NOT be bundled as they rely on Node.js built-ins
// that need to be available at runtime (crypto module, native bindings)
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
];


async function buildBackend() {
  // Only clean dist folder if it exists, but keep public folder for frontend
  try {
    await rm("dist/index.cjs", { force: true });
  } catch {
    // File doesn't exist, that's fine
  }

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  console.log("Backend build complete!");
}

buildBackend().catch((err) => {
  console.error(err);
  process.exit(1);
});

