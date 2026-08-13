# Incidente LAB — readiness de carga inicial

Fecha: 2026-07-14

## Carril

- Carril C: carga real controlada de Clientes y Aseguradoras.
- Guardas B: Auth Firebase LAB, tenant, lectura previa, cero escritura antes de confirmación.

## Hallazgo

El dry-run quedaba detenido en `Los datos del entorno aún no terminaron de sincronizar` aunque la sesión canónica LAB ya estaba activa.

## Causa raíz

El readiness dependía de `snapshotAttached`, una señal de listeners en tiempo real que no se consolidaba de forma confiable en el preview. Esa señal no equivalía a que las colecciones requeridas por el dry-run estuvieran efectivamente disponibles.

## Corrección

- `core/backend-lab-import-readiness-guard.js` ahora realiza una lectura única, autenticada y sin escritura de:
  - `clientes`;
  - `aseguradoras`;
  - `asesores`.
- Las filas leídas se cargan en las referencias de caché de `Orbit.store` y se emiten los eventos de colección.
- El contrato existente recibe `snapshotAttached=true` únicamente después de completar esas tres lecturas; se registra `snapshotMode=critical-one-shot`.
- Los listeners en tiempo real continúan como mejora de segundo plano, pero ya no bloquean el dry-run.
- En caso de error, la UI identifica la colección y distingue sesión, permisos, indisponibilidad o error de lectura.
- No se modifica el JSON sanitizado ni se ejecuta ninguna escritura automática.

## Archivos

- `orbit360-platform/core/backend-lab-import-readiness-guard.js`
- `orbit360-platform/core/backend-lab-init.js`

## Commits

- `782450870a2cc0a12bb14bae0fb977d85ac37827`
- `2da91a37c32ba72effc8d49eaebb760aacd6c58f`

## Estado

Fix aplicado en `ays/backend-tenant-lab-v99-20260703`. PR #5 permanece draft/open, sin merge a `main`.

## Validación pendiente

1. Redeploy automático del preview.
2. Abrir la puerta oficial del LAB.
3. Seleccionar el mismo JSON.
4. Ejecutar `Preparar dry-run`.
5. Confirmar resumen y `Bloqueos = 0` antes de habilitar escritura.

## Claude / prototipo

Patrón reusable: un importador no debe confundir listeners registrados con datos listos. Debe declarar las colecciones mínimas requeridas, hacer lectura previa explícita, mostrar conteos y bloquear con causa concreta. No trasladar código Firebase, secretos ni datos reales a Claude.

## Academia

Explicar diferencia entre autenticación, lectura previa, listeners en tiempo real, dry-run y escritura confirmada. Incluir tratamiento de errores de permisos y disponibilidad sin recomendar relajar reglas de seguridad.
