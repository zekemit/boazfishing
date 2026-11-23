/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['sharp'],
  // Serverless functions only get the files they are traced to need. The default photos in
  // public/images/boaz are looked up by name at request time, so include them explicitly.
  outputFileTracingIncludes: {
    '/': ['./public/images/boaz/**/*'],
    '/api/photos': ['./public/images/boaz/**/*'],
    '/api/photos/upload': ['./public/images/boaz/**/*'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
