// Netlify Function: detalhes de um guild específico
// GET /.netlify/functions/discord-guild-info?guildId=<id>&userId=<discord_id>
// Headers: Authorization: Bearer <access_token>

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

function nodeFetch(url, opts = {}){
  const https = require('https');
  return new Promise((resolve, reject)=>{
    const u = new URL(url);
    const options = { method: opts.method || 'GET', headers: opts.headers || {} };
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

const cache = {}; // por guildId
const TTL_MS = 5 * 60 * 1000; // 5 minutos

async function getGuildBase(guildId, botToken){
  const doFetch = (typeof fetch === 'function') ? fetch : nodeFetch;
  const res = await doFetch(`https://discord.com/api/guilds/${guildId}?with_counts=true`, {
    headers: { 'Authorization': `Bot ${botToken}` }
  });
  const json = await res.json();
  if(!res.ok){ throw new Error(`Discord /guilds/${guildId} HTTP ${res.status}: ${JSON.stringify(json)}`); }
  return json;
}

async function getGuildMember(guildId, userId, botToken){
  const doFetch = (typeof fetch === 'function') ? fetch : nodeFetch;
  const res = await doFetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
    headers: { 'Authorization': `Bot ${botToken}` }
  });
  if(!res.ok){ return null; }
  return res.json();
}

async function getGuildRoles(guildId, botToken){
  const doFetch = (typeof fetch === 'function') ? fetch : nodeFetch;
  const res = await doFetch(`https://discord.com/api/guilds/${guildId}/roles`, {
    headers: { 'Authorization': `Bot ${botToken}` }
  });
  if(!res.ok){ return []; }
  const roles = await res.json();
  return Array.isArray(roles) ? roles.map(r=>({ id: r.id, name: r.name })) : [];
}

async function getGuildChannels(guildId, botToken){
  const doFetch = (typeof fetch === 'function') ? fetch : nodeFetch;
  const res = await doFetch(`https://discord.com/api/guilds/${guildId}/channels`, {
    headers: { 'Authorization': `Bot ${botToken}` }
  });
  if(!res.ok){ return []; }
  const chans = await res.json();
  return Array.isArray(chans) ? chans.map(c=>({ id: c.id, name: c.name, type: c.type })) : [];
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  try{
    const guildId = (event.queryStringParameters||{}).guildId;
    const userId = (event.queryStringParameters||{}).userId || null;
    if(!guildId){ return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'guildId obrigatório' }) }; }
    const botToken = process.env.DISCORD_BOT_TOKEN;
    if(!botToken){ return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'DISCORD_BOT_TOKEN ausente' }) }; }

    const now = Date.now();
    const cached = cache[guildId];
    if(cached && (now - cached.ts) < TTL_MS){
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ source: 'cache', guild: cached.data }) };
    }

    const base = await getGuildBase(guildId, botToken);
    const member = userId ? await getGuildMember(guildId, userId, botToken) : null;
    const roles = await getGuildRoles(guildId, botToken);
    const channels = await getGuildChannels(guildId, botToken);

    const payload = {
      id: base.id,
      name: base.name,
      icon: base.icon,
      memberCount: base.approximate_member_count || base.member_count,
      joinedAt: member && member.joined_at ? member.joined_at : null,
      roles,
      channels
    };
    cache[guildId] = { ts: Date.now(), data: payload };
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ source: 'discord', guild: payload }) };
  }catch(err){
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Erro ao obter guild info', detail: String(err) }) };
  }
};

