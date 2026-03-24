---
description: Log out of the current ECC session.
---

# Logout Command

Clear the current local authentication session.

## Usage

`/logout`

## How It Works

Removes the auth state file at `~/.claude/ecc/auth.json`.

## Script

```bash
node -e "
const auth = require((()=>{var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var p=require('path'),f=require('fs'),h=require('os').homedir(),d=p.join(h,'.claude'),q=p.join('scripts','lib','utils.js');if(f.existsSync(p.join(d,q)))return d;try{var b=p.join(d,'plugins','cache','everything-claude-code');for(var o of f.readdirSync(b))for(var v of f.readdirSync(p.join(b,o))){var c=p.join(b,o,v);if(f.existsSync(p.join(c,q)))return c}}catch(x){}return d})()+'/scripts/lib/auth');

if (!auth.isLoggedIn()) {
  console.log('Not currently logged in.');
  process.exit(0);
}

auth.logout();
console.log('Logged out successfully.');
"
```

## Examples

```bash
/logout
```
