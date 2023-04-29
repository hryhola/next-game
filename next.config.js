/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    swcMinify: false,
    excludeFile: str => /\*.test.ts/.test(str)
}

module.exports = nextConfig
