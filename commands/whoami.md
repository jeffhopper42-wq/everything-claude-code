---
description: Display the currently authenticated ECC user.
---

# Whoami Command

Show the current local user identity.

## Usage

`/whoami`

## How It Works

Reads `~/.claude/ecc/auth.json` and looks up the user in the state-store.

## Script

```bash
node -e "
const { createStateStore } = require((()=>{var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var p=require('path'),f=require('fs'),h=require('os').homedir(),d=p.join(h,'.claude'),q=p.join('scripts','lib','utils.js');if(f.existsSync(p.join(d,q)))return d;try{var b=p.join(d,'plugins','cache','everything-claude-code');for(var o of f.readdirSync(b))for(var v of f.readdirSync(p.join(b,o))){var c=p.join(b,o,v);if(f.existsSync(p.join(c,q)))return c}}catch(x){}return d})()+'/scripts/lib/state-store');
const auth = require((()=>{var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var p=require('path'),f=require('fs'),h=require('os').homedir(),d=p.join(h,'.claude'),q=p.join('scripts','lib','utils.js');if(f.existsSync(p.join(d,q)))return d;try{var b=p.join(d,'plugins','cache','everything-claude-code');for(var o of f.readdirSync(b))for(var v of f.readdirSync(p.join(b,o))){var c=p.join(b,o,v);if(f.existsSync(p.join(c,q)))return c}}catch(x){}return d})()+'/scripts/lib/auth');

async function main() {
  if (!auth.isLoggedIn()) {
    console.log('Not logged in. Use /login <username> to authenticate.');
    process.exit(0);
  }

  const store = await createStateStore();
  try {
    const user = auth.whoami(store);
    if (!user) {
      console.log('Session expired or user deleted. Use /login to re-authenticate.');
      process.exit(1);
    }

    console.log('Username:    ' + user.username);
    if (user.email) console.log('Email:       ' + user.email);
    console.log('User ID:     ' + user.id);
    console.log('Created:     ' + user.createdAt);
    if (user.lastLoginAt) console.log('Last login:  ' + user.lastLoginAt);
  } finally {
    store.close();
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
"
```

## Examples

```bash
/whoami
```
