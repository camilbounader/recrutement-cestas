/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lecture des fichiers Excel côté serveur
  serverExternalPackages: ["exceljs"],
  experimental: {
    serverActions: {
      // CV + lettre + image de la 1re page envoyés à l'IA
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
