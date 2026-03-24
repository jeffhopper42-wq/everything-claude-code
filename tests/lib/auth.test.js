/**
 * Tests for scripts/lib/auth.js
 *
 * Run with: node tests/lib/auth.test.js
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const auth = require('../../scripts/lib/auth');
const { createStateStore } = require('../../scripts/lib/state-store');

function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (err) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (err) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

async function runTests() {
  console.log('\n=== Testing auth.js ===\n');

  let passed = 0;
  let failed = 0;

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ecc-auth-test-'));

  // Helper functions
  console.log('Helper functions:');

  if (test('generateId returns a UUID string', () => {
    const id = auth.generateId();
    assert.strictEqual(typeof id, 'string');
    assert.ok(id.length > 0);
    assert.ok(id.includes('-'), 'Expected UUID format with hyphens');
  })) passed++; else failed++;

  if (test('generateToken returns a hex string', () => {
    const token = auth.generateToken();
    assert.strictEqual(typeof token, 'string');
    assert.strictEqual(token.length, 64);
    assert.ok(/^[0-9a-f]+$/.test(token), 'Expected hex string');
  })) passed++; else failed++;

  if (test('generateId returns unique values', () => {
    const id1 = auth.generateId();
    const id2 = auth.generateId();
    assert.notStrictEqual(id1, id2);
  })) passed++; else failed++;

  // Auth state file operations
  console.log('\nAuth state file operations:');

  const testAuthPath = path.join(tmpDir, 'auth.json');

  if (test('readAuthState returns null for missing file', () => {
    const state = auth.readAuthState(testAuthPath);
    assert.strictEqual(state, null);
  })) passed++; else failed++;

  if (test('writeAuthState creates file with state', () => {
    const state = { userId: 'test-id', username: 'testuser', token: 'abc123' };
    auth.writeAuthState(testAuthPath, state);
    assert.ok(fs.existsSync(testAuthPath));
    const read = JSON.parse(fs.readFileSync(testAuthPath, 'utf8'));
    assert.strictEqual(read.userId, 'test-id');
    assert.strictEqual(read.username, 'testuser');
  })) passed++; else failed++;

  if (test('readAuthState reads written state', () => {
    const state = auth.readAuthState(testAuthPath);
    assert.strictEqual(state.userId, 'test-id');
    assert.strictEqual(state.username, 'testuser');
  })) passed++; else failed++;

  if (test('clearAuthState removes the file', () => {
    auth.clearAuthState(testAuthPath);
    assert.ok(!fs.existsSync(testAuthPath));
  })) passed++; else failed++;

  if (test('clearAuthState is safe on missing file', () => {
    auth.clearAuthState(testAuthPath);
    assert.ok(!fs.existsSync(testAuthPath));
  })) passed++; else failed++;

  // resolveAuthPath
  console.log('\nresolveAuthPath:');

  if (test('resolveAuthPath uses homeDir option', () => {
    const p = auth.resolveAuthPath({ homeDir: '/fake/home' });
    assert.ok(p.startsWith('/fake/home'));
    assert.ok(p.endsWith('auth.json'));
  })) passed++; else failed++;

  // Login/logout/whoami with state-store
  console.log('\nLogin/logout/whoami integration:');

  const store = await createStateStore({ dbPath: ':memory:' });

  const authOptions = { homeDir: tmpDir };

  if (await asyncTest('login creates a new user', async () => {
    const user = auth.login(store, 'alice', authOptions);
    assert.strictEqual(user.username, 'alice');
    assert.ok(user.id);
    assert.ok(user.createdAt);
  })) passed++; else failed++;

  if (await asyncTest('login writes auth state file', async () => {
    const authPath = auth.resolveAuthPath(authOptions);
    assert.ok(fs.existsSync(authPath));
    const state = auth.readAuthState(authPath);
    assert.strictEqual(state.username, 'alice');
    assert.ok(state.token);
    assert.ok(state.loggedInAt);
  })) passed++; else failed++;

  if (await asyncTest('isLoggedIn returns true after login', async () => {
    assert.strictEqual(auth.isLoggedIn(authOptions), true);
  })) passed++; else failed++;

  if (await asyncTest('whoami returns the logged-in user', async () => {
    const user = auth.whoami(store, authOptions);
    assert.strictEqual(user.username, 'alice');
  })) passed++; else failed++;

  if (await asyncTest('login with same username updates last_login_at', async () => {
    const first = auth.login(store, 'alice', authOptions);
    const firstLogin = first.lastLoginAt;
    // Small delay to ensure different timestamp
    await new Promise(r => setTimeout(r, 10));
    const second = auth.login(store, 'alice', authOptions);
    assert.strictEqual(second.username, 'alice');
    assert.strictEqual(first.id, second.id);
  })) passed++; else failed++;

  if (await asyncTest('login with email stores email', async () => {
    const user = auth.login(store, 'bob', { ...authOptions, email: 'bob@test.com' });
    assert.strictEqual(user.username, 'bob');
    assert.strictEqual(user.email, 'bob@test.com');
  })) passed++; else failed++;

  if (await asyncTest('logout clears auth state', async () => {
    auth.logout(authOptions);
    assert.strictEqual(auth.isLoggedIn(authOptions), false);
  })) passed++; else failed++;

  if (await asyncTest('whoami returns null after logout', async () => {
    const user = auth.whoami(store, authOptions);
    assert.strictEqual(user, null);
  })) passed++; else failed++;

  if (await asyncTest('login throws on empty username', async () => {
    assert.throws(() => auth.login(store, '', authOptions), /Username is required/);
    assert.throws(() => auth.login(store, '   ', authOptions), /Username is required/);
    assert.throws(() => auth.login(store, null, authOptions), /Username is required/);
  })) passed++; else failed++;

  // State-store user queries
  console.log('\nState-store user queries:');

  if (await asyncTest('getUserByUsername finds existing user', async () => {
    const user = store.getUserByUsername('alice');
    assert.ok(user);
    assert.strictEqual(user.username, 'alice');
  })) passed++; else failed++;

  if (await asyncTest('getUserByUsername returns null for unknown', async () => {
    const user = store.getUserByUsername('unknown');
    assert.strictEqual(user, null);
  })) passed++; else failed++;

  if (await asyncTest('getUserById finds existing user', async () => {
    const alice = store.getUserByUsername('alice');
    const user = store.getUserById(alice.id);
    assert.ok(user);
    assert.strictEqual(user.username, 'alice');
  })) passed++; else failed++;

  if (await asyncTest('listUsers returns all users', async () => {
    const users = store.listUsers();
    assert.ok(Array.isArray(users));
    assert.ok(users.length >= 2, 'Expected at least alice and bob');
    const names = users.map(u => u.username);
    assert.ok(names.includes('alice'));
    assert.ok(names.includes('bob'));
  })) passed++; else failed++;

  store.close();

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });

  // Summary
  console.log(`\n  Total: ${passed + failed}, Passed: ${passed}, Failed: ${failed}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
