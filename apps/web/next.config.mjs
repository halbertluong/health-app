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
};

export default nextConfig;
