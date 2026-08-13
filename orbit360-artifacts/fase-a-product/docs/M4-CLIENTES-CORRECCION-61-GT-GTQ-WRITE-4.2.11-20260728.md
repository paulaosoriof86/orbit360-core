# M4 4.2.11 — Escritura atómica de 61 correcciones GT/GTQ

Fecha: 2026-07-28  
Gate: `block4-client-country-correction-write-v20260728`  
Contrato: `4.2.11`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Autorización

Paula autorizó explícitamente aplicar exactamente las 61 correcciones `GT/GTQ` demostradas por el dry-run 4.2.6. La autorización no cubre Pólizas, Aseguradoras, overlay target, configuración, memberships, Rules, Hosting, Functions, producción, `main` ni merge.

## Baselines obligatorios

1. `m4-client-country-business-validation-correction-closure.json` — 4.2.6: 414 clientes, 61 sin moneda, 61 país no canónico, propuesta exacta `GT/GTQ`, 61 snapshots planificados y 61 auditorías planificadas.
2. `m4-post-retirement-revalidation-closure.json` — 4.2.10: 414 clientes, 26 aseguradoras, overlay 0/0 y estado durable sano.

## Escritura autorizada en éxito

```text
61 snapshots before durables
61 eventos append-only
61 updates de cliente: pais=GT, moneda=GTQ
Total: 183 escrituras operativas
```

No se crean ni eliminan clientes. No se escriben aseguradoras ni overlay.

## Selección y protección contra deriva

Antes del commit el runtime debe reconstruir la selección desde el estado remoto y demostrar nuevamente:

```text
clientes: 414
aseguradoras: 26
overlay cliente: 0
overlay aseguradora: 0
sin moneda: 61
sin moneda + país no canónico: 61
selección final: 61
```

Los otros 353 clientes se protegen mediante digest de colección excluyendo la selección. El digest debe ser idéntico antes y después.

## Rollback

Cada cliente recibe un snapshot exacto previo. Si la verificación posterior falla después del commit, se autoriza restaurar hasta 61 documentos desde esos snapshots y agregar hasta 61 eventos append-only de rollback. La evidencia exportada permanece agregada y sanitizada.

## Gate y causa raíz

Se ejecuta primero:

`node tools/orbit360-validar-gate-contracts-v20260717.mjs block4-client-country-correction-write-v20260728`

Solo `GO_GATE_CONTRACT` habilita secretos y runtime. Si la misma etapa o el mismo código falla dos veces, se detienen reintentos y se abre diagnóstico de causa raíz.

## Fuentes posteriores

Pólizas siguen bloqueadas. `Listado producción 2025-2026` no es fuente válida de Pólizas. Cuando llegue ese bloque se solicitará a Paula el listado/base actual y vigente específico. El mismo principio aplica a Vehículos, Recibos/cartera, Cobros y fuentes siguientes.

## Claude y Academia

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.  
Academia: `ACADEMIA_ACTUALIZAR`.

## Siguiente acción exacta

Publicar el paquete, actualizar el preflight canónico, crear una solicitud inmutable ligada al HEAD del paquete y ejecutar una sola vez.
