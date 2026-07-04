# Bitácora backend A&S — reauditoría importador candidato Claude

Fecha: 2026-07-04
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5
Estado: EN PROGRESO / protegido.

## Necesidad

Paula solicitó una nueva auditoría de la candidata Claude 2026-07-04T072304 para asegurar pendientes, preparar paquete para Claude y continuar backend en caso de que Claude no alcance por capacidad.

## Hallazgo principal

La candidata mejora puntos del paquete anterior, pero no queda apta para empalme. Persisten P0/P1 en `core/importa.js` y UI relacionada:

- trazabilidad hoja/fila no llega al registro final;
- país/moneda se autocompletan desde `monedaDe(pais)`;
- planillas de comisión no tienen contrato real completo;
- documentos pueden actualizar `clientes` directo con scope;
- fechas fijas;
- textos técnicos visibles;
- financiero histórico requiere bloqueo semántico de recaudos.

## Archivos documentales agregados

- `orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATO-CLAUDE-20260704-072304-REAUDITORIA.md`
- `orbit360-platform/docs/PENDIENTES-CLAUDE-POST-072304-REAUDITORIA.md`
- `orbit360-platform/docs/NOTA-PARA-CLAUDE-FIXES-IMPORTADOR-POST-072304.md`

## Herramienta backend agregada

- `tools/orbit360-auditar-importador-candidato-claude-ays.mjs`
- `tools/orbit360-test-auditar-importador-candidato-claude-ays.mjs`

La herramienta es estática y segura. Lee una carpeta candidata y detecta:

- traza agregada a filas pero no copiada a `rec`;
- moneda autorizada por país;
- planillas de comisión sin país/moneda/periodo o sin esperada/pagada;
- documentos escribiendo a clientes;
- fechas fijas;
- textos técnicos visibles.

## Impacto

El pipeline backend queda mejor preparado para bloquear automáticamente próximas candidatas Claude que repitan los P0 de importador. Esto reduce reprocesos y evita empalmes inseguros.

## Restricciones cumplidas

No deploy. No merge. No main. No carga LAB. No datos reales. No empalme de candidata. No modificación de backend protegido.