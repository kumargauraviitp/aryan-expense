/**
 * Build-time environment variable injector for Vercel/Production
 * Reads process.env.SUPABASE_URL and process.env.SUPABASE_ANON_KEY
 * Generates temporary env-config.js during build (ignored by git).
 */
const fs = require('fs');
const path = require('path');

const url = process.env.SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || '';

if (url && anonKey) {
  const target = path.join(__dirname, '..', 'env-config.js');
  const code = `// Runtime environment injected dynamically during Vercel build
window.__ENV__ = {
  SUPABASE_URL: ${JSON.stringify(url.trim())},
  SUPABASE_ANON_KEY: ${JSON.stringify(anonKey.trim())}
};
`;
  fs.writeFileSync(target, code, 'utf8');
  console.log('✓ Successfully generated runtime env-config.js from environment variables.');
} else {
  console.log('ℹ No build-time SUPABASE_URL/SUPABASE_ANON_KEY found in process.env. Using runtime .env.local loader.');
}
