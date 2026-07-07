import fs from "fs";
import path from "path";

const sourceDir = process.cwd();
const distDir = path.join(sourceDir, "dist");
const distAssetsDir = path.join(distDir, "assets");

// Ensure directories exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}
if (!fs.existsSync(distAssetsDir)) {
  fs.mkdirSync(distAssetsDir, { recursive: true });
}

// Read all files in root directory
try {
  const files = fs.readdirSync(sourceDir);
  const targetExtensions = [".svg", ".png", ".ico"];

  files.forEach((file) => {
    const ext = path.extname(file).toLowerCase();
    if (targetExtensions.includes(ext)) {
      const sourcePath = path.join(sourceDir, file);
      
      // Copy to dist/
      const destPath1 = path.join(distDir, file);
      fs.copyFileSync(sourcePath, destPath1);
      console.log(`[COPY ASSET] Copied '${file}' to dist/`);

      // Copy to dist/assets/
      const destPath2 = path.join(distAssetsDir, file);
      fs.copyFileSync(sourcePath, destPath2);
      console.log(`[COPY ASSET] Copied '${file}' to dist/assets/`);
    }
  });

  console.log("[COPY ASSETS] All theme and icon assets copied successfully!");
} catch (err) {
  console.error("[COPY ASSETS] Error reading or copying assets:", err);
}
