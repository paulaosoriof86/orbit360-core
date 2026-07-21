# Ledger — corrección estática 68 referencias + 2 cuentas nuevas

Fecha: 2026-07-21  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Incidente: `insurer-directory-protected-reference-regression-v20260721`

## Regla corregida

La interpretación por diferencia de conteos quedó prohibida:

```txt
70 pendientes - 68 referencias históricas faltantes ≠ 2 duplicados
```

La identidad debe demostrarse antes de eliminar, fusionar o reasignar un recurso.

Contrato confirmado:

```txt
68 restauraciones históricas exactas
2 cuentas G&T nuevas preservadas como backend_required
0 eliminaciones
0 creaciones
0 reordenamientos
```

## Cambios registrados

| Owner | Cambio | Clasificación | Estado |
|---|---|---|---|
| `tools/orbit360-bank-reference-recovery-map-v20260721.json` | Separa `recoveryMappings:68`, `newPendingRows:2` y `duplicateIncomingRows:0`. | `BACKEND_PROTEGIDO_NO_CLAUDE` | Alineado estáticamente. |
| `tools/orbit360-dryrun-recuperar-referencias-bancarias-exacto-v20260721.mjs` | Simula 68 cambios de `accountRef`; preserva las dos filas nuevas; prohíbe crear, borrar o reordenar. | `BACKEND_PROTEGIDO_NO_CLAUDE` | Sintaxis validada; runtime no autorizado. |
| `tools/orbit360-validar-importador-aseguradoras-atomico-v20260721.mjs` | Exige 68 restauraciones, 2 nuevas pendientes y 0 duplicados/eliminaciones. | `BACKEND_PROTEGIDO_NO_CLAUDE` | Sintaxis validada. |
| `.github/workflows/orbit360-importer-incident-readonly-diagnosis.yml` | Actualiza el contrato futuro y mantiene preflight separado, sin secrets ni runtime. | `BACKEND_PROTEGIDO_NO_CLAUDE` | YAML validado. |
| `tools/orbit360-gate-contract-overlay-importers-v20260720.json` | Eleva contrato a 1.1.3 y elimina toda expectativa de dos deduplicaciones. | `BACKEND_PROTEGIDO_NO_CLAUDE` | Alineado. |
| `tools/orbit360-incident-freeze-v20260721.json` | Autoriza únicamente un preflight central estático; runtime y escritura permanecen bloqueados. | `BACKEND_PROTEGIDO_NO_CLAUDE` | Preflight-only. |

## Carriles

### Carril A — frontend, UX y Academia

No hubo cambio funcional ni visual. Academia fue revisada y no requiere modificación porque no gobierna conteos, identidades, recuperación ni ejecución.

### Carril B — backend, seguridad y contratos

Se corrigieron juntos mapa, dry-run, validador, workflow, overlay y freeze. No se tocaron Functions, proveedores, `Orbit.store`, reglas, Auth ni adaptadores LAB/productivos.

### Carril C — datos reales A&S

Se preserva la clasificación confirmada:

```txt
414 clientes
26 aseguradoras
7 asesores
93 filas bancarias
23 referencias válidas actuales
68 referencias históricas por restaurar
2 cuentas nuevas pendientes
91 registros históricos en bóveda
0 valores completos en store
Colombia intacta
```

No hubo escritura, reimportación ni modificación de datos.

## Clasificación para Claude

Patrón reusable:

```txt
REPLICABLE_CLAUDE_ACUMULADO
```

Contenido compartible: nunca deduplicar por diferencia de conteos; exigir identidad estable y evidencia antes de borrar o fusionar.

No se comparte con Claude:

- identificadores reales del tenant;
- hashes de referencias;
- nombres de cuentas;
- datos de bóveda;
- scripts protegidos;
- credenciales, IAM o endpoints.

## Siguiente acción exacta

Ejecutar una sola vez el preflight central del gate `block1-real-insurer-directories-lab-v20260720` con:

```txt
secretsAllowed:false
firestoreReadAllowed:false
vaultReadAllowed:false
runtimeAllowed:false
writesAllowed:false
```

Aceptar únicamente `GO_GATE_CONTRACT`, cero fallos y evidencia sanitizada. Cualquier runtime posterior requiere autorización separada.
