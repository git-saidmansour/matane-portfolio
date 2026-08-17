#!/usr/bin/env node
// Generates an ADMIN_PASSWORD_HASH value for the admin dashboard.
// Usage: node scripts/hash-password.mjs "ton-mot-de-passe"
import { scryptSync, randomBytes } from 'node:crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "ton-mot-de-passe"');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
console.log(`${salt.toString('hex')}:${hash.toString('hex')}`);
