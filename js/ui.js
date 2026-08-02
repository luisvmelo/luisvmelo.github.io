/* =========================================================================
   ui.js — tudo que aparece na tela.
   Depende de dados.js, que precisa vir antes no index.html.
   ========================================================================= */

const el = id => document.getElementById(id);
const dlg = () => el('modal');

let VENDO = {};                       // qual conta estou olhando em cada aba
let dMetas = hojeIso(), dDieta = hojeIso(), diaSel = hojeIso();
let mAgenda = new Date(), mFin = new Date(), mFinc = new Date();
let deferredInstall = null;
let tickTimer = null, timerTimer = null;

function toast(msg){
  const t = el('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(()=>t.classList.remove('on'), 2200);
}
const soLeitura = aba => VENDO[aba] !== USUARIO;

/* ================= formulário genérico em modal ================= */
function campoHtml(c, v){
  const val = v==null ? "" : v;
  const lab = `<label class="fld" for="f_${c.k}">${esc(c.l)}</label>`;
  if(c.t === "textarea")
    return `<div class="fld-wrap">${lab}<textarea id="f_${c.k}" rows="3">${esc(val)}</textarea></div>`;
  if(c.t === "select")
    return `<div class="fld-wrap">${lab}<select id="f_${c.k}">${
      c.opts.map(o=>`<option value="${esc(o.v)}"${String(o.v)===String(val)?" selected":""}>${esc(o.n)}</option>`).join('')
    }</select></div>`;
  if(c.t === "checkbox")
    return `<div class="fld-wrap row"><label><input type="checkbox" id="f_${c.k}"${val?" checked":""}> ${esc(c.l)}</label></div>`;
  if(c.t === "dias"){
    const sel = Array.isArray(val)?val:[0,1,2,3,4,5,6];
    return `<div class="fld-wrap">${lab}<div class="tagpick" id="f_${c.k}">${
      DOWS.map((d,i)=>`<button type="button" data-d="${i}" aria-pressed="${sel.includes(i)}">${d}</button>`).join('')
    }</div></div>`;
  }
  if(c.t === "tags"){
    const sel = Array.isArray(val)?val:(val?[val]:[]);
    const lista = tags(USUARIO, c.tipoTag);
    const corpo = lista.length
      ? lista.map(t=>`<button type="button" data-t="${t.id}" aria-pressed="${sel.includes(t.id)}">${esc(t.payload.nome)}</button>`).join('')
      : `<span class="empty" style="padding:0">Nenhuma tag de ${esc(c.tipoTag)} ainda — crie em Estudo → Tags.</span>`;
    return `<div class="fld-wrap">${lab}<div class="tagpick" id="f_${c.k}" data-multi="${c.multi?1:0}">${corpo}</div></div>`;
  }
  const extra = (c.t==="number" ? ` step="${c.step||"any"}"` : "") + (c.min!=null?` min="${c.min}"`:"");
  return `<div class="fld-wrap">${lab}<input id="f_${c.k}" type="${c.t||"text"}" value="${esc(val)}"${extra}${c.req?" required":""}></div>`;
}

function modalForm(titulo, campos, valores={}, rotulo="Salvar"){
  return new Promise(res=>{
    const d = dlg();
    el('modalBody').innerHTML =
      `<h2>${esc(titulo)}</h2><form id="mf" novalidate>
         ${campos.map(c=>campoHtml(c, valores[c.k])).join('')}
         <div class="row" style="margin-top:4px">
           <button class="btn primary" type="submit">${esc(rotulo)}</button>
           <button class="btn" type="button" id="mfCancel">Cancelar</button>
         </div>
       </form>`;

    /* botõezinhos de dias e tags */
    el('modalBody').querySelectorAll('.tagpick').forEach(box=>{
      box.addEventListener('click', ev=>{
        const b = ev.target.closest('button'); if(!b) return;
        const multi = box.dataset.multi !== "0";
        const ligado = b.getAttribute('aria-pressed')==="true";
        if(!multi && !ligado) box.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed','false'));
        b.setAttribute('aria-pressed', ligado?"false":"true");
      });
    });

    const fechar = v => { d.close(); res(v); };
    el('mfCancel').onclick = ()=>fechar(null);
    d.onclose = ()=>res(null);
    el('mf').onsubmit = ev=>{
      ev.preventDefault();
      const out = {};
      for(const c of campos){
        const n = el('f_'+c.k);
        if(c.t==="checkbox") out[c.k] = n.checked;
        else if(c.t==="dias") out[c.k] = [...n.querySelectorAll('button[aria-pressed=true]')].map(b=>+b.dataset.d);
        else if(c.t==="tags"){
          const ids = [...n.querySelectorAll('button[aria-pressed=true]')].map(b=>b.dataset.t);
          out[c.k] = c.multi ? ids : (ids[0]||null);
        }
        else if(c.t==="number") out[c.k] = n.value===""?null:Number(n.value);
        else out[c.k] = n.value.trim();
        if(c.req && (out[c.k]===""||out[c.k]==null)){ n.focus(); toast("Preencha "+c.l.toLowerCase()+"."); return; }
      }
      fechar(out);
    };
    d.showModal();
  });
}

function modalHtml(titulo, corpo, aoAbrir){
  const d = dlg();
  el('modalBody').innerHTML = `<h2>${esc(titulo)}</h2>${corpo}
    <div class="row" style="margin-top:12px"><button class="btn" type="button" id="mfClose">Fechar</button></div>`;
  el('mfClose').onclick = ()=>d.close();
  d.onclose = null;
  if(aoAbrir) aoAbrir();
  d.showModal();
}

/* ================= navegação ================= */
function montarWhoSwitch(){
  document.querySelectorAll('.whoswitch[data-who]').forEach(box=>{
    const aba = box.dataset.who;
    if(VENDO[aba]==null) VENDO[aba] = USUARIO;
    box.innerHTML = [USUARIO, OUTRO].map(u=>
      `<button type="button" data-u="${u}" aria-pressed="${VENDO[aba]===u}">${esc(u===USUARIO?"Eu":nomeDe(u))}</button>`).join('');
    box.onclick = ev=>{
      const b = ev.target.closest('button'); if(!b) return;
      VENDO[aba] = b.dataset.u;
      renderTudo();
    };
  });
}
function avisoLeitura(painel, aba){
  const p = el(painel).querySelector('.readonly-note');
  if(!p) return;
  if(soLeitura(aba)){ p.hidden=false; p.textContent = `Vendo ${nomeDe(VENDO[aba])} — somente leitura`; }
  else p.hidden = true;
}

function ligarNavegacao(){
  el('mainTabs').addEventListener('click', ev=>{
    const b = ev.target.closest('.tab'); if(!b) return;
    document.querySelectorAll('#mainTabs .tab').forEach(t=>t.setAttribute('aria-selected', t===b));
    document.querySelectorAll('.sec').forEach(s=>s.hidden = s.id!==b.dataset.s);
    renderTudo();
  });
  document.querySelectorAll('nav.subtabs').forEach(nav=>{
    nav.addEventListener('click', ev=>{
      const b = ev.target.closest('.subtab'); if(!b) return;
      nav.querySelectorAll('.subtab').forEach(t=>t.setAttribute('aria-selected', t===b));
      nav.querySelectorAll('.subtab').forEach(t=>{ const p=el(t.dataset.p); if(p) p.hidden = t!==b; });
      renderTudo();
    });
  });
  document.body.addEventListener('click', ev=>{
    const b = ev.target.closest('[data-nav]'); if(!b) return;
    const [alvo, passo] = b.dataset.nav.split(':');
    const n = Number(passo);
    if(alvo==='metas'){ const d=fromIso(dMetas); d.setDate(d.getDate()+n); dMetas=iso(d); }
    if(alvo==='dieta'){ const d=fromIso(dDieta); d.setDate(d.getDate()+n); dDieta=iso(d); }
    if(alvo==='mes'){ mAgenda.setMonth(mAgenda.getMonth()+n); }
    if(alvo==='fin'){ mFin.setMonth(mFin.getMonth()+n); }
    if(alvo==='finc'){ mFinc.setMonth(mFinc.getMonth()+n); }
    renderTudo();
  });
}

/* ================= ROTINA · metas ================= */
function renderMetas(){
  const dono = VENDO.metas;
  avisoLeitura('pMetas','metas');
  const d = fromIso(dMetas);
  el('metasCur').textContent = `${DOWS[d.getDay()]} · ${d.getDate()} ${MES[d.getMonth()].slice(0,3)}`;

  const linhas = metasDoDia(dono, dMetas);
  const box = el('metasBody');
  if(!linhas.length){ box.innerHTML = `<p class="empty">Nenhuma meta para este dia.</p>`; }
  else box.innerHTML = linhas.map(m=>{
    const p = m.def.payload;
    const contador = p.alvo > 1;
    const pctv = Math.min(100, Math.round(100*m.valor/m.alvo));
    return `<div class="item ${m.feito?'done':''}" style="--c:var(--cobalt)">
      ${contador ? "" : `<input type="checkbox" data-meta="${m.def.id}" ${m.feito?'checked':''} ${soLeitura('metas')?'disabled':''}>`}
      <div class="txt">
        <div class="t">${esc(p.titulo)}</div>
        ${contador ? `<div class="d">${m.valor} / ${m.alvo} ${esc(p.unidade||"")}</div>
          <div class="bar ${p.unidade==='ml'?'water':''}" style="margin-top:6px"><i style="width:${pctv}%"></i></div>
          ${soLeitura('metas')?"":`<div class="row" style="margin-top:8px">
            <button class="btn sm" type="button" data-inc="${m.def.id}:${p.passo||1}">+${p.passo||1}</button>
            <button class="btn sm" type="button" data-inc="${m.def.id}:-${p.passo||1}">−${p.passo||1}</button>
            <button class="btn sm" type="button" data-inc="${m.def.id}:full">Bater meta</button>
          </div>`}`
        : `<div class="d">${esc(p.unidade||"")}</div>`}
      </div>
    </div>`;
  }).join('');

  const sem = metasDaSemana(dono, dMetas);
  el('metasSemana').innerHTML = sem.length
    ? sem.map(m=>`<div class="item ${m.feito?'done':''}" style="--c:var(--purple)">
        <input type="checkbox" data-metasem="${m.def.id}" ${m.feito?'checked':''} ${soLeitura('metas')?'disabled':''}>
        <div class="txt"><div class="t">${esc(m.def.payload.titulo)}</div>
        <div class="d">meta da semana</div></div></div>`).join('')
    : `<p class="empty">Nenhuma meta semanal.</p>`;

  const pctDia = linhas.length ? Math.round(100*linhas.filter(m=>m.feito).length/linhas.length) : 0;
  if(dono===USUARIO && dMetas===hojeIso()) el('hoje-pct').textContent = pctDia+"%";

  el('novaMetaBtn').disabled = soLeitura('metas');
}

async function novaMeta(){
  const v = await modalForm("Nova meta", [
    {k:"titulo", l:"Título", t:"text", req:true},
    {k:"periodo", l:"Frequência", t:"select", opts:[{v:"diario",n:"Diária"},{v:"semanal",n:"Semanal"}]},
    {k:"alvo", l:"Alvo (1 = só marcar feito)", t:"number", min:1, step:1},
    {k:"unidade", l:"Unidade (ml, páginas, km…)", t:"text"},
    {k:"passo", l:"Botão soma quanto", t:"number", min:1, step:1},
    {k:"dias", l:"Dias da semana", t:"dias"}
  ], {alvo:1, passo:1, dias:[0,1,2,3,4,5,6]});
  if(!v) return;
  criar("meta_def", {payload:{titulo:v.titulo, periodo:v.periodo, alvo:Math.max(1,v.alvo||1),
    unidade:v.unidade, passo:Math.max(1,v.passo||1), dias:v.dias, cat:"outro", ativo:true}});
  toast("Meta criada."); renderTudo();
}

function gerirMetas(){
  const defs = listar({tipo:"meta_def", dono:USUARIO});
  modalHtml("Minhas metas", defs.length ? defs.map(d=>`
    <div class="item" style="--c:var(--cobalt)"><div class="txt">
      <div class="t">${esc(d.payload.titulo)}</div>
      <div class="d">${d.payload.periodo==="semanal"?"semanal":"diária"} · alvo ${d.payload.alvo} ${esc(d.payload.unidade||"")}</div>
    </div><button class="del" type="button" data-delmeta="${d.id}" title="Apagar">×</button></div>`).join('')
    : `<p class="empty">Nenhuma meta ainda.</p>`,
  ()=>{
    el('modalBody').addEventListener('click', ev=>{
      const b = ev.target.closest('[data-delmeta]'); if(!b) return;
      apagar(b.dataset.delmeta); dlg().close(); toast("Meta apagada."); renderTudo();
    });
  });
}

/* ================= ROTINA · agenda ================= */
function renderAgenda(){
  el('mesCur').textContent = `${MES[mAgenda.getMonth()]} ${mAgenda.getFullYear()}`;
  const [de, ate] = limitesMes(mAgenda);
  const eventos = eventosVisiveis(de, ate);

  const prim = new Date(mAgenda.getFullYear(), mAgenda.getMonth(), 1);
  const inicio = new Date(prim); inicio.setDate(1 - prim.getDay());
  let html = DOWS.map(d=>`<div class="dow">${d}</div>`).join('');
  for(let i=0;i<42;i++){
    const c = new Date(inicio); c.setDate(inicio.getDate()+i);
    const ds = iso(c), fora = c.getMonth()!==mAgenda.getMonth();
    const evs = eventos.filter(e=>e.data===ds).slice(0,2);
    const marcas = [USUARIO, OUTRO].map(u=>{
      const ms = metasDoDia(u, ds);
      const ok = ms.length && ms.every(m=>m.feito);
      return `<i class="${ok?'ok':''}" title="${esc(nomeDe(u))}"></i>`;
    }).join('');
    html += `<div class="cel ${fora?'fora':''} ${ds===hojeIso()?'hoje':''} ${ds===diaSel?'sel':''}" data-dia="${ds}">
      <div class="n">${c.getDate()}</div>
      ${evs.map(e=>`<div class="ev ${e.compartilhado?'shared':''}">${esc(e.payload.titulo)}</div>`).join('')}
      ${ds<=hojeIso() ? `<div class="dot">${marcas}</div>` : ""}
    </div>`;
  }
  el('calGrid').innerHTML = html;

  const d = fromIso(diaSel);
  el('diaSelLabel').textContent = `${DOW[d.getDay()]}, ${d.getDate()} de ${MES[d.getMonth()]}`;
  const doDia = eventos.filter(e=>e.data===diaSel);
  el('eventosDia').innerHTML = doDia.length ? doDia.map(e=>`
    <div class="item" style="--c:${e.compartilhado?'var(--sun)':'var(--cobalt)'}">
      <div class="txt">
        <div class="t">${esc(e.payload.titulo)}</div>
        <div class="d">${e.payload.hora?esc(e.payload.hora)+" · ":""}${e.compartilhado?"compartilhado":"só seu"}
          ${e.dono!==USUARIO?" · de "+esc(nomeDe(e.dono)):""}${e.payload.detalhe?" · "+esc(e.payload.detalhe):""}</div>
      </div>
      ${e.dono===USUARIO?`<button class="del" type="button" data-delev="${e.id}">×</button>`:""}
    </div>`).join('') : `<p class="empty">Nada marcado neste dia.</p>`;
}

async function novoEvento(){
  const v = await modalForm("Novo evento", [
    {k:"titulo", l:"O que é", t:"text", req:true},
    {k:"data", l:"Data", t:"date", req:true},
    {k:"hora", l:"Hora (opcional)", t:"time"},
    {k:"detalhe", l:"Detalhe", t:"textarea"},
    {k:"compartilhado", l:`Compartilhar com ${nomeDe(OUTRO)}`, t:"checkbox"}
  ], {data:diaSel, compartilhado:true});
  if(!v) return;
  criar("evento", {data:v.data, compartilhado:!!v.compartilhado,
    payload:{titulo:v.titulo, hora:v.hora, detalhe:v.detalhe}});
  toast("Evento criado."); renderTudo();
}

/* ================= DINHEIRO ================= */
function statHtml(f){
  return `<div class="in"><b>${brl(f.ganhou)}</b><span>Ganhou</span></div>
          <div class="out"><b>${brl(f.gastou)}</b><span>Gastou</span></div>
          <div class="keep"><b>${brl(f.guardou)}</b><span>Guardou</span></div>
          <div><b>${brl(f.saldo)}</b><span>Sobrou</span></div>`;
}
const rotuloTx = t => ({ganho:"Ganho", gasto:"Gasto", guardado:"Guardado"}[t]||t);
const classeTx = t => ({ganho:"in", gasto:"out", guardado:"keep"}[t]||"");

function txHtml(t, mostrarDono){
  return `<div class="tx">
    <span class="dt">${t.data.slice(8,10)}/${t.data.slice(5,7)}</span>
    <span>${esc(t.payload.desc||rotuloTx(t.payload.tipo))}${mostrarDono?` <span class="dt">· ${esc(nomeDe(t.dono))}</span>`:""}</span>
    <span class="v ${classeTx(t.payload.tipo)}">${t.payload.tipo==="gasto"?"−":"+"}${brl(t.payload.valor)}</span>
    ${t.dono===USUARIO?`<button class="del" type="button" data-deltx="${t.id}">×</button>`:""}
  </div>`;
}

function renderFinInd(){
  const dono = VENDO.fin;
  avisoLeitura('pFinInd','fin');
  el('finCur').textContent = `${MES[mFin.getMonth()]} ${mFin.getFullYear()}`;
  const [de, ate] = limitesMes(mFin);
  const f = finDoPeriodo(dono, de, ate);
  el('finStat').innerHTML = statHtml(f);
  const ordenados = f.txs.slice().sort((a,b)=>b.data.localeCompare(a.data));
  el('finLista').innerHTML = ordenados.length ? ordenados.map(t=>txHtml(t,false)).join('')
    : `<p class="empty">Nenhum lançamento neste mês.</p>`;
  el('novaTxBtn').disabled = soLeitura('fin');
}

function renderFinComp(){
  el('fincCur').textContent = `${MES[mFinc.getMonth()]} ${mFinc.getFullYear()}`;
  const [de, ate] = limitesMes(mFinc);
  const a = finDoPeriodo(USUARIO, de, ate), b = finDoPeriodo(OUTRO, de, ate);
  const juntos = {ganhou:a.ganhou+b.ganhou, gastou:a.gastou+b.gastou,
                  guardou:a.guardou+b.guardou, saldo:a.saldo+b.saldo};
  el('fincStat').innerHTML = statHtml(juntos);

  const linha = (rot, x, y) => {
    const tot = x+y || 1;
    return `<div class="lane">
      <div class="l"><span class="v">${brl(x)}</span></div>
      <div class="mid">${esc(rot)}</div>
      <div class="r"><span class="v">${brl(y)}</span></div>
    </div>
    <div class="bar" style="margin-bottom:12px"><i style="width:${Math.round(100*x/tot)}%"></i></div>`;
  };
  el('fincQuebra').innerHTML =
    `<div class="lane"><div class="l"><b>${esc(nomeDe(USUARIO))}</b></div><div class="mid">vs</div><div class="r"><b>${esc(nomeDe(OUTRO))}</b></div></div>`
    + linha("Ganhou", a.ganhou, b.ganhou)
    + linha("Gastou", a.gastou, b.gastou)
    + linha("Guardou", a.guardou, b.guardou);

  const todos = [...a.txs, ...b.txs].sort((x,y)=>y.data.localeCompare(x.data));
  el('fincLista').innerHTML = todos.length ? todos.map(t=>txHtml(t,true)).join('')
    : `<p class="empty">Nenhum lançamento neste mês.</p>`;
}

async function novaTx(){
  const v = await modalForm("Lançar dinheiro", [
    {k:"tipo", l:"Tipo", t:"select", opts:[{v:"gasto",n:"Gastei"},{v:"ganho",n:"Ganhei"},{v:"guardado",n:"Guardei"}]},
    {k:"valor", l:"Valor (R$)", t:"number", min:0, step:"0.01", req:true},
    {k:"desc", l:"Descrição", t:"text"},
    {k:"data", l:"Data", t:"date", req:true}
  ], {data:hojeIso(), tipo:"gasto"});
  if(!v) return;
  criar("tx", {data:v.data, payload:{tipo:v.tipo, valor:Math.abs(v.valor||0), desc:v.desc}});
  toast("Lançado."); renderTudo();
}

/* ================= SAÚDE · treino ================= */
function renderTreino(){
  const dono = VENDO.treino;
  avisoLeitura('pTreino','treino');
  const defs = listar({tipo:"treino_def", dono});
  el('treinoDefs').innerHTML = defs.length ? defs.map(d=>{
    const p = d.payload;
    return `<div class="card">
      <h3>${esc(p.nome)}</h3>
      <div class="sub">${p.tipo==="cardio"?"Cardio":"Força"} · ${(p.dias||[]).map(i=>DOWS[i]).join(" ")||"livre"}</div>
      ${p.exercicios&&p.exercicios.length ? `<div style="margin-top:8px">${p.exercicios.map(e=>
        `<div style="font-size:13.5px">• ${esc(e.nome)} <span class="dt" style="color:var(--ink-soft)">${e.series||3}×${esc(e.reps||"10")}</span></div>`).join('')}</div>` : ""}
      ${p.notas?`<p style="font-size:13px;color:var(--ink-soft);margin:8px 0 0">${esc(p.notas)}</p>`:""}
      ${dono===USUARIO?`<div class="row" style="margin-top:10px">
        <button class="btn sm primary" type="button" data-logtreino="${d.id}">Registrar este</button>
        <button class="btn sm danger" type="button" data-deltreino="${d.id}">Apagar</button></div>`:""}
    </div>`;
  }).join('') : `<p class="empty">Nenhum treino montado ainda.</p>`;

  const logs = listar({tipo:"treino_log", dono}).sort((a,b)=>b.data.localeCompare(a.data)).slice(0,25);
  el('treinoLogs').innerHTML = logs.length ? logs.map(l=>{
    const p = l.payload;
    let corpo = "";
    if(p.tipo==="cardio"){
      corpo = `<div class="d">${p.duracaoMin||0} min · ${p.distanciaKm||0} km`
            + (p.pace?` · pace ${esc(p.pace)}/km`:"")
            + (p.velocidade?` · ${p.velocidade} km/h`:"") + `</div>`;
    }else{
      corpo = `<div class="d">${(p.exercicios||[]).map(e=>
        `${esc(e.nome)}: ${(e.series||[]).map(s=>`${s.reps||0}×${s.carga||0}kg`).join(", ")}`).join(" · ")||"sem detalhe"}</div>`;
    }
    return `<div class="item" style="--c:var(--cobalt)"><div class="txt">
      <div class="t">${esc(p.nome||"Treino")} <span class="dt" style="font-family:var(--mono);font-size:11px;color:var(--ink-soft)">${l.data.slice(8,10)}/${l.data.slice(5,7)}</span></div>
      ${corpo}${p.notas?`<div class="d">${esc(p.notas)}</div>`:""}
    </div>${l.dono===USUARIO?`<button class="del" type="button" data-dellog="${l.id}">×</button>`:""}</div>`;
  }).join('') : `<p class="empty">Nenhuma sessão registrada.</p>`;

  el('novoTreinoBtn').disabled = soLeitura('treino');
  el('novoTreinoLogBtn').disabled = soLeitura('treino');
}

async function novoTreinoDef(){
  const v = await modalForm("Montar treino", [
    {k:"nome", l:"Nome do treino", t:"text", req:true},
    {k:"tipo", l:"Tipo", t:"select", opts:[{v:"forca",n:"Força (séries e carga)"},{v:"cardio",n:"Cardio (tempo e distância)"}]},
    {k:"dias", l:"Dias da semana", t:"dias"},
    {k:"exercicios", l:"Exercícios, um por linha (nome | séries | reps)", t:"textarea"},
    {k:"notas", l:"Observações", t:"textarea"}
  ], {dias:[]});
  if(!v) return;
  const exercicios = (v.exercicios||"").split("\n").map(l=>l.trim()).filter(Boolean).map(l=>{
    const [nome, series, reps] = l.split("|").map(s=>(s||"").trim());
    return {nome, series:Number(series)||3, reps:reps||"10"};
  });
  criar("treino_def", {payload:{nome:v.nome, tipo:v.tipo, dias:v.dias, exercicios, notas:v.notas}});
  toast("Treino montado."); renderTudo();
}

async function registrarTreino(defId){
  const defs = listar({tipo:"treino_def", dono:USUARIO});
  let def = defId ? obter(defId) : null;

  if(!def){
    const esc0 = await modalForm("Registrar sessão", [
      {k:"defId", l:"Qual treino", t:"select",
       opts:[{v:"", n:"Avulso (sem plano)"}, ...defs.map(d=>({v:d.id, n:d.payload.nome}))]},
      {k:"tipo", l:"Se for avulso, o tipo", t:"select", opts:[{v:"forca",n:"Força"},{v:"cardio",n:"Cardio"}]}
    ], {}, "Continuar");
    if(!esc0) return;
    def = esc0.defId ? obter(esc0.defId)
        : {id:null, payload:{nome:"Treino avulso", tipo:esc0.tipo, exercicios:[]}};
  }

  const p = def.payload;
  if(p.tipo==="cardio"){
    const v = await modalForm("Registrar cardio", [
      {k:"data", l:"Data", t:"date", req:true},
      {k:"duracaoMin", l:"Duração (min)", t:"number", min:0, step:1, req:true},
      {k:"distanciaKm", l:"Distância (km)", t:"number", min:0, step:"0.01"},
      {k:"notas", l:"Observações", t:"textarea"}
    ], {data:hojeIso()});
    if(!v) return;
    const min = Number(v.duracaoMin)||0, km = Number(v.distanciaKm)||0;
    let pace = "", vel = null;
    if(km>0 && min>0){
      const ps = Math.round(min*60/km);
      pace = `${Math.floor(ps/60)}:${String(ps%60).padStart(2,'0')}`;
      vel = Math.round(km/(min/60)*100)/100;
    }
    criar("treino_log", {data:v.data, payload:{defId:def.id, nome:p.nome, tipo:"cardio",
      duracaoMin:min, distanciaKm:km, pace, velocidade:vel, notas:v.notas}});
    toast("Cardio registrado."); renderTudo(); return;
  }

  /* força: uma linha por série de cada exercício */
  const exs = (p.exercicios&&p.exercicios.length) ? p.exercicios : [{nome:"Exercício", series:3, reps:"10"}];
  const corpo = `<form id="tf">
    <div class="fld-wrap"><label class="fld" for="tfData">Data</label>
      <input id="tfData" type="date" value="${hojeIso()}"></div>
    ${exs.map((e,i)=>`
      <div class="group-h">${esc(e.nome)}</div>
      <div class="grid3" data-ex="${i}" data-nome="${esc(e.nome)}">
        ${Array.from({length:Math.max(1, Number(e.series)||3)}).map((_,s)=>`
          <div>
            <label class="fld">Série ${s+1}</label>
            <input type="number" min="0" step="1" placeholder="reps" data-r="${i}-${s}">
            <input type="number" min="0" step="0.5" placeholder="kg" data-c="${i}-${s}" style="margin-top:4px">
          </div>`).join('')}
      </div>`).join('')}
    <div class="fld-wrap"><label class="fld" for="tfNotas">Observações</label><textarea id="tfNotas" rows="2"></textarea></div>
    <div class="row"><button class="btn primary" type="submit">Salvar sessão</button>
      <button class="btn" type="button" id="tfCancel">Cancelar</button></div>
  </form>`;

  const d = dlg();
  el('modalBody').innerHTML = `<h2>${esc(p.nome)}</h2>${corpo}`;
  el('tfCancel').onclick = ()=>d.close();
  d.onclose = null;
  el('tf').onsubmit = ev=>{
    ev.preventDefault();
    const exercicios = exs.map((e,i)=>{
      const series = [];
      el('modalBody').querySelectorAll(`[data-r^="${i}-"]`).forEach(inp=>{
        const s = inp.dataset.r.split('-')[1];
        const carga = el('modalBody').querySelector(`[data-c="${i}-${s}"]`);
        const reps = Number(inp.value)||0, kg = Number(carga && carga.value)||0;
        if(reps||kg) series.push({reps, carga:kg});
      });
      return {nome:e.nome, series};
    }).filter(e=>e.series.length);
    criar("treino_log", {data: el('tfData').value || hojeIso(),
      payload:{defId:def.id, nome:p.nome, tipo:"forca", exercicios, notas: el('tfNotas').value.trim()}});
    d.close(); toast("Sessão registrada."); renderTudo();
  };
  d.showModal();
}

/* ================= SAÚDE · dieta ================= */
function renderDieta(){
  const dono = VENDO.dieta;
  avisoLeitura('pDieta','dieta');
  const d = fromIso(dDieta);
  el('dietaCur').textContent = `${DOWS[d.getDay()]} · ${d.getDate()} ${MES[d.getMonth()].slice(0,3)}`;
  const linhas = refeicoesDoDia(dono, dDieta);
  el('dietaBody').innerHTML = linhas.length ? linhas.map(r=>`
    <div class="item ${r.feito?'done':''}" style="--c:var(--sun)">
      <input type="checkbox" data-ref="${r.def.id}" ${r.feito?'checked':''} ${soLeitura('dieta')?'disabled':''}>
      <div class="txt"><div class="t">${esc(r.def.payload.nome)}</div>
        <div class="d">${esc(r.desc)||"—"}</div></div>
      <span class="hr">${esc(r.def.payload.hora||"")}</span>
    </div>`).join('') : `<p class="empty">Nenhuma refeição cadastrada.</p>`;
  el('gerirDietaBtn').disabled = soLeitura('dieta');
}

function gerirDieta(){
  const defs = listar({tipo:"refeicao_def", dono:USUARIO})
    .sort((a,b)=>(a.payload.hora||"").localeCompare(b.payload.hora||""));
  modalHtml("Cardápio", `
    ${defs.map(d=>`<div class="item" style="--c:var(--sun)"><div class="txt">
        <div class="t">${esc(d.payload.hora||"")} ${esc(d.payload.nome)}</div>
        <div class="d">${esc(descricaoRefeicao(d, hojeIso()))||"—"}</div></div>
      <button class="btn sm" type="button" data-editref="${d.id}">Editar</button>
      <button class="del" type="button" data-delref="${d.id}">×</button></div>`).join('')
      || `<p class="empty">Nenhuma refeição.</p>`}
    <button class="btn sm primary" type="button" id="addRef" style="margin-top:10px">+ Nova refeição</button>`,
  ()=>{
    el('modalBody').addEventListener('click', async ev=>{
      const ed = ev.target.closest('[data-editref]');
      const dl = ev.target.closest('[data-delref]');
      const ad = ev.target.closest('#addRef');
      if(dl){ apagar(dl.dataset.delref); dlg().close(); toast("Refeição removida."); renderTudo(); return; }
      if(ed){
        const r = obter(ed.dataset.editref); dlg().close();
        const v = await modalForm("Editar refeição", [
          {k:"nome", l:"Nome", t:"text", req:true},
          {k:"hora", l:"Hora", t:"time"},
          {k:"desc", l:"O que comer", t:"textarea"},
          {k:"dias", l:"Dias", t:"dias"}
        ], {nome:r.payload.nome, hora:r.payload.hora, desc:descricaoRefeicao(r, hojeIso()), dias:r.payload.dias});
        if(v){ atualizar(r.id, {payload:{...r.payload, ...v}}); toast("Refeição salva."); renderTudo(); }
        return;
      }
      if(ad){
        dlg().close();
        const v = await modalForm("Nova refeição", [
          {k:"nome", l:"Nome", t:"text", req:true},
          {k:"hora", l:"Hora", t:"time"},
          {k:"desc", l:"O que comer", t:"textarea"},
          {k:"dias", l:"Dias", t:"dias"}
        ], {dias:[0,1,2,3,4,5,6]});
        if(v){ criar("refeicao_def", {payload:{...v, ativo:true}}); toast("Refeição criada."); renderTudo(); }
      }
    });
  });
}

/* ================= ESTUDO ================= */
const chaveTimer = () => `agenda-timer-${USUARIO}`;
function timerAtivo(){
  try{ const r = localStorage.getItem(chaveTimer()); return r ? JSON.parse(r) : null; }catch(e){ return null; }
}
function pintarTimer(){
  const t = timerAtivo();
  if(!t){ el('timerT').textContent = "00:00:00"; el('timerBtn').textContent = "Começar";
    el('timerBtn').className = "btn primary"; clearInterval(timerTimer); timerTimer=null; return; }
  const seg = Math.floor((Date.now() - new Date(t.inicio).getTime())/1000);
  el('timerT').textContent = hhmmss(Math.max(0,seg));
  el('timerBtn').textContent = "Parar e salvar";
  el('timerBtn').className = "btn danger";
  if(!timerTimer) timerTimer = setInterval(pintarTimer, 1000);
}
async function alternarTimer(){
  const t = timerAtivo();
  if(!t){
    localStorage.setItem(chaveTimer(), JSON.stringify({inicio:new Date().toISOString()}));
    pintarTimer(); toast("Cronômetro rodando.");
    return;
  }
  const min = Math.max(1, Math.round((Date.now() - new Date(t.inicio).getTime())/60000));
  const v = await modalForm("Terminar sessão", [
    {k:"titulo", l:"O que estudou", t:"text", req:true},
    {k:"minutos", l:"Minutos", t:"number", min:1, step:1, req:true},
    {k:"prova", l:"Tipo de prova", t:"tags", tipoTag:"prova", multi:false},
    {k:"assuntos", l:"Assuntos", t:"tags", tipoTag:"assunto", multi:true},
    {k:"notas", l:"Notas", t:"textarea"}
  ], {minutos:min}, "Confirmar e salvar");
  if(!v){ toast("Sessão não salva — cronômetro continua."); return; }
  criar("estudo_sessao", {data:hojeIso(), payload:{titulo:v.titulo, minutos:v.minutos,
    prova:v.prova, assuntos:v.assuntos, notas:v.notas,
    inicio:t.inicio, fim:new Date().toISOString()}});
  localStorage.removeItem(chaveTimer());
  clearInterval(timerTimer); timerTimer=null;
  pintarTimer(); toast("Sessão salva."); renderTudo();
}

function renderEstudo(){
  const dono = VENDO.estudo;
  avisoLeitura('secEstudo','estudo');
  el('timerBox').hidden = soLeitura('estudo');

  const [de, ate] = limitesMes(new Date());
  const e = estudoDoPeriodo(dono, de, ate);
  el('estudoStat').innerHTML =
    `<div><b>${Math.floor(e.minutos/60)}h${String(e.minutos%60).padStart(2,'0')}</b><span>Estudo no mês</span></div>
     <div><b>${e.total}</b><span>Questões</span></div>
     <div class="in"><b>${e.acertos}</b><span>Acertos</span></div>
     <div><b>${e.taxa==null?"—":e.taxa+"%"}</b><span>Aproveitamento</span></div>`;

  const ass = desempenhoPorAssunto(dono, de, ate);
  el('estudoAssuntos').innerHTML = ass.length ? ass.map(a=>`
    <div style="margin-bottom:10px">
      <div class="row" style="justify-content:space-between;font-size:13.5px">
        <span>${esc(a.nome)}</span>
        <span class="v" style="font-family:var(--mono);font-weight:600">${a.acertos}/${a.total} · ${a.taxa}%</span>
      </div>
      <div class="bar ${a.taxa<60?'rival':''}"><i style="width:${a.taxa}%"></i></div>
    </div>`).join('') : `<p class="empty">Registre questões com assunto para ver onde está o buraco.</p>`;

  const hist = [
    ...e.sessoes.map(s=>({d:s.data, id:s.id, dono:s.dono, k:"Sessão", t:s.payload.titulo, x:`${s.payload.minutos} min`})),
    ...e.aulas.map(a=>({d:a.data, id:a.id, dono:a.dono, k:"Aula", t:a.payload.titulo, x:`${a.payload.minutos||0} min`})),
    ...e.questoes.map(q=>({d:q.data, id:q.id, dono:q.dono, k:"Questões", t:q.payload.titulo||"Bateria",
      x:`${q.payload.acertos}/${q.payload.total}`}))
  ].sort((a,b)=>b.d.localeCompare(a.d)).slice(0,40);

  el('estudoHist').innerHTML = hist.length ? hist.map(h=>`
    <div class="item" style="--c:var(--purple)"><div class="txt">
      <div class="t">${esc(h.t)}</div>
      <div class="d">${esc(h.k)} · ${h.d.slice(8,10)}/${h.d.slice(5,7)} · ${esc(h.x)}</div>
    </div>${h.dono===USUARIO?`<button class="del" type="button" data-delest="${h.id}">×</button>`:""}</div>`).join('')
    : `<p class="empty">Nada registrado ainda.</p>`;

  ['novaSessaoBtn','novaAulaBtn','novasQuestoesBtn','gerirTagsBtn'].forEach(id=>el(id).disabled = soLeitura('estudo'));
}

async function novaSessao(){
  const v = await modalForm("Sessão de estudo", [
    {k:"titulo", l:"O que estudou", t:"text", req:true},
    {k:"data", l:"Data", t:"date", req:true},
    {k:"minutos", l:"Minutos", t:"number", min:1, step:1, req:true},
    {k:"prova", l:"Tipo de prova", t:"tags", tipoTag:"prova", multi:false},
    {k:"assuntos", l:"Assuntos", t:"tags", tipoTag:"assunto", multi:true},
    {k:"notas", l:"Notas", t:"textarea"}
  ], {data:hojeIso(), minutos:60});
  if(!v) return;
  criar("estudo_sessao", {data:v.data, payload:v});
  toast("Sessão salva."); renderTudo();
}
async function novaAula(){
  const v = await modalForm("Aula assistida", [
    {k:"titulo", l:"Aula", t:"text", req:true},
    {k:"data", l:"Data", t:"date", req:true},
    {k:"minutos", l:"Duração (min)", t:"number", min:0, step:1},
    {k:"prova", l:"Tipo de prova", t:"tags", tipoTag:"prova", multi:false},
    {k:"assuntos", l:"Assuntos", t:"tags", tipoTag:"assunto", multi:true},
    {k:"notas", l:"Notas", t:"textarea"}
  ], {data:hojeIso()});
  if(!v) return;
  criar("estudo_aula", {data:v.data, payload:v});
  toast("Aula registrada."); renderTudo();
}
async function novasQuestoes(){
  const v = await modalForm("Bateria de questões", [
    {k:"titulo", l:"Identificação (opcional)", t:"text"},
    {k:"data", l:"Data", t:"date", req:true},
    {k:"total", l:"Quantas fez", t:"number", min:1, step:1, req:true},
    {k:"acertos", l:"Quantas acertou", t:"number", min:0, step:1, req:true},
    {k:"prova", l:"Tipo de prova", t:"tags", tipoTag:"prova", multi:false},
    {k:"assuntos", l:"Assuntos", t:"tags", tipoTag:"assunto", multi:true},
    {k:"notas", l:"Notas", t:"textarea"}
  ], {data:hojeIso()});
  if(!v) return;
  const total = Math.max(1, v.total||1);
  const acertos = Math.min(total, Math.max(0, v.acertos||0));
  criar("estudo_questoes", {data:v.data, payload:{...v, total, acertos, erros: total-acertos}});
  toast("Questões registradas."); renderTudo();
}

function gerirTags(){
  const lista = tags(USUARIO);
  modalHtml("Tags", `
    <div style="margin-bottom:12px">${
      lista.length ? lista.map(t=>`<span class="tag ${t.payload.tipo==='prova'?'prova':''}">${esc(t.payload.nome)}
        <button type="button" data-deltag="${t.id}">×</button></span>`).join('')
      : `<span class="empty">Nenhuma tag ainda.</span>`
    }</div>
    <form id="tagF">
      <div class="grid2">
        <div><label class="fld" for="tagNome">Nome</label><input id="tagNome" type="text" placeholder="Cardiologia"></div>
        <div><label class="fld" for="tagTipo">Tipo</label>
          <select id="tagTipo"><option value="assunto">Assunto</option><option value="prova">Tipo de prova</option></select></div>
      </div>
      <button class="btn sm primary" type="submit">Criar tag</button>
    </form>`,
  ()=>{
    el('tagF').onsubmit = ev=>{
      ev.preventDefault();
      const nome = el('tagNome').value.trim();
      if(!nome) return;
      criar("tag", {payload:{nome, tipo: el('tagTipo').value}});
      dlg().close(); toast("Tag criada."); renderTudo();
    };
    el('modalBody').addEventListener('click', ev=>{
      const b = ev.target.closest('[data-deltag]'); if(!b) return;
      apagar(b.dataset.deltag); dlg().close(); toast("Tag apagada."); renderTudo();
    });
  });
}

/* ================= DUELO ================= */
function painelDuelo(alvo, de, ate, rotulo){
  const a = pontuar(USUARIO, de, ate), b = pontuar(OUTRO, de, ate);
  const linha = (rot, x, y) => {
    const tot = (x+y)||1;
    return `<div class="lane">
        <div class="l"><span class="v">${x}</span></div>
        <div class="mid">${esc(rot)}</div>
        <div class="r"><span class="v">${y}</span></div></div>
      <div class="bar" style="margin-bottom:10px"><i style="width:${Math.round(100*x/tot)}%"></i></div>`;
  };
  el(alvo).innerHTML = `
    <p class="syncbar" style="margin-bottom:10px">${esc(rotulo)} · ${de.slice(8,10)}/${de.slice(5,7)} a ${ate.slice(8,10)}/${ate.slice(5,7)}</p>
    <div class="duel">
      <div class="p ${a.total>=b.total?'win':''}"><b>${a.total}</b><span>${esc(nomeDe(USUARIO))}</span></div>
      <div class="vs">VS</div>
      <div class="p ${b.total>=a.total?'win':''}"><b>${b.total}</b><span>${esc(nomeDe(OUTRO))}</span></div>
    </div>
    <p style="text-align:center;font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);margin:0 0 16px">
      ${a.total===b.total ? "Empate técnico" : (a.total>b.total?esc(nomeDe(USUARIO)):esc(nomeDe(OUTRO)))+" na frente por "+Math.abs(a.total-b.total)}
    </p>
    ${linha("Metas do dia", a.detalhe.metas, b.detalhe.metas)}
    ${linha("Dias completos", a.detalhe.dias, b.detalhe.dias)}
    ${linha("Metas semanais", a.detalhe.semanais, b.detalhe.semanais)}
    ${linha("Refeições", a.detalhe.refeicoes, b.detalhe.refeicoes)}
    ${linha("Treinos", a.detalhe.treinos, b.detalhe.treinos)}
    ${linha("Estudo", a.detalhe.estudo, b.detalhe.estudo)}
    ${linha("Questões", a.detalhe.questoes, b.detalhe.questoes)}
    ${linha("Guardou grana", a.detalhe.guardou, b.detalhe.guardou)}
    <details class="tools"><summary>Como os pontos são contados</summary><div class="body">
      <p>Cada meta diária ${PONTOS.meta} pt · dia inteiro completo ${PONTOS.diaCompleto} pts ·
      meta semanal ${PONTOS.metaSemanal} pts · refeição ${PONTOS.refeicao} pt · treino ${PONTOS.treino} pts ·
      30 min de estudo ${PONTOS.estudo30} pts · 10 questões ${PONTOS.questao10} pts ·
      bateria com 80%+ de acerto ${PONTOS.acertoAlto} pts · dia em que guardou dinheiro ${PONTOS.guardou} pts.
      Para mudar, edite <code>PONTOS</code> no topo de <code>js/dados.js</code>.</p>
    </div></details>`;
}
function renderDuelo(){
  const hoje = new Date();
  const [sd, sa] = limitesSemana(hoje);
  const [md, ma] = limitesMes(hoje);
  painelDuelo('pDuelSem', sd, sa, "Semana atual");
  painelDuelo('pDuelMes', md, ma, "Mês atual");
  painelDuelo('pDuelGeral', "2000-01-01", "2999-12-31", "Desde sempre");
}

/* ================= AJUSTES ================= */
function pintarSync(estado, msg){
  const d = el('syncDot'), t = el('syncTxt');
  if(!d) return;
  d.className = "dotv " + ({on:"on", erro:"off", sync:"wait", off:""}[estado]||"");
  t.textContent = ({on:"Conectado", erro:"Problema", sync:"Sincronizando", off:"Só neste aparelho"}[estado]||"—")
    + (msg?" — "+msg:"");
}
function renderCfg(){
  el('sbUrl').value = SB.url; el('sbKey').value = SB.key;
  const c = config();
  el('cfgTreinoHora').value = c.treinoHora||"05:30";
  el('cfgLeitura').value = c.leituraHora||"22:20";
  el('cfgPausaIcs').checked = c.pausaIcs!==false;
  el('storeNote').textContent = `Dados no ${storeKind} · conta ${nomeDe(USUARIO)} · ${listar({}).length} registros`;
}

/* ================= .ics e notificações ================= */
function baixarIcs(){
  const c = config();
  const pad = n => String(n).padStart(2,'0');
  const BYDAY = ["SU","MO","TU","WE","TH","FR","SA"];
  const base = new Date();
  const L = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Agenda//PT-BR","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:Plano"];
  const quando = (dow, hhmm) => {
    const d = new Date(base); d.setDate(base.getDate() + ((dow - base.getDay() + 7) % 7));
    const [h,m] = hhmm.split(':').map(Number);
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(h)}${pad(m)}00`;
  };
  const ev = (titulo, desc, dt, rrule) => {
    L.push("BEGIN:VEVENT", `UID:${uid()}@agenda`, `DTSTAMP:${dt}Z`, `DTSTART:${dt}`, `DURATION:PT30M`,
      `SUMMARY:${titulo.replace(/[,;]/g,' ')}`, `DESCRIPTION:${String(desc||"").replace(/[,;\n]/g,' ')}`);
    if(rrule) L.push(`RRULE:${rrule}`);
    L.push("BEGIN:VALARM","TRIGGER:-PT5M","ACTION:DISPLAY","DESCRIPTION:Lembrete","END:VALARM","END:VEVENT");
  };

  listar({tipo:"refeicao_def", dono:USUARIO}).forEach(r=>{
    (r.payload.dias||[0,1,2,3,4,5,6]).forEach(dw=>{
      if(!r.payload.hora) return;
      ev(r.payload.nome, descricaoRefeicao(r, hojeIso()), quando(dw, r.payload.hora), `FREQ=WEEKLY;BYDAY=${BYDAY[dw]}`);
    });
  });
  listar({tipo:"treino_def", dono:USUARIO}).forEach(t=>{
    (t.payload.dias||[]).forEach(dw=> ev("Treino "+t.payload.nome, t.payload.notas, quando(dw, c.treinoHora||"05:30"), `FREQ=WEEKLY;BYDAY=${BYDAY[dw]}`));
  });
  AGUA_H.forEach(h=> ev("Beber água", "Meta do dia", quando(base.getDay(), h), "FREQ=DAILY"));
  if(c.pausaIcs!==false) PAUSA_H.forEach(h=>
    ev("Levantar e andar", "2 min de pé", quando(1, h), "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR"));
  if(c.leituraHora) ev("Leitura", "20 minutos", quando(base.getDay(), c.leituraHora), "FREQ=DAILY");
  eventosVisiveis(hojeIso(), "2999-12-31").forEach(e=>{
    if(!e.payload.hora) return;
    const d = fromIso(e.data);
    ev(e.payload.titulo, e.payload.detalhe,
      `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${e.payload.hora.replace(':','')}00`);
  });

  L.push("END:VCALENDAR");
  const blob = new Blob([L.join("\r\n")], {type:"text/calendar"});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = "plano.ics"; a.click();
  toast("Arquivo gerado — importe no Google Agenda.");
}

function pintarNotif(){
  const p = typeof Notification==="undefined" ? "indisponível" : Notification.permission;
  el('notifState').textContent = "Permissão: " + p;
  el('notifBtn').disabled = (p==="granted" || p==="indisponível");
}
async function pedirNotif(){
  if(typeof Notification==="undefined") return toast("Este navegador não suporta.");
  const p = await Notification.requestPermission();
  pintarNotif();
  toast(p==="granted" ? "Notificações ativadas." : "Permissão negada.");
}
function tick(){
  if(typeof Notification==="undefined" || Notification.permission!=="granted") return;
  const agora = new Date(), hhmm = `${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}`;
  const disparados = JSON.parse(localStorage.getItem('agenda-avisos')||'{}');
  const hoje = hojeIso();
  if(disparados.dia !== hoje){ disparados.dia = hoje; disparados.ids = []; }
  const avisar = (id, titulo, corpo) => {
    if(disparados.ids.includes(id)) return;
    try{ new Notification(titulo, {body:corpo, icon:"icons/icon-192.png"}); }catch(e){}
    disparados.ids.push(id);
  };
  refeicoesDoDia(USUARIO, hoje).forEach(r=>{
    if(r.def.payload.hora === hhmm) avisar("ref"+r.def.id, r.def.payload.nome, r.desc);
  });
  eventosVisiveis(hoje, hoje).forEach(e=>{
    if(e.payload.hora === hhmm) avisar("ev"+e.id, e.payload.titulo, e.payload.detalhe||"Está na hora.");
  });
  localStorage.setItem('agenda-avisos', JSON.stringify(disparados));
}

/* ================= render geral ================= */
function renderTudo(){
  if(!USUARIO) return;
  const d = new Date();
  el('hoje-label').textContent = `${DOW[d.getDay()]} · ${d.getDate()} de ${MES[d.getMonth()]}`;
  el('hoje-title').textContent = "Hoje";
  el('whoUser').textContent = nomeDe(USUARIO);
  montarWhoSwitch();
  renderMetas(); renderAgenda(); renderFinInd(); renderFinComp();
  renderTreino(); renderDieta(); renderEstudo(); renderDuelo(); renderCfg();
  pintarTimer();
}

/* ================= cliques delegados ================= */
function ligarCliques(){
  document.body.addEventListener('click', ev=>{
    const alvo = s => ev.target.closest(s);

    const inc = alvo('[data-inc]');
    if(inc){
      const [id, passo] = inc.dataset.inc.split(':');
      const def = obter(id); if(!def) return;
      const atual = (metasDoDia(USUARIO, dMetas).find(m=>m.def.id===id)||{valor:0}).valor;
      const alvoV = Number(def.payload.alvo)||1;
      const novo = passo==="full" ? alvoV : Math.max(0, atual + Number(passo));
      marcarMeta(def, dMetas, novo); renderTudo(); return;
    }
    const dm = alvo('[data-delmeta]'); if(dm) return;
    const de = alvo('[data-delev]');   if(de){ apagar(de.dataset.delev); toast("Evento apagado."); renderTudo(); return; }
    const dt = alvo('[data-deltx]');   if(dt){ apagar(dt.dataset.deltx); toast("Lançamento apagado."); renderTudo(); return; }
    const dl = alvo('[data-dellog]');  if(dl){ apagar(dl.dataset.dellog); toast("Registro apagado."); renderTudo(); return; }
    const dz = alvo('[data-delest]');  if(dz){ apagar(dz.dataset.delest); toast("Registro apagado."); renderTudo(); return; }
    const dtr= alvo('[data-deltreino]'); if(dtr){ apagar(dtr.dataset.deltreino); toast("Treino apagado."); renderTudo(); return; }
    const lt = alvo('[data-logtreino]'); if(lt){ registrarTreino(lt.dataset.logtreino); return; }
    const cel = alvo('.cel[data-dia]');  if(cel){ diaSel = cel.dataset.dia; renderAgenda(); return; }
  });

  document.body.addEventListener('change', ev=>{
    const m = ev.target.closest('[data-meta]');
    if(m){ const def = obter(m.dataset.meta);
      marcarMeta(def, dMetas, ev.target.checked ? (Number(def.payload.alvo)||1) : 0); renderTudo(); return; }
    const s = ev.target.closest('[data-metasem]');
    if(s){ const def = obter(s.dataset.metasem);
      const [ini] = limitesSemana(fromIso(dMetas));
      marcarMeta(def, ini, ev.target.checked ? (Number(def.payload.alvo)||1) : 0); renderTudo(); return; }
    const r = ev.target.closest('[data-ref]');
    if(r){ marcarRefeicao(obter(r.dataset.ref), dDieta, ev.target.checked); renderTudo(); return; }
  });

  el('novaMetaBtn').onclick   = novaMeta;
  el('gerirMetasBtn').onclick = gerirMetas;
  el('novoEventoBtn').onclick = novoEvento;
  el('novaTxBtn').onclick     = novaTx;
  el('novoTreinoBtn').onclick = novoTreinoDef;
  el('novoTreinoLogBtn').onclick = ()=>registrarTreino(null);
  el('gerirDietaBtn').onclick = gerirDieta;
  el('timerBtn').onclick      = alternarTimer;
  el('novaSessaoBtn').onclick = novaSessao;
  el('novaAulaBtn').onclick   = novaAula;
  el('novasQuestoesBtn').onclick = novasQuestoes;
  el('gerirTagsBtn').onclick  = gerirTags;
  el('notifBtn').onclick      = pedirNotif;
  el('icsBtn').onclick        = baixarIcs;

  el('sbSalvar').onclick = async ()=>{
    SB.url = el('sbUrl').value.trim().replace(/\/+$/,'');
    SB.key = el('sbKey').value.trim();
    gravarConfigSb();
    if(!SB.ligado) return toast("Preencha URL e chave.");
    toast("Salvo. Saia e entre de novo para autenticar no servidor.");
    pintarSync("erro","entre de novo para autenticar");
  };
  el('sbSincronizar').onclick = async ()=>{
    if(!SB.ligado) return toast("Supabase não configurado.");
    const ok = await sincronizar({silencioso:false});
    toast(ok ? "Sincronizado." : "Não deu — veja o estado acima.");
    renderTudo();
  };
  el('sbLimpar').onclick = ()=>{ limparSb(); renderCfg(); toast("Desconectado. Os dados locais continuam aqui."); };

  el('cfgSalvar').onclick = ()=>{
    salvarConfig({treinoHora: el('cfgTreinoHora').value, leituraHora: el('cfgLeitura').value,
                  pausaIcs: el('cfgPausaIcs').checked});
    toast("Ajustes salvos.");
  };

  el('expBtn').onclick = ()=>{
    el('backupTxt').value = JSON.stringify({v:2, dono:USUARIO, registros:listar({dono:USUARIO})}, null, 1);
    toast("Copie o texto e guarde.");
  };
  el('impBtn').onclick = ()=>{
    try{
      const o = JSON.parse(el('backupTxt').value);
      if(!o.registros) throw new Error("formato");
      let n = 0;
      o.registros.forEach(r=>{
        if(PORID.has(r.id)) return;
        const novo = {...r, dono:USUARIO, atualizado_em:agora(), _sujo:true};
        DB.push(novo); PORID.set(novo.id, novo); n++;
      });
      gravarLocalJa(); agendarSync(); renderTudo();
      toast(n+" registros importados.");
    }catch(e){ toast("JSON inválido."); }
  };

  el('sairBtn').onclick = async ()=>{ await sair(); location.reload(); };

  window.addEventListener('beforeinstallprompt', e=>{
    e.preventDefault(); deferredInstall = e;
    const b = el('installBtn'); b.hidden = false;
    b.onclick = async ()=>{ deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall=null; b.hidden=true; };
  });
}

/* ================= entrada ================= */
document.addEventListener('dados:mudou', ()=>{ if(USUARIO) renderTudo(); });

async function iniciar(){
  document.body.classList.remove('locked');
  ligarNavegacao(); ligarCliques();
  aoMudarSync = pintarSync;
  pintarSync(sbEstado);
  pintarNotif();
  renderTudo();
  clearInterval(tickTimer); tickTimer = setInterval(tick, 30000); tick();
}

el('loginForm').addEventListener('submit', async ev=>{
  ev.preventDefault();
  const err = el('loginErr'), btn = ev.target.querySelector('button[type=submit]');
  err.textContent = ""; btn.disabled = true;
  try{
    const r = await entrar(el('loginUser').value, el('loginPass').value);
    if(r.ok){
      el('loginPass').value = "";
      try{ localStorage.setItem("agenda-sessao", USUARIO); }catch(e){}
      await iniciar();
      if(r.offline) toast("Entrou offline — sincroniza quando o servidor voltar.");
    }else err.textContent = r.erro;
  }catch(e){
    err.textContent = "Não deu para verificar a senha neste navegador (precisa de HTTPS).";
  }
  btn.disabled = false;
});

(async ()=>{
  if('serviceWorker' in navigator && location.protocol!=='blob:'){
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  }
  await carregarConfigSb();
  let s = null;
  try{ s = localStorage.getItem("agenda-sessao"); }catch(e){}
  if(s && CONTAS[s]){
    /* sessão local existe; com Supabase ligado ainda preciso de token válido */
    if(SB.ligado && !(await garantirToken())){ el('loginUser').value = s; el('loginPass').focus(); return; }
    USUARIO = s; OUTRO = s==="luis" ? "mayla" : "luis";
    await carregarLocal(); semearSeVazio();
    marcarSync(SB.ligado ? "on" : "off", SB.ligado ? "em dia" : "só neste aparelho");
    await iniciar();
    if(SB.ligado) sincronizar().catch(()=>{});
  }else{
    el('loginUser').focus();
  }
})();
