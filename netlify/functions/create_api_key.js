// netlify/functions/create_api_key.js
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Env vars:
// DATABASE_URL
// NDUS_ENCRYPTION_KEY
// ADMIN_SECRET (HTTP header x-admin-secret must match)

const PG_CONN =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DB_URL ||
  process.env.NETLIFY_DATABASE_URL;
const ENC_KEY = process.env.NDUS_ENCRYPTION_KEY;
const ADMIN_SECRET = process.env.ADMIN_SECRET;

function encryptNdus(plainText, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'utf8'), iv);
  const ciphertext = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

function randomId(len = 10) {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}
function randomSecret(len = 24) {
  return crypto.randomBytes(len).toString('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const provided = event.headers['x-admin-secret'] || event.headers['X-Admin-Secret'] || '';
  if (provided !== ADMIN_SECRET) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const body = JSON.parse(event.body || '{}');
  const { name, ndus_plain } = body;
  if (!ndus_plain) {
    return { statusCode: 400, body: JSON.stringify({ error: 'ndus_plain is required' }) };
  }

  if (!PG_CONN || !ENC_KEY) {
    console.error('Missing DB or ENC key');
    return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration' }) };
  }

  const client = new Client({ connectionString: PG_CONN, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const apiKeyId = randomId(10);
  const apiKeySecret = randomSecret(24);
  const hash = await bcrypt.hash(apiKeySecret, 10);
  const ndusEncrypted = encryptNdus(ndus_plain, ENC_KEY);

  const insertQ = `INSERT INTO api_clients (api_key_id, name, api_key_hash, ndus_encrypted, is_disabled, created_at) VALUES ($1,$2,$3,$4,false,now()) RETURNING id`;
  await client.query(insertQ, [apiKeyId, name || null, hash, ndusEncrypted]);

  await client.end();

  return {
    statusCode: 200,
    body: JSON.stringify({ api_key_id: apiKeyId, api_key_secret: apiKeySecret })
  };
};
