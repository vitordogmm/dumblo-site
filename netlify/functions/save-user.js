// Netlify Function: salva dados do usuário no Firestore usando Service Account
// Fonte da credencial: SOMENTE variável de ambiente FIREBASE_SERVICE_ACCOUNT_JSON

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

let admin;
function initFirestore(){
  if (!admin) admin = require('firebase-admin');
  if (admin.apps && admin.apps.length) return admin.firestore();
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!envJson) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON não configurado');
  let serviceAccount;
  try { serviceAccount = JSON.parse(envJson); } catch (e) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON inválido: ' + String(e));
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  return admin.firestore();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
  }
  try {
    const { user } = JSON.parse(event.body || '{}');
    if (!user || !user.id) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing user payload' }) };
    }

    const db = initFirestore();
    const record = {
      discord_id: String(user.id),
      username: user.username || null,
      avatar: user.avatar || null,
      email: user.email || null,
      created_at: new Date().toISOString()
    };
    await db.collection('dumblo_users').doc(String(user.id)).set(record, { merge: true });
    return { statusCode: 201, headers: corsHeaders, body: '' };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: 'Server error', detail: String(err) }) };
  }
};
