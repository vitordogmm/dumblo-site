// Netlify Function: Proxy para commits do GitHub
// Uso: /.netlify/functions/github-commits?owner=<owner>&repo=<repo>&since=<iso>&until=<iso>&per_page=50

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const params = event.queryStringParameters || {};
    const owner = params.owner;
    const repo = params.repo;
    const per_page = params.per_page || '50';
    const since = params.since;
    const until = params.until;

    if (!owner || !repo) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'owner e repo são obrigatórios' }) };
    }

    const qp = new URLSearchParams();
    if (per_page) qp.set('per_page', per_page);
    if (since) qp.set('since', since);
    if (until) qp.set('until', until);

    const url = `https://api.github.com/repos/${owner}/${repo}/commits?${qp.toString()}`;

    const ghHeaders = { 'User-Agent': 'DumbloSite/1.0' };
    // Opcional: autenticação via token para evitar rate limit (defina GITHUB_TOKEN em Netlify)
    const token = process.env.GITHUB_TOKEN;
    if (token) ghHeaders['Authorization'] = `Bearer ${token}`;

    const resp = await fetch(url, { headers: ghHeaders });
    const data = await resp.json();
    const status = resp.status;

    // Normaliza uma resposta em caso de erro no GitHub
    if (status >= 400) {
      return { statusCode: status, headers, body: JSON.stringify({ error: 'Falha ao obter commits', detail: data }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno', detail: String(e) }) };
  }
};
