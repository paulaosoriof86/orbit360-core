# Backend P0 · Versionado de scripts + separación demo/LAB/producción

> Guía para ChatGPT/Codex (capa backend LAB). **No toca el prototipo** — describe cómo el backend debe manejar cacheo y ambientes sin romper lo que el prototipo ya hace. La usuaria YA migró; esto acompaña esa migración.

## 1. Versionado de scripts (anti-caché)
**Estado en el prototipo:** `index.html` versiona cada `<script src>` y `<link>` con `?vN` (hoy `?v1241`). Cada entrega sube el número → el navegador descarga los .js nuevos. El usuario refuerza con **Ctrl+Shift+R**.

**Backend debe:**
- Servir `index.html` con `Cache-Control: no-cache` (el HTML nunca se cachea; los assets sí, pero con el `?vN` como cache-buster).
- Mantener el patrón `?vN` o migrar a hash de contenido (`app.js?h=ab12cd`). Si usa build tool, que el hash lo genere el bundler.
- **No** registrar un Service Worker que sirva HTML/JS viejo. Si en algún momento se añade SW (para PWA offline), debe usar `skipWaiting()` + `clients.claim()` y **versionar el cache name**; ante duda, no cachear .js/.html (solo íconos/imágenes).

## 2. Separación de ambientes: demo / LAB / producción
El prototipo corre 100% en el navegador con `Orbit.store` sobre `localStorage` y datos ficticios (`seed.js`, `__v`). El backend introduce ambientes; la clave es que **la misma API `Orbit.store` apunte a distintos orígenes** sin que los módulos cambien.

| Ambiente | Datos | Origen de `Orbit.store` | UI técnica visible |
|---|---|---|---|
| **demo** | ficticios (seed) | localStorage (como hoy) | ninguna |
| **LAB** | ficticios `lab_` en Firestore de pruebas | Firestore (proyecto lab) | ninguna al cliente; badge interno opcional |
| **producción** | reales del cliente | Firestore/REST productivo | ninguna |

**Backend debe:**
- Exponer `window.OrbitBackend = 'local' | 'firestore-lab' | 'firestore'` (o vía `Orbit.tenant.backend`). El prototipo por defecto = `local`.
- Implementar un **adaptador** que respete la firma exacta de `Orbit.store` (ver `MEJORAS-DETECTADAS.md` §Contrato): `all/get/where/find/insert/update/remove/on/_emit/init/reseed/raw`. Cada mutación remota confirmada debe llamar `_emit(colección)` para que los módulos re-rendericen.
- **Modo backend estricto**: cuando `OrbitBackend` sea `firestore-lab` o `firestore`, **no** hacer fallback silencioso a demo/localStorage. Si la conexión falla, mostrar estado de error controlado (no datos ficticios que parezcan reales).
- **Validar seed por IDs exactos** `lab_…` (no por conteos): en LAB, verificar que existan los documentos semilla por su ID, no por “hay N clientes”.
- **Nunca** mostrar UI técnica (Firebase, Firestore, laboratorio, demo, endpoints) al cliente. Los indicadores de ambiente van solo en vistas internas/admin.

## 3. Reglas de no-ruptura al conectar backend
- Los módulos NO tocan `localStorage` ni `fetch` directo — **solo** `Orbit.store`. Si el backend necesita algo nuevo, se añade al adaptador, no a los módulos.
- Mantener las colecciones y campos del prototipo (ver lista en `MEJORAS-DETECTADAS.md`). Renombrar campos rompe los módulos.
- `seed.js.__v` seguirá gobernando la re-siembra en modo `local`; en LAB/prod el backend gobierna los datos y `__v` se ignora.

## 4. Orden sugerido de la migración backend
1. Auditoría forense del prototipo (entender lógicas/flujos/sincronías) — ver `GUIA-CHATGPT-CODEX`.
2. Implementar adaptador `Orbit.store` → Firestore LAB con datos `lab_`.
3. Probar módulo por módulo con recarga real (mismo smoke que `REPORTE-SMOKE.md`).
4. Activar modo estricto; quitar fallback demo.
5. Conectar integraciones reales (correo IMAP/OAuth, WhatsApp, IA) desde Config.
6. Promover a producción con datos reales del cliente (importadores inteligentes).
