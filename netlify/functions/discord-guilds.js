// Netlify Function: retorna guilds do usuário via OAuth (escopo guilds)
// GET /.netlify/functions/discord-guilds?userId=<discord_id>
// Headers: Authorization: Bearer <access_token>

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

// Fallback simples de fetch para ambientes Node antigos
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

// Cache simples em memória por userId (TTL curto)
const cache = {};
const TTL_MS = 5 * 60 * 1000; // 5 minutos

async function getUserGuilds(accessToken){
  const doFetch = (typeof fetch === 'function') ? fetch : nodeFetch;
  const res = await doFetch('https://discord.com/api/users/@me/guilds', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const json = await res.json();
  if(!res.ok){ throw new Error(`Discord /users/@me/guilds HTTP ${res.status}: ${JSON.stringify(json)}`); }
  return Array.isArray(json) ? json : [];
}

async function getBotPresenceAndCounts(guildId, userId, botToken){
  const doFetch = (typeof fetch === 'function') ? fetch : nodeFetch;
  // Checar presença do bot e contar membros
  let hasBot = false; let memberCount = undefined; let joinedAt = null; let roles = [];
  if(!botToken){ return { hasBot, memberCount, joinedAt, roles }; }
  try{
    const gRes = await doFetch(`https://discord.com/api/guilds/${guildId}?with_counts=true`, {
      headers: { 'Authorization': `Bot ${botToken}` }
    });
    if(gRes.ok){
      hasBot = true;
      const gJson = await gRes.json();
      memberCount = gJson.approximate_member_count || gJson.member_count;
    }
  }catch{/* ignore */}
  // joinedAt e roles do usuário (requer intenções e o bot no guild)
  if(hasBot){
    try{
      const mRes = await doFetch(`https://discord.com/api/guilds/${guildId}/members/${userId}`, {
        headers: { 'Authorization': `Bot ${botToken}` }
      });
      if(mRes.ok){
        const mJson = await mRes.json();
        joinedAt = mJson.joined_at || null;
        roles = Array.isArray(mJson.roles) ? mJson.roles : [];
      }
    }catch{/* ignore */}
  }
  return { hasBot, memberCount, joinedAt, roles };
}

async function enhanceGuilds(guilds, userId, botToken){
  const out = [];
  // limitar concorrência
  const limit = 4; let i = 0;
  async function next(){
    if(i >= guilds.length) return;
    const item = guilds[i++];
    const details = await getBotPresenceAndCounts(item.id, userId, botToken);
    out.push({ id: item.id, name: item.name, icon: item.icon, hasBot: details.hasBot, memberCount: details.memberCount, joinedAt: details.joinedAt, roles: details.roles });
    return next();
  }
  const workers = Array.from({ length: Math.min(limit, guilds.length) }, ()=> next());
  await Promise.all(workers);
  return out;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  try{
    const userId = (event.queryStringParameters||{}).userId;
    if(!userId) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'userId obrigatório' }) };
    const auth = event.headers.authorization || event.headers.Authorization;
    if(!auth || !auth.startsWith('Bearer ')){
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Authorization Bearer necessário' }) };
    }
    const accessToken = auth.slice('Bearer '.length).trim();
    const now = Date.now();
    const cached = cache[userId];
    if(cached && (now - cached.ts) < TTL_MS){
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ source: 'cache', guilds: cached.data }) };
    }
    const botToken = process.env.DISCORD_BOT_TOKEN; // opcional: presença e contagem
    const baseGuilds = await getUserGuilds(accessToken);
    const enhanced = await enhanceGuilds(baseGuilds, userId, botToken);
    cache[userId] = { ts: Date.now(), data: enhanced };
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ source: 'discord', guilds: enhanced }) };
  }catch(err){
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Erro ao obter guilds', detail: String(err) }) };
  }
};

