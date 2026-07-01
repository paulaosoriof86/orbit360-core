# Auditoria localStorage en modulos - Post Claude v1.55

- Fecha local: 2026-07-01 02:42:41
- Objetivo: identificar dependencias directas de localStorage que debe limpiar Claude en prototipo base.
- Restriccion: este reporte no modifica modulos.

Resultado: se encontraron usos directos de localStorage en modules.

- modules\automatizaciones.js linea 14: try { cfg = JSON.parse(localStorage.getItem(KEY_AUT) || '{}'); } catch(e) {}
- modules\automatizaciones.js linea 15: function saveCfg() { try { localStorage.setItem(KEY_AUT, JSON.stringify(cfg)); } catch(e) {} }
- modules\automatizaciones.js linea 16: const LOG = JSON.parse(localStorage.getItem('orbit360_aut_log') || '[]');
- modules\automatizaciones.js linea 17: function addLog(ev, canal, msg) { LOG.unshift({ ts: new Date().toISOString().slice(0,16).replace('T',' '), ev, canal, msg }); if (LOG.length > 50) LOG.pop(); try { localStorage.setItem('orbit360_aut_log', JSON.stringify(LOG)); } catch(e) {} }
- modules\configuracion.js linea 59: ${row('Logo del cliente', `<div style="display:flex;align-items:center;gap:10px"><span class="cfg-logo">${t.branding.logo ? `<img src="${U.esc(t.branding.logo)}">` : '🏢'}</span><button class="btn ghost sm" ${lock ? 'disabled' : ''} onclick="(function(){var fi=document.createElement('input');fi.type='file';fi.accept='image/*';fi.onchange=function(){var r=new FileReader();r.onload=function(e){try{localStorage.setItem('orbit360_logo',e.target.result);}catch(x){}try{var b=Orbit.tenant.get().branding||{};b.logo=e.target.result;Orbit.tenant.setDeep('branding',b);}catch(x){}if(Orbit.applyBrand)Orbit.applyBrand();var img=document.getElementById('cfg-logo-prev');if(img){img.src=e.target.result;img.style.display='inline-block';}var t=document.createElement('div');t.className='ciclo-toast';t.textContent='\u2713 Logo aplicado en cintilla y login';document.body.appendChild(t);setTimeout(function(){t.remove();},2600);};r.readAsDataURL(fi.files[0]);};fi.click();})()">Subir logo</button><button class="btn ghost sm" ${lock ? 'disabled' : ''} onclick="(function(){try{localStorage.removeItem('orbit360_logo');var b=Orbit.tenant.get().branding||{};b.logo='';Orbit.tenant.setDeep('branding',b);}catch(x){}if(Orbit.applyBrand)Orbit.applyBrand();})()">Quitar</button><img id="cfg-logo-prev" style="height:36px;border-radius:6px;margin-left:8px;vertical-align:middle;display:none"></div>`, 'Se refleja en la cintilla y el login. Sube el logo del cliente para white-label.')}
- modules\configuracion.js linea 174: ${items.map(([id, t2, d]) => { const on = !!t.addons[id]; const cfgd = (() => { try { return !!JSON.parse(localStorage.getItem('orbit360_integ_' + id) || '{}').key; } catch (e) { return false; } })(); return `<div class="cfg-addon ${on ? 'on' : ''}">
- modules\configuracion.js linea 263: function loadCustomPlans() { try { const r = localStorage.getItem(PKEY); if (r) return JSON.parse(r); } catch (e) {} return []; }
- modules\configuracion.js linea 264: function saveCustomPlans(d) { try { localStorage.setItem(PKEY, JSON.stringify(d)); } catch (e) {} }
- modules\configuracion.js linea 306: const logo = (t.branding && t.branding.logo) || (function () { try { return localStorage.getItem('orbit360_logo'); } catch (e) { return ''; } })();
- modules\configuracion.js linea 392: const arr = JSON.parse(localStorage.getItem(KEY) || '[]');
- modules\configuracion.js linea 394: localStorage.setItem(KEY, JSON.stringify(arr));
- modules\configuracion.js linea 405: const saved = (() => { try { return JSON.parse(localStorage.getItem('orbit360_integ_' + nombre) || '{}'); } catch (e) { return {}; } })();
- modules\configuracion.js linea 429: try { localStorage.setItem('orbit360_integ_' + nombre, JSON.stringify(data)); } catch (e) {}
- modules\cotizador.js linea 55: function getCotLog(){ try{ return JSON.parse(localStorage.getItem(COT_LOG_KEY)||'[]'); }catch(e){ return []; } }
- modules\cotizador.js linea 56: function saveCotLog(l){ try{ localStorage.setItem(COT_LOG_KEY, JSON.stringify(l)); }catch(e){} }
- modules\ia.js linea 198: const c = JSON.parse(localStorage.getItem('orbit360_aut_cfg') || '{}');
- modules\notificaciones.js linea 21: function getLog() { try { return JSON.parse(localStorage.getItem('orbit360_wa_log') || '[]'); } catch (e) { return []; } }
- modules\notificaciones.js linea 22: function addLog(e) { const l = getLog(); l.unshift(e); if (l.length > 80) l.pop(); try { localStorage.setItem('orbit360_wa_log', JSON.stringify(l)); } catch (x) {} }
- modules\plantillas.js linea 22: function load() { try { const r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) {} return JSON.parse(JSON.stringify(SEED)); }
- modules\plantillas.js linea 23: function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
