# CÓMO DESPLEGAR Y VER LOS CAMBIOS — Orbit 360 (con Codex / GitHub)

## ⚠️ POR QUÉ "NO VES LOS CAMBIOS" (causa raíz)
Los cambios SÍ están en el ZIP que descargas. Lo que pasa es una de estas dos cosas:

1. **Caché del navegador**: el navegador guarda los archivos `.js` viejos y no los vuelve a pedir.
2. **Deploy desactualizado**: si ves la plataforma en una URL (GitHub Pages, tu dominio), esa URL
   sirve el ÚLTIMO commit que subiste — si no subiste el ZIP nuevo, ves lo viejo.

### Solución inmediata (caché)
- En el navegador, abre la plataforma y pulsa **Ctrl + Shift + R** (Windows) o **Cmd + Shift + R** (Mac).
  Eso fuerza recarga sin caché.
- Ya añadí **versionado automático** (`?v=NNNN`) a los 47 scripts en `index.html`. Cada versión nueva
  bumpea ese número, así el navegador SIEMPRE pide los archivos nuevos. Pero solo funciona si subes
  el `index.html` nuevo.

---

## PASO A PASO CON CODEX (para desplegar la última versión)

### Opción A — Subir el ZIP completo (recomendado, más simple)
Dale a Codex EXACTAMENTE esto, adjuntando el ZIP `orbit360-platform`:

```
Adjunto el ZIP de Orbit 360. Por favor:
1. Borra TODO el contenido actual del repositorio (excepto .git).
2. Descomprime el ZIP y copia TODO su contenido a la raíz del repositorio.
3. Verifica que index.html y las carpetas core/, modules/, data/, styles/, docs/ quedaron en la raíz.
4. Haz commit con mensaje "Orbit 360 vX.XX" y push a main.
5. Confírmame que el push fue exitoso y dame el hash del commit.
```

### Opción B — Solo archivos cambiados (más rápido si Codex ya tiene el repo)
Si quieres que Codex aplique solo lo nuevo, dile qué archivos cambiaron en esta versión:
- `modules/comparativo.js` (comparativo profundo + impresión con marca)
- `core/router.js` (buscador global del topbar)
- `modules/polizas.js` (búsqueda por placa)
- `styles/base.css` (dropdown del buscador)
- `index.html` (versionado ?v= de scripts)

```
En el repo Orbit 360, reemplaza estos archivos con los del ZIP adjunto:
modules/comparativo.js, core/router.js, modules/polizas.js, styles/base.css, index.html.
Commit "fix: buscador placa + comparativo profundo + cache-bust" y push a main.
```

### Verificar que GitHub Pages se actualizó
1. Tras el push, ve a tu repo → Settings → Pages → confirma que el deploy terminó (toma 1-2 min).
2. Abre tu URL de Pages con **Ctrl+Shift+R**.
3. Prueba: busca una placa (ej. `R946U34`) en el buscador del topbar y en Pólizas → debe aparecer.
4. Abre Comparativo → debe tener tabla con coberturas + recomendación con botones Precio/Cobertura/Equilibrio.

---

## ¿PUEDO ABRIR EL HTML EN MI DOMINIO PARA VER EL PROTOTIPO?
Sí. Sube el contenido del ZIP a una carpeta de tu hosting y abre `index.html`. Como todo es
HTML/JS/CSS estático (sin servidor), funciona en cualquier hosting. Para el portal del cliente,
el link directo sería `tudominio.com/orbit/index.html#/login` y embebido en tu web con un `<iframe>`.

---

## FLUJO DE CORRECCIÓN DE ERRORES CON CODEX (mientras recupero capacidad)
Cuando encuentres un error y yo no tenga capacidad:

1. Dale a Codex el error con ESटे formato y pídele que lo registre en `docs/BITACORA-ERRORES.md`:
```
Registra este error en docs/BITACORA-ERRORES.md (créalo si no existe) y NO intentes
arreglarlo si implica reescribir un módulo completo — solo regístralo:

## [fecha] Módulo: <nombre>
- Síntoma: <qué pasa, en qué pantalla, pasos para reproducir>
- Esperado: <qué debería pasar>
- Estado: ABIERTO
```
2. Para errores SIMPLES (texto, color, un botón que no llama su función), Codex sí puede arreglarlos.
   Dale esta regla:
```
Reglas para tocar Orbit 360:
- NUNCA accedas a localStorage directo desde un módulo; usa solo Orbit.store (insert/update/all/get/where).
- Tras cada cambio en un .js, BUMPEA el número de versión ?v=NNNN en index.html (búscalo y +1).
- No reescribas módulos completos sin pedírmelo; haz el cambio mínimo.
- Verifica que el archivo no quedó con llaves o backticks sin cerrar antes de commit.
```
3. El lunes, cuando yo tenga capacidad, dime: *"lee docs/BITACORA-ERRORES.md y corrige los ABIERTOS"*.

---

## CÓMO APLICAR MIS MEJORAS DEL PROTOTIPO A TU PLATAFORMA DE A&S (después de migrar)
- El prototipo (este repo `orbit360-core`) es la **base comercial**. A&S es una **copia configurada**.
- Cuando yo mejore el prototipo, te doy el ZIP. Para llevar la mejora a A&S:
  1. Identifica qué archivos cambiaron (te lo digo en cada entrega).
  2. En el repo de A&S, reemplaza esos mismos archivos del `core/` `modules/` `styles/`.
  3. **NO** reemplaces `data/store.js` ni la config de tenant de A&S (ahí vive su conexión a backend y su branding).
  4. Bumpea `?v=` y push.
- Regla de oro: **la lógica vive en core/ y modules/; los datos y la personalización viven en
  store.js + Orbit.tenant**. Así las mejoras de lógica no pisan la configuración del cliente.
