#!/usr/bin/env node

/**
 * Defaults:
 *   target file       -> local-tools.md
 *   replacements file -> search_replace.json
 *
 * Usage:
 *   node apply-replacements.js
 *
 * Optional:
 *   node apply-replacements.js custom-replacements.json custom-file.md
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_TARGET_FILE = 'local-tools.md';
const DEFAULT_REPLACEMENTS_FILE = 'search_replace.json';

const [, , replacementsArg, targetArg] = process.argv;

const replacementsFile = path.resolve(
  process.cwd(),
  replacementsArg || DEFAULT_REPLACEMENTS_FILE
);

const targetFile = path.resolve(
  process.cwd(),
  targetArg || DEFAULT_TARGET_FILE
);

if (!fs.existsSync(replacementsFile)) {
  console.error(`Replacements file not found: ${replacementsFile}`);
  process.exit(1);
}

if (!fs.existsSync(targetFile)) {
  console.error(`Target file not found: ${targetFile}`);
  process.exit(1);
}

let replacements;
let content;

try {
  replacements = JSON.parse(fs.readFileSync(replacementsFile, 'utf8'));
} catch (err) {
  console.error('Failed to parse replacements JSON');
  console.error(err.message);
  process.exit(1);
}

try {
  content = fs.readFileSync(targetFile, 'utf8');
} catch (err) {
  console.error('Failed to read target file');
  console.error(err.message);
  process.exit(1);
}

if (!Array.isArray(replacements)) {
  console.error('Replacements JSON must be an array');
  process.exit(1);
}

const unappliedBlocks = [];
const appliedBlocks = [];

for (const [index, block] of replacements.entries()) {
  const search = block?.search;
  const replace = block?.replace;

  if (typeof search !== 'string') {
    unappliedBlocks.push({
      index,
      reason: 'Invalid search string',
      block,
    });
    continue;
  }

  if (typeof replace !== 'string') {
    unappliedBlocks.push({
      index,
      reason: 'Invalid replace string',
      block,
    });
    continue;
  }

  if (!content.includes(search)) {
    unappliedBlocks.push({
      index,
      reason: 'Search block not found',
      block,
    });
    continue;
  }

  const occurrences = content.split(search).length - 1;

  content = content.replace(search, replace);

  appliedBlocks.push({
    index,
    occurrencesMatched: occurrences,
  });
}

try {
  fs.writeFileSync(targetFile, content, 'utf8');
} catch (err) {
  console.error('Failed to write updated file');
  console.error(err.message);
  process.exit(1);
}

console.log('\n=== Replacement Summary ===\n');

console.log(`Target File: ${targetFile}`);
console.log(`Replacements File: ${replacementsFile}`);

console.log(`\nApplied: ${appliedBlocks.length}`);
console.log(`Unapplied: ${unappliedBlocks.length}`);

if (appliedBlocks.length > 0) {
  console.log('\nApplied Blocks:\n');

  for (const item of appliedBlocks) {
    console.log(
      `- Index ${item.index} (matched ${item.occurrencesMatched} occurrence(s))`
    );
  }
}

if (unappliedBlocks.length > 0) {
  console.log('\nUnapplied Blocks:\n');

  for (const item of unappliedBlocks) {
    console.log(`- Index ${item.index}`);
    console.log(`  Reason: ${item.reason}`);

    if (item.block?.search) {
      const preview =
        item.block.search.length > 120
          ? item.block.search.slice(0, 120) + '...'
          : item.block.search;

      console.log(`  Search Preview: ${JSON.stringify(preview)}`);
    }

    console.log('');
  }

  console.log(
    '\nFull unapplied blocks JSON:\n'
  );

  console.log(JSON.stringify(unappliedBlocks, null, 2));
}

console.log('\nDone.\n');