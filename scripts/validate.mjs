#!/usr/bin/env node
// Repository checks for the Sitelemetry Claude plugin.
//
// Development only. It reads the files in this repository, prints the result
// and exits with code 1 if any check fails. It makes no network requests,
// writes nothing and is never run by the plugin.
//
// Usage: node scripts/validate.mjs [--deny-file <path> | --no-deny]
//
// Maintainers keep an extra list of terms that must never appear in the
// repository (one per line, lines starting with # are comments). It is read
// from --deny-file, or by default from .git/info/validate-deny.txt, which git
// never commits. A missing list fails the check unless --no-deny is passed.

import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PLUGIN_NAME = 'sitelemetry';
const MCP_URL = 'https://claude-mcp.sitelemetry.com/mcp';

// Every http(s) URL in the repository must be one of these, or use an
// example host reserved for documentation (example.com, example.org, example.net).
const ALLOWED_URLS = new Set([
  'https://sitelemetry.com',
  'https://sitelemetry.com/mcp-guide',
  'https://sitelemetry.com/privacy',
  'https://sitelemetry.com/terms',
  'https://sitelemetry.com/support',
  MCP_URL,
  'https://schema.org',
  'https://github.com/egenil/sitelemetry-claude-plugin'
]);
const EXAMPLE_HOST = /(^|\.)example\.(com|org|net)$/i;

// Sales and upsell wording that must not appear in plugin content. This file
// holds the list, so the scan skips it.
const SALES_TERMS = ['upgrade', 'pro plan', 'pricing', 'free trial', 'buy now', 'discount'];
const SALES_SCAN_EXCLUDE = new Set(['scripts/validate.mjs']);
const CURRENCY_AMOUNT = /[$€£]\s?\d/;

const PLUGIN_KEYS = new Set([
  '$schema', 'name', 'displayName', 'version', 'description', 'author', 'homepage', 'repository', 'license',
  'keywords', 'metadata', 'defaultEnabled', 'commands', 'agents', 'skills', 'hooks', 'mcpServers',
  'outputStyles', 'lspServers', 'userConfig'
]);
const BLOCKED_PLUGIN_NAMES = new Set(['claude', 'anthropic', 'official', 'plugin', 'mcp', 'test']);
const RESERVED_MARKETPLACE = /^(claude-plugins-official|claude-community|claude-plugins-community|agent-skills|anthropic-.*|claudeai-.*|github|npm)$/;
const BLOCKED_FILE_NAMES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini', '__macosx']);
const BLOCKED_EXTENSIONS = new Set(['.mcpb', '.dxt', '.exe', '.dll', '.so', '.dylib', '.ico', '.pdf', '.zip']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']);
const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;
const TEXT_EXTENSIONS = new Set(['.md', '.json', '.mjs', '.js', '.txt', '.yml', '.yaml', '']);
// SKILL.md frontmatter keys accepted on every Claude surface that loads skills.
const SKILL_KEYS = new Set(['name', 'description', 'license', 'compatibility']);

const results = [];
function check(label, problems) {
  results.push({ label, problems });
}

function rel(path) {
  return relative(ROOT, path).split(sep).join('/');
}

function walk(dir, entries = []) {
  for (const name of readdirSync(dir)) {
    if (dir === ROOT && name === '.git') continue;
    const path = join(dir, name);
    const stat = lstatSync(path);
    entries.push({ path, name, stat });
    if (stat.isDirectory() && !stat.isSymbolicLink()) walk(path, entries);
  }
  return entries;
}

function readText(path) {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
}

function readJson(path, problems) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    problems.push(`${rel(path)} is not valid JSON (${error.message})`);
    return null;
  }
}

// Minimal frontmatter reader: single-line "key: value" pairs only, which is
// all this repository uses. Anything else is reported as a problem.
function readFrontmatter(path, problems) {
  const text = readText(path);
  if (!text.startsWith('---\n')) {
    problems.push(`${rel(path)} must start with a --- frontmatter line`);
    return { fields: {}, body: text };
  }
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) {
    problems.push(`${rel(path)} has no closing --- frontmatter line`);
    return { fields: {}, body: text };
  }
  const fields = {};
  for (const line of text.slice(4, end).split('\n')) {
    if (!line.trim()) continue;
    const match = /^([A-Za-z][\w-]*):\s+(.*)$/.exec(line);
    if (!match) {
      problems.push(`${rel(path)} frontmatter line is not a single-line "key: value": ${line}`);
      continue;
    }
    let value = match[2].trim();
    if (/^["'].*["']$/.test(value)) {
      value = value.slice(1, -1);
    } else if (/^[|>]/.test(value) || /: /.test(value) || / #/.test(value)) {
      problems.push(`${rel(path)} frontmatter "${match[1]}" must be a plain single-line string without ": " or " #"`);
    }
    fields[match[1]] = value;
  }
  return { fields, body: text.slice(end + 5) };
}

// --- Load the local deny list ----------------------------------------------------
const argv = process.argv.slice(2);
const skipDeny = argv.includes('--no-deny');
const denyIndex = argv.indexOf('--deny-file');
const denyPath = denyIndex >= 0 ? argv[denyIndex + 1] : join(ROOT, '.git', 'info', 'validate-deny.txt');
const denyTerms = !skipDeny && denyPath && existsSync(denyPath)
  ? readText(denyPath).split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#'))
  : [];

const entries = walk(ROOT);
const files = entries.filter((entry) => entry.stat.isFile());

// --- File layout and names ----------------------------------------------------
{
  const problems = [];
  for (const { path, name, stat } of entries) {
    const where = rel(path);
    if (stat.isSymbolicLink()) problems.push(`${where} is a symbolic link`);
    if (BLOCKED_FILE_NAMES.has(name.toLowerCase())) problems.push(`${where} must not be committed`);
    if (!SAFE_NAME.test(name)) problems.push(`${where} uses characters outside [A-Za-z0-9._-]`);
    if (WINDOWS_RESERVED.test(name) || /[. ]$/.test(name)) problems.push(`${where} is not a valid Windows file name`);
    if (stat.isFile()) {
      const ext = extname(name).toLowerCase();
      if (BLOCKED_EXTENSIONS.has(ext)) problems.push(`${where} is a binary or bundle file type`);
      if (stat.size > 5 * 1024 * 1024) problems.push(`${where} is larger than 5 MiB`);
      else if (!IMAGE_EXTENSIONS.has(ext) && stat.size > 256 * 1024) problems.push(`${where} is larger than 256 KiB`);
    }
  }
  if (files.length > 512) problems.push(`${files.length} files; keep it under 512`);
  if (existsSync(join(ROOT, 'bin'))) problems.push('a top-level bin/ folder stops installation in Claude apps');
  if (existsSync(join(ROOT, 'CLAUDE.md'))) problems.push('CLAUDE.md at the plugin root is not loaded');
  if (existsSync(join(ROOT, 'commands'))) problems.push('commands/ is the older format; put slash commands in skills/ instead');
  const manifestDir = readdirSync(join(ROOT, '.claude-plugin'));
  for (const name of manifestDir) {
    if (!['plugin.json', 'marketplace.json'].includes(name)) problems.push(`.claude-plugin/${name} belongs at the plugin root`);
  }
  const attributes = join(ROOT, '.gitattributes');
  if (existsSync(attributes) && /export-(ignore|subst)/.test(readText(attributes))) {
    problems.push('.gitattributes must not use export-ignore or export-subst');
  }
  check('File layout and names', problems);
}

// --- JSON files ---------------------------------------------------------------
{
  const problems = [];
  for (const { path } of files.filter((file) => extname(file.name) === '.json')) readJson(path, problems);
  check('JSON syntax', problems);
}

// --- plugin.json ----------------------------------------------------------------
let pluginJson = null;
{
  const problems = [];
  const path = join(ROOT, '.claude-plugin', 'plugin.json');
  pluginJson = existsSync(path) ? readJson(path, problems) : (problems.push('missing .claude-plugin/plugin.json'), null);
  if (pluginJson) {
    const { name, version, description, author, homepage, license } = pluginJson;
    if (name !== PLUGIN_NAME) problems.push(`name must be "${PLUGIN_NAME}"`);
    if (typeof name !== 'string' || !/^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/.test(name) || BLOCKED_PLUGIN_NAMES.has(name)) {
      problems.push('name must be 1-64 characters of a-z, 0-9 and -, and not a reserved word');
    }
    if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) problems.push('version must be semver');
    if (typeof description !== 'string' || !description.trim()) problems.push('description is required');
    if (!author || typeof author.name !== 'string' || !author.name.trim()) problems.push('author.name is required');
    if (typeof license !== 'string' || !license.trim()) problems.push('license is required');
    try {
      if (new URL(homepage).protocol !== 'https:') problems.push('homepage must use https');
    } catch {
      problems.push('homepage must be a valid URL');
    }
    for (const key of Object.keys(pluginJson)) if (!PLUGIN_KEYS.has(key)) problems.push(`unknown key "${key}"`);
  }
  check('plugin.json', problems);
}

// --- marketplace.json -------------------------------------------------------------
{
  const problems = [];
  const path = join(ROOT, '.claude-plugin', 'marketplace.json');
  const market = existsSync(path) ? readJson(path, problems) : null;
  if (market) {
    if (typeof market.name !== 'string' || !/^[a-z0-9-]+$/.test(market.name)) problems.push('name must be lowercase without spaces');
    if (RESERVED_MARKETPLACE.test(market.name || '')) problems.push('name is reserved');
    if (!market.owner || typeof market.owner.name !== 'string') problems.push('owner.name is required');
    if (typeof market.description !== 'string' || !market.description.trim()) problems.push('description is recommended');
    const plugins = Array.isArray(market.plugins) ? market.plugins : [];
    if (plugins.length !== 1) problems.push('plugins must list exactly one plugin');
    for (const entry of plugins) {
      if (entry.name !== pluginJson?.name) problems.push('plugin entry name must match plugin.json name');
      if (typeof entry.source !== 'string' || !entry.source.startsWith('./')) problems.push('plugin entry source must be a relative path starting with ./');
    }
  }
  check('marketplace.json', problems);
}

// --- .mcp.json ------------------------------------------------------------------
{
  const problems = [];
  const path = join(ROOT, '.mcp.json');
  const config = existsSync(path) ? readJson(path, problems) : (problems.push('missing .mcp.json'), null);
  if (config) {
    const servers = config.mcpServers ?? config;
    const names = Object.keys(servers);
    if (names.length !== 1 || names[0] !== PLUGIN_NAME) problems.push(`exactly one server named "${PLUGIN_NAME}" is expected`);
    for (const [name, server] of Object.entries(servers)) {
      if (server.type !== 'http') problems.push(`${name}: type must be "http"`);
      if (server.url !== MCP_URL) problems.push(`${name}: url must be ${MCP_URL}`);
      for (const key of ['headers', 'env', 'command', 'args']) if (key in server) problems.push(`${name}: "${key}" is not allowed`);
    }
  }
  check('.mcp.json', problems);
}

// --- Skills -----------------------------------------------------------------------
{
  const problems = [];
  const skillsDir = join(ROOT, 'skills');
  const skillDirs = existsSync(skillsDir) ? readdirSync(skillsDir).filter((name) => lstatSync(join(skillsDir, name)).isDirectory()) : [];
  if (!skillDirs.length) problems.push('no skills found');
  for (const dir of skillDirs) {
    const path = join(skillsDir, dir, 'SKILL.md');
    if (!existsSync(path) || !readdirSync(join(skillsDir, dir)).includes('SKILL.md')) {
      problems.push(`skills/${dir} has no SKILL.md`);
      continue;
    }
    const { fields, body } = readFrontmatter(path, problems);
    const where = `skills/${dir}/SKILL.md`;
    for (const key of Object.keys(fields)) {
      if (!SKILL_KEYS.has(key)) problems.push(`${where}: frontmatter key "${key}" is not accepted on every Claude surface`);
    }
    if (fields.name !== dir) problems.push(`${where}: name must equal the folder name "${dir}"`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fields.name || '') || (fields.name || '').length > 64) problems.push(`${where}: invalid name`);
    const description = fields.description || '';
    if (description.length < 1 || description.length > 1024) problems.push(`${where}: description must be 1-1024 characters (has ${description.length})`);
    if (fields.compatibility && fields.compatibility.length > 500) problems.push(`${where}: compatibility exceeds 500 characters`);
    const lines = body.split('\n').length;
    if (lines > 500) problems.push(`${where}: body has ${lines} lines; keep it under 500`);
    if (!/user's language/i.test(body)) problems.push(`${where}: must tell Claude to reply in the user's language`);
    if (!/\bowns?\b|authori[sz]ed/i.test(body)) problems.push(`${where}: must limit audits to sites the user owns or is authorized to test`);
    for (const [, target] of body.matchAll(/\]\((?!https?:|mailto:|#)([^)]+)\)/g)) {
      if (!existsSync(join(skillsDir, dir, target))) problems.push(`${where}: broken link ${target}`);
    }
    const refs = join(skillsDir, dir, 'references');
    if (existsSync(refs)) {
      for (const name of readdirSync(refs)) {
        if (lstatSync(join(refs, name)).isDirectory()) problems.push(`skills/${dir}/references/${name}: keep references one level deep`);
      }
    }
  }
  check(`Skills (${skillDirs.length})`, problems);
}

// --- README and LICENSE -------------------------------------------------------------
{
  const problems = [];
  const readme = join(ROOT, 'README.md');
  if (!existsSync(readme)) {
    problems.push('missing README.md');
  } else {
    const words = readText(readme).replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length;
    if (words < 40) problems.push(`README.md has ${words} words outside code blocks; at least 40 are required`);
  }
  const license = join(ROOT, 'LICENSE');
  if (!existsSync(license) || !/MIT License/.test(readText(license))) problems.push('LICENSE must contain the MIT license');
  check('README and LICENSE', problems);
}

// --- Text content -------------------------------------------------------------------
{
  const urlProblems = [];
  const mcpProblems = [];
  const salesProblems = [];
  const denyProblems = [];
  const textFiles = files.filter(({ name }) => TEXT_EXTENSIONS.has(extname(name).toLowerCase()));
  for (const { path } of textFiles) {
    const where = rel(path);
    const text = readText(path);

    for (const [raw] of text.matchAll(/https?:\/\/[^\s"'`<>()[\]{}]+/g)) {
      const url = raw.replace(/[.,;:!?*]+$/, '');
      // Server-config templates such as https://$host... or https://%{HTTP_HOST}... are not links.
      if (/^https?:\/\/[$%]/.test(url)) continue;
      if (url.startsWith('http:')) {
        urlProblems.push(`${where}: non-https URL ${url}`);
        continue;
      }
      let host = '';
      try {
        host = new URL(url).hostname;
      } catch {
        urlProblems.push(`${where}: unparseable URL ${url}`);
        continue;
      }
      if (EXAMPLE_HOST.test(host)) continue;
      if (!ALLOWED_URLS.has(url.replace(/\/$/, ''))) urlProblems.push(`${where}: URL not on the allowed list ${url}`);
    }

    for (const match of text.matchAll(/(?<!claude-mcp\.)sitelemetry\.com\/mcp(?!-guide)/g)) {
      mcpProblems.push(`${where}: MCP path on the wrong host at offset ${match.index}`);
    }

    if (!SALES_SCAN_EXCLUDE.has(where)) {
      for (const term of SALES_TERMS) {
        if (new RegExp(`\\b${term}`, 'i').test(text)) salesProblems.push(`${where}: contains "${term}"`);
      }
      if (CURRENCY_AMOUNT.test(text)) salesProblems.push(`${where}: contains a currency amount`);
    }

    // Matching is case-sensitive.
    denyTerms.forEach((term, index) => {
      if (text.includes(term)) denyProblems.push(`${where}: contains deny-list term #${index + 1}`);
    });
  }
  // File names are checked against the deny list too.
  for (const { path } of entries) {
    const where = rel(path);
    denyTerms.forEach((term, index) => {
      if (where.includes(term)) denyProblems.push(`${where}: path contains deny-list term #${index + 1}`);
    });
  }
  check(`URLs limited to the allowed list (${textFiles.length} text files)`, urlProblems);
  check('MCP URL only on the claude-mcp host', mcpProblems);
  check('No sales or upsell wording', salesProblems);
  if (skipDeny) {
    check('Local deny list (skipped with --no-deny)', []);
  } else if (!denyTerms.length) {
    check('Local deny list', ['no terms found; add .git/info/validate-deny.txt, pass --deny-file <path>, or pass --no-deny']);
  } else {
    check(`Local deny list (${denyTerms.length} terms from ${basename(denyPath)})`, denyProblems);
  }
}

// --- Report -------------------------------------------------------------------------
let failed = 0;
for (const { label, problems } of results) {
  if (problems.length) {
    failed += problems.length;
    console.log(`FAIL ${label}`);
    for (const problem of problems) console.log(`     - ${problem}`);
  } else {
    console.log(`ok   ${label}`);
  }
}
console.log('');
if (failed) {
  console.log(`Validation failed: ${failed} problem(s).`);
  process.exit(1);
}
console.log(`Validation passed: ${results.length} checks, ${files.length} files.`);
