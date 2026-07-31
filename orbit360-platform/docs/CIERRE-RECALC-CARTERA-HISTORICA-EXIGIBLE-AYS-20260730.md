# CIERRE DE RECÁLCULO — CARTERA HISTÓRICA EXIGIBLE A&S

Fecha operativa: 2026-07-30  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Clasificación

`DATA_CONTRACT_FAILURE` del contrato 9.0.0 anterior, corregido de forma focal en Recibos/Cartera. Pólizas y Vehículos permanecen cerrados en `WRITE_PASS` y no se reimportan.

Durante el primer prewrite 9.1.0 apareció además un `PIPELINE_MECHANISM_FAILURE` aislado en la URI OAuth JWT. Se corrigió únicamente el `grant_type`; no cambiaron contrato, fuentes, hashes, datos ni writer. El segundo intento cerró correctamente.

## Regla cerrada

- Los términos `Vigente` y `Por renovar` continúan siendo los únicos que generan calendario activo.
- Un término vencido reciente no genera cuotas nuevas ni se reactiva.
- Si una fuente vigente confirma que un recibo/saldo del término vencido sigue pendiente, se conserva como `cartera_historica_exigible`.
- `Reciente` lo determina el horizonte de la fuente vigente, no un número arbitrario de meses.
- La fecha de cobro de una cuota puede ser posterior al fin de cobertura; eso no invalida por sí solo la obligación. La exigibilidad depende de la fuente y del vínculo seguro al término/póliza.
- Cuando existe balance de aseguradora, esa fuente sustituye el calendario SIGA para saldo, fecha y monto; no se duplican ambas versiones.
- Si no existe una fuente de aseguradora superior para ese caso, SIGA con corte 2026-07-30 conserva autoridad operativa.
- La aplicación FIFO se reserva para Cobros/conciliación; este bloque no crea `cobros` ni `finmovs`.

## Evidencia privada reconciliada

Paquete privado delta en Drive, fuera del repositorio:

- nombre: `ORBIT360-AYS-CARTERA-HISTORICA-EXIGIBLE-DELTA-PRIVATE-20260730.xlsx`
- fileId: `1wrUcZpcGZxG0H-elPwOmSzAI_i5OSqqT`
- physicalSha256: `780436042d53cdec354f1bcc96a7a16e874c0c947454d121230f7cb7d9703317`
- logicalSha256: `abb4189778e3cb3f1ffcf7e4f249645dcad88bcf522e2039be517e512f8a9d46`
- receiptIdDigest: `431cccd46a3f05308e58d6597b68a5c43f7e7fcf00c403f24090fa91fff9f03e`
- portfolioIdDigest: `7bffffbb09e03eefcefccb860a633433d0b8e2554a3bd874289d68173e2ef8f7`

El repositorio conserva solo hashes, conteos y reglas; no conserva filas privadas.

## Recálculo sanitizado

El universo SIGA inicialmente excluido por estado contractual aportó 70 candidatos `Histórica/Renovada`.

- 65 correspondían a términos ya vencidos y recibos vencidos/al corte.
- 5 quedaron fuera por término aún no vencido o recibo todavía futuro al corte.
- 27 obligaciones permanecen bajo autoridad SIGA porque no existe una fuente superior para ese caso.
- 5 obligaciones se reconstruyen desde balances vigentes de aseguradora: 4 Mapfre y 1 El Roble.
- Los candidatos SIGA sustituidos o no confirmados por una fuente superior no se materializan en paralelo.
- La fuente vigente de La Ceiba no confirmó de forma exacta el candidato histórico revisado; no se fuerza.

Resultado final del delta:

```text
recibos_historicos_exigibles: 32
cartera_historica_exigible: 32
monto GTQ: 13,443.48
fuente SIGA: 27
fuente Mapfre: 4
fuente El Roble: 1
cobros: 0
finmovs: 0
```

## Universo combinado 9.1.0

El paquete activo 9.0.0 se reutiliza como baseline inmutable:

```text
activo recibos: 1261
activo cartera: 641
activo exigible/vencido: 99
activo futuro: 542
pago_reportado: 365
```

Con el delta histórico validado:

```text
recibosEsperados objetivo: 1293
carteraPrimas objetivo: 673
exigible/vencido total: 131
futuro activo: 542
histórico exigible: 32
```

## Gate estático 9.1.0

- run: `30602668602` · SUCCESS
- artifact: `8782467117`
- gate: `block9-receipts-portfolio-static-v20260730`
- contrato: `9.1.0`
- checks canónicos: `30/30`
- operational writes: `0`
- secrets/Firestore/runtime/browser/deploy/producción: `0`

## Primer prewrite 9.1.0 — causa raíz cerrada

- run: `30602732429` · FAILURE antes de Firestore
- clasificación: `PIPELINE_MECHANISM_FAILURE`
- causa: URI `grant_type` OAuth JWT construida incorrectamente
- corrección: una sola línea, usando `urn:ietf:params:oauth:grant-type:jwt-bearer`
- Firestore read: `0`
- Firestore write: `0`
- operational writes: `0`
- bitácora: `BITACORA-CAUSA-RAIZ-PREWRITE-RECIBOS-CARTERA-V910-20260730.md`

## Prewrite read-only 9.1.0 — PASS

- run: `30602817285` · SUCCESS
- artifact: `8782520657`
- artifact digest: `sha256:f4d55558963d7f111711a0e6dd74b11d237b8868811dd7c1e35d09c79c04fd65`
- status: `PREWRITE_READY`
- package hashes: exactos
- baseline live: `430 / 30 / 7 / 1373 / 1032 / 0 / 0 / 0 / 0`
- recibos candidatos: `1293`
- cartera candidata: `673`
- históricos exigibles: `32`
- monto histórico exigible: `Q 13,443.48`
- missing parents: `0`
- invalid active policy state: `0`
- invalid historical policy state: `0`
- historical terms not expired: `0`
- relation mismatches: `0`
- receipt collisions: `0`
- portfolio collisions: `0`
- Firestore read: `true`
- Firestore writes: `0`
- operational writes: `0`
- `cobros`: `0`
- `finmovs`: `0`
- rollback: no ejecutado porque no hubo escritura

## Autorización

- El prewrite 9.0.0 queda congelado y no puede escribirse.
- No existe request de escritura 9.1.0.
- La autorización anterior no se reutiliza porque cambiaron universo, hashes y conteos.
- El estado actual sí permite solicitar **una única autorización macro** para crear exactamente `1293` `recibosEsperados` y `673` `carteraPrimas`, incluyendo `32` obligaciones históricas exigibles, con `cobros=0` y `finmovs=0`.
- El writer 9.1.0 es create-only, valida hashes/alcance, conserva baseline y dispone de rollback si falla la escritura.

## Estado

`PREWRITE_READY_9_1_0` — listo para autorización macro de escritura; cero escritura operativa realizada hasta este punto, cero deploy, cero producción.
