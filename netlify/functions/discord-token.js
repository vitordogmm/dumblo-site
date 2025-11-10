// Netlify Function: troca o code por token e retorna o usuário
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// Fallback simples de fetch para ambientes Node antigos (ex.: Node 16)
function nodeFetch(url, opts = {}){
  const https = require('https');
  return new Promise((resolve, reject)=>{
    const u = new URL(url);
    const options = {
      method: opts.method || 'GET',
      headers: opts.headers || {},
    };
    const req = https.request(u, options, (res)=>{
      let data = '';
      res.on('data', (chunk)=> data += chunk);
      res.on('end', ()=>{
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: async ()=>{ try{ return JSON.parse(data || '{}'); }catch{ return {}; } },
          text: async ()=> data
        });
      });
    });
    req.on('error', reject);
    if (opts.body) req.write(typeof opts.body === 'string' ? opts.body : String(opts.body));
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }
  try {
    const { code, redirect_uri } = JSON.parse(event.body || '{}');
    if (!code) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing code' }) };
    }
    const client_id = process.env.DISCORD_CLIENT_ID;
    const client_secret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = redirect_uri || process.env.DISCORD_REDIRECT_URI;
    if (!client_id || !client_secret) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Missing OAuth client configuration' }) };
    }
    const form = new URLSearchParams({
      client_id,
      client_secret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    });
    const doFetch = (typeof fetch === 'function') ? fetch : nodeFetch;
    const tokenRes = await doFetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form
    });
    const tokenJson = await tokenRes.json();
    if (!tokenRes.ok) {
      return { statusCode: tokenRes.status, headers: corsHeaders, body: JSON.stringify(tokenJson) };
    }
    const { access_token, token_type } = tokenJson;
    const userRes = await doFetch('https://discord.com/api/users/@me', {
      headers: { 'Authorization': `${token_type} ${access_token}` }
    });
    const userJson = await userRes.json();
    if (!userRes.ok) {
      return { statusCode: userRes.status, headers: corsHeaders, body: JSON.stringify(userJson) };
    }
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ user: userJson })
    };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Server error', detail: String(err) }) };
  }
};
