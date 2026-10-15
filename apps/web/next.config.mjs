import { fileURLToPath } from 'node:url';

// Na hospedagem (Vercel), o navegador fala só com o domínio do site e o Next repassa /api para a API.
// Assim o cookie de refresh (SameSite=Strict) é do mesmo site e a CORS deixa de ser necessária.
// Defina NEXT_PUBLIC_API_URL=/api e API_PROXY_TARGET=https://sua-api.onrender.com no build.
const apiProxyTarget = process.env.API_PROXY_TARGET?.replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Saída enxuta para o Docker (server.js + só os módulos usados).
  output: 'standalone',
  // Em monorepo, o rastreamento de dependências precisa partir da raiz do repositório.
  outputFileTracingRoot: fileURLToPath(new URL('../../', import.meta.url)),
  async rewrites() {
    return apiProxyTarget ? [{ source: '/api/:path*', destination: `${apiProxyTarget}/api/:path*` }] : [];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Só diretivas que não dependem de nonce: o Next injeta scripts inline na hidratação.
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
