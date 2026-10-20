// Servidor sencillo (Node.js, sin dependencias) para la Encuesta.
// Uso:  node server.js   y abrir  http://localhost:3000
//
//  POST /api/encuesta/entrar     { nombre, clienteId } -> 201 | 409 si ya participó
//  POST /api/encuesta/resultado  { nombre, clienteId, ruta, costo, mejor, optima, vioSolucion }
//  GET  /api/encuesta/lista      -> participantes guardados (solo desde esta computadora)
// Los datos quedan en datos/encuestas.json

const http = require('http');
const fs = require('fs');
const path = require('path');

const PUERTO = process.env.PORT || 3000;
const CARPETA_DATOS = path.join(__dirname, 'datos');
const ARCHIVO = path.join(CARPETA_DATOS, 'encuestas.json');
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const PUBLICOS = ['index.html', 'style.css', 'script.js'];

fs.mkdirSync(CARPETA_DATOS, { recursive: true });
let participantes = [];
try { participantes = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')); } catch (e) { participantes = []; }

function guardar() {
  fs.writeFileSync(ARCHIVO + '.tmp', JSON.stringify(participantes, null, 2));
  fs.renameSync(ARCHIVO + '.tmp', ARCHIVO);
}

// "  José  PÉREZ " y "jose perez" cuentan como la misma persona
function clave(nombre) {
  return String(nombre).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function responder(res, estado, objeto) {
  res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(objeto));
}

function leerJson(req, cb) {
  let cuerpo = '';
  req.on('data', function (t) { cuerpo += t; if (cuerpo.length > 10000) req.destroy(); });
  req.on('end', function () { try { cb(JSON.parse(cuerpo)); } catch (e) { cb(null); } });
}

http.createServer(function (req, res) {
  const url = req.url.split('?')[0];

  if (req.method === 'POST' && url === '/api/encuesta/entrar') {
    return leerJson(req, function (d) {
      if (!d || typeof d.nombre !== 'string' || !clave(d.nombre)) return responder(res, 400, { error: 'Escribe tu nombre.' });
      const k = clave(d.nombre.slice(0, 40));
      const cid = String(d.clienteId || '').slice(0, 60);
      const repetido = participantes.some(function (p) { return p.clave === k || (cid && p.clienteId === cid); });
      if (repetido) return responder(res, 409, { error: 'Esta persona ya hizo la encuesta.' });
      participantes.push({
        nombre: d.nombre.trim().replace(/\s+/g, ' ').slice(0, 40),
        clave: k, clienteId: cid, entrada: new Date().toISOString(), intentos: []
      });
      guardar();
      responder(res, 201, { ok: true });
    });
  }

  if (req.method === 'POST' && url === '/api/encuesta/resultado') {
    return leerJson(req, function (d) {
      if (!d) return responder(res, 400, { error: 'Datos no válidos.' });
      const k = clave(d.nombre || '');
      const p = participantes.find(function (x) { return x.clave === k && x.clienteId === String(d.clienteId || ''); });
      if (!p) return responder(res, 404, { error: 'Participante no encontrado.' });
      p.intentos.push({
        fecha: new Date().toISOString(), ruta: String(d.ruta || '').slice(0, 200),
        costo: Number(d.costo), mejor: Number(d.mejor), optima: !!d.optima, vioSolucion: !!d.vioSolucion
      });
      guardar();
      responder(res, 200, { ok: true });
    });
  }

  if (req.method === 'GET' && url === '/api/encuesta/lista') {
    const local = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].indexOf(req.socket.remoteAddress) >= 0;
    if (!local) return responder(res, 403, { error: 'Solo desde el servidor.' });
    return responder(res, 200, participantes);
  }

  if (req.method === 'GET') {
    const nombre = url === '/' ? 'index.html' : url.slice(1);
    if (PUBLICOS.indexOf(nombre) < 0) { res.writeHead(404); return res.end('No encontrado'); }
    return fs.readFile(path.join(__dirname, nombre), function (err, datos) {
      if (err) { res.writeHead(404); return res.end('No encontrado'); }
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(nombre)] });
      res.end(datos);
    });
  }

  res.writeHead(405); res.end();
}).listen(PUERTO, function () { console.log('Abre http://localhost:' + PUERTO); });
