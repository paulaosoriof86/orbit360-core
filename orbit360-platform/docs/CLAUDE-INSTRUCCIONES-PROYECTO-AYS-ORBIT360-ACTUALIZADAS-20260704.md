# Claude / Instrucciones Proyecto A&S — Orbit 360 — actualización 2026-07-04

Uso: instrucciones del proyecto para Claude / prototipo Orbit 360 A&S.
Fuente maestra obligatoria: `INSTRUCCIONES-MAESTRAS-CONTINUIDAD-ORBIT360-AYS-20260704.md`.

## 0. Regla obligatoria de entrada

Antes de responder, modificar, auditar, crear código, proponer plan, empalmar una candidata o continuar cualquier bloque grande de Orbit 360 A&S, leer primero:

```txt
INSTRUCCIONES-MAESTRAS-CONTINUIDAD-ORBIT360-AYS-20260704.md
```

Después revisar documentación viva del repo/fuentes: `docs/RAMA-ACTIVA-OBLIGATORIA-AYS-BACKEND.md`, `docs/PLAN-INFRAESTRUCTURA.md`, `CHANGELOG.md`, `README.md`, bitácoras, pendientes, auditorías Claude, notas para Claude y plan backend vigente.

No trabajar con memoria ni con una versión vieja si existe una fuente más reciente.

## 1. Qué es Orbit 360

Orbit 360 es un sistema 360 comercializable para intermediarios de seguros: greenfield, white-label y multi-tenant vía `Orbit.tenant`.

A&S es el primer tenant/cliente y se personaliza SOLO por configuración: logo, paleta, país, moneda, aseguradoras, glosario, tarifas, usuarios, roles, módulos visibles, integraciones y automatizaciones.

No se reescribe código por cliente. No se bifurca A&S como plataforma separada. Código: `orbit360-platform/`. Repo: `paulaosoriof86/orbit360-core`.

A&S es tenant de Orbit 360. Las lógicas propias de A&S se documentan como tenant/configuración. Las mejoras generalizables se documentan para el prototipo base comercializable.

## 2. Baseline vivo obligatorio

Antes de trabajar identificar:

- última candidata/prototipo más reciente disponible;
- último paquete auditado;
- último paquete pendiente de auditoría;
- rama backend activa;
- PR vigente;
- pendientes Claude;
- auditorías previas;
- bitácoras;
- notas para Claude;
- plan backend vigente.

Reglas:

```txt
No trabajar sobre una candidata vieja si existe una más reciente en fuentes.
No empalmar una candidata nueva sin auditoría forense.
No asumir que lo más reciente es lo más estable.
Baseline operativo = versión más reciente + validación documental/auditoría + rama correcta.
```

Si una lógica ya está documentada, aplicarla sin preguntar otra vez. Si una lógica no está establecida, está ambigua o hay conflicto entre fuentes, preguntar antes de asumir.

## 3. Reglas fijas

- Marca Orbit 360 en chrome.
- Logo del cliente solo en slot white-label.
- Prototipo con datos ficticios.
- No mostrar notas técnicas en UI cliente.
- No mostrar Firebase, Firestore, backend, LAB, localStorage, mock, demo, smoke o credenciales como texto visible para cliente.
- Paleta base: rojo `#C5162E`, grafito `#1E2227`, gris/blanco; seleccionable por cliente.
- Tipografías: Manrope, Source Sans 3, JetBrains Mono.
- Fondo oscuro = texto blanco.
- Moneda por país, sin mezclar.
- Producción, metas y comisiones sobre prima neta recaudada.
- Capa única de datos: módulos nunca tocan `localStorage` operativo; solo `Orbit.store`.
- No hardcodear datos de A&S ni de ningún cliente.
- No crear UI falsa como si algo estuviera conectado cuando solo es visión.

## 4. Arquitectura

Estructura base:

```txt
orbit360-platform/
  index.html
  styles/
  data/store.js
  data/seed.js
  core/
  modules/
  docs/
```

Backend: solo reescribir `data/store.js` manteniendo API exacta:

```txt
all
get
where
insert
update
remove
_emit
```

Con Firestore: cada colección store = colección Firestore con `onSnapshot`, `_emit()` y prefijo por tenant.

Colecciones base: clientes, polizas, cobros, comisiones, reclamos, gestiones, negocios, finmovs, contenidos, cursos, aseguradoras, asesores, vehiculos, acreedores, facturas, documentos, actividades.

Ningún módulo debe tocarse para conectar backend si `Orbit.store` conserva API.

## 5. Backend protegido y empalme

Rama backend activa obligatoria:

```txt
ays/backend-tenant-lab-v99-20260703
```

PR backend vigente: #5, draft, sin merge, sin deploy, sin main.

Claude no debe pisar backend ChatGPT/Codex. No sobrescribir `data/store.js`, `data/store-firestore-lab.local.js`, loader/init/guard backend, `firestore.rules` ni tools `orbit360-*` de backend, preflight, plan, preview, diff, pipeline, manifest, país/moneda o validadores.

Cualquier ZIP nuevo se empalma solo después de auditoría, plan, preview, diff y revisión manual. El empalme debe ser aditivo y preservar backend.

## 6. Metodología para nueva candidata Claude

Cada nuevo ZIP/candidata/prototipo debe tratarse como mini-release:

1. Confirmar baseline vivo.
2. No empalmar de inmediato.
3. Extraer e inventariar archivos.
4. Comparar contra última candidata auditada.
5. Revisar `index.html`, `core/`, `modules/`, `data/seed.js` y `docs/`.
6. Validar JS con `node --check`.
7. Revisar rutas del menú vs módulos.
8. Buscar `localStorage` operativo, textos técnicos visibles, fechas quemadas y hardcode A&S.
9. Revisar importador, país/moneda, pólizas/cartera, primas, cobros vs `finmovs`, planillas de comisión, documentos soporte, PWA y smoke real cuando sea posible.
10. Documentar mejoras, pendientes, regresiones y riesgos.
11. Actualizar pendientes Claude y nota para Claude si ChatGPT/Codex hizo mejoras directas.
12. Solo empalmar si pasa pipeline seguro y no pisa backend.

No aceptar el resumen de Claude como suficiente. Auditar archivos reales.

## 7. Importador y migración

Migración por fuentes separadas. Tipos autorizados: clientes, aseguradoras, polizas, vehiculos, cobros_realizados, planilla_aseguradora, planilla_comisiones, estado_cuenta_bancario, financiero_historico, siniestros, documentos_soporte, configuracion_catalogo.

Reglas:

- No mezclar fuentes.
- No inferir clientes/pólizas desde movimientos financieros.
- No escribir cartera desde financiero histórico.
- No escribir cobros desde estado bancario sin conciliación.
- No crear/modificar clientes o pólizas desde documentos sin confirmación explícita.
- Preservar trazabilidad de hoja, fila, bloque, país, moneda, periodo y archivo.
- Si falta país o moneda confiable: `REQUIERE_VALIDACION`.
- Puede sugerir moneda por país, pero no autorizar escritura automática si la moneda no viene explícita.
- Planillas de comisión deben leerse desde filas reales, no simular tarifas.

## 8. Reglas comerciales

País/moneda: GT -> GTQ, CO -> COP. No mezclar monedas.

Producción, metas y comisiones: siempre sobre prima neta recaudada.

Prima: separar prima neta, gastos, IVA/impuestos y prima total.

Pólizas: Vigente/Por renovar generan recibos y pueden quedar en cartera. Cancelada/Vencida/Anulada/Rechazada son histórico, no cartera. Si falta estado, país o moneda: requiere validación y no genera recibos automáticos.

Cartera: solo cobros pendientes de pólizas vigentes o por renovar del año actual.

Cobros/recaudos no son `finmovs`. `finmovs` es financiero histórico/operativo, no cartera ni producción.

Documentos soporte pueden proponer datos, pero no crear o modificar clientes/pólizas sin confirmación y diff.

## 9. Configuración A&S

Todo desde Configuración y Equipo, sin tocar código: logo, paleta, Guatemala por defecto, Colombia adicional, tasas GT IVA 12% y CO IVA 19%, aseguradoras vinculadas, contactos, accesos, Drive, facturación, usuarios, teléfono/WA, correo/login, multi-rol, módulos visibles, glosario por país, planes editables y tarifas A&S para Cotizador/Comparativo como configuración.

## 10. Integraciones

Configurar en Configuración → Integraciones y Automatizaciones: Make, Outlook/M365/Gmail, WhatsApp Cloud API vía Make, wa.me, Green API, Google Sheets, Google Drive, Calendar, Metricool, Mailchimp, redes, Canva, Gamma, HeyGen, NotebookLM, Gemini, OpenAI, Claude y endpoint propio.

No simular integración real como conectada si no está conectada. En demo puede mostrarse como configuración pendiente o modo prueba interno, no como función productiva.

## 11. Documentación obligatoria

Toda corrección, cambio, bug, hallazgo, mejora o pendiente debe documentarse en bitácora, changelog, pendientes y auditorías según aplique.

Formato mínimo: fecha, módulo/área, síntoma/necesidad, esperado, causa raíz si aplica, archivo/función, fix/mejora, impacto comercializable, estado, aplicar a prototipo base SÍ/NO.

Si ChatGPT/Codex corrige algo directamente que Claude debe incorporar, documentarlo explícitamente para Claude.

## 12. Reglas de ajuste seguro

- Nunca tocar `Orbit.store` directamente desde módulos.
- Tras cada cambio JS, recargar página completa y verificar render real cuando sea posible.
- Mantener patrones: modales `drawer-back`, KPIs `Orbit.kpi/K.kpis`, banners `K.banner`.
- Corregir alcance mínimo.
- No rediseñar lo que funciona.
- No afirmar que funciona sin verificar.
- Si una verificación no se puede hacer, decirlo claramente.

## 13. Separación Claude vs ChatGPT/Codex

Claude: prototipo, render, UX, módulos visuales, navegación, diseño, smoke visual, funciones nuevas frontend y documentación frontend.

ChatGPT/Codex: repo, backend, Firestore LAB, Auth LAB, tenant, `Orbit.store`, importadores backend, parser, validadores, pipeline de empalme, auditoría forense, documentación técnica y comentarios PR.

Ambos deben mantenerse sincronizados por documentación viva.

## 14. Si la conversación se alarga

Cuando una conversación de Orbit 360 A&S se vuelva demasiado larga, pierda rendimiento o ponga en riesgo el contexto, avisar de inmediato y entregar un prompt completo de continuidad con repo, rama, PR, baseline vivo, archivos modificados, pendientes, metodología, reglas, hallazgos recientes, plan de trabajo, restricciones e instrucción de leer primero `INSTRUCCIONES-MAESTRAS-CONTINUIDAD-ORBIT360-AYS-20260704.md`.

## 15. Prompt corto de continuidad

```txt
Continúa Orbit 360 A&S. Lee primero `INSTRUCCIONES-MAESTRAS-CONTINUIDAD-ORBIT360-AYS-20260704.md` y la documentación viva del repo. Verifica baseline vivo, repo `paulaosoriof86/orbit360-core`, rama `ays/backend-tenant-lab-v99-20260703`, PR #5 draft sin merge/deploy/main. Continúa desde el último bloque documentado, sin reiniciar plan, sin pisar backend protegido, auditando cada nueva candidata como mini-release, documentando mejoras/pendientes para Claude y avanzando con mínima carga manual para Paula.
```

## 16. Regla final

Antes de actuar, leer. Antes de elegir base, confirmar baseline vivo. Antes de empalmar, auditar. Antes de afirmar, verificar. Antes de cambiar backend, confirmar rama. Antes de tocar datos, validar fuente. Antes de asumir una lógica no establecida, preguntar. Antes de entregar a Claude, documentar. Antes de cerrar, dejar trazabilidad.
