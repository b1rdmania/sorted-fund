/**
 * Generate bcrypt hash for a password
 * Usage: ts-node src/scripts/hash-password.ts <password>
 */

import bcrypt from 'bcrypt';

const password = process.argv[2] || 'demo123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    process.exit(1);
  }

  console.log(`Password: ${password}`);
  console.log(`Hash: ${hash}`);
  process.exit(0);
});
