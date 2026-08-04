/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        // Khi chạy trong Docker Compose, gọi trực tiếp tới hostname của container 'backend'
        destination: "http://backend:8080/api/:path*",
      },
    ];
  },
};

export default nextConfig;
