#!/usr/bin/env node

import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const TEST_SUFFIXES = ['.test.ts', '.test.tsx'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

function collectTestFiles(currentDir) {
  const entries = readdirSync(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTestFiles(entryPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (TEST_SUFFIXES.some(suffix => entry.name.endsWith(suffix))) {
      files.push(entryPath);
    }
  }

  return files;
}

let testFiles = [];
try {
  if (statSync(srcDir).isDirectory()) {
    testFiles = collectTestFiles(srcDir);
  }
} catch (error) {
  if (error.code !== 'ENOENT') {
    console.error('Failed to scan TypeScript sources for tests');
    console.error(error);
    process.exitCode = 1;
    process.exit();
  }
}

testFiles.sort();

if (testFiles.length === 0) {
  console.log('No TypeScript test files found under src/.');
  process.exit(0);
}

const setupModulePath = path.join(projectRoot, 'tests', 'setup', 'node-test-globals.mjs');
const setupSpecifier = pathToFileURL(setupModulePath).href;

const result = spawnSync(process.execPath, ['--import', 'tsx', '--import', setupSpecifier, '--test', ...testFiles], {
  stdio: 'inherit',
});

if (result.error) {
  console.error('Failed to run Node test runner with tsx loader');
  console.error(result.error);
  process.exitCode = result.status ?? 1;
  process.exit();
}

process.exit(result.status ?? 0);
