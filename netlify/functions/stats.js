'use strict';

// Sem API própria: esta function apenas fornece dados via variáveis de ambiente
// e pode ser usada opcionalmente pelo frontend. Caso não exista, o site usa
// dados locais definidos em window.__STATS__.

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  const payload = {
    servers: parseInt(process.env.STATS_SERVERS || '276', 10),
    commands: parseInt(process.env.STATS_COMMANDS || '164', 10),
    users: parseInt(process.env.STATS_USERS || '67000', 10),
    lupins: parseInt(process.env.STATS_LUPINS || '280000000', 10)
  };

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json', ...cors },
    body: JSON.stringify(payload)
  };
};

