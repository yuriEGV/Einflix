/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    async rewrites() {
        if (process.env.NODE_ENV === 'production') return [];
        return [
            {
                source: '/api/((?!auth|drive|stream|poster|search).*)',
                destination: 'http://localhost:3001/api/:1',
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
