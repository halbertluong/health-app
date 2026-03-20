/**
 * Post-build script: ensures page_client-reference-manifest.js exists for
 * every App Router page. Next.js 14 skips generating this file for route group
 * pages (e.g. (dashboard)/page.tsx) when the page has no direct client
 * component RSC boundaries, but Vercel's framework builder requires it.
 */
import fs from "fs";
import path from "path";
import { glob } from "fs/promises";

const serverDir = path.resolve(".next/server/app");

// Find all compiled page.js files
async function* findPages(dir) {
  for await (const f of await fs.promises.opendir(dir, { recursive: true })) {
    if (f.name === "page.js") {
      yield path.join(f.path, f.name);
    }
  }
}

const EMPTY_MANIFEST =
  'self.__RSC_MANIFEST=(self.__RSC_MANIFEST||{});' +
  'self.__RSC_MANIFEST["/"]=' +
  '{"ssrModuleMapping":{},"edgeSSRModuleMapping":{},"clientModules":{},"entryCSSFiles":{}};';

let created = 0;
for await (const pageJs of findPages(serverDir)) {
  const dir = path.dirname(pageJs);
  const manifestPath = path.join(dir, "page_client-reference-manifest.js");
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(manifestPath, EMPTY_MANIFEST);
    console.log("Created missing manifest:", manifestPath);
    created++;
  }
}

console.log(`fix-manifests: ${created} file(s) created.`);
