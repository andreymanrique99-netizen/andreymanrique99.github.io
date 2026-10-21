// =====================================================================
//  DIJKSTRA PASO A PASO  (versión sencilla)
//
//  Vocabulario:
//    NODO   = un punto del mapa (una esquina, una plaza...)
//    ARISTA = una calle que une dos nodos; su número es la distancia
//
//  Idea de Dijkstra:
//    1. El origen está a distancia 0; todos los demás a "infinito".
//    2. Visitamos el nodo pendiente con MENOR distancia.
//    3. Por cada calle de ese nodo, vemos si llegar a su vecino
//       pasando por aquí es más corto que lo que sabíamos.
//    4. Repetimos hasta visitar el destino.
//
//  El archivo se lee de arriba hacia abajo:
//    1. Mapas   2. Variables   3. Algoritmo   4. Clics
//    5. Dibujo  6. Botones
// =====================================================================


// ---------------------------------------------------------------------
// 1. MAPAS
// Cada mapa tiene: nodos {id: {x, y}} y calles [nodo1, nodo2, distancia].
// Si una calle no trae distancia, se calcula con lo que mide en el dibujo.
// ---------------------------------------------------------------------

// Números "al azar" que siempre dan lo mismo con la misma semilla
// (así cada ciudad sale igual cada vez que abres la página).
function crearAzar(semilla) {
  let s = semilla;
  return function () {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// Ciudad en cuadrícula de 3 filas x 4 columnas, con diagonales
function crearCuadricula() {
  const nodos = {};
  const calles = [];
  for (let fila = 0; fila < 3; fila++) {
    for (let col = 0; col < 4; col++) {
      const id = '' + fila + col;
      nodos[id] = { x: 100 + col * 165, y: 70 + fila * 140 };
      if (col < 3) calles.push([id, '' + fila + (col + 1), (fila * 3 + col * 5) % 6 + 2]);
      if (fila < 2) calles.push([id, '' + (fila + 1) + col, (fila * 5 + col * 3) % 6 + 2]);
    }
  }
  // Una diagonal por manzana (alternadas, para que no se crucen)
  for (let fila = 0; fila < 2; fila++) {
    for (let col = 0; col < 3; col++) {
      const peso = (fila * 4 + col * 3) % 5 + 3;
      if ((fila + col) % 2 === 0) calles.push(['' + fila + col, '' + (fila + 1) + (col + 1), peso]);
      else calles.push(['' + fila + (col + 1), '' + (fila + 1) + col, peso]);
    }
  }
  return { titulo: 'Ciudad en cuadrícula', r: 22, origen: '00', destino: '23', nodos: nodos, calles: calles };
}

// Ciudad aleatoria de n nodos: una cuadrícula irregular, como las calles de un barrio.
function crearCiudad(n, semilla) {
  const azar = crearAzar(semilla);
  const separacion = 100;
  const columnas = Math.ceil(Math.sqrt(n * 1.8));
  const conHuecos = n >= 20;          // en ciudades medianas y grandes hay solares vacíos
  const nodos = {};
  const calles = [];
  const celdas = {};                  // 'fila,columna' -> id del nodo que hay ahí
  const posicion = {};                // id -> { fila, col }

  // 1. Nodos: cada fila un poco corrida y cada nodo movido al azar,
  //    para que las calles no queden perfectamente rectas.
  let id = 0;
  for (let k = 0; id < n; k++) {
    const fila = Math.floor(k / columnas);
    const col = k % columnas;
    if (conHuecos && azar() < 0.15) continue;      // solar vacío: deja un hueco
    id++;
    nodos[id] = {
      x: Math.round(col * separacion + (fila % 2) * separacion * 0.22 + (azar() - 0.5) * separacion * 0.55),
      y: Math.round(fila * separacion + (azar() - 0.5) * separacion * 0.55)
    };
    celdas[fila + ',' + col] = String(id);
    posicion[id] = { fila: fila, col: col };
  }

  function nodoEn(fila, col) { return celdas[fila + ',' + col] || null; }

  // 2. Calles. Si hay un hueco, la calle sigue de largo hasta el siguiente nodo.
  let ultimaFila = 0;
  Object.keys(nodos).forEach(function (a) {
    ultimaFila = Math.max(ultimaFila, posicion[a].fila);
    const fila = posicion[a].fila, col = posicion[a].col;
    let derecha = nodoEn(fila, col + 1);
    if (!derecha && azar() < 0.95) derecha = nodoEn(fila, col + 2);
    let abajo = nodoEn(fila + 1, col);
    // Para que no se crucen, solo se salta un hueco hacia abajo si no lo cruza una calle horizontal
    const lo_cruza = nodoEn(fila + 1, col - 1) && nodoEn(fila + 1, col + 1);
    if (!abajo && !lo_cruza && azar() < 0.95) abajo = nodoEn(fila + 2, col);

    if (derecha) calles.push([a, derecha]);
    if (abajo && (azar() < 0.96 || n <= 20)) calles.push([a, abajo]);
  });

  // Diagonales: una por manzana (alternadas para que no se crucen).
  // Si a la manzana le falta una esquina, se usa la diagonal que no la toca.
  for (let fila = 0; fila <= ultimaFila; fila++) {
    for (let col = 0; col < columnas - 1; col++) {
      const A = nodoEn(fila, col), B = nodoEn(fila, col + 1);
      const C = nodoEn(fila + 1, col), D = nodoEn(fila + 1, col + 1);
      const esquinas = [A, B, C, D].filter(Boolean).length;
      if (esquinas < 3 || !(n <= 20 || azar() < 0.95)) continue;
      if (esquinas === 4) {
        if ((fila + col) % 2 === 0) calles.push([A, D]);
        else calles.push([B, C]);
      } else if (!D || !A) calles.push([B, C]);
      else calles.push([A, D]);
    }
  }

  // 3. Si por los huecos quedó alguna zona separada del resto, se une al nodo más cercano.
  const raiz = {};
  Object.keys(nodos).forEach(function (x) { raiz[x] = x; });
  function buscar(x) { while (raiz[x] !== x) { raiz[x] = raiz[raiz[x]]; x = raiz[x]; } return x; }
  calles.forEach(function (c) { raiz[buscar(c[0])] = buscar(c[1]); });
  while (true) {
    const grupos = {};
    Object.keys(nodos).forEach(function (x) { (grupos[buscar(x)] = grupos[buscar(x)] || []).push(x); });
    const lista = Object.keys(grupos).map(function (r) { return grupos[r]; });
    if (lista.length === 1) break;
    let chico = lista[0];
    lista.forEach(function (g) { if (g.length < chico.length) chico = g; });   // la zona más pequeña
    const raizChico = buscar(chico[0]);
    let mejor = null;
    chico.forEach(function (a) {
      Object.keys(nodos).forEach(function (b) {
        if (buscar(b) === raizChico) return;
        const d = Math.hypot(nodos[a].x - nodos[b].x, nodos[a].y - nodos[b].y);
        if (!mejor || d < mejor[2]) mejor = [a, b, d];
      });
    });
    calles.push([mejor[0], mejor[1]]);
    raiz[buscar(mejor[0])] = buscar(mejor[1]);
  }

  // Tamaño total (sirve para colocar parques y el río)
  let ancho = 0, alto = 0;
  Object.keys(nodos).forEach(function (id) {
    ancho = Math.max(ancho, nodos[id].x);
    alto = Math.max(alto, nodos[id].y);
  });

  // Decoración (solo en ciudades de 20 nodos o más)
  const parques = [];
  let rio = null;
  if (n >= 20) {
    const cantidad = 3 + Math.floor(n / 30);
    for (let i = 0; i < cantidad; i++) {
      parques.push({ x: azar() * ancho, y: azar() * alto, w: 60 + azar() * 70, h: 50 + azar() * 60 });
    }
    const y1 = alto * (0.3 + azar() * 0.4);
    const y2 = alto * (0.3 + azar() * 0.4);
    rio = 'M -150 ' + y1 + ' Q ' + (ancho / 2) + ' ' + ((y1 + y2) / 2) + ' ' + (ancho + 150) + ' ' + y2;
  }

  // Tamaño del círculo de cada nodo: más chico mientras más nodos haya
  let radio = Math.min(24, Math.max(12, Math.round(Math.sqrt(n) * 2)));
  if (n >= 200) radio = 8;
  if (n >= 500) radio = 5;
  if (n >= 1000) radio = 3;
  if (n >= 5000) radio = 2;

  return {
    titulo: 'Ciudad de ' + n + ' nodos', r: radio, origen: '1', destino: String(n),
    nodos: nodos, calles: calles, parques: parques, rio: rio,
    curvas: true      // las calles se dibujan ligeramente curvas, como en un mapa
  };
}

const mapas = {
  barrio: {
    titulo: 'Barrio sencillo', r: 22, origen: 'A', destino: 'J',
    nodos: {
      A: { x: 80, y: 80 },   B: { x: 260, y: 50 },  C: { x: 460, y: 80 },
      D: { x: 620, y: 150 }, E: { x: 160, y: 230 }, F: { x: 340, y: 200 },
      G: { x: 520, y: 280 }, H: { x: 90, y: 360 },  I: { x: 300, y: 350 },
      J: { x: 600, y: 370 }
    },
    calles: [
      ['A', 'B', 4], ['B', 'C', 6], ['C', 'D', 5], ['A', 'E', 5], ['B', 'F', 3],
      ['C', 'F', 4], ['C', 'G', 7], ['D', 'G', 3], ['E', 'F', 4], ['E', 'H', 6],
      ['F', 'I', 5], ['F', 'G', 6], ['H', 'I', 4], ['I', 'G', 5], ['G', 'J', 4],
      ['I', 'J', 8], ['A', 'F', 6], ['E', 'I', 7], ['D', 'J', 9], ['A', 'H', 9]
    ]
  },

  pamplona: {
    titulo: 'Pamplona (mapa real)', r: 13, origen: '1', destino: '12',
    ancho: 768, alto: 456, giroInicial: 90,   // este mapa se puede girar
    nombres: {
      1: 'Agueda Gallardo', 2: 'Museo Casa Anzoátegui', 3: 'Centro', 4: 'Plazuela Almeyda',
      5: 'Terminal', 6: 'Instituto de Educación Rural', 7: 'Agueda Gallardo de Villamizar',
      8: 'Estadio Camilo Daza', 9: 'El Castillo Embrujado', 10: 'Batallón García Rovira',
      11: 'Escuela Normal Superior', 12: 'Casa de Encuentros', 13: 'Cerro las Tres Cruces',
      14: 'Punto 14', 15: 'Punto 15', 16: 'Punto 16', 17: 'Punto 17'
    },
    nodos: {
      1: { x: 388, y: 16 },   2: { x: 364, y: 67 },   3: { x: 382, y: 107 },  4: { x: 318, y: 117 },
      5: { x: 566, y: 53 },   6: { x: 446, y: 146 },  7: { x: 409, y: 208 },  8: { x: 229, y: 204 },
      9: { x: 164, y: 286 },  10: { x: 217, y: 301 }, 11: { x: 97, y: 376 },  12: { x: 469, y: 432 },
      13: { x: 685, y: 230 }, 14: { x: 598, y: 178 }, 15: { x: 339, y: 169 }, 16: { x: 372, y: 263 },
      17: { x: 421, y: 366 }
    },
    calles: [
      ['1', '2'], ['2', '3'], ['3', '4'], ['3', '15'], ['4', '15'], ['3', '6'], ['6', '5'],
      ['6', '7'], ['15', '7'], ['15', '8'], ['15', '16'], ['8', '10'], ['10', '9'], ['9', '11'],
      ['10', '16'], ['16', '7'], ['16', '17'], ['17', '12'], ['7', '14'], ['14', '13']
    ]
  },

  cuadricula: crearCuadricula(),

  trampa: {
    titulo: 'El atajo engañoso', r: 24, origen: 'S', destino: 'T',
    nodos: {
      S: { x: 80, y: 170 }, A: { x: 250, y: 70 }, B: { x: 420, y: 70 },
      C: { x: 330, y: 270 }, T: { x: 620, y: 170 }
    },
    calles: [['S', 'T', 10], ['S', 'A', 3], ['A', 'B', 2], ['B', 'T', 3], ['A', 'C', 6], ['C', 'T', 1], ['S', 'C', 8]]
  }
};

// Nombre en letras para el nodo número i: A... Z, AA, AB, AC...
function nombreLetra(i) {
  const letra = function (k) { return String.fromCharCode(65 + k); };
  return i < 26 ? letra(i) : letra(Math.floor(i / 26) - 1) + letra(i % 26);
}

// Cambia los números de los nodos por letras (A, B, C... Z, AA, AB...)
function usarLetras(m) {
  const letra = {}, nodos = {};
  Object.keys(m.nodos).forEach(function (id, i) {
    letra[id] = nombreLetra(i);
    nodos[letra[id]] = m.nodos[id];
  });
  m.nodos = nodos;
  m.calles = m.calles.map(function (c) { return [letra[c[0]], letra[c[1]], c[2]]; });
  m.origen = letra[m.origen];
  m.destino = letra[m.destino];
  return m;
}

// Agrega calles extra entre nodos cercanos (pueden cruzarse con otras, pero no pasan sobre otro nodo),
// para que haya más caminos posibles y sea más fácil equivocarse de nodo.
function agregarConexiones(m, cuantas, semilla) {
  const azar = crearAzar(semilla);
  const ids = Object.keys(m.nodos);
  const existe = {};
  m.calles.forEach(function (c) { existe[c[0] + '|' + c[1]] = true; existe[c[1] + '|' + c[0]] = true; });

  function pasaPorUnNodo(a, b) {      // ¿la calle a-b roza otro nodo?
    const A = m.nodos[a], B = m.nodos[b];
    const largo2 = Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2);
    return ids.some(function (k) {
      if (k === a || k === b) return false;
      const P = m.nodos[k];
      let t = ((P.x - A.x) * (B.x - A.x) + (P.y - A.y) * (B.y - A.y)) / largo2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(P.x - (A.x + t * (B.x - A.x)), P.y - (A.y + t * (B.y - A.y))) < 16;
    });
  }

  // Parejas cercanas que todavía no tienen calle, de la más corta a la más larga (con algo de azar)
  const candidatas = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i], b = ids[j];
      if (existe[a + '|' + b]) continue;
      const d = Math.hypot(m.nodos[a].x - m.nodos[b].x, m.nodos[a].y - m.nodos[b].y);
      if (d <= 190) candidatas.push({ a: a, b: b, d: d, orden: d * (0.8 + azar() * 0.4) });
    }
  }
  candidatas.sort(function (p, q) { return p.orden - q.orden; });

  let agregadas = 0;
  candidatas.forEach(function (c) {
    if (agregadas >= cuantas) return;
    if (pasaPorUnNodo(c.a, c.b)) return;
    // Distancia parecida a lo que mide en el dibujo, con algo de variación
    const peso = Math.max(1, Math.round(c.d / 20) + Math.floor(azar() * 4) - 1);
    m.calles.push([c.a, c.b, peso]);
    existe[c.a + '|' + c.b] = existe[c.b + '|' + c.a] = true;
    agregadas++;
  });
  return m;
}

// Agrega calles LARGAS entre nodos lejanos que no se tocan (por ejemplo I con Z).
// Cada nodo recibe como mucho una de estas calles, así que ninguna comparte nodos con otra.
// No unen directamente el origen con el destino, para que no haya un atajo trivial.
function agregarConexionesLargas(m, cuantas, semilla, distanciaMinima) {
  const azar = crearAzar(semilla);
  const ids = Object.keys(m.nodos);
  const usados = {};
  const existe = {};
  m.calles.forEach(function (c) { existe[c[0] + '|' + c[1]] = true; existe[c[1] + '|' + c[0]] = true; });

  const candidatas = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i], b = ids[j];
      if (existe[a + '|' + b]) continue;
      if ((a === m.origen && b === m.destino) || (a === m.destino && b === m.origen)) continue;
      const d = Math.hypot(m.nodos[a].x - m.nodos[b].x, m.nodos[a].y - m.nodos[b].y);
      if (d >= distanciaMinima) candidatas.push({ a: a, b: b, d: d, orden: azar() });
    }
  }
  candidatas.sort(function (p, q) { return p.orden - q.orden; });   // al azar

  let agregadas = 0;
  candidatas.forEach(function (c) {
    if (agregadas >= cuantas || usados[c.a] || usados[c.b]) return;
    const peso = Math.max(3, Math.round(c.d / 20) + Math.floor(azar() * 4));
    m.calles.push([c.a, c.b, peso]);
    usados[c.a] = usados[c.b] = true;
    agregadas++;
  });
  return m;
}

// Reparte mejor las calles: quita algunas donde hay demasiadas y pone otras donde casi no hay.
//  - quitar: cuántas calles quitar (solo entre nodos que ya tienen muchas; el mapa sigue conectado)
//  - minimo: cada nodo debe quedar con al menos esta cantidad de calles
function acomodarConexiones(m, quitar, minimo, semilla) {
  const azar = crearAzar(semilla);
  const ids = Object.keys(m.nodos);

  function grados() {
    const g = {};
    ids.forEach(function (id) { g[id] = 0; });
    m.calles.forEach(function (c) { g[c[0]]++; g[c[1]]++; });
    return g;
  }
  function conectado(calles) {       // ¿se puede llegar a todos los nodos?
    const ady = {};
    ids.forEach(function (id) { ady[id] = []; });
    calles.forEach(function (c) { ady[c[0]].push(c[1]); ady[c[1]].push(c[0]); });
    const visto = {}; const pila = [ids[0]]; visto[ids[0]] = true;
    let n = 1;
    while (pila.length) {
      ady[pila.pop()].forEach(function (v) { if (!visto[v]) { visto[v] = true; n++; pila.push(v); } });
    }
    return n === ids.length;
  }
  function rozaNodo(a, b) {          // ¿la calle a-b pasa casi encima de otro nodo?
    const A = m.nodos[a], B = m.nodos[b];
    const largo2 = Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2);
    return ids.some(function (k) {
      if (k === a || k === b) return false;
      const P = m.nodos[k];
      let t = ((P.x - A.x) * (B.x - A.x) + (P.y - A.y) * (B.y - A.y)) / largo2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(P.x - (A.x + t * (B.x - A.x)), P.y - (A.y + t * (B.y - A.y))) < 16;
    });
  }

  // 1. Quitar calles entre nodos que ya tienen muchas (las más cargadas primero)
  let g = grados();
  const lista = m.calles.slice().sort(function (p, q) {
    return (g[q[0]] + g[q[1]] + azar() * 2) - (g[p[0]] + g[p[1]] + azar() * 2);
  });
  let quitadas = 0;
  lista.forEach(function (c) {
    if (quitadas >= quitar) return;
    if (g[c[0]] <= minimo + 1 || g[c[1]] <= minimo + 1) return;      // no dejar nodos pelados
    const resto = m.calles.filter(function (k) { return k !== c; });
    if (!conectado(resto)) return;
    m.calles = resto;
    g[c[0]]--; g[c[1]]--;
    quitadas++;
  });

  // 2. Poner calles donde casi no hay: nodos con pocas calles, hacia sus vecinos cercanos
  //    que también tengan pocas (así se reparte parejo).
  const existe = {};
  m.calles.forEach(function (c) { existe[c[0] + '|' + c[1]] = true; existe[c[1] + '|' + c[0]] = true; });
  const pobres = ids.filter(function (id) { return g[id] < minimo; })
    .sort(function (a, b) { return g[a] - g[b]; });
  pobres.forEach(function (a) {
    const cercanos = ids
      .filter(function (b) { return b !== a && !existe[a + '|' + b]; })
      .map(function (b) {
        const d = Math.hypot(m.nodos[a].x - m.nodos[b].x, m.nodos[a].y - m.nodos[b].y);
        return { b: b, d: d, orden: d + g[b] * 25 };                // mejor los cercanos y con pocas calles
      })
      .filter(function (c) { return c.d <= 260 && !rozaNodo(a, c.b); })
      .sort(function (p, q) { return p.orden - q.orden; });
    cercanos.forEach(function (c) {
      if (g[a] >= minimo) return;
      const peso = Math.max(1, Math.round(c.d / 20) + Math.floor(azar() * 4) - 1);
      m.calles.push([a, c.b, peso]);
      existe[a + '|' + c.b] = existe[c.b + '|' + a] = true;
      g[a]++; g[c.b]++;
    });
  });
  return m;
}

// Las ciudades generadas (ahora incluye la de 20 nodos)
[5, 10, 20, 50, 100, 150, 200, 500, 1000, 5000, 10000, 20000].forEach(function (n, posicion) {
  mapas['ciudad' + n] = crearCiudad(n, 7 + posicion * 13);
});

// Encuesta 1: un mapa nuevo de 30 puntos, con letras en vez de números
// (es distinto de la ciudad de 20 nodos que está en la lista).
// Origen = A (primer nodo) y destino = AD (último nodo), en la otra punta del mapa.
// 30 calles extra (cambia el 30 para tener más o menos conexiones)
const mapaEncuesta1 = crearCiudad(30, 101);
agregarConexiones(mapaEncuesta1, 30, 5);                // calles extra entre nodos cercanos
agregarConexionesLargas(mapaEncuesta1, 6, 11, 300);     // 6 calles largas entre nodos lejanos (distancia mínima 300)
acomodarConexiones(mapaEncuesta1, 10, 4, 21);      // quita 10 donde hay de más y pone donde hay menos de 4 calles
usarLetras(mapaEncuesta1);
mapaEncuesta1.titulo = 'Encuesta 1';
mapas.encuesta1 = mapaEncuesta1;


// ---------------------------------------------------------------------
// 2. VARIABLES Y ELEMENTOS DE LA PÁGINA
// ---------------------------------------------------------------------
function $(id) { return document.getElementById(id); }

const selMapa = $('grafo');
const selModo = $('modo');
const selOrigen = $('origen');
const selDestino = $('destino');
const svg = $('mapa');
const cuerpoTabla = $('tabla');
const explicacion = $('explicacion');
const marcador = $('marcador');
const btnPaso = $('btnPaso');
const btnAuto = $('btnAuto');
const btnSolucion = $('btnSolucion');
const btnComprobar = $('btnComprobar');
const btnGirar = $('btnGirar');

let mapa;            // el mapa que se está usando
let vecinos;         // vecinos[nodo] = lista de { nodo, peso }
let pesos;           // pesos['A|B'] = distancia de la calle A-B

// Estado del algoritmo
let distancia;       // mejor distancia conocida desde el origen
let previo;          // desde qué nodo se llegó mejor a cada nodo
let visitados;       // nodos ya terminados
let pendientes;      // nodos que faltan por visitar
let nodoActual;      // el último nodo visitado
let terminado;       // ¿ya acabó el algoritmo?
let temporizador;    // para el botón Reproducir

// Estado de los modos
let camino = [];     // ruta que arma el alumno (modo "Encuentra la ruta")
let aciertos = 0;
let intentos = 0;
let nodoConFoco = null;   // para no perder el foco del teclado al redibujar

function texto(d) { return d === Infinity ? '∞' : d; }


// ---------------------------------------------------------------------
// 3. CARGAR EL MAPA Y EL ALGORITMO
// ---------------------------------------------------------------------

// Gira los nodos 90° en sentido horario (solo mapas con giroInicial)
function aplicarGiro() {
  if (mapa.giroInicial === undefined) return;
  if (!mapa.original) {
    mapa.original = JSON.parse(JSON.stringify(mapa.nodos));
    mapa.giro = mapa.giroInicial;
  }
  const w = mapa.ancho, h = mapa.alto, g = mapa.giro;
  mapa.nodos = {};
  Object.keys(mapa.original).forEach(function (id) {
    const x = mapa.original[id].x, y = mapa.original[id].y;
    if (g === 90) mapa.nodos[id] = { x: h - y, y: x };
    else if (g === 180) mapa.nodos[id] = { x: w - x, y: h - y };
    else if (g === 270) mapa.nodos[id] = { x: y, y: w - x };
    else mapa.nodos[id] = { x: x, y: y };
  });
}

function cargarMapa(clave, conservarSeleccion) {
  mapa = mapas[clave];
  aplicarGiro();
  btnGirar.hidden = mapa.giroInicial === undefined;

  // Preparar vecinos y pesos
  vecinos = {};
  pesos = {};
  Object.keys(mapa.nodos).forEach(function (id) { vecinos[id] = []; });
  mapa.calles.forEach(function (calle) {
    const u = calle[0], v = calle[1];
    if (calle[2] === undefined) {   // sin distancia: se calcula con el dibujo
      const a = mapa.nodos[u], b = mapa.nodos[v];
      calle[2] = Math.max(1, Math.round(Math.hypot(a.x - b.x, a.y - b.y) / 20));
    }
    const peso = calle[2];
    pesos[u + '|' + v] = peso;
    pesos[v + '|' + u] = peso;
    vecinos[u].push({ nodo: v, peso: peso });
    vecinos[v].push({ nodo: u, peso: peso });
  });

  // Llenar las listas de origen y destino
  if (!conservarSeleccion) {
    [selOrigen, selDestino].forEach(function (lista) {
      lista.replaceChildren();
      Object.keys(mapa.nodos).forEach(function (id) {
        const nombre = mapa.nombres ? id + ' · ' + mapa.nombres[id] : id;
        lista.add(new Option(nombre, id));
      });
    });
    selOrigen.value = mapa.origen;
    selDestino.value = mapa.destino;
  }
  reiniciar();
}

// Dijkstra completo de una sola vez (sirve para comprobar respuestas)
function calcularRutaMasCorta(desde) {
  const dist = {}, prev = {}, listos = {};
  const ids = Object.keys(mapa.nodos);
  ids.forEach(function (id) { dist[id] = Infinity; prev[id] = null; });
  dist[desde] = 0;

  while (true) {
    // El nodo sin terminar con menor distancia
    let mejor = null;
    ids.forEach(function (id) {
      if (!listos[id] && dist[id] < Infinity && (mejor === null || dist[id] < dist[mejor])) mejor = id;
    });
    if (mejor === null) break;
    listos[mejor] = true;
    // Mejorar a sus vecinos
    vecinos[mejor].forEach(function (v) {
      if (dist[mejor] + v.peso < dist[v.nodo]) {
        dist[v.nodo] = dist[mejor] + v.peso;
        prev[v.nodo] = mejor;
      }
    });
  }
  return { dist: dist, prev: prev };
}

// Arma la lista de nodos de la ruta yendo hacia atrás desde el final
function armarRuta(prev, fin) {
  const ruta = [];
  for (let n = fin; n; n = prev[n]) ruta.unshift(n);
  return ruta;
}

// Deja todo como al principio
function reiniciar() {
  clearInterval(temporizador);
  temporizador = null;

  distancia = {};
  previo = {};
  Object.keys(mapa.nodos).forEach(function (id) { distancia[id] = Infinity; previo[id] = null; });
  distancia[selOrigen.value] = 0;
  visitados = new Set();
  pendientes = new Set(Object.keys(mapa.nodos));
  nodoActual = null;
  terminado = false;
  camino = [selOrigen.value];
  aciertos = 0;
  intentos = 0;

  // Cada modo muestra solo los botones que usa
  const modo = selModo.value;
  const observando = modo === 'observar';
  btnPaso.hidden = !observando;
  btnAuto.hidden = !observando;
  document.querySelector('.control-velocidad').hidden = !observando;
  document.querySelector('.control-instantaneo').hidden = !observando;
  btnComprobar.hidden = modo !== 'desafio' || enEncuesta;
  $('bloqueTabla').hidden = modo === 'desafio';
  actualizarBotonSolucion();

  btnPaso.disabled = false;
  btnAuto.disabled = false;
  btnAuto.textContent = 'Reproducir';
  btnSolucion.textContent = 'Ver solución';
  svg.classList.toggle('clicable', !observando);
  marcador.textContent = '';
  listarCalles();

  if (modo === 'observar') {
    explicacion.textContent = 'Distancia 0 en ' + selOrigen.value + ' (origen) e infinito en los demás. Pulsa «Siguiente paso».';
  } else if (modo === 'predecir') {
    explicacion.textContent = 'Haz clic en el nodo que Dijkstra visitará ahora: el pendiente con menor distancia. Empieza por el origen.';
  } else {
    explicacion.textContent = 'Partes de ' + selOrigen.value + '. Haz clic en nodos vecinos para armar tu ruta hasta ' +
      selDestino.value + '. Clic en el último nodo para deshacer.';
  }
  dibujar();
}

// El pendiente con menor distancia: el que toca visitar
function elegirSiguiente() {
  let mejor = null;
  pendientes.forEach(function (id) {
    if (mejor === null || distancia[id] < distancia[mejor]) mejor = id;
  });
  return mejor;
}

// Un paso de Dijkstra. "elegido" es el nodo que el alumno escogió (modo predecir).
// "sinDibujar" sirve para ir rápido en el modo Instantáneo.
function darPaso(elegido, sinDibujar) {
  if (terminado) return;
  const nodo = elegido !== undefined ? elegido : elegirSiguiente();

  if (nodo === null || distancia[nodo] === Infinity) {
    terminar('No hay camino hasta el destino.', false);
    return;
  }

  // Visitar el nodo
  nodoActual = nodo;
  pendientes.delete(nodo);
  visitados.add(nodo);

  // Mirar cada calle del nodo y mejorar a los vecinos si se puede
  const mejoras = [];
  vecinos[nodo].forEach(function (v) {
    if (visitados.has(v.nodo)) return;
    const nueva = distancia[nodo] + v.peso;
    if (nueva < distancia[v.nodo]) {
      mejoras.push(v.nodo + ': ' + texto(distancia[v.nodo]) + ' → ' + nueva);
      distancia[v.nodo] = nueva;
      previo[v.nodo] = nodo;
    }
  });

  explicacion.textContent = 'Visitamos ' + nodo + ' (distancia ' + distancia[nodo] + '). ' +
    (mejoras.length ? 'Caminos mejores: ' + mejoras.join(', ') + '.' : 'No mejora a ningún vecino.');

  if (nodo === selDestino.value) {
    terminar('¡Llegamos a ' + nodo + '! La ruta más corta mide ' + distancia[nodo] + '.', true);
    return;
  }
  if (!sinDibujar) dibujar();
}

function terminar(mensaje, hayRuta) {
  terminado = true;
  clearInterval(temporizador);
  temporizador = null;
  btnPaso.disabled = true;
  btnAuto.disabled = true;
  explicacion.textContent = mensaje;
  dibujar(hayRuta ? armarRuta(previo, selDestino.value) : []);
}

// «Ver solución» solo aparece cuando la ruta del alumno ya llega al destino
function actualizarBotonSolucion() {
  const llego = camino[camino.length - 1] === selDestino.value;
  btnSolucion.hidden = enEncuesta || !(selModo.value === 'desafio' && llego);
}

// Suma las distancias de la ruta del alumno
function costoDelCamino() {
  let total = 0;
  for (let i = 1; i < camino.length; i++) total += pesos[camino[i - 1] + '|' + camino[i]];
  return total;
}


// ---------------------------------------------------------------------
// 4. CLICS SOBRE LOS NODOS
// ---------------------------------------------------------------------
function clicNodo(id) {
  if (selModo.value === 'predecir') clicPredecir(id);
  if (selModo.value === 'desafio') clicDesafio(id);
}

// Modo 2: ¿acertó el nodo que Dijkstra visitaría ahora?
function clicPredecir(id) {
  if (terminado) return;
  intentos++;
  const correcto = elegirSiguiente();
  if (pendientes.has(id) && distancia[id] === distancia[correcto]) {
    aciertos++;
    darPaso(id);
  } else if (visitados.has(id)) {
    explicacion.textContent = '❌ ' + id + ' ya fue visitado. Busca entre los pendientes.';
  } else {
    explicacion.textContent = '❌ ' + id + ' tiene distancia ' + texto(distancia[id]) +
      '. Mira la tabla: ¿hay un pendiente con distancia menor?';
  }
  marcador.textContent = 'Aciertos: ' + aciertos + ' de ' + intentos;
}

// Modo 1: el alumno arma su ruta nodo por nodo
function clicDesafio(id) {
  const ultimo = camino[camino.length - 1];

  if (id === ultimo) {                       // clic en el último nodo: deshacer
    if (camino.length > 1) camino.pop();
  } else if (ultimo === selDestino.value) {  // ya llegó: no se agrega más
    return;
  } else if (!pesos[ultimo + '|' + id]) {    // no hay calle entre esos nodos
    explicacion.textContent = '❌ No hay calle directa de ' + ultimo + ' a ' + id + '.';
    return;
  } else {
    camino.push(id);
  }

  const costo = costoDelCamino();
  marcador.textContent = 'Tu ruta: ' + costo;
  explicacion.textContent = 'Ruta: ' + camino.join(' → ') + ' (costo ' + costo + ').';
  actualizarBotonSolucion();

  if (camino[camino.length - 1] === selDestino.value) {
    const mejor = calcularRutaMasCorta(selOrigen.value).dist[selDestino.value];
    if (costo === mejor) explicacion.textContent += ' 🎉 ¡Es la ruta más corta!';
    else explicacion.textContent += ' Llegaste, pero la mejor cuesta ' + mejor + '. Deshaz y prueba otra, o pulsa «Ver solución».';
    registrarIntento();
  }
  dibujar();
}

// Botón «Comprobar mi ruta»
function comprobarRuta() {
  const costo = costoDelCamino();
  const fin = camino[camino.length - 1];
  const meta = selDestino.value;

  if (camino.length < 2) {
    explicacion.textContent = 'Todavía no has armado una ruta. Haz clic en nodos vecinos desde el origen.';
  } else if (fin !== meta) {
    explicacion.textContent = '⚠️ Tu ruta aún no llega al destino ' + meta + ': va por ' + camino.join(' → ') +
      ' (costo ' + costo + ') y termina en ' + fin + '. Sigue hasta ' + meta + ' y vuelve a comprobar.';
  } else {
    const mejor = calcularRutaMasCorta(selOrigen.value).dist[meta];
    if (costo === mejor) {
      explicacion.textContent = '✅ ¡Correcto! Tu ruta ' + camino.join(' → ') + ' cuesta ' + costo + ' y es la más corta posible.';
    } else {
      explicacion.textContent = '❌ Tu ruta llega, pero no es la mejor: cuesta ' + costo + ' y la mejor cuesta ' + mejor +
        ' (' + (costo - mejor) + ' más). Deshaz pasos (clic en el último nodo) y prueba otra, o pulsa «Ver solución».';
    }
  }
  marcador.textContent = camino.length > 1 ? 'Tu ruta: ' + costo : '';
}

// Botón «Ver solución»
function verSolucion() {
  vioSolucion = true;
  registrarIntento();
  const resultado = calcularRutaMasCorta(selOrigen.value);
  const costo = resultado.dist[selDestino.value];
  explicacion.textContent = 'Solución de Dijkstra: costo ' + texto(costo) + '.';
  dibujar(costo < Infinity ? armarRuta(resultado.prev, selDestino.value) : []);
}


// ---------------------------------------------------------------------
// 5. DIBUJO (SVG)
// ---------------------------------------------------------------------
const NS = 'http://www.w3.org/2000/svg';
const CURVATURA = 0.3;   // qué tan curvas se ven las calles de las ciudades (0 = rectas)

// Crea un elemento SVG con sus atributos
function crear(tipo, atributos, contenido) {
  const e = document.createElementNS(NS, tipo);
  Object.keys(atributos).forEach(function (nombre) { e.setAttribute(nombre, atributos[nombre]); });
  if (contenido !== undefined) e.textContent = contenido;
  return e;
}

// ¿La lista contiene la calle u-v (en cualquier sentido)?
function contieneCalle(lista, u, v) {
  for (let i = 1; i < lista.length; i++) {
    if ((lista[i - 1] === u && lista[i] === v) || (lista[i - 1] === v && lista[i] === u)) return true;
  }
  return false;
}

// Trazo de una calle entre los nodos u y v: recta, o ligeramente curva en las ciudades.
// La curvatura sale de los nombres de los nodos, así cada calle siempre se ve igual.
function trazarCalle(u, v) {
  const a = mapa.nodos[u], b = mapa.nodos[v];
  if (!mapa.curvas) {
    return { d: 'M' + a.x + ' ' + a.y + ' L' + b.x + ' ' + b.y, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }
  let h = 0;
  const nombre = [u, v].sort().join('|');
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) % 997;
  const curvatura = (h / 997 - 0.5) * CURVATURA;      // entre -CURVATURA/2 y +CURVATURA/2
  const dx = b.x - a.x, dy = b.y - a.y;
  const cx = (a.x + b.x) / 2 - dy * curvatura;        // punto de control de la curva
  const cy = (a.y + b.y) / 2 + dx * curvatura;
  return {
    d: 'M' + a.x + ' ' + a.y + ' Q' + cx + ' ' + cy + ' ' + b.x + ' ' + b.y,
    mx: (a.x + b.x) / 4 + cx / 2,                     // punto medio de la curva (para el número)
    my: (a.y + b.y) / 4 + cy / 2
  };
}

// "ruta" = nodos de la ruta óptima que hay que resaltar (opcional)
function dibujar(ruta) {
  ruta = ruta || [];
  const desafio = selModo.value === 'desafio';
  const ids = Object.keys(mapa.nodos);
  const muchosNodos = ids.length > 45;
  svg.replaceChildren();

  // Encuadre: que se vean todos los nodos con un poco de margen
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  ids.forEach(function (id) {
    minX = Math.min(minX, mapa.nodos[id].x); maxX = Math.max(maxX, mapa.nodos[id].x);
    minY = Math.min(minY, mapa.nodos[id].y); maxY = Math.max(maxY, mapa.nodos[id].y);
  });
  const margen = mapa.r + 28;
  const x0 = minX - margen;
  const y0 = minY - mapa.r * 3.4 - 8;     // arriba más espacio por el pin del destino
  const ancho = maxX + margen - x0;
  const alto = maxY + margen - y0;
  svg.setAttribute('viewBox', x0 + ' ' + y0 + ' ' + ancho + ' ' + alto);

  // Fondo: tierra, parques y río
  svg.append(crear('rect', { class: 'tierra', x: x0, y: y0, width: ancho, height: alto }));
  (mapa.parques || []).forEach(function (p) {
    svg.append(crear('rect', { class: 'parque', x: p.x - p.w / 2, y: p.y - p.h / 2, width: p.w, height: p.h, rx: 18 }));
  });
  if (mapa.rio) svg.append(crear('path', { class: 'rio', d: mapa.rio }));

  // Calles: primero el borde, luego la línea de encima
  const calles = mapa.calles.map(function (calle) {
    const u = calle[0], v = calle[1];
    let clase = '';
    if (contieneCalle(ruta, u, v)) clase = ' ruta';
    else if (desafio && contieneCalle(camino, u, v)) clase = ' alumno';
    else if (!desafio && (previo[v] === u || previo[u] === v)) clase = ' explorada';
    const trazo = trazarCalle(u, v);
    return { d: trazo.d, clase: clase, peso: calle[2], mx: trazo.mx, my: trazo.my };
  });
  ['borde', 'arista'].forEach(function (tipo) {
    calles.forEach(function (c) { svg.append(crear('path', { class: tipo + c.clase, d: c.d })); });
  });
  // Distancias de las calles (en mapas grandes solo las de la ruta)
  calles.forEach(function (c) {
    if (muchosNodos && !c.clase) return;
    svg.append(crear('text', { class: 'peso', x: c.mx, y: c.my + 4 }, c.peso));
  });

  // Nodos
  ids.forEach(function (id) {
    const x = mapa.nodos[id].x, y = mapa.nodos[id].y, r = mapa.r;
    let clase = 'nodo';
    if (ruta.indexOf(id) >= 0) clase += ' ruta';
    else if (desafio && camino.indexOf(id) >= 0) clase += ' camino';
    else if (id === nodoActual) clase += ' actual';
    else if (visitados.has(id)) clase += ' visitado';

    const grupo = crear('g', { class: clase, 'data-id': id });
    grupo.append(crear('circle', { cx: x, cy: y, r: r }));
    grupo.append(crear('text', { x: x, y: y, style: 'font-size:' + Math.round(r * 0.75) + 'px' }, id));

    // Distancia debajo del nodo (con ★ si es el actual y ✓ si ya fue visitado)
    if (!desafio) {
      const marca = id === nodoActual ? ' ★' : visitados.has(id) ? ' ✓' : '';
      grupo.append(crear('text', {
        class: 'dist', x: x, y: y + r + Math.round(r * 0.65),
        style: 'font-size:' + Math.round(r * 0.62) + 'px'
      }, texto(distancia[id]) + marca));
    }

    // En los modos 1 y 2 los nodos se pueden pulsar (ratón, dedo o teclado)
    if (selModo.value !== 'observar') {
      const nombre = mapa.nombres ? ', ' + mapa.nombres[id] : '';
      const dato = desafio ? '' : ', distancia ' + texto(distancia[id]);
      grupo.setAttribute('aria-label', 'Nodo ' + id + nombre + dato);
      grupo.setAttribute('role', 'button');
      grupo.setAttribute('tabindex', 0);
      grupo.addEventListener('click', function () { clicNodo(id); });
      grupo.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          nodoConFoco = id;
          clicNodo(id);
        }
      });
    }
    svg.append(grupo);
  });

  // Si se usó el teclado, devolver el foco al mismo nodo
  if (nodoConFoco !== null) {
    const elemento = svg.querySelector('[data-id="' + nodoConFoco + '"]');
    if (elemento) elemento.focus({ preventScroll: true });
    nodoConFoco = null;
  }

  // Origen (círculo azul) y destino (pin rojo)
  const o = mapa.nodos[selOrigen.value], d = mapa.nodos[selDestino.value], k = mapa.r;
  svg.append(crear('circle', { class: 'origen', cx: o.x, cy: o.y, r: k + 5 }));
  svg.append(crear('path', {
    class: 'pin',
    d: 'M' + d.x + ' ' + (d.y - k) +
       ' C' + (d.x - k * 1.2) + ' ' + (d.y - k * 2) + ' ' + (d.x - k) + ' ' + (d.y - k * 3.2) + ' ' + d.x + ' ' + (d.y - k * 3.2) +
       ' C' + (d.x + k) + ' ' + (d.y - k * 3.2) + ' ' + (d.x + k * 1.2) + ' ' + (d.y - k * 2) + ' ' + d.x + ' ' + (d.y - k) + 'Z'
  }));
  svg.append(crear('circle', { class: 'pin-centro', cx: d.x, cy: d.y - k * 2.2, r: k * 0.38 }));

  // Tabla de distancias
  cuerpoTabla.replaceChildren();
  if (desafio) return;
  ids.forEach(function (id) {
    const fila = cuerpoTabla.insertRow();
    if (id === nodoActual) fila.className = 'fila-actual';
    fila.insertCell().textContent = id;
    fila.insertCell().textContent = texto(distancia[id]);
    fila.insertCell().textContent = previo[id] || '—';
  });
}

// Lista de calles en texto (para lectores de pantalla o para quien prefiera leer)
function listarCalles() {
  const lista = $('listaCalles');
  lista.replaceChildren();
  mapa.calles.forEach(function (calle) {
    const li = document.createElement('li');
    li.textContent = calle[0] + ' ↔ ' + calle[1] + ': distancia ' + calle[2];
    lista.append(li);
  });
}


// ---------------------------------------------------------------------
// 6. BOTONES Y CONTROLES
// ---------------------------------------------------------------------

// Llenar la lista de mapas según la encuesta elegida
function llenarMapas(claves) {
  selMapa.replaceChildren();
  claves.forEach(function (clave) {
    selMapa.add(new Option(mapas[clave].titulo, clave));
  });
}

selMapa.addEventListener('change', function () { cargarMapa(selMapa.value); });
selModo.addEventListener('change', reiniciar);
selOrigen.addEventListener('change', reiniciar);
selDestino.addEventListener('change', reiniciar);

btnPaso.addEventListener('click', function () { darPaso(); });
$('btnReiniciar').addEventListener('click', reiniciar);
btnComprobar.addEventListener('click', comprobarRuta);
btnSolucion.addEventListener('click', verSolucion);

btnGirar.addEventListener('click', function () {
  mapa.giro = (mapa.giro + 90) % 360;
  cargarMapa(selMapa.value, true);
});

// Sortear origen y destino distintos
$('btnSorteo').addEventListener('click', function () {
  const ids = Object.keys(mapa.nodos);
  selOrigen.value = ids[Math.floor(Math.random() * ids.length)];
  do {
    selDestino.value = ids[Math.floor(Math.random() * ids.length)];
  } while (selDestino.value === selOrigen.value);
  reiniciar();
});

// Velocidad del botón Reproducir
function milisegundos() { return Number($('velocidad').value); }

$('velocidad').addEventListener('input', function () {
  $('valorVelocidad').textContent = milisegundos() + ' ms';
  if (temporizador) {   // si está reproduciendo, cambiar la velocidad al momento
    clearInterval(temporizador);
    temporizador = setInterval(darPaso, milisegundos());
  }
});

// Modo instantáneo: hacer todos los pasos de golpe y dibujar solo el final
function ejecutarTodo() {
  clearInterval(temporizador);
  temporizador = null;
  btnAuto.textContent = 'Reproducir';
  while (!terminado) darPaso(undefined, true);
}

$('instantaneo').addEventListener('change', function () {
  if (this.checked && temporizador) ejecutarTodo();
});

btnAuto.addEventListener('click', function () {
  if ($('instantaneo').checked) { ejecutarTodo(); return; }
  if (temporizador) {                          // estaba reproduciendo: pausar
    clearInterval(temporizador);
    temporizador = null;
    btnAuto.textContent = 'Reproducir';
  } else {                                     // reproducir
    btnAuto.textContent = 'Pausar';
    temporizador = setInterval(darPaso, milisegundos());
  }
});

// ---------------------------------------------------------------------
// 7. ENCUESTA (guarda el nombre en el servidor; una sola vez por persona)
//    El entorno normal muestra todos los mapas menos el de la encuesta.
//    El botón «Encuesta» (debajo del mapa) pide el nombre y abre el mapa
//    de 30 nodos con letras A, B, C... (después de Z: AA, AB, AC, AD).
// ---------------------------------------------------------------------
let enEncuesta = false;
let nombreParticipante = '';
let vioSolucion = false;
let rondaActual = null;   // la define el servidor; cambia cuando reinicias la encuesta

const CLAVE_LOCAL = 'dijkstraEncuestaHecha';
const CLAVE_CLIENTE = 'dijkstraClienteId';

// Identificador anónimo de este navegador (el servidor también lo guarda)
function clienteId() {
  let id = null;
  try { id = localStorage.getItem(CLAVE_CLIENTE); } catch (e) { /* sin almacenamiento */ }
  if (!id) {
    id = 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    try { localStorage.setItem(CLAVE_CLIENTE, id); } catch (e) { /* sin almacenamiento */ }
  }
  return id;
}

function yaHizoEncuesta() {
  try {
    const v = localStorage.getItem(CLAVE_LOCAL);
    if (!v) return false;
    if (rondaActual === null) return true;     // sin servidor: se comporta como antes
    return v === rondaActual;                  // si la ronda cambió, puede participar otra vez
  } catch (e) { return false; }
}

function mapasNormales() {
  return Object.keys(mapas).filter(function (c) { return c !== 'encuesta1'; });
}

function enviar(ruta, datos) {
  return fetch(ruta, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  }).then(function (r) {
    return r.json().catch(function () { return {}; }).then(function (cuerpo) {
      return { estado: r.status, cuerpo: cuerpo };
    });
  });
}

// Guarda en el servidor cómo le fue a la persona (cada vez que llega al destino)
function registrarIntento() {
  if (!enEncuesta) return;
  const costo = costoDelCamino();
  const mejor = calcularRutaMasCorta(selOrigen.value).dist[selDestino.value];
  enviar('/api/encuesta/resultado', {
    nombre: nombreParticipante,
    clienteId: clienteId(),
    ruta: camino.join(' > '),
    costo: costo,
    mejor: mejor,
    optima: costo === mejor,
    vioSolucion: vioSolucion
  }).catch(function () { /* si falla el envío, la encuesta sigue funcionando */ });
}

function actualizarEstadoEncuesta() {
  const hecha = yaHizoEncuesta();
  $('btnEncuesta').disabled = hecha || enEncuesta;
  $('estadoEncuesta').textContent = enEncuesta ? 'Encuesta en curso.' :
    hecha ? 'Ya participaste en la encuesta.' : '';
}

function entrarEncuesta(nombre) {
  enEncuesta = true;
  nombreParticipante = nombre;
  vioSolucion = false;
  try { localStorage.setItem(CLAVE_LOCAL, rondaActual || '1'); } catch (e) { /* sin almacenamiento */ }

  llenarMapas(['encuesta1']);
  $('etiquetaMapa').hidden = true;
  $('etiquetaModo').hidden = true;
  $('btnSorteo').hidden = true;
  selModo.value = 'desafio';
  $('participante').textContent = nombre + ' · Encuesta';
  $('barraEncuesta').hidden = false;
  $('btnReiniciar').hidden = true;
  $('bloqueResultados').hidden = true;
  cargarMapa('encuesta1');
  // Eliminar por completo el control «Instantáneo» de la interfaz de la encuesta.
  const entradaInstantaneo = $('instantaneo');
  if (entradaInstantaneo) {
    const contenedor = entradaInstantaneo.closest('.control-instantaneo');
    if (contenedor) {
      contenedor.remove();
    } else {
      const etiqueta = entradaInstantaneo.closest('label');
      if (etiqueta) etiqueta.remove();
      else entradaInstantaneo.remove();
    }
  }
  document.querySelectorAll('.control-instantaneo, label[for="instantaneo"]').forEach(elemento => elemento.remove());
  document.querySelectorAll('label, span, div').forEach(elemento => {
    if (elemento.children.length === 0 && elemento.textContent.trim().toLowerCase() === 'instantáneo') {
      elemento.remove();
    }
  });
  selOrigen.disabled = true;
  selDestino.disabled = true;
  actualizarEstadoEncuesta();
}

function salirEncuesta() {
  clearInterval(temporizador);
  temporizador = null;
  enEncuesta = false;
  $('barraEncuesta').hidden = true;
  $('etiquetaMapa').hidden = false;
  $('etiquetaModo').hidden = false;
  $('btnSorteo').hidden = false;
  $('btnReiniciar').hidden = false;
  selOrigen.disabled = false;
  selDestino.disabled = false;
  const claves = mapasNormales();
  llenarMapas(claves);
  cargarMapa(claves[0]);
  actualizarEstadoEncuesta();
}

$('btnEncuesta').addEventListener('click', function () {
  if (yaHizoEncuesta()) { actualizarEstadoEncuesta(); return; }
  $('errorNombre').textContent = '';
  $('dlgEncuesta').showModal();
  $('nombre').focus();
});

$('btnCancelarNombre').addEventListener('click', function () { $('dlgEncuesta').close(); });

$('formNombre').addEventListener('submit', function (e) {
  e.preventDefault();
  const nombre = $('nombre').value.trim().replace(/\s+/g, ' ');
  if (!nombre) { $('nombre').focus(); return; }
  $('errorNombre').textContent = 'Conectando con el servidor…';
  enviar('/api/encuesta/entrar', { nombre: nombre, clienteId: clienteId() }).then(function (r) {
    if (r.estado === 201) {
      $('dlgEncuesta').close();
      entrarEncuesta(nombre);
    } else if (r.estado === 409) {
      try { localStorage.setItem(CLAVE_LOCAL, rondaActual || '1'); } catch (e2) { /* sin almacenamiento */ }
      $('errorNombre').textContent = 'Esta persona ya hizo la encuesta. Solo se puede entrar una vez.';
      actualizarEstadoEncuesta();
    } else {
      $('errorNombre').textContent = (r.cuerpo && r.cuerpo.error) ||
        'No se pudo guardar el nombre (código ' + r.estado + '). Esta página no está conectada al servidor: ' +
        'ejecuta «node server.js» en la carpeta del proyecto y abre http://localhost:3000 (no Live Server ni el archivo directo).';
    }
  }).catch(function () {
    $('errorNombre').textContent = 'No hay conexión con el servidor. Ábrelo con «node server.js» y entra por http://localhost:3000.';
  });
});

// Lista de participantes: quién acertó la ruta más corta y quién no
let temporizadorResultados = null;

function cargarResultados() {
  return fetch('/api/encuesta/resultados').then(function (r) { return r.json(); }).then(function (lista) {
    const cuerpo = $('tablaResultados');
    cuerpo.textContent = '';
    if (!lista.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 3;
      td.textContent = 'Todavía no hay participantes.';
      tr.appendChild(td);
      cuerpo.appendChild(tr);
      return;
    }
    lista.forEach(function (p) {
      const tr = document.createElement('tr');
      const nombre = document.createElement('td');
      const resultado = document.createElement('td');
      const intentos = document.createElement('td');
      nombre.textContent = p.nombre;                       // textContent: seguro con cualquier nombre
      if (p.estado === 'bien') { resultado.textContent = '✅ Acertó'; resultado.className = 'ok'; }
      else if (p.estado === 'mal') { resultado.textContent = '❌ No acertó'; resultado.className = 'mal'; }
      else { resultado.textContent = '⏳ No llegó al destino'; }
      intentos.textContent = p.intentos;
      tr.appendChild(nombre); tr.appendChild(resultado); tr.appendChild(intentos);
      cuerpo.appendChild(tr);
    });
  }).catch(function () { /* si falla, se reintenta en el siguiente ciclo */ });
}

function mostrarResultados() {
  $('bloqueResultados').hidden = false;
  cargarResultados();
  clearInterval(temporizadorResultados);
  temporizadorResultados = setInterval(cargarResultados, 5000);   // se actualiza solo
}

function acabarEncuesta() {
  if (!confirm('¿Acabar la encuesta? Ya no podrás volver a entrar.')) return;
  salirEncuesta();
  mostrarResultados();
}

$('btnVolver').addEventListener('click', acabarEncuesta);

// ¡Arrancamos! El entorno aparece normal, sin la encuesta.
$('valorVelocidad').textContent = milisegundos() + ' ms';
llenarMapas(mapasNormales());
cargarMapa(mapasNormales()[0]);
actualizarEstadoEncuesta();
fetch('/api/encuesta/estado').then(function (r) { return r.json(); }).then(function (d) {
  rondaActual = String(d.ronda);
  actualizarEstadoEncuesta();
  if (yaHizoEncuesta()) mostrarResultados();
}).catch(function () { /* sin servidor: nada que hacer */ });
