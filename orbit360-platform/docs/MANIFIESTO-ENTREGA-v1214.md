# Manifiesto de entrega — candidata v1.214

Base: `Prototype Development Request - 2026-07-12T073729.692.zip` (declarada v1.213, SHA256 `ef33ae185faf9664802249b9e916206669e6da61497bb97065f86c56aad40253`).
No se reconstruyó desde cero. No se tocaron `data/store.js`, `core/auth.js`, `core/importa.js` ni backend/Auth/Firestore protegido.

## Archivos modificados en esta corrección

```
modules/cotizador.js
modules/comparativo.js
modules/renovaciones.js
modules/cobros.js
modules/notificaciones.js
modules/automatizaciones.js
modules/portal.js
modules/correo.js
core/correo.js
index.html (cache-bust)
CHANGELOG.md
docs/MANIFIESTO-ENTREGA-v1214.md (nuevo)
```

## Matriz requisito → archivo/función → comportamiento → prueba → resultado

| ID | Archivo/función | Comportamiento antes | Comportamiento ahora | Prueba | Resultado |
|---|---|---|---|---|---|
| CL-213-01 | `cotizador.js` `calcTasas` | `RECARGO_FRACC` global, `neta*=1.08`, `neta*0.05` fijos para todas las aseguradoras/países | Recargo por fraccionamiento, antigüedad y gastos de emisión se leen de `a.cotTasas.recargoFraccPct/recargoAntiguedad/gastosEmisionPct`; si faltan, componente = 0 | Lectura de código: no quedan literales `1.08`/`0.05`/`RECARGO_FRACC` en el módulo | CERRADO |
| CL-213-02 | `cotizador.js` `calcTasas` | `cotTasasValidadas` booleano sin fuente | `calcTasas` propaga `fuenteDocumentoId/versionFuente/vigenciaFuente` desde `a.cotTasas` al resultado y al DTO | Código: campos presentes en el objeto devuelto | PARCIAL — sigue faltando **UI de Aseguradoras** para cargar/editar esos 3 campos (hoy solo se leen si existen en el registro) |
| CL-213-03 | `cotizador.js` `compBtn` handler | `d.estadoValidacion='validada'` incondicional | Automático valida solo si `tieneTasaValidada(aseguradoraId)`; manual siempre `requiere_revision` | Código: `dtos.forEach(d => { d.estadoValidacion = (...) ? 'validada' : 'requiere_revision' ...})` | CERRADO |
| CL-213-04 | `cotizador.js`/`comparativo.js` | `sessionStorage.setItem/getItem('orbit360_cots_handoff')` | Colección `Orbit.store('quoteTransfers')` con `cotizacionIds, clienteId, pais, cur, ramo, estado` | Código: sin `sessionStorage`/`localStorage` en ambos módulos | CERRADO |
| CL-213-05 | DTO `cotizacionNormalizada` | Sin `fuenteDocumentoId/versionFuente/confirmacionHumana/estadoComercial/trazabilidad` | Los 5 campos agregados con defaults seguros | Código: presentes en la función | CERRADO (el contrato existe; el llenado real depende de UI de Aseguradoras pendiente) |
| CL-213-06 | `comparativo.js` `manual()` | Sin distinguir desglose explícito | `desgloseIncompleto` marcado cuando no se digitó neta/IVA | Código | PARCIAL — sigue faltando el flujo completo diff-antes/después + motivo obligatorio en edición (existe motivo opcional en `editarProp`, no bloqueante) |
| CL-213-07 | `comparativo.js` `manual()`/`cargarPDF()` | `total/1.12` fijo | Eliminado; sin neta/IVA explícitos se marca `desgloseIncompleto`, no se infiere 12% | Código: sin literal `1.12` | CERRADO |
| CL-213-08 | `comparativo.js` `ranking()` | Ya filtraba por `validada`; no bloqueaba NaN/Infinity explícitamente | Sin cambio adicional esta ronda | — | PENDIENTE (no abordado en este ciclo) |
| CL-213-09 | `comparativo.js` `guardarHist/verHist` | `Orbit._compHist` volátil | `Orbit.store('comparativos')` — sobrevive recarga | Código + prueba manual: guardar → recargar página → historial sigue | CERRADO |
| CL-213-10 | `comparativo.js` `aceptarOpcion` | Sin `workflowType` tipado | `workflowType:'issuance_request'`, `quoteId`, `comparisonId` en la gestión creada | Código | PARCIAL — falta exigir explícitamente fuente/vigencia y permiso de usuario antes de aceptar (hoy exige propuesta validada + cliente + checkbox de confirmación del cliente)|
| CL-213-11 | Cotizador/Renovaciones/Cobros/Notificaciones/Portal/Automatizaciones/Correo | "enviado/enviada" en toasts, actividades y carpeta de correo | Reemplazado por "preparado/preparada"; carpeta de correo `enviados`→`preparados` | Grep: 0 coincidencias de los textos citados en la auditoría en esos archivos | CERRADO para los 7 textos citados por la auditoría. **No** se revisaron exhaustivamente otros módulos fuera de la lista (siniestros, calidad, marketing, equipo) — pendiente |
| CL-213-12 | Configuración/Automatizaciones/IA/Correo | Copy técnico visible sin segmentación por rol | **No tocado en esta ronda** — requiere trabajo de UI (ocultar detrás de guard de rol Admin/IT) que no se alcanzó | — | PENDIENTE |
| CL-213-13 | Manifiesto/evidencia | Manifiesto v1.187 obsoleto | Este documento (`MANIFIESTO-ENTREGA-v1214.md`) | — | CERRADO para esta ronda; README aún no verificado línea por línea |

## P1 — no abordado en esta ronda (honesto)

Replantear profundo, paridad pantalla/PDF exhaustiva, visor documental transversal, multirol completo con scopes, Calidad por asesor, ficha-página de Póliza, evidencia responsive 1440/1024/390, y la profundización de Academia al runtime corregido **no se tocaron en este ciclo** — priorizado el cierre de los fixes de datos/estado (P0-01 a P0-11) por ser los de mayor riesgo de negocio (tarifas fantasma, envío falso, persistencia volátil).

## Verificación de sintaxis

`new Function(source)` ejecutado sobre los 9 archivos modificados — sin errores.

## Verificación adicional (segunda pasada, post-entrega v1.214)

- **CL-213-08 cerrado ahora**: `ranking()` en `comparativo.js` ya filtra `Number.isFinite(total/neta)` y `total>0`, además de forzar `score=0` si el cálculo diera `NaN`. Antes solo filtraba por `validada`.
- **Hallazgo honesto sobre CL-213-02**: no es solo que falte "editor de UI" — hoy **no existe ningún camino, ni en `seed.js` ni en la ficha de Aseguradoras (`tabTarifas`), para setear `a.cotTasas` o `a.cotTasasValidadas`**. La ficha de Aseguradoras tiene un motor de fuentes distinto (`_fuentes`, `ramosHabilitados`) que gobierna si el ramo aparece en el Cotizador, pero no alimenta la tabla numérica que `calcTasas()` necesita. Efecto práctico: el cálculo automático de tarifas **nunca puede completarse en el estado actual del prototipo** — siempre cae en "bloqueada / Tarifa pendiente de validación", incluso si un usuario habilita el ramo. Esto es consistente con "default-deny", pero no hay forma de demostrar el camino feliz sin construir el editor de tabla de tasas (fuera de alcance de esta ronda; queda como P0 real para la siguiente).


- No se tocó `data/store.js`, `core/auth.js`, `core/importa.js` ni backend/Auth/Firestore.
- No se incluyeron datos reales, tarifas reales de A&S ni secretos.
- Cambios acotados a los archivos listados arriba; cero archivos eliminados.
