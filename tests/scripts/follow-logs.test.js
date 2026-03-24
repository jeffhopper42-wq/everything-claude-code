/**
 * Tests for scripts/follow-logs.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { getLogDir, tailLines, formatLine, discoverLogFiles, parseArgs } = require('../../scripts/follow-logs');

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (error) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${error.message}`);
    return false;
  }
}

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'follow-logs-test-'));
}

function cleanup(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

// --- parseArgs tests ---

console.log('parseArgs');

let passed = 0;
let failed = 0;

(test('returns defaults with no arguments', () => {
  const opts = parseArgs(['node', 'script.js']);
  assert.strictEqual(opts.pattern, 'mcp*.log');
  assert.strictEqual(opts.lines, 20);
  assert.strictEqual(opts.dir, null);
  assert.strictEqual(opts.list, false);
  assert.strictEqual(opts.color, true);
  assert.strictEqual(opts.help, false);
})) ? passed++ : failed++;

(test('parses --pattern', () => {
  const opts = parseArgs(['node', 'script.js', '--pattern', '*.log']);
  assert.strictEqual(opts.pattern, '*.log');
})) ? passed++ : failed++;

(test('parses --lines', () => {
  const opts = parseArgs(['node', 'script.js', '--lines', '50']);
  assert.strictEqual(opts.lines, 50);
})) ? passed++ : failed++;

(test('parses --dir', () => {
  const opts = parseArgs(['node', 'script.js', '--dir', '/tmp/logs']);
  assert.strictEqual(opts.dir, '/tmp/logs');
})) ? passed++ : failed++;

(test('parses --list', () => {
  const opts = parseArgs(['node', 'script.js', '--list']);
  assert.strictEqual(opts.list, true);
})) ? passed++ : failed++;

(test('parses --no-color', () => {
  const opts = parseArgs(['node', 'script.js', '--no-color']);
  assert.strictEqual(opts.color, false);
})) ? passed++ : failed++;

(test('parses --help', () => {
  const opts = parseArgs(['node', 'script.js', '--help']);
  assert.strictEqual(opts.help, true);
})) ? passed++ : failed++;

(test('parses -h', () => {
  const opts = parseArgs(['node', 'script.js', '-h']);
  assert.strictEqual(opts.help, true);
})) ? passed++ : failed++;

(test('parses multiple options', () => {
  const opts = parseArgs(['node', 'script.js', '--pattern', '*.txt', '--lines', '10', '--no-color', '--list']);
  assert.strictEqual(opts.pattern, '*.txt');
  assert.strictEqual(opts.lines, 10);
  assert.strictEqual(opts.color, false);
  assert.strictEqual(opts.list, true);
})) ? passed++ : failed++;

(test('ignores invalid --lines value', () => {
  const opts = parseArgs(['node', 'script.js', '--lines', 'abc']);
  assert.strictEqual(opts.lines, 20); // default
})) ? passed++ : failed++;

// --- getLogDir tests ---

console.log('\ngetLogDir');

(test('returns a string path', () => {
  const dir = getLogDir();
  assert.strictEqual(typeof dir, 'string');
  assert.ok(dir.length > 0);
})) ? passed++ : failed++;

(test('path contains platform-appropriate segments', () => {
  const dir = getLogDir();
  if (process.platform === 'darwin') {
    assert.ok(dir.includes('Library/Logs/Claude'), `Expected macOS path, got: ${dir}`);
  } else if (process.platform === 'win32') {
    assert.ok(dir.toLowerCase().includes('claude'), `Expected Windows path, got: ${dir}`);
  } else {
    assert.ok(dir.includes('claude'), `Expected Linux path, got: ${dir}`);
  }
})) ? passed++ : failed++;

// --- tailLines tests ---

console.log('\ntailLines');

(test('returns last N lines from a file', () => {
  const dir = createTempDir();
  const file = path.join(dir, 'test.log');
  fs.writeFileSync(file, 'line1\nline2\nline3\nline4\nline5\n');
  const result = tailLines(file, 3);
  assert.deepStrictEqual(result, ['line3', 'line4', 'line5']);
  cleanup(dir);
})) ? passed++ : failed++;

(test('returns all lines when N exceeds file length', () => {
  const dir = createTempDir();
  const file = path.join(dir, 'test.log');
  fs.writeFileSync(file, 'line1\nline2\n');
  const result = tailLines(file, 10);
  assert.deepStrictEqual(result, ['line1', 'line2']);
  cleanup(dir);
})) ? passed++ : failed++;

(test('returns empty array for non-existent file', () => {
  const result = tailLines('/tmp/nonexistent-follow-logs-test.log', 5);
  assert.deepStrictEqual(result, []);
})) ? passed++ : failed++;

(test('returns empty array when N is 0', () => {
  const dir = createTempDir();
  const file = path.join(dir, 'test.log');
  fs.writeFileSync(file, 'line1\nline2\n');
  const result = tailLines(file, 0);
  assert.deepStrictEqual(result, []);
  cleanup(dir);
})) ? passed++ : failed++;

// --- formatLine tests ---

console.log('\nformatLine');

(test('formats line with color', () => {
  const result = formatLine('hello world', '/path/to/mcp-server.log', true);
  assert.ok(result.includes('[mcp-server.log]'));
  assert.ok(result.includes('hello world'));
  assert.ok(result.includes('\x1b[36m')); // cyan
})) ? passed++ : failed++;

(test('formats line without color', () => {
  const result = formatLine('hello world', '/path/to/mcp-server.log', false);
  assert.strictEqual(result, '[mcp-server.log] hello world');
  assert.ok(!result.includes('\x1b'));
})) ? passed++ : failed++;

// --- discoverLogFiles tests ---

console.log('\ndiscoverLogFiles');

(test('finds matching files in a directory', () => {
  const dir = createTempDir();
  fs.writeFileSync(path.join(dir, 'mcp-server.log'), 'log data');
  fs.writeFileSync(path.join(dir, 'mcp-client.log'), 'log data');
  fs.writeFileSync(path.join(dir, 'other.txt'), 'not a log');
  const files = discoverLogFiles(dir, 'mcp*.log');
  assert.strictEqual(files.length, 2);
  assert.ok(files.every(f => path.basename(f).startsWith('mcp')));
  cleanup(dir);
})) ? passed++ : failed++;

(test('returns empty array for non-existent directory', () => {
  const files = discoverLogFiles('/tmp/nonexistent-follow-logs-dir', 'mcp*.log');
  assert.deepStrictEqual(files, []);
})) ? passed++ : failed++;

(test('returns empty array when no files match', () => {
  const dir = createTempDir();
  fs.writeFileSync(path.join(dir, 'other.txt'), 'not a log');
  const files = discoverLogFiles(dir, 'mcp*.log');
  assert.deepStrictEqual(files, []);
  cleanup(dir);
})) ? passed++ : failed++;

// --- Summary ---

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
