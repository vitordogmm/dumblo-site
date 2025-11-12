'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization'
};

function parseJsonEnv(name){
  try{
    const raw = process.env[name];
    if(!raw) return null;
    const val = /^[A-Za-z0-9+/=]+$/.test(raw) ? Buffer.from(raw, 'base64').toString('utf8') : raw;
    return JSON.parse(val);
  }catch{ return null; }
}

function readCredentials(){
  const envJson = parseJsonEnv('GOOGLE_APPLICATION_CREDENTIALS_JSON');
  if(envJson && envJson.client_email && envJson.private_key && envJson.project_id) return envJson;
  const customPath = process.env.FIREBASE_CREDENTIALS_PATH || path.join(process.cwd(), 'credenciais.json');
  try{
    const txt = fs.readFileSync(customPath, 'utf8');
    const json = JSON.parse(txt);
    if(json && json.client_email && json.private_key && json.project_id) return json;
  }catch{}
  return null;
}

function makeJwt({ client_email, private_key, scope }){
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now()/1000);
  const payload = {
    iss: client_email,
    scope: scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  const base64url = (obj)=> Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  const segments = `${base64url(header)}.${base64url(payload)}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(segments);
  const signature = signer.sign(private_key).toString('base64').replace(/=+$/,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${segments}.${signature}`;
}

async function getAccessToken(creds){
  const assertion = makeJwt({ client_email: creds.client_email, private_key: creds.private_key, scope: 'https://www.googleapis.com/auth/datastore' });
  const r = await fetch('https://oauth2.googleapis.com/token',{
    method:'POST',
    headers:{ 'content-type':'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
  });
  if(!r.ok){ throw new Error('token'); }
  const j = await r.json();
  return j.access_token;
}

async function fetchPartnersFromFirestore(creds){
  const token = await getAccessToken(creds);
  const url = `https://firestore.googleapis.com/v1/projects/${creds.project_id}/databases/(default)/documents/patern-servers`;
  const r = await fetch(url, { headers:{ Authorization:`Bearer ${token}` } });
  if(!r.ok){ throw new Error('firestore'); }
  const data = await r.json();
  const docs = Array.isArray(data.documents) ? data.documents : [];
  return docs.map(d=>{
    const f = d.fields || {};
    const get = (v)=> (v && (v.stringValue || v.integerValue || v.doubleValue)) || '';
    return { serverName: get(f.serverName), serverIcon: get(f.serverIcon) };
  }).filter(x=> x.serverName || x.serverIcon);
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors, body: '' };
  }

  const fallback = [
    { serverName: 'Servidor Parceiro A', serverIcon: 'https://cdn.discordapp.com/embed/avatars/0.png' },
    { serverName: 'Servidor Parceiro B', serverIcon: 'https://cdn.discordapp.com/embed/avatars/1.png' }
  ];

  let partners = null;
  try{
    const creds = readCredentials();
    if(creds){ partners = await fetchPartnersFromFirestore(creds); }
  }catch{ partners = null; }
  if(!partners || !partners.length){ partners = fallback; }

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json', ...cors },
    body: JSON.stringify(Array.isArray(partners) ? partners : [])
  };
};
