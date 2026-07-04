# Auditoría candidato Claude — 2026-07-03T202245

**Fecha:** 2026-07-03  
**Archivo auditado:** `Prototype Development Request - 2026-07-03T202245.322.zip`  
**Tipo:** auditoría forense local del candidato frontend/prototipo.  
**Estado:** auditado; no empalmado; requiere correcciones Claude antes de backend.

## Resultado ejecutivo

El candidato trae una base frontend avanzada: 30 módulos, 20 archivos core, 53 archivos JS y 95 archivos totales. La sintaxis JS fue validada con `node --check` sobre 53 archivos y no arrojó errores. El validador incluido de Marketing/Integraciones ejecutó correctamente.

No debe empalmarse reemplazando la rama backend. Debe tratarse como candidato frontend/prototipo para corrección por Claude y posterior empalme aditivo por ChatGPT/Codex.

## Validaciones realizadas

| Validación | Resultado |
|---|---|
| Descompresión del ZIP | OK |
| Inventario estructural | OK |
| Módulos `modules/*.js` | 30 |
| Archivos `core/*.js` | 20 |
| Archivos JS | 53 |
| `node --check` | 0 errores |
| Validador marketing/integraciones | OK |
| Escritura directa operativa a almacenamiento local desde módulos | 0 detectado |
| Render visual real en navegador sandbox | No completado; debe validarlo Claude en navegador real |

## Fortalezas

1. Estructura modular completa.
2. `Orbit.store` conserva API extendida en el prototipo demo.
3. Importador incluye tipos de fuente, alcance por fuente, reporte CSV y `financiero-historico`.
4. Finanzas incluye cierre/catálogo por país según la bitácora del candidato.
5. Integraciones/Marketing tienen contratos y validador técnico.
6. No se detectó escritura operativa directa al almacenamiento local desde módulos.

## P0 — bloqueantes antes de empalme

| ID | Área | Hallazgo | Acción Claude |
|---|---|---|---|
| P0-01 | Empalme/backend protegido | El candidato trae capa demo de datos y no contiene los archivos backend LAB protegidos ni scripts backend recientes. | No tocar backend. Entregar solo prototipo/frontend; ChatGPT/Codex hará empalme aditivo preservando backend LAB. |
| P0-02 | Importador financiero histórico | El Excel multihoja combina hojas y pierde nombre de hoja, país, periodo y bloque origen. | Preservar hoja, periodo, país, moneda, bloque origen y número de fila por registro. |
| P0-03 | País/moneda | El importador asume GT cuando no reconoce país. | No asumir GT. Si país/moneda no son confiables, marcar validación pendiente y bloquear escritura. |
| P0-04 | Pólizas/cartera | El importador de pólizas no mapea país/moneda como mínimos y asigna vigente por defecto si no detecta estado. | Agregar país/moneda; si falta estado, no generar recibos y dejar validación pendiente. |

## P1 — necesarios antes del próximo candidato

| ID | Área | Hallazgo | Acción Claude |
|---|---|---|---|
| P1-01 | Importador/alcance | Una fuente de movimientos conserva ejemplo de pago de cliente como ingreso financiero. | Separar recaudo/cobros de movimientos financieros; cambiar textos y ejemplos. |
| P1-02 | Importador financiero histórico | La exclusión se hace por concepto, no por hoja. | Excluir hojas soporte por nombre/patrón antes de mapear. |
| P1-03 | Documentos/expediente | Documentos aparece con alcance de cliente, no documental. | Usar colección/relación documental y aplicar cambios al cliente solo con confirmación. |
| P1-04 | Producción/prima neta | Prima total, prima neta y monto se pueden mezclar en un solo campo. | Separar prima neta, prima total, gastos e IVA; si no se sabe, validar manualmente. |
| P1-05 | UI cliente | Hay textos técnicos visibles para cliente final. | Ocultarlos o moverlos a modo interno/superadmin. |

## P2 — limpieza y QA

1. Unificar versionado de documentos y cache-bust.
2. Marcar dependencias de extracción en navegador como prototipo; producción debe usar extractor backend.
3. Mantener legado solo como histórico o excluir del ZIP final comercializable.
4. Claude debe ejecutar smoke visual real y actualizar `REPORTE-SMOKE.md`.

## Decisión

No empalmar por reemplazo. Usar este candidato para corrección por Claude. Luego ChatGPT/Codex hará empalme aditivo con backend LAB protegido.

## Restricciones cumplidas en esta auditoría

- No deploy.
- No merge.
- No main.
- No Firestore.
- No carga LAB.
- No datos reales en repo.
- No modificación de backend LAB protegido.
