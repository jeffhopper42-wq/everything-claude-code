#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { isMacOS, isWindows, isLinux, getHomeDir, findFiles } = require('./lib/utils');

function showHelp(exitCode = 0) {
  console.log(`
Usage: node scripts/follow-logs.js [options]

Follow Claude Code log files in real-time.

Options:
  --pattern <glob>   Log file pattern (default: "mcp*.log")
  --lines <n>        Number of initial lines to display (default: 20)
  --dir <path>       Override log directory path
  --list             List matching log files and exit
  --no-color         Disable colored output
  -h, --help         Show this help message
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const parsed = {
    pattern: 'mcp*.log',
    lines: 20,
    dir: null,
    list: false,
    color: true,
    help: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--pattern') {
      parsed.pattern = args[i + 1] || parsed.pattern;
      i += 1;
    } else if (arg === '--lines') {
      const n = parseInt(args[i + 1], 10);
      if (!isNaN(n) && n >= 0) parsed.lines = n;
      i += 1;
    } else if (arg === '--dir') {
      parsed.dir = args[i + 1] || null;
      i += 1;
    } else if (arg === '--list') {
      parsed.list = true;
    } else if (arg === '--no-color') {
      parsed.color = false;
    } else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else {
      console.error(`Unknown argument: ${arg}`);
      showHelp(1);
    }
  }

  return parsed;
}

/**
 * Get the default Claude Code log directory for the current platform.
 */
function getLogDir() {
  const home = getHomeDir();
  if (isMacOS) {
    return path.join(home, 'Library', 'Logs', 'Claude');
  }
  if (isWindows) {
    const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
    return path.join(appData, 'Claude', 'logs');
  }
  // Linux and other Unix-like
  const xdgState = process.env.XDG_STATE_HOME || path.join(home, '.local', 'state');
  return path.join(xdgState, 'claude', 'logs');
}

/**
 * Read the last N lines from a file.
 */
function tailLines(filePath, n) {
  if (n <= 0) return [];
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    // Remove trailing empty line from final newline
    if (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    return lines.slice(-n);
  } catch {
    return [];
  }
}

/**
 * Format a log line with optional color and file label.
 */
function formatLine(line, fileName, useColor) {
  const label = path.basename(fileName);
  if (useColor) {
    // Cyan label, reset for content
    return `\x1b[36m[${label}]\x1b[0m ${line}`;
  }
  return `[${label}] ${line}`;
}

/**
 * Watch a single log file for new content and stream it to stdout.
 * Returns a cleanup function.
 */
function watchFile(filePath, useColor) {
  let size = 0;
  try {
    const stat = fs.statSync(filePath);
    size = stat.size;
  } catch {
    // File may not exist yet; start from 0
  }

  const onChange = () => {
    let newSize;
    try {
      const stat = fs.statSync(filePath);
      newSize = stat.size;
    } catch {
      return; // File deleted or inaccessible
    }

    if (newSize <= size) {
      // File was truncated or unchanged — reset
      if (newSize < size) size = 0;
      else return;
    }

    try {
      const fd = fs.openSync(filePath, 'r');
      const buf = Buffer.alloc(newSize - size);
      fs.readSync(fd, buf, 0, buf.length, size);
      fs.closeSync(fd);
      size = newSize;

      const chunk = buf.toString('utf8');
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.length > 0) {
          process.stdout.write(formatLine(line, filePath, useColor) + '\n');
        }
      }
    } catch {
      // Ignore read errors (file may be rotated)
    }
  };

  // Use fs.watchFile for reliable cross-platform polling
  fs.watchFile(filePath, { interval: 500 }, onChange);

  return () => fs.unwatchFile(filePath, onChange);
}

/**
 * Discover log files matching the pattern in the log directory.
 */
function discoverLogFiles(logDir, pattern) {
  return findFiles(logDir, pattern).map(f => f.path);
}

/**
 * Watch the log directory for new files matching the pattern.
 * Calls onNewFile(filePath) for each new file discovered.
 * Returns a cleanup function.
 */
function watchForNewFiles(logDir, pattern, onNewFile) {
  const knownFiles = new Set();

  // Seed with current files
  for (const f of discoverLogFiles(logDir, pattern)) {
    knownFiles.add(f);
  }

  const interval = setInterval(() => {
    const current = discoverLogFiles(logDir, pattern);
    for (const f of current) {
      if (!knownFiles.has(f)) {
        knownFiles.add(f);
        onNewFile(f);
      }
    }
  }, 2000);

  return () => clearInterval(interval);
}

function main() {
  const opts = parseArgs(process.argv);
  if (opts.help) showHelp(0);

  const logDir = opts.dir || getLogDir();

  if (!fs.existsSync(logDir)) {
    console.error(`Log directory not found: ${logDir}`);
    console.error('Use --dir to specify a custom log directory.');
    process.exit(1);
  }

  const files = discoverLogFiles(logDir, opts.pattern);

  if (opts.list) {
    if (files.length === 0) {
      console.log('No matching log files found.');
    } else {
      for (const f of files) {
        console.log(f);
      }
    }
    process.exit(0);
  }

  if (files.length === 0) {
    console.error(`No files matching "${opts.pattern}" in ${logDir}`);
    console.error('Waiting for log files to appear...');
  } else {
    const label = opts.color ? '\x1b[32m' : '';
    const reset = opts.color ? '\x1b[0m' : '';
    console.error(`${label}Following ${files.length} log file(s) in ${logDir}${reset}`);
    for (const f of files) {
      console.error(`  ${path.basename(f)}`);
    }
    console.error('');

    // Show initial tail for each file
    for (const f of files) {
      const lines = tailLines(f, opts.lines);
      for (const line of lines) {
        process.stdout.write(formatLine(line, f, opts.color) + '\n');
      }
    }
  }

  // Start watching existing files
  const cleanups = [];
  for (const f of files) {
    cleanups.push(watchFile(f, opts.color));
  }

  // Watch for new files appearing
  cleanups.push(watchForNewFiles(logDir, opts.pattern, (newFile) => {
    const label = opts.color ? '\x1b[33m' : '';
    const reset = opts.color ? '\x1b[0m' : '';
    console.error(`${label}New log file detected: ${path.basename(newFile)}${reset}`);
    cleanups.push(watchFile(newFile, opts.color));
  }));

  // Graceful shutdown
  const shutdown = () => {
    for (const cleanup of cleanups) {
      try { cleanup(); } catch { /* ignore */ }
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  const keepAlive = setInterval(() => {}, 60000);
  cleanups.push(() => clearInterval(keepAlive));
}

// Export for testing
module.exports = { getLogDir, tailLines, formatLine, discoverLogFiles, parseArgs };

// Run if executed directly
if (require.main === module) {
  main();
}
