/* ============================================================
   Orbit 360 · Capa de datos — store
   Interfaz ÚNICA de acceso a datos. Hoy persiste en localStorage
   sobre un seed ficticio. Mañana: misma API apuntando a backend
   (Firestore / REST). Los módulos NUNCA tocan localStorage directo.
   ============================================================ */
window.Orbit = window.Orbit || {};
Orbit.store = (function () {
  const KEY = 'orbit360_db';
  let db = null;
  let listeners = [];

  function _load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { console.warn('[store] load fail', e); }
    return null;
  }
  function _persist() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch (e) { console.warn('[store] persist fail', e); }
  }
  function _emit(collection) {
    listeners.forEach(l => { try { l(collection); } catch (e) {} });
  }

  const api = {
    /** Inicializa: usa datos guardados o siembra desde seed (si cambia la versión). */
    init(seed) {
      const saved = _load();
      if (saved && saved.__v === seed.__v) {
        db = saved;
      } else {
        db = JSON.parse(JSON.stringify(seed));
        _persist();
      }
      return api;
    },
    /** Vuelve a sembrar (descarta cambios locales). */
    reseed(seed) {
      db = JSON.parse(JSON.stringify(seed));
      _persist(); _emit('*');
      return api;
    },
    /** Todas las filas de una colección. */
    all(c) { return (db[c] || []).slice(); },
    /** Fila por id. */
    get(c, id) { return (db[c] || []).find(r => r.id === id) || null; },
    /** Filtro por predicado. */
    where(c, fn) { return (db[c] || []).filter(fn); },
    /** Primer match. */
    find(c, fn) { return (db[c] || []).find(fn) || null; },
    /** Inserta y persiste. */
    insert(c, row) {
      (db[c] = db[c] || []).push(row); _persist(); _emit(c); return row;
    },
    /** Patch por id. */
    update(c, id, patch) {
      const r = api.get(c, id); if (!r) return null;
      Object.assign(r, patch); _persist(); _emit(c); return r;
    },
    /** Elimina por id. */
    remove(c, id) {
      db[c] = (db[c] || []).filter(r => r.id !== id); _persist(); _emit(c);
    },
    /** Suscripción a cambios. Devuelve función para desuscribir. */
    on(fn) { listeners.push(fn); return () => { listeners = listeners.filter(l => l !== fn); }; },
    /** Emite un evento de cambio manualmente (público para la capa backend). */
    _emit(c) { _emit(c || '*'); },
    /** Preferencia / config KV (backend-swappable). Los módulos usan esto en vez de localStorage directo. */
    pref(key, def) {
      if (!db) return def === undefined ? null : def;
      db.__prefs = db.__prefs || {};
      return (key in db.__prefs) ? db.__prefs[key] : (def === undefined ? null : def);
    },
    /** Guarda una preferencia / config KV y persiste. */
    setPref(key, val) {
      if (!db) return val;
      db.__prefs = db.__prefs || {};
      db.__prefs[key] = val; _persist(); return val;
    },
    /** Acceso crudo (lectura). */
    raw() { return db; }
  };
  return api;
})();
