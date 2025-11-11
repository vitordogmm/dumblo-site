// Netlify Function: Retorna dados do dashboard a partir do Firestore
// GET /.netlify/functions/dashboard-data?userId=<discord_id>

let admin;
let db;

function initAdmin(){
  if(db) return db;
  try{
    admin = require('firebase-admin');
    if(!admin.apps.length){
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      if(privateKey && privateKey.includes('\n')){
        // Netlify armazena chave com \n; converter
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      if(projectId && clientEmail && privateKey){
        admin.initializeApp({
          credential: admin.credential.cert({ project_id: projectId, client_email: clientEmail, private_key: privateKey })
        });
      }
    }
    db = admin.firestore();
    return db;
  }catch(e){
    return null;
  }
}

async function getDashboardData(userId){
  const database = initAdmin();
  if(!database){
    // Modo demo: retorna estrutura simulada quando não configurado
    return {
      source: 'demo',
      user: { 
        status: 'online',
        stats: { nível: 12, força: 18, sorte: 9, agilidade: 14 },
        inventory: [ { name:'Poção de Cura', qty:3 }, { name:'Espada de Ferro', qty:1 } ]
      },
      guilds: [
        { id: '123', name: 'Servidor A', memberCount: 152 },
        { id: '456', name: 'Servidor B', memberCount: 87 }
      ]
    };
  }

  // Tente múltiplos caminhos de coleção conforme convenções comuns
  const userPaths = [
    database.collection('players').doc(userId),
    database.collection('profiles').doc(userId),
    database.collection('users').doc(userId)
  ];
  let userDoc = null;
  for(const ref of userPaths){
    const snap = await ref.get();
    if(snap && snap.exists){ userDoc = snap.data(); break; }
  }

  // Complementar email a partir de coleção de usuários OAuth, se existir
  try{
    if(!userDoc || !userDoc.email){
      const uSnap = await database.collection('dumblo_users').doc(userId).get();
      if(uSnap && uSnap.exists){
        const uData = uSnap.data()||{};
        userDoc = { ...(userDoc||{}), email: uData.email || userDoc?.email };
      }
    }
  }catch(e){ /* ignore */ }

  // Inventário: pode estar embutido em players ou em uma coleção separada
  let inventoryDoc = null;
  try{
    // Priorizar coleção 'inventory' (pedido do usuário), com fallback para 'inventories'
    const invSnap1 = await database.collection('inventory').doc(userId).get();
    if(invSnap1 && invSnap1.exists){ inventoryDoc = invSnap1.data(); }
    else{
      const invSnap2 = await database.collection('inventories').doc(userId).get();
      if(invSnap2 && invSnap2.exists){ inventoryDoc = invSnap2.data(); }
      else{
        // Fallback: subcoleção inventory/items
        try{
          const itemsColl = await database.collection('inventory').doc(userId).collection('items').get();
          if(itemsColl && itemsColl.size){
            const items = itemsColl.docs.map(d=>({ id:d.id, ...(d.data()||{}) }));
            inventoryDoc = { items };
          }
        }catch{/* ignore */}
      }
    }
  }catch(e){ /* ignore */ }

  // Histórico de estatísticas: tentar campo ou subcoleção
  let statsHistory = null;
  try{
    if(userDoc && userDoc.stats_history){ statsHistory = userDoc.stats_history; }
    else{
      const histSnap = await database.collection('players').doc(userId).collection('stats_history').doc('latest').get();
      if(histSnap && histSnap.exists){ statsHistory = histSnap.data(); }
    }
  }catch(e){ /* ignore */ }

  // Guilds: onde o bot está e o usuário também (assume fields: hasBot=true, members array-contains userId)
  let guilds = [];
  try{
    const qs = await database.collection('guilds').where('members','array_contains',userId).limit(50).get();
    guilds = qs.docs.map(d => {
      const g = d.data()||{};
      const memberCount = typeof g.memberCount === 'number' ? g.memberCount : (Array.isArray(g.members) ? g.members.length : undefined);
      // joinedAt e roles específicos do usuário, caso existam mapas por usuário
      const joinedAt = (g.joins && g.joins[userId]) || (g.membersData && g.membersData[userId] && g.membersData[userId].joinedAt) || null;
      const roles = (g.rolesByUser && g.rolesByUser[userId]) || (g.userRoles && g.userRoles[userId]) || [];
      return { id: d.id, name: g.name, hasBot: !!g.hasBot, memberCount, joinedAt, roles };
    });
  }catch(e){ guilds = []; }

  const payload = {
    source: 'firestore',
    user: {
      ...(userDoc || {}),
      inventory: (inventoryDoc && inventoryDoc.items) ? inventoryDoc.items : (userDoc && userDoc.inventory ? userDoc.inventory : []),
      stats_history: statsHistory || null
    },
    guilds
  };
  return payload;
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers };
  try{
    const userId = (event.queryStringParameters||{}).userId;
    if(!userId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId obrigatório' }) };
    const data = await getDashboardData(userId);
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  }catch(e){
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro interno', detail: String(e) }) };
  }
};
