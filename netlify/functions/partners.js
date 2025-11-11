'use strict';

// Function pública que retorna a lista de parceiros a partir de PARTNERS_JSON
// (ou um fallback). O site funciona sem isso usando window.__PARTNERS__.

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization'
};

function parsePartnersFromEnv() {
  try {
    if (process.env.PARTNERS_JSON) {
      const parsed = JSON.parse(process.env.PARTNERS_JSON);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.partners)) return parsed.partners;
    }
  } catch (_) {}
  return null;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  const fallback = [
    { name: 'Servidor Parceiro A', invite: '#', icon: 'https://cdn.discordapp.com/embed/avatars/0.png' },
    { name: 'Servidor Parceiro B', invite: '#', icon: 'https://cdn.discordapp.com/embed/avatars/1.png' }
  ];

  const partners = parsePartnersFromEnv() || fallback;

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json', ...cors },
    body: JSON.stringify({ partners })
  };
};

