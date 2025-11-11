// Netlify Function: Discord OAuth -> troca code por token e retorna /users/@me
// Requer variáveis de ambiente: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  try {
    const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, OAUTH_REDIRECT_URI } = process.env;
    const qs = new URLSearchParams(event.queryStringParameters || {});
    const code = qs.get('code');
    const redirectUri = qs.get('redirect_uri') || OAUTH_REDIRECT_URI;
    if (!code) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'missing_code' }) };
    }
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'missing_env' }) };
    }

    // Troca code por token
    const tokenBody = new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    });

    const tokenResp = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString()
    });
    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'token_error', details: errText }) };
    }
    const token = await tokenResp.json();
    const access = token.access_token;
    if (!access) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'no_access_token' }) };
    }

    // Busca dados do usuário
    const meResp = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access}` }
    });
    if (!meResp.ok) {
      const errText = await meResp.text();
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'user_error', details: errText }) };
    }
    const user = await meResp.json();

    // Monta avatar_url amigável (se houver avatar)
    const avatar_url = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
      : 'https://cdn.discordapp.com/embed/avatars/0.png';

    const safeUser = {
      id: user.id,
      username: user.username,
      global_name: user.global_name,
      discriminator: user.discriminator,
      avatar: user.avatar,
      avatar_url
    };

    return { statusCode: 200, headers, body: JSON.stringify({ user: safeUser }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'server_error', details: String(err) }) };
  }
};

