const BOT_ID = "1435471760979136765";
const SUPPORT_SERVER_URL = "https://discord.com/invite/6daVxgAudS";

function inviteUrl(id){
  return `https://discord.com/oauth2/authorize?client_id=${id}&permissions=2147576832&scope=bot%20applications.commands`;
}

// --- Discord OAuth (user sign-in) ---
const DISCORD_CLIENT_ID = BOT_ID;
const OAUTH_SCOPES = "identify openid email guilds";
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
    if(!res.ok) throw new Error('Falha ao trocar código por token');
    const data = await res.json();
    return data.user || null;
  }catch(err){ console.warn('OAuth erro:', err); return null; }
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
  if(expect && state !== expect){ console.warn('State inválido'); return; }
  // In local preview, Netlify functions não estão disponíveis. Apenas ignora.
  const user = await exchangeCodeForUser(code);
  if(user){ try{ localStorage.setItem('discord_user', JSON.stringify(user)); }catch{} renderUserChip(user); }
  // Limpa parâmetros da URL
  history.replaceState({}, document.title, window.location.pathname);
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
