'use strict';
/* =========================================================
   URBAN J · Nube (Supabase): usuarios, roles y tiempo real
   - Cada registro (producto, venta, caja…) es un documento en la tabla docs.
   - save() sube solo lo que cambió; los otros equipos lo reciben al instante.
   - Sin internet: se guarda en el equipo y se sube al volver la conexión.
   - El stock de cada talla = suma de sus movimientos (no se pisa entre equipos).
   ========================================================= */
const NUBE = {
  sb: null, perfil: null, snap: new Map(), canal: null, subiendo: null, otraVez: false, online: true,
  ARR: ['proveedores', 'productos', 'movimientos', 'compras', 'ventas', 'cajas', 'cajaMovs', 'inversiones'],
  VEND: ['ventas', 'movimientos', 'cajas', 'cajaMovs'],   // lo único que sube un vendedor (el stock sale de los movimientos)
  get ok() { return !!(window.NUBE_CFG && NUBE_CFG.url && NUBE_CFG.key); },
  get admin() { return !NUBE.ok || NUBE.perfil?.rol === 'admin'; },
  email: u => `${String(u).trim().toLowerCase().replace(/[^a-z0-9._-]/g, '')}@urbanj.app`
};
const ADM = () => NUBE.admin;

function nubeCliente(persist = true) {
  return supabase.createClient(NUBE_CFG.url, NUBE_CFG.key, { auth: { persistSession: persist, autoRefreshToken: persist, storageKey: 'uj_sesion' } });
}

/* ---------- documentos <-> DB ---------- */
function docsDe(db) {
  const m = new Map();
  m.set('config/main', JSON.stringify(db.config));
  for (const c of NUBE.ARR) for (const x of db[c] || []) m.set(c + '/' + x.id, JSON.stringify(x));
  return m;
}
function dbDesde(rows) {
  const d = emptyDB(); for (const c of NUBE.ARR) d[c] = [];
  let conf = null;
  for (const r of rows) { if (r.col === 'config') conf = r.data; else if (d[r.col]) d[r.col].push(r.data); }
  if (conf) d.config = conf;
  for (const c of NUBE.ARR) d[c].sort((a, b) => String(a.fecha || a.abiertaEn || a.creado || '').localeCompare(String(b.fecha || b.abiertaEn || b.creado || '')));
  return d;
}
function recalcularStock(db) {
  const s = new Map();
  for (const m of db.movimientos) { const k = m.productoId + '|' + m.varianteId; s.set(k, (s.get(k) || 0) + n0(m.cantidad)); }
  for (const p of db.productos) for (const v of p.variantes || []) v.stock = s.get(p.id + '|' + v.id) || 0;
}

/* ---------- pendientes (cambios sin subir, sobreviven a cerrar la app) ---------- */
const PEND = {
  get() { try { return JSON.parse(localStorage.getItem('uj_pend') || '{}'); } catch (e) { return {}; } },
  set(o) { try { localStorage.setItem('uj_pend', JSON.stringify(o)); } catch (e) { /* lleno */ } }
};

async function nubeBajarTodo() {
  const rows = [];
  for (let i = 0; ; i += 1000) {
    const { data, error } = await NUBE.sb.from('docs').select('col,id,data').range(i, i + 999);
    if (error) throw error;
    rows.push(...data); if (data.length < 1000) break;
  }
  return rows;
}

/* Sube a la nube los documentos que cambiaron desde la última vez */
async function nubeSubir() {
  if (!NUBE.sb || !NUBE.perfil) return true;
  if (NUBE.subiendo) { NUBE.otraVez = true; return NUBE.subiendo; }
  NUBE.subiendo = (async () => {
    const ahora = docsDe(DB), pend = PEND.get();
    const up = [], del = [];
    for (const [k, s] of ahora) if (NUBE.snap.get(k) !== s) { const [col, ...r] = k.split('/'); if (!ADM() && !NUBE.VEND.includes(col)) continue; up.push({ col, id: r.join('/'), data: JSON.parse(s), updated_at: new Date().toISOString() }); pend[k] = s; }
    if (ADM()) for (const k of NUBE.snap.keys()) if (!ahora.has(k)) { del.push(k); pend[k] = null; }
    PEND.set(pend);
    let ok = true;
    try {
      for (let i = 0; i < up.length; i += 200) { const { error } = await NUBE.sb.from('docs').upsert(up.slice(i, i + 200)); if (error) throw error; }
      for (const k of del) { const [col, ...r] = k.split('/'); const { error } = await NUBE.sb.from('docs').delete().match({ col, id: r.join('/') }); if (error) throw error; }
      for (const r of up) NUBE.snap.set(r.col + '/' + r.id, JSON.stringify(r.data));
      for (const k of del) NUBE.snap.delete(k);
      PEND.set({});
    } catch (e) { ok = false; console.warn('[nube] sin subir', e && (e.message || JSON.stringify(e))); }
    nubeEstado(ok);
    return ok;
  })();
  const r = await NUBE.subiendo; NUBE.subiendo = null;
  if (NUBE.otraVez) { NUBE.otraVez = false; return nubeSubir(); }
  return r;
}

function nubeEstado(ok) {
  NUBE.online = ok;
  const s = $('#saveState'); if (!s) return;
  s.className = ok ? 'ok' : 'bad';
  s.textContent = ok ? 'En la nube · ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : 'Sin conexión · se subirá al volver';
}

/* ---------- tiempo real ---------- */
let refrescoT = null;
function aplicarRemoto(col, id, data) {
  const k = col + '/' + id, s = data ? JSON.stringify(data) : null;
  if (s === (NUBE.snap.get(k) ?? null)) return;           // eco de un cambio propio
  if (data) NUBE.snap.set(k, s); else NUBE.snap.delete(k);
  if (col === 'config') { if (data) DB.config = fixDB({ config: data }).config; }
  else if (DB[col]) {
    const i = DB[col].findIndex(x => x.id === id);
    if (!data) { if (i >= 0) DB[col].splice(i, 1); }
    else if (i >= 0) DB[col][i] = data; else DB[col].push(data);
  }
  clearTimeout(refrescoT); refrescoT = setTimeout(refrescarVista, 250);
}
function refrescarVista() {
  recalcularStock(DB);
  bridge.save(JSON.stringify(DB)).catch(() => {});
  const ae = document.activeElement, escribiendo = ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && ae.closest('#main');
  if ($('.ov') || escribiendo) { NUBE.refrescar = true; return; }       // no interrumpir: al cerrar el diálogo / salir del campo
  if (VIEW === 'vender' && typeof drawPosGrid === 'function') { drawPosGrid(); return; }
  const st = $('#main')?.scrollTop || 0; render(); if ($('#main')) $('#main').scrollTop = st;
}
document.addEventListener('focusout', () => setTimeout(() => { if (NUBE.refrescar && !$('.ov')) { NUBE.refrescar = false; refrescarVista(); } }, 50));

async function nubeEscuchar() {
  if (NUBE.canal) NUBE.sb.removeChannel(NUBE.canal);
  try { const { data } = await NUBE.sb.auth.getSession(); if (data.session) await NUBE.sb.realtime.setAuth(data.session.access_token); } catch (e) { /* sin red: se reintenta al reconectar */ }
  NUBE.canal = NUBE.sb.channel('docs').on('postgres_changes', { event: '*', schema: 'public', table: 'docs' }, async p => {
    if (p.eventType === 'DELETE') { aplicarRemoto(p.old.col, p.old.id, null); return; }
    let data = p.new && p.new.data;
    if (!data) { const r = await NUBE.sb.from('docs').select('data').match({ col: p.new.col, id: p.new.id }).maybeSingle(); data = r.data && r.data.data; }
    if (data) aplicarRemoto(p.new.col, p.new.id, data);
  }).subscribe(st => {
    if (st === 'SUBSCRIBED') nubeSync().catch(() => {});                    // al reconectar, ponerse al día
    if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') nubeEstado(false);
  });
}

/* Trae todo de la nube, mantiene lo pendiente propio y sube lo que falte */
async function nubeSync() {
  const rows = await nubeBajarTodo();
  const pend = PEND.get();
  NUBE.snap = new Map(rows.map(r => [r.col + '/' + r.id, JSON.stringify(r.data)]));
  const m = new Map(rows.map(r => [r.col + '/' + r.id, r]));
  for (const [k, s] of Object.entries(pend)) { const [col, ...id] = k.split('/'); if (s === null) m.delete(k); else m.set(k, { col, id: id.join('/'), data: JSON.parse(s) }); }
  const conf = DB && DB.config;
  DB = fixDB(dbDesde([...m.values()]));
  if (!rows.some(r => r.col === 'config') && conf) DB.config = conf;       // nube vacía: conservar marca/config
  recalcularStock(DB);
  await bridge.save(JSON.stringify(DB)).catch(() => {});
  if (Object.keys(pend).length || !rows.some(r => r.col === 'config')) await nubeSubir(); else nubeEstado(true);
  if (typeof render === 'function' && $('#main')?.innerHTML) refrescarVista();
}
setInterval(() => { if (NUBE.perfil && !NUBE.online) nubeSubir(); }, 15000);
window.addEventListener('online', () => { if (NUBE.perfil) nubeSync().catch(() => nubeEstado(false)); });

/* ---------- inicio de sesión ---------- */
async function cargarPerfil() {
  const { data: { user } } = await NUBE.sb.auth.getUser();
  if (!user) return null;
  const { data, error } = await NUBE.sb.from('perfiles').select('*').eq('id', user.id).maybeSingle();
  if (error) throw error;
  return data;
}
function pantallaLogin(msg) {
  return new Promise(res => {
    const o = document.createElement('div'); o.className = 'login';
    o.innerHTML = `<form class="lcard"><img src="${cfg().logo || ''}" alt=""><h2>Iniciar sesión</h2>
      <label class="f">Usuario<input class="inp" id="lgU" autocomplete="username" required></label>
      <label class="f">Contraseña<input class="inp" id="lgP" type="password" autocomplete="current-password" required></label>
      <p class="lerr" id="lgE">${esc(msg || '')}</p>
      <button class="btn pri" id="lgB">Entrar</button>
      <p class="muted small" style="text-align:center;margin:10px 0 0">¿Primera vez? <a href="#" id="lgN">Crear la cuenta del administrador</a></p></form>`;
    document.body.appendChild(o); setTimeout(() => $('#lgU', o).focus(), 50);
    let crear = false;
    $('#lgN', o).onclick = e => { e.preventDefault(); crear = !crear; $('h2', o).textContent = crear ? 'Crear administrador' : 'Iniciar sesión'; $('#lgB', o).textContent = crear ? 'Crear y entrar' : 'Entrar'; $('#lgN', o).textContent = crear ? 'Ya tengo cuenta' : 'Crear la cuenta del administrador'; };
    $('form', o).onsubmit = async e => {
      e.preventDefault();
      const u = $('#lgU', o).value.trim(), p = $('#lgP', o).value, err = $('#lgE', o), b = $('#lgB', o);
      if (crear && p.length < 6) { err.textContent = 'La contraseña debe tener al menos 6 caracteres'; return; }
      b.disabled = true; err.textContent = '';
      try {
        const r = crear
          ? await NUBE.sb.auth.signUp({ email: NUBE.email(u), password: p, options: { data: { usuario: u.toLowerCase(), nombre: u } } })
          : await NUBE.sb.auth.signInWithPassword({ email: NUBE.email(u), password: p });
        if (r.error) throw r.error;
        if (!r.data.session) throw new Error('Supabase pide confirmar el correo: desactiva "Confirm email" en Authentication → Sign In / Providers → Email');
        const perfil = await cargarPerfil();
        if (!perfil || !perfil.activo) { await NUBE.sb.auth.signOut(); throw new Error(crear ? 'Ya existe un administrador. Pídele que te cree el usuario desde 👥 Usuarios.' : 'Este usuario está desactivado. Pídele al administrador que lo active.'); }
        o.remove(); res(perfil);
      } catch (ex) {
        b.disabled = false;
        const m = String(ex.message || ex);
        err.textContent = /Invalid login/i.test(m) ? 'Usuario o contraseña incorrectos' : /already registered/i.test(m) ? 'Ese usuario ya existe' : /fetch|network/i.test(m) ? 'Sin conexión a internet' : m;
      }
    };
  });
}

/* Llamado desde init(): conecta, pide sesión y trae los datos */
async function nubeIniciar() {
  if (!NUBE.ok) return;
  NUBE.sb = nubeCliente();
  let perfil = null;
  try { perfil = await cargarPerfil(); } catch (e) {
    // sin internet al abrir: usar la sesión y el rol guardados para seguir vendiendo
    try { perfil = JSON.parse(localStorage.getItem('uj_perfil') || 'null'); } catch (x) { perfil = null; }
  }
  if (!perfil || !perfil.activo) { if (perfil) await NUBE.sb.auth.signOut(); perfil = await pantallaLogin(); }
  NUBE.perfil = perfil;
  try { localStorage.setItem('uj_perfil', JSON.stringify(perfil)); } catch (e) { /* nada */ }
  if (!ADM() && !['vender', 'ventas', 'caja'].includes(VIEW)) VIEW = 'vender';
  try { await nubeSync(); } catch (e) { console.warn('[nube] sin conexión al abrir', e); nubeEstado(false); }
  nubeEscuchar();
  NUBE.sb.auth.onAuthStateChange((ev, ses) => { if (ev === 'SIGNED_OUT') location.reload(); if (ev === 'TOKEN_REFRESHED' && ses) NUBE.sb.realtime.setAuth(ses.access_token); });
}
async function cerrarSesion() {
  if (!await ask('¿Cerrar sesión en este equipo?', { ok: 'Cerrar sesión' })) return;
  await nubeSubir();
  try { localStorage.removeItem('uj_perfil'); } catch (e) { /* nada */ }
  await NUBE.sb.auth.signOut(); location.reload();
}

/* ---------- usuarios (solo administrador) ---------- */
async function gestionarUsuarios() {
  const m = modal({ title: 'Usuarios', size: 'wide', body: '<div id="usL"><p class="muted">Cargando…</p></div>' });
  const draw = async () => {
    const { data, error } = await NUBE.sb.from('perfiles').select('*').order('creado');
    if (error) { $('#usL', m.el).innerHTML = `<p class="note">${esc(error.message)}</p>`; return; }
    $('#usL', m.el).innerHTML = `<table class="t"><thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>
      ${data.map(u => `<tr><td class="b">${esc(u.usuario)}</td><td>${esc(u.nombre)}</td><td><span class="badge ${u.rol === 'admin' ? 'ink' : ''}">${u.rol === 'admin' ? 'Administrador' : 'Vendedor'}</span></td>
      <td><span class="badge ${u.activo ? 'ok' : 'bad'}">${u.activo ? 'Activo' : 'Desactivado'}</span></td>
      <td class="r">${u.id === NUBE.perfil.id ? '<span class="muted small">tú</span>' : `<button class="btn sm" data-rol="${u.id}" data-r="${u.rol}">${u.rol === 'admin' ? 'Hacer vendedor' : 'Hacer administrador'}</button> <button class="btn sm ${u.activo ? 'danger' : ''}" data-act="${u.id}" data-a="${u.activo}">${u.activo ? 'Desactivar' : 'Activar'}</button>`}</td></tr>`).join('')}</tbody></table>
      <h3 style="margin-top:22px">Nuevo usuario</h3>
      <div class="fgrid"><label class="f">Usuario (para entrar)<input class="inp" id="nuU" placeholder="ej: tienda"></label><label class="f">Nombre<input class="inp" id="nuN" placeholder="ej: Laura"></label>
      <label class="f">Contraseña (mín. 6)<input class="inp" id="nuP" type="text"></label><label class="f">Rol<select class="inp" id="nuR"><option value="vendedor">Vendedor (solo vende)</option><option value="admin">Administrador (todo)</option></select></label></div>
      <p class="muted small">El vendedor solo ve <b>Vender</b>, <b>Ventas</b> (sin ganancias) y <b>Caja</b>. No puede crear productos, ni ver costos, entradas o reportes.</p>
      <div class="mfoot"><button class="btn ghost" data-close>Cerrar</button><button class="btn pri" id="nuOk">${ic('plus')} Crear usuario</button></div>`;
    $$('[data-close]', m.el).forEach(b => b.onclick = m.close);
    $$('[data-rol]', m.el).forEach(b => b.onclick = async () => { const { error } = await NUBE.sb.from('perfiles').update({ rol: b.dataset.r === 'admin' ? 'vendedor' : 'admin' }).eq('id', b.dataset.rol); if (error) toast(error.message, 'bad'); draw(); });
    $$('[data-act]', m.el).forEach(b => b.onclick = async () => { const { error } = await NUBE.sb.from('perfiles').update({ activo: b.dataset.a !== 'true' }).eq('id', b.dataset.act); if (error) toast(error.message, 'bad'); draw(); });
    $('#nuOk', m.el).onclick = async () => {
      const u = $('#nuU', m.el).value.trim().toLowerCase(), n = $('#nuN', m.el).value.trim(), p = $('#nuP', m.el).value, rol = $('#nuR', m.el).value;
      if (!/^[a-z0-9._-]{3,}$/.test(u)) { toast('Usuario: mínimo 3 letras o números, sin espacios', 'bad'); return; }
      if (p.length < 6) { toast('La contraseña debe tener al menos 6 caracteres', 'bad'); return; }
      const tmp = nubeCliente(false);                                         // no cierra la sesión del admin
      const r = await tmp.auth.signUp({ email: NUBE.email(u), password: p, options: { data: { usuario: u, nombre: n } } });
      if (r.error) { toast(/already/i.test(r.error.message) ? 'Ese usuario ya existe' : r.error.message, 'bad'); return; }
      if (r.data.user) { const { error } = await NUBE.sb.from('perfiles').update({ rol, activo: true }).eq('id', r.data.user.id); if (error) { toast(error.message, 'bad'); return; } }
      toast(`Usuario "${u}" creado`); draw();
    };
  };
  draw();
}
