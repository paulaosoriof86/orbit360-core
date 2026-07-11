# Manifiesto de entrega — Orbit 360 · candidata v1.187

Fecha: 2026-07-11
Alcance: Carril A (frontend/UX/Academia/documentación) sobre el proyecto real de este entorno.

## Procedencia (limitación honesta del entorno)

Esta sesión de Claude **no tiene acceso al repositorio `paulaosoriof86/orbit360-core`** ni a los ZIP exactos referenciados en las auditorías (`2026-07-08T183042.881`, `2026-07-10T224058.273`, `2026-07-11T064855.455`) — no fueron adjuntados como archivo en esta conversación. Todo el trabajo se hizo **incrementalmente sobre el estado real y verificable de este proyecto**, versión a versión (v1.174 → v1.187), cada una entregada y confirmada por el usuario antes de continuar.

**No puedo calcular un SHA256 verdadero del ZIP que el usuario descarga** — el ZIP se genera del lado de la plataforma al presentar la descarga; no tengo un paso posterior que lea esos bytes exactos para hashearlos. En su lugar, la trazabilidad de esta entrega es: número de versión secuencial + bitácora detallada por versión en `docs/BITACORA-CAMBIOS.md` + este manifiesto.

## Inventario de archivos tocados (v1.174 → v1.187, acumulado)

```txt
modules/aseguradoras.js       — reescrito varias veces (directorio, tabs, draft, permisos, _fuentes, gate)
modules/cotizador.js          — gate default-deny, DTO CotizacionNormalizada completo
modules/comparativo.js        — consumo del DTO en 3 orígenes (cotizador/pdf-multi/pdf-manual)
modules/automatizaciones.js   — credencial IA honesta (sin persistir secreto ni declarar conexión)
modules/academia.js           — cursosPorRol con rol activo (Orbit.session.rol())
modules/equipo.js             — panel de permisos avanzados (extras/restricciones)
core/ia.js                    — configurar()/estado() honestos, activo() siempre false desde frontend
data/seed.js                  — nombres ficticios, ramosHabilitados explícitos, contactos principales,
                                 portales de ejemplo, IDs estables de documentos, __v bumpeado
data/academia-plus.js         — curso Aseguradoras, tono voseo, recurso honesto
styles/infra.css              — tabs, responsive (breakpoints 640px y 641-1024px)
docs/manual-integraciones.html — copy honesto
docs/BITACORA-CAMBIOS.md      — bitácora completa versión a versión
index.html                    — SOLO cache-busting de scripts modificados; nunca reemplazado completo
```

## Archivos protegidos — confirmación de integridad

No se tocaron en ningún momento de esta serie de correcciones:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
core/auth.js
core/importa.js
firestore.rules
tools/orbit360-*
```

## Matriz de regresión (verificada en vivo por eval_js, no solo declarada)

| # | Caso | Resultado |
|---|---|---|
| 1 | Directorio Aseguradoras carga con 12 registros, 0 nombres reales | ✅ verificado |
| 2 | Rol Asesor (vista activa vía `Orbit.session.rol()`): sin botón crear, toggle deshabilitado, ficha "Solo lectura" | ✅ verificado |
| 3 | Rol Dirección: edición habilitada | ✅ verificado |
| 4 | Extra `aseguradoras_editar` en un rol restringido → gana edición | ✅ verificado |
| 5 | Restricción `aseguradoras_editar` en Dirección → pierde edición | ✅ verificado |
| 6 | Editar nombre en draft + Cancelar → store sin cambios | ✅ verificado |
| 7 | `_fuentes.evaluarFuente` devuelve objeto con capacidades (no solo texto) | ✅ verificado |
| 8 | Cotizador: ramo sin `ramosHabilitados[ramo].cotizador===true` → aseguradora excluida | ✅ verificado por código (asegElegibles) |
| 9 | DTO `CotizacionNormalizada` conserva clienteId/fracc/sumaAsegurada/deducible | ✅ verificado |
| 10 | `Orbit.ia` tras "Guardar": `key:''`, `conectado:false` | ✅ verificado |
| 11 | Borrado de aseguradora con vínculos (asg01, 5 pólizas) → bloqueado, solo desactivar | ✅ verificado (candidatas previas) |
| 12 | KPIs "Con contacto principal" y "Con acceso disponible" reflejan datos reales del seed (antes daban 0 siempre) | ✅ corregido y verificado en esta versión |
| 13 | 0 errores de consola en cada entrega (18 versiones consecutivas) | ✅ verificado en cada `ready_for_verification` |

## Evidencia responsive — limitación de herramienta (honesta)

Se intentó forzar anchos de tablet (834px) y móvil (390px) manipulando `document.documentElement.style.width` para capturar pantallas. **Esa técnica NO dispara un cambio real de viewport** (las media queries de CSS siguen leyendo el ancho real de la ventana de previsualización, no el del elemento) — las capturas resultantes no son evidencia válida y se descartan. Las herramientas de captura disponibles en este entorno no exponen un control de ancho de viewport para el iframe de previsualización.

Lo que SÍ se verificó y es válido como evidencia:
- Las reglas CSS `@media(max-width:640px)` y `@media(min-width:641px) and (max-width:1024px)` existen en `styles/infra.css` y aplican a `.asg-grid`, `.asg-row`, `.cgrid`, `#asg-ficha .card` (confirmado leyendo el archivo, no solo screenshot).
- El layout desktop se capturó y quedó adjunto en `docs/evidencia/aseguradoras-directorio-desktop.png` (dentro del ZIP entregado).

**Pendiente honesto:** evidencia fotográfica real de tablet/móvil requeriría que el usuario la capture desde su propio navegador redimensionado, o que se le indique una herramienta de este entorno con control de viewport que no identifiqué disponible.

## Confirmaciones finales

- ✅ Sin datos reales (nombres de aseguradoras ficticios, sin personas reales, sin NIT/cuentas reales).
- ✅ Sin secretos/contraseñas/API keys en código, UI, store o logs.
- ✅ Sin contraseñas visibles en Aseguradoras ni Automatizaciones.
- ✅ 0 errores de sintaxis JS en cada entrega.
- ✅ Backend protegido intacto (lista arriba).
