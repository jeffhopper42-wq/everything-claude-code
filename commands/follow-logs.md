---
description: Follow Claude Code log files in real-time
---

# Follow Logs

Stream Claude Code MCP and other log files in real-time with cross-platform support.

## What This Command Does

1. Locates the Claude Code log directory for the current platform
2. Finds log files matching a pattern (default: `mcp*.log`)
3. Displays the last 20 lines from each file
4. Streams new log entries as they are written
5. Automatically detects new log files that appear

## When to Use

- Debugging MCP server connectivity or configuration issues
- Monitoring Claude Code activity in real-time
- Investigating errors or unexpected behavior in MCP integrations
- Watching log output during development of MCP servers

## How It Works

Run the follow-logs script in a terminal:

```bash
# Follow MCP logs (default)
node scripts/follow-logs.js

# Follow all log files
node scripts/follow-logs.js --pattern "*.log"

# Show more initial context
node scripts/follow-logs.js --lines 50

# List available log files without following
node scripts/follow-logs.js --list

# Use a custom log directory
node scripts/follow-logs.js --dir /path/to/logs
```

### Platform Log Locations

| Platform | Default Log Directory |
|----------|----------------------|
| macOS    | `~/Library/Logs/Claude/` |
| Windows  | `%APPDATA%\Claude\logs\` |
| Linux    | `$XDG_STATE_HOME/claude/logs/` (default: `~/.local/state/claude/logs/`) |

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--pattern <glob>` | Log file glob pattern | `mcp*.log` |
| `--lines <n>` | Initial lines to display | `20` |
| `--dir <path>` | Override log directory | Platform default |
| `--list` | List matching files and exit | — |
| `--no-color` | Disable colored output | — |

## Example Usage

**User:** I need to debug why my MCP server isn't connecting.

**Agent:** I'll help you monitor the MCP logs. Run this in a separate terminal:

```bash
node scripts/follow-logs.js
```

This will show the last 20 lines from each MCP log file and stream new entries as they appear. Look for connection errors, timeout messages, or configuration warnings.

## Important Notes

- Press **Ctrl+C** to stop following
- New log files are automatically detected every 2 seconds
- Each line is prefixed with the source file name for multi-file following
- The script uses polling (500ms interval) for reliable cross-platform support
