import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves this repository under /XR; root hosts such as Netlify
  // serve it at /, which also gives Quest PWA verification a domain root.
  base: process.env.GITHUB_ACTIONS === 'true' ? '/XR/' : '/',
  assetsInclude: ["**/*.obj", "**/*.mtl", "**/*.glb", "**/*.gltf", "**/*.hdr", "**/*.exr"],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three'],
        },
      },
    },
  },
});
