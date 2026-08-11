import { copyFile, mkdir } from "node:fs/promises";

const runtimeFiles = [
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_module_internal.js",
  "vision_wasm_module_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
];

const sourceDirectory = new URL("../node_modules/@mediapipe/tasks-vision/wasm/", import.meta.url);
const destinationDirectory = new URL("../public/mediapipe/wasm/", import.meta.url);

await mkdir(destinationDirectory, { recursive: true });

await Promise.all(
  runtimeFiles.map((fileName) =>
    copyFile(new URL(fileName, sourceDirectory), new URL(fileName, destinationDirectory)),
  ),
);

console.log(`Copied ${runtimeFiles.length} MediaPipe runtime files for local use.`);
