const BOT_ID = "1435471760979136765";
const SUPPORT_SERVER_URL = "https://discord.com/invite/6daVxgAudS";

// --- Commands dataset (categorias: Utilidades, RPG) ---
const COMMANDS = [
  // Utilidades
  { name: "/help", cat: "Utilidades", icon: "📚", desc: "Abre a central de ajuda com links (Comandos, Termos, Servidor)." },
  { name: "/ping", cat: "Utilidades", icon: "📡", desc: "Exibe o status do bot e latências." },
  { name: "/botinfo", cat: "Utilidades", icon: "🤖", desc: "Veja informações sobre o bot.", new: true },
  // RPG
  { name: "/start", cat: "RPG", icon: "🌟", desc: "Cria seu personagem e inicia sua jornada." },
  { name: "/profile", cat: "RPG", icon: "🧙", desc: "Mostra o perfil do personagem (atributos, classe, progresso)." },
  { name: "/status", cat: "RPG", icon: "📈", desc: "Distribui pontos de status disponíveis via modal." },
  { name: "/aventura", cat: "RPG", icon: "🗺️", desc: "Inicie uma aventura pelo mundo mágico.", new: true },
  { name: "/daily", cat: "RPG", icon: "🗓️", desc: "Colete lupins diários.", new: true },
  { name: "/carteira", cat: "RPG", icon: "💰", desc: "Veja seus lupins.", new: true },
  { name: "/depositar", cat: "RPG", icon: "🏦", desc: "Deposite seus lupins no banco.", new: true },
  { name: "/sacar", cat: "RPG", icon: "💸", desc: "Saque seus lupins do banco.", new: true },
  { name: "/transferir", cat: "RPG", icon: "🔁", desc: "Transfira seus lupins a outros usuários.", new: true },
  { name: "/historico", cat: "RPG", icon: "📜", desc: "Exibe seu extrato de transações com paginação." },
];

function inviteUrl(id){
  return `https://discord.com/oauth2/authorize?client_id=${id}&permissions=2147576832&scope=bot%20applications.commands`;
}

// --- Toast helper ---
function ensureToastContainer(){
  if(typeof document === 'undefined') return null;
  let c = document.getElementById('toast');
  if(!c){
    c = document.createElement('div');
    c.id = 'toast';
    c.className = 'toast-container';
    c.setAttribute('aria-live','polite');
    c.setAttribute('aria-atomic','true');
    document.body.appendChild(c);
  }
  return c;
}

function escapeHtml(s){
  try{
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m]));
  }catch{ return String(s); }
}

function showToast(message, type = 'error', opts = {}){
  const duration = typeof opts.duration === 'number' ? opts.duration : 5000;
  const container = ensureToastContainer();
  if(!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type || ''}`;
  el.setAttribute('role','alert');
  el.innerHTML = `<span class="toast-message">${escapeHtml(message)}</span><button class="toast-close" aria-label="Fechar">×</button>`;
  container.appendChild(el);
  const remove = ()=>{ el.classList.add('toast-out'); setTimeout(()=>{ try{ el.remove(); }catch{} }, 200); };
  const btn = el.querySelector('.toast-close');
  if(btn) btn.addEventListener('click', remove);
  if(duration > 0) setTimeout(remove, duration);
}

// --- Discord OAuth (user sign-in) ---
const DISCORD_CLIENT_ID = BOT_ID;
const OAUTH_SCOPES = "identify email guilds";
// API removida — site funciona 100% estático. Não há chamadas externas.

// Redirect fixo (Netlify)
const OAUTH_REDIRECT_URI = 'https://dumblo.netlify.app/';

function buildDiscordAuthUrl(){
  const state = Math.random().toString(36).slice(2);
  sessionStorage.setItem('oauth_state', state);
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    response_type: 'code',
    redirect_uri: OAUTH_REDIRECT_URI,
    scope: OAUTH_SCOPES,
    state
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

// Inicia login via API interna (/v1/auth/discord/login)
async function startDiscordLogin(){
  // Fluxo simplificado: redireciona diretamente para o OAuth do Discord
  try{ window.location.href = buildDiscordAuthUrl(); }
  catch{ showToast('Não foi possível iniciar login.', 'error'); }
}

// API removida: não trocamos code por token. Mantemos fluxo leve.
async function exchangeCodeForUser(){ return null; }

function renderUserChip(user){
  const chip = document.getElementById('user-chip');
  const btn = document.getElementById('connect-link');
  if(!chip) return;
  if(btn){ btn.style.display = 'none'; }
  const avatarUrl = user && user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';
  const handle = user && user.username ? `@${user.username}` : (user ? (user.global_name || 'Conectado') : 'Conectado');
  chip.innerHTML = `
    <span class="chip-avatar"><img src="${avatarUrl}" alt="Avatar" class="user-avatar" width="24" height="24" /></span>
    <span class="user-handle" title="${user ? (user.global_name || user.username) : 'Conectado'}">${handle}</span>
  `;
  chip.style.display = 'inline-flex';
  // Habilita menu do usuário
  setupUserDropdown();
}

// API removida: mantemos apenas o tratamento leve
async function handleOAuthRedirect(){ handleOAuthRedirectLite(); }

// Tratamento leve de retorno OAuth com tentativa de obter usuário via Netlify Function
async function handleOAuthRedirectLite(){
  if(typeof window === 'undefined') return;
  try{
    const url = new URL(window.location.href);
    const params = url.searchParams;
    const code = params.get('code');
    const error = params.get('error');
    if(!code && !error) return;
    if(code){
      const state = params.get('state');
      const expected = sessionStorage.getItem('oauth_state');
      const mismatch = !!(expected && state && expected !== state);
      try{
        const q = new URLSearchParams({ code, redirect_uri: OAUTH_REDIRECT_URI });
        const resp = await fetch(`/.netlify/functions/discord-user?${q.toString()}`);
        if(resp.ok){
          const data = await resp.json();
          if(data && data.user){
            try{ localStorage.setItem('discord_user', JSON.stringify(data.user)); }catch{}
            renderUserChip(data.user);
            showToast('Conectado ao Discord.', 'success', { duration: 3500 });
          } else {
            renderUserChip(null);
            showToast('Conexão concluída.', 'success', { duration: 3500 });
          }
        } else {
          renderUserChip(null);
          showToast('Conectado (modo básico).', 'info', { duration: 3500 });
        }
      }catch(e){
        console.warn('Falha ao obter usuário via função:', e);
        renderUserChip(null);
        showToast('Conectado (modo básico).', 'info', { duration: 3500 });
      }
      // Não exibe erro de state ao usuário; se houver mismatch, apenas ignora
      if(mismatch){ try{ sessionStorage.removeItem('oauth_state'); }catch{} }
    } else if(error){
      showToast(`Autorização cancelada: ${error}`, 'warn', { duration: 4000 });
    }
    ['code','state','error','error_description'].forEach(k=>params.delete(k));
    const clean = url.origin + url.pathname + (params.toString() ? ('?' + params.toString()) : '') + url.hash;
    history.replaceState({}, document.title, clean);
  }catch(e){ console.warn('OAuth lite erro:', e); }
}

function getDiscordToken(){
  try{ const raw = localStorage.getItem('discord_token'); return raw ? JSON.parse(raw) : null; }catch{ return null; }
}

async function fetchDiscordGuilds(){ return null; }

async function saveUserToDB(){ /* API removida */ }

function restoreDiscordUser(){
  try{
    const raw = localStorage.getItem('discord_user');
    if(!raw) return;
    const user = JSON.parse(raw);
    if(user) renderUserChip(user);
  }catch{}
}

function setHref(id){
  const addIds = ["invite-link","invite-link-hero","invite-link-footer","invite-link-commands"]; 
  const supIds = ["support-link","support-link-hero","support-link-footer","support-link-commands"]; 
  addIds.forEach(i=>{ const el=document.getElementById(i); if(el) el.href = inviteUrl(id); });
  supIds.forEach(i=>{ const el=document.getElementById(i); if(el) el.href = SUPPORT_SERVER_URL; });
}

function setupSmoothScroll(){
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',ev=>{
      const href = a.getAttribute('href');
      if(!href || href.length<2 || href[0] !== '#') return;
      const target = document.querySelector(href);
      if(!target) return;
      ev.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior:'smooth' });
    });
  });
}

function setupReveal(){
  const els = Array.from(document.querySelectorAll('.sr'));
  if(!('IntersectionObserver' in window)){ els.forEach(e=>e.classList.add('reveal')); return; }
  const io = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('reveal'); io.unobserve(e.target); } });
  },{ root:null, threshold:0.12 });
  els.forEach(e=>io.observe(e));
}

function setupFaq(){
  document.querySelectorAll('.faq-item .faq-q').forEach(btn=>{
    btn.addEventListener('click',()=>{ btn.parentElement.classList.toggle('open'); });
  });
}

function setupMobileNav(){
  const burger = document.querySelector('.hamburger');
  const menu = document.querySelector('.menu');
  if(!burger || !menu) return;
  burger.addEventListener('click',()=>{
    menu.classList.toggle('open');
  });
  document.querySelectorAll('.menu-link').forEach(link=>{
    link.addEventListener('click',()=>{ menu.classList.remove('open'); });
  });
}

// --- Commands page: rendering and filters ---
function renderCommands(list){
  const grid = document.getElementById('cmd-grid');
  const count = document.getElementById('cmd-count');
  if(!grid) return;
  const safe = Array.isArray(list) ? list : [];
  grid.innerHTML = safe.map(cmd => `
    <div class="cmd-card">
      ${cmd.new ? '<span class="cmd-badge" aria-label="Novo comando">NEW</span>' : ''}
      <div class="cmd-icon" aria-hidden="true">${escapeHtml(cmd.icon || '🔧')}</div>
      <div class="cmd-body">
        <h3><code>${escapeHtml(cmd.name)}</code></h3>
        <p>${escapeHtml(cmd.desc || '')}</p>
      </div>
    </div>
  `).join('');
  if(count){ count.textContent = `Mostrando ${safe.length} comando(s)`; }
}

function applyCommandFilters(){
  const q = (document.getElementById('cmd-search')?.value || '').trim().toLowerCase();
  const activeChip = document.querySelector('.chip-set .chip.active');
  const cat = activeChip ? activeChip.getAttribute('data-cat') : 'Todos';
  const words = q.split(/\s+/).filter(Boolean);
  const filtered = COMMANDS.filter(cmd => {
    const inCat = (cat === 'Todos') || (cmd.cat === cat);
    if(!inCat) return false;
    if(!words.length) return true;
    const hay = `${cmd.name} ${cmd.desc} ${cmd.cat}`.toLowerCase();
    return words.every(w => hay.includes(w));
  });
  renderCommands(filtered);
}

function setupCommandFilters(){
  const grid = document.getElementById('cmd-grid');
  if(!grid) return; // apenas roda na página de comandos

  // chips
  document.querySelectorAll('.chip-set .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip-set .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      applyCommandFilters();
    });
  });

  // search
  const input = document.getElementById('cmd-search');
  if(input){
    input.addEventListener('input', () => {
      applyCommandFilters();
    });
  }
}

function initCommandsPage(){
  const grid = document.getElementById('cmd-grid');
  if(!grid) return; // não está na página de comandos
  renderCommands(COMMANDS);
  setupCommandFilters();
  applyCommandFilters(); // garante contagem correta
}

// --- Partners (Servidores Parceiros) ---
function setupPartners(){
  const ticker = document.getElementById('partners-ticker');
  if(!ticker) return;
  const limit = (typeof window !== 'undefined' && window.__PARTNERS_LIMIT__) ? window.__PARTNERS_LIMIT__ : 12;

  function buildTrack(className, items){
    const track = document.createElement('div');
    track.className = `partners-track ${className}`;
    items.forEach(p=>{
      const nameVal = p.name || p.serverName || 'Servidor';
      const iconVal = p.icon || p.serverIcon || 'https://cdn.discordapp.com/embed/avatars/0.png';
      const item = document.createElement(p.invite ? 'a' : 'div');
      item.className = 'partner-item';
      if(p.invite){ item.href = p.invite; item.target = '_blank'; item.rel = 'noopener'; }
      item.setAttribute('aria-label', nameVal);
      const avatar = document.createElement('div');
      avatar.className = 'partner-avatar';
      const img = document.createElement('img');
      img.alt = `Logo ${nameVal}`;
      img.src = iconVal;
      avatar.appendChild(img);
      const name = document.createElement('div');
      name.className = 'partner-name';
      name.textContent = nameVal;
      item.appendChild(avatar);
      item.appendChild(name);
      track.appendChild(item);
    });
    return track;
  }

  function renderTicker(list){
    const base = list.slice(0, Math.max(0, limit));
    const dup = [...base, ...base];
    const dup2 = [...base, ...base].reverse();
    ticker.innerHTML = '';
    const trackA = buildTrack('track-a', dup);
    const trackB = buildTrack('track-b', dup2);
    ticker.appendChild(trackA);
    ticker.appendChild(trackB);
  }

  // Fonte 1: Firestore REST (patern-servers)
  const projectId = (typeof window !== 'undefined' && window.__FIRESTORE_PROJECT_ID__) ? window.__FIRESTORE_PROJECT_ID__ : null;
  if(projectId){
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/patern-servers`;
    fetch(url).then(async r => {
      if(!r.ok) throw new Error('Firestore erro');
      const data = await r.json();
      const docs = Array.isArray(data.documents) ? data.documents : [];
      const list = docs.map(d => {
        const f = d.fields || {};
        const get = (v)=> (v && (v.stringValue || v.mapValue || v.integerValue || v.doubleValue)) || '';
        return {
          serverName: get(f.serverName),
          serverIcon: get(f.serverIcon)
        };
      }).filter(x => x.serverName || x.serverIcon);
      if(list.length){ renderTicker(list); return; }
      throw new Error('Firestore vazio');
    }).catch(()=>{
      // Fallback 2: dados locais (window.__PARTNERS__)
      const partnersAll = (typeof window !== 'undefined' && window.__PARTNERS__) ? window.__PARTNERS__ : [];
      if(partnersAll.length){ renderTicker(partnersAll); return; }
      // Fallback 3: Netlify Function
      const fn = '/.netlify/functions/partners';
      fetch(fn).then(async r => {
        if(!r.ok) return;
        const data = await r.json();
        const list = Array.isArray(data) ? data : (Array.isArray(data.partners) ? data.partners : []);
        renderTicker(list);
      }).catch(()=>{});
    });
    return;
  }

  // Sem Firestore: usa local ou Netlify Function
  const partnersAll = (typeof window !== 'undefined' && window.__PARTNERS__) ? window.__PARTNERS__ : [];
  if(partnersAll.length){ renderTicker(partnersAll); return; }
  const fn = '/.netlify/functions/partners';
  fetch(fn).then(async r => {
    if(!r.ok) return;
    const data = await r.json();
    const list = Array.isArray(data) ? data : (Array.isArray(data.partners) ? data.partners : []);
    renderTicker(list);
  }).catch(()=>{});
}

// --- Stats (Estatísticas) ---
function setupStats(){
  const grid = document.getElementById('stats-grid');
  if(!grid) return;
  const initial = (typeof window !== 'undefined' && window.__STATS__) ? window.__STATS__ : [
    { value: 0, label: 'Servidores', icon: 'dns' },
    { value: 0, label: 'Comandos', icon: 'terminal' },
    { value: 0, prefix:'+', label: 'Usuários', icon: 'groups' },
    { value: 0, suffix:'M', prefix:'+', label: 'Lupins', icon: 'savings' }
  ];
  const frag = document.createDocumentFragment();
  initial.forEach(s=>{
    const item = document.createElement('div');
    item.className = 'stat-item';
    const value = document.createElement('div');
    value.className = 'stat-value';
    value.textContent = '0';
    value.setAttribute('data-target', String(s.value));
    value.setAttribute('data-prefix', s.prefix || '');
    value.setAttribute('data-suffix', s.suffix || '');
    const label = document.createElement('div');
    label.className = 'stat-label';
    label.innerHTML = `<span class="material-symbols-rounded stat-icon" aria-hidden="true">${s.icon || 'data_usage'}</span> ${s.label}`;
    item.appendChild(value);
    item.appendChild(label);
    frag.appendChild(item);
  });
  grid.innerHTML = '';
  grid.appendChild(frag);

  // Tentativa opcional: substituir valores pelas Netlify Functions
  // Mantemos os valores locais como fonte de verdade: só busca remoto
  // se NÃO houver dados locais definidos em window.__STATS__
  if (typeof window !== 'undefined' && (!window.__STATS__ || window.__STATS__ === undefined)) {
    const fn = '/.netlify/functions/stats';
    fetch(fn).then(async r => {
      if(!r.ok) return;
      const data = await r.json();
      const mapped = [
        { value: Number(data.servers||0), label: 'Servidores', icon: 'dns' },
        { value: Number(data.commands||0), label: 'Comandos', icon: 'terminal' },
        { value: Number(data.users||0), prefix:'+', label: 'Usuários', icon: 'groups' },
        { value: Number(data.lupins||0), prefix:'+', label: 'Lupins', icon: 'savings' }
      ];
      const items = Array.from(grid.querySelectorAll('.stat-item'));
      for(let i=0;i<Math.min(items.length, mapped.length); i++){
        const valEl = items[i].querySelector('.stat-value');
        const labelEl = items[i].querySelector('.stat-label');
        if(valEl){
          valEl.setAttribute('data-target', String(mapped[i].value));
          valEl.setAttribute('data-prefix', mapped[i].prefix || '');
          valEl.setAttribute('data-suffix', mapped[i].suffix || '');
        }
        if(labelEl){
          labelEl.innerHTML = `<span class="material-symbols-rounded stat-icon" aria-hidden="true">${mapped[i].icon || 'data_usage'}</span> ${mapped[i].label}`;
        }
      }
    }).catch(()=>{});
  }
  // Count-up quando entra em viewport
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting) return;
      const valEl = e.target.querySelector('.stat-value');
      if(!valEl) return;
      if(valEl.getAttribute('data-animated')==='1') return;
      valEl.setAttribute('data-animated','1');
      const target = parseFloat(valEl.getAttribute('data-target')||'0');
      const prefix = valEl.getAttribute('data-prefix')||'';
      const suffix = valEl.getAttribute('data-suffix')||'';
      const duration = 1200;
      const start = performance.now();
      const step = (t)=>{
        const p = Math.min(1, (t-start)/duration);
        const eased = 1 - Math.pow(1-p, 3);
        const cur = target * eased;
        valEl.textContent = `${prefix}${formatCompact(cur)}${suffix}`;
        if(p<1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      io.unobserve(e.target);
    });
  },{ threshold: 0.2 }) : null;
  const items = Array.from(grid.querySelectorAll('.stat-item'));
  if(io){
    items.forEach(i=>io.observe(i));
    // fallback: se já estiver visível, inicia a animação imediatamente
    setTimeout(()=>{
      items.forEach(i=>{
        const rect = i.getBoundingClientRect();
        const visible = rect.top < window.innerHeight && rect.bottom > 0;
        if(visible){
          const valEl = i.querySelector('.stat-value');
          if(valEl && valEl.getAttribute('data-animated')!=='1'){
            valEl.setAttribute('data-animated','1');
            const target = parseFloat(valEl.getAttribute('data-target')||'0');
            const prefix = valEl.getAttribute('data-prefix')||'';
            const suffix = valEl.getAttribute('data-suffix')||'';
            const start = performance.now();
            const duration = 1200;
            const step = (t)=>{
              const p = Math.min(1, (t-start)/duration);
              const eased = 1 - Math.pow(1-p, 3);
              const cur = target * eased;
              valEl.textContent = `${prefix}${formatCompact(cur)}${suffix}`;
              if(p<1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          }
        }
      });
    }, 100);
  } else {
    items.forEach(i=>{
      const valEl = i.querySelector('.stat-value');
      const target = parseFloat(valEl.getAttribute('data-target')||'0');
      const prefix = valEl.getAttribute('data-prefix')||'';
      const suffix = valEl.getAttribute('data-suffix')||'';
      valEl.textContent = `${prefix}${formatCompact(target)}${suffix}`;
    });
  }
}

function formatCompact(n){
  const abs = Math.abs(n);
  if(abs >= 1_000_000) return (n/1_000_000).toFixed(1).replace(/\.0$/,'')+'M';
  if(abs >= 1_000) return Math.round(n/1_000)+'k';
  return Math.round(n).toString();
}

// API removida: sem carregamento remoto de estatísticas.

// Fundo animado inspirado em starfield (exemplo samzinho.fun), com tema laranja
function initAnimatedBackground(){
  if (document.getElementById('animated-bg-stars')) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'animated-bg-stars';
  Object.assign(canvas.style, {
    position:'fixed', inset:'0', width:'100vw', height:'100vh',
    zIndex:'-2', pointerEvents:'none'
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const prefersReduce = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || false;
  function resize(){
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
  }
  resize();
  window.addEventListener('resize', resize);

  const starCount = Math.min(220, Math.floor(canvas.width * canvas.height / (70 * 70 * dpr)));
  const stars = Array.from({length: starCount}, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: (Math.random() * 1.6 + 0.3) * dpr,
    baseA: Math.random() * 0.4 + 0.12,
    amp: Math.random() * 0.3 + 0.05,
    tw: (Math.random() * 1.2 + 0.3) * (prefersReduce ? 0 : 1),
    phase: Math.random() * Math.PI * 2,
    vx: (Math.random() - 0.5) * 0.06 * dpr * (prefersReduce ? 0 : 1),
    vy: (Math.random() - 0.5) * 0.06 * dpr * (prefersReduce ? 0 : 1)
  }));

  let last = performance.now();
  function step(now){
    const dt = (now - last) / 16.7; // ~60fps delta
    last = now;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for(const s of stars){
      s.phase += s.tw * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.x < 0) s.x += canvas.width; else if (s.x > canvas.width) s.x -= canvas.width;
      if (s.y < 0) s.y += canvas.height; else if (s.y > canvas.height) s.y -= canvas.height;
      const a = Math.min(1, Math.max(0, s.baseA + Math.sin(s.phase) * s.amp));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(255, 170, 90, ${a})`;
      ctx.fill();
      // efeito de linhas curtas em algumas estrelas (movimento sutil)
      if (!prefersReduce && s.r > dpr*1.2 && Math.random() < 0.04){
        ctx.strokeStyle = `rgba(255, 122, 26, ${a*0.25})`;
        ctx.lineWidth = dpr * 0.7;
        ctx.beginPath();
        ctx.moveTo(s.x - 8*dpr, s.y);
        ctx.lineTo(s.x + 8*dpr, s.y);
        ctx.stroke();
      }
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

document.addEventListener('DOMContentLoaded',()=>{
  setHref(BOT_ID);
  setupSmoothScroll();
  setupReveal();
  setupFaq();
  setupMobileNav();
  
  // Configura botão "Conectar ao Discord" com URL fixa
  const connectEl = document.getElementById('connect-link');
  if(connectEl){
    // Evita gerar novo state a cada carregamento (causava mismatch na volta do OAuth)
    connectEl.href = '#';
    connectEl.addEventListener('click', (ev)=>{
      ev.preventDefault();
      try{ window.location.href = buildDiscordAuthUrl(); }
      catch{ showToast('Não foi possível iniciar login.', 'error'); }
    });
  }
  // Restaurar sessão de usuário (apenas leitura local)
  restoreDiscordUser();
  // Processa retorno OAuth de forma leve (sem backend)
  handleOAuthRedirectLite();

  // Inicializa UI de comandos (busca + categorias)
  initCommandsPage();
  // Inicializa seções novas
  setupPartners();
  setupStats();
  setupDocSearch();
   // Inicializa a página de changelog, se presente
   if(typeof window !== 'undefined' && typeof window.setupChangelog === 'function'){
     try{ window.setupChangelog(); }catch(e){ console.warn('setupChangelog falhou:', e); }
   }
 });

// Redundância: também processa o retorno OAuth no evento load, caso algo impeça DOMContentLoaded
// Removido processamento duplicado via window.load para evitar segunda tentativa de troca do code

// --- User dropdown menu (Dashboard / Logout) ---
 function ensureUserMenu(){
   let menu = document.getElementById('user-menu');
   if(menu) return menu;
   menu = document.createElement('div');
   menu.id = 'user-menu';
   menu.className = 'user-menu hidden';
   menu.innerHTML = `
     <a href="#" class="user-menu-item" data-action="logout" aria-label="Sair da conta">
       <span class="user-menu-icon material-symbols-rounded led-red" aria-hidden="true">logout</span>
       <span>Logout</span>
     </a>
   `;
   document.body.appendChild(menu);
   // handlers
   const onClick = (ev)=>{
     ev.preventDefault();
     const action = ev.currentTarget.getAttribute('data-action');
     if(action === 'logout'){
       logoutUser();
     }
   };
   menu.querySelectorAll('.user-menu-item').forEach(a=>a.addEventListener('click', onClick));
   return menu;
 }

function setupUserDropdown(){
  const chip = document.getElementById('user-chip');
  if(!chip) return;
  const menu = ensureUserMenu();
  const position = ()=>{
    try{
      const rect = chip.getBoundingClientRect();
      const top = rect.bottom + 8 + window.scrollY;
      const left = rect.left + window.scrollX;
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
      menu.style.right = 'auto';
    }catch{}
  };
  const toggle = ()=>{ position(); menu.classList.toggle('hidden'); };
  const hide = ()=>{ menu.classList.add('hidden'); };
  chip.addEventListener('click', (ev)=>{ ev.preventDefault(); toggle(); });
  window.addEventListener('click', (ev)=>{ const inside = chip.contains(ev.target) || menu.contains(ev.target); if(!inside) hide(); });
  window.addEventListener('resize', ()=>{ if(!menu.classList.contains('hidden')) position(); });
}

function logoutUser(){
  try{ localStorage.removeItem('discord_user'); }catch{}
  showToast('Você saiu da sua conta.', 'info', { duration: 3000 });
  // Recarrega para restaurar botão de conectar
  window.location.reload();
}

// --- Changelog page (GitHub commits) ---
(function(){
  function shortSha(sha){ return (sha||'').slice(0,7); }
  function formatDate(iso){ try{ const d=new Date(iso); return d.toLocaleString('pt-BR',{ dateStyle:'medium', timeStyle:'short' }); }catch{ return iso; } }
  function firstLine(msg){ return String(msg||'').split(/\r?\n/)[0]; }

  async function fetchCommits({ owner, repo, since, until, perPage = 50 }){
    const qs = new URLSearchParams();
    if(perPage) qs.set('per_page', String(perPage));
    if(since) qs.set('since', since);
    if(until) qs.set('until', until);
    // API removida: sempre usar API pública do GitHub
    try{
      const direct = `https://api.github.com/repos/${owner}/${repo}/commits?${qs.toString()}`;
      const r = await fetch(direct, { headers: { 'User-Agent':'DumbloSite/1.0' } });
      if(r.ok){ return await r.json(); }
      const txt = await r.text();
      console.warn('GitHub API direta falhou', r.status, txt);
    }catch(err){ console.warn('GitHub direta erro', err); }
    return [];
  }

  function renderCommits(commits){
    const root = document.getElementById('commit-list');
    const count = document.getElementById('commit-count');
    const empty = document.getElementById('commit-empty');
    if(!root) return;
    const safe = Array.isArray(commits) ? commits : [];
    if(count) count.textContent = `Mostrando ${safe.length} commit(s)`;
    if(empty) empty.hidden = safe.length > 0;
    root.innerHTML = safe.map(c => {
      const msg = firstLine(c.commit && c.commit.message);
      const author = (c.commit && c.commit.author && c.commit.author.name) || (c.author && c.author.login) || '—';
      const date = (c.commit && c.commit.author && c.commit.author.date) || null;
      const url = c.html_url || (c.url ? c.url.replace('api.github.com/repos','github.com') : '#');
      return `
        <article class="commit-card">
          <div class="commit-top">
            <div class="commit-icon" aria-hidden="true">📝</div>
            <div class="commit-msg">${escapeHtml(msg || 'Commit')}</div>
          </div>
          <div class="commit-meta">
            <span>${escapeHtml(author)}</span>
            <span>•</span>
            <span>${date ? escapeHtml(formatDate(date)) : ''}</span>
            <span>•</span>
            <span>#${escapeHtml(shortSha(c.sha || ''))}</span>
          </div>
          <a class="commit-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">Ver commit ↗</a>
        </article>
      `;
    }).join('');
  }

  // Renderiza em uma seção específica (site|bot) quando a página possui categorias
  function renderCommitsSection(section, commits){
    const root = document.getElementById(`commit-list-${section}`);
    const count = document.getElementById(`commit-count-${section}`);
    const empty = document.getElementById(`commit-empty-${section}`);
    if(!root) return;
    const safe = Array.isArray(commits) ? commits : [];
    if(count) count.textContent = `Mostrando ${safe.length} commit(s)`;
    if(empty) empty.hidden = safe.length > 0;
    root.innerHTML = safe.map(c => {
      const msg = firstLine(c.commit && c.commit.message);
      const author = (c.commit && c.commit.author && c.commit.author.name) || (c.author && c.author.login) || '—';
      const date = (c.commit && c.commit.author && c.commit.author.date) || null;
      const url = c.html_url || (c.url ? c.url.replace('api.github.com/repos','github.com') : '#');
      return `
        <article class="commit-card">
          <div class="commit-top">
            <div class="commit-icon" aria-hidden="true">📝</div>
            <div class="commit-msg">${escapeHtml(msg || 'Commit')}</div>
          </div>
          <div class="commit-meta">
            <span>${escapeHtml(author)}</span>
            <span>•</span>
            <span>${date ? escapeHtml(formatDate(date)) : ''}</span>
            <span>•</span>
            <span>#${escapeHtml(shortSha(c.sha || ''))}</span>
          </div>
          <a class="commit-link" href="${escapeHtml(url)}" target="_blank" rel="noopener">Ver commit ↗</a>
        </article>
      `;
    }).join('');
  }

  function filterByText(commits, q){
    const words = String(q || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if(!words.length) return commits;
    return commits.filter(c => {
      const msg = firstLine(c.commit && c.commit.message).toLowerCase();
      return words.every(w => msg.includes(w));
    });
  }

  function parseStartFromQS(){
    try{
      const qs = new URLSearchParams(window.location.search);
      const s = qs.get('start');
      if(!s) return null;
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d.toISOString();
    }catch{ return null; }
  }

  function seasonRange(season){
    // Temporada aberta: até "agora"; início pode vir do HTML (data-season1-start) ou da URL (?start=YYYY-MM-DD)
    const now = new Date();
    if(String(season) === '1'){
      const root = document.getElementById('changelog-root');
      const startAttr = root?.dataset?.season1Start || '';
      const startQS = parseStartFromQS();
      let sinceIso = null;
      if(startQS){ sinceIso = startQS; }
      else if(startAttr){
        const d = new Date(startAttr);
        sinceIso = isNaN(d.getTime()) ? null : d.toISOString();
      }
      // Fallback: últimos 90 dias caso não haja início definido
      if(!sinceIso){
        const since = new Date(now.getTime() - 90*24*60*60*1000);
        sinceIso = since.toISOString();
      }
      return { since: sinceIso, until: now.toISOString() };
    }
    return { since: undefined, until: undefined };
  }

  async function loadAndRender({ owner, repo, season, q }){
    const range = seasonRange(season);
    let commits = await fetchCommits({ owner, repo, since: range.since, until: range.until, perPage: 50 });
    if(!Array.isArray(commits) || commits.length === 0){
      const local = Array.isArray(window.__COMMITS__) ? window.__COMMITS__ : [
        { commit:{ message:'Atualizações do site: navbar e fundo estático', author:{ name:'Dumblo Site' } }, author:{ login:'vitordogmm' }, sha:'local-site-1', html_url:'#' },
        { commit:{ message:'Página Doc criada com layout responsivo', author:{ name:'Dumblo Site' } }, author:{ login:'vitordogmm' }, sha:'local-site-2', html_url:'#' }
      ];
      commits = local;
    }
    const filtered = filterByText(commits, q);
    renderCommits(filtered);
  }

  async function loadAndRenderSection(section, { owner, repo, season, q }){
    const range = seasonRange(season);
    let commits = await fetchCommits({ owner, repo, since: range.since, until: range.until, perPage: 50 });
    if(!Array.isArray(commits) || commits.length === 0){
      const localWin = section === 'site' ? window.__COMMITS_SITE__ : window.__COMMITS_BOT__;
      const local = Array.isArray(localWin) ? localWin : (
        section === 'site'
          ? [
              { commit:{ message:'Navbar e links do rodapé ajustados', author:{ name:'Dumblo Site' } }, author:{ login:'vitordogmm' }, sha:'local-s-1', html_url:'#' },
              { commit:{ message:'Fundo estático unificado', author:{ name:'Dumblo Site' } }, author:{ login:'vitordogmm' }, sha:'local-s-2', html_url:'#' }
            ]
          : [
              { commit:{ message:'Balanceamento de combate', author:{ name:'Dumblo Bot' } }, author:{ login:'vitordogmm' }, sha:'local-b-1', html_url:'#' },
              { commit:{ message:'Correções em inventário', author:{ name:'Dumblo Bot' } }, author:{ login:'vitordogmm' }, sha:'local-b-2', html_url:'#' }
            ]
      );
      commits = local;
    }
    const filtered = filterByText(commits, q);
    renderCommitsSection(section, filtered);
  }

  function setupChips(onChange){
    const container = document.querySelector('.cmd-filters');
    if(!container) return;
    const chips = Array.from(container.querySelectorAll('.chip'));
    chips.forEach(chip => chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const season = chip.getAttribute('data-season');
      onChange(season);
    }));
  }

  function parseRepoParam(){
    const qs = new URLSearchParams(window.location.search);
    const repoParam = qs.get('repo'); // owner/name
    if(repoParam && repoParam.includes('/')){
      const [owner, repo] = repoParam.split('/');
      return { owner, repo };
    }
    const root = document.getElementById('changelog-root');
    const owner = root?.dataset.owner || '';
    const repo = root?.dataset.repo || '';
    return { owner, repo };
  }

  function parseSeason(){
    const qs = new URLSearchParams(window.location.search);
    return qs.get('season') || qs.get('t') || null;
  }

  function setupSearch(onChange){
    const input = document.getElementById('cl-search');
    if(!input) return;
    input.addEventListener('input', ()=> onChange(input.value));
  }

  window.setupChangelog = function(){
    const root = document.getElementById('changelog-root');
    if(!root) return; // não está na página de changelog

    const hasDual = !!(document.getElementById('commit-list-site') && document.getElementById('commit-list-bot'));
    let owner = null, repo = null;
    if(!hasDual){
      const parsed = parseRepoParam();
      owner = parsed.owner; repo = parsed.repo;
      if(!owner || !repo){
        showToast('Configure o repositório via ?repo=owner/nome ou data-owner/data-repo.', 'info', { duration: 6000 });
      }
    }

    let currentSeason = parseSeason() || (root.dataset.seasonDefault || 'all');
    let currentQuery = '';

    // ativa chip conforme season
    const chips = Array.from(document.querySelectorAll('.cmd-filters .chip'));
    chips.forEach(c => c.classList.remove('active'));
    const targetChip = chips.find(c => c.getAttribute('data-season') === String(currentSeason)) || chips[0];
    if(targetChip){ targetChip.classList.add('active'); }

    const reload = ()=> {
      if(hasDual){
        const repos = {
          site: { owner: 'vitordogmm', repo: 'dumblo-site' },
          bot:  { owner: 'vitordogmm', repo: 'dumblo' }
        };
        Promise.all([
          loadAndRenderSection('site', { ...repos.site, season: currentSeason, q: currentQuery }),
          loadAndRenderSection('bot',  { ...repos.bot,  season: currentSeason, q: currentQuery })
        ]);
      } else {
        loadAndRender({ owner, repo, season: currentSeason, q: currentQuery });
      }
    };

    setupChips((season)=>{ currentSeason = season; reload(); });
    setupSearch((q)=>{ currentQuery = q; reload(); });

    reload();
  };
})();

// --- Documentation search ---
function setupDocSearch(){
  const input = document.querySelector('.doc-search input');
  const links = Array.from(document.querySelectorAll('.doc-nav .doc-link'));
  if(!input || !links.length) return;
  const index = links.map(link=>{
    const href = link.getAttribute('href') || '';
    const sec = href.startsWith('#') ? document.querySelector(href) : null;
    const text = `${(link.textContent||'').toLowerCase()} ${String(sec?.textContent||'').toLowerCase()}`;
    return { link, href, text };
  });
  const apply = ()=>{
    const q = (input.value||'').trim().toLowerCase();
    let first = null;
    index.forEach(it=>{
      const match = !q || it.text.includes(q);
      it.link.style.display = match ? 'block' : 'none';
      if(match && !first) first = it;
    });
    if(q && first && first.href){
      const target = document.querySelector(first.href);
      if(target){
        const top = target.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top, behavior:'smooth' });
      }
    }
  };
  input.addEventListener('input', apply);
  input.addEventListener('keydown', ev=>{
    if(ev.key === 'Enter') apply();
  });
  apply();
}

// --- Dashboard page ---
(function(){
  function getUser(){
    try{ const raw = localStorage.getItem('discord_user'); return raw ? JSON.parse(raw) : null; }catch{ return null; }
  }

  function renderProfile(user, data){
    const card = document.getElementById('profile-card');
    if(!card) return;
    const avatarUrl = user && user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : 'https://cdn.discordapp.com/embed/avatars/0.png';
    const handle = user ? (user.global_name || user.username || user.id) : '—';
    const characterName = data?.name || data?.character?.name || data?.character_name || data?.personagem || data?.nomePersonagem || null;
    const status = data?.status || '—';
    const email = data?.email || user?.email || '—';
    const flags = (data?.flags ?? user?.public_flags ?? '—');
    const stats = data?.stats || {};
    const level = Number(data?.level0 ?? data?.level ?? data?.nivel ?? 0) || 0;
    const xp = Number(data?.xp ?? 0) || 0;
    const requiredXp = Math.max(1, 1000 * (level + 1));
    const xpPct = Math.max(0, Math.min(100, Math.round((xp / requiredXp) * 100)));
    card.innerHTML = `
      <div class="profile-row">
        <img class="profile-avatar" src="${escapeHtml(avatarUrl)}" alt="Avatar" />
        <div class="profile-meta">
          <strong>${escapeHtml(handle)}</strong>
          ${characterName ? `<span class="muted">Personagem: ${escapeHtml(String(characterName))}</span>` : ''}
          <span class="status-pill">Status: ${escapeHtml(String(status))}</span>
        </div>
      </div>
      <div class="profile-xp">
        <div class="stat-row">
          <span class="stat-label">XP</span>
          <div class="stat-bar-outer"><div class="stat-bar-inner" style="width:${xpPct}%"></div></div>
        </div>
        <div class="muted">Nível: ${escapeHtml(String(level))} • XP: ${escapeHtml(String(xp))} / ${escapeHtml(String(requiredXp))}</div>
      </div>
      <div class="stats-grid">
        ${Object.entries(normalizeStats(stats)).map(([k,v])=>`<div class="stat-pill"><span>${escapeHtml(k)}</span><strong>${escapeHtml(String(v))}</strong></div>`).join('')}
      </div>
    `;
  }

  function normalizeStats(stats){
    const labels = {
      agility: 'agilidade', charisma: 'carisma', intelligence: 'inteligência', luck: 'sorte', strength: 'força', vitality: 'vitalidade',
      agilidade: 'agilidade', carisma: 'carisma', inteligência: 'inteligência', sorte: 'sorte', força: 'força', vitalidade: 'vitalidade'
    };
    const out = {};
    for(const [k,v] of Object.entries(stats||{})){
      if(typeof v !== 'number') continue;
      const label = labels[k] || k;
      if(label.toLowerCase() === 'nível' || label.toLowerCase() === 'level' || label.toLowerCase() === 'xp') continue;
      out[label] = v;
    }
    return out;
  }

  function renderStatsChart(stats){
    const chart = document.getElementById('stats-chart');
    if(!chart) return;
    const norm = normalizeStats(stats);
    const entries = Object.entries(norm).filter(([,v])=>typeof v === 'number');
    if(!entries.length){ chart.innerHTML = `<div class="muted">Sem dados numéricos para gráficos.</div>`; return; }
    const max = Math.max(...entries.map(([,v])=>v||0), 1);
    chart.innerHTML = entries.map(([k,v])=>{
      const pct = Math.max(0, Math.min(100, Math.round((v/max)*100)));
      return `
        <div class="stat-row">
          <span class="stat-label">${escapeHtml(k)}</span>
          <div class="stat-bar-outer"><div class="stat-bar-inner" style="width:${pct}%"></div></div>
        </div>
      `;
    }).join('');
  }

  function renderGuilds(guilds){
    const grid = document.getElementById('guilds-grid');
    if(!grid) return;
    const safe = Array.isArray(guilds) ? guilds : [];
    function guildIconHtml(g){
      let url = null;
      if(g.icon){
        const icon = String(g.icon);
        if(/^https?:\/\//.test(icon)){
          url = icon;
        } else if(g.id) {
          url = `https://cdn.discordapp.com/icons/${g.id}/${icon}.png?size=64`;
        }
      }
      if(url){ return `<img class="guild-icon-img" src="${escapeHtml(url)}" alt="Ícone do servidor" />`; }
      const initials = String(g.name || 'Servidor').split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
      return `<div class="guild-icon initials" aria-hidden="true">${escapeHtml(initials || '?')}</div>`;
    }
    grid.innerHTML = safe.map(g=>`
      <div class="guild-pill">
        ${guildIconHtml(g)}
        <div class="guild-body">
          <strong>${escapeHtml(g.name || 'Servidor')}</strong>
          <div class="muted">ID: ${escapeHtml(g.id || '—')}</div>
        </div>
        <button class="btn btn-outline btn-sm guild-info-btn" data-gid="${escapeHtml(g.id)}" data-gname="${escapeHtml(g.name||'Servidor')}">Ver infos</button>
      </div>
    `).join('');
    // bind modal openers
    Array.from(grid.querySelectorAll('.guild-info-btn')).forEach(btn => {
      btn.addEventListener('click', async ()=>{
        const gid = btn.getAttribute('data-gid');
        const gname = btn.getAttribute('data-gname');
        const user = getUser();
        const info = await fetchGuildInfo(gid, user?.id);
        openGuildModal(info || { id: gid, name: gname });
      });
    });
  }

  async function fetchGuildInfo(guildId, userId){
    // API removida: sem detalhe de guildas via backend
    return null;
  }

  function openGuildModal(g){
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const card = document.createElement('div');
    card.className = 'modal-card';
    const iconUrl = (g.icon && g.id) ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64` : null;
    const initials = String(g.name || 'Servidor').split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
    const iconHtml = iconUrl ? `<img class="guild-icon-img" src="${escapeHtml(iconUrl)}" alt="Ícone"/>` : `<div class="guild-icon initials">${escapeHtml(initials||'?')}</div>`;
    const rolesList = Array.isArray(g.roles) ? g.roles.map(r=> (typeof r === 'string' ? r : r.name)).join(', ') : '—';
    const categoriesList = Array.isArray(g.categories) && g.categories.length
      ? g.categories.map(cat=> `${cat.name} (${cat.count||0})`).join(' • ')
      : '—';
    const joined = g.joinedAt ? new Date(g.joinedAt).toLocaleDateString('pt-BR') : '—';
    card.innerHTML = `
      <div class="modal-head">
        <div class="modal-title">
          ${iconHtml}
          <div class="modal-title-text">
            <strong>${escapeHtml(g.name||'Servidor')}</strong>
            <div class="muted">ID: ${escapeHtml(g.id||'—')}</div>
          </div>
        </div>
        <button class="modal-close">Fechar</button>
      </div>
      <div class="modal-body">
        <div class="modal-grid">
          <div><span class="muted">Membros</span><div><strong>${escapeHtml(String(g.memberCount ?? '—'))}</strong></div></div>
          <div><span class="muted">Entrou</span><div><strong>${escapeHtml(joined)}</strong></div></div>
          <div><span class="muted">Ícone</span><div>${iconHtml}</div></div>
        </div>
        <div class="modal-section">
          <span class="muted">Seus cargos</span>
          <div>${rolesList || '—'}</div>
        </div>
        <div class="modal-section">
          <span class="muted">Categorias de canais</span>
          <div>${categoriesList || '—'}</div>
        </div>
      </div>
    `;
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    const close = ()=>{ overlay.remove(); };
    overlay.addEventListener('click', (e)=>{ if(e.target === overlay) close(); });
    card.querySelector('.modal-close')?.addEventListener('click', close);
  }

  function renderStatsSparkline(history){
    const chart = document.getElementById('stats-chart');
    if(!chart) return;
    const keys = Object.keys(history||{}).filter(k=>Array.isArray(history[k]) && history[k].length);
    if(!keys.length){ return; }
    const width = 220, height = 40;
    const html = keys.map(k=>{
      const series = history[k];
      const max = Math.max(...series, 1);
      const stepX = series.length > 1 ? (width-2)/(series.length-1) : 0;
      const points = series.map((v,i)=>{
        const x = 1 + i*stepX;
        const y = height - 1 - Math.round((v/max)*(height-2));
        return `${x},${y}`;
      }).join(' ');
      return `
        <div class="stat-spark">
          <span class="stat-label">${escapeHtml(k)} (tendência)</span>
          <svg class="sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
            <polyline fill="none" stroke="orange" stroke-width="2" points="${points}" />
          </svg>
        </div>
      `;
    }).join('');
    chart.insertAdjacentHTML('beforeend', html);
  }

  function renderStatsTimeseries(stats){
    const chart = document.getElementById('stats-chart');
    if(!chart) return;
    const series = Array.isArray(stats?.series) ? stats.series : [];
    chart.innerHTML = '';
    if(!series.length){
      chart.innerHTML = `<div class="muted">Sem histórico para ${escapeHtml(String(stats?.timespan||'7d'))}.</div>`;
      return;
    }
    const maxXp = Math.max(...series.map(d=> Number(d.xp||0)), 1);
    chart.innerHTML = series.map(d=>{
      const pct = Math.max(0, Math.min(100, Math.round((Number(d.xp||0)/maxXp)*100)));
      const date = String(d.date||'').trim();
      return `
        <div class="stat-row">
          <span class="stat-label">${escapeHtml(date)}</span>
          <div class="stat-bar-outer"><div class="stat-bar-inner" style="width:${pct}%"></div></div>
          <span class="muted small">XP ${escapeHtml(String(d.xp||0))} • B ${escapeHtml(String(d.battles||0))} • W ${escapeHtml(String(d.wins||0))} • L ${escapeHtml(String(d.losses||0))}</span>
        </div>
      `;
    }).join('');
  }

  function renderInventory(items){
    const grid = document.getElementById('inventory-grid');
    if(!grid) return;
    const safe = Array.isArray(items) ? items : [];
    if(!safe.length){ grid.innerHTML = `<div class="muted">Inventário vazio.</div>`; return; }
    grid.innerHTML = safe.map(it=>{
      const qty = Number(it.qty ?? it.quantity ?? it.qtd ?? it.amount ?? it.count ?? 0);
      return `
      <div class="inventory-item">
        <div class="inventory-icon">🎒</div>
        <div class="inventory-body">
          <strong>${escapeHtml(it.name || 'Item')}</strong>
          <div class="muted">Qtd: ${escapeHtml(String(qty))}</div>
        </div>
      </div>
    `;
    }).join('');
  }

  // Helper para cabeçalho Authorization
  function getAuthHeader(){
    try{
      const raw = localStorage.getItem('discord_token');
      const tok = raw ? JSON.parse(raw) : null;
      if(tok && tok.access_token){ return { 'Authorization': `Bearer ${tok.access_token}` }; }
    }catch{}
    return {};
  }

  async function fetchDashboardData(userId){
    // API removida: retornar dados locais ou configuração estática se existir
    const sel = document.getElementById('stats-timespan');
    const timespan = sel && sel.value === '30d' ? '30d' : '7d';
    if(typeof window !== 'undefined' && window.__DASH__){ return window.__DASH__; }
    return {
      source: 'demo-local',
      user: { id: String(userId||'0'), global_name: 'Aventureiro', status: 'online' },
      stats: {
        week: { commands: 164, users: 67000, servers: 276, lupins: 280_000_000 },
        month: { commands: 360, users: 120000, servers: 276, lupins: 300_000_000 }
      },
      inventory: { coins: 1200, items: ['Poção de Cura','Espada de Ferro'] },
      guilds: []
    };
  }

  function setupDashboardSections(){
    const links = Array.from(document.querySelectorAll('.dash-nav-link'));
    const sections = Array.from(document.querySelectorAll('.dash-section'));
    const setActive = (target)=>{
      links.forEach(l=>l.classList.toggle('active', l.dataset.target === target));
      sections.forEach(s=>s.classList.toggle('hidden', s.dataset.section !== target));
    };
    links.forEach(l=> l.addEventListener('click', ()=> setActive(l.dataset.target)));
    // default
    setActive('perfil');
  }

  // Seletor de período das estatísticas
  function setupStatsTimespan(onChange){
    const sel = document.getElementById('stats-timespan');
    if(!sel) return;
    sel.addEventListener('change', ()=> onChange(sel.value));
  }

  let guildsState = [];
  function setupGuildFilters(){
    const input = document.getElementById('guilds-search');
    const sortSel = document.getElementById('guilds-sort');
    const hasBotChk = document.getElementById('guilds-hasbot');
    const fromDate = document.getElementById('guilds-from');
    const toDate = document.getElementById('guilds-to');
    const rolesInput = document.getElementById('guilds-roles');
    const apply = ()=>{
      let list = [...guildsState];
      const q = (input?.value||'').toLowerCase();
      if(q) list = list.filter(g => String(g.name||'').toLowerCase().includes(q));
      // filtrar por presença do bot
      if(hasBotChk && hasBotChk.checked){ list = list.filter(g => !!g.hasBot); }
      // filtrar por faixa de datas de entrada
      const fromVal = fromDate?.value ? new Date(fromDate.value) : null;
      const toVal = toDate?.value ? new Date(toDate.value) : null;
      if(fromVal || toVal){
        list = list.filter(g=>{
          if(!g.joinedAt) return false;
          const d = new Date(g.joinedAt);
          if(fromVal && d < fromVal) return false;
          if(toVal && d > toVal) return false;
          return true;
        });
      }
      // filtrar por cargos
      const roles = (rolesInput?.value||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
      if(roles.length){
        list = list.filter(g=>{
          const gr = Array.isArray(g.roles) ? g.roles.map(r=>String(r).toLowerCase()) : [];
          return roles.some(r=> gr.includes(r));
        });
      }
      const sort = sortSel?.value || 'name-asc';
      list.sort((a,b)=>{
        switch(sort){
          case 'name-desc': return String(b.name||'').localeCompare(String(a.name||''));
          case 'members-desc': return (b.memberCount||0) - (a.memberCount||0);
          case 'members-asc': return (a.memberCount||0) - (b.memberCount||0);
          case 'name-asc':
          default: return String(a.name||'').localeCompare(String(b.name||''));
        }
      });
      renderGuilds(list);
    };
    if(input) input.addEventListener('input', apply);
    if(sortSel) sortSel.addEventListener('change', apply);
    if(hasBotChk) hasBotChk.addEventListener('change', apply);
    if(fromDate) fromDate.addEventListener('change', apply);
    if(toDate) toDate.addEventListener('change', apply);
    if(rolesInput) rolesInput.addEventListener('input', apply);
    apply();
  }

  window.setupDashboard = function(){ /* dashboard removido */ };
})();
