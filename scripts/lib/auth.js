'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const AUTH_STATE_RELATIVE_PATH = path.join('.claude', 'ecc', 'auth.json');

function resolveAuthPath(options = {}) {
  const homeDir = options.homeDir || process.env.HOME || os.homedir();
  return path.join(homeDir, AUTH_STATE_RELATIVE_PATH);
}

function generateId() {
  return crypto.randomUUID();
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function readAuthState(authPath) {
  if (!fs.existsSync(authPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(authPath, 'utf8'));
  } catch (_error) {
    return null;
  }
}

function writeAuthState(authPath, state) {
  fs.mkdirSync(path.dirname(authPath), { recursive: true });
  fs.writeFileSync(authPath, JSON.stringify(state, null, 2), 'utf8');
}

function clearAuthState(authPath) {
  if (fs.existsSync(authPath)) {
    fs.unlinkSync(authPath);
  }
}

function login(store, username, options = {}) {
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    throw new Error('Username is required');
  }

  const trimmed = username.trim();
  const authPath = resolveAuthPath(options);
  let user = store.getUserByUsername(trimmed);

  if (!user) {
    const id = generateId();
    user = store.upsertUser({
      id,
      username: trimmed,
      email: options.email || null,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    });
  } else {
    user = store.touchUserLogin(user.id);
  }

  const token = generateToken();
  writeAuthState(authPath, {
    userId: user.id,
    username: user.username,
    token,
    loggedInAt: new Date().toISOString(),
  });

  return user;
}

function logout(options = {}) {
  const authPath = resolveAuthPath(options);
  clearAuthState(authPath);
}

function whoami(store, options = {}) {
  const authPath = resolveAuthPath(options);
  const state = readAuthState(authPath);

  if (!state || !state.userId) {
    return null;
  }

  return store.getUserById(state.userId);
}

function isLoggedIn(options = {}) {
  const authPath = resolveAuthPath(options);
  const state = readAuthState(authPath);
  return state !== null && state.userId !== undefined;
}

module.exports = {
  AUTH_STATE_RELATIVE_PATH,
  clearAuthState,
  generateId,
  generateToken,
  isLoggedIn,
  login,
  logout,
  readAuthState,
  resolveAuthPath,
  whoami,
  writeAuthState,
};
