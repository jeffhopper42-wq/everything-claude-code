---
description: Log in to ECC with a local username.
---

# Login Command

Authenticate as a local user. Creates the user in the state-store if they don't exist.

## Usage

`/login <username> [--email <email>]`

## How It Works

1. Looks up the username in the local state-store
2. Creates a new user record if the username is new
3. Updates `last_login_at` for returning users
4. Writes session state to `~/.claude/ecc/auth.json`

## Script

```bash
node -e "
const { createStateStore } = require((()=>{var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var p=require('path'),f=require('fs'),h=require('os').homedir(),d=p.join(h,'.claude'),q=p.join('scripts','lib','utils.js');if(f.existsSync(p.join(d,q)))return d;try{var b=p.join(d,'plugins','cache','everything-claude-code');for(var o of f.readdirSync(b))for(var v of f.readdirSync(p.join(b,o))){var c=p.join(b,o,v);if(f.existsSync(p.join(c,q)))return c}}catch(x){}return d})()+'/scripts/lib/state-store');
const auth = require((()=>{var e=process.env.CLAUDE_PLUGIN_ROOT;if(e&&e.trim())return e.trim();var p=require('path'),f=require('fs'),h=require('os').homedir(),d=p.join(h,'.claude'),q=p.join('scripts','lib','utils.js');if(f.existsSync(p.join(d,q)))return d;try{var b=p.join(d,'plugins','cache','everything-claude-code');for(var o of f.readdirSync(b))for(var v of f.readdirSync(p.join(b,o))){var c=p.join(b,o,v);if(f.existsSync(p.join(c,q)))return c}}catch(x){}return d})()+'/scripts/lib/auth');

async function main() {
  const args = process.argv.slice(1);
  const username = args.find(a => !a.startsWith('--'));
  const emailIdx = args.indexOf('--email');
  const email = emailIdx >= 0 ? args[emailIdx + 1] : null;

  if (!username) {
    console.log('Usage: /login <username> [--email <email>]');
    process.exit(1);
  }

  const store = await createStateStore();
  try {
    const user = auth.login(store, username, { email });
    console.log('Logged in as: ' + user.username);
    if (user.email) console.log('Email: ' + user.email);
    console.log('User ID: ' + user.id);
  } finally {
    store.close();
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
" $ARGUMENTS
```

## Examples

```bash
/login alice
/login alice --email alice@example.com
```
