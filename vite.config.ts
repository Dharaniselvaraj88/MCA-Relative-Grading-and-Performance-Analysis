import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    esbuild: {
      target: 'es2022',
      legalComments: 'none',
      treeShaking: true,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-dom/client',
        'lucide-react',
        'motion',
        'motion/react',
        'recharts',
        'firebase/app',
        'firebase/firestore',
        'firebase/auth',
        'xlsx',
        'jszip',
        'jspdf',
        'html2canvas'
      ],
      esbuildOptions: {
        target: 'es2022',
      },
    },
    build: {
      target: 'es2022',
      minify: 'esbuild',
      cssMinify: 'esbuild',
      cssCodeSplit: false,
      modulePreload: false,
      sourcemap: false,
      reportCompressedSize: false,
      chunkSizeWarningLimit: 2500,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('xlsx') || id.includes('jszip')) {
                return 'vendor-export';
              }
              if (id.includes('recharts')) {
                return 'vendor-charts';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              return 'vendor-libs';
            }
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      warmup: {
        clientFiles: [
          './src/main.tsx',
          './src/App.tsx',
          './src/components/AuthGate.tsx',
          './src/components/Header.tsx',
          './src/components/CITLogo.tsx',
          './src/data/questionsData.ts',
          './src/lib/firebase.ts',
        ],
      },
    },
  };
});

