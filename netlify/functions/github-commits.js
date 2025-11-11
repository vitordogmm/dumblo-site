'use strict';

// Function pública que consulta a API do GitHub. Sem API interna — apenas proxy
// opcional para melhorar CORS/limites. O site também pode buscar direto do GitHub.

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  const params = event.queryStringParameters || {};
  const owner = params.owner || 'VitorDoGMM';
  const repo = params.repo || 'dumblo-site';

  const query = new URLSearchParams();
  if (params.per_page) query.set('per_page', params.per_page);
  if (params.page) query.set('page', params.page);
  if (params.since) query.set('since', params.since);
  if (params.until) query.set('until', params.until);

  const url = `https://api.github.com/repos/${owner}/${repo}/commits?${query.toString()}`;

  const headers = {
    'User-Agent': 'Dumblo-Site-Netlify-Function'
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const resp = await fetch(url, { headers });
    const data = await resp.json();
    return {
      statusCode: resp.status,
      headers: { 'content-type': 'application/json', ...cors },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json', ...cors },
      body: JSON.stringify({ error: 'Failed to fetch commits', message: String(err) })
    };
  }
};

