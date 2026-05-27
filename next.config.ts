import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      { protocol: "https", hostname: "k.kakaocdn.net" },
      { protocol: "http",  hostname: "k.kakaocdn.net" },
    ],
  },
}

export default nextConfig
