// netlify/functions/download.js
// Modified to use server-side ndus from DB mapped to api_key_id + api_key_secret

const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DEFAULT_COOKIE = "ndus=Y2YqaCTteHuiU3Ud_MYU7vHoVW4DNBi0MPmg_1tQ" // Fallback cookie

function getHeaders(cookie) {
  return {
    "Accept": "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
    "Connection": "keep-alive",
    "DNT": "1",
    "Host": "www.1024terabox.com",
    "Upgrade-Insecure-Requests": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0",
    "sec-ch-ua": '"Microsoft Edge";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Cookie": cookie || DEFAULT_COOKIE,
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
  };
}

function getSize(sizeBytes) {
  if (sizeBytes >= 1024 * 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  } else if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (sizeBytes >= 1024) {
    return `${(sizeBytes / 1024).toFixed(2)} KB`;
  }
  return `${sizeBytes} bytes`;
}

function findBetween(str, start, end) {
  const startIndex = str.indexOf(start) + start.length;
  const endIndex = str.indexOf(end, startIndex);
  if (startIndex === -1 || endIndex === -1) return "";
  return str.slice(startIndex, endIndex);
}

// AES-256-GCM decrypt helper
// encryptedBase64 expected format: iv(12) + authTag(16) + ciphertext, base64 encoded
function decryptNdus(encryptedBase64, key) {
  const raw = Buffer.from(encryptedBase64, 'base64');
  if (raw.length < 28) throw new Error('Invalid encrypted payload');
  const iv = raw.slice(0, 12);
  const tag = raw.slice(12, 28);
  const ciphertext = raw.slice(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'utf8'), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

async function getFileInfo(link, event, cookie) {
  try {
    if (!link) {
      return { error: "Invalid request parameters." };
    }

    const headers = getHeaders(cookie);
    let response = await fetch(link, { headers });
    if (!response.ok) {
      console.error(`Failed to fetch initial link: ${response.status}`);
      return { error: "Unable to process the request. Please check your cookies and try again." };
    }

    const finalUrl = response.url;
    const url = new URL(finalUrl);
    const surl = url.searchParams.get("surl");
    if (!surl) {
      console.error("No surl found in URL");
      return { error: "Invalid link format. Please provide a valid TeraBox link." };
    }

    response = await fetch(finalUrl, { headers });
    const text = await response.text();

    const jsToken = findBetween(text, 'fn%28%22', '%22%29');
    const logid = findBetween(text, 'dp-logid=', '&');
    const bdstoken = findBetween(text, 'bdstoken":"', '"');

    if (!jsToken || !logid || !bdstoken) {
      console.error("Failed to extract tokens:", { jsToken: !!jsToken, logid: !!logid, bdstoken: !!bdstoken });
      return { error: "Authentication failed. Please check your cookies and try again." };
    }

    const params = new URLSearchParams({
      app_id: "250528",
      web: "1",
      channel: "dubox",
      clienttype: "0",
      jsToken: jsToken,
      "dp-logid": logid,
      page: "1",
      num: "20",
      by: "name",
      order: "asc",
      site_referer: finalUrl,
      shorturl: surl,
      root: "1,",
    });

    response = await fetch(`https://www.1024terabox.com/share/list?${params}`, { headers });
    const data = await response.json();

    if (!data || !data.list || !data.list.length || data.errno) {
      console.error("API error:", data.errno, data.errmsg);
      return { error: "Unable to retrieve file information. Please verify your cookies are valid." };
    }

    const fileInfo = data.list[0];
    const baseUrl = `https://${event.headers.host}`;
    
    return {
      file_name: fileInfo.server_filename || "",
      download_link: fileInfo.dlink || "",
      thumbnail: fileInfo.thumbs?.url3 || "",
      file_size: getSize(parseInt(fileInfo.size || 0)),
      size_bytes: parseInt(fileInfo.size || 0),
      proxy_url: `https://terabox.ashlynn.workers.dev/proxy?url=${encodeURIComponent(fileInfo.dlink)}&file_name=${encodeURIComponent(fileInfo.server_filename || 'download')}&cookie=${encodeURIComponent(cookie)}`,
    };
  } catch (error) {
    console.error("Error in getFileInfo:", error && error.message ? error.message : error);
    return { error: "A generic error occurred. Please try again." };
  }
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Expose-Headers": "Content-Length"
};

// DB & encryption env variables
// Set these in Netlify site environment variables
const PG_CONN = process.env.DATABASE_URL || process.env.NETLIFY_DB_URL;
const ENC_KEY = process.env.NDUS_ENCRYPTION_KEY; // must match key used to encrypt ndus in DB

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  // Only handle POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: JSON.stringify({ error: "Method not allowed. Use POST request." })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { link, api_key_id, api_key_secret } = body;
    
    if (!link) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: JSON.stringify({ error: "Missing required parameter: link" })
      };
    }

    if (!api_key_id || !api_key_secret) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: JSON.stringify({ error: "Missing required parameters: api_key_id and api_key_secret" })
      };
    }

    if (!PG_CONN || !ENC_KEY) {
      console.error('Missing DATABASE_URL or NDUS_ENCRYPTION_KEY env var');
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: JSON.stringify({ error: "Server misconfiguration" })
      };
    }

    // connect to DB
    const client = new Client({ connectionString: PG_CONN, ssl: { rejectUnauthorized: false } });
    await client.connect();

    // fetch by api_key_id (scalable)
    const q = 'SELECT id, api_key_hash, ndus_encrypted, is_disabled FROM api_clients WHERE api_key_id = $1';
    const res = await client.query(q, [api_key_id]);
    if (!res.rows || res.rows.length === 0) {
      await client.end();
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: JSON.stringify({ error: "Invalid API key id" })
      };
    }

    const row = res.rows[0];
    if (row.is_disabled) {
      await client.end();
      return {
        statusCode: 403,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: JSON.stringify({ error: "Account disabled" })
      };
    }

    const match = await bcrypt.compare(api_key_secret, row.api_key_hash);
    if (!match) {
      await client.end();
      return {
        statusCode: 401,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: JSON.stringify({ error: "Invalid API credentials" })
      };
    }

    // decrypt ndus
    let ndus;
    try {
      ndus = decryptNdus(row.ndus_encrypted, ENC_KEY);
    } catch (err) {
      console.error('Failed to decrypt ndus', err);
      await client.end();
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json", ...CORS_HEADERS },
        body: JSON.stringify({ error: "Server error decrypting credentials" })
      };
    }

    // update last_used_at asynchronously
    client.query('UPDATE api_clients SET last_used_at = now() WHERE id = $1', [row.id]).catch(e => console.error('update last_used error', e));

    // use decrypted ndus as cookie
    const cookie = `ndus=${ndus}`;

    // call existing parsing flow with server-side cookie
    const fileInfo = await getFileInfo(link, event, cookie);

    await client.end();

    return {
      statusCode: fileInfo.error ? 400 : 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: JSON.stringify(fileInfo)
    };
  } catch (error) {
    console.error("Download API error:", error && error.message ? error.message : error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS },
      body: JSON.stringify({ error: "Internal server error. Please try again." })
    };
  }
};

