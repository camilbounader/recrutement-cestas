/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // CV + lettre + image de la 1re page envoyés à l'IA
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
