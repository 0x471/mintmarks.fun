import path from "path"
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import { copyFileSync, existsSync, statSync, readdirSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';

// Plugin to auto-compile and copy circuit files
const copyCircuitPlugin = () => {
  return {
    name: 'copy-circuit',
    buildStart() {
      const circuitSource = resolve(__dirname, '../mintmarks_circuits/target/mintmarks_circuits.json');
      const circuitDest = resolve(__dirname, 'public/circuit.json');
      const circuitDir = resolve(__dirname, '../mintmarks_circuits');
      const circuitSrcDir = join(circuitDir, 'src');

      // Check if recompilation needed
      let needsCompile = false;

      if (!existsSync(circuitSource)) {
        console.log('Circuit not found, auto-compiling...');
        needsCompile = true;
      } else if (existsSync(circuitSrcDir)) {
        // Check if any source file is newer than compiled circuit
        const compiledTime = statSync(circuitSource).mtimeMs;

        // Recursively check all .nr files
        const checkDir = (dir: string) => {
          const entries = readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = join(dir, entry.name);
            if (entry.isDirectory()) {
              checkDir(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.nr')) {
              const srcTime = statSync(fullPath).mtimeMs;
              if (srcTime > compiledTime) {
                console.log(`Circuit source changed (${entry.name}), recompiling...`);
                needsCompile = true;
                return;
              }
            }
          }
        };

        checkDir(circuitSrcDir);
      }

      // Compile if needed
      if (needsCompile) {
        try {
          // Check if mintmarks_circuits directory exists
          if (!existsSync(circuitDir)) {
            throw new Error('mintmarks_circuits directory not found!');
          }

          // Run circuit compilation
          console.log('Installing circuit dependencies...');
          execSync('pnpm install', { cwd: circuitDir, stdio: 'inherit' });

          console.log('Compiling circuit...');
          execSync('pnpm run compile', { cwd: circuitDir, stdio: 'inherit' });

          console.log('Circuit compiled successfully');
        } catch (error: any) {
          console.error('Circuit compilation failed');
          throw new Error(`Failed to compile circuit: ${error.message}`);
        }
      }

      // Copy circuit to public directory
      if (existsSync(circuitSource)) {
        copyFileSync(circuitSource, circuitDest);
        console.log('Copied latest circuit to public/circuit.json');
      } else {
        throw new Error('Circuit file still missing after compilation!');
      }
    },
  };
};

// Plugin to copy WASM files to .vite/deps after dependency optimization
const copyWasmPlugin = () => {
  return {
    name: 'copy-wasm-files',
    configureServer() {
      // Wait for Vite to optimize dependencies and create .vite/deps directory
      setTimeout(() => {
        const depsDir = resolve(__dirname, 'node_modules/.vite/deps');

        if (!existsSync(depsDir)) {
          console.warn('.vite/deps not found yet, WASM files will be copied on next reload');
          return;
        }

        const wasmFiles = [
          {
            source: resolve(__dirname, 'node_modules/.pnpm/@noir-lang+acvm_js@1.0.0-beta.6/node_modules/@noir-lang/acvm_js/web/acvm_js_bg.wasm'),
            dest: 'acvm_js_bg.wasm',
          },
          {
            source: resolve(__dirname, 'node_modules/.pnpm/@noir-lang+noirc_abi@1.0.0-beta.6/node_modules/@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm'),
            dest: 'noirc_abi_wasm_bg.wasm',
          },
        ];

        wasmFiles.forEach(({ source, dest }) => {
          const destPath = resolve(depsDir, dest);

          if (existsSync(source)) {
            copyFileSync(source, destPath);
            console.log(`Copied ${dest} to .vite/deps`);
          } else {
            console.warn(`WASM source not found: ${dest}`);
          }
        });
      }, 1000); // Wait 1 second for Vite to create deps directory
    },
  };
};

// Plugin to force resolve Node.js promises modules to browser-compatible mocks
// Required for zkemail-nr which uses Node.js APIs (fs, stream, timers, dns)
const forceResolvePromisesPlugin = () => {
  return {
    name: 'force-resolve-promises',
    enforce: 'pre' as const,
    resolveId(source: string) {
      // Handle fs/promises variations
      if (source === 'fs/promises' || source === 'node:fs/promises') {
        return resolve(__dirname, 'src/mocks/fs-promises.ts');
      }
      // Handle stream/promises variations (including resolved absolute paths)
      if (
        source === 'stream/promises' ||
        source === 'node:stream/promises' ||
        source === 'stream-browserify/promises' ||
        source.endsWith('stream-browserify/promises')
      ) {
        return resolve(__dirname, 'src/mocks/stream-promises.ts');
      }
      // Handle timers/promises variations
      if (source === 'timers/promises' || source === 'node:timers/promises') {
        return resolve(__dirname, 'src/mocks/generic-promises.ts');
      }
      // Handle dns/promises variations
      if (source === 'dns/promises' || source === 'node:dns/promises') {
        return resolve(__dirname, 'src/mocks/generic-promises.ts');
      }
      // Catch resolved paths ending with /promises from node polyfills
      // This happens when node-stdlib-browser resolves modules to mock files
      if (source.endsWith('/promises') && (
        source.includes('node-stdlib-browser') ||
        source.includes('empty.js') ||
        source.includes('node_modules')
      )) {
        if (source.includes('fs') || source.includes('empty')) {
          return resolve(__dirname, 'src/mocks/fs-promises.ts');
        }
        if (source.includes('stream')) {
          return resolve(__dirname, 'src/mocks/stream-promises.ts');
        }
        return resolve(__dirname, 'src/mocks/generic-promises.ts');
      }
      return null;
    },
  };
};

// https://vite.dev/config/
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
  plugins: [
    forceResolvePromisesPlugin(),
    react(),
    copyCircuitPlugin(),
    copyWasmPlugin(),
    wasm(),
    topLevelAwait(),
    nodePolyfills({
      // Polyfill all Node.js core modules for zkemail-nr compatibility
      // This is needed because zkemail-nr uses Node APIs (crypto, stream, buffer, etc.)
      protocolImports: true,
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@aztec/bb.js'], // Exclude bb.js from optimization due to WASM
    esbuildOptions: {
      target: 'esnext',
    },
    include: ['@zk-email/zkemail-nr'],
  },
  resolve: {
    // Aliases for Node.js promises modules - required for zkemail-nr browser compatibility
    alias: [
      { find: '@', replacement: path.resolve(__dirname, 'src') },
      { find: 'stream/promises', replacement: resolve(__dirname, 'src/mocks/stream-promises.ts') },
      { find: 'node:stream/promises', replacement: resolve(__dirname, 'src/mocks/stream-promises.ts') },
      { find: 'fs/promises', replacement: resolve(__dirname, 'src/mocks/fs-promises.ts') },
      { find: 'node:fs/promises', replacement: resolve(__dirname, 'src/mocks/fs-promises.ts') },
      { find: 'timers/promises', replacement: resolve(__dirname, 'src/mocks/generic-promises.ts') },
      { find: 'node:timers/promises', replacement: resolve(__dirname, 'src/mocks/generic-promises.ts') },
      { find: 'dns/promises', replacement: resolve(__dirname, 'src/mocks/generic-promises.ts') },
      { find: 'node:dns/promises', replacement: resolve(__dirname, 'src/mocks/generic-promises.ts') },
      { find: 'stream-browserify/promises', replacement: resolve(__dirname, 'src/mocks/stream-promises.ts') },
    ],
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'zk-email': ['@zk-email/zkemail-nr'],
          'bb': ['@aztec/bb.js'],
        },
      },
    },
  },
  worker: {
    format: 'es',
    plugins: () => [
      wasm(),
      topLevelAwait(),
    ],
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    proxy: {
      // Proxy for Coinbase CDP if needed (though SDK usually hits endpoints directly)
      '/amp': {
        target: 'https://cca-lite.coinbase.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});