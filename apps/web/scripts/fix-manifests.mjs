/**
 * Post-build script: ensures page_client-reference-manifest.js exists for
 * every App Router page. Next.js 14 skips generating this file for route group
 * pages (e.g. (dashboard)/page.tsx) when the page has no direct client
 * component RSC boundaries, but Vercel's framework builder requires it.
 */
import fs from "fs";
import path from "path";

const serverDir = path.resolve(".next/server/app");

const EMPTY_MANIFEST =
  'self.__RSC_MANIFEST=(self.__RSC_MANIFEST||{});' +
  'self.__RSC_MANIFEST["/"]=' +
  '{"ssrModuleMapping":{},"edgeSSRModuleMapping":{},"clientModules":{},"entryCSSFiles":{}};';

function findPages(dir, pages = []) {
  if (!fs.existsSync(dir)) return pages;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findPages(fullPath, pages);
    } else if (entry.name === "page.js") {
      pages.push(fullPath);
    }
  }
  return pages;
}

const pages = findPages(serverDir);
let created = 0;

for (const pageJs of pages) {
  const dir = path.dirname(pageJs);
  const manifestPath = path.join(dir, "page_client-reference-manifest.js");
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, EMPTY_MANIFEST);
    console.log("Created missing manifest:", manifestPath);
    created++;
  }
}

console.log(`fix-manifests: ${created} file(s) created.`);
