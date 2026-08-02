/* =========================================================================
   dados.js — modelo, armazenamento local e sincronização com o Supabase.

   Tudo é gravado primeiro no aparelho e só depois enviado. Se o Supabase
   estiver fora do ar, desconfigurado ou o celular sem internet, o app
   continua funcionando inteiro — só não compartilha.
   ========================================================================= */

/* ================= conteúdo editável ================= */
/* Mexa aqui para mudar cardápio, treinos e horários padrão. Vale só para
   contas novas: depois de criadas, as metas e refeições viram dados
   editáveis dentro do próprio app.                                        */

const CARDAPIO = {
  1:{a:"Filé mignon grelhado 200g + arroz c/ cenoura 4 col + feijão 1 concha", j:"Peito de frango grelhado 200g + purê 3 col"},
  2:{a:"Carne moída de patinho 200g + arroz 4 col + feijão 1 concha", j:"Posta de peixe branco 200g + purê 3 col"},
  3:{a:"Frango assado sem pele 200g + arroz c/ cenoura 5 col", j:"Filé mignon grelhado 180g + purê 3 col"},
  4:{a:"Filé ao molho madeira 200g + arroz 4 col + feijão 1 concha", j:"Carne moída 180g + macarrão 1 pires"},
  5:{a:"Peixe branco 220g + pirão 3 col + arroz 2 col", j:"Peito de frango 200g + purê 3 col"},
  6:{a:"Filé mignon grelhado 200g + arroz c/ cenoura 4 col + feijão 1 concha", j:"NOITE LIVRE — escolha: álcool ou comida"},
  0:{a:"Frango assado sem pele 220g + arroz c/ cenoura 4 col + feijão 1 concha", j:"Carne moída 150g + purê 2 col"}
};

const TREINOS_LUIS = [
  {nome:"A — Pernas (frente)",     tipo:"forca", dias:[1], exercicios:["Agachamento livre","Leg press","Cadeira extensora","Panturrilha em pé"]},
  {nome:"B — Empurrar",            tipo:"forca", dias:[2], exercicios:["Supino reto","Supino inclinado halteres","Desenvolvimento","Tríceps corda"]},
  {nome:"C — Puxar",               tipo:"forca", dias:[3], exercicios:["Barra fixa","Remada curvada","Puxada frontal","Rosca direta"]},
  {nome:"D — Pernas (posterior)",  tipo:"forca", dias:[4], exercicios:["Levantamento terra","Mesa flexora","Cadeira abdutora","Panturrilha sentado"]},
  {nome:"E — Ombro, braço e core", tipo:"forca", dias:[5], exercicios:["Elevação lateral","Elevação frontal","Rosca martelo","Prancha"]}
];

const AGUA_H = ["08:00","11:00","14:00","17:00","20:00"];
const PAUSA_H = ["09:00","10:00","11:00","14:00","15:00","16:00","17:00","18:00"];

/* Quanto vale cada coisa no Duelo. Mude à vontade — o placar recalcula sozinho. */
const PONTOS = {
  meta:1,          // cada meta diária concluída
  diaCompleto:5,   // bônus por bater todas as metas do dia
  metaSemanal:4,   // cada meta semanal concluída
  refeicao:1,      // cada refeição marcada
  treino:3,        // cada sessão de treino registrada
  estudo30:2,      // cada 30 min de estudo
  questao10:2,     // cada 10 questões respondidas
  acertoAlto:3,    // bônus por lote de questões com 80% ou mais
  guardou:3        // cada dia em que guardou dinheiro
};

/* ================= contas ================= */
/* Sem Supabase, o login é local e serve só para separar os perfis no
   aparelho — não é segurança. Com Supabase, a senha passa a ser conferida
   no servidor e aí vira autenticação de verdade.                          */
const CONTAS = {
  luis :{nome:"Luís",  hash:"398cf107713a4a5995293717df73e726a8a2e5c10699ed222f3a4271e01f5fab"},
  mayla:{nome:"Mayla", hash:"ec3296faf2748c7a58722a11a2355d145c3a60d44f9d58783063fb817390ef44"}
};
const DOMINIO = "agenda.app";
const nomeDe = u => (CONTAS[u] && CONTAS[u].nome) || u;

let USUARIO = null;   // 'luis' | 'mayla'
let OUTRO   = null;   // a outra conta

/* ================= armazenamento (Claude ou navegador) ================= */
let storeKind = "memória";
const store = {
  async get(k){
    if(window.storage){ try{ const r=await window.storage.get(k); storeKind="Claude"; return r&&r.value; }catch(e){ storeKind="Claude"; return null; } }
    try{ storeKind="navegador"; return window.localStorage.getItem(k); }catch(e){ return null; }
  },
  async set(k,v){
    if(window.storage){ try{ await window.storage.set(k,v); return true; }catch(e){ return false; } }
    try{ window.localStorage.setItem(k,v); return true; }catch(e){ return false; }
  }
};

/* ================= utilidades ================= */
const uid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
      const r=Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16);
    }));
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fromIso = s => { const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); };
const hojeIso = () => iso(new Date());
const brl = v => "R$ " + (Number(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const esc = s => String(s==null?"":s).replace(/[<>&"]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
const agora = () => new Date().toISOString();
const DOW  = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
const DOWS = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const MES  = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

/* domingo a sábado, igual ao calendário do mês */
function limitesSemana(d){
  const i=new Date(d); i.setDate(i.getDate()-i.getDay());
  const f=new Date(i); f.setDate(f.getDate()+6);
  return [iso(i), iso(f)];
}
function limitesMes(d){
  return [iso(new Date(d.getFullYear(),d.getMonth(),1)), iso(new Date(d.getFullYear(),d.getMonth()+1,0))];
}
function minutosEntre(hhmmA, hhmmB){
  const [ha,ma]=hhmmA.split(':').map(Number), [hb,mb]=hhmmB.split(':').map(Number);
  let m=(hb*60+mb)-(ha*60+ma); if(m<0) m+=1440; return m;
}
function hhmmss(seg){
  const h=Math.floor(seg/3600), m=Math.floor(seg%3600/60), s=Math.floor(seg%60);
  return [h,m,s].map(n=>String(n).padStart(2,'0')).join(':');
}

async function sha256(t){
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
}

/* ================= banco local ================= */
/* Um registro serve para tudo. `tipo` diz o que é, `payload` guarda o miolo.
   Um único formato significa uma única rotina de sincronia.                */
let DB = [];                 // todos os registros visíveis para mim
let PORID = new Map();
let ultimaSync = null;
let salvarTimer = null;

const chaveLocal = () => `agenda2-${USUARIO}`;

/* Índice por tipo. Sem ele, cada listar() varre o array inteiro — e uma
   tela chega a chamar listar() centenas de vezes. */
let IDX = null;
function invalidar(){ IDX = null; }
function indicePorTipo(){
  if(IDX) return IDX;
  IDX = new Map();
  for(const r of DB){
    if(r.apagado) continue;
    let a = IDX.get(r.tipo);
    if(!a){ a = []; IDX.set(r.tipo, a); }
    a.push(r);
  }
  return IDX;
}
function indexar(){ PORID = new Map(DB.map(r=>[r.id,r])); invalidar(); }

async function carregarLocal(){
  const raw = await store.get(chaveLocal());
  DB = []; ultimaSync = null;
  if(raw){
    try{
      const o = JSON.parse(raw);
      DB = Array.isArray(o.registros) ? o.registros : [];
      ultimaSync = o.ultimaSync || null;
    }catch(e){}
  }
  indexar();
}
function gravarLocalJa(){
  if(!USUARIO) return;
  clearTimeout(salvarTimer);
  try{ store.set(chaveLocal(), JSON.stringify({registros:DB, ultimaSync})); }catch(e){}
}
function gravarLocal(){
  if(!USUARIO) return;
  clearTimeout(salvarTimer);
  salvarTimer = setTimeout(gravarLocalJa, 300);
}

/* --- consultas --- */
function listar(f={}){
  let base;
  if(f.tipo)       base = indicePorTipo().get(f.tipo) || [];
  else if(f.tipos) base = f.tipos.flatMap(t => indicePorTipo().get(t) || []);
  else             base = DB;
  return base.filter(r=>{
    if(r.apagado) return false;
    if(f.dono && r.dono!==f.dono) return false;
    if(f.data && r.data!==f.data) return false;
    if(f.de && (!r.data || r.data<f.de)) return false;
    if(f.ate && (!r.data || r.data>f.ate)) return false;
    return true;
  });
}
const obter = id => PORID.get(id);

function criar(tipo, {data=null, payload={}, compartilhado=false, dono=USUARIO}={}){
  const r = {id:uid(), dono, tipo, data, payload, compartilhado, apagado:false,
             atualizado_em:agora(), _sujo:true};
  DB.push(r); PORID.set(r.id, r); invalidar(); gravarLocal(); agendarSync();
  return r;
}
function atualizar(id, mudanca){
  const r = PORID.get(id); if(!r) return null;
  if(r.dono !== USUARIO) return null;           // não mexo no que é do outro
  Object.assign(r, mudanca);
  r.atualizado_em = agora(); r._sujo = true;
  invalidar(); gravarLocal(); agendarSync();
  return r;
}
function apagar(id){
  const r = PORID.get(id); if(!r || r.dono!==USUARIO) return false;
  r.apagado = true; r.atualizado_em = agora(); r._sujo = true;
  invalidar(); gravarLocal(); agendarSync();
  return true;
}

/* ================= Supabase ================= */
/* Projeto deste app. A chave abaixo é a *publicável* (anon) e é feita para
   ficar à vista no navegador — sozinha ela não lê nem escreve nada: quem
   barra é o Row Level Security, que exige login e só deixa cada conta mexer
   no que é dela. Está verificado: sem token, leitura volta vazia e escrita
   é recusada.

   NUNCA coloque aqui a chave `service_role` nem a `sb_secret_...`. Essas
   ignoram o RLS e dariam acesso total a quem abrisse o código-fonte.       */
const SB_PADRAO = {
  url: "https://zucnhqvhiqmrqpshmwoy.supabase.co",
  key: "sb_publishable_6BMbkXB7lwNTTk_8e9Le_A_TPRrqH3_"
};

const SB = {url:"", key:"", token:"", refresh:"", expira:0, ligado:false};
let sbEstado = "off";        // off | on | erro | sync
let aoMudarSync = ()=>{};

async function carregarConfigSb(){
  SB.url = SB_PADRAO.url; SB.key = SB_PADRAO.key;
  try{
    /* o que estiver salvo nos Ajustes vence o padrão — permite apontar
       para outro projeto sem mexer no código */
    const raw = window.localStorage.getItem("agenda-supabase");
    if(raw){
      const o = JSON.parse(raw);
      if(o.desligado){ SB.url=""; SB.key=""; }
      else { if(o.url) SB.url=o.url; if(o.key) SB.key=o.key; }
    }
    const s = window.localStorage.getItem("agenda-sb-sessao");
    if(s){ const o=JSON.parse(s); SB.token=o.token||""; SB.refresh=o.refresh||""; SB.expira=o.expira||0; }
  }catch(e){}
  SB.ligado = !!(SB.url && SB.key);
}
function gravarConfigSb(){
  try{ window.localStorage.setItem("agenda-supabase", JSON.stringify({url:SB.url,key:SB.key})); }catch(e){}
  SB.ligado = !!(SB.url && SB.key);
}
function gravarSessaoSb(){
  try{ window.localStorage.setItem("agenda-sb-sessao", JSON.stringify({token:SB.token,refresh:SB.refresh,expira:SB.expira})); }catch(e){}
}
function limparSb(){
  SB.url=""; SB.key=""; SB.token=""; SB.refresh=""; SB.expira=0; SB.ligado=false;
  try{
    /* grava a recusa explícita, senão o padrão embutido voltaria sozinho */
    window.localStorage.setItem("agenda-supabase", JSON.stringify({desligado:true}));
    window.localStorage.removeItem("agenda-sb-sessao");
  }catch(e){}
  marcarSync("off");
}
function marcarSync(e, msg){ sbEstado=e; aoMudarSync(e, msg); }

function cabecalhos(comAuth=true){
  const h = {"apikey":SB.key, "Content-Type":"application/json"};
  if(comAuth && SB.token) h["Authorization"] = "Bearer "+SB.token;
  return h;
}

async function sbLogin(usuario, senha){
  const r = await fetch(`${SB.url}/auth/v1/token?grant_type=password`, {
    method:"POST", headers:cabecalhos(false),
    body: JSON.stringify({email:`${usuario}@${DOMINIO}`, password:senha})
  });
  if(!r.ok) return false;
  const d = await r.json();
  SB.token=d.access_token; SB.refresh=d.refresh_token;
  SB.expira = Date.now() + (d.expires_in||3600)*1000;
  gravarSessaoSb();
  return true;
}
async function sbRenovar(){
  if(!SB.refresh) return false;
  const r = await fetch(`${SB.url}/auth/v1/token?grant_type=refresh_token`, {
    method:"POST", headers:cabecalhos(false), body: JSON.stringify({refresh_token:SB.refresh})
  });
  if(!r.ok){ SB.token=""; SB.refresh=""; gravarSessaoSb(); return false; }
  const d = await r.json();
  SB.token=d.access_token; SB.refresh=d.refresh_token||SB.refresh;
  SB.expira = Date.now() + (d.expires_in||3600)*1000;
  gravarSessaoSb();
  return true;
}
async function garantirToken(){
  if(!SB.ligado) return false;
  if(SB.token && Date.now() < SB.expira - 60000) return true;
  return await sbRenovar();
}

/* --- sincronização: empurra o que está sujo, puxa o que mudou --- */
let syncTimer = null, sincronizando = false;
function agendarSync(){
  if(!SB.ligado) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(()=>sincronizar().catch(()=>{}), 1500);
}

async function sincronizar({silencioso=true}={}){
  if(!SB.ligado || sincronizando) return false;
  if(!navigator.onLine){ marcarSync("erro","sem internet"); return false; }
  sincronizando = true;
  if(!silencioso) marcarSync("sync","sincronizando");
  try{
    if(!(await garantirToken())){
      marcarSync("erro", SB.refresh ? "sessão expirada — entre de novo"
                                    : "sem login no servidor — só este aparelho");
      return false;
    }

    /* empurra */
    const sujos = DB.filter(r=>r._sujo && r.dono===USUARIO);
    if(sujos.length){
      const corpo = sujos.map(({_sujo, ...r})=>r);
      const r = await fetch(`${SB.url}/rest/v1/registros`, {
        method:"POST",
        headers:{...cabecalhos(), "Prefer":"resolution=merge-duplicates,return=minimal"},
        body: JSON.stringify(corpo)
      });
      if(!r.ok) throw new Error("push "+r.status);
      sujos.forEach(r=>{ delete r._sujo; });
    }

    /* puxa — 2s de folga para não perder gravação concorrente */
    let desde = "1970-01-01T00:00:00Z";
    if(ultimaSync) desde = new Date(new Date(ultimaSync).getTime()-2000).toISOString();
    const q = `${SB.url}/rest/v1/registros?select=*&atualizado_em=gt.${encodeURIComponent(desde)}&order=atualizado_em.asc`;
    const rr = await fetch(q, {headers:cabecalhos()});
    if(!rr.ok) throw new Error("pull "+rr.status);
    const vindos = await rr.json();

    let maior = ultimaSync;
    for(const v of vindos){
      const meu = PORID.get(v.id);
      if(!meu){ DB.push(v); PORID.set(v.id, v); }
      else if(!meu._sujo || new Date(v.atualizado_em) > new Date(meu.atualizado_em)){
        Object.assign(meu, v); delete meu._sujo;
      }
      if(!maior || new Date(v.atualizado_em) > new Date(maior)) maior = v.atualizado_em;
    }
    if(maior) ultimaSync = maior;
    if(vindos.length) invalidar();

    gravarLocalJa();
    marcarSync("on", "em dia");
    if(vindos.length) document.dispatchEvent(new CustomEvent("dados:mudou"));
    return true;
  }catch(e){
    marcarSync("erro", String(e.message||e));
    return false;
  }finally{
    sincronizando = false;
  }
}

/* ================= sementes para conta nova ================= */
function semearSeVazio(){
  if(listar({tipo:"meta_def", dono:USUARIO}).length) return false;

  const metas = [
    {titulo:"Beber água",        cat:"saude",   periodo:"diario", alvo:3000, unidade:"ml",     passo:250, dias:[0,1,2,3,4,5,6]},
    {titulo:"Levantar e andar",  cat:"saude",   periodo:"diario", alvo:8,    unidade:"pausas", passo:1,   dias:[1,2,3,4,5]},
    {titulo:"8.000 passos",      cat:"saude",   periodo:"diario", alvo:1,    unidade:"",       passo:1,   dias:[0,1,2,3,4,5,6]},
    {titulo:"Leitura 20 min",    cat:"leitura", periodo:"diario", alvo:1,    unidade:"",       passo:1,   dias:[0,1,2,3,4,5,6]},
    {titulo:"Dormir 7h",         cat:"saude",   periodo:"diario", alvo:1,    unidade:"",       passo:1,   dias:[0,1,2,3,4,5,6]}
  ];
  metas.forEach(m => criar("meta_def", {payload:{...m, ativo:true}}));

  /* dieta: o Luís já tem cardápio fechado; a Mayla começa com a estrutura vazia */
  const refeicoes = USUARIO==="luis"
    ? [{nome:"Shake pós-treino",hora:"06:40",desc:"35g whey isolado + 40g aveia + 1 fruta"},
       {nome:"Almoço",hora:"12:30",desc:"__CARDAPIO_A__"},
       {nome:"Lanche",hora:"16:00",desc:"2 fatias de pão integral + 1 col. requeijão light + shake de 20g de whey"},
       {nome:"Jantar",hora:"19:00",desc:"__CARDAPIO_J__"},
       {nome:"Ceia",hora:"21:30",desc:"25g de whey com água gelada + uva congelada"}]
    : [{nome:"Café da manhã",hora:"07:00",desc:""},
       {nome:"Lanche da manhã",hora:"10:00",desc:""},
       {nome:"Almoço",hora:"12:30",desc:""},
       {nome:"Lanche da tarde",hora:"16:00",desc:""},
       {nome:"Jantar",hora:"19:30",desc:""}];
  refeicoes.forEach(r => criar("refeicao_def", {payload:{...r, dias:[0,1,2,3,4,5,6], ativo:true}}));

  if(USUARIO==="luis"){
    TREINOS_LUIS.forEach(t => criar("treino_def", {payload:{
      nome:t.nome, tipo:t.tipo, dias:t.dias, notas:"",
      exercicios: t.exercicios.map(n=>({nome:n, series:3, reps:"10"}))
    }}));
  }

  criar("cfg", {payload:{treinoHora:"05:30", leituraHora:"22:20", pausaIcs:true}});
  return true;
}

function config(){
  const c = listar({tipo:"cfg", dono:USUARIO})[0];
  return c ? c.payload : {treinoHora:"05:30", leituraHora:"22:20", pausaIcs:true};
}
function salvarConfig(mudanca){
  const c = listar({tipo:"cfg", dono:USUARIO})[0];
  if(c) atualizar(c.id, {payload:{...c.payload, ...mudanca}});
  else criar("cfg", {payload:mudanca});
}

/* ================= metas do dia ================= */
function descricaoRefeicao(def, dataIso){
  const d = def.payload.desc||"";
  if(d==="__CARDAPIO_A__") return CARDAPIO[fromIso(dataIso).getDay()].a;
  if(d==="__CARDAPIO_J__") return CARDAPIO[fromIso(dataIso).getDay()].j;
  return d;
}

function metasDoDia(dono, dataIso){
  const dow = fromIso(dataIso).getDay();
  const defs = listar({tipo:"meta_def", dono}).filter(d=>d.payload.ativo!==false
    && d.payload.periodo==="diario"
    && (!d.payload.dias || d.payload.dias.includes(dow)));
  const logs = listar({tipo:"meta_log", dono, data:dataIso});
  return defs.map(def=>{
    const log = logs.find(l=>l.payload.defId===def.id);
    const valor = log ? Number(log.payload.valor)||0 : 0;
    const alvo = Number(def.payload.alvo)||1;
    return {def, log, valor, alvo, feito: valor>=alvo};
  });
}
function metasDaSemana(dono, dataIso){
  const [ini] = limitesSemana(fromIso(dataIso));
  const defs = listar({tipo:"meta_def", dono}).filter(d=>d.payload.ativo!==false && d.payload.periodo==="semanal");
  const logs = listar({tipo:"meta_log", dono, data:ini});
  return defs.map(def=>{
    const log = logs.find(l=>l.payload.defId===def.id);
    const valor = log ? Number(log.payload.valor)||0 : 0;
    const alvo = Number(def.payload.alvo)||1;
    return {def, log, valor, alvo, feito: valor>=alvo, semanaIni:ini};
  });
}
function marcarMeta(def, dataIso, valor){
  const logs = listar({tipo:"meta_log", dono:USUARIO, data:dataIso});
  const log = logs.find(l=>l.payload.defId===def.id);
  if(log) atualizar(log.id, {payload:{...log.payload, valor}});
  else criar("meta_log", {data:dataIso, payload:{defId:def.id, valor}});
}

function refeicoesDoDia(dono, dataIso){
  const dow = fromIso(dataIso).getDay();
  const defs = listar({tipo:"refeicao_def", dono}).filter(d=>d.payload.ativo!==false
    && (!d.payload.dias || d.payload.dias.includes(dow)));
  const logs = listar({tipo:"refeicao_log", dono, data:dataIso});
  return defs.sort((a,b)=>(a.payload.hora||"").localeCompare(b.payload.hora||""))
    .map(def=>{
      const log = logs.find(l=>l.payload.defId===def.id);
      return {def, log, feito: !!(log && log.payload.feito), desc: descricaoRefeicao(def, dataIso)};
    });
}
function marcarRefeicao(def, dataIso, feito){
  const logs = listar({tipo:"refeicao_log", dono:USUARIO, data:dataIso});
  const log = logs.find(l=>l.payload.defId===def.id);
  if(log) atualizar(log.id, {payload:{...log.payload, feito}});
  else criar("refeicao_log", {data:dataIso, payload:{defId:def.id, feito}});
}

/* ================= eventos ================= */
/* Meus eventos sempre; do outro, só os que ele marcou como compartilhados. */
function eventosVisiveis(de, ate){
  return listar({tipo:"evento", de, ate})
    .filter(e => e.dono===USUARIO || e.compartilhado)
    .sort((a,b)=> (a.data+(a.payload.hora||"")).localeCompare(b.data+(b.payload.hora||"")));
}

/* ================= estudo ================= */
function tags(dono, tipo){
  return listar({tipo:"tag", dono}).filter(t=>!tipo || t.payload.tipo===tipo);
}
function estudoDoPeriodo(dono, de, ate){
  const sessoes  = listar({tipo:"estudo_sessao",  dono, de, ate});
  const aulas    = listar({tipo:"estudo_aula",    dono, de, ate});
  const questoes = listar({tipo:"estudo_questoes",dono, de, ate});
  const minutos  = sessoes.reduce((n,s)=>n+(Number(s.payload.minutos)||0),0)
                 + aulas.reduce((n,a)=>n+(Number(a.payload.minutos)||0),0);
  const total   = questoes.reduce((n,q)=>n+(Number(q.payload.total)||0),0);
  const acertos = questoes.reduce((n,q)=>n+(Number(q.payload.acertos)||0),0);
  return {sessoes, aulas, questoes, minutos, total, acertos,
          taxa: total ? Math.round(100*acertos/total) : null};
}
function desempenhoPorAssunto(dono, de, ate){
  const mapa = new Map();
  listar({tipo:"estudo_questoes", dono, de, ate}).forEach(q=>{
    (q.payload.assuntos||[]).forEach(tid=>{
      const t = obter(tid); if(!t) return;
      const a = mapa.get(tid) || {nome:t.payload.nome, total:0, acertos:0};
      a.total   += Number(q.payload.total)||0;
      a.acertos += Number(q.payload.acertos)||0;
      mapa.set(tid, a);
    });
  });
  return [...mapa.values()].map(a=>({...a, taxa: a.total?Math.round(100*a.acertos/a.total):0}))
    .sort((x,y)=>x.taxa-y.taxa);
}

/* ================= dinheiro ================= */
function finDoPeriodo(dono, de, ate){
  const txs = listar({tipo:"tx", dono, de, ate});
  const som = t => txs.filter(x=>x.payload.tipo===t).reduce((n,x)=>n+(Number(x.payload.valor)||0),0);
  const ganhou=som("ganho"), gastou=som("gasto"), guardou=som("guardado");
  return {txs, ganhou, gastou, guardou, saldo: ganhou-gastou-guardou};
}

/* ================= placar do Duelo ================= */
/* Da primeira marcação de qualquer um até hoje. Sem isto o placar "Geral"
   varreria milênios de dias vazios. */
function limitesGeral(){
  let min = hojeIso();
  for(const r of DB){ if(r.data && !r.apagado && r.data < min) min = r.data; }
  return [min, hojeIso()];
}

function pontuar(dono, de, ate){
  const d = {metas:0, dias:0, semanais:0, refeicoes:0, treinos:0, estudo:0, questoes:0, guardou:0};

  /* Só os dias em que existe alguma marcação. Dia sem registro nenhum
     rende zero de qualquer jeito, então varrer o calendário inteiro só
     queima tempo. */
  const diasComDado = new Set();
  listar({tipo:"meta_log",     dono, de, ate}).forEach(l=>diasComDado.add(l.data));
  listar({tipo:"refeicao_log", dono, de, ate}).forEach(l=>diasComDado.add(l.data));

  for(const dia of diasComDado){
    const ms = metasDoDia(dono, dia);
    const feitas = ms.filter(m=>m.feito).length;
    d.metas += feitas * PONTOS.meta;
    if(ms.length && feitas===ms.length) d.dias += PONTOS.diaCompleto;
    d.refeicoes += refeicoesDoDia(dono, dia).filter(r=>r.feito).length * PONTOS.refeicao;
  }

  listar({tipo:"meta_log", dono, de, ate}).forEach(l=>{
    const def = obter(l.payload.defId);
    if(def && def.payload.periodo==="semanal" && (Number(l.payload.valor)||0) >= (Number(def.payload.alvo)||1))
      d.semanais += PONTOS.metaSemanal;
  });

  d.treinos = listar({tipo:"treino_log", dono, de, ate}).length * PONTOS.treino;

  const e = estudoDoPeriodo(dono, de, ate);
  d.estudo = Math.floor(e.minutos/30) * PONTOS.estudo30;
  d.questoes = Math.floor(e.total/10) * PONTOS.questao10;
  listar({tipo:"estudo_questoes", dono, de, ate}).forEach(q=>{
    const t=Number(q.payload.total)||0, a=Number(q.payload.acertos)||0;
    if(t>=10 && a/t>=0.8) d.questoes += PONTOS.acertoAlto;
  });

  const diasComGuardado = new Set(
    listar({tipo:"tx", dono, de, ate}).filter(t=>t.payload.tipo==="guardado" && Number(t.payload.valor)>0).map(t=>t.data)
  );
  d.guardou = diasComGuardado.size * PONTOS.guardou;

  const total = Object.values(d).reduce((a,b)=>a+b,0);
  return {total, detalhe:d, estudo:e};
}

/* ================= entrar e sair ================= */
async function conferirLocal(u, senha){
  const c = CONTAS[u]; if(!c) return false;
  return (await sha256(`agenda-v1|${u}|${senha}`)) === c.hash;
}

async function entrar(usuario, senha){
  const u = String(usuario||"").trim().toLowerCase();
  if(!CONTAS[u]) return {ok:false, erro:"Usuário ou senha incorretos."};

  await carregarConfigSb();

  async function abrir(u){
    USUARIO = u; OUTRO = u==="luis" ? "mayla" : "luis";
    await carregarLocal(); semearSeVazio();
  }

  if(SB.ligado){
    let ok = false, caiu = false;
    try{ ok = await sbLogin(u, senha); }
    catch(e){ caiu = true; }

    if(ok){
      await abrir(u);
      marcarSync("on","conectado");
      sincronizar({silencioso:false});
      return {ok:true};
    }

    /* O servidor não autenticou. Pode ser senha errada, servidor fora do ar,
       ou as contas ainda não terem sido criadas no painel do Supabase. Em
       vez de deixar o app inutilizável, aceito a senha local e entro em modo
       offline — sem token não se lê nem se escreve nada no servidor, então
       o que aparece é só o que já está neste aparelho. */
    if(await conferirLocal(u, senha)){
      await abrir(u);
      marcarSync("erro", caiu ? "servidor inacessível — só este aparelho"
                              : "sem conta no servidor — só este aparelho");
      return {ok:true, offline:true,
              aviso: caiu ? "Servidor fora do ar. Trabalhando só neste aparelho."
                          : "O servidor não reconheceu esse login, então nada será compartilhado. Crie as contas no Supabase."};
    }
    return {ok:false, erro: caiu ? "Servidor inacessível e a senha local não confere."
                                 : "Usuário ou senha incorretos."};
  }

  if(!(await conferirLocal(u, senha))) return {ok:false, erro:"Usuário ou senha incorretos."};
  await abrir(u);
  marcarSync("off","só neste aparelho");
  return {ok:true};
}

async function sair(){
  gravarLocalJa();
  try{
    window.localStorage.removeItem("agenda-sb-sessao");
    window.localStorage.setItem("agenda-sessao","");
  }catch(e){}
  SB.token=""; SB.refresh=""; SB.expira=0;
  USUARIO=null; OUTRO=null;
}

/* grava na hora quando o app some da tela */
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden'){ gravarLocalJa(); sincronizar().catch(()=>{}); } });
window.addEventListener('pagehide', gravarLocalJa);
window.addEventListener('online', ()=>sincronizar().catch(()=>{}));
