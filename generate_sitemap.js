#!/usr/bin/env node
/**
 * Tự tạo sitemap.xml + robots.txt từ các file .html (chạy lúc build trên Vercel).
 *
 * Cách dùng trên Vercel:
 *   Project Settings → Build & Development Settings
 *     Build Command:     node generate_sitemap.js
 *     Output Directory:  .
 *   Environment Variables:
 *     SITE_URL = https://ten-mien-cua-ban.com   (không bắt buộc, nên đặt)
 */
const fs = require("fs");
const path = require("path");

// Ưu tiên SITE_URL; không có thì dùng domain production của Vercel
const SITE_URL = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? "https://" + process.env.VERCEL_PROJECT_PRODUCTION_URL
    : "https://tenmiencuaban.com")
).replace(/\/+$/, "");

const ROOT = path.resolve(process.env.SITE_DIR || ".");
// file/thư mục không đưa vào sơ đồ
const SKIP_NAMES = new Set(["404.html"]);
const SKIP_DIRS = new Set([".git", ".github", ".vercel", "node_modules", "assets", "admin", "api"]);

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (entry.name.endsWith(".html") && !SKIP_NAMES.has(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

const today = new Date().toISOString().slice(0, 10);

const urls = walk(ROOT)
  .sort()
  .map((file) => {
    const parts = path.relative(ROOT, file).split(path.sep);
    const name = parts[parts.length - 1];
    const dirs = parts.slice(0, -1);
    const loc =
      name === "index.html"
        ? SITE_URL + "/" + (dirs.length ? dirs.join("/") + "/" : "")
        : SITE_URL + "/" + parts.join("/");
    const lastmod = fs.statSync(file).mtime.toISOString().slice(0, 10) || today;
    const priority = loc === SITE_URL + "/" ? "1.0" : "0.8";
    return { loc, lastmod, priority };
  });

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map(
    (u) =>
      `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`
  ),
  "</urlset>",
  "",
].join("\n");

fs.writeFileSync(path.join(ROOT, "sitemap.xml"), xml, "utf8");
fs.writeFileSync(
  path.join(ROOT, "robots.txt"),
  `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`,
  "utf8"
);

console.log(`Đã tạo sitemap.xml với ${urls.length} địa chỉ (${SITE_URL})`);
