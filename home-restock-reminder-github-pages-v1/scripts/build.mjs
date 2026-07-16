import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const files = ["index.html", "style.css", "app.js", "sw.js", "manifest.webmanifest", ".nojekyll"];

await rm(dist, { recursive: true, force: true });
await mkdir(resolve(dist, "assets"), { recursive: true });
await Promise.all(files.map((file) => cp(resolve(root, file), resolve(dist, file))));
await cp(resolve(root, "assets/playful-sticker-assets.png"), resolve(dist, "assets/playful-sticker-assets.png"));
console.log("Static GitHub Pages build created in dist/.");
