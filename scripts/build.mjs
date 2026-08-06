import { build as viteBuild } from "vite";
import { build as esbuild } from "esbuild";

await viteBuild();

await esbuild({
  entryPoints: ["server.ts"],
  bundle: true,
  platform: "node",
  format: "cjs",
  packages: "external",
  sourcemap: true,
  outfile: "dist/server.cjs",
});
