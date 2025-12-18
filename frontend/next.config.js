/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:3001/api/:path*',
            },
        ]
    },
    async redirects() {
        return [
            {
                source: '/',
                destination: '/gallery',
                permanent: true,
            },
        ]
    },
};

export default nextConfig;
