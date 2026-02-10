/** @type {import('next').NextConfig} */
const nextConfig = {
    /* config options here */
    output: 'standalone',
    images: {
        unoptimized: true,
    },
    // تجاوز أخطاء التصدير أثناء التطوير
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },

    productionBrowserSourceMaps: true, // Enable source maps for accurate error debugging
    experimental: {
        // Force more stable build thread management
        cpus: 1,
        workerThreads: false,
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals.push('better-sqlite3');
        }
        // إجبار المجمع على استخدام معالج واحد فقط لمنع انفجار الذاكرة
        config.parallelism = 1;
        if (config.optimization && config.optimization.minimizer) {
            config.optimization.minimizer.forEach((m) => {
                if (m.options && m.options.parallel) {
                    m.options.parallel = false;
                }
            });
        }
        return config;
    },
};

export default nextConfig;
