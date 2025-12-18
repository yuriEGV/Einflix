/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
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
