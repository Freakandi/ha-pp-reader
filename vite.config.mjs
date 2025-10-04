/**
 * Vite configuration for the PP Reader dashboard TypeScript build pipeline.
 *
 * The configuration keeps the existing Home Assistant asset layout by emitting
 * bundled files directly into `custom_components/pp_reader/www/pp_reader_dashboard/js/`
 * while enabling cache busting through hashed filenames and source map output
 * for easier debugging.
 */
import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const entryFile = resolve(projectRoot, 'src/dashboard.ts');
const outputDirectory = resolve(
  projectRoot,
  'custom_components/pp_reader/www/pp_reader_dashboard/js',
);

export default defineConfig({
  publicDir: false,
  build: {
    sourcemap: true,
    emptyOutDir: false,
    outDir: outputDirectory,
    rollupOptions: {
      input: entryFile,
      output: {
        entryFileNames: 'dashboard.[hash].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash][extname]',
      },
    },
  },
});
