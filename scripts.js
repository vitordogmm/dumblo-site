const BOT_ID = "1435471760979136765";
const SUPPORT_SERVER_URL = "https://discord.com/invite/6daVxgAudS";

// --- Commands dataset (categorias: Utilidades, RPG) ---
const COMMANDS = [
  // Utilidades
  { name: "/help", cat: "Utilidades", icon: "📚", desc: "Abre a central de ajuda com links (Comandos, Termos, Servidor)." },
  { name: "/ping", cat: "Utilidades", icon: "📡", desc: "Exibe o status do bot e latências." },
  // RPG
  { name: "/start", cat: "RPG", icon: "🌟", desc: "Cria seu personagem e inicia sua jornada." },
  { name: "/profile", cat: "RPG", icon: "🧙", desc: "Mostra o perfil do personagem (atributos, classe, progresso)." },
  { name: "/status", cat: "RPG", icon: "📈", desc: "Distribui pontos de status disponíveis via modal." },
  { name: "/daily", cat: "RPG", icon: "🗓️", desc: "Coleta seus lupins diários; bônus leve por Sorte; cooldown 24h." },
  { name: "/carteira", cat: "RPG", icon: "💰", desc: "Mostra saldos de lupins na carteira e no banco." },
  { name: "/depositar", cat: "RPG", icon: "🏦", desc: "Move lupins da carteira para o banco com confirmação." },
  { name: "/sacar", cat: "RPG", icon: "💸", desc: "Move lupins do banco para a carteira com confirmação." },
  { name: "/transferir", cat: "RPG", icon: "🔁", desc: "Envia lupins para outro usuário com confirmação." },
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
const OAUTH_SCOPES = "identify email";
// Use Netlify domain in production; allow local preview
const OAUTH_REDIRECT_URI = (typeof window !== 'undefined' && window.location.hostname !== 'localhost')
  ? 'https://dumblo.netlify.app/'
  : 'http://localhost:8000/';

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

async function exchangeCodeForUser(code){
  try{
    const res = await fetch('/.netlify/functions/discord-token',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ code, redirect_uri: OAUTH_REDIRECT_URI })
    });
    const data = await res.json().catch(()=>null);
    if(!res.ok){
      console.warn('discord-token falhou', { status: res.status, body: data });
      const errCode = data && (data.error || data.code || data.status);
      const errDesc = data && (data.error_description || data.message || data.detail);
      const msg = `Discord OAuth falhou${errCode ? ` (${errCode})` : ''}${errDesc ? ` — ${errDesc}` : ''}`;
      showToast(msg, 'error');
      return null;
    }
    return data && data.user ? data.user : null;
  }catch(err){ console.warn('OAuth erro:', err); showToast('Erro de rede ao conectar ao Discord.', 'error'); return null; }
}

function renderUserChip(user){
  const chip = document.getElementById('user-chip');
  const btn = document.getElementById('connect-link');
  if(!chip) return;
  const avatarUrl = user && user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`
    : 'https://cdn.discordapp.com/embed/avatars/0.png';
  const handle = user && user.username ? `@${user.username}` : (user ? (user.global_name || 'Conectado') : 'Conectado');
  chip.innerHTML = `
    <span class="chip-avatar"><img src="${avatarUrl}" alt="Avatar" class="user-avatar" width="24" height="24" /></span>
    <span class="user-handle" title="${user ? (user.global_name || user.username) : 'Conectado'}">${handle}</span>
  `;
  chip.style.display = 'inline-flex';
  // Remover o botão para garantir que não reapareça por CSS
  try{ if(btn) btn.remove(); }catch{ if(btn) btn.style.display = 'none'; }
}

async function handleOAuthRedirect(){
  const qs = new URLSearchParams(window.location.search);
  const code = qs.get('code');
  const state = qs.get('state');
  if(!code) return;
  const expect = sessionStorage.getItem('oauth_state');
  // Se não houver 'state' na URL, siga adiante (fallback)
  if(expect && state && state !== expect){
    console.warn('State inválido; prosseguindo com fallback');
    try{ showToast('State OAuth divergente. Prosseguindo com fallback.', 'info', { duration: 4000 }); }catch{}
  }
  // In local preview, Netlify functions não estão disponíveis. Apenas ignora.
  const user = await exchangeCodeForUser(code);
  if(user){
    try{ localStorage.setItem('discord_user', JSON.stringify(user)); }catch{}
    renderUserChip(user);
    try{ document.body.classList.add('logged-in'); }catch{}
    // Persistência opcional no banco via função serverless
    saveUserToDB(user).catch(err=>console.warn('Persistência de usuário falhou:', err));
  }else{
    // Se a troca falhar, mantenha a sessão prévia se existir
    try{
      const raw = localStorage.getItem('discord_user');
      const prev = raw ? JSON.parse(raw) : null;
      if(prev){
        renderUserChip(prev);
        try{ document.body.classList.add('logged-in'); }catch{}
      }else{
        const chip = document.getElementById('user-chip');
        if(chip){ chip.style.display='inline-flex'; chip.innerHTML = '<span class="user-name">Falha ao conectar ao Discord</span>'; }
        showToast('Falha ao conectar ao Discord.', 'error');
      }
    }catch{
      const chip = document.getElementById('user-chip');
      if(chip){ chip.style.display='inline-flex'; chip.innerHTML = '<span class="user-name">Falha ao conectar ao Discord</span>'; }
      showToast('Falha ao conectar ao Discord.', 'error');
    }
  }
  // Limpa parâmetros da URL
  history.replaceState({}, document.title, window.location.pathname);
}

async function saveUserToDB(user){
  try{
    const resp = await fetch('/.netlify/functions/save-user',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ user })
    });
    if(!resp.ok){
      const txt = await resp.text();
      console.warn('save-user retornou erro:', resp.status, txt);
      showToast(`Falha ao salvar seu perfil (HTTP ${resp.status}).`, 'info');
    }
  }catch(err){
    console.warn('Erro ao chamar save-user:', err);
    showToast('Erro na persistência de perfil do usuário.', 'info');
  }
}

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
      if(!href || href.length<2) return;
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

document.addEventListener('DOMContentLoaded',()=>{
  setHref(BOT_ID);
  setupSmoothScroll();
  setupReveal();
  setupFaq();
  setupMobileNav();
  // Botão Conectar Discord
  const connect = document.getElementById('connect-link');
  if(connect){
    // Define href para fallback caso o listener não dispare
    try{ connect.href = buildDiscordAuthUrl(); }catch{}
    connect.addEventListener('click',(e)=>{
      e.preventDefault();
      window.location.href = buildDiscordAuthUrl();
    });
  }
  // Restaurar sessão e processar retorno do OAuth
  restoreDiscordUser();
  if(typeof window !== 'undefined') handleOAuthRedirect();

  // Inicializa UI de comandos (busca + categorias)
  initCommandsPage();
  // Inicializa a página de changelog, se presente
  if(typeof window !== 'undefined' && typeof window.setupChangelog === 'function'){
    try{ window.setupChangelog(); }catch(e){ console.warn('setupChangelog falhou:', e); }
  }
});

// Redundância: também processa o retorno OAuth no evento load, caso algo impeça DOMContentLoaded
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    try {
      console.debug('[OAuth] processamento via window.load');
      handleOAuthRedirect();
    } catch (e) {
      console.error('Erro ao processar OAuth no evento load:', e);
    }
  });
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
    const path = `/.netlify/functions/github-commits?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&${qs.toString()}`;
    try{
      const r = await fetch(path);
      if(r.ok){ return await r.json(); }
      console.warn('github-commits falhou, tentando API direta', r.status);
    }catch(err){ console.warn('github-commits erro', err); }
    // fallback: API direta (apenas para repositórios públicos)
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
    const commits = await fetchCommits({ owner, repo, since: range.since, until: range.until, perPage: 50 });
    const filtered = filterByText(commits, q);
    renderCommits(filtered);
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

    const { owner, repo } = parseRepoParam();
    if(!owner || !repo){
      showToast('Configure o repositório via ?repo=owner/nome ou data-owner/data-repo.', 'info', { duration: 6000 });
    }

    let currentSeason = parseSeason() || (root.dataset.seasonDefault || 'all');
    let currentQuery = '';

    // ativa chip conforme season
    const chips = Array.from(document.querySelectorAll('.cmd-filters .chip'));
    chips.forEach(c => c.classList.remove('active'));
    const targetChip = chips.find(c => c.getAttribute('data-season') === String(currentSeason)) || chips[0];
    if(targetChip){ targetChip.classList.add('active'); }

    const reload = ()=> loadAndRender({ owner, repo, season: currentSeason, q: currentQuery });

    setupChips((season)=>{ currentSeason = season; reload(); });
    setupSearch((q)=>{ currentQuery = q; reload(); });

    reload();
  };
})();
