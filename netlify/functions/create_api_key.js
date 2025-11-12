// netlify/functions/create_api_key.js
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Env vars:
// DATABASE_URL (optional fallback)
// NETLIFY_DB_URL (optional fallback)
// NETLIFY_DATABASE_URL (auto-provided by Netlify for Neon pooled)
// NDUS_ENCRYPTION_KEY
// ADMIN_SECRET (HTTP header x-admin-secret must match)

const PG_CONN =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DB_URL ||
  process.env.NETLIFY_DATABASE_URL;
const ENC_KEY = process.env.NDUS_ENCRYPTION_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// --- Key derivation + AES-GCM helpers ---
// Accepts:
//  - 64-char hex string (preferred)
//  - base64 (32 bytes)
//  - any passphrase (will derive 32 bytes via sha256)
function deriveKeyFromEnv(keyStr) {
  if (!keyStr) throw new Error('NDUS_ENCRYPTION_KEY not set');
  // hex 64 chars
  if (/^[0-9a-fA-F]{64}$/.test(keyStr)) {
    return Buffer.from(keyStr, 'hex'); // 32 bytes
  }
  // try base64
  try {
    const b = Buffer.from(keyStr, 'base64');
    if (b.length === 32) return b;
  } catch (e) {
    // ignore
  }
  // fallback: derive via sha256
  return crypto.createHash('sha256').update(keyStr).digest();
}

// encrypt: returns base64(iv + authTag + ciphertext)
function encryptNdus(plainText, envKey) {
  const key = deriveKeyFromEnv(envKey);
  if (key.length !== 32) throw new Error('Derived key is not 32 bytes');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

// --- util helpers ---
function randomId(len = 10) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}
function randomSecret(len = 24) {
  return crypto.randomBytes(len).toString('hex');
}

// safe JSON parse that returns null on invalid JSON
function safeJsonParse(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const provided = (event.headers && (event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'])) || '';
    if (provided !== ADMIN_SECRET) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const body = safeJsonParse(event.body || '{}');
    if (body === null) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    const { name, ndus_plain } = body;
    if (!ndus_plain) {
      return { statusCode: 400, body: JSON.stringify({ error: 'ndus_plain is required' }) };
    }

    if (!PG_CONN || !ENC_KEY) {
      console.error('Missing DB connection or NDUS_ENCRYPTION_KEY');
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration' }) };
    }

    // connect to DB
    const client = new Client({ connectionString: PG_CONN, ssl: { rejectUnauthorized: false } });
    await client.connect();

    const apiKeyId = randomId(10);
    const apiKeySecret = randomSecret(24);
    const hash = await bcrypt.hash(apiKeySecret, 10);

    let ndusEncrypted;
    try {
      ndusEncrypted = encryptNdus(ndus_plain, ENC_KEY);
    } catch (err) {
      console.error('Encryption failed:', err && err.message ? err.message : err);
      await client.end();
      return { statusCode: 500, body: JSON.stringify({ error: 'Encryption error' }) };
    }

    const insertQ = `INSERT INTO api_clients (api_key_id, name, api_key_hash, ndus_encrypted, is_disabled, created_at) VALUES ($1,$2,$3,$4,false,now()) RETURNING id`;
    await client.query(insertQ, [apiKeyId, name || null, hash, ndusEncrypted]);

    await client.end();

    return {
      statusCode: 200,
      body: JSON.stringify({ api_key_id: apiKeyId, api_key_secret: apiKeySecret })
    };
  } catch (err) {
    console.error('create_api_key error', err && err.stack ? err.stack : err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};
