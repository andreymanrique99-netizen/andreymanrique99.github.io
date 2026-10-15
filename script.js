// ---------- 1. Mapas disponibles ----------
// Si una calle no trae peso, se calcula con la distancia dibujada.
function cuadricula() {
  const nodos = {}, calles = [];
  for (let f = 0; f < 3; f++) for (let c = 0; c < 4; c++) {
    nodos[`${f}${c}`] = { x: 100 + c * 165, y: 70 + f * 140 };
    if (c < 3) calles.push([`${f}${c}`, `${f}${c + 1}`, (f * 3 + c * 5) % 6 + 2]);
    if (f < 2) calles.push([`${f}${c}`, `${f + 1}${c}`, (f * 5 + c * 3) % 6 + 2]);
  }
  return { nodos, calles };
}

function azar(s) {
  return function () {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// Ciudad aleatoria conectada: cuadrícula con nodos movidos, calles y diagonales
function ciudad(n, semilla) {
  const rnd = azar(semilla), P = 100, J = .55;
  const cols = Math.ceil(Math.sqrt(n * 1.8)), nodos = {}, celda = {}, cand = [];
  for (let k = 0, i = 0; i < n; k++) {
    const f = Math.floor(k / cols), c = k % cols;
    if (n > 8 && rnd() < .18) continue;            // solar vacío: deja huecos como en una ciudad real
    i++;
    nodos[i] = { x: Math.round(c * P + (f % 2) * P * .22 + (rnd() - .5) * P * J), y: Math.round(f * P + (rnd() - .5) * P * J) };
    celda[f + ',' + c] = String(i);
  }
  Object.keys(celda).forEach(function (k) {
    const [f, c] = k.split(',').map(Number), a = celda[k];
    const d = celda[f + ',' + (c + 1)], b = celda[(f + 1) + ',' + c], e = celda[(f + 1) + ',' + (c + 1)], h = celda[(f + 1) + ',' + (c - 1)];
    if (d) cand.push([a, d, .8]);
    if (b) cand.push([a, b, .8]);
    if (e && d && b) cand.push(rnd() < .5 ? [a, e, .25] : [d, b, .25]);
  });
  const raiz = {};
  Object.keys(nodos).forEach(function (id) { raiz[id] = id; });
  function buscar(x) { while (raiz[x] !== x) x = raiz[x] = raiz[raiz[x]]; return x; }
  const calles = [], sobran = [];
  cand.forEach(function (c) {
    if (rnd() < c[2]) { calles.push([c[0], c[1]]); raiz[buscar(c[0])] = buscar(c[1]); }
    else sobran.push(c);
  });
  sobran.forEach(function (c) {
    if (buscar(c[0]) !== buscar(c[1])) { calles.push([c[0], c[1]]); raiz[buscar(c[0])] = buscar(c[1]); }
  });
  // Si por los huecos quedaron zonas aisladas, se unen por el par de nodos más cercano
  for (;;) {
    const ids = Object.keys(nodos); let mejor = null;
    ids.forEach(function (a) { ids.forEach(function (b) {
      if (buscar(a) === buscar(b)) return;
      const dd = Math.hypot(nodos[a].x - nodos[b].x, nodos[a].y - nodos[b].y);
      if (!mejor || dd < mejor[2]) mejor = [a, b, dd];
    }); });
    if (!mejor) break;
    calles.push([mejor[0], mejor[1]]); raiz[buscar(mejor[0])] = buscar(mejor[1]);
  }
  // Mapas pequeños: unas pocas calles más para que haya alternativas (sin cruzarse, como en una ciudad real)
  if (n <= 60) {
    const ids = Object.keys(nodos), grado = {}, existe = new Set();
    ids.forEach(function (id) { grado[id] = 0; });
    calles.forEach(function (c) { grado[c[0]]++; grado[c[1]]++; existe.add(c[0] + '|' + c[1]); existe.add(c[1] + '|' + c[0]); });
    const orient = function (a, b, c) { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x); };
    const cruza = function (a, b, c, d) { return orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0; };
    const pares = [];
    ids.forEach(function (a) { ids.forEach(function (b) {
      if (Number(a) >= Number(b)) return;
      const dd = Math.hypot(nodos[a].x - nodos[b].x, nodos[a].y - nodos[b].y);
      if (dd < P * 1.5) pares.push([a, b, dd]);
    }); });
    pares.sort(function (p, q) { return p[2] - q[2]; });
    let faltan = Math.max(1, Math.round(n * .25));
    pares.forEach(function (p) {
      if (faltan <= 0 || existe.has(p[0] + '|' + p[1]) || grado[p[0]] >= 4 || grado[p[1]] >= 4 || rnd() < .35) return;
      const choca = calles.some(function (c) {
        if (c[0] === p[0] || c[0] === p[1] || c[1] === p[0] || c[1] === p[1]) return false;
        return cruza(nodos[p[0]], nodos[p[1]], nodos[c[0]], nodos[c[1]]);
      });
      if (choca) return;
      calles.push([p[0], p[1]]); grado[p[0]]++; grado[p[1]]++; faltan--;
    });
  }
  const xs = Object.values(nodos).map(function (q) { return q.x; });
  const ys = Object.values(nodos).map(function (q) { return q.y; });
  const W = Math.max(...xs), H = Math.max(...ys), parques = [];
  let rio = null;
  if (n >= 20) {
    for (let i = 0; i < 3 + Math.floor(n / 30); i++) {
      parques.push({ x: Math.round(rnd() * W), y: Math.round(rnd() * H), w: 60 + rnd() * 70, h: 50 + rnd() * 60 });
    }
    const y0 = Math.round(H * (.3 + rnd() * .4)), y1 = Math.round(H * (.3 + rnd() * .4));
    rio = `M -150 ${y0} Q ${W / 2} ${(y0 + y1) / 2 + (rnd() - .5) * 220} ${W + 150} ${y1}`;
  }
  return { w: W, h: H, nodos, calles, parques, rio, curvas: true };
}

const mapas = {
  barrio: {
    titulo: 'Barrio sencillo', w: 700, h: 420, r: 22, o: 'A', d: 'J',
    nodos: { A:{x:80,y:80}, B:{x:260,y:50}, C:{x:460,y:80}, D:{x:620,y:150}, E:{x:160,y:230},
             F:{x:340,y:200}, G:{x:520,y:280}, H:{x:90,y:360}, I:{x:300,y:350}, J:{x:600,y:370} },
    calles: [['A','B',4],['B','C',6],['C','D',5],['A','E',5],['B','F',3],['C','F',4],['C','G',7],['D','G',3],
             ['E','F',4],['E','H',6],['F','I',5],['F','G',6],['H','I',4],['I','G',5],['G','J',4],['I','J',8]]
  },
  pamplona: {
    titulo: 'Pamplona (mapa real)', w: 768, h: 456, r: 13, o: '1', d: '12',
    nombres: { 1:'Agueda Gallardo', 2:'Museo Casa Anzoátegui', 3:'Centro', 4:'Plazuela Almeyda', 5:'Terminal',
      6:'Instituto de Educación Rural', 7:'Agueda Gallardo de Villamizar', 8:'Estadio Camilo Daza',
      9:'El Castillo Embrujado', 10:'Batallón García Rovira', 11:'Escuela Normal Superior',
      12:'Casa de Encuentros', 13:'Cerro las Tres Cruces', 14:'Punto 14', 15:'Punto 15', 16:'Punto 16', 17:'Punto 17' },
    giroInicial: 90,
    nodos: { 1:{x:388,y:16}, 2:{x:364,y:67}, 3:{x:382,y:107}, 4:{x:318,y:117}, 5:{x:566,y:53}, 6:{x:446,y:146},
             7:{x:409,y:208}, 8:{x:229,y:204}, 9:{x:164,y:286}, 10:{x:217,y:301}, 11:{x:97,y:376}, 12:{x:469,y:432},
             13:{x:685,y:230}, 14:{x:598,y:178}, 15:{x:339,y:169}, 16:{x:372,y:263}, 17:{x:421,y:366} },
    calles: [[1,2],[2,3],[3,4],[3,15],[4,15],[3,6],[6,5],[6,7],[15,7],[15,8],[15,16],[8,10],[10,9],[9,11],
             [10,16],[16,7],[16,17],[17,12],[7,14],[14,13]].map(function (p) { return [String(p[0]), String(p[1])]; })
  },
  cuadricula: { titulo: 'Ciudad en cuadrícula', w: 700, h: 340, r: 22, o: '00', d: '23', ...cuadricula() },
  trampa: {
    titulo: 'El atajo engañoso', w: 700, h: 340, r: 24, o: 'S', d: 'T',
    nodos: { S:{x:80,y:170}, A:{x:250,y:70}, B:{x:420,y:70}, C:{x:330,y:270}, T:{x:620,y:170} },
    calles: [['S','T',10],['S','A',3],['A','B',2],['B','T',3],['A','C',6],['C','T',1],['S','C',8]]
  }
};

[5, 10, 20, 50, 100, 150, 200, 500, 1000, 5000].forEach(function (n, i) {
  const r = n >= 5000 ? 2 : n >= 1000 ? 3 : n >= 500 ? 5 : n >= 200 ? 8 : Math.min(24, Math.max(12, Math.round(Math.sqrt(n) * 2)));
  mapas['ciudad' + n] = { titulo: 'Ciudad de ' + n + ' nodos', r, o: '1', d: String(n), ...ciudad(n, 7 + i * 13) };
});

// ---------- 2. Estado ----------
let g, vecinos, pesos, dist, previo, visitados, actual, terminado, pendientes, timer;
let camino = [], aciertos = 0, intentos = 0;
function $(id) { return document.getElementById(id); }
const [grafo, modoSel, origen, destino, mapa, tabla, explicacion, btnPaso, btnAuto, btnSolucion, marcador] =
  ['grafo', 'modo', 'origen', 'destino', 'mapa', 'tabla', 'explicacion', 'btnPaso', 'btnAuto', 'btnSolucion', 'marcador'].map($);
function txt(d) { return d === Infinity ? '∞' : d; }

// Gira nodos (y más abajo la imagen de fondo) 0/90/180/270° en sentido horario
function aplicarGiro(m) {
  if (!m.base) { m.base = { nodos: JSON.parse(JSON.stringify(m.nodos)), w: m.w, h: m.h }; m.giro ??= m.giroInicial ?? 0; }
  const { nodos, w, h } = m.base, k = m.giro;
  m.nodos = {};
  Object.entries(nodos).forEach(function ([id, { x, y }]) {
    m.nodos[id] = k === 90 ? { x: h - y, y: x } : k === 180 ? { x: w - x, y: h - y }
                : k === 270 ? { x: y, y: w - x } : { x, y };
  });
  m.w = k % 180 ? h : w; m.h = k % 180 ? w : h;
}

function cargarMapa(clave, conservar) {
  g = mapas[clave];
  aplicarGiro(g);
  $('btnGirar').hidden = g.giroInicial === undefined;
  vecinos = {}; pesos = {};
  Object.keys(g.nodos).forEach(function (n) { vecinos[n] = []; });
  g.calles.forEach(function (c) {
    const [u, v] = c, a = g.nodos[u], b = g.nodos[v];
    const p = c[2] ?? Math.max(1, Math.round(Math.hypot(a.x - b.x, a.y - b.y) / 20));
    c[2] = p; pesos[u + '|' + v] = pesos[v + '|' + u] = p;
    vecinos[u].push({ a: v, peso: p }); vecinos[v].push({ a: u, peso: p });
  });
  if (!conservar) {
    [origen, destino].forEach(function (s) {
      s.replaceChildren();
      Object.keys(g.nodos).forEach(function (id) { s.add(new Option(id + (g.nombres ? ' · ' + g.nombres[id] : ''), id)); });
    });
    origen.value = g.o; destino.value = g.d;
  }
  reiniciar();
}

// Dijkstra completo (sin pasos), sirve para comprobar respuestas
function resolver(o) {
  const d = {}, p = {}, v = new Set();
  Object.keys(g.nodos).forEach(function (n) { d[n] = Infinity; p[n] = null; });
  d[o] = 0;
  for (;;) {
    let m = null;
    Object.keys(g.nodos).forEach(function (n) { if (!v.has(n) && d[n] < Infinity && (m === null || d[n] < d[m])) m = n; });
    if (m === null) return { d, p };
    v.add(m);
    vecinos[m].forEach(function ({ a, peso }) { if (d[m] + peso < d[a]) { d[a] = d[m] + peso; p[a] = m; } });
  }
}
function rutaDe(p, fin) { const r = []; for (let n = fin; n; n = p[n]) r.unshift(n); return r; }

// ---------- 3. Algoritmo paso a paso ----------
function reiniciar() {
  clearInterval(timer); timer = null;
  dist = {}; previo = {}; visitados = new Set(); actual = null; terminado = false;
  Object.keys(g.nodos).forEach(function (n) { dist[n] = Infinity; previo[n] = null; });
  dist[origen.value] = 0;
  pendientes = new Set(Object.keys(g.nodos));
  camino = [origen.value]; aciertos = 0; intentos = 0;
  const m = modoSel.value;
  // Cada modo muestra solo los controles que usa
  const obs = m === 'observar';
  btnPaso.hidden = btnAuto.hidden = !obs;
  document.querySelector('.control-velocidad').hidden = !obs;
  document.querySelector('.control-instantaneo').hidden = !obs;
  $('bloqueTabla').hidden = m === 'desafio';
  actualizarSolucion();
  $('btnComprobar').hidden = m !== 'desafio';
  $('btnGirar').hidden = g.giroInicial === undefined; $('btnGirar').textContent = 'Girar mapa 90°'; btnSolucion.textContent = 'Ver solución';
  listarTexto();
  btnPaso.disabled = btnAuto.disabled = false; btnAuto.textContent = 'Reproducir';
  mapa.classList.toggle('clicable', m !== 'observar');
  explicacion.textContent = {
    observar: `Distancia 0 en ${origen.value} (origen) e infinito en los demás. Pulsa «Siguiente paso».`,
    predecir: 'Haz clic en el nodo que Dijkstra visitará ahora: el pendiente con menor distancia. Empieza por el origen.',
    desafio: `Partes de ${origen.value}. Haz clic en nodos vecinos para armar tu ruta hasta ${destino.value}. Clic en el último nodo para deshacer.`
  }[m];
  marcador.textContent = '';
  dibujar();
}

function siguiente() {
  let m = null;
  pendientes.forEach(function (n) { if (m === null || dist[n] < dist[m]) m = n; });
  return m;
}

function paso(elegido) {
  if (terminado) return;
  const mejor = elegido ?? siguiente();
  if (mejor === null || dist[mejor] === Infinity) return terminar('No hay camino hasta el destino.');
  actual = mejor; pendientes.delete(actual); visitados.add(actual);
  const notas = [];
  vecinos[actual].forEach(function ({ a, peso }) {
    if (visitados.has(a)) return;
    const nueva = dist[actual] + peso;
    if (nueva < dist[a]) { notas.push(`${a}: ${txt(dist[a])} → ${nueva}`); dist[a] = nueva; previo[a] = actual; }
  });
  explicacion.textContent = `Visitamos ${actual} (distancia ${dist[actual]}). ` +
    (notas.length ? `Caminos mejores: ${notas.join(', ')}.` : 'No mejora a ningún vecino.');
  if (actual === destino.value) return terminar(`¡Llegamos a ${actual}! La ruta más corta mide ${dist[actual]}.`, true);
  dibujar();
}

function terminar(msg, hayRuta) {
  terminado = true; clearInterval(timer); timer = null;
  btnPaso.disabled = btnAuto.disabled = true;
  explicacion.textContent = msg;
  dibujar(hayRuta ? rutaDe(previo, destino.value) : []);
}

// «Ver solución» solo aparece cuando la ruta armada ya llega al destino
function actualizarSolucion() {
  btnSolucion.hidden = !(modoSel.value === 'desafio' && camino.at(-1) === destino.value);
}

// ---------- 4. Participación (clic en nodos) ----------
function clicNodo(id) {
  const m = modoSel.value;
  if (m === 'predecir' && !terminado) {
    intentos++;
    const sig = siguiente();
    if (pendientes.has(id) && dist[id] === dist[sig]) { aciertos++; paso(id); }
    else explicacion.textContent = visitados.has(id)
      ? `❌ ${id} ya fue visitado. Busca entre los pendientes.`
      : `❌ ${id} tiene distancia ${txt(dist[id])}. Mira la tabla: ¿hay un pendiente con distancia menor?`;
    marcador.textContent = `Aciertos: ${aciertos} de ${intentos}`;
  }
  if (m === 'desafio') {
    const ult = camino.at(-1);
    if (id === ult) { if (camino.length > 1) camino.pop(); }
    else if (ult === destino.value) return;
    else if (!pesos[ult + '|' + id]) { explicacion.textContent = `❌ No hay calle directa de ${ult} a ${id}.`; return; }
    else camino.push(id);
    const costo = camino.slice(1).reduce(function (s, n, i) { return s + pesos[camino[i] + '|' + n]; }, 0);
    marcador.textContent = `Tu ruta: ${costo}`;
    explicacion.textContent = `Ruta: ${camino.join(' → ')} (costo ${costo}).`;
    actualizarSolucion();
    if (camino.at(-1) === destino.value) {
      const opt = resolver(origen.value).d[destino.value];
      explicacion.textContent += costo === opt ? ' 🎉 ¡Es la ruta más corta!'
        : ` Llegaste, pero la mejor cuesta ${opt}. Deshaz y prueba otra, o pulsa «Ver solución».`;
    }
    dibujar();
  }
}

// ---------- 5. Dibujo ----------
const NS = 'http://www.w3.org/2000/svg';
function el(tipo, attrs, texto) {
  const e = document.createElementNS(NS, tipo);
  Object.entries(attrs).forEach(function ([k, v]) { e.setAttribute(k, v); });
  if (texto !== undefined) e.textContent = texto;
  return e;
}
function enLista(l, u, v) {
  return l.some(function (n, i) { return i && ((l[i - 1] === u && n === v) || (l[i - 1] === v && n === u)); });
}

// Calle recta o ligeramente curva (la curva depende solo de los extremos, así es estable)
function curva(a, b, u, v, k) {
  if (!k) return { d: `M${a.x} ${a.y} L${b.x} ${b.y}`, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  let h = 0; [u, v].sort().join('|').split('').forEach(function (ch) { h = (h * 31 + ch.charCodeAt(0)) % 997; });
  const t = (h / 997 - .5) * .35, dx = b.x - a.x, dy = b.y - a.y;
  const cx = (a.x + b.x) / 2 - dy * t, cy = (a.y + b.y) / 2 + dx * t;
  return { d: `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`, mx: (a.x + b.x) / 4 + cx / 2, my: (a.y + b.y) / 4 + cy / 2 };
}
// Accesibilidad: elemento accionable con ratón, toque o teclado (Enter / Espacio)
let foco = null;
function activable(e, f, teclado) {
  e.addEventListener('click', f);
  if (!teclado) return;
  e.setAttribute('tabindex', 0); e.setAttribute('role', 'button');
  e.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); foco = e.getAttribute('data-id'); f(); }
  });
}
function restaurar() {   // al redibujar se pierde el foco: lo devolvemos al mismo elemento
  if (foco === null) return;
  const e = [...mapa.querySelectorAll('[data-id]')].find(function (x) { return x.getAttribute('data-id') === foco; });
  if (e) e.focus({ preventScroll: true });
  foco = null;
}

function dibujar(ruta = []) {
  const desafio = modoSel.value === 'desafio', ids = Object.keys(g.nodos), grande = ids.length > 45;
  mapa.replaceChildren();
  // Encuadre automático: abarca todos los nodos + margen (arriba más, por el pin)
  const xs = Object.values(g.nodos).map(function (n) { return n.x; });
  const ys = Object.values(g.nodos).map(function (n) { return n.y; });
  const M = g.r + 28, x0 = Math.min(...xs) - M, y0 = Math.min(...ys) - g.r * 3.4 - 8;
  const ancho = Math.max(...xs) + M - x0, alto = Math.max(...ys) + M - y0;
  mapa.setAttribute('viewBox', `${x0} ${y0} ${ancho} ${alto}`);
  mapa.append(el('rect', { class: 'tierra', x: x0, y: y0, width: ancho, height: alto }));
  (g.parques || []).forEach(function (p) {
    mapa.append(el('rect', { class: 'parque', x: p.x - p.w / 2, y: p.y - p.h / 2, width: p.w, height: p.h, rx: 18 }));
  });
  if (g.rio) mapa.append(el('path', { class: 'rio', d: g.rio }));
  if (g.fondo) {
    const { w, h } = g.base;
    const tr = { 0: '', 90: `translate(${h} 0) rotate(90)`, 180: `translate(${w} ${h}) rotate(180)`, 270: `translate(0 ${w}) rotate(270)` }[g.giro];
    mapa.append(el('image', { href: g.fondo, x: 0, y: 0, width: w, height: h, opacity: .6, transform: tr }));
  }

  const calles = g.calles.map(function ([u, v, p]) {
    let c = '';
    if (enLista(ruta, u, v)) c = ' ruta';
    else if (desafio ? enLista(camino, u, v) : (previo[v] === u || previo[u] === v)) c = desafio ? ' alumno' : ' explorada';
    return { ...curva(g.nodos[u], g.nodos[v], u, v, g.curvas), c, p };
  });
  ['borde', 'arista'].forEach(function (base) {
    calles.forEach(function (q) { mapa.append(el('path', { class: base + q.c, d: q.d })); });
  });
  calles.forEach(function (q) {
    if (grande && !q.c) return;
    mapa.append(el('text', { class: 'peso', x: q.mx, y: q.my + 4 }, q.p));
  });

  ids.forEach(function (id) {
    const { x, y } = g.nodos[id];
    let c = 'nodo';
    if (ruta.includes(id)) c += ' ruta';
    else if (desafio && camino.includes(id)) c += ' camino';
    else if (id === actual) c += ' actual';
    else if (visitados.has(id)) c += ' visitado';
    const n = el('g', { class: c, 'data-id': id });
    if (modoSel.value !== 'observar') n.setAttribute('aria-label', `Nodo ${id}${g.nombres ? ', ' + g.nombres[id] : ''}${desafio ? '' : ', distancia ' + txt(dist[id])}`);
    n.append(el('circle', { cx: x, cy: y, r: g.r }), el('text', { x, y, style: `font-size:${Math.round(g.r * .75)}px` }, id));
    if (!desafio) n.append(el('text', { class: 'dist', x, y: y + g.r + Math.round(g.r * .65), style: `font-size:${Math.round(g.r * .62)}px` }, txt(dist[id]) + (id === actual ? ' ★' : visitados.has(id) ? ' ✓' : '')));
    activable(n, function () { clicNodo(id); }, modoSel.value !== 'observar');
    mapa.append(n);
  });

  restaurar();

  const o = g.nodos[origen.value], d = g.nodos[destino.value], k = g.r;
  mapa.append(el('circle', { class: 'origen', cx: o.x, cy: o.y, r: k + 5 }));
  mapa.append(el('path', {
    class: 'pin',
    d: `M${d.x} ${d.y - k} C${d.x - k * 1.2} ${d.y - k * 2} ${d.x - k} ${d.y - k * 3.2} ${d.x} ${d.y - k * 3.2} C${d.x + k} ${d.y - k * 3.2} ${d.x + k * 1.2} ${d.y - k * 2} ${d.x} ${d.y - k}Z`
  }));
  mapa.append(el('circle', { class: 'pin-centro', cx: d.x, cy: d.y - k * 2.2, r: k * .38 }));

  tabla.replaceChildren();
  if (desafio) return;
  ids.forEach(function (id) {
    const f = tabla.insertRow();
    if (id === actual) f.className = 'fila-actual';
    f.insertCell().textContent = id;
    f.insertCell().textContent = txt(dist[id]);
    f.insertCell().textContent = previo[id] || '—';
  });
}

// Versión en texto del mapa (para lectores de pantalla y para quien prefiera leer)
function listarTexto() {
  const items = g.calles.map(function ([u, v, p]) { return `${u} ↔ ${v}: distancia ${p}`; });
  $('listaCalles').replaceChildren(...items.map(function (t) { const li = document.createElement('li'); li.textContent = t; return li; }));
}

// ---------- 6. Controles ----------
Object.entries(mapas).forEach(function ([k, m]) {
  grafo.add(new Option(m.titulo, k));
});
grafo.addEventListener('change', function () {
  cargarMapa(grafo.value);
});
[modoSel, origen, destino].forEach(function (s) { s.addEventListener('change', reiniciar); });
btnPaso.addEventListener('click', function () { paso(); });
$('btnReiniciar').addEventListener('click', reiniciar);
function intervaloReproduccion() {
  return Number($('velocidad').value);
}
function actualizarVelocidad() {
  $('valorVelocidad').textContent = intervaloReproduccion() + ' ms';
  if (timer) {
    clearInterval(timer);
    timer = setInterval(function () { paso(); }, intervaloReproduccion());
  }
}
$('velocidad').addEventListener('input', actualizarVelocidad);
function ejecutarInstantaneo() {
  clearInterval(timer); timer = null;
  btnAuto.textContent = 'Reproducir';
  // Ejecuta los pasos sin temporizador, conservando el dibujo y el estado final.
  while (!terminado) paso();
}
$('instantaneo').addEventListener('change', function () {
  if (this.checked && timer) ejecutarInstantaneo();
});
btnAuto.addEventListener('click', function () {
  if ($('instantaneo').checked) {
    ejecutarInstantaneo();
    return;
  }
  if (timer) {
    clearInterval(timer); timer = null; btnAuto.textContent = 'Reproducir';
    return;
  }
  btnAuto.textContent = 'Pausar';
  timer = setInterval(function () { paso(); }, intervaloReproduccion());
});
$('btnComprobar').addEventListener('click', function () {
  const costo = camino.slice(1).reduce(function (t, n, i) { return t + pesos[camino[i] + '|' + n]; }, 0);
  const fin = camino.at(-1), meta = destino.value;
  if (camino.length < 2) {
    explicacion.textContent = 'Todavía no has armado una ruta. Haz clic en nodos vecinos desde el origen.';
  } else if (fin !== meta) {
    explicacion.textContent = `⚠️ Tu ruta aún no llega al destino ${meta}: va por ${camino.join(' → ')} (costo ${costo}) y termina en ${fin}. Sigue hasta ${meta} y vuelve a comprobar.`;
  } else {
    const opt = resolver(origen.value).d[meta];
    explicacion.textContent = costo === opt
      ? `✅ ¡Correcto! Tu ruta ${camino.join(' → ')} cuesta ${costo} y es la más corta posible.`
      : `❌ Tu ruta llega, pero no es la mejor: cuesta ${costo} y la mejor cuesta ${opt} (${costo - opt} más). Deshaz pasos (clic en el último nodo) y prueba otra, o pulsa «Ver solución».`;
  }
  marcador.textContent = camino.length > 1 ? `Tu ruta: ${costo}` : '';
});
btnSolucion.addEventListener('click', function () {
  const { d, p } = resolver(origen.value);
  explicacion.textContent = `Solución de Dijkstra: costo ${txt(d[destino.value])}.`;
  dibujar(d[destino.value] < Infinity ? rutaDe(p, destino.value) : []);
});
$('btnGirar').addEventListener('click', function () { g.giro = (g.giro + 90) % 360; cargarMapa(grafo.value, true); });
$('btnSorteo').addEventListener('click', function () {
  const ids = Object.keys(g.nodos);
  origen.value = ids[Math.floor(Math.random() * ids.length)];
  do destino.value = ids[Math.floor(Math.random() * ids.length)]; while (destino.value === origen.value);
  reiniciar();
});

actualizarVelocidad();
cargarMapa('barrio');