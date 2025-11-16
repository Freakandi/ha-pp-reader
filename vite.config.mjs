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
import { visualizer } from 'rollup-plugin-visualizer';

const projectRoot = dirname(fileURLToPath(import.meta.url));
const entryFile = resolve(projectRoot, 'src/dashboard.ts');
const outputDirectory = resolve(
  projectRoot,
  'custom_components/pp_reader/www/pp_reader_dashboard/js',
);

export default defineConfig(() => {
  const analyzerFlag = (process.env.PP_READER_ANALYZE_BUNDLE ?? '').toLowerCase();
  const enableAnalyzer = analyzerFlag === '1' || analyzerFlag === 'true';

  const analyzerPlugins = enableAnalyzer
    ? [
        visualizer({
          filename: resolve(projectRoot, '.docs', 'bundle-analysis.html'),
          template: 'treemap',
          gzipSize: true,
          brotliSize: true,
        }),
        visualizer({
          filename: resolve(projectRoot, '.docs', 'bundle-analysis.json'),
          template: 'raw-data',
        }),
      ]
    : [];

  return {
    publicDir: false,
    server: {
      watch: {
        // Ignore Python virtual environments to avoid hitting Pi watcher limits.
        ignored: [
          '**/venv-ha/**',
          '**/.venv/**',
          '**/venv/**',
        ],
      },
    },
    build: {
      lib: {
        entry: entryFile,
        formats: ['es'],
        name: 'PPReaderDashboard',
        fileName: 'dashboard',
      },
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
        plugins: analyzerPlugins,
      },
    },
  };
});
