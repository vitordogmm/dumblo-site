const BOT_ID = "1435471760979136765";
const SUPPORT_SERVER_URL = "https://discord.com/invite/6daVxgAudS";

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
  chip.innerHTML = `<img src="${avatarUrl}" alt="Avatar" class="user-avatar" width="24" height="24" />
    <span class="user-name">${user ? (user.global_name || user.username) : 'Conectado'}</span>`;
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
  if(expect && state && state !== expect){ console.warn('State inválido'); return; }
  // In local preview, Netlify functions não estão disponíveis. Apenas ignora.
  const user = await exchangeCodeForUser(code);
  if(user){
    try{ localStorage.setItem('discord_user', JSON.stringify(user)); }catch{}
    renderUserChip(user);
    // Persistência opcional no banco via função serverless
    saveUserToDB(user).catch(err=>console.warn('Persistência de usuário falhou:', err));
  }else{
    // Se a troca falhar, mantenha a sessão prévia se existir
    try{
      const raw = localStorage.getItem('discord_user');
      const prev = raw ? JSON.parse(raw) : null;
      if(prev){
        renderUserChip(prev);
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
