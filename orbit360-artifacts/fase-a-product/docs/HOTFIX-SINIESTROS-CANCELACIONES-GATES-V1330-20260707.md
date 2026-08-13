# Hotfix — Siniestros y Cancelaciones v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Cerrar dos riesgos operativos:

1. Siniestros permitía mover reclamos a estados finales sin motivo obligatorio.
2. Cancelaciones podía duplicar oportunidades o gestiones de recuperación al guardar varias veces la misma ficha.

## Archivos modificados

- `orbit360-platform/modules/siniestros.js`
- `orbit360-platform/modules/cancelaciones.js`

## Siniestros — cambios aplicados

Ahora los estados finales requieren motivo y confirmación:

- Aprobado.
- Pagado.
- Rechazado.

El cambio registra:

- estado anterior;
- estado nuevo;
- motivo;
- bitácora;
- actividad administrativa.

Si el reclamo pasa a Aprobado o Pagado sin monto aprobado, queda marcada la alerta de monto aprobado pendiente de confirmar.

Las gestiones relacionadas solo se marcan como resueltas cuando el reclamo queda Pagado o Rechazado, y siempre con nota trazable.

## Cancelaciones — cambios aplicados

Ahora Recuperada y No recuperable requieren nota o motivo.

Para recuperaciones activas, la plataforma busca una oportunidad existente antes de crear una nueva. Si ya existe, la actualiza y guarda referencia en la cancelación.

Para recuperación marcada como Recuperada, la plataforma busca una gestión existente antes de crear/preparar una nueva gestión de reemisión.

La reemisión se describe como preparada en Ops; no se afirma reactivación automática de póliza.

## Validación previa

Antes de subir los cambios se validaron archivos temporales con `node --check`:

- `siniestros_hotfix.js`: OK.
- `cancelaciones_hotfix.js`: OK.

## Validación remota

Se verificó en GitHub que:

- Siniestros contiene motivo obligatorio para estados finales.
- Siniestros conserva bitácora y alerta de monto aprobado pendiente.
- Cancelaciones contiene búsqueda de negocio y gestión existente.
- Cancelaciones guarda referencias de recuperación.
- El mensaje final usa lenguaje de preparación, no reactivación automática.

## Pendiente

Falta validación local final en repo completo:

- `node --check orbit360-platform/modules/siniestros.js`
- `node --check orbit360-platform/modules/cancelaciones.js`
- validador backend LAB si está disponible.

No se debe considerar deployable hasta smoke local.

## Impacto Claude/prototipo

Claude debe conservar:

- motivo obligatorio para estados finales de siniestros;
- bitácora visible;
- recuperación sin duplicar negocio o gestión;
- Recuperada no reactiva póliza automáticamente;
- lenguaje honesto: preparar no ejecutar si no hay backend/canal real.

## Impacto Academia

Academia debe enseñar:

- diferencia entre estados operativos y finales de siniestros;
- por qué los estados finales requieren motivo;
- cómo se documenta la recuperación de una cancelación;
- por qué no se deben duplicar oportunidades;
- recuperación no equivale a emisión automática.

## Estado

Hotfix funcional aplicado.
Pendiente validación local/smoke.

No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No datos reales.
No secretos.
