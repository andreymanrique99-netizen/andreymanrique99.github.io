/* =====================================================================
   MESA DE POKER · TEXAS HOLD'EM
   Orden del archivo:
   1. Constantes   2. Estado   3. Baraja   4. Evaluación de manos
   5. Explicaciones   6. Simulaciones   7. Vista (DOM)   8. Flujo   9. Inicio
   ===================================================================== */

/* ---------- 1. CONSTANTES ---------- */
const PALOS   = ["♠","♥","♦","♣"];
const VALORES = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const RANGO   = Object.fromEntries(VALORES.map((v,i)=>[v,i+2]));
const NOMBRES = ["Carta alta","Pareja","Doble pareja","Trío","Escalera","Color","Full house","Póker","Escalera de color"];
const ETAPAS  = ["Preflop","Flop","Turn","River"];
const SIMULACIONES = 3000;
// Cuántos valores "principales" definen cada jugada antes de los kickers
const PRINCIPALES = [0,1,2,1,1,0,2,1,1];

/* ---------- 2. ESTADO ---------- */
const E = { baraja:[], manos:[], mesa:[], etapa:-1, n:4, ocupado:false };
const $ = id => document.getElementById(id);
const nv = r => VALORES[r-2];   // rango numérico -> símbolo

/* ---------- 3. BARAJA ---------- */
function crearBaraja(){
  const b = PALOS.flatMap(p => VALORES.map(v => [v,p]));
  for(let i=b.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [b[i],b[j]] = [b[j],b[i]];
  }
  return b;
}
const repartirCarta = () => E.baraja.pop();

/* ---------- 4. EVALUACIÓN DE MANOS ---------- */
// Puntaje = [categoría, ...desempates]. Se comparan elemento a elemento.
function evaluar5(c){
  const val   = c.map(x=>RANGO[x[0]]).sort((a,b)=>b-a);
  const color = new Set(c.map(x=>x[1])).size === 1;
  const uni   = [...new Set(val)];
  let esc=false, alta=0;
  if(uni.length===5){
    if(uni[0]-uni[4]===4){ esc=true; alta=uni[0]; }
    else if(uni.join()==="14,5,4,3,2"){ esc=true; alta=5; }   // rueda A-2-3-4-5
  }
  const cnt = {}; val.forEach(v=>cnt[v]=(cnt[v]||0)+1);
  const g = Object.entries(cnt).map(([v,k])=>[+v,k]).sort((a,b)=>b[1]-a[1]||b[0]-a[0]);
  const orden = g.map(x=>x[0]), q = g.map(x=>x[1]).join("");

  if(esc&&color) return [8,alta];
  if(q==="41")   return [7,...orden];
  if(q==="32")   return [6,...orden];
  if(color)      return [5,...val];
  if(esc)        return [4,alta];
  if(q==="311")  return [3,...orden];
  if(q==="221")  return [2,...orden];
  if(q==="2111") return [1,...orden];
  return [0,...val];
}

function cmp(a,b){
  for(let i=0;i<Math.max(a.length,b.length);i++){
    const d=(a[i]||0)-(b[i]||0); if(d) return d;
  }
  return 0;
}

// Combinaciones de 5 sobre `len` cartas, calculadas una sola vez por tamaño
const _combos = {};
function indicesCombos(len){
  if(_combos[len]) return _combos[len];
  const out=[], act=[];
  (function rec(ini){
    if(act.length===5){ out.push(act.slice()); return; }
    for(let i=ini;i<len;i++){ act.push(i); rec(i+1); act.pop(); }
  })(0);
  return _combos[len]=out;
}

// Mejor mano de 5 entre 5, 6 o 7 cartas -> { score, cartas }
function mejorMano(cartas){
  let best=null;
  for(const idx of indicesCombos(cartas.length)){
    const sub = idx.map(i=>cartas[i]), s = evaluar5(sub);
    if(!best || cmp(s,best.score)>0) best={score:s, cartas:sub};
  }
  return best;
}
const mejor = cartas => mejorMano(cartas).score;

// Índices de los jugadores con el puntaje más alto (puede haber empate)
function ganadores(pts){
  let mx=pts[0]; pts.forEach(p=>{ if(cmp(p,mx)>0) mx=p; });
  return { mx, gan: pts.flatMap((p,i)=>cmp(p,mx)===0?[i]:[]) };
}

/* ---------- 5. EXPLICACIONES ---------- */
// "Pareja de 8", "Escalera hasta 9", etc.
function describir(s){
  const [c,a,b] = s;
  switch(c){
    case 0: return `Carta alta ${nv(a)}`;
    case 1: return `Pareja de ${nv(a)}`;
    case 2: return `Doble pareja de ${nv(a)} y ${nv(b)}`;
    case 3: return `Trío de ${nv(a)}`;
    case 4: return `Escalera hasta ${nv(a)}`;
    case 5: return `Color con ${nv(a)} alta`;
    case 6: return `Full de ${nv(a)} con ${nv(b)}`;
    case 7: return `Póker de ${nv(a)}`;
    default: return `Escalera de color hasta ${nv(a)}`;
  }
}

// Por qué `gana` supera a `pierde`
function porQue(pierde,gana){
  if(pierde[0]!==gana[0])
    return `${NOMBRES[gana[0]]} vale más que ${NOMBRES[pierde[0]]}.`;
  let i=1; while(i<gana.length && pierde[i]===gana[i]) i++;
  if(i>=gana.length) return "Tienen exactamente la misma jugada: se reparten el bote.";
  const cat=gana[0], vs=`${nv(gana[i])} contra ${nv(pierde[i])}`;
  if(cat===0||cat===5)
    return `Misma jugada, pero decide la carta más alta: ${vs}.`;
  if(i<=PRINCIPALES[cat])
    return `Misma categoría, pero ${describir(gana)} es más alta que ${describir(pierde)}.`;
  return `Misma jugada; desempata la carta de acompañamiento (kicker): ${vs}.`;
}

/* ---------- 6. SIMULACIONES ---------- */
// Probabilidad de ganar de cada jugador (Monte Carlo), en %
function probabilidades(sims=SIMULACIONES){
  const faltan=5-E.mesa.length, v=new Array(E.n).fill(0), resto=E.baraja.slice();
  for(let s=0;s<sims;s++){
    for(let i=0;i<faltan;i++){
      const j=i+Math.floor(Math.random()*(resto.length-i));
      [resto[i],resto[j]]=[resto[j],resto[i]];
    }
    const m=E.mesa.concat(resto.slice(0,faltan));
    const {gan}=ganadores(E.manos.map(h=>mejor(h.concat(m))));
    gan.forEach(i=>v[i]+=1/gan.length);
  }
  return v.map(x=>x/sims*100);
}

// Cartas de la baraja que harían ganar a cada jugador si salen
function calcularOuts(K=24){
  const faltan=5-E.mesa.length;
  if(E.mesa.length<3||faltan<=0) return null;
  const res=E.manos.map(()=>[]);
  E.baraja.forEach((c,ci)=>{
    const resto=E.baraja.filter((_,k)=>k!==ci), v=new Array(E.n).fill(0);
    const finales = faltan===1 ? [[]]
      : Array.from({length:K},()=>[resto[Math.floor(Math.random()*resto.length)]]);
    for(const f of finales){
      const m=E.mesa.concat([c],f);
      const {gan}=ganadores(E.manos.map(h=>mejor(h.concat(m))));
      gan.forEach(i=>v[i]+=1/gan.length);
    }
    v.forEach((x,i)=>res[i].push({c,p:x/finales.length}));
  });
  return res;
}

/* ---------- 7. VISTA (DOM) ---------- */
function htmlCarta(c,nueva){
  const rojo=(c[1]==="♥"||c[1]==="♦")?" rojo":"";
  return `<div class="carta${rojo}${nueva?" nueva":""}"><span>${c[0]}</span><small>${c[1]}</small></div>`;
}

function dibujarAsientos(){
  document.querySelectorAll(".asiento").forEach(e=>e.remove());
  for(let i=0;i<E.n;i++){
    const ang=Math.PI/2+i*2*Math.PI/E.n;
    const d=document.createElement("div");
    d.className="asiento"; d.id="as"+i;
    d.style.left=(50+43*Math.cos(ang))+"%";
    d.style.top =(50+43*Math.sin(ang))+"%";
    d.innerHTML=`<div class="nombre">Jugador ${i+1}</div>
      <div class="mano">${E.manos[i].map(c=>htmlCarta(c,true)).join("")}</div>
      <div class="jugada" id="ju${i}"></div>
      <div class="pct" id="pc${i}">--</div>
      <div class="prob"><i id="br${i}"></i></div>`;
    $("mesa").appendChild(d);
  }
}

function dibujarMesa(previas){
  $("board").innerHTML=Array.from({length:5},(_,i)=>
    E.mesa[i]?htmlCarta(E.mesa[i],i>=previas):'<div class="hueco"></div>').join("");
  $("etapa").textContent=E.etapa<0?"Baraja lista":ETAPAS[E.etapa];
}

function pintarProbs(p){
  p.forEach((x,i)=>{
    $("pc"+i).textContent=x.toFixed(1)+"%";
    $("br"+i).style.width=x+"%";
    if(E.mesa.length>=3) $("ju"+i).textContent=NOMBRES[mejor(E.manos[i].concat(E.mesa))[0]];
  });
}

function dibujarOuts(){
  const cont=$("outsLista"), res=calcularOuts();
  if(!res){
    cont.innerHTML=`<p class="vacio">${E.mesa.length<3?"Aparecen cuando se reparte el flop.":"Ya salieron todas las cartas."}</p>`;
    return;
  }
  cont.innerHTML=res.map((lista,i)=>{
    const o=lista.filter(x=>x.p>.5).sort((a,b)=>b.p-a.p);
    const cuerpo=o.length
      ? `<div class="tira" id="tira${i}">${o.map(x=>`<div class="oc">${htmlCarta(x.c,false)}<span>${Math.round(x.p*100)}%</span></div>`).join("")}</div>
         <input type="range" class="desl" id="de${i}" min="0" max="100" value="0" aria-label="Deslizar las cartas del jugador ${i+1}">`
      : `<p class="vacio">Ninguna carta lo hace ganar.</p>`;
    return `<div class="fila"><div class="fl">Jugador ${i+1}: ${o.length} ${o.length===1?"carta":"cartas"}</div>${cuerpo}</div>`;
  }).join("");
  res.forEach((_,i)=>{
    const t=$("tira"+i), d=$("de"+i); if(!t) return;
    d.oninput=()=>{ t.scrollLeft=d.value/100*(t.scrollWidth-t.clientWidth); };
    t.onscroll=()=>{ const mx=t.scrollWidth-t.clientWidth; d.value=mx?t.scrollLeft/mx*100:0; };
  });
}

// Ranking de mejor a peor, con la razón de cada posición
function dibujarRanking(final){
  const cont=$("rankLista");
  if(E.mesa.length<3){
    cont.innerHTML=`<p class="vacio">Aparece cuando se reparte el flop.</p>`; return;
  }
  const ev=E.manos.map((h,i)=>({i,...mejorMano(h.concat(E.mesa))}))
                  .sort((a,b)=>cmp(b.score,a.score));
  const lider=ev[0];
  let pos=0;
  cont.innerHTML=ev.map((r,k)=>{
    if(k===0||cmp(r.score,ev[k-1].score)!==0) pos=k+1;
    const empataLider=cmp(r.score,lider.score)===0;
    let razon;
    if(empataLider){
      const abajo=ev.find(x=>cmp(x.score,r.score)<0);
      razon = abajo
        ? `${final?"Gana":"Va ganando"} al Jugador ${abajo.i+1}: ${porQue(abajo.score,r.score)}`
        : "Todos tienen la misma jugada: se reparten el bote.";
      if(ev.filter(x=>cmp(x.score,lider.score)===0).length>1 && abajo)
        razon=`Empata con el líder. ${razon}`;
    } else {
      razon=`${final?"Pierde":"Va detrás"} del Jugador ${lider.i+1}: ${porQue(r.score,lider.score)}`;
    }
    return `<div class="rk${empataLider?" top":""}">
      <div class="rk-pos">${pos}º</div>
      <div class="rk-cuerpo">
        <div class="fl">Jugador ${r.i+1} · ${describir(r.score)}</div>
        <div class="rk-cartas">${r.cartas.map(c=>htmlCarta(c,false)).join("")}</div>
        <div class="razon">${razon}</div>
      </div></div>`;
  }).join("");
}

/* ---------- 8. FLUJO DEL JUEGO ---------- */
function actualizarTodo(final=false){
  pintarProbs(probabilidades());
  dibujarRanking(final);
  setTimeout(dibujarOuts,30);   // deja pintar la mesa antes del cálculo pesado
}

function nuevaMano(){
  E.n=+$("njug").value; E.baraja=crearBaraja(); E.mesa=[]; E.etapa=0;
  E.manos=Array.from({length:E.n},()=>[]);
  for(let r=0;r<2;r++) for(let i=0;i<E.n;i++) E.manos[i].push(repartirCarta());
  $("aviso").textContent="";
  dibujarAsientos(); dibujarMesa(0); actualizarTodo();
  $("btnSig").textContent="Repartir flop";
}

function siguiente(){
  if(E.etapa<0||E.etapa===3){ nuevaMano(); return; }
  const previas=E.mesa.length;
  repartirCarta();                               // carta quemada
  const k=E.etapa===0?3:1;
  for(let i=0;i<k;i++) E.mesa.push(repartirCarta());
  E.etapa++; dibujarMesa(previas);
  actualizarTodo(E.etapa===3);
  if(E.etapa===3) terminar();
  else $("btnSig").textContent=E.etapa===1?"Repartir turn":"Repartir river";
}

function terminar(){
  const {mx,gan}=ganadores(E.manos.map(h=>mejor(h.concat(E.mesa))));
  E.manos.forEach((_,i)=>$("as"+i).classList.add(gan.includes(i)?"gana":"pierde"));
  const jugada=NOMBRES[mx[0]];
  $("aviso").textContent=gan.length===1
    ? `Gana el Jugador ${gan[0]+1} con ${jugada}`
    : `Empate entre los jugadores ${gan.map(i=>i+1).join(", ")} con ${jugada}`;
  $("btnSig").textContent="Nueva mano";
}

async function jugarTodo(){
  if(E.ocupado) return;
  E.ocupado=true; $("btnSig").disabled=$("btnTodo").disabled=true;
  if(E.etapa<0||E.etapa===3) nuevaMano();
  while(E.etapa<3){ await new Promise(r=>setTimeout(r,900)); siguiente(); }
  E.ocupado=false; $("btnSig").disabled=$("btnTodo").disabled=false;
}

/* ---------- 9. INICIO ---------- */
$("btnSig").onclick = () => { if(!E.ocupado) siguiente(); };
$("btnTodo").onclick = jugarTodo;
$("njug").onchange  = () => { if(!E.ocupado) nuevaMano(); };
dibujarMesa(0);
dibujarOuts();
dibujarRanking(false);
