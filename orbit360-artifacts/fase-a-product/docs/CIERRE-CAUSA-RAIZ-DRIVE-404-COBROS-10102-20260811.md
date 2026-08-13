# Cierre causa raíz — Cobros 10.10.2 · DRIVE_404 — 2026-08-11

## Resultado gobernante

`ENVIRONMENT_FAILURE / PRIVATE_PACKAGE_LAB_READER_PERMISSION` — causa raíz diagnosticada y corregida. El runtime materializador **no** se reejecutó.

## Runtime detenido

- Gate: `block10.10-cobros-full-ledger-write-lab-v20260805`
- Contrato: `10.10.2`
- Run: `31553043940`
- Request commit: `4dcab95ae0803d4e772ed88e2fa6b34cd4e304e2`
- `GO_GATE_CONTRACT`: PASS antes de secretos/Drive/Firestore
- Request exclusivo, parent-bound e inmutable: PASS
- Terminal: `ENVIRONMENT_FAILURE:DRIVE_404`
- Checkpoint: `PRIVATE_PACKAGE_DRIVE_DOWNLOAD_AFTER_GO_GATE_CONTRACT`
- Writer: no ejecutado
- Firestore read: 0
- Firestore writes: 0
- forward writes: 0/1098
- Pólizas/Recibos/finmovs writes: 0
- Auth/Hosting/Functions/Rules/reimportación/producción/main/merge: 0
- Request: consumido y congelado; replay prohibido

## Causa raíz demostrada

El paquete V3 existe en Drive con el mismo file ID `1t4di7P2z6OQVnT8LF5CtEMg_latkW7Cx`, nombre contractual y tamaño 857161 bytes. Antes de la reparación su metadata indicaba `shared:false` y únicamente permiso owner de Paula Osorio.

Se comparó con el paquete privado exitoso de Cobros 10.9. Ese archivo mantiene como reader técnico a:

`firebase-adminsdk-fbsvc@ays-orbit-360-lab.iam.gserviceaccount.com`

El V3 10.10.2 no tenía ese permiso. Drive oculta archivos no compartidos al service account mediante 404; por eso el runner pudo pasar OAuth pero no descargar el paquete.

## Reparación mínima

Se restauró únicamente permiso `reader` al mismo service account LAB previamente probado. Verificación posterior:

- owner Paula: preservado;
- reader técnico LAB: presente;
- `shared:true`;
- acceso público: no agregado;
- contenido del paquete: no reemplazado;
- ubicación/file ID: preservados;
- Firestore/producto: no tocados.

## Corrección de evidencia

El fallback automático del runtime había heredado erróneamente la clasificación `AUTHORIZED_LAB_RUN_SCOPED_LEDGER_WRITE_READY` del preflight y registró `secretsRead:false`. El log demuestra que el secreto técnico sí se materializó después de `GO_GATE_CONTRACT` para obtener el token Drive y que el terminal fue `DRIVE_404` antes de Firestore. La evidencia sanitizada y el ledger de consumo se corrigieron sin mutar el request.

Clasificación de esa inconsistencia documental: `VALIDATOR_STALE` en el sealer/fallback de evidencia. No produjo acceso adicional ni escrituras.

## Anti-bucle

No se repite run `31553043940` y no se reutiliza el request `cobros-full-ledger-write-lab-v20260811-r1`. La causa raíz del stage fallido ya está cerrada; cualquier nueva ejecución requiere autorización humana nueva, request nuevo parent-bound y `GO_GATE_CONTRACT` nuevamente antes de secretos.

## Estado productivo

Permanece `80% complete / 20% remaining`. No se asignan puntos por diagnóstico ni reparación de entorno.

## Siguiente acción exacta

Esperar una nueva autorización explícita para una sola ejecución post-rootcause. Solo entonces crear un request nuevo y exclusivo, verificar primero el permiso del V3 y `GO_GATE_CONTRACT`, y ejecutar una única materialización 10.10.2. Si falla nuevamente el mismo stage/familia, `STOP_RETRY` sin otro intento.
