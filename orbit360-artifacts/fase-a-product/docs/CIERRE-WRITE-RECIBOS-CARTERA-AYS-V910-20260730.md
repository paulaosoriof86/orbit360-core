# CIERRE WRITE — RECIBOS / CARTERA A&S 9.1.0

Fecha operativa: 2026-07-30  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Estado

`WRITE_PASS`

## Autorización

Frase autorizada: `AUTORIZO ESCRITURA CONTROLADA RECIBOS CARTERA AYS V910 20260730`.

Request inmutable: `.github/orbit360-requests/receipts-portfolio-write-v910-20260730.json`  
Commit request: `b91435847e126676e7f070bc0671ad1aa1f96cd8`.

La autorización se utilizó sobre un único request. El primer run autorizado `30603147547` se detuvo antes de secretos/Firestore/writer por `VALIDATOR_STALE`; no hubo escritura. La causa raíz quedó cerrada en `CIERRE-VALIDATOR-STALE-AUTORIZACION-RECIBOS-CARTERA-V910-20260730.md` y la reanudación usó el mismo request inmutable, sin segunda autorización.

## Run de escritura exitoso

- run: `30603384289`
- job: `91070600699`
- artifact: `8782716350`
- artifact digest: `sha256:42df5bb30cb1332187a3f0731265821f34cfadcb76b83cdf70d532314b319d85`
- status: `WRITE_PASS`
- rollback ejecutado: `false`
- rollback restored: `false`

## Baseline antes

```text
clientes: 430
aseguradoras: 30
asesores: 7
polizas: 1373
vehiculos: 1032
recibosEsperados: 0
carteraPrimas: 0
cobros: 0
finmovs: 0
```

## Estado después

```text
clientes: 430
aseguradoras: 30
asesores: 7
polizas: 1373
vehiculos: 1032
recibosEsperados: 1293
carteraPrimas: 673
cobros: 0
finmovs: 0
```

## Composición

```text
recibos activos preservados: 1261
cartera activa preservada: 641
recibos históricos exigibles: 32
cartera histórica exigible: 32
monto histórico exigible: Q 13,443.48
exigible/vencido total: 131
futuro activo: 542
```

Fuentes del delta histórico:

```text
SIGA: 27
Mapfre: 4
El Roble: 1
```

## Validación final

```text
missingParents: 0
activeInvalidPolicyState: 0
historicalInvalidPolicyState: 0
historicalTermNotExpired: 0
relationMismatches: 0
targetReceiptCollisions: 0
targetPortfolioCollisions: 0
activePolicies: 224
activePoliciesWithCalendar: 223
activePoliciesWithoutCalendar: 1
futurePoliciesExcluded: 7
```

La fecha de exigibilidad puede superar el fin de cobertura cuando la obligación vigente lo confirma; no se reactiva la póliza ni se genera un calendario nuevo por ello.

## Escrituras

```text
recibosEsperados: 1293
carteraPrimas: 673
auditoria: 1
cobros: 0
finmovs: 0
operationalWrites: 1966
firestoreWrites totales: 1967
```

Pólizas, Vehículos, Clientes, Aseguradoras y Asesores conservaron sus conteos exactos.

## Siguiente gate funcional

Antes de Cobros/conciliación es obligatoria una revisión visual única de:

- Cliente 360 → póliza → vehículo(s) → calendario;
- recibos futuros, por vencer y vencidos;
- `pago_reportado` como estado pendiente de conciliación, no como cobro aplicado;
- cartera activa vs cartera histórica exigible;
- términos históricos sin cuotas nuevas ni reactivación;
- cero copy técnico visible.

No se avanza a Cobros hasta cerrar esa revisión visual.

## Carriles

- A · UX/visual: siguiente acción inmediata.
- B · backend/write guard: `WRITE_PASS`, causa raíz del validator stale cerrada.
- C · datos reales: 1293 recibos + 673 cartera materializados; downstream financiero aún en cero.

## Claude / Academia

- patrón de dominio cartera activa/histórica y lifecycle PREWRITE/AUTHORIZED_WRITE: reusable sin datos reales;
- writer, request, hashes, artifacts y fuentes privadas: `BACKEND_PROTEGIDO_NO_CLAUDE` / `SECRETO_DATO_REAL`;
- Academia ya actualizada con autoridad de fuente y ciclo de autorización.
