'use strict';
/* =========================================================
   URBAN J · Control de inventario, ventas y caja
   Datos en un JSON local (Electron) o localStorage (navegador)
   ========================================================= */

const bridge = window.api || {
  load: async () => localStorage.getItem('uj_data'),
  save: async s => { localStorage.setItem('uj_data', s); return true; },
  exportBackup: async (s, name) => dl(name, s, 'application/json'),
  importBackup: () => new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json';
    i.onchange = () => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsText(i.files[0]); };
    i.click();
  }),
  saveFile: async (name, content) => dl(name, content, 'text/csv'),
  openDataDir: async () => toast('Solo disponible en la app de escritorio'),
  dataPath: async () => 'Navegador (localStorage)',
  printHTML: async html => { const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.focus(); w.print(); return { ok: true }; },
  pdfHTML: async () => false
};
async function imprimir(html, nombre) {
  let r; try { r = await bridge.printHTML(html); } catch (e) { r = { ok: false, err: e.message }; }
  if (r && r.ok) return;
  if (r && r.err === 'cancelled') return;
  if (await ask('No se pudo imprimir (¿impresora apagada o sin conectar?). ¿Guardar el ticket como PDF?', { ok: 'Guardar PDF', title: 'Impresión' })) {
    if (await bridge.pdfHTML(html, nombre + '.pdf')) toast('PDF guardado');
  }
}
function dl(name, content, type) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = name; a.click(); return true; }

/* ---------- utilidades ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const dk = d => { d = new Date(d); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const hoyK = () => dk(new Date());
const nowISO = () => new Date().toISOString();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const n0 = v => { const n = Number(v); return isFinite(n) ? n : 0; };
const money = v => '$ ' + Math.round(n0(v)).toLocaleString('es-CO');
const int = v => Math.round(n0(v)).toLocaleString('es-CO');
const pct = v => (isFinite(v) ? (v * 100).toFixed(1).replace('.', ',') : '0') + '%';
const fFecha = d => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
const fHora = d => new Date(d).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const dateFromInput = s => (!s || s === hoyK()) ? nowISO() : new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10), 12).toISOString();
const sum = (a, f) => a.reduce((s, x) => s + n0(f(x)), 0);

const ICONS = {
  inicio: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  vender: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.6 12.2h11L21 7H6"/>',
  productos: '<path d="M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3c0 2-1.6 3-4 3S8 5 8 3z"/>',
  entradas: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
  movimientos: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
  ventas: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/>',
  caja: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
  proveedores: '<path d="M1 6h13v10H1zM14 9h4l3 3v4h-7"/><circle cx="5.5" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
  reportes: '<path d="M4 20V11M10 20V4M16 20v-7M22 20H2"/>',
  inversion: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  down: '<path d="M12 4v12M6 11l6 6 6-6M4 20h16"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5M16 4.6a3.5 3.5 0 010 6.8M18 13.8c2.4.7 4 2.9 4 6.2"/>',
  logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>',
  print: '<path d="M6 9V3h12v6M6 17H3v-7h18v7h-3M7 14h10v7H7z"/>'
};
const ic = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[k]}</svg>`;

/* ---------- datos ---------- */
let DB = null;
let VIEW = 'inicio';

function emptyDB() {
  return {
    version: 1,
    config: {
      negocio: 'URBAN-J', lema: 'Boutique', nit: '', telefono: '', direccion: '', instagram: '@urbanj_boutique',
      pieTicket: 'Gracias por ser parte\nde nuestra historia ✦\nModa · Estilo · Tendencia\n\nCambios dentro de los 8 días con este ticket y la prenda con etiquetas.',
      logo: window.DEFAULT_LOGO || '', sonidoIntro: true, acento: '#ff5757', marcaV2: true, marcaV3: true, marcaV4: true, prefijo: 'UJ', stockMin: 2, imprimirAuto: false,
      categorias: ['Camisetas', 'Hoodies', 'Pantalones', 'Shorts', 'Chaquetas', 'Gorras', 'Accesorios', 'Calzado'],
      gruposTallas: [
        { nombre: 'Letras (camisetas, hoodies, chaquetas)', tallas: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
        { nombre: 'Pantalón hombre', tallas: ['28', '30', '32', '34', '36', '38', '40'] },
        { nombre: 'Pantalón dama', tallas: ['4', '6', '8', '10', '12', '14', '16'] },
        { nombre: 'Calzado', tallas: ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44'] },
        { nombre: 'Única', tallas: ['ÚNICA'] }
      ],
      colores: ['Negro', 'Blanco', 'Gris', 'Beige', 'Azul', 'Verde', 'Rojo'],
      metodos: ['Efectivo', 'Nequi', 'Daviplata', 'Transferencia', 'Tarjeta'],
      costosExtra: [{ id: 'marquillas', nombre: 'Marquillas', valor: 0 }, { id: 'etiquetas', nombre: 'Etiquetas', valor: 0 }, { id: 'bolsas', nombre: 'Bolsas', valor: 0 }, { id: 'envios', nombre: 'Envíos', valor: 0 }],
      seq: { prod: 1, venta: 1, compra: 1 }
    },
    proveedores: [], productos: [], movimientos: [], compras: [], ventas: [], cajas: [], cajaMovs: [], inversiones: []
  };
}
function fixDB(d) {
  const e = emptyDB();
  d = d && typeof d === 'object' ? d : {};
  for (const k of Object.keys(e)) if (d[k] == null) d[k] = e[k];
  d.config = { ...e.config, ...d.config };
  d.config.seq = { ...e.config.seq, ...(d.config.seq || {}) };
  return d;
}
async function save() {
  const enNube = typeof nubeSubir === 'function' && NUBE.perfil;
  try { await bridge.save(JSON.stringify(DB)); setSaved(true); }
  catch (err) {
    // en el móvil (navegador) la memoria local es pequeña: si se llena, la nube sigue siendo la copia buena
    if (!enNube) { setSaved(false); toast('No se pudo guardar: ' + err.message, 'bad'); }
  }
  if (enNube) nubeSubir();
}
function setSaved(ok) {
  const s = $('#saveState'); if (!s) return;
  s.className = ok ? 'ok' : 'bad';
  s.textContent = ok ? 'Guardado ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : 'Error al guardar';
}
const cfg = () => DB.config;
const nextNum = (kind, prefix, len) => {
  const lista = kind === 'venta' ? DB.ventas : kind === 'compra' ? DB.compras : null;
  if (lista) { const max = lista.reduce((m, x) => Math.max(m, parseInt(String(x.num || '').split('-')[1], 10) || 0), 0); DB.config.seq[kind] = Math.max(DB.config.seq[kind], max + 1); }
  return `${prefix}-${String(DB.config.seq[kind]++).padStart(len, '0')}`;
};

/* ---------- productos ---------- */
const prodById = id => DB.productos.find(p => p.id === id);
const varById = (p, vid) => p && p.variantes.find(v => v.id === vid);
const provById = id => DB.proveedores.find(p => p.id === id);
const stockTotal = p => sum(p.variantes, v => v.stock);
/* costos adicionales (marquillas, bolsas…): se suman al precio de venta y cuentan como costo */
const extrasTot = p => sum(p.extras || [], e => e.valor);
const costoTot = p => n0(p.costo) + extrasTot(p);
const varName = v => [v.talla, v.color].filter(Boolean).join(' · ') || 'Única';
function grupoSugerido(cat) {
  const c = norm(cat), gs = cfg().gruposTallas, f = re => (gs.find(g => re.test(norm(g.nombre))) || {}).nombre;
  if (/pantal|jean|jogger/.test(c)) return f(/pantal.*hombre/) || f(/pantal/);
  if (/calzad|tenis|zapat/.test(c)) return f(/calzad/);
  if (/gorra|accesor|media|rinon|bolso|cartera/.test(c)) return f(/unica/);
  return f(/letra/) || (gs[0] || {}).nombre;
}
function sizeRank(t) {
  let i = 0; for (const g of cfg().gruposTallas) for (const x of g.tallas) { if (x === t) return i; i++; }
  return 9999;
}
function ordenarVariantes(vs) {
  const col = []; vs.forEach(v => { if (!col.includes(v.color || '')) col.push(v.color || ''); });
  return vs.slice().sort((a, b) => col.indexOf(a.color || '') - col.indexOf(b.color || '') || sizeRank(a.talla) - sizeRank(b.talla) || String(a.talla).localeCompare(String(b.talla), 'es', { numeric: true }));
}
const minOf = v => (v.minimo === '' || v.minimo == null) ? n0(cfg().stockMin) : n0(v.minimo);
const activos = () => DB.productos.filter(p => p.activo !== false);
function matchProd(p, q) {
  const hay = norm([p.nombre, p.ref, p.categoria, provById(p.proveedorId)?.nombre, ...p.variantes.map(v => v.sku)].join(' '));
  return norm(q).split(/\s+/).filter(Boolean).every(w => hay.includes(w));
}
function initials(n) { return String(n || '?').split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase(); }
const thumb = p => p.foto ? `<img class="th" src="${p.foto}">` : `<span class="th">${esc(initials(p.nombre))}</span>`;
function stockBajo() {
  const out = [];
  activos().forEach(p => p.variantes.forEach(v => { if (n0(v.stock) <= minOf(v)) out.push({ p, v }); }));
  return out.sort((a, b) => a.v.stock - b.v.stock);
}
function valorInventario() {
  let costo = 0, precio = 0, unidades = 0;
  activos().forEach(p => { const s = Math.max(0, stockTotal(p)); unidades += s; costo += s * n0(p.costo); precio += s * n0(p.precio); });
  return { costo, precio, unidades };
}
function skuFor(ref, talla, color) {
  const c = norm(color).replace(/[^a-z0-9]/g, '').slice(0, 3).toUpperCase();
  const t = norm(talla).replace(/[^a-z0-9]/g, '').toUpperCase();
  return [ref, t, c].filter(Boolean).join('-');
}

const TIPOS = {
  inicial: 'Stock inicial', compra: 'Entrada compra', venta: 'Venta', anulacion: 'Anulación venta',
  anulcompra: 'Anulación compra', danio: 'Salida: daño', perdida: 'Salida: pérdida/robo', regalo: 'Salida: regalo/promo',
  interno: 'Salida: uso interno', devproveedor: 'Devolución a proveedor', devolucion: 'Devolución de cliente', ajuste: 'Ajuste de conteo', entrada: 'Entrada de stock'
};
function registrarMov(p, v, cant, tipo, o = {}) {
  v.stock = n0(v.stock) + cant;
  DB.movimientos.push({
    id: uid(), fecha: o.fecha || nowISO(), tipo, productoId: p.id, varianteId: v.id,
    prod: p.nombre, ref: p.ref, variante: varName(v), cantidad: cant, saldo: v.stock,
    doc: o.doc || '', nota: o.nota || '', costo: o.costo ?? n0(p.costo)
  });
}

/* ---------- ventas ---------- */
const ventasEn = (d, h) => DB.ventas.filter(v => !v.anulada && dk(v.fecha) >= d && dk(v.fecha) <= h);
const costoVenta = v => sum(v.items, i => i.costo * i.cant);
const factor = v => v.subtotal > 0 ? v.total / v.subtotal : 1;
function topProductos(ventas) {
  const m = {};
  ventas.forEach(v => { const f = factor(v); v.items.forEach(i => {
    const k = i.pid; m[k] = m[k] || { pid: k, nombre: i.nombre, ref: i.ref, cat: i.categoria, unidades: 0, total: 0, ganancia: 0 };
    m[k].unidades += i.cant; m[k].total += i.precio * i.cant * f; m[k].ganancia += i.precio * i.cant * f - i.costo * i.cant;
  }); });
  return Object.values(m).sort((a, b) => b.unidades - a.unidades || b.total - a.total);
}
const cajaAbierta = () => DB.cajas.find(c => !c.cerradaEn);

/* ---------- UI genérica ---------- */
function toast(msg, type = 'ok') {
  const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), type === 'bad' ? 4500 : 2600);
}
function modal({ title, body, size = '' }) {
  const o = document.createElement('div'); o.className = 'ov';
  o.innerHTML = `<div class="modal ${size}"><header><h3>${title}</h3><button class="x" data-close title="Cerrar">×</button></header><div class="mbody">${body}</div></div>`;
  document.body.appendChild(o);
  const k = e => { if (e.key === 'Escape' && o === $$('.ov').pop()) close(); };
  const close = () => { o.remove(); document.removeEventListener('keydown', k); if (typeof NUBE !== 'undefined' && NUBE.refrescar && !$('.ov')) { NUBE.refrescar = false; setTimeout(refrescarVista, 30); } };
  document.addEventListener('keydown', k);
  $$('[data-close]', o).forEach(b => b.onclick = close);
  const f = $('input:not([type=checkbox]):not([type=file]),select,textarea', o); if (f) setTimeout(() => f.focus(), 30);
  return { el: o, close };
}
function ask(msg, { ok = 'Confirmar', danger = false, title = 'Confirmar' } = {}) {
  return new Promise(res => {
    const m = modal({ title, body: `<p class="ask">${msg}</p><div class="mfoot"><button class="btn ghost" data-no>Cancelar</button><button class="btn ${danger ? 'danger' : 'pri'}" data-yes>${ok}</button></div>` });
    const done = v => { m.close(); res(v); };
    $('[data-no]', m.el).onclick = () => done(false);
    $('[data-close]', m.el).onclick = () => done(false);
    $('[data-yes]', m.el).onclick = () => done(true);
    setTimeout(() => $('[data-yes]', m.el).focus(), 40);
  });
}
function leerImagen(file, max = 420, type = 'image/jpeg') {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      const g = c.getContext('2d'); if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
      g.drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL(type, .85));
    }; img.onerror = rej; img.src = r.result; };
    r.onerror = rej; r.readAsDataURL(file);
  });
}
function csv(rows) {
  return '﻿' + rows.map(r => r.map(c => { c = String(c ?? ''); return /[;"\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(';')).join('\r\n');
}
async function exportCSV(name, rows) { const ok = await bridge.saveFile(name, csv(rows)); if (ok) toast('Archivo exportado'); }
function barras(data) {
  const max = Math.max(1, ...data.map(d => d.v));
  return `<div class="bars">${data.map(d => `<div class="bar" title="${esc(d.t)}: ${money(d.v)}"><i style="height:${(d.v / max * 100).toFixed(1)}%"></i><span>${esc(d.lab)}</span></div>`).join('')}</div>`;
}
function hbars(rows, fmt = money) {
  const max = Math.max(1, ...rows.map(r => r.v));
  return rows.length ? rows.map(r => `<div class="hbar"><span class="n" title="${esc(r.n)}">${esc(r.n)}</span><span class="tr"><i style="width:${(r.v / max * 100).toFixed(1)}%"></i></span><span class="v">${fmt(r.v)}</span></div>`).join('') : '<p class="muted small">Sin datos en el período.</p>';
}

/* fotos de producto: clic o arrastrar */
async function ponerFoto(p, file) {
  if (!file || !/^image\//.test(file.type)) { toast('Ese archivo no es una imagen', 'bad'); return false; }
  p.foto = await leerImagen(file, 600); await save(); toast('Foto guardada'); return true;
}
function pedirFoto(p, done) {
  const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
  i.onchange = async () => { if (i.files[0] && await ponerFoto(p, i.files[0])) done && done(); };
  i.click();
}
function soltarFoto(elm, p, done) {
  elm.addEventListener('dragover', e => { e.preventDefault(); elm.classList.add('drop'); });
  elm.addEventListener('dragleave', () => elm.classList.remove('drop'));
  elm.addEventListener('drop', async e => { e.preventDefault(); elm.classList.remove('drop'); const f = e.dataTransfer.files[0]; if (f && await ponerFoto(p, f)) done && done(); });
}
function verFoto(p, done) {
  const m = modal({ title: esc(p.nombre), size: 'mid', body: `<div class="zoom"><img src="${p.foto}"></div><div class="mfoot"><button class="btn sp" id="zQuitar">Quitar foto</button><button class="btn" id="zCam">${ic('camera')} Cambiar foto</button><button class="btn pri" data-close>Cerrar</button></div>` });
  $('#zCam', m.el).onclick = () => pedirFoto(p, () => { m.close(); done && done(); });
  $('#zQuitar', m.el).onclick = async () => { p.foto = ''; await save(); m.close(); done && done(); };
}

/* buscador de productos reutilizable */
function picker(box, onPick, { placeholder = 'Buscar producto por nombre, referencia o código…', todos = false } = {}) {
  box.innerHTML = `<div class="picker"><input class="inp" placeholder="${placeholder}"><div class="pick-res" hidden></div></div>`;
  const inp = $('input', box), res = $('.pick-res', box);
  const draw = () => {
    const q = inp.value.trim(); if (!q) { res.hidden = true; return; }
    const list = (todos ? DB.productos : activos()).filter(p => matchProd(p, q)).slice(0, 10);
    res.innerHTML = list.length ? list.map(p => `<button type="button" data-id="${p.id}">${thumb(p)}<span><b>${esc(p.nombre)}</b><br><span class="muted small">${esc(p.ref)} · ${esc(p.categoria || '')}</span></span><small>stock ${int(stockTotal(p))}</small></button>`).join('') : '<div class="empty small">Sin resultados</div>';
    res.hidden = false;
    $$('button', res).forEach(b => b.onclick = () => { inp.value = ''; res.hidden = true; onPick(prodById(b.dataset.id)); });
  };
  inp.oninput = draw;
  inp.onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); const b = $('button', res); if (b) b.click(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); const b = $('button', res); if (b) b.focus(); }
    if (e.key === 'Escape') res.hidden = true;
  };
  res.onkeydown = e => {
    const bs = $$('button', res), i = bs.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); (bs[i + 1] || bs[i]).focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); i <= 0 ? inp.focus() : bs[i - 1].focus(); }
  };
  document.addEventListener('click', e => { if (!box.contains(e.target)) res.hidden = true; });
  return inp;
}

/* ---------- navegación ---------- */
const V = {};
const NAV = [['inicio', 'Inicio'], ['vender', 'Vender'], ['productos', 'Productos'], ['entradas', 'Entradas'], ['inversion', 'Inversión'], ['movimientos', 'Movimientos'], ['ventas', 'Ventas'], ['caja', 'Caja'], ['proveedores', 'Proveedores'], ['reportes', 'Reportes'], ['config', 'Configuración']];

function go(view) { VIEW = view; render(); }
function render() {
  const c = cfg();
  const acc = c.acento || '#ff5757', rgb = [1, 3, 5].map(i => parseInt(acc.slice(i, i + 2), 16));
  document.documentElement.style.setProperty('--acc', acc);
  document.documentElement.style.setProperty('--acc-ink', (rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114) > 160 ? '#2b2b2b' : '#ffffff');
  $('#brand').innerHTML = c.logo ? `<img src="${c.logo}" alt="${esc(c.negocio)}" title="${esc(c.negocio)}">${c.lema ? `<span class="b-tag">${esc(c.lema)}</span>` : ''}` : `<div><div class="wordmark">${esc(c.negocio).replace(/(\S+)$/, '<i>$1</i>')}</div><small>${esc(c.lema || 'Inventario')}</small></div>`;
  const bajos = stockBajo().length;
  document.body.classList.toggle('vend', !ADM());
  $('#nav').innerHTML = NAV.filter(([k]) => ADM() || ['vender', 'ventas', 'caja'].includes(k)).map(([k, l]) => `<button data-v="${k}" class="${VIEW === k ? 'on' : ''}">${ic(k)}<span>${l}</span>${k === 'productos' && bajos ? `<span class="bd" title="Variantes con stock bajo">${bajos}</span>` : ''}${k === 'vender' ? '<span class="muted small" style="margin-left:auto">F2</span>' : ''}</button>`).join('');
  $$('#nav button').forEach(b => b.onclick = () => { document.body.classList.remove('menu-on'); go(b.dataset.v); });
  $('#menuBtn').onclick = () => document.body.classList.toggle('menu-on');
  if (!ADM() && !['vender', 'ventas', 'caja'].includes(VIEW)) VIEW = 'vender';
  const v = V[VIEW];
  $('#pageTitle').textContent = v.title;
  $('#today').textContent = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const caja = cajaAbierta();
  $('#topR').innerHTML = `<button class="btn sm" id="tCaja">${caja ? '<span class="badge ok">Caja abierta</span>' : '<span class="badge">Caja cerrada</span>'}</button>${VIEW !== 'vender' ? `<button class="btn acc" id="tVender">${ic('vender')} Nueva venta</button>` : ''}`;
  $('#tCaja').onclick = () => go('caja');
  if (NUBE.perfil) {
    $('.side-foot').innerHTML = `<div class="ufoot"><div><b>${esc(NUBE.perfil.nombre || NUBE.perfil.usuario)}</b><small>${ADM() ? 'Administrador' : 'Vendedor'}</small></div>${ADM() ? `<button class="ibtn" id="sUs" title="Usuarios">${ic('users')}</button>` : ''}<button class="ibtn" id="sOut" title="Cerrar sesión">${ic('logout')}</button></div><span id="saveState" class="${NUBE.online ? 'ok' : 'bad'}">${NUBE.online ? 'En la nube' : 'Sin conexión · se subirá al volver'}</span>`;
    $('#sOut').onclick = cerrarSesion; if ($('#sUs')) $('#sUs').onclick = gestionarUsuarios;
  }
  if ($('#tVender')) $('#tVender').onclick = () => go('vender');
  const main = $('#main');
  main.className = v.full ? 'full' : '';
  main.innerHTML = v.html();
  main.scrollTop = 0;
  v.bind && v.bind(main);
}
document.addEventListener('keydown', e => {
  if (e.key === 'F2') { e.preventDefault(); if (!$('.ov')) go('vender'); }
});

/* =========================================================
   INICIO
   ========================================================= */
V.inicio = {
  title: 'Inicio',
  html() {
    if (!DB.productos.length) return `<div class="welcome card"><h2>Bienvenido a <i>${esc(cfg().negocio)}</i></h2>
      <p>Aquí controlas el stock de cada prenda por talla y color, registras ventas, entradas de mercancía, la caja del día y ves qué se vende más.</p>
      <p class="small">Empieza creando tus productos, o carga un ejemplo para ver cómo funciona (luego lo puedes borrar en Configuración).</p>
      <div class="mfoot" style="justify-content:center"><button class="btn" id="wDemo">Cargar ejemplo</button><button class="btn pri" id="wNew">${ic('plus')} Crear primer producto</button></div></div>`;
    const hoy = hoyK(), mes = hoy.slice(0, 8) + '01';
    const ayerD = new Date(); ayerD.setDate(ayerD.getDate() - 1); const ayer = dk(ayerD);
    const vh = ventasEn(hoy, hoy), vm = ventasEn(mes, hoy), va = ventasEn(ayer, ayer);
    const tot = a => sum(a, v => v.total), gan = a => sum(a, v => v.total - costoVenta(v));
    const gastosMes = sum(DB.cajaMovs.filter(m => m.tipo === 'gasto' && dk(m.fecha) >= mes), m => m.monto);
    const inv = valorInventario();
    const bajos = stockBajo();
    const top = topProductos(vm).slice(0, 6);
    const dias = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = dk(d); dias.push({ t: fFecha(d), lab: d.getDate(), v: tot(ventasEn(k, k)) }); }
    const dif = tot(vh) - tot(va);
    return `<div class="grid g4">
      <div class="card kpi acc"><div class="l">Ventas de hoy</div><div class="v">${money(tot(vh))}</div><div class="s">${vh.length} ventas · ${int(sum(vh, v => sum(v.items, i => i.cant)))} prendas · <span class="${dif >= 0 ? 'up' : 'down'}" style="color:inherit">ayer ${money(tot(va))}</span></div></div>
      <div class="card kpi"><div class="l">Ventas del mes</div><div class="v">${money(tot(vm))}</div><div class="s">${vm.length} ventas · ticket prom. ${money(vm.length ? tot(vm) / vm.length : 0)}</div></div>
      <div class="card kpi"><div class="l">Ganancia del mes</div><div class="v">${money(gan(vm) - gastosMes)}</div><div class="s">bruta ${money(gan(vm))} − gastos ${money(gastosMes)}</div></div>
      <div class="card kpi"><div class="l">Inventario</div><div class="v">${int(inv.unidades)} <span style="font-size:18px">prendas</span></div><div class="s">al costo ${money(inv.costo)} · a la venta ${money(inv.precio)}</div></div>
    </div>
    <div class="grid g21 mt">
      <div class="card"><h3>Ventas · últimos 14 días</h3>${barras(dias)}</div>
      <div class="card"><h3>Stock bajo <span class="badge ${bajos.length ? 'bad' : 'ok'} sp">${bajos.length}</span></h3>
        ${bajos.length ? `<ul class="list-plain" style="max-height:200px;overflow:auto">${bajos.slice(0, 30).map(({ p, v }) => `<li><span><b>${esc(p.nombre)}</b> <span class="muted small">${esc(varName(v))}</span></span><span class="badge ${v.stock <= 0 ? 'bad' : 'warn'}">${v.stock <= 0 ? 'Agotado' : v.stock + ' und'}</span></li>`).join('')}</ul>` : '<p class="muted">Todo el inventario está por encima del mínimo.</p>'}
      </div>
    </div>
    <div class="grid g2 mt">
      <div class="card"><h3>Lo más vendido del mes</h3>${hbars(top.map(t => ({ n: t.nombre, v: t.unidades })), v => int(v) + ' und')}</div>
      <div class="card"><h3>Últimas ventas <button class="btn sm sp" id="iVer">Ver todas</button></h3>
        ${DB.ventas.length ? `<table class="t"><tbody>${DB.ventas.slice(-6).reverse().map(v => `<tr class="${v.anulada ? 'dim' : ''}"><td><b>${v.num}</b><br><span class="muted small">${fHora(v.fecha)}</span></td><td class="small">${v.items.map(i => esc(i.nombre)).join(', ').slice(0, 60)}</td><td><span class="badge">${esc(v.pago.metodo)}</span></td><td class="r b">${money(v.total)}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Aún no hay ventas.</p>'}
      </div>
    </div>`;
  },
  bind(m) {
    if ($('#wDemo', m)) $('#wDemo', m).onclick = cargarDemo;
    if ($('#wNew', m)) $('#wNew', m).onclick = () => editarProducto();
    if ($('#iVer', m)) $('#iVer', m).onclick = () => go('ventas');
  }
};

/* =========================================================
   VENDER (punto de venta)
   ========================================================= */
const POS = { cart: [], q: '', cat: '', desc: 0, descTipo: '%', cliente: '', metodo: 'Efectivo', recibido: '' };
function enCarrito(vid) { return sum(POS.cart.filter(i => i.vid === vid), i => i.cant); }
function cartTotals() {
  const sub = sum(POS.cart, i => i.precio * i.cant);
  let desc = POS.descTipo === '%' ? sub * Math.min(100, Math.max(0, n0(POS.desc))) / 100 : Math.min(sub, Math.max(0, n0(POS.desc)));
  desc = Math.round(desc);
  return { sub, desc, total: Math.max(0, sub - desc) };
}
function addToCart(p, v) {
  if (n0(v.stock) - enCarrito(v.id) <= 0) { toast(`Sin stock de ${p.nombre} (${varName(v)})`, 'bad'); return false; }
  const it = POS.cart.find(i => i.vid === v.id);
  if (it) it.cant++; else POS.cart.push({ pid: p.id, vid: v.id, cant: 1, precio: n0(p.precio) });
  drawCart();
  return true;
}
function elegirVariante(p) {
  const conStock = ordenarVariantes(p.variantes);
  if (conStock.length === 1) { addToCart(p, conStock[0]); return; }
  const colores = [...new Set(p.variantes.map(v => v.color || ''))];
  const m = modal({ title: esc(p.nombre), size: p.foto ? 'wide' : 'mid', body: `<div class="${p.foto ? 'vwrap' : ''}">${p.foto ? `<div class="zoom"><img src="${p.foto}"></div>` : ''}<div><p class="muted" style="margin-top:0">${esc(p.ref)} · ${money(p.precio)} — elige talla${colores.length > 1 ? ' y color' : ''}</p>
    <div class="vgrid">${colores.map(c => `<div class="vrow">${c ? `<h4>${esc(c)}</h4>` : ''}<div class="vbtns">${conStock.filter(v => (v.color || '') === c).map(v => {
      const disp = n0(v.stock) - enCarrito(v.id);
      return `<button class="vbtn" data-v="${v.id}" ${disp <= 0 ? 'disabled' : ''}><b>${esc(v.talla || 'Única')}</b><small>${disp <= 0 ? 'agotado' : disp + ' disp.'}</small></button>`;
    }).join('')}</div></div>`).join('')}</div></div></div>` });
  $$('.vbtn', m.el).forEach(b => b.onclick = () => { if (addToCart(p, varById(p, b.dataset.v))) m.close(); });
}
function drawPosGrid() {
  const g = $('#posGrid'); if (!g) return;
  let list = activos().filter(p => (!POS.cat || p.categoria === POS.cat) && (!POS.q || matchProd(p, POS.q)));
  list.sort((a, b) => (stockTotal(b) > 0) - (stockTotal(a) > 0) || a.nombre.localeCompare(b.nombre));
  g.innerHTML = list.length ? list.map(p => { const s = stockTotal(p); return `<button class="pcard ${s <= 0 ? 'out' : ''}" data-id="${p.id}">
    <div class="img">${p.foto ? `<img src="${p.foto}">` : `<span>${esc(initials(p.nombre))}</span>`}<span class="cam ${p.foto ? '' : 'show'}" data-cam="${p.id}" title="${p.foto ? 'Cambiar foto' : 'Agregar foto'} (o arrastra una imagen aquí)">${ic('camera')}${p.foto ? '' : ' Foto'}</span></div>
    <b>${esc(p.nombre)}</b><span class="muted small">${esc(p.ref)}</span>
    <div class="pr"><span>${money(p.precio)}</span><span class="badge ${s <= 0 ? 'bad' : ''}">${s <= 0 ? 'Agotado' : s + ' und'}</span></div></button>`; }).join('')
    : `<div class="empty" style="grid-column:1/-1">${DB.productos.length ? 'No hay productos que coincidan.' : 'Aún no hay productos. Créalos en <b>Productos</b>.'}</div>`;
  $$('.pcard', g).forEach(b => { const p = prodById(b.dataset.id); b.onclick = e => { if (e.target.closest('[data-cam]')) { pedirFoto(p, drawPosGrid); return; } elegirVariante(p); }; soltarFoto(b, p, drawPosGrid); });
}
function drawCart() {
  const box = $('#posCart'); if (!box) return;
  const t = cartTotals();
  const fab = $('#cartFab'), nU = sum(POS.cart, i => i.cant);
  if (fab) { fab.hidden = !nU; fab.innerHTML = `${ic('vender')} Carrito (${nU}) · <b>${money(t.total)}</b>`; fab.onclick = () => box.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  const ef = POS.metodo === 'Efectivo';
  const cambio = n0(POS.recibido) - t.total;
  box.innerHTML = `<header><h3>Venta actual</h3>${POS.cart.length ? '<button class="btn sm ghost" id="cVaciar">Vaciar</button>' : ''}</header>
  <div class="citems">${POS.cart.length ? POS.cart.map((i, k) => { const p = prodById(i.pid), v = varById(p, i.vid); return `<div class="citem">
      <div><div class="nm">${esc(p.nombre)}</div><div class="vr">${esc(varName(v))} · ${esc(p.ref)}</div></div>
      <div class="lt">${money(i.precio * i.cant)}</div>
      <div class="qty"><button data-k="${k}" data-d="-1">−</button><span>${i.cant}</span><button data-k="${k}" data-d="1">+</button><button class="ibtn" data-del="${k}" title="Quitar">${ic('trash')}</button></div>
      <div style="text-align:right"><input class="inp pin" type="number" min="0" step="1000" value="${i.precio}" data-pk="${k}" title="Precio unitario"></div>
    </div>`; }).join('') : '<div class="empty small">Toca un producto o escanea un código para agregarlo.</div>'}</div>
  <div class="ctot">
    <div class="row small"><span>Subtotal</span><b>${money(t.sub)}</b></div>
    <div class="row small"><span>Descuento</span><span style="display:flex;gap:5px;align-items:center"><input class="inp" id="cDesc" type="number" min="0" value="${POS.desc || ''}" placeholder="0" style="width:90px;padding:4px 8px"><span class="seg"><button data-dt="%" class="${POS.descTipo === '%' ? 'on' : ''}">%</button><button data-dt="$" class="${POS.descTipo === '$' ? 'on' : ''}">$</button></span>${t.desc ? `<b>−${money(t.desc)}</b>` : ''}</span></div>
    <div class="row"><span class="b">TOTAL</span><span class="total">${money(t.total)}</span></div>
    <div class="seg" id="cMet">${cfg().metodos.map(mt => `<button data-m="${esc(mt)}" class="${POS.metodo === mt ? 'on' : ''}">${esc(mt)}</button>`).join('')}</div>
    ${ef ? `<div class="row"><input class="inp" id="cRec" type="number" min="0" step="1000" placeholder="Efectivo recibido" value="${POS.recibido}"><span class="cambio" id="cCambio">${POS.recibido ? (cambio >= 0 ? 'Cambio ' + money(cambio) : 'Faltan ' + money(-cambio)) : ''}</span></div>` : ''}
    <input class="inp" id="cCli" placeholder="Cliente (opcional): nombre o teléfono" value="${esc(POS.cliente)}">
    <div class="row"><label class="chk small"><input type="checkbox" id="cPrint" ${cfg().imprimirAuto ? 'checked' : ''}> Imprimir ticket</label></div>
    <button class="btn acc big" id="cCobrar" ${POS.cart.length ? '' : 'disabled'}>Cobrar ${money(t.total)}</button>
  </div>`;
  $$('.qty button[data-d]', box).forEach(b => b.onclick = () => {
    const i = POS.cart[b.dataset.k], d = +b.dataset.d, v = varById(prodById(i.pid), i.vid);
    if (d > 0 && i.cant + 1 > n0(v.stock)) { toast('No hay más stock de esa talla', 'bad'); return; }
    i.cant += d; if (i.cant <= 0) POS.cart.splice(b.dataset.k, 1); drawCart();
  });
  $$('[data-del]', box).forEach(b => b.onclick = () => { POS.cart.splice(b.dataset.del, 1); drawCart(); });
  $$('[data-pk]', box).forEach(inp => inp.onchange = () => { POS.cart[inp.dataset.pk].precio = Math.max(0, n0(inp.value)); drawCart(); });
  $$('[data-dt]', box).forEach(b => b.onclick = () => { POS.descTipo = b.dataset.dt; drawCart(); });
  $$('#cMet button', box).forEach(b => b.onclick = () => { POS.metodo = b.dataset.m; drawCart(); });
  $('#cDesc', box).onchange = e => { POS.desc = e.target.value; drawCart(); };
  $('#cCli', box).oninput = e => { POS.cliente = e.target.value; };
  $('#cPrint', box).onchange = e => { cfg().imprimirAuto = e.target.checked; save(); };
  if ($('#cRec', box)) $('#cRec', box).oninput = e => {
    POS.recibido = e.target.value; const c = n0(POS.recibido) - cartTotals().total;
    $('#cCambio').textContent = POS.recibido ? (c >= 0 ? 'Cambio ' + money(c) : 'Faltan ' + money(-c)) : '';
  };
  if ($('#cVaciar', box)) $('#cVaciar', box).onclick = () => { POS.cart = []; POS.desc = 0; POS.recibido = ''; POS.cliente = ''; drawCart(); };
  $('#cCobrar', box).onclick = cobrar;
}
async function cobrar() {
  if (!POS.cart.length) return;
  for (const i of POS.cart) {
    const p = prodById(i.pid), v = varById(p, i.vid);
    if (!v || i.cant > n0(v.stock)) { toast(`Stock insuficiente: ${p ? p.nombre : '?'} (${v ? varName(v) : '?'})`, 'bad'); return; }
  }
  const t = cartTotals();
  if (POS.metodo === 'Efectivo' && POS.recibido && n0(POS.recibido) < t.total) { toast('El efectivo recibido no alcanza', 'bad'); return; }
  const venta = {
    id: uid(), num: nextNum('venta', 'V', 5), fecha: nowISO(), cliente: POS.cliente.trim(),
    items: POS.cart.map(i => { const p = prodById(i.pid), v = varById(p, i.vid); return { pid: p.id, vid: v.id, nombre: p.nombre, ref: p.ref, categoria: p.categoria, talla: v.talla, variante: varName(v), cant: i.cant, precio: i.precio, costo: costoTot(p) }; }),
    subtotal: t.sub, descuento: t.desc, total: t.total,
    pago: { metodo: POS.metodo, recibido: POS.metodo === 'Efectivo' && POS.recibido ? n0(POS.recibido) : t.total, cambio: POS.metodo === 'Efectivo' && POS.recibido ? n0(POS.recibido) - t.total : 0 },
    cajaId: cajaAbierta()?.id || null, anulada: false
  };
  venta.items.forEach(i => { const p = prodById(i.pid); registrarMov(p, varById(p, i.vid), -i.cant, 'venta', { doc: venta.num, fecha: venta.fecha }); });
  DB.ventas.push(venta);
  await save();
  const imprimirT = $('#cPrint')?.checked;
  Object.assign(POS, { cart: [], desc: 0, recibido: '', cliente: '' });
  drawCart(); drawPosGrid();
  if (imprimirT) imprimir(ticketHTML(venta), 'Ticket-' + venta.num);
  const m = modal({ title: 'Venta registrada', body: `<p class="muted c" style="text-align:center;margin:0">${venta.num} · ${esc(venta.pago.metodo)}</p>
    <div class="big-num">${money(venta.total)}</div>
    ${venta.pago.cambio > 0 ? `<p style="text-align:center;font-size:20px;margin:6px 0">Cambio: <b>${money(venta.pago.cambio)}</b></p>` : ''}
    ${!venta.cajaId ? '<p class="note">La caja está cerrada: esta venta no entra en ningún cierre de caja. Ábrela en <b>Caja</b> al empezar el día.</p>' : ''}
    <div class="mfoot"><button class="btn" id="mPrint">${ic('print')} Imprimir ticket</button><button class="btn pri" data-close id="mOk">Nueva venta</button></div>` });
  $('#mPrint', m.el).onclick = () => imprimir(ticketHTML(venta), 'Ticket-' + venta.num);
  setTimeout(() => $('#mOk', m.el).focus(), 40);
  m.el.addEventListener('click', e => { if (e.target.id === 'mOk' || e.target.dataset.close !== undefined) setTimeout(() => $('#posQ')?.focus(), 30); });
  const bd = $('#nav .bd'); const nb = stockBajo().length; if (bd) bd.textContent = nb;
}
V.vender = {
  title: 'Vender', full: true,
  html() {
    return `<div class="pos"><section class="pos-left">
      <div class="toolbar"><input class="inp grow" id="posQ" placeholder="Buscar por nombre o referencia · escanea el código y Enter" value="${esc(POS.q)}">
      <select class="inp" id="posCat"><option value="">Todas las categorías</option>${cfg().categorias.map(c => `<option ${POS.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="pgrid" id="posGrid"></div></section><aside class="pos-cart" id="posCart"></aside></div><button class="cart-fab" id="cartFab" hidden></button>`;
  },
  bind() {
    drawPosGrid(); drawCart();
    const q = $('#posQ'); q.focus();
    q.oninput = () => { POS.q = q.value; drawPosGrid(); };
    q.onkeydown = e => {
      if (e.key !== 'Enter') return;
      const code = norm(q.value.trim()); if (!code) return;
      for (const p of activos()) { const v = p.variantes.find(v => norm(v.sku) === code); if (v) { addToCart(p, v); q.value = ''; POS.q = ''; drawPosGrid(); return; } }
      const list = activos().filter(p => matchProd(p, q.value));
      if (list.length === 1) elegirVariante(list[0]);
    };
    $('#posCat').onchange = e => { POS.cat = e.target.value; drawPosGrid(); };
  }
};
function ticketHTML(v) {
  const c = cfg();
  return `<!doctype html><html><head><meta charset="utf-8"><title>${v.num}</title><style>
  @page{size:80mm auto;margin:3mm} body{font-family:Consolas,'Courier New',monospace;font-size:11.5px;width:72mm;margin:0 auto;color:#000}
  .c{text-align:center} h1{font-family:Roboto,Arial,sans-serif;font-size:22px;margin:4px 0;letter-spacing:2px} table{width:100%;border-collapse:collapse}
  td{padding:1px 0;vertical-align:top} .r{text-align:right;white-space:nowrap} hr{border:0;border-top:1px dashed #000;margin:6px 0} .t td{font-size:15px;font-weight:bold;padding-top:3px}
  img{max-width:50mm;max-height:20mm}</style></head><body>
  <div class="c">${c.logo ? `<img src="${c.logo === window.DEFAULT_LOGO && window.DEFAULT_LOGO_TICKET ? window.DEFAULT_LOGO_TICKET : c.logo}"><br>${c.lema ? esc(c.lema.toUpperCase()) + '<br>' : ''}` : `<h1>${esc(c.negocio)}</h1>`}${c.nit ? `NIT ${esc(c.nit)}<br>` : ''}${c.direccion ? esc(c.direccion) + '<br>' : ''}${c.telefono ? 'Tel. ' + esc(c.telefono) + '<br>' : ''}${c.instagram ? esc(c.instagram) : ''}</div><hr>
  Venta: <b>${v.num}</b><br>Fecha: ${fHora(v.fecha)}<br>${v.cliente ? 'Cliente: ' + esc(v.cliente) + '<br>' : ''}<hr>
  <table>${v.items.map(i => `<tr><td colspan="2">${esc(i.nombre)}<br>&nbsp;&nbsp;${esc(i.variante)}</td></tr><tr><td>&nbsp;&nbsp;${i.cant} x ${money(i.precio)}</td><td class="r">${money(i.cant * i.precio)}</td></tr>`).join('')}</table><hr>
  <table><tr><td>Subtotal</td><td class="r">${money(v.subtotal)}</td></tr>${v.descuento ? `<tr><td>Descuento</td><td class="r">-${money(v.descuento)}</td></tr>` : ''}
  <tr class="t"><td>TOTAL</td><td class="r">${money(v.total)}</td></tr><tr><td>${esc(v.pago.metodo)}</td><td class="r">${money(v.pago.recibido)}</td></tr>${v.pago.cambio ? `<tr><td>Cambio</td><td class="r">${money(v.pago.cambio)}</td></tr>` : ''}</table><hr>
  <div class="c">${esc(c.pieTicket).replace(/\n/g, '<br>')}</div>${v.anulada ? '<h1 class="c">ANULADA</h1>' : ''}</body></html>`;
}

/* =========================================================
   PRODUCTOS
   ========================================================= */
const PF = { q: '', cat: '', filtro: '' };
V.productos = {
  title: 'Productos',
  html() {
    return `<div class="toolbar"><input class="inp grow" id="pQ" placeholder="Buscar por nombre, referencia, proveedor o código…" value="${esc(PF.q)}">
      <select class="inp" id="pCat"><option value="">Todas las categorías</option>${cfg().categorias.map(c => `<option ${PF.cat === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <select class="inp" id="pFil"><option value="">Activos</option><option value="bajo" ${PF.filtro === 'bajo' ? 'selected' : ''}>Con stock bajo</option><option value="agot" ${PF.filtro === 'agot' ? 'selected' : ''}>Con tallas agotadas</option><option value="arch" ${PF.filtro === 'arch' ? 'selected' : ''}>Archivados</option></select>
      <span class="sp"></span><button class="btn" id="pExp">${ic('down')} Exportar</button><button class="btn pri" id="pNew">${ic('plus')} Nuevo producto</button></div>
      <div class="card" style="padding:6px 8px"><div class="tw" id="pTabla"></div></div>`;
  },
  bind(m) {
    const draw = () => {
      let list = DB.productos.filter(p => PF.filtro === 'arch' ? p.activo === false : p.activo !== false);
      if (PF.cat) list = list.filter(p => p.categoria === PF.cat);
      if (PF.q) list = list.filter(p => matchProd(p, PF.q));
      if (PF.filtro === 'bajo') list = list.filter(p => p.variantes.some(v => n0(v.stock) <= minOf(v)));
      if (PF.filtro === 'agot') list = list.filter(p => p.variantes.some(v => n0(v.stock) <= 0));
      list.sort((a, b) => a.nombre.localeCompare(b.nombre));
      const tu = sum(list, stockTotal), tc = sum(list, p => Math.max(0, stockTotal(p)) * p.costo), tp = sum(list, p => Math.max(0, stockTotal(p)) * p.precio);
      $('#pTabla').innerHTML = list.length ? `<table class="t"><thead><tr><th>Producto</th><th>Categoría</th><th>Proveedor</th><th class="r">Costo</th><th class="r">Precio</th><th class="r">Margen</th><th>Stock por talla</th><th class="r">Total</th><th></th></tr></thead><tbody>
        ${list.map(p => { const mg = p.precio ? (p.precio - costoTot(p)) / p.precio : 0; const s = stockTotal(p); return `<tr class="click" data-id="${p.id}">
          <td><div class="pcell"><span class="thw" data-ph="${p.id}" title="${p.foto ? 'Ver foto' : 'Agregar foto (clic o arrastra una imagen)'}">${thumb(p)}${p.foto ? '' : `<i>${ic('camera')}</i>`}</span><div><b>${esc(p.nombre)}</b><small>${esc(p.ref)}</small></div></div></td>
          <td>${esc(p.categoria || '—')}</td><td class="small">${esc(provById(p.proveedorId)?.nombre || '—')}</td>
          <td class="r num">${money(p.costo)}${extrasTot(p) ? `<br><small class="muted" title="${esc((p.extras || []).map(e => e.nombre + ' ' + money(e.valor)).join(' · '))}">+ ${money(extrasTot(p))} adic.</small>` : ''}</td><td class="r num b">${money(p.precio)}</td>
          <td class="r"><span class="badge ${mg < .3 ? 'warn' : 'ok'}">${pct(mg)}</span></td>
          <td><div class="chips">${ordenarVariantes(p.variantes).map(v => `<span class="vchip ${n0(v.stock) <= minOf(v) ? 'low' : ''}" title="${esc(varName(v))} · mín. ${minOf(v)}">${esc(v.talla || 'Ú')}${v.color && new Set(p.variantes.map(x => x.color)).size > 1 ? ' ' + esc(v.color.slice(0, 3)) : ''}: ${v.stock}</span>`).join('')}</div></td>
          <td class="r b num">${int(s)}</td>
          <td class="r" style="white-space:nowrap"><button class="ibtn" data-ed="${p.id}" title="Editar">${ic('edit')}</button><button class="ibtn" data-del="${p.id}" title="${p.activo === false ? 'Restaurar' : 'Eliminar / archivar'}">${ic(p.activo === false ? 'plus' : 'trash')}</button></td></tr>`; }).join('')}</tbody>
        <tfoot><tr><td colspan="3">${list.length} productos</td><td colspan="4" class="r">Valor del stock: ${money(tc)} al costo · ${money(tp)} a la venta</td><td class="r">${int(tu)}</td><td></td></tr></tfoot></table>`
        : `<div class="empty"><h3>Sin productos</h3><p>${DB.productos.length ? 'Ningún producto coincide con el filtro.' : 'Crea tu primer producto con el botón “Nuevo producto”.'}</p></div>`;
      $$('#pTabla tr.click').forEach(tr => tr.onclick = e => { if (e.target.closest('[data-del]')) return; const p = prodById(tr.dataset.id); if (e.target.closest('[data-ph]')) { p.foto ? verFoto(p, draw) : pedirFoto(p, draw); return; } verStock(p, draw); });
      $$('#pTabla [data-ph]').forEach(t => soltarFoto(t, prodById(t.dataset.ph), draw));
      $$('#pTabla [data-del]').forEach(b => b.onclick = () => eliminarProducto(prodById(b.dataset.del)));
    };
    $('#pQ', m).oninput = e => { PF.q = e.target.value; draw(); };
    $('#pCat', m).onchange = e => { PF.cat = e.target.value; draw(); };
    $('#pFil', m).onchange = e => { PF.filtro = e.target.value; draw(); };
    $('#pNew', m).onclick = () => editarProducto();
    $('#pExp', m).onclick = () => exportCSV(`inventario-${hoyK()}.csv`, [['Referencia', 'Producto', 'Categoría', 'Proveedor', 'Talla', 'Color', 'SKU', 'Stock', 'Mínimo', 'Costo', 'Precio', 'Valor costo', 'Valor venta'],
      ...DB.productos.filter(p => p.activo !== false).flatMap(p => p.variantes.map(v => [p.ref, p.nombre, p.categoria, provById(p.proveedorId)?.nombre || '', v.talla, v.color, v.sku, v.stock, minOf(v), p.costo, p.precio, v.stock * p.costo, v.stock * p.precio]))]);
    draw();
    $('#pQ', m).focus();
  }
};
async function eliminarProducto(p) {
  if (p.activo === false) { p.activo = true; await save(); toast('Producto restaurado'); render(); return; }
  const usado = DB.movimientos.some(x => x.productoId === p.id && x.tipo !== 'inicial') || DB.ventas.some(v => v.items.some(i => i.pid === p.id));
  if (usado) {
    if (!await ask(`<b>${esc(p.nombre)}</b> tiene ventas o movimientos, así que no se borra: se <b>archiva</b> (deja de salir en ventas y en el inventario, pero conserva el historial). Puedes restaurarlo desde el filtro “Archivados”.`, { ok: 'Archivar' })) return;
    p.activo = false; toast('Producto archivado');
  } else {
    if (!await ask(`¿Eliminar <b>${esc(p.nombre)}</b> definitivamente?`, { ok: 'Eliminar', danger: true })) return;
    DB.productos = DB.productos.filter(x => x !== p); DB.movimientos = DB.movimientos.filter(x => x.productoId !== p.id); toast('Producto eliminado');
  }
  await save(); render();
}
function verStock(p, onDone) {
  const vs = ordenarVariantes(p.variantes);
  const tallas = [...new Set(vs.map(v => v.talla || 'ÚNICA'))], colores = [...new Set(vs.map(v => v.color || ''))];
  const cell = (t, c) => { const v = vs.find(v => (v.talla || 'ÚNICA') === t && (v.color || '') === c); if (!v) return '<td class="r muted">—</td>';
    const st = n0(v.stock); return `<td class="r"><span class="vchip ${st <= minOf(v) ? 'low' : ''}" style="font-size:14px;padding:3px 10px">${st}</span><input class="inp add" type="number" min="0" data-v="${v.id}" placeholder="+0" style="display:none;width:62px;margin-left:6px;text-align:center;padding:3px"></td>`; };
  const fila = c => `<tr><td class="b">${esc(c || 'Sin color')}</td>${tallas.map(t => cell(t, c)).join('')}<td class="r b">${int(sum(vs.filter(v => (v.color || '') === c), v => v.stock))}</td></tr>`;
  const m = modal({ title: esc(p.nombre), size: 'wide', body: `<div class="${p.foto ? 'vwrap' : ''}">${p.foto ? `<div class="zoom"><img src="${p.foto}"></div>` : ''}<div>
    <p class="muted" style="margin-top:0">${esc(p.ref)} · ${money(p.precio)} · ${esc(p.categoria || '')} — stock por talla${colores.length > 1 ? ' y color' : ''}</p>
    <div style="overflow-x:auto"><table class="t"><thead><tr><th>${colores.length > 1 ? 'Color' : ''}</th>${tallas.map(t => `<th class="r">${esc(t)}</th>`).join('')}<th class="r">Total</th></tr></thead>
    <tbody>${colores.map(fila).join('')}</tbody><tfoot><tr><td>Total</td>${tallas.map(t => `<td class="r">${int(sum(vs.filter(v => (v.talla || 'ÚNICA') === t), v => v.stock))}</td>`).join('')}<td class="r b">${int(stockTotal(p))}</td></tr></tfoot></table></div>
    <p class="muted small">En rojo: tallas en el stock mínimo o agotadas.</p></div></div>
    <div class="mfoot"><button class="btn ghost" data-close>Cerrar</button><button class="btn" data-ent>${ic('plus')} Agregar stock</button><button class="btn pri" data-sv hidden>Guardar stock</button><button class="btn pri" data-edit>${ic('edit')} Editar producto</button></div>` });
  $('[data-edit]', m.el).onclick = () => { m.close(); editarProducto(p, onDone); };
  $('[data-sv]', m.el).style.display = 'none';
  $('[data-ent]', m.el).onclick = () => { $$('input.add', m.el).forEach(i => { i.hidden = false; i.style.display = ''; }); $('[data-ent]', m.el).style.display = $('[data-edit]', m.el).style.display = 'none'; $('[data-sv]', m.el).style.display = '';
    const z = $('.zoom', m.el); if (z) { z.style.display = 'none'; $('.vwrap', m.el).style.display = 'block'; } $('input.add', m.el)?.focus(); };
  $('[data-sv]', m.el).onclick = async () => {
    const ls = $$('input.add', m.el).map(i => [varById(p, i.dataset.v), Math.round(n0(i.value))]).filter(([, q]) => q > 0);
    if (!ls.length) { toast('Escribe cuántas unidades llegan en al menos una talla', 'bad'); return; }
    ls.forEach(([v, q]) => registrarMov(p, v, q, 'entrada', { nota: 'Sumado desde la ficha' }));
    await save(); m.close(); toast(`+${sum(ls, l => l[1])} unidades agregadas`); verStock(p, onDone); if (onDone) onDone();
  };
}
function editarProducto(p, onSaved) {
  const nuevo = !p;
  const c = cfg();
  const refSug = `${c.prefijo || 'UJ'}-${String(c.seq.prod).padStart(3, '0')}`;
  const d = p ? { ...p } : { ref: refSug, nombre: '', categoria: c.categorias[0] || '', proveedorId: '', costo: '', precio: '', foto: '', notas: '' };
  let rows = p ? p.variantes.map(v => ({ ...v, _ex: true })) : [];
  // costos adicionales: el campo precio es el precio SIN ellos; al guardar, precio = base + costos marcados
  const exSel = new Set((p && p.extras || []).map(e => e.id));
  const exLista = [...(c.costosExtra || []), ...(p && p.extras || []).filter(e => !(c.costosExtra || []).some(x => x.id === e.id))];
  if (p) d.precio = p.precioBase ?? n0(p.precio) - extrasTot(p);
  const selT = new Set(rows.map(r => r.talla).filter(Boolean)), selC = new Set(rows.map(r => r.color).filter(Boolean));
  const colores = [...new Set([...c.colores, ...selC])];
  const m = modal({ title: nuevo ? 'Nuevo producto' : 'Editar producto', size: 'wide', body: `
    <div class="ptop" style="display:grid;grid-template-columns:170px 1fr;gap:18px">
      <div><div class="photo" id="eFoto">${d.foto ? `<img src="${d.foto}">` : 'Clic o arrastra<br>una foto aquí'}</div><input type="file" id="eFile" accept="image/*" hidden>
        ${d.foto ? '<button class="btn sm ghost" id="eQuitaFoto" style="width:100%;margin-top:6px">Quitar foto</button>' : ''}</div>
      <div class="fgrid">
        <label class="f">Nombre del producto<input class="inp" id="eNom" value="${esc(d.nombre)}" placeholder="Ej: Hoodie Oversize Essential"></label>
        <label class="f">Referencia<input class="inp" id="eRef" value="${esc(d.ref)}"></label>
        <label class="f">Categoría<select class="inp" id="eCat">${[...new Set([...c.categorias, d.categoria].filter(Boolean))].map(x => `<option ${x === d.categoria ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select></label>
        <label class="f">Proveedor<select class="inp" id="eProv"><option value="">— Sin proveedor —</option>${DB.proveedores.map(x => `<option value="${x.id}" ${x.id === d.proveedorId ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select></label>
        <label class="f"><span>Costo por unidad <span class="h">lo que te cuesta a ti</span></span><input class="inp" id="eCosto" type="number" min="0" step="100" value="${d.costo}"></label>
        <label class="f"><span>Precio de venta <span class="h" id="eMg"></span></span><input class="inp" id="ePrecio" type="number" min="0" step="1000" value="${d.precio}"></label>
        <div class="f s2"><span>Costos adicionales <span class="h">marca los que lleva este producto: su valor se suma al precio de venta</span></span>
          ${exLista.length ? `<div class="tog" id="eEx">${exLista.map(e => `<button type="button" data-x="${esc(e.id)}" class="${exSel.has(e.id) ? 'on' : ''}">${esc(e.nombre)} · ${money(e.valor)}</button>`).join('')}</div>` : '<span class="muted small">No hay costos adicionales. Créalos en <b>Configuración</b>.</span>'}
          <div class="small" id="eFinal" style="margin-top:6px"></div></div>
        <label class="f s2"><span>Notas <span class="h">tela, estampado, temporada… (opcional)</span></span><input class="inp" id="eNotas" value="${esc(d.notas || '')}"></label>
      </div>
    </div>
    <h3 style="font-size:18px;margin:20px 0 8px;text-transform:uppercase">Tallas y colores</h3>
    <div class="fgrid" style="grid-template-columns:3fr 2fr;align-items:start">
      <div><div class="small b" style="margin-bottom:6px">Tallas (Colombia)</div><div id="eT"></div></div>
      <div><div class="small b" style="margin-bottom:6px">Colores</div><div class="tog" id="eC">${colores.map(x => `<button data-c="${esc(x)}" class="${selC.has(x) ? 'on' : ''}">${esc(x)}</button>`).join('')}<input class="inp" id="eNuevoC" placeholder="+ otro color" style="width:120px;padding:3px 9px"></div></div>
    </div>
    <div style="display:flex;gap:8px;margin:12px 0"><button class="btn sm pri" id="eGen">Generar combinaciones</button><button class="btn sm" id="eAdd">${ic('plus')} Fila manual</button><span class="muted small" style="align-self:center">Marca tallas y colores y pulsa “Generar”. Sin tallas = talla única.</span></div>
    <div id="eRows"></div>
    <div class="mfoot"><span class="sp muted small">${nuevo ? 'El stock inicial queda registrado como movimiento.' : 'Para cambiar el stock usa <b>Entradas</b> o un <b>ajuste</b> en Movimientos.'}</span><button class="btn ghost" data-close>Cancelar</button><button class="btn pri" id="eSave">Guardar producto</button></div>` });
  const el = m.el;
  const extrasSel = () => exLista.filter(e => $(`#eEx [data-x="${CSS.escape(e.id)}"].on`, el)).map(e => ({ id: e.id, nombre: e.nombre, valor: n0(e.valor) }));
  const updMg = () => {
    const co = n0($('#eCosto', el).value), pr = n0($('#ePrecio', el).value), ex = sum(extrasSel(), e => e.valor), fin = pr + ex;
    $('#eMg', el).textContent = pr ? `margen ${pct((fin - co - ex) / fin)} · ganas ${money(pr - co)}` : '';
    $('#eFinal', el).innerHTML = ex ? `Precio final al cliente: ${money(pr)} + ${money(ex)} de costos adicionales = <b style="font-size:15px">${money(fin)}</b>` : '';
  };
  $('#eCosto', el).oninput = $('#ePrecio', el).oninput = updMg;
  $$('#eEx button', el).forEach(b => b.onclick = () => { b.classList.toggle('on'); updMg(); });
  updMg();
  $('#eFoto', el).onclick = () => $('#eFile', el).click();
  $('#eFile', el).onchange = async e => { const f = e.target.files[0]; if (!f) return; d.foto = await leerImagen(f, 600); $('#eFoto', el).innerHTML = `<img src="${d.foto}">`; };
  $('#eFoto', el).addEventListener('dragover', e => e.preventDefault());
  $('#eFoto', el).addEventListener('drop', async e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (!f || !/^image\//.test(f.type)) return; d.foto = await leerImagen(f, 600); $('#eFoto', el).innerHTML = `<img src="${d.foto}">`; });
  if ($('#eQuitaFoto', el)) $('#eQuitaFoto', el).onclick = () => { d.foto = ''; $('#eFoto', el).innerHTML = 'Clic para agregar foto'; };
  const drawTallas = () => {
    const pref = grupoSugerido($('#eCat', el).value);
    const gs = [...c.gruposTallas].sort((a, b) => (b.nombre === pref) - (a.nombre === pref));
    let on;
    if ($('#eT button', el)) on = new Set($$('#eT button.on', el).map(b => b.dataset.k));
    else { on = new Set(); selT.forEach(t => { const g = gs.find(g => g.tallas.includes(t)); if (g) on.add(g.nombre + '|' + t); }); }
    $('#eT', el).innerHTML = gs.map(g => `<div class="tgrp"><span class="tg-n">${esc(g.nombre)}${g.nombre === pref ? ' <span class="badge ok">sugerido</span>' : ''}</span><div class="tog">${g.tallas.map(t => `<button data-t="${esc(t)}" data-k="${esc(g.nombre + '|' + t)}" class="${on.has(g.nombre + '|' + t) ? 'on' : ''}">${esc(t)}</button>`).join('')}</div></div>`).join('');
    $$('#eT button', el).forEach(b => b.onclick = () => b.classList.toggle('on'));
  };
  drawTallas();
  $('#eCat', el).onchange = drawTallas;
  const bindTog = () => {
    $$('#eC button', el).forEach(b => b.onclick = () => { b.classList.toggle('on'); });
  };
  bindTog();
  $('#eNuevoC', el).onkeydown = e => {
    if (e.key !== 'Enter') return; e.preventDefault();
    const v = e.target.value.trim(); if (!v) return;
    const b = document.createElement('button'); b.dataset.c = v; b.textContent = v; b.className = 'on';
    $('#eC', el).insertBefore(b, e.target); e.target.value = ''; bindTog();
    if (!c.colores.includes(v)) c.colores.push(v);
  };
  const drawRows = () => {
    $('#eRows', el).innerHTML = rows.length ? `<div class="tw" style="max-height:300px"><table class="t"><thead><tr><th>Talla</th><th>Color</th><th>Código / SKU <span class="muted" style="text-transform:none">(auto si vacío)</span></th><th class="r">Stock mín.</th><th class="r">${nuevo ? 'Stock inicial' : 'Stock + sumar'}</th><th></th></tr></thead><tbody>
      ${rows.map((r, i) => `<tr><td><input class="inp" data-i="${i}" data-f="talla" value="${esc(r.talla)}" style="width:90px"></td><td><input class="inp" data-i="${i}" data-f="color" value="${esc(r.color)}" style="width:120px"></td>
      <td><input class="inp" data-i="${i}" data-f="sku" value="${esc(r.sku)}" placeholder="auto"></td><td class="r"><input class="inp" type="number" min="0" data-i="${i}" data-f="minimo" value="${r.minimo ?? ''}" placeholder="${c.stockMin}" style="width:80px"></td>
      <td class="r">${r._ex ? `<b>${r.stock}</b> + <input class="inp" type="number" min="0" data-i="${i}" data-f="suma" value="${r.suma || ''}" placeholder="0" title="Unidades que llegan de esta talla" style="width:70px">` : `<input class="inp" type="number" min="0" data-i="${i}" data-f="stock" value="${r.stock || ''}" placeholder="0" style="width:80px">`}</td>
      <td><button class="ibtn" data-rm="${i}">${ic('trash')}</button></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="note">Aún no hay variantes. Marca tallas/colores y pulsa “Generar combinaciones”, o guarda sin variantes para un producto de talla única.</div>';
    $$('#eRows input', el).forEach(inp => inp.oninput = () => { rows[inp.dataset.i][inp.dataset.f] = inp.value; });
    $$('#eRows [data-rm]', el).forEach(b => b.onclick = async () => {
      const r = rows[b.dataset.rm];
      if (r._ex && n0(r.stock) !== 0 && !await ask(`La variante <b>${esc(varName(r))}</b> tiene ${r.stock} unidades. Si la quitas, ese stock desaparece del inventario. ¿Continuar?`, { ok: 'Quitar', danger: true })) return;
      rows.splice(b.dataset.rm, 1); drawRows();
    });
  };
  drawRows();
  $('#eGen', el).onclick = () => {
    const ts = [...new Set($$('#eT button.on', el).map(b => b.dataset.t))].sort((a, b) => sizeRank(a) - sizeRank(b)), cs = $$('#eC button.on', el).map(b => b.dataset.c);
    const T = ts.length ? ts : ['ÚNICA'], C = cs.length ? cs : [''];
    let n = 0;
    C.forEach(col => T.forEach(t => { if (!rows.some(r => r.talla === t && (r.color || '') === col)) { rows.push({ talla: t, color: col, sku: '', minimo: '', stock: '' }); n++; } }));
    drawRows(); toast(n ? `${n} variantes agregadas` : 'Esas combinaciones ya existen');
  };
  $('#eAdd', el).onclick = () => { rows.push({ talla: '', color: '', sku: '', minimo: '', stock: '' }); drawRows(); };
  $('#eSave', el).onclick = async () => {
    const nombre = $('#eNom', el).value.trim(), ref = $('#eRef', el).value.trim().toUpperCase();
    if (!nombre) { toast('Escribe el nombre del producto', 'bad'); $('#eNom', el).focus(); return; }
    if (!ref) { toast('Falta la referencia', 'bad'); return; }
    if (DB.productos.some(x => x.ref === ref && x !== p)) { toast('Esa referencia ya existe en otro producto', 'bad'); return; }
    if (!rows.length) rows.push({ talla: 'ÚNICA', color: '', sku: '', minimo: '', stock: '' });
    const seen = new Set();
    for (const r of rows) {
      r.talla = String(r.talla || '').trim().toUpperCase(); r.color = String(r.color || '').trim();
      const k = r.talla + '|' + norm(r.color); if (seen.has(k)) { toast(`Variante repetida: ${varName(r)}`, 'bad'); return; } seen.add(k);
      r.sku = String(r.sku || '').trim().toUpperCase() || skuFor(ref, r.talla, r.color);
    }
    const otros = new Set(DB.productos.filter(x => x !== p).flatMap(x => x.variantes.map(v => v.sku)));
    const dup = rows.find(r => otros.has(r.sku)); if (dup) { toast(`El código ${dup.sku} ya lo usa otro producto`, 'bad'); return; }
    const prod = p || { id: uid(), creado: nowISO(), activo: true, variantes: [] };
    const base = n0($('#ePrecio', el).value), extras = extrasSel();
    Object.assign(prod, { ref, nombre, categoria: $('#eCat', el).value, proveedorId: $('#eProv', el).value, costo: n0($('#eCosto', el).value), precio: base + sum(extras, e => e.valor), foto: d.foto, notas: $('#eNotas', el).value.trim() });
    if (extras.length) Object.assign(prod, { precioBase: base, extras }); else { delete prod.precioBase; delete prod.extras; }
    const keep = [];
    rows.forEach(r => {
      if (r._ex) { const v = varById(prod, r.id); Object.assign(v, { talla: r.talla, color: r.color, sku: r.sku, minimo: r.minimo === '' ? '' : n0(r.minimo) }); keep.push(v); }
      else { const v = { id: uid(), talla: r.talla, color: r.color, sku: r.sku, minimo: r.minimo === '' ? '' : n0(r.minimo), stock: 0 }; keep.push(v); r._new = v; }
    });
    prod.variantes = ordenarVariantes(keep);
    if (nuevo) { DB.productos.push(prod); if (ref === refSug) c.seq.prod++; }
    rows.forEach(r => { if (r._new && n0(r.stock) > 0) registrarMov(prod, r._new, Math.round(n0(r.stock)), 'inicial', { nota: 'Stock inicial' }); });
    rows.forEach(r => { if (r._ex && n0(r.suma) > 0) registrarMov(prod, varById(prod, r.id), Math.round(n0(r.suma)), 'entrada', { nota: 'Sumado desde el producto' }); });
    await save(); m.close(); toast(nuevo ? 'Producto creado' : 'Cambios guardados');
    if (onSaved) onSaved(prod); else render();
  };
}

/* =========================================================
   ENTRADAS (compras a proveedor)
   ========================================================= */
V.entradas = {
  title: 'Entradas de mercancía',
  html() {
    const list = DB.compras.slice().reverse();
    return `<div class="toolbar"><span class="muted">Registra aquí la mercancía que llega del proveedor: suma stock y actualiza el costo.</span><span class="sp"></span><button class="btn pri" id="cNew">${ic('plus')} Nueva entrada</button></div>
    <div class="card" style="padding:6px 8px"><div class="tw">${list.length ? `<table class="t"><thead><tr><th>Nº</th><th>Fecha</th><th>Proveedor</th><th>Factura</th><th class="r">Prendas</th><th class="r">Total</th><th></th></tr></thead><tbody>
      ${list.map(c => `<tr class="click ${c.anulada ? 'dim' : ''}" data-id="${c.id}"><td class="b">${c.num}</td><td>${fFecha(c.fecha)}</td><td>${esc(provById(c.proveedorId)?.nombre || '—')}</td><td>${esc(c.factura || '')}</td><td class="r">${int(sum(c.items, i => i.cant))}</td><td class="r b">${money(c.total)}</td><td>${c.anulada ? '<span class="badge bad">Anulada</span>' : c.totalEditado ? '<span class="badge warn" title="Total corregido a mano">editado</span>' : ''}</td></tr>`).join('')}</tbody></table>`
      : '<div class="empty"><h3>Sin entradas</h3><p>Cuando llegue mercancía, regístrala con “Nueva entrada”.</p></div>'}</div></div>`;
  },
  bind(m) {
    $('#cNew', m).onclick = () => nuevaEntrada();
    $$('tr.click', m).forEach(tr => tr.onclick = () => verCompra(DB.compras.find(c => c.id === tr.dataset.id)));
  }
};
function nuevaEntrada() {
  const lines = [];
  let sel = null;
  const m = modal({ title: 'Nueva entrada de mercancía', size: 'wide', body: `
    <div class="fgrid" style="grid-template-columns:2fr 1fr 1fr">
      <label class="f">Proveedor<select class="inp" id="nProv"><option value="">— Sin proveedor —</option>${DB.proveedores.map(x => `<option value="${x.id}">${esc(x.nombre)}</option>`).join('')}</select></label>
      <label class="f">Fecha<input class="inp" type="date" id="nFecha" value="${hoyK()}" max="${hoyK()}"></label>
      <label class="f">Nº factura / remisión<input class="inp" id="nFac"></label>
    </div>
    <div style="display:flex;gap:10px;margin-top:14px;align-items:flex-end"><div style="flex:1" id="nPick"></div><button class="btn" id="nNewP">${ic('plus')} Producto nuevo</button></div>
    <div id="nSel" style="margin-top:12px"></div>
    <h3 style="font-size:17px;margin:18px 0 6px;text-transform:uppercase">Prendas de esta entrada</h3>
    <div id="nLines"></div>
    <div class="fgrid" style="margin-top:12px"><label class="f">Nota<input class="inp" id="nNota" placeholder="Opcional"></label>
    <label class="chk" style="align-self:end"><input type="checkbox" id="nCosto" checked> Actualizar costo del producto (promedio ponderado)</label></div>
    <div class="mfoot"><button class="btn ghost" data-close>Cancelar</button><button class="btn pri" id="nSave">Guardar entrada</button></div>` });
  const el = m.el;
  const drawSel = () => {
    const box = $('#nSel', el);
    if (!sel) { box.innerHTML = ''; return; }
    box.innerHTML = `<div class="card" style="box-shadow:none;border:1px solid var(--line)"><div class="pcell" style="margin-bottom:10px">${thumb(sel)}<div><b>${esc(sel.nombre)}</b><small>${esc(sel.ref)} · costo actual ${money(sel.costo)}</small></div>
      <label class="f" style="margin-left:auto;flex-direction:row;align-items:center;gap:8px">Costo unitario <input class="inp" type="number" id="nCU" min="0" step="100" value="${sel.costo}" style="width:120px"></label></div>
      <div class="vbtns">${sel.variantes.map(v => `<label class="vbtn" style="cursor:default"><b>${esc(v.talla || 'Única')}</b><small>${esc(v.color || '')} · hay ${v.stock}</small><input class="inp" type="number" min="0" data-v="${v.id}" placeholder="0" style="width:70px;margin-top:5px;text-align:center;padding:4px"></label>`).join('')}</div>
      <div class="mfoot" style="margin-top:12px"><button class="btn ghost sm" id="nCancelSel">Cancelar</button><button class="btn pri sm" id="nAddSel">Agregar a la entrada</button></div></div>`;
    const q1 = $('input[data-v]', box); if (q1) q1.focus();
    $$('input[data-v]', box).forEach(i => i.onkeydown = e => { if (e.key === 'Enter') $('#nAddSel', el).click(); });
    $('#nCancelSel', el).onclick = () => { sel = null; drawSel(); };
    $('#nAddSel', el).onclick = () => {
      const cu = n0($('#nCU', el).value); let n = 0;
      $$('input[data-v]', box).forEach(i => { const q = Math.round(n0(i.value)); if (q > 0) {
        const ex = lines.find(l => l.vid === i.dataset.v); if (ex) { ex.cant += q; ex.costo = cu; } else lines.push({ pid: sel.id, vid: i.dataset.v, cant: q, costo: cu }); n++; } });
      if (!n) { toast('Escribe la cantidad en al menos una talla', 'bad'); return; }
      sel = null; drawSel(); drawLines(); pick.focus();
    };
  };
  const drawLines = () => {
    const tot = sum(lines, l => l.cant * l.costo);
    $('#nLines', el).innerHTML = lines.length ? `<table class="t"><thead><tr><th>Producto</th><th>Variante</th><th class="r">Cant.</th><th class="r">Costo und.</th><th class="r">Subtotal</th><th></th></tr></thead><tbody>
      ${lines.map((l, i) => { const p = prodById(l.pid), v = varById(p, l.vid); return `<tr><td>${esc(p.nombre)}</td><td>${esc(varName(v))}</td><td class="r"><input class="inp" type="number" min="1" data-li="${i}" data-f="cant" value="${l.cant}" style="width:70px"></td><td class="r"><input class="inp" type="number" min="0" data-li="${i}" data-f="costo" value="${l.costo}" style="width:110px"></td><td class="r b">${money(l.cant * l.costo)}</td><td><button class="ibtn" data-rm="${i}">${ic('trash')}</button></td></tr>`; }).join('')}
      </tbody><tfoot><tr><td colspan="2">${int(sum(lines, l => l.cant))} prendas</td><td></td><td></td><td class="r">${money(tot)}</td><td></td></tr></tfoot></table>`
      : '<p class="muted small">Busca un producto arriba y escribe cuántas llegan de cada talla.</p>';
    $$('#nLines input', el).forEach(i => i.onchange = () => { lines[i.dataset.li][i.dataset.f] = Math.max(0, n0(i.value)); drawLines(); });
    $$('#nLines [data-rm]', el).forEach(b => b.onclick = () => { lines.splice(b.dataset.rm, 1); drawLines(); });
  };
  const pick = picker($('#nPick', el), p => { sel = p; drawSel(); });
  $('#nNewP', el).onclick = () => editarProducto(null, p => { sel = p; drawSel(); });
  drawLines();
  $('#nSave', el).onclick = async () => {
    const ls = lines.filter(l => l.cant > 0);
    if (!ls.length) { toast('Agrega al menos una prenda', 'bad'); return; }
    const fecha = dateFromInput($('#nFecha', el).value);
    const compra = { id: uid(), num: nextNum('compra', 'E', 4), fecha, proveedorId: $('#nProv', el).value, factura: $('#nFac', el).value.trim(), nota: $('#nNota', el).value.trim(),
      items: ls.map(l => { const p = prodById(l.pid), v = varById(p, l.vid); return { ...l, nombre: p.nombre, variante: varName(v) }; }), total: sum(ls, l => l.cant * l.costo), anulada: false };
    if ($('#nCosto', el).checked) {
      [...new Set(ls.map(l => l.pid))].forEach(pid => {
        const p = prodById(pid), mine = ls.filter(l => l.pid === pid);
        const q = sum(mine, l => l.cant), cIn = sum(mine, l => l.cant * l.costo) / q, s0 = Math.max(0, stockTotal(p));
        p.costo = Math.round(s0 > 0 && p.costo > 0 ? (s0 * p.costo + q * cIn) / (s0 + q) : cIn);
      });
    }
    ls.forEach(l => { const p = prodById(l.pid); registrarMov(p, varById(p, l.vid), l.cant, 'compra', { doc: compra.num, fecha, costo: l.costo, nota: compra.factura ? 'Fact. ' + compra.factura : '' }); });
    if (compra.proveedorId) ls.forEach(l => { const p = prodById(l.pid); if (!p.proveedorId) p.proveedorId = compra.proveedorId; });
    DB.compras.push(compra);
    await save(); m.close(); toast(`Entrada ${compra.num} guardada: +${int(sum(ls, l => l.cant))} prendas`); render();
  };
}
function verCompra(c) {
  const m = modal({ title: `Entrada ${c.num}`, size: 'mid', body: `<p class="muted" style="margin-top:0">${fFecha(c.fecha)} · ${esc(provById(c.proveedorId)?.nombre || 'Sin proveedor')}${c.factura ? ' · Factura ' + esc(c.factura) : ''}${c.nota ? '<br>' + esc(c.nota) : ''}</p>
    <table class="t"><thead><tr><th>Producto</th><th>Variante</th><th class="r">Cant.</th><th class="r">Costo</th><th class="r">Subtotal</th></tr></thead><tbody>${c.items.map(i => `<tr><td>${esc(i.nombre)}</td><td>${esc(i.variante)}</td><td class="r">${i.cant}</td><td class="r">${money(i.costo)}</td><td class="r">${money(i.cant * i.costo)}</td></tr>`).join('')}</tbody>
    <tfoot>${c.totalEditado ? `<tr><td colspan="4" class="muted">Suma de las prendas</td><td class="r muted">${money(sum(c.items, i => i.cant * i.costo))}</td></tr>` : ''}<tr><td colspan="4">Total${c.totalEditado ? ' <span class="badge warn">editado</span>' : ''}</td><td class="r">${money(c.total)}</td></tr></tfoot></table>
    ${c.totalEditado ? `<p class="muted small">Total corregido el ${fHora(c.totalEditado)}${c.totalNota ? ': ' + esc(c.totalNota) : ''}.</p>` : ''}
    ${c.anulada ? `<p class="note">Anulada el ${fHora(c.anuladaFecha)}.</p>` : ''}
    <div class="mfoot">${c.anulada ? '' : '<button class="btn danger sp" id="aAnular">Anular entrada</button>'}${!c.anulada && ADM() ? `<button class="btn" id="aTotal">${ic('edit')} Editar total</button>` : ''}<button class="btn pri" data-close>Cerrar</button></div>` });
  if ($('#aTotal', m.el)) $('#aTotal', m.el).onclick = () => {
    const calc = sum(c.items, i => i.cant * i.costo);
    const t = modal({ title: `Editar total · ${c.num}`, body: `<p class="muted" style="margin-top:0">Suma de las prendas: <b>${money(calc)}</b>. Corrige aquí el total real de la entrada (lo que pagaste).<br>No cambia el stock ni el costo de los productos.</p>
      <div class="fgrid"><label class="f">Total de la entrada<input class="inp" type="number" min="0" step="100" id="etT" value="${c.total}"></label>
      <label class="f">Motivo (opcional)<input class="inp" id="etN" value="${esc(c.totalNota || '')}" placeholder="Ej: me equivoqué al digitar"></label></div>
      <div class="mfoot"><button class="btn ghost" data-close>Cancelar</button><button class="btn pri" id="etOk">Guardar total</button></div>` });
    $('#etOk', t.el).onclick = async () => {
      if ($('#etT', t.el).value === '') { toast('Escribe el total', 'bad'); return; }
      const nuevo = Math.max(0, Math.round(n0($('#etT', t.el).value)));
      if (nuevo === calc) { c.total = calc; delete c.totalEditado; delete c.totalNota; }
      else { c.total = nuevo; c.totalEditado = nowISO(); c.totalNota = $('#etN', t.el).value.trim(); }
      await save(); t.close(); m.close(); toast(`Total de ${c.num}: ${money(c.total)}`); render(); verCompra(c);
    };
  };
  if ($('#aAnular', m.el)) $('#aAnular', m.el).onclick = async () => {
    const falta = c.items.find(i => { const v = varById(prodById(i.pid), i.vid); return !v || n0(v.stock) < i.cant; });
    if (falta) { toast(`No se puede anular: ya no hay stock suficiente de ${falta.nombre} (${falta.variante})`, 'bad'); return; }
    if (!await ask(`Se restarán del inventario las ${int(sum(c.items, i => i.cant))} prendas de esta entrada. El costo de los productos no se recalcula.`, { ok: 'Anular entrada', danger: true })) return;
    c.items.forEach(i => { const p = prodById(i.pid); registrarMov(p, varById(p, i.vid), -i.cant, 'anulcompra', { doc: c.num }); });
    c.anulada = true; c.anuladaFecha = nowISO();
    await save(); m.close(); toast('Entrada anulada'); render();
  };
}

/* =========================================================
   REGISTRO DE INVERSIÓN (dinero invertido por proveedor · solo administrador)
   Eliminar = marcarla "borrada": el documento no se borra de la nube
   (así una versión vieja de la app en otro equipo no la puede borrar).
   ========================================================= */
const IF = { prov: '' };
const invActivas = () => DB.inversiones.filter(x => !x.borrada);
const invProv = x => provById(x.proveedorId)?.nombre || x.provNombre || '—';
V.inversion = {
  title: 'Registro de inversión',
  html() {
    const todas = invActivas(), list = todas.filter(x => !IF.prov || x.proveedorId === IF.prov).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const mes = hoyK().slice(0, 8) + '01';
    const porProv = {}; todas.forEach(x => { const k = invProv(x); porProv[k] = (porProv[k] || 0) + n0(x.monto); });
    return `<div class="toolbar"><select class="inp" id="iProv"><option value="">Todos los proveedores</option>${DB.proveedores.map(x => `<option value="${x.id}" ${IF.prov === x.id ? 'selected' : ''}>${esc(x.nombre)}</option>`).join('')}</select>
      <span class="sp"></span><button class="btn" id="iExp">${ic('down')} Exportar</button><button class="btn pri" id="iNew">${ic('plus')} Nueva inversión</button></div>
    <div class="grid g3">
      <div class="card kpi acc"><div class="l">Total invertido${IF.prov ? ' · ' + esc(provById(IF.prov)?.nombre || '') : ''}</div><div class="v">${money(sum(list, x => x.monto))}</div><div class="s">${list.length} registros</div></div>
      <div class="card kpi"><div class="l">Este mes</div><div class="v">${money(sum(list.filter(x => dk(x.fecha) >= mes), x => x.monto))}</div><div class="s">desde el ${fFecha(mes + 'T12:00')}</div></div>
      <div class="card"><h3>Por proveedor</h3>${hbars(Object.entries(porProv).map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v).slice(0, 6))}</div></div>
    <div class="card mt" style="padding:6px 8px"><div class="tw">${list.length ? `<table class="t"><thead><tr><th>Fecha</th><th>Proveedor</th><th class="r">Monto</th><th>Observación</th><th></th></tr></thead><tbody>
      ${list.map(x => `<tr class="click" data-id="${x.id}"><td>${fFecha(x.fecha)}</td><td class="b">${esc(invProv(x))}</td><td class="r b">${money(x.monto)}</td><td class="small" style="white-space:pre-line">${esc(x.nota || '')}</td>
      <td class="r" style="white-space:nowrap"><button class="ibtn" title="Editar">${ic('edit')}</button><button class="ibtn" data-del="${x.id}" title="Eliminar">${ic('trash')}</button></td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2">${list.length} registros</td><td class="r">${money(sum(list, x => x.monto))}</td><td colspan="2"></td></tr></tfoot></table>`
      : '<div class="empty"><h3>Sin inversiones</h3><p>Registra aquí el dinero que inviertes con cada proveedor con “Nueva inversión”.</p></div>'}</div></div>`;
  },
  bind(m) {
    $('#iProv', m).onchange = e => { IF.prov = e.target.value; render(); };
    $('#iNew', m).onclick = () => editarInversion(null);
    $$('tr.click', m).forEach(tr => tr.onclick = e => { if (e.target.closest('[data-del]')) return; editarInversion(DB.inversiones.find(x => x.id === tr.dataset.id)); });
    $$('[data-del]', m).forEach(b => b.onclick = async () => {
      const x = DB.inversiones.find(y => y.id === b.dataset.del);
      if (!await ask(`¿Eliminar la inversión de <b>${money(x.monto)}</b> con <b>${esc(invProv(x))}</b> del ${fFecha(x.fecha)}?`, { ok: 'Eliminar', danger: true })) return;
      x.borrada = true; x.borradaEn = nowISO(); await save(); toast('Inversión eliminada'); render();
    });
    $('#iExp', m).onclick = () => exportCSV(`inversiones-${hoyK()}.csv`, [['Fecha', 'Proveedor', 'Monto', 'Observación'],
      ...invActivas().filter(x => !IF.prov || x.proveedorId === IF.prov).sort((a, b) => a.fecha.localeCompare(b.fecha)).map(x => [fFecha(x.fecha), invProv(x), x.monto, x.nota || ''])]);
  }
};
function editarInversion(x) {
  if (!DB.proveedores.length) { toast('Primero crea el proveedor en Proveedores', 'bad'); return; }
  const d = x || { proveedorId: IF.prov || '', fecha: nowISO(), monto: '', nota: '' };
  const m = modal({ title: x ? 'Editar inversión' : 'Nueva inversión', body: `<div class="fgrid">
    <label class="f s2">Proveedor<select class="inp" id="ivP"><option value="">— Elige el proveedor —</option>${DB.proveedores.map(p => `<option value="${p.id}" ${p.id === d.proveedorId ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></label>
    <label class="f">Monto de la inversión<input class="inp" type="number" min="0" step="1000" id="ivM" value="${d.monto}"></label>
    <label class="f">Fecha<input class="inp" type="date" id="ivF" value="${dk(d.fecha)}" max="${hoyK()}"></label>
    <label class="f s2">Observación<textarea class="inp" id="ivN" placeholder="Ej: abono al pedido de diciembre, pago en efectivo…">${esc(d.nota || '')}</textarea></label></div>
    <div class="mfoot"><button class="btn ghost" data-close>Cancelar</button><button class="btn pri" id="ivOk">Guardar</button></div>` });
  $('#ivOk', m.el).onclick = async () => {
    const prov = $('#ivP', m.el).value, monto = Math.round(n0($('#ivM', m.el).value));
    if (!prov) { toast('Elige el proveedor', 'bad'); return; }
    if (monto <= 0) { toast('Escribe el monto', 'bad'); $('#ivM', m.el).focus(); return; }
    const fv = $('#ivF', m.el).value;
    const fecha = x && fv === dk(x.fecha) ? x.fecha : dateFromInput(fv);
    const o = x || { id: uid(), creado: nowISO() };
    Object.assign(o, { proveedorId: prov, provNombre: provById(prov).nombre, monto, fecha, nota: $('#ivN', m.el).value.trim() });
    if (!x) DB.inversiones.push(o); else o.editado = nowISO();
    await save(); m.close(); toast(x ? 'Inversión actualizada' : 'Inversión registrada'); render();
  };
}

/* =========================================================
   MOVIMIENTOS (kardex, ajustes y conteo físico)
   ========================================================= */
const MF = { q: '', tipo: '', desde: '', hasta: '' };
V.movimientos = {
  title: 'Movimientos de inventario',
  html() {
    return `<div class="toolbar"><input class="inp grow" id="mQ" placeholder="Producto, referencia o documento…" value="${esc(MF.q)}">
      <select class="inp" id="mTipo"><option value="">Todos los tipos</option>${Object.entries(TIPOS).map(([k, l]) => `<option value="${k}" ${MF.tipo === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <input class="inp" type="date" id="mD" value="${MF.desde}" title="Desde"><input class="inp" type="date" id="mH" value="${MF.hasta}" title="Hasta">
      <span class="sp"></span><button class="btn" id="mExp">${ic('down')} Exportar</button><button class="btn" id="mConteo">Conteo físico</button><button class="btn pri" id="mAj">Salida / ajuste</button></div>
      <div class="card" style="padding:6px 8px"><div class="tw" id="mTabla"></div></div>`;
  },
  bind(m) {
    const filtrar = () => DB.movimientos.filter(x => (!MF.tipo || x.tipo === MF.tipo) && (!MF.desde || dk(x.fecha) >= MF.desde) && (!MF.hasta || dk(x.fecha) <= MF.hasta)
      && (!MF.q || norm([x.prod, x.ref, x.doc, x.variante, x.nota].join(' ')).includes(norm(MF.q)))).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
    const draw = () => {
      const list = filtrar(), shown = list.slice(0, 400);
      $('#mTabla').innerHTML = list.length ? `<table class="t"><thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Variante</th><th class="r">Cantidad</th><th class="r">Queda</th><th>Documento</th><th>Nota</th>${ADM() ? '<th></th>' : ''}</tr></thead><tbody>
        ${shown.map(x => `<tr><td class="small">${fHora(x.fecha)}</td><td><span class="badge ${x.cantidad > 0 ? 'ok' : x.tipo === 'venta' ? 'ink' : 'warn'}">${TIPOS[x.tipo] || x.tipo}</span></td><td><b>${esc(x.prod)}</b> <span class="muted small">${esc(x.ref)}</span></td><td>${esc(x.variante)}</td>
        <td class="r b ${x.cantidad > 0 ? 'up' : 'down'}">${x.cantidad > 0 ? '+' : ''}${x.cantidad}</td><td class="r">${x.saldo ?? ''}</td><td>${esc(x.doc)}</td><td class="small muted">${esc(x.nota)}</td>${ADM() ? `<td><button class="ibtn" data-delmov="${x.id}" title="Eliminar este movimiento">${ic('trash')}</button></td>` : ''}</tr>`).join('')}</tbody></table>
        ${list.length > 400 ? `<p class="muted small" style="padding:8px">Mostrando 400 de ${list.length}. Usa los filtros o exporta para ver todo.</p>` : ''}`
        : '<div class="empty">No hay movimientos con esos filtros.</div>';
    };
    $('#mQ', m).oninput = e => { MF.q = e.target.value; draw(); };
    $('#mTipo', m).onchange = e => { MF.tipo = e.target.value; draw(); };
    $('#mD', m).onchange = e => { MF.desde = e.target.value; draw(); };
    $('#mH', m).onchange = e => { MF.hasta = e.target.value; draw(); };
    $('#mAj', m).onclick = () => ajusteStock();
    $('#mTabla', m).onclick = async e => {
      const b = e.target.closest('[data-delmov]'); if (!b) return;
      const x = DB.movimientos.find(y => y.id === b.dataset.delmov); if (!x) return;
      const venta = (x.tipo === 'venta' || x.tipo === 'anulacion') && DB.ventas.find(v => v.num === x.doc);
      if (venta) { toast(`Este movimiento es de la venta ${x.doc}: elimina o anula la venta desde Ventas`, 'bad'); return; }
      if (!await ask(`Se eliminará el movimiento <b>${esc(TIPOS[x.tipo] || x.tipo)}</b> de <b>${esc(x.prod)} (${esc(x.variante)})</b>: ${x.cantidad > 0 ? '+' : ''}${x.cantidad}.<br>El stock de esa talla se recalcula (${x.cantidad > 0 ? 'baja' : 'sube'} ${Math.abs(x.cantidad)}).`, { ok: 'Eliminar', danger: true, title: 'Eliminar movimiento' })) return;
      DB.movimientos = DB.movimientos.filter(y => y !== x);
      recalcularStock(DB); await save(); toast('Movimiento eliminado'); draw();
    };
    $('#mConteo', m).onclick = conteoFisico;
    $('#mExp', m).onclick = () => exportCSV(`movimientos-${hoyK()}.csv`, [['Fecha', 'Tipo', 'Referencia', 'Producto', 'Variante', 'Cantidad', 'Queda', 'Documento', 'Nota', 'Costo und.'],
      ...filtrar().map(x => [fHora(x.fecha), TIPOS[x.tipo] || x.tipo, x.ref, x.prod, x.variante, x.cantidad, x.saldo, x.doc, x.nota, x.costo])]);
    draw();
  }
};
function ajusteStock() {
  let p = null;
  const m = modal({ title: 'Salida o ajuste de stock', size: 'mid', body: `<div id="aPick"></div><div id="aForm" style="margin-top:12px"></div>` });
  const el = m.el;
  const drawForm = () => {
    if (!p) { $('#aForm', el).innerHTML = '<p class="muted small">Busca el producto. Usa esto para prendas dañadas, perdidas, regaladas, devoluciones o para corregir el stock después de contar.</p>'; return; }
    $('#aForm', el).innerHTML = `<div class="pcell" style="margin-bottom:12px">${thumb(p)}<div><b>${esc(p.nombre)}</b><small>${esc(p.ref)}</small></div></div>
      <div class="fgrid"><label class="f">Talla / color<select class="inp" id="aVar">${p.variantes.map(v => `<option value="${v.id}">${esc(varName(v))} — hay ${v.stock}</option>`).join('')}</select></label>
      <label class="f">Motivo<select class="inp" id="aTipo"><option value="danio">Salida: daño / defecto</option><option value="perdida">Salida: pérdida o robo</option><option value="regalo">Salida: regalo / promoción</option><option value="interno">Salida: uso interno</option><option value="devproveedor">Devolución a proveedor</option><option value="devolucion">Entrada: devolución de cliente</option><option value="ajuste">Corrección: fijar stock real</option></select></label>
      <label class="f" id="aCantL">Cantidad<input class="inp" type="number" min="1" id="aCant" value="1"></label>
      <label class="f">Nota<input class="inp" id="aNota" placeholder="Opcional"></label></div>
      <div class="mfoot"><button class="btn ghost" data-close>Cancelar</button><button class="btn pri" id="aSave">Registrar</button></div>`;
    $('[data-close]', $('#aForm', el)).onclick = m.close;
    $('#aTipo', el).onchange = e => { $('#aCantL', el).firstChild.textContent = e.target.value === 'ajuste' ? 'Stock real contado' : 'Cantidad'; };
    $('#aSave', el).onclick = async () => {
      const v = varById(p, $('#aVar', el).value), tipo = $('#aTipo', el).value, q = Math.round(n0($('#aCant', el).value)), nota = $('#aNota', el).value.trim();
      let delta;
      if (tipo === 'ajuste') { if (q < 0) { toast('El stock real no puede ser negativo', 'bad'); return; } delta = q - n0(v.stock); if (!delta) { toast('El stock ya es ' + q); return; } }
      else { if (q <= 0) { toast('Cantidad inválida', 'bad'); return; } delta = tipo === 'devolucion' ? q : -q; if (delta < 0 && -delta > n0(v.stock)) { toast(`Solo hay ${v.stock} unidades de esa talla`, 'bad'); return; } }
      registrarMov(p, v, delta, tipo, { nota, doc: 'AJUSTE' });
      await save(); m.close(); toast(`${TIPOS[tipo]}: ${delta > 0 ? '+' : ''}${delta} · quedan ${v.stock}`); render();
    };
  };
  picker($('#aPick', el), x => { p = x; drawForm(); });
  drawForm();
}
function conteoFisico() {
  let cat = '';
  const m = modal({ title: 'Conteo físico de inventario', size: 'wide', body: `<p class="muted" style="margin-top:0">Cuenta las prendas en tienda/bodega y escribe la cantidad real. Solo se ajustan las filas que llenes y que sean distintas al sistema.</p>
    <div class="toolbar"><select class="inp" id="kCat"><option value="">Todas las categorías</option>${cfg().categorias.map(c => `<option>${esc(c)}</option>`).join('')}</select><span class="muted small" id="kInfo"></span></div>
    <div class="tw" id="kTabla" style="max-height:52vh"></div>
    <div class="mfoot"><button class="btn ghost" data-close>Cancelar</button><button class="btn pri" id="kApply">Aplicar diferencias</button></div>` });
  const el = m.el, conteo = {};
  const draw = () => {
    const ps = activos().filter(p => !cat || p.categoria === cat).sort((a, b) => a.nombre.localeCompare(b.nombre));
    $('#kTabla', el).innerHTML = `<table class="t"><thead><tr><th>Producto</th><th>Variante</th><th>Código</th><th class="r">Sistema</th><th class="r">Contado</th><th class="r">Diferencia</th></tr></thead><tbody>
      ${ps.flatMap(p => p.variantes.map(v => `<tr><td>${esc(p.nombre)}</td><td>${esc(varName(v))}</td><td class="small muted">${esc(v.sku)}</td><td class="r">${v.stock}</td><td class="r"><input class="inp" type="number" min="0" data-v="${p.id}|${v.id}" value="${conteo[p.id + '|' + v.id] ?? ''}" style="width:80px"></td><td class="r b" data-d="${p.id}|${v.id}"></td></tr>`)).join('')}</tbody></table>`;
    $$('input[data-v]', el).forEach(i => { const upd = () => {
      const [pid, vid] = i.dataset.v.split('|'); const v = varById(prodById(pid), vid);
      if (i.value === '') delete conteo[i.dataset.v]; else conteo[i.dataset.v] = Math.max(0, Math.round(n0(i.value)));
      const d = i.value === '' ? '' : conteo[i.dataset.v] - n0(v.stock); const td = $(`[data-d="${i.dataset.v}"]`, el);
      td.textContent = d === '' ? '' : (d > 0 ? '+' : '') + d; td.className = 'r b ' + (d > 0 ? 'up' : d < 0 ? 'down' : '');
      $('#kInfo', el).textContent = Object.keys(conteo).length + ' filas contadas';
    }; i.oninput = upd; if (i.value !== '') upd(); });
  };
  $('#kCat', el).onchange = e => { cat = e.target.value; draw(); };
  draw();
  $('#kApply', el).onclick = async () => {
    const cambios = Object.entries(conteo).map(([k, q]) => { const [pid, vid] = k.split('|'); const p = prodById(pid), v = varById(p, vid); return { p, v, d: q - n0(v.stock) }; }).filter(x => x.d);
    if (!cambios.length) { toast('No hay diferencias que aplicar'); return; }
    if (!await ask(`Se ajustarán <b>${cambios.length}</b> variantes (${cambios.filter(c => c.d < 0).length} con faltantes, ${cambios.filter(c => c.d > 0).length} con sobrantes).`, { ok: 'Aplicar' })) return;
    cambios.forEach(c => registrarMov(c.p, c.v, c.d, 'ajuste', { doc: 'CONTEO', nota: 'Conteo físico' }));
    await save(); m.close(); toast('Conteo aplicado'); render();
  };
}

/* =========================================================
   VENTAS (historial)
   ========================================================= */
const VF = { desde: '', hasta: '', q: '', met: '', anul: false };
V.ventas = {
  title: 'Historial de ventas',
  html() {
    if (!VF.desde) { VF.desde = hoyK().slice(0, 8) + '01'; VF.hasta = hoyK(); }
    return `<div class="toolbar"><input class="inp grow" id="vQ" placeholder="Nº de venta, cliente o producto…" value="${esc(VF.q)}">
      <input class="inp" type="date" id="vD" value="${VF.desde}"><input class="inp" type="date" id="vH" value="${VF.hasta}">
      <select class="inp" id="vM"><option value="">Todos los pagos</option>${cfg().metodos.map(x => `<option ${VF.met === x ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
      <label class="chk small"><input type="checkbox" id="vA" ${VF.anul ? 'checked' : ''}> Ver anuladas</label><span class="sp"></span><button class="btn gan" id="vExp">${ic('down')} Exportar</button></div>
      <div class="card" style="padding:6px 8px"><div class="tw" id="vTabla"></div></div>`;
  },
  bind(m) {
    const filtrar = () => DB.ventas.filter(v => (VF.anul || !v.anulada) && (!VF.desde || dk(v.fecha) >= VF.desde) && (!VF.hasta || dk(v.fecha) <= VF.hasta) && (!VF.met || v.pago.metodo === VF.met)
      && (!VF.q || norm([v.num, v.cliente, ...v.items.map(i => i.nombre)].join(' ')).includes(norm(VF.q)))).slice().reverse();
    const draw = () => {
      const list = filtrar(), ok = list.filter(v => !v.anulada);
      $('#vTabla').innerHTML = list.length ? `<table class="t"><thead><tr><th>Nº</th><th>Fecha</th><th>Cliente</th><th>Prendas</th><th>Pago</th><th class="r">Descuento</th><th class="r">Total</th><th class="r gan">Ganancia</th></tr></thead><tbody>
        ${list.map(v => `<tr class="click ${v.anulada ? 'dim' : ''}" data-id="${v.id}"><td class="b">${v.num}${v.anulada ? ' <span class="badge bad">Anulada</span>' : ''}</td><td class="small">${fHora(v.fecha)}</td><td>${esc(v.cliente || '—')}</td>
          <td class="small">${v.items.map(i => `${i.cant}× ${esc(i.nombre)} <span class="muted">${esc(i.talla || '')}</span>`).join('<br>')}</td><td><span class="badge">${esc(v.pago.metodo)}</span></td>
          <td class="r">${v.descuento ? money(v.descuento) : ''}</td><td class="r b">${money(v.total)}</td><td class="r up gan">${money(v.total - costoVenta(v))}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td colspan="3">${ok.length} ventas</td><td>${int(sum(ok, v => sum(v.items, i => i.cant)))} prendas</td><td></td><td class="r">${money(sum(ok, v => v.descuento))}</td><td class="r">${money(sum(ok, v => v.total))}</td><td class="r gan">${money(sum(ok, v => v.total - costoVenta(v)))}</td></tr></tfoot></table>`
        : '<div class="empty">No hay ventas en ese período.</div>';
      $$('#vTabla tr.click').forEach(tr => tr.onclick = () => verVenta(DB.ventas.find(v => v.id === tr.dataset.id)));
    };
    $('#vQ', m).oninput = e => { VF.q = e.target.value; draw(); };
    $('#vD', m).onchange = e => { VF.desde = e.target.value; draw(); };
    $('#vH', m).onchange = e => { VF.hasta = e.target.value; draw(); };
    $('#vM', m).onchange = e => { VF.met = e.target.value; draw(); };
    $('#vA', m).onchange = e => { VF.anul = e.target.checked; draw(); };
    $('#vExp', m).onclick = () => exportCSV(`ventas-${VF.desde}_${VF.hasta}.csv`, [['Venta', 'Fecha', 'Cliente', 'Pago', 'Estado', 'Referencia', 'Producto', 'Variante', 'Cantidad', 'Precio und.', 'Costo und.', 'Descuento venta', 'Total venta'],
      ...filtrar().flatMap(v => v.items.map((i, k) => [v.num, fHora(v.fecha), v.cliente, v.pago.metodo, v.anulada ? 'Anulada' : 'OK', i.ref, i.nombre, i.variante, i.cant, i.precio, i.costo, k ? '' : v.descuento, k ? '' : v.total]))]);
    draw();
  }
};
function verVenta(v) {
  const m = modal({ title: `Venta ${v.num}`, size: 'mid', body: `<p class="muted" style="margin-top:0">${fHora(v.fecha)} · ${esc(v.pago.metodo)}${v.cliente ? ' · ' + esc(v.cliente) : ''}</p>
    <table class="t"><thead><tr><th>Producto</th><th>Variante</th><th class="r">Cant.</th><th class="r">Precio</th><th class="r">Subtotal</th></tr></thead><tbody>${v.items.map(i => `<tr><td>${esc(i.nombre)} <span class="muted small">${esc(i.ref)}</span></td><td>${esc(i.variante)}</td><td class="r">${i.cant}</td><td class="r">${money(i.precio)}</td><td class="r">${money(i.cant * i.precio)}</td></tr>`).join('')}</tbody>
    <tfoot>${v.descuento ? `<tr><td colspan="4">Descuento</td><td class="r">−${money(v.descuento)}</td></tr>` : ''}<tr><td colspan="4">Total</td><td class="r">${money(v.total)}</td></tr><tr class="gan"><td colspan="4" class="muted">Ganancia (total − costo)</td><td class="r up">${money(v.total - costoVenta(v))}</td></tr></tfoot></table>
    ${v.anulada ? `<p class="note">Anulada el ${fHora(v.anuladaFecha)}${v.motivo ? ': ' + esc(v.motivo) : ''}. Las prendas volvieron al inventario.</p>` : ''}
    <div class="mfoot">${v.anulada || !ADM() ? '' : '<button class="btn danger sp" id="vAnular">Anular venta</button>'}${ADM() ? `<button class="btn ghost" id="vDel">${ic('trash')} Eliminar</button>` : ''}<button class="btn" id="vPrint">${ic('print')} Imprimir ticket</button><button class="btn pri" data-close>Cerrar</button></div>` });
  $('#vPrint', m.el).onclick = () => imprimir(ticketHTML(v), 'Ticket-' + v.num);
  if ($('#vDel', m.el)) $('#vDel', m.el).onclick = async () => {
    if (!await ask(`Se eliminará la venta <b>${v.num}</b> (${money(v.total)}) por completo: desaparece del historial, de los reportes y de la caja, y ${v.anulada ? 'sus movimientos se borran' : 'las prendas <b>vuelven al stock</b>'}.<br><br>Úsalo solo para errores. Para una devolución normal usa <b>Anular</b>.`, { ok: 'Eliminar venta', danger: true, title: 'Eliminar venta' })) return;
    DB.ventas = DB.ventas.filter(x => x !== v);
    DB.movimientos = DB.movimientos.filter(x => !(x.doc === v.num && (x.tipo === 'venta' || x.tipo === 'anulacion')));
    recalcularStock(DB); await save(); m.close(); toast('Venta eliminada'); render();
  };
  if ($('#vAnular', m.el)) $('#vAnular', m.el).onclick = () => {
    const a = modal({ title: 'Anular venta', body: `<p class="ask">Las prendas de <b>${v.num}</b> vuelven al inventario y la venta deja de contar en reportes y caja.</p><label class="f" style="margin-top:12px">Motivo<input class="inp" id="anMot" placeholder="Ej: cliente devolvió la prenda, error al cobrar…"></label>
      <div class="mfoot"><button class="btn ghost" data-close>Cancelar</button><button class="btn danger" id="anOk">Anular venta</button></div>` });
    $('#anOk', a.el).onclick = async () => {
      v.items.forEach(i => { const p = prodById(i.pid), vr = varById(p, i.vid); if (p && vr) registrarMov(p, vr, i.cant, 'anulacion', { doc: v.num, nota: $('#anMot', a.el).value.trim() }); });
      v.anulada = true; v.anuladaFecha = nowISO(); v.motivo = $('#anMot', a.el).value.trim();
      await save(); a.close(); m.close(); toast('Venta anulada'); render();
    };
  };
}

/* =========================================================
   CAJA
   ========================================================= */
function resumenCaja(c) {
  const fin = c.cerradaEn || '9999';
  const ventas = DB.ventas.filter(v => !v.anulada && v.fecha >= c.abiertaEn && v.fecha <= fin);
  const porMetodo = {}; cfg().metodos.forEach(x => porMetodo[x] = 0);
  ventas.forEach(v => porMetodo[v.pago.metodo] = (porMetodo[v.pago.metodo] || 0) + v.total);
  const movs = DB.cajaMovs.filter(x => x.cajaId === c.id);
  const t = k => sum(movs.filter(x => x.tipo === k), x => x.monto);
  const esperado = n0(c.base) + n0(porMetodo.Efectivo) + t('ingreso') - t('gasto') - t('retiro');
  return { ventas, porMetodo, movs, gastos: t('gasto'), retiros: t('retiro'), ingresos: t('ingreso'), esperado, total: sum(ventas, v => v.total) };
}
V.caja = {
  title: 'Caja',
  html() {
    const c = cajaAbierta();
    const hist = DB.cajas.filter(x => x.cerradaEn).slice(-30).reverse();
    const histHTML = `<div class="card mt"><h3>Cierres anteriores</h3>${hist.length ? `<div class="tw" style="max-height:340px"><table class="t"><thead><tr><th>Apertura</th><th>Cierre</th><th class="r">Ventas</th><th class="r">Base</th><th class="r">Esperado efectivo</th><th class="r">Contado</th><th class="r">Diferencia</th><th>Nota</th>${ADM() ? '<th></th>' : ''}</tr></thead><tbody>
      ${hist.map(x => `<tr><td class="small">${fHora(x.abiertaEn)}</td><td class="small">${fHora(x.cerradaEn)}</td><td class="r">${money(x.resumen.total)}</td><td class="r">${money(x.base)}</td><td class="r">${money(x.resumen.esperado)}</td><td class="r">${money(x.contado)}</td>
      <td class="r"><span class="badge ${x.diferencia === 0 ? 'ok' : x.diferencia > 0 ? 'warn' : 'bad'}">${x.diferencia > 0 ? '+' : ''}${money(x.diferencia)}</span></td><td class="small muted">${esc(x.nota || '')}</td>${ADM() ? `<td><button class="ibtn" data-delcaja="${x.id}" title="Eliminar esta caja">${ic('trash')}</button></td>` : ''}</tr>`).join('')}</tbody></table></div>` : '<p class="muted">Aún no hay cierres.</p>'}</div>`;
    if (!c) return `<div class="card" style="max-width:520px"><h3>Abrir caja</h3><p class="muted" style="margin-top:0">Al empezar el día, cuenta el efectivo con el que arrancas (la base para dar cambio).</p>
      <label class="f">Base en efectivo<input class="inp" type="number" min="0" step="1000" id="kBase" placeholder="Ej: 100000"></label>
      <div class="mfoot"><button class="btn pri" id="kAbrir">Abrir caja</button></div></div>${histHTML}`;
    const r = resumenCaja(c);
    return `<div class="grid g4">
      <div class="card kpi acc"><div class="l">Efectivo que debe haber</div><div class="v">${money(r.esperado)}</div><div class="s">base + ventas en efectivo + ingresos − gastos − retiros</div></div>
      <div class="card kpi"><div class="l">Vendido en este turno</div><div class="v">${money(r.total)}</div><div class="s">${r.ventas.length} ventas · abierta ${fHora(c.abiertaEn)}</div></div>
      <div class="card kpi"><div class="l">Gastos</div><div class="v">${money(r.gastos)}</div><div class="s">retiros ${money(r.retiros)} · ingresos ${money(r.ingresos)}</div></div>
      <div class="card kpi"><div class="l">Base inicial</div><div class="v">${money(c.base)}</div><div class="s">efectivo al abrir</div></div></div>
    <div class="grid g2 mt">
      <div class="card"><h3>Ventas por medio de pago</h3><ul class="list-plain">${Object.entries(r.porMetodo).map(([k, v]) => `<li><span>${esc(k)}</span><b>${money(v)}</b></li>`).join('')}</ul></div>
      <div class="card"><h3>Gastos y movimientos de caja <button class="btn sm sp" id="kMov">${ic('plus')} Registrar</button></h3>
        ${r.movs.length ? `<ul class="list-plain">${r.movs.map(x => `<li><span><span class="badge ${x.tipo === 'ingreso' ? 'ok' : 'warn'}">${x.tipo}</span> ${esc(x.concepto)} <span class="muted small">${fHora(x.fecha)}</span></span><b>${x.tipo === 'ingreso' ? '+' : '−'}${money(x.monto)}</b></li>`).join('')}</ul>` : '<p class="muted">Sin gastos registrados en este turno (domicilios, bolsas, almuerzo…).</p>'}</div></div>
    <div class="card mt" style="max-width:640px"><h3>Cerrar caja</h3><p class="muted" style="margin-top:0">Cuenta el efectivo que hay en caja y escríbelo. La app calcula si sobra o falta.</p>
      <div class="fgrid"><label class="f">Efectivo contado<input class="inp" type="number" min="0" step="1000" id="kCont"></label><label class="f">Diferencia<div class="cambio" id="kDif" style="padding:8px 0">—</div></label>
      <label class="f s2">Nota (opcional)<input class="inp" id="kNota"></label></div>
      <div class="mfoot">${ADM() ? '<button class="btn ghost sp" id="kDel">' + ic('trash') + ' Eliminar caja (error)</button>' : ''}<button class="btn danger" id="kCerrar">Cerrar caja</button></div></div>${histHTML}`;
  },
  bind(m) {
    $$('[data-delcaja]', m).forEach(b => b.onclick = () => eliminarCaja(DB.cajas.find(x => x.id === b.dataset.delcaja)));
    if ($('#kDel', m)) $('#kDel', m).onclick = () => eliminarCaja(cajaAbierta());
    if ($('#kAbrir', m)) {
      $('#kBase', m).focus();
      $('#kAbrir', m).onclick = async () => { DB.cajas.push({ id: uid(), abiertaEn: nowISO(), base: n0($('#kBase', m).value) }); await save(); toast('Caja abierta'); render(); };
      return;
    }
    const c = cajaAbierta(), r = resumenCaja(c);
    $('#kCont', m).oninput = e => { const d = n0(e.target.value) - r.esperado; $('#kDif', m).innerHTML = e.target.value === '' ? '—' : d === 0 ? '<span class="up">Cuadra exacto ✓</span>' : `<span class="${d > 0 ? 'up' : 'down'}">${d > 0 ? 'Sobran ' : 'Faltan '}${money(Math.abs(d))}</span>`; };
    $('#kMov', m).onclick = () => {
      const mm = modal({ title: 'Movimiento de caja', body: `<div class="fgrid"><label class="f">Tipo<select class="inp" id="cmT"><option value="gasto">Gasto (domicilio, bolsas, comida…)</option><option value="retiro">Retiro (llevar efectivo al banco/dueño)</option><option value="ingreso">Ingreso extra de efectivo</option></select></label>
        <label class="f">Monto<input class="inp" type="number" min="0" step="500" id="cmM"></label><label class="f s2">Concepto<input class="inp" id="cmC"></label></div>
        <div class="mfoot"><button class="btn ghost" data-close>Cancelar</button><button class="btn pri" id="cmOk">Guardar</button></div>` });
      $('#cmOk', mm.el).onclick = async () => {
        const monto = n0($('#cmM', mm.el).value); if (monto <= 0) { toast('Escribe el monto', 'bad'); return; }
        DB.cajaMovs.push({ id: uid(), cajaId: c.id, fecha: nowISO(), tipo: $('#cmT', mm.el).value, monto, concepto: $('#cmC', mm.el).value.trim() || '(sin concepto)' });
        await save(); mm.close(); toast('Registrado'); render();
      };
    };
    $('#kCerrar', m).onclick = async () => {
      if ($('#kCont', m).value === '') { toast('Escribe el efectivo contado', 'bad'); $('#kCont', m).focus(); return; }
      const contado = n0($('#kCont', m).value), dif = contado - r.esperado;
      if (!await ask(`Cerrar caja con <b>${money(contado)}</b> contados. ${dif === 0 ? 'Cuadra exacto.' : (dif > 0 ? 'Sobran ' : 'Faltan ') + '<b>' + money(Math.abs(dif)) + '</b>.'}`, { ok: 'Cerrar caja' })) return;
      c.cerradaEn = nowISO(); c.contado = contado; c.diferencia = dif; c.nota = $('#kNota', m).value.trim();
      const rf = resumenCaja(c);
      c.resumen = { total: rf.total, porMetodo: rf.porMetodo, gastos: rf.gastos, retiros: rf.retiros, ingresos: rf.ingresos, esperado: rf.esperado, nVentas: rf.ventas.length };
      await save(); toast('Caja cerrada'); render();
      if (await ask('¿Imprimir el resumen del cierre?', { ok: 'Imprimir', title: 'Cierre de caja' })) imprimir(cierreHTML(c), 'Cierre-' + dk(c.cerradaEn));
    };
  }
};
async function eliminarCaja(c) {
  if (!c || !ADM()) return;
  const r = resumenCaja(c);
  if (!await ask(`Se eliminará la caja abierta el <b>${fHora(c.abiertaEn)}</b>${c.cerradaEn ? ' (cerrada ' + fHora(c.cerradaEn) + ')' : ''} con sus ${r.movs.length} gastos/movimientos de caja.<br><br>Las <b>${r.ventas.length} ventas</b> de ese turno NO se borran: siguen en el historial y en el inventario, solo quedan sin caja asignada.`, { ok: 'Eliminar caja', danger: true, title: 'Eliminar caja' })) return;
  DB.ventas.forEach(v => { if (v.cajaId === c.id) v.cajaId = null; });
  DB.cajaMovs = DB.cajaMovs.filter(x => x.cajaId !== c.id);
  DB.cajas = DB.cajas.filter(x => x !== c);
  await save(); toast('Caja eliminada'); render();
}
function cierreHTML(c) {
  const r = c.resumen;
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:80mm auto;margin:3mm}body{font-family:Consolas,monospace;font-size:12px;width:72mm;margin:0 auto}h1{font-family:Roboto,Arial;text-align:center;font-size:20px;margin:4px}table{width:100%}td.r{text-align:right}hr{border:0;border-top:1px dashed #000}</style></head><body>
  <h1>${esc(cfg().negocio)}</h1><div style="text-align:center">CIERRE DE CAJA</div><hr>Apertura: ${fHora(c.abiertaEn)}<br>Cierre: ${fHora(c.cerradaEn)}<hr>
  <table>${Object.entries(r.porMetodo).map(([k, v]) => `<tr><td>${esc(k)}</td><td class="r">${money(v)}</td></tr>`).join('')}<tr><td><b>Total ventas (${r.nVentas})</b></td><td class="r"><b>${money(r.total)}</b></td></tr></table><hr>
  <table><tr><td>Base</td><td class="r">${money(c.base)}</td></tr><tr><td>Gastos</td><td class="r">-${money(r.gastos)}</td></tr><tr><td>Retiros</td><td class="r">-${money(r.retiros)}</td></tr><tr><td>Ingresos</td><td class="r">${money(r.ingresos)}</td></tr>
  <tr><td><b>Esperado efectivo</b></td><td class="r"><b>${money(r.esperado)}</b></td></tr><tr><td>Contado</td><td class="r">${money(c.contado)}</td></tr><tr><td><b>Diferencia</b></td><td class="r"><b>${money(c.diferencia)}</b></td></tr></table>
  ${c.nota ? '<hr>' + esc(c.nota) : ''}</body></html>`;
}

/* =========================================================
   PROVEEDORES
   ========================================================= */
V.proveedores = {
  title: 'Proveedores',
  html() {
    return `<div class="toolbar"><span class="sp"></span><button class="btn pri" id="prNew">${ic('plus')} Nuevo proveedor</button></div>
      <div class="card" style="padding:6px 8px">${DB.proveedores.length ? `<table class="t"><thead><tr><th>Proveedor</th><th>Contacto</th><th>Teléfono</th><th>Correo / redes</th><th class="r">Productos</th><th class="r">Total comprado</th><th class="r">Invertido</th><th>Última entrada</th><th></th></tr></thead><tbody>
      ${DB.proveedores.map(p => { const cs = DB.compras.filter(c => c.proveedorId === p.id && !c.anulada); return `<tr class="click" data-id="${p.id}"><td class="b">${esc(p.nombre)}</td><td>${esc(p.contacto)}</td><td>${esc(p.telefono)}</td><td>${esc(p.email)}</td>
      <td class="r">${DB.productos.filter(x => x.proveedorId === p.id && x.activo !== false).length}</td><td class="r">${money(sum(cs, c => c.total))}</td><td class="r">${money(sum(invActivas().filter(x => x.proveedorId === p.id), x => x.monto))}</td><td class="small">${cs.length ? fFecha(cs[cs.length - 1].fecha) : '—'}</td>
      <td class="r"><button class="ibtn" data-del="${p.id}">${ic('trash')}</button></td></tr>`; }).join('')}</tbody></table>`
      : '<div class="empty"><h3>Sin proveedores</h3><p>Agrega a quién le compras la mercancía para llevar el control de costos y entradas.</p></div>'}</div>`;
  },
  bind(m) {
    $('#prNew', m).onclick = () => editarProveedor();
    $$('tr.click', m).forEach(tr => tr.onclick = e => { if (e.target.closest('[data-del]')) return; editarProveedor(provById(tr.dataset.id)); });
    $$('[data-del]', m).forEach(b => b.onclick = async () => {
      const p = provById(b.dataset.del);
      if (!await ask(`¿Eliminar a <b>${esc(p.nombre)}</b>? Sus productos y entradas se conservan, solo quedan “sin proveedor”.`, { ok: 'Eliminar', danger: true })) return;
      DB.proveedores = DB.proveedores.filter(x => x !== p); DB.productos.forEach(x => { if (x.proveedorId === p.id) x.proveedorId = ''; });
      await save(); render();
    });
  }
};
function editarProveedor(p) {
  const d = p || { nombre: '', contacto: '', telefono: '', email: '', notas: '' };
  const m = modal({ title: p ? 'Editar proveedor' : 'Nuevo proveedor', body: `<div class="fgrid">
    <label class="f s2">Nombre / empresa<input class="inp" id="prN" value="${esc(d.nombre)}"></label>
    <label class="f">Persona de contacto<input class="inp" id="prC" value="${esc(d.contacto)}"></label><label class="f">Teléfono / WhatsApp<input class="inp" id="prT" value="${esc(d.telefono)}"></label>
    <label class="f s2">Correo o Instagram<input class="inp" id="prE" value="${esc(d.email)}"></label><label class="f s2">Notas<textarea class="inp" id="prNo" placeholder="Condiciones, tiempos de entrega, mínimo de pedido…">${esc(d.notas)}</textarea></label></div>
    <div class="mfoot"><button class="btn ghost" data-close>Cancelar</button><button class="btn pri" id="prOk">Guardar</button></div>` });
  $('#prOk', m.el).onclick = async () => {
    const nombre = $('#prN', m.el).value.trim(); if (!nombre) { toast('Escribe el nombre', 'bad'); return; }
    const o = p || { id: uid() };
    Object.assign(o, { nombre, contacto: $('#prC', m.el).value.trim(), telefono: $('#prT', m.el).value.trim(), email: $('#prE', m.el).value.trim(), notas: $('#prNo', m.el).value.trim() });
    if (!p) DB.proveedores.push(o);
    await save(); m.close(); toast('Proveedor guardado'); render();
  };
}

/* =========================================================
   REPORTES
   ========================================================= */
const RF = { per: 'mes', desde: '', hasta: '' };
function periodo(p) {
  const t = new Date(), k = dk(t);
  const back = n => { const d = new Date(); d.setDate(d.getDate() - n); return dk(d); };
  switch (p) {
    case 'hoy': return [k, k];
    case '7': return [back(6), k];
    case '30': return [back(29), k];
    case 'mes': return [k.slice(0, 8) + '01', k];
    case 'mesant': return [dk(new Date(t.getFullYear(), t.getMonth() - 1, 1)), dk(new Date(t.getFullYear(), t.getMonth(), 0))];
    case 'anio': return [k.slice(0, 4) + '-01-01', k];
    default: return [RF.desde || k, RF.hasta || k];
  }
}
V.reportes = {
  title: 'Reportes',
  html() {
    const [d, h] = periodo(RF.per);
    const vs = ventasEn(d, h);
    const total = sum(vs, v => v.total), costo = sum(vs, costoVenta), gan = total - costo;
    const unidades = sum(vs, v => sum(v.items, i => i.cant));
    const gastos = sum(DB.cajaMovs.filter(m => m.tipo === 'gasto' && dk(m.fecha) >= d && dk(m.fecha) <= h), m => m.monto);
    const top = topProductos(vs);
    // serie
    const days = Math.round((new Date(h) - new Date(d)) / 864e5) + 1, serie = [];
    if (days <= 62) { for (let i = 0; i < days; i++) { const x = new Date(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10) + i); const k = dk(x); serie.push({ t: fFecha(x), lab: x.getDate(), v: sum(ventasEn(k, k), v => v.total) }); } }
    else { const m = {}; vs.forEach(v => { const k = dk(v.fecha).slice(0, 7); m[k] = (m[k] || 0) + v.total; }); Object.keys(m).sort().forEach(k => serie.push({ t: k, lab: new Date(+k.slice(0, 4), +k.slice(5) - 1, 1).toLocaleDateString('es-CO', { month: 'short' }), v: m[k] })); }
    const agg = key => { const m = {}; vs.forEach(v => { const f = factor(v); v.items.forEach(i => { const k = key(i) || '—'; m[k] = (m[k] || 0) + i.precio * i.cant * f; }); }); return Object.entries(m).map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v); };
    const aggU = key => { const m = {}; vs.forEach(v => v.items.forEach(i => { const k = key(i) || '—'; m[k] = (m[k] || 0) + i.cant; })); return Object.entries(m).map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v); };
    const pagos = {}; vs.forEach(v => pagos[v.pago.metodo] = (pagos[v.pago.metodo] || 0) + v.total);
    const vendidos = new Set(vs.flatMap(v => v.items.map(i => i.pid)));
    const quietos = activos().filter(p => stockTotal(p) > 0 && !vendidos.has(p.id)).sort((a, b) => stockTotal(b) * b.costo - stockTotal(a) * a.costo);
    const invCat = {}; activos().forEach(p => { const k = p.categoria || '—', s = Math.max(0, stockTotal(p)); invCat[k] = invCat[k] || { u: 0, c: 0, p: 0 }; invCat[k].u += s; invCat[k].c += s * p.costo; invCat[k].p += s * p.precio; });
    const inv = valorInventario();
    const pers = [['hoy', 'Hoy'], ['7', '7 días'], ['30', '30 días'], ['mes', 'Este mes'], ['mesant', 'Mes anterior'], ['anio', 'Este año'], ['custom', 'Personalizado']];
    return `<div class="toolbar"><div class="seg" id="rPer">${pers.map(([k, l]) => `<button data-p="${k}" class="${RF.per === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      ${RF.per === 'custom' ? `<input class="inp" type="date" id="rD" value="${d}"><input class="inp" type="date" id="rH" value="${h}">` : `<span class="muted small">${fFecha(d + 'T12:00')} – ${fFecha(h + 'T12:00')}</span>`}
      <span class="sp"></span><button class="btn" id="rExp">${ic('down')} Exportar ranking</button></div>
    <div class="grid g4">
      <div class="card kpi acc"><div class="l">Ventas</div><div class="v">${money(total)}</div><div class="s">${vs.length} ventas · ${int(unidades)} prendas</div></div>
      <div class="card kpi"><div class="l">Ganancia bruta</div><div class="v">${money(gan)}</div><div class="s">margen ${pct(total ? gan / total : 0)} · costo ${money(costo)}</div></div>
      <div class="card kpi"><div class="l">Utilidad (− gastos)</div><div class="v ${gan - gastos < 0 ? 'down' : ''}">${money(gan - gastos)}</div><div class="s">gastos de caja ${money(gastos)}</div></div>
      <div class="card kpi"><div class="l">Ticket promedio</div><div class="v">${money(vs.length ? total / vs.length : 0)}</div><div class="s">${(vs.length ? unidades / vs.length : 0).toFixed(1).replace('.', ',')} prendas por venta</div></div></div>
    <div class="card mt"><h3>Ventas ${days <= 62 ? 'por día' : 'por mes'}</h3>${serie.length ? barras(serie) : '<p class="muted">Sin ventas.</p>'}</div>
    <div class="card mt"><h3>Ranking de productos</h3>${top.length ? `<div class="tw" style="max-height:380px"><table class="t"><thead><tr><th>#</th><th>Producto</th><th>Categoría</th><th class="r">Unidades</th><th class="r">Ventas</th><th class="r">Ganancia</th><th class="r">Stock actual</th></tr></thead><tbody>
      ${top.map((t, i) => { const p = prodById(t.pid); return `<tr><td class="muted">${i + 1}</td><td><b>${esc(t.nombre)}</b> <span class="muted small">${esc(t.ref)}</span></td><td>${esc(p?.categoria || t.cat || '')}</td><td class="r b">${int(t.unidades)}</td><td class="r">${money(t.total)}</td><td class="r up">${money(t.ganancia)}</td><td class="r">${p ? int(stockTotal(p)) : '—'}</td></tr>`; }).join('')}</tbody></table></div>` : '<p class="muted">Sin ventas en el período.</p>'}</div>
    <div class="grid g3 mt">
      <div class="card"><h3>Por categoría</h3>${hbars(agg(i => i.categoria))}</div>
      <div class="card"><h3>Tallas más vendidas</h3>${hbars(aggU(i => i.talla), v => int(v) + ' und')}</div>
      <div class="card"><h3>Medios de pago</h3>${hbars(Object.entries(pagos).map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v))}</div></div>
    <div class="grid g2 mt">
      <div class="card"><h3>Inventario por categoría</h3><table class="t"><thead><tr><th>Categoría</th><th class="r">Prendas</th><th class="r">Valor costo</th><th class="r">Valor venta</th></tr></thead><tbody>
        ${Object.entries(invCat).sort((a, b) => b[1].c - a[1].c).map(([k, x]) => `<tr><td>${esc(k)}</td><td class="r">${int(x.u)}</td><td class="r">${money(x.c)}</td><td class="r">${money(x.p)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Total</td><td class="r">${int(inv.unidades)}</td><td class="r">${money(inv.costo)}</td><td class="r">${money(inv.precio)}</td></tr></tfoot></table></div>
      <div class="card"><h3>Sin ventas en el período <span class="badge sp">${quietos.length}</span></h3><p class="muted small" style="margin-top:0">Productos con stock que no se vendieron: candidatos a promoción.</p>
        ${quietos.length ? `<div class="tw" style="max-height:300px"><table class="t"><tbody>${quietos.map(p => `<tr><td><div class="pcell">${thumb(p)}<div><b>${esc(p.nombre)}</b><small>${esc(p.ref)}</small></div></div></td><td class="r">${int(stockTotal(p))} und</td><td class="r muted">${money(stockTotal(p) * p.costo)} parado</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Todo lo que tiene stock se vendió al menos una vez. ✓</p>'}</div></div>`;
  },
  bind(m) {
    $$('#rPer button', m).forEach(b => b.onclick = () => { RF.per = b.dataset.p; if (RF.per === 'custom' && !RF.desde) { [RF.desde, RF.hasta] = periodo('mes'); } render(); });
    if ($('#rD', m)) { $('#rD', m).onchange = e => { RF.desde = e.target.value; render(); }; $('#rH', m).onchange = e => { RF.hasta = e.target.value; render(); }; }
    $('#rExp', m).onclick = () => { const [d, h] = periodo(RF.per); exportCSV(`ranking-${d}_${h}.csv`, [['Puesto', 'Referencia', 'Producto', 'Unidades', 'Ventas', 'Ganancia'], ...topProductos(ventasEn(d, h)).map((t, i) => [i + 1, t.ref, t.nombre, t.unidades, Math.round(t.total), Math.round(t.ganancia)])]); };
  }
};

/* =========================================================
   CONFIGURACIÓN
   ========================================================= */
V.config = {
  title: 'Configuración',
  html() {
    const c = cfg();
    const tagList = (id, arr) => `<div class="tags" id="${id}">${arr.map((x, i) => `<span class="tag">${esc(x)}<button data-i="${i}" title="Quitar">×</button></span>`).join('')}<input class="inp" placeholder="+ agregar y Enter"></div>`;
    return `<div class="grid g2">
      <div class="card"><h3>Datos del negocio</h3><div class="fgrid">
        <label class="f">Nombre<input class="inp" data-k="negocio" value="${esc(c.negocio)}"></label><label class="f">Lema / subtítulo<input class="inp" data-k="lema" value="${esc(c.lema)}"></label>
        <label class="f">NIT / documento<input class="inp" data-k="nit" value="${esc(c.nit)}"></label><label class="f">Teléfono<input class="inp" data-k="telefono" value="${esc(c.telefono)}"></label>
        <label class="f">Dirección<input class="inp" data-k="direccion" value="${esc(c.direccion)}"></label><label class="f">Instagram<input class="inp" data-k="instagram" value="${esc(c.instagram)}"></label>
        <label class="f s2">Mensaje al pie del ticket<textarea class="inp" data-k="pieTicket">${esc(c.pieTicket)}</textarea></label></div></div>
      <div class="card"><h3>Marca</h3><div style="display:grid;grid-template-columns:160px 1fr;gap:16px">
        <div><div class="photo" id="cLogo" style="background:#fff">${c.logo ? `<img src="${c.logo}" style="object-fit:contain">` : 'Subir logo<br>(PNG)'}</div><input type="file" id="cLogoF" accept="image/*" hidden>${c.logo ? '<button class="btn sm ghost" id="cLogoX" style="width:100%;margin-top:6px">Quitar logo</button>' : ''}</div>
        <div class="fgrid" style="grid-template-columns:1fr"><label class="f">Color de acento<input type="color" data-k="acento" value="${esc(c.acento)}" style="width:80px;height:38px;border:0;background:none;cursor:pointer"></label>
        <label class="chk"><input type="checkbox" id="cSnd" ${c.sonidoIntro !== false ? 'checked' : ''}> Sonido en la animación de entrada</label>
        <label class="f">Prefijo de referencias<input class="inp" data-k="prefijo" value="${esc(c.prefijo)}" style="width:120px"></label>
        <label class="f"><span>Stock mínimo por defecto <span class="h">alerta cuando una talla llega a esta cantidad</span></span><input class="inp" type="number" min="0" data-k="stockMin" value="${c.stockMin}" style="width:120px"></label></div></div></div>
    </div>
    <div class="card mt"><h3>Listas</h3><div class="fgrid" style="grid-template-columns:1fr 1fr">
      <div><div class="small b" style="margin-bottom:6px">Categorías</div>${tagList('lCat', c.categorias)}</div><div><div class="small b" style="margin-bottom:6px">Colores frecuentes</div>${tagList('lCol', c.colores)}</div>
      <div><div class="small b" style="margin-bottom:6px">Medios de pago</div>${tagList('lMet', c.metodos)}</div><div></div>
      <div class="s2"><div class="small b" style="margin-bottom:6px">Tallas (Colombia) <span class="muted" style="font-weight:400">— por grupo; al crear un producto se sugiere el grupo según su categoría</span></div>${c.gruposTallas.map((g, i) => `<div class="tgrp"><span class="tg-n">${esc(g.nombre)}</span>${tagList('lG' + i, g.tallas)}</div>`).join('')}</div></div></div>
    <div class="card mt"><h3>Costos adicionales de producto</h3>
      <p class="muted" style="margin-top:0">Marquillas, etiquetas, bolsas, envíos… Al editar un producto marcas los que lleva y su valor se suma al precio de venta (y cuenta como costo en la ganancia).</p>
      <table class="t" style="max-width:640px"><thead><tr><th>Costo</th><th class="r">Valor por unidad</th><th class="r">Productos</th><th></th></tr></thead><tbody>
      ${(c.costosExtra || []).map((e, i) => `<tr><td><input class="inp" data-cx="${i}" data-f="nombre" value="${esc(e.nombre)}"></td><td class="r"><input class="inp" type="number" min="0" step="50" data-cx="${i}" data-f="valor" value="${n0(e.valor)}" style="width:130px"></td>
      <td class="r">${DB.productos.filter(p => (p.extras || []).some(x => x.id === e.id)).length}</td><td><button class="ibtn" data-cxdel="${i}" title="Quitar">${ic('trash')}</button></td></tr>`).join('')}</tbody>
      <tfoot><tr><td><input class="inp" id="cxN" placeholder="+ nuevo costo (ej: Empaque regalo)"></td><td class="r"><input class="inp" type="number" min="0" step="50" id="cxV" placeholder="0" style="width:130px"></td><td colspan="2"><button class="btn sm pri" id="cxAdd">${ic('plus')} Agregar</button></td></tr></tfoot></table></div>
    <div class="card mt"><h3>Datos y respaldos</h3>
      <p class="muted" style="margin-top:0">Todo se guarda automáticamente en este computador, con un respaldo diario (se conservan los últimos 60 días).<br><span class="small" id="cPath"></span></p>
      <div class="toolbar"><button class="btn pri" id="cExp">${ic('down')} Exportar respaldo</button><button class="btn" id="cImp">Restaurar respaldo</button><button class="btn" id="cDir">Abrir carpeta de datos</button>
      <span class="sp"></span><button class="btn" id="cDemo">Cargar ejemplo</button><button class="btn danger" id="cBorrar">Borrar todo</button></div>
      <p class="note">Consejo: exporta un respaldo cada semana a una USB o a Google Drive. Si se daña el computador, con ese archivo recuperas todo.</p></div>
    ${bridge.appVersion ? `<div class="card mt"><h3>Versión de la app</h3><p class="muted" style="margin-top:0">La app se actualiza sola desde internet: al abrirla y cada 30 minutos busca una versión nueva. Actualizar no toca tus datos.<br><span class="small" id="cVer"></span></p>
      <div class="toolbar"><button class="btn" id="cUpd">Buscar actualización</button></div></div>` : ''}`;
  },
  bind(m) {
    const c = cfg();
    bridge.dataPath().then(p => { const e = $('#cPath', m); if (e) e.textContent = 'Archivo: ' + p; });
    $$('[data-k]', m).forEach(i => i.onchange = async () => {
      c[i.dataset.k] = i.type === 'number' ? n0(i.value) : i.value; await save();
      if (['negocio', 'lema', 'acento'].includes(i.dataset.k)) { const s = $('#main').scrollTop; render(); $('#main').scrollTop = s; }
      toast('Guardado');
    });
    const cxUsan = id => DB.productos.filter(p => (p.extras || []).some(x => x.id === id));
    const cxRepintar = () => { const s = $('#main').scrollTop; render(); $('#main').scrollTop = s; };
    $$('[data-cx]', m).forEach(i => i.onchange = async () => {
      const e = c.costosExtra[+i.dataset.cx], usan = cxUsan(e.id);
      if (i.dataset.f === 'nombre') {
        const v = i.value.trim(); if (!v) { toast('Escribe el nombre', 'bad'); i.value = e.nombre; return; }
        e.nombre = v; usan.forEach(p => p.extras.forEach(x => { if (x.id === e.id) x.nombre = v; }));
        await save(); toast('Guardado'); return;
      }
      e.valor = Math.max(0, n0(i.value)); await save();
      if (usan.length && await ask(`<b>${usan.length}</b> productos llevan <b>${esc(e.nombre)}</b>. ¿Actualizar su precio de venta con el nuevo valor (${money(e.valor)})?<br><span class="muted small">Si no, conservan el valor anterior hasta que los edites.</span>`, { ok: 'Actualizar precios', title: 'Costos adicionales' })) {
        usan.forEach(p => { p.extras.forEach(x => { if (x.id === e.id) x.valor = e.valor; }); p.precio = n0(p.precioBase ?? p.precio) + extrasTot(p); });
        await save(); toast(`${usan.length} precios actualizados`);
      } else toast('Guardado');
      cxRepintar();
    });
    $$('[data-cxdel]', m).forEach(b => b.onclick = async () => {
      const e = c.costosExtra[+b.dataset.cxdel], usan = cxUsan(e.id);
      if (!await ask(`¿Quitar <b>${esc(e.nombre)}</b> de la lista?${usan.length ? `<br>${usan.length} productos lo llevan: conservan su precio hasta que lo desmarques al editarlos.` : ''}`, { ok: 'Quitar', danger: true })) return;
      c.costosExtra.splice(+b.dataset.cxdel, 1); await save(); cxRepintar();
    });
    $('#cxAdd', m).onclick = async () => {
      const n = $('#cxN', m).value.trim(); if (!n) { toast('Escribe el nombre del costo', 'bad'); $('#cxN', m).focus(); return; }
      if (c.costosExtra.some(x => norm(x.nombre) === norm(n))) { toast('Ya existe', 'bad'); return; }
      c.costosExtra.push({ id: uid(), nombre: n, valor: Math.max(0, n0($('#cxV', m).value)) }); await save(); toast('Costo agregado'); cxRepintar();
    };
    $('#cxN', m).onkeydown = $('#cxV', m).onkeydown = e => { if (e.key === 'Enter') $('#cxAdd', m).click(); };
    $('#cSnd', m).onchange = async e => { c.sonidoIntro = e.target.checked; await save(); toast(e.target.checked ? 'Sonido de entrada activado' : 'Sonido de entrada desactivado'); };
    $('#cLogo', m).onclick = () => $('#cLogoF', m).click();
    $('#cLogoF', m).onchange = async e => { const f = e.target.files[0]; if (!f) return; c.logo = await leerImagen(f, 500, 'image/png'); await save(); render(); };
    if ($('#cLogoX', m)) $('#cLogoX', m).onclick = async () => { c.logo = ''; await save(); render(); };
    [['lCat', c.categorias], ['lCol', c.colores], ['lMet', c.metodos], ...c.gruposTallas.map((g, i) => ['lG' + i, g.tallas, true])].forEach(([id, arr, esTalla]) => {
      const box = $('#' + id, m);
      $$('button', box).forEach(b => b.onclick = async () => {
        if (arr === c.metodos && c.metodos.length <= 1) { toast('Debe quedar al menos un medio de pago', 'bad'); return; }
        arr.splice(+b.dataset.i, 1); await save(); const s = $('#main').scrollTop; render(); $('#main').scrollTop = s;
      });
      $('input', box).onkeydown = async e => {
        if (e.key !== 'Enter') return; const v = e.target.value.trim(); if (!v) return;
        const val = esTalla ? v.toUpperCase() : v;
        if (arr.some(x => norm(x) === norm(val))) { toast('Ya existe', 'bad'); return; }
        arr.push(val); if (esTalla && arr.every(x => !isNaN(x))) arr.sort((a, b) => a - b);
        await save(); const s = $('#main').scrollTop; render(); $('#main').scrollTop = s; $(`#${id} input`).focus();
      };
    });
    $('#cExp', m).onclick = async () => { if (await bridge.exportBackup(JSON.stringify(DB, null, 1), `UrbanJ-respaldo-${hoyK()}.json`)) toast('Respaldo exportado'); };
    $('#cImp', m).onclick = async () => {
      const s = await bridge.importBackup(); if (!s) return;
      let d; try { d = JSON.parse(s); } catch (e) { toast('El archivo no es un respaldo válido', 'bad'); return; }
      if (!d || !Array.isArray(d.productos)) { toast('El archivo no es un respaldo de Urban J', 'bad'); return; }
      if (!await ask(`El respaldo tiene <b>${d.productos.length}</b> productos y <b>${(d.ventas || []).length}</b> ventas. Reemplazará <b>todos</b> los datos actuales.`, { ok: 'Restaurar', danger: true })) return;
      DB = fixDB(d); await save(); toast('Respaldo restaurado'); go('inicio');
    };
    $('#cDir', m).onclick = () => bridge.openDataDir();
    if ($('#cUpd', m)) {
      const verTxt = async () => { const v = await bridge.appVersion(); const e = $('#cVer', m); if (e) e.textContent = v.fecha ? `Versión del ${fHora(v.fecha)}${v.instalada ? ' (la del instalador)' : ''}${v.lista ? ' · hay una nueva lista' : ''}` : ''; };
      verTxt();
      $('#cUpd', m).onclick = async () => {
        const b = $('#cUpd', m); b.disabled = true; b.textContent = 'Buscando…';
        const r = await bridge.checkUpdate();
        b.disabled = false; b.textContent = 'Buscar actualización';
        if (r === 'lista') avisoActualizacion(); else toast(r === 'al-dia' ? 'Ya tienes la última versión' : 'No se pudo revisar (¿sin internet?)', r === 'al-dia' ? 'ok' : 'bad');
        verTxt();
      };
    }
    $('#cDemo', m).onclick = async () => { if (DB.productos.length && !await ask('Cargar el ejemplo <b>reemplaza todos los datos actuales</b>.', { ok: 'Cargar ejemplo', danger: true })) return; cargarDemo(); };
    $('#cBorrar', m).onclick = () => {
      const b = modal({ title: 'Borrar todo', body: `<p class="ask">Se eliminan productos, ventas, entradas, caja y proveedores. Se conserva la configuración (nombre, logo, listas).<br><br>Escribe <b>BORRAR</b> para confirmar. (Antes, exporta un respaldo si lo necesitas.)</p><input class="inp" id="bTxt" style="margin-top:10px">
        <div class="mfoot"><button class="btn ghost" data-close>Cancelar</button><button class="btn danger" id="bOk">Borrar todo</button></div>` });
      $('#bOk', b.el).onclick = async () => {
        if ($('#bTxt', b.el).value.trim().toUpperCase() !== 'BORRAR') { toast('Escribe BORRAR para confirmar', 'bad'); return; }
        const conf = { ...DB.config, seq: { prod: 1, venta: 1, compra: 1 } }; DB = emptyDB(); DB.config = conf;
        await save(); b.close(); toast('Datos borrados'); go('inicio');
      };
    };
  }
};

/* =========================================================
   DATOS DE EJEMPLO
   ========================================================= */
async function cargarDemo() {
  const conf = { ...DB.config, seq: { prod: 1, venta: 1, compra: 1 } };
  DB = emptyDB(); DB.config = conf;
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const daysAgo = (n, h = 12, mi = 0) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, mi, 0, 0); return d.toISOString(); };
  DB.proveedores = [['Textiles Medellín', 'Carlos Ruiz', '300 123 4567'], ['Estampados Bogotá', 'Laura Gómez', '310 987 6543'], ['Importadora Caps', 'Andrés Pinto', '315 555 0101']]
    .map(([nombre, contacto, telefono]) => ({ id: uid(), nombre, contacto, telefono, email: '', notas: '' }));
  const P = DB.proveedores;
  const items = [
    ['Camiseta Oversize Básica', 'Camisetas', 0, 22000, 55000, ['S', 'M', 'L', 'XL'], ['Negro', 'Blanco']],
    ['Camiseta Boxy City', 'Camisetas', 1, 26000, 65000, ['S', 'M', 'L', 'XL'], ['Negro', 'Beige']],
    ['Hoodie Essential', 'Hoodies', 0, 58000, 135000, ['S', 'M', 'L', 'XL'], ['Negro', 'Gris']],
    ['Hoodie Zip Urban', 'Hoodies', 0, 64000, 149000, ['M', 'L', 'XL'], ['Negro']],
    ['Jogger Cargo', 'Pantalones', 0, 48000, 115000, ['28', '30', '32', '34'], ['Negro', 'Verde']],
    ['Jean Baggy', 'Pantalones', 0, 55000, 129000, ['28', '30', '32', '34', '36'], ['Azul']],
    ['Short Mesh', 'Shorts', 1, 25000, 59000, ['S', 'M', 'L'], ['Negro', 'Blanco']],
    ['Chaqueta Varsity', 'Chaquetas', 0, 95000, 229000, ['M', 'L', 'XL'], ['Negro']],
    ['Gorra Snapback UJ', 'Gorras', 2, 18000, 49000, ['ÚNICA'], ['Negro', 'Blanco']],
    ['Gorra Trucker', 'Gorras', 2, 16000, 45000, ['ÚNICA'], ['Negro']],
    ['Medias Pack x3', 'Accesorios', 1, 9000, 25000, ['ÚNICA'], ['Blanco']],
    ['Riñonera Street', 'Accesorios', 2, 21000, 55000, ['ÚNICA'], ['Negro']]
  ];
  items.forEach(([nombre, categoria, pv, costo, precio, T, C]) => {
    const ref = `${conf.prefijo || 'UJ'}-${String(DB.config.seq.prod++).padStart(3, '0')}`;
    const p = { id: uid(), ref, nombre, categoria, proveedorId: P[pv].id, costo, precio, foto: '', notas: '', activo: true, creado: daysAgo(40), variantes: [] };
    C.forEach(col => T.forEach(t => p.variantes.push({ id: uid(), talla: t, color: col, sku: skuFor(ref, t, col), minimo: '', stock: 0 })));
    DB.productos.push(p);
    p.variantes.forEach(v => registrarMov(p, v, p.variantes.length <= 2 ? rnd(12, 20) : rnd(3, 9), 'inicial', { fecha: daysAgo(40, 9), nota: 'Stock inicial' }));
  });
  const metodos = ['Efectivo', 'Efectivo', 'Nequi', 'Nequi', 'Daviplata', 'Transferencia', 'Tarjeta'];
  const clientes = ['', '', '', 'Juan P.', 'Valentina', 'Sebas', '', 'Camila R.', ''];
  const ahora = new Date();
  for (let d = 35; d >= 0; d--) {
    if (d === 20) {
      const p1 = DB.productos[2], p2 = DB.productos[0], lines = [];
      [p1, p2].forEach(p => p.variantes.forEach(v => lines.push({ pid: p.id, vid: v.id, cant: rnd(3, 6), costo: p.costo })));
      const fecha = daysAgo(20, 10);
      const compra = { id: uid(), num: nextNum('compra', 'E', 4), fecha, proveedorId: P[0].id, factura: 'FV-2231', nota: 'Reposición', items: lines.map(l => { const p = prodById(l.pid); return { ...l, nombre: p.nombre, variante: varName(varById(p, l.vid)) }; }), total: sum(lines, l => l.cant * l.costo), anulada: false };
      lines.forEach(l => { const p = prodById(l.pid); registrarMov(p, varById(p, l.vid), l.cant, 'compra', { doc: compra.num, fecha, costo: l.costo }); });
      DB.compras.push(compra);
    }
    const n = rnd(d % 7 === 0 ? 2 : 0, d % 7 === 0 ? 6 : 4);
    const horas = Array.from({ length: n }, () => rnd(10, 20)).sort((a, b) => a - b);
    for (let k = 0; k < n; k++) {
      const fecha = daysAgo(d, horas[k], rnd(0, 59));
      if (new Date(fecha) > ahora) continue;
      const its = [];
      for (let j = 0, q = rnd(1, 3); j < q; j++) {
        const p = DB.productos[rnd(0, DB.productos.length - 1)], disp = p.variantes.filter(v => v.stock > 0 && !its.some(i => i.vid === v.id));
        if (!disp.length) continue;
        const v = disp[rnd(0, disp.length - 1)];
        its.push({ pid: p.id, vid: v.id, nombre: p.nombre, ref: p.ref, categoria: p.categoria, talla: v.talla, variante: varName(v), cant: Math.min(v.stock, rnd(1, 10) > 8 ? 2 : 1), precio: p.precio, costo: p.costo });
      }
      if (!its.length) continue;
      const subtotal = sum(its, i => i.precio * i.cant), descuento = rnd(1, 10) > 8 ? Math.round(subtotal * .1) : 0, total = subtotal - descuento;
      const metodo = metodos[rnd(0, metodos.length - 1)];
      const recibido = metodo === 'Efectivo' ? Math.ceil(total / 50000) * 50000 : total;
      const venta = { id: uid(), num: nextNum('venta', 'V', 5), fecha, cliente: clientes[rnd(0, clientes.length - 1)], items: its, subtotal, descuento, total, pago: { metodo, recibido, cambio: recibido - total }, cajaId: null, anulada: false };
      its.forEach(i => { const p = prodById(i.pid); registrarMov(p, varById(p, i.vid), -i.cant, 'venta', { doc: venta.num, fecha }); });
      DB.ventas.push(venta);
    }
  }
  DB.movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha));
  await save(); toast('Datos de ejemplo cargados'); go('inicio');
}

/* ---------- actualización automática (app de escritorio) ----------
   main.js baja la versión nueva de las pantallas y avisa aquí. Los datos no se tocan:
   antes de recargar se suben a la nube los cambios pendientes. */
async function aplicarActualizacion() {
  if (typeof nubeSubir === 'function' && NUBE.perfil) await nubeSubir().catch(() => {});
  bridge.applyUpdate();
}
function avisoActualizacion() {
  if ($('#updBar')) return;
  const b = document.createElement('div'); b.id = 'updBar'; b.className = 'upd-bar';
  b.innerHTML = `<span>✦ Hay una versión nueva de Urban J</span><button class="btn sm acc" id="updOk">Actualizar ahora</button><button class="ibtn" id="updX" title="Más tarde (se actualiza sola al volver a abrir la app)">×</button>`;
  document.body.appendChild(b);
  $('#updOk', b).onclick = aplicarActualizacion;
  $('#updX', b).onclick = () => { b.remove(); toast('Se actualizará al volver a abrir la app'); };
}
if (bridge.onUpdate) bridge.onUpdate(avisoActualizacion);

/* ---------- intro de apertura ---------- */
function introSplash() {
  const sp = $('#splash'); if (!sp) return;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let done = false, started = false;
  const snd = new Audio('intro.mp3'); snd.preload = 'auto'; snd.volume = 0.85;
  const apagar = () => { // si se salta la intro, el sonido se desvanece en vez de cortarse
    if (snd.paused) return;
    const v0 = snd.volume, t0 = performance.now();
    const paso = () => { const k = Math.min(1, (performance.now() - t0) / 450); snd.volume = v0 * (1 - k); if (k < 1) requestAnimationFrame(paso); else snd.pause(); };
    requestAnimationFrame(paso);
  };
  const salir = (saltada) => {
    if (done) return; done = true;
    if (saltada) apagar();
    sp.classList.remove('hold');
    sp.classList.add('out');
    bridge.splashDone && bridge.splashDone();
    const app = $('.app'); app.classList.add('enter');
    setTimeout(() => { sp.remove(); app.classList.remove('enter'); }, 1100);
    document.removeEventListener('keydown', saltar, true);
  };
  const saltar = e => { if (e.type === 'keydown') e.preventDefault(); salir(true); };
  sp.addEventListener('click', saltar);
  document.addEventListener('keydown', saltar, true);
  const arrancar = () => {
    if (started || done) return; started = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      sp.classList.remove('hold');
      if (!(DB && DB.config.sonidoIntro === false) && !reduce) snd.play().catch(() => {});
      setTimeout(() => salir(false), reduce ? 700 : 3300);
    }));
  };
  if (bridge.splashReady) { bridge.splashReady().then(arrancar); setTimeout(arrancar, 6000); }
  else arrancar();
  setTimeout(() => salir(false), 9000);   // seguro: la intro nunca se queda colgada (pestaña en segundo plano, etc.)
}
introSplash();

/* ---------- arranque ---------- */
(async function init() {
  let raw = null;
  try { raw = await bridge.load(); } catch (e) { /* sin datos */ }
  let d = null;
  if (raw) { try { d = JSON.parse(raw); } catch (e) { toast('No se pudieron leer los datos guardados', 'bad'); } }
  const migrar = !(d && d.config && d.config.marcaV2) || (d.config.acento === '#ff5a1f' && !d.config.logo);
  const migrarV3 = !(d && d.config && d.config.marcaV3);
  const migrarV4 = !(d && d.config && d.config.marcaV4) && !migrarV3;
  DB = fixDB(d);
  if (migrarV3) { // marca URBAN-J Boutique (brand board 22/10)
    const k = DB.config; k.marcaV4 = true; k.marcaV3 = true; k.marcaV2 = true;
    if (window.DEFAULT_LOGO) k.logo = window.DEFAULT_LOGO;
    k.acento = '#ff5757';
    if (/^URBAN J$/i.test(k.negocio)) k.negocio = 'URBAN-J';
    if (k.instagram === '@urbanj') k.instagram = '@urbanj_boutique';
    if (/^¡Gracias por tu compra!/.test(k.pieTicket)) k.pieTicket = emptyDB().config.pieTicket;
    raw = null;
  } else if (migrarV4) { // logo vectorial (SVG) en vez de PNG
    DB.config.marcaV4 = true;
    if (window.DEFAULT_LOGO && (!DB.config.logo || DB.config.logo.startsWith('data:image/png'))) DB.config.logo = window.DEFAULT_LOGO;
    raw = null;
  } else if (migrar) { // estrena la marca oficial en datos creados antes del logo
    DB.config.marcaV2 = true;
    if (!DB.config.logo && window.DEFAULT_LOGO) DB.config.logo = window.DEFAULT_LOGO;
    if (DB.config.acento === '#ff5a1f') DB.config.acento = '#d1a881';
    raw = null;
  }
  if (DB.config.lema === 'Streetwear') { DB.config.lema = 'Boutique'; raw = null; }
  if (DB.config.instagram === '@urbanj.boutique' || DB.config.instagram === '@urbanj') { DB.config.instagram = '@urbanj_boutique'; raw = null; } // usuario real de Instagram
  if (!raw && !NUBE.ok) await save();
  setSaved(true);
  await nubeIniciar();
  render();
})();
