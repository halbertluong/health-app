import fs from "fs";
import path from "path";

const EMPTY_MANIFEST =
  'self.__RSC_MANIFEST=(self.__RSC_MANIFEST||{});' +
  'self.__RSC_MANIFEST["/"]=' +
  '{"ssrModuleMapping":{},"edgeSSRModuleMapping":{},"clientModules":{},"entryCSSFiles":{}};';

class EnsureRSCManifestsPlugin {
  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync("EnsureRSCManifests", (compilation, callback) => {
      try {
        const outputPath = compiler.outputPath; // e.g. .next/server
        // Walk the server/app directory and create missing manifests
        const appDir = path.join(outputPath, "app");
        if (fs.existsSync(appDir)) {
          createMissingManifests(appDir);
        }
      } catch (e) {
        // Non-fatal: log and continue
        console.warn("EnsureRSCManifests plugin warning:", e.message);
      }
      callback();
    });
  }
}

function createMissingManifests(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      createMissingManifests(fullPath);
    } else if (entry.name === "page.js") {
      const manifestPath = path.join(dir, "page_client-reference-manifest.js");
      if (!fs.existsSync(manifestPath)) {
        fs.writeFileSync(manifestPath, EMPTY_MANIFEST);
        console.log("[EnsureRSCManifests] Created:", manifestPath);
      }
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@health-app/types", "@health-app/validators", "@health-app/utils"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins.push(new EnsureRSCManifestsPlugin());
    }
    return config;
  },
};

export default nextConfig;
