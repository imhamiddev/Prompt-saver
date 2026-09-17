import type { NextConfig } from "next";

const securityHeaders = [
  // Prevents the site from being embedded in a hostile iframe
  // (clickjacking protection).
  { key: "X-Frame-Options", value: "DENY" },
  // Stops browsers from MIME-sniffing a response away from its declared
  // Content-Type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Limits how much referrer information is sent to other origins.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disables powerful browser features this app has no use for.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
