# CXOrbia — Paquete de Handoff para Desarrollo

> Documento para el equipo técnico que llevará el prototipo a producción.
> Estado: **prototipo funcional completo** (frontend). Falta backend de persistencia + conectar credenciales reales.

---

## 1. Qué es este prototipo y cómo está construido

- **100% frontend, sin framework**: HTML + CSS + JavaScript vanilla. No usa React, no requiere build.
- **Punto de entrada**: `app/index.html`. Carga, en orden, los `core/*.js` y luego los `modules/*.js` (ver el final de `index.html`).
- **Arquitectura modular**: cada sección de la plataforma es un módulo registrado con `CX.module('id', fn)` y enrutado por `core/router.js`. El menú por rol está en `core/config.js` (`CX.NAV`).
- **Datos**: hoy son **semillas en memoria** (`core/data.js`, `core/cliente-data.js`, etc.) + **persistencia parcial en `localStorage`** (ediciones del usuario). Todo lo que se "guarda" hoy vive en el navegador.
- **Multi-rol**: `admin` (consultora), `shopper` (evaluador), `cliente` (portal). El rol y proyecto activos viven en `CX.session` (`core/store.js`).
- **Multi-tenant / white-label**: marca, tema, plan, módulos activos, países, NDA, patrones de credenciales — todo configurable y persistido (hoy en `localStorage`, mañana por tenant en backend).

### Objeto global `CX`
Todo cuelga de `window.CX`:
- `CX.data` — datos operativos (proyectos, visitas, shoppers, clientes, KPIs).
- `CX.session` — sesión (rol, usuario, proyecto activo).
- `CX.bus` — event bus (`emit`/`on`) para sincronía entre módulos.
- `CX.fin`, `CX.finStore`, `CX.liq` — finanzas y liquidaciones.
- `CX.hr`, `CX.dedupe`, `CX.importador` — hojas de ruta e importación.
- `CX.automations`, `CX.ai`, `CX.notif` — automatizaciones (Make), IA (Gemini), notificaciones.
- `CX.crmStore`, `CX.mktStore`, `CX.supportStore`, `CX.learnStore`, `CX.docStore` — stores de CRM, marketing, soporte, aprendizaje, documentos.

---

## 2. LO QUE TÚ (cliente) DEBES HACER — backend, paso a paso

El prototipo está listo; para que sea una app real multi-usuario necesitas **3 cosas**. Te las ordeno de la más a la menos crítica.

### PASO 1 — Base de datos + autenticación (lo único imprescindible)

Hoy los datos viven en el navegador de cada persona; si dos usuarios entran, no ven lo mismo y al limpiar el navegador se pierde. Necesitas una base de datos central.

**Opción recomendada (rápida y económica): Firebase / Supabase.**
- Ya tienes experiencia con Firebase (el archivo `uploads/index-...html` de TyA ya usaba Firebase Realtime DB). Es perfecto para empezar: tiempo real, multi-usuario, autenticación incluida, plan gratuito generoso.
- **Qué contratar/crear**:
  1. Una cuenta en **Firebase** (gratis) → crear un proyecto.
  2. Activar **Authentication** (correo/contraseña — ya tienes el patrón de usuario/clave en el prototipo).
  3. Activar **Firestore** o **Realtime Database** (para los datos).
  4. Activar **Storage** (para PDFs, evidencias, documentos de capacitación).
- **Qué le pasas al desarrollador**: el `firebaseConfig` (apiKey, databaseURL, etc.) que Firebase te da. Nada más.

**Alternativa si prefieres algo más "empresa"**: Supabase (Postgres + Auth + Storage) o un backend propio (Node/Express + Postgres). Más control, más trabajo.

### PASO 2 — Conectar las integraciones (cuando quieras activarlas)

El prototipo ya tiene el "cableado" listo; solo faltan las credenciales reales:
- **Make (automatizaciones/WhatsApp/correo)**: crea los escenarios en tu cuenta de Make y pega los **webhooks** en el módulo *Automatizaciones* (ya es configurable por tenant). No requiere código.
- **Gemini (IA transversal)**: consigue una **API key de Google AI Studio** (Gemini) y pégala en *Automatizaciones → Asistente de IA*. Recomendado `gemini-1.5-flash` (económico). El desarrollador conecta `CX.ai` al endpoint real (hoy usa heurística local de respaldo).
- **Outlook/Google (correo y calendario)**: cuenta de Microsoft 365 o Google Workspace; se conectan vía Make o directamente con OAuth (decisión del desarrollador).

### PASO 3 — Hosting (publicar la app)

- Firebase Hosting, Vercel, Netlify o cualquier hosting estático sirven (la app es estática).
- Apunta tu dominio (ej. `app.tuconsultora.com`).

> **Resumen de lo que debes conseguir y entregar al desarrollador:**
> 1. Cuenta Firebase (o Supabase) → `firebaseConfig`.
> 2. API key de Gemini (Google AI Studio).
> 3. Cuenta Make + webhooks de tus escenarios.
> 4. (Opcional) Microsoft 365 / Google Workspace para correo-calendario.
> 5. Un dominio donde publicar.

---

## 3. LO QUE HARÁ EL DESARROLLADOR — capa de persistencia

El trabajo técnico es **reemplazar las semillas/localStorage por llamadas a la base de datos**, respetando la misma estructura de datos que ya existe. No hay que rediseñar nada.

### 3.1 Colecciones / tablas sugeridas (derivadas del prototipo)

| Colección | Origen en el prototipo | Campos clave |
|---|---|---|
| `tenants` | `CX.BRAND`, `cx_tenant`, `cx_theme`, `cx_plan`, `cx_modules` | id, nombre, marca, tema, plan, módulos activos, NDA |
| `users` | login + `CX.CREDS` + matriz permisos | id, tenantId, nombre, rol, permisos[], credenciales |
| `clients` | `CX.data.clients` | id, tenantId, nombre, rubro, país, estado, contactos[] |
| `projects` | `CX.data.projects` | id, tenantId, clientId, nombre, países, monedas, escenarios, quincenas, periodicidad, periodoCumpl |
| `shoppers` | `CX.data.shoppers` + `cx_shoppers_*` | id, nombre, país, ciudad, rating, datos bancarios, perfilCompleto |
| `visits` | `CX.data._visitas` | id, projectId, sucursal, ciudad, país, escenario, quincena, shopperId, estado, fechas, honorario, reembolsos, **extId (llave HR)** |
| `postulations` | `CX.data._posts` | id, projectId, visitaId, shopperId, estado, gestionadoPor |
| `questionnaires` | `CX.programa` | projectId, versiones[], secciones[], pesos, evidencias, "aplica a" |
| `liquidations` | derivadas de visits (`CX.liq`) | visitaId, estado, total, fechaEstimadaPago |
| `finance` | `CX.finStore` | movimientos (globales/proyecto), CxC, CxP, financiamientos, presupuesto mensual, remesas |
| `learning` | `CX.learnStore` | cursos, recursos, exámenes, progreso por shopper |
| `documents` | `CX.docStore` | por proyecto, tipo, contenido/URL |
| `certifications` | `cert.js` | banco de preguntas, gate, resultados por shopper |
| `crm` | `CX.crmStore` | oportunidades, etapa, valor, actividades[], actas |
| `marketing` | `CX.mktStore` | piezas, calendario, estado, métricas |
| `support` | `CX.supportStore` | tickets, tipo, estado, asignado |
| `notifications` | `CX.notif` | destinatario, tipo, texto, leída |
| `automations` | `CX.automations`, `cx_hook` | webhooks por tenant/evento, IA config |

### 3.2 Estrategia de migración recomendada (mínimo riesgo)
1. **Crear una capa `CX.db`** que abstraiga lectura/escritura (get/set/list/subscribe). Hoy esos datos se leen de objetos en memoria y se guardan en `localStorage`; centraliza todo ahí.
2. **Reemplazar internamente** cada `localStorage.getItem/setItem` y cada arreglo semilla por `CX.db`. Los módulos NO cambian: siguen llamando `CX.data.*`, `CX.finStore.*`, etc. — solo cambia de dónde salen los datos.
3. **Tiempo real**: suscribir los módulos al `onSnapshot`/`on('value')` y re-`draw()` con el `CX.bus` que ya existe. La sincronía entre módulos ya está resuelta por el bus.
4. **Auth**: el login actual (patrón usuario/clave) se conecta a Firebase Auth; el rol y permisos vienen de `users`.
5. **Storage**: PDFs/evidencias/videos van a Storage; en el prototipo hoy son dataURL/base64 — cambiar a subir-y-guardar-URL.

> Clave de oro para la migración de datos reales: la **deduplicación ya está resuelta** en `core/dedupe.js` por llave natural (sucursal+ciudad+escenario+quincena) o `extId`. Respetar esa llave al importar evita los duplicados que pasaban en la plataforma anterior.

### 3.3 IA (Gemini) transversal
- `CX.ai` ya está como capa de abstracción (proveedor/modelo/key configurables por tenant). Hoy los generadores usan heurística local de respaldo.
- El desarrollador conecta `CX.ai.complete(prompt, context)` al endpoint de Gemini, alimentando el **contexto del proyecto** (documentos cargados + histórico + cuestionarios). Eso "entrena" el modelo del cliente para set-up inteligente, propuestas, actas y análisis.

---

## 4. Estado funcional (verificado)
- **34 módulos** cargan sin errores en los 3 roles.
- **KPIs clickeables** con drill en todos los módulos con métricas.
- **Datos vivos**: KPIs y series financieras se calculan de las visitas reales (no hardcodeados).
- **Sincronía** verificada: visita → liquidación → beneficios → finanzas → portal; HR doble vía sin duplicar.
- **Importadores inteligentes** multi-formato/multi-sección (HR, movimientos, cuestionarios, certificación, instructivo).
- **Autoadministrable**: marca, plan, países, escenarios, cuestionarios, rubros, usuarios/permisos, automatizaciones, NDA.

## 5. Fuera del alcance del prototipo (requieren backend)
- Persistencia central multi-usuario (PASO 1).
- Envío real de WhatsApp/correo (PASO 2 — Make).
- IA generativa real (PASO 2 — Gemini).
- Carga real de archivos pesados a Storage.
- Notificaciones push reales.

---
_Generado para el handoff de CXOrbia. La estructura de carpetas y el detalle por módulo están en `app/` y en `app/docs/PLAN-DE-TRABAJO.md`._
