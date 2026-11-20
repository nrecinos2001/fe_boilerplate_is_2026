import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El navegador llama a /api/backend/* (mismo origen) y Next lo reenvía a
  // API_URL. Así no hace falta CORS en el backend ni exponer API_URL.
  async rewrites() {
    const apiUrl = process.env.API_URL?.replace(/\/$/, "");
    if (!apiUrl) return [];
    return [{ source: "/api/backend/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
