import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /* Hochgeladene Fotos liegen im öffentlichen Vercel-Blob-Speicher
       unter <store-id>.public.blob.vercel-storage.com. `next/image`
       lädt aus Sicherheitsgründen nur von ausdrücklich erlaubten
       Hosts — ohne diesen Eintrag bleibt ein Blob-Bild leer (der
       Optimierer verweigert den fremden Host). `*` deckt die
       Store-ID als eine Subdomain-Ebene ab. */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;
