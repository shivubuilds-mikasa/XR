import { defineConfig } from 'vite';

export default defineConfig({
  base: '/XR/',
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
