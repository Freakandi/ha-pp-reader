#!/usr/bin/env node
/**
 * Update the dashboard module re-export to point to the latest hashed bundle.
 *
 * The TypeScript build emits files such as `dashboard.<hash>.js` into the
 * Home Assistant www directory. This script replaces the placeholder specifier
 * in `dashboard.module.js` with the most recently generated bundle so Home
 * Assistant always loads the fresh asset without manual edits.
 */
import { promises as fs } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_FILENAME = 'dashboard.module.js';
const HASHED_ENTRY_PATTERN = /^dashboard\.(?!module$)[\da-zA-Z]+\.js$/;
const MODULE_EXPORT_PATTERN = /export \* from ['"](?<specifier>.+?)['"];?/;

async function findLatestBundle(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const candidates = await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          HASHED_ENTRY_PATTERN.test(entry.name) &&
          entry.name !== MODULE_FILENAME,
      )
      .map(async (entry) => {
        const fullPath = resolve(directory, entry.name);
        const stats = await fs.stat(fullPath);
        return { name: entry.name, mtimeMs: stats.mtimeMs };
      }),
  );

  if (!candidates.length) {
    return null;
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return candidates[0].name;
}

async function updateModule(modulePath, bundleSpecifier) {
  const contents = await fs.readFile(modulePath, 'utf8');

  if (!MODULE_EXPORT_PATTERN.test(contents)) {
    throw new Error(`dashboard.module.js does not contain an export line to rewrite at ${modulePath}`);
  }

  const replacementLine = `export * from './${bundleSpecifier}';`;
  let updated = contents.replace(MODULE_EXPORT_PATTERN, replacementLine);

  if (updated === contents) {
    return false;
  }

  await fs.writeFile(modulePath, `${updated.trimEnd()}\n`, 'utf8');
  return true;
}

async function pruneStaleBundles(directory, bundleToKeep) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const staleBundles = entries
    .filter(
      (entry) =>
        entry.isFile() &&
        HASHED_ENTRY_PATTERN.test(entry.name) &&
        entry.name !== MODULE_FILENAME,
    )
    .map((entry) => entry.name)
    .filter((name) => name !== bundleToKeep);

  if (!staleBundles.length) {
    return;
  }

  for (const filename of staleBundles) {
    const bundlePath = resolve(directory, filename);
    try {
      await fs.unlink(bundlePath);
      console.log(`update_dashboard_module: Entfernte veraltetes Bundle ${filename}.`);
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        console.warn(
          `update_dashboard_module: Konnte veraltetes Bundle ${filename} nicht entfernen:`,
          error,
        );
      }
    }

    const mapPath = resolve(directory, `${filename}.map`);
    try {
      await fs.unlink(mapPath);
      console.log(
        `update_dashboard_module: Entfernte zugehörige Source Map ${filename}.map.`,
      );
    } catch (error) {
      if (error?.code !== 'ENOENT') {
        console.warn(
          `update_dashboard_module: Konnte Source Map ${filename}.map nicht entfernen:`,
          error,
        );
      }
    }
  }
}

async function main() {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const projectRoot = resolve(scriptDirectory, '..');
  const bundleDirectory = resolve(
    projectRoot,
    'custom_components/pp_reader/www/pp_reader_dashboard/js',
  );
  const modulePath = resolve(bundleDirectory, 'dashboard.module.js');

  const latestBundle = await findLatestBundle(bundleDirectory);

  if (!latestBundle) {
    console.warn(
      'update_dashboard_module: kein gebundeltes Dashboard gefunden, behalte Platzhalter bei.',
    );
    return;
  }

  const updated = await updateModule(modulePath, latestBundle);

  if (updated) {
    console.log(
      `update_dashboard_module: Aktualisierter Modul-Spezifier auf ${latestBundle}.`,
    );
  } else {
    console.log('update_dashboard_module: Modul-Spezifier war bereits aktuell.');
  }

  await pruneStaleBundles(bundleDirectory, latestBundle);
}

try {
  await main();
} catch (error) {
  console.error('update_dashboard_module: Fehler beim Aktualisieren des Moduls:', error);
  process.exitCode = 1;
}
