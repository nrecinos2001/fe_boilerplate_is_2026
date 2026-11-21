import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Genera .next/standalone (server.js + solo las dependencias que usa) para la imagen Docker.
  output: "standalone",
};

export default nextConfig;
