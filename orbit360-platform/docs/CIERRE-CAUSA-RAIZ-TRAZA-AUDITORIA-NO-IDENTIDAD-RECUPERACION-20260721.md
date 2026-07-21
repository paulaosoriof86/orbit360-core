# Cierre de causa raíz — traza de auditoría no es clave de identidad

Fecha: 2026-07-21  
Incidente: `insurer-directory-protected-reference-regression-v20260721`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Alcance: recuperación read-only de 68 referencias y tratamiento de 2 filas duplicadas GT

## Estado preservado

- 414 clientes, 26 aseguradoras y 7 asesores.
- 23 referencias bancarias válidas en documentos.
- 70 filas `backend_required`.
- 91 registros bancarios completos preservados en bóveda.
- 68 referencias recuperables de forma exacta.
- 2 filas entrantes duplicadas de G&T que deben retirarse conservando las referencias válidas existentes.
- 0 valores bancarios completos en documentos/store.
- Colombia intacta.
- Cero escritura, migración o deploy durante todos los diagnósticos descritos aquí.

## Fallos observados

### Run 29860654183

- Preflight: GO.
- Validador estático: GO.
- Runtime read-only: `RECOVERY_TRACE_MISMATCH`.
- Cuenta inicial identificada por hash: `gt-aseguradora-general / account_general_01`.
- Escrituras: 0.

### Run 29861579095

- Falló antes del runtime por serialización minificada del mapa.
- Clasificación: `VALIDATOR_STALE`.
- Secrets/runtime/escrituras: 0.
- Se restauró únicamente el formato JSON canónico requerido por el contrato.

### Run 29861813399

- Preflight: GO.
- Validador estático: GO.
- Runtime read-only: nuevamente `RECOVERY_TRACE_MISMATCH` sobre la misma identidad.
- Escrituras: 0.

Después de dos fallos del mismo código se detuvieron los reintentos.

## Causa raíz

Clasificación principal:

```txt
DATA_CONTRACT_FAILURE
```

Clasificación secundaria:

```txt
VALIDATOR_STALE
```

El mapa histórico identifica cada recuperación mediante:

- `insurerId`;
- `currentAccountId` único;
- `legacyAccountId` único en bóveda;
- hash del identificador actual;
- hash del identificador histórico;
- hash de la referencia protegida esperada;
- cobertura uno a uno de 68 referencias;
- 0 ambigüedades y 0 filas sin mapear.

El dry-run añadió posteriormente una igualdad obligatoria contra `fuenteTraza.hoja/fila`. Esa traza fue creada por el parser sobre matrices producidas con `blankrows:false`; por tanto, su fila puede representar el ordinal de filas no vacías y no necesariamente la fila física del Excel. Además, la traza puede variar entre versiones de lectura sin que cambien la cuenta, la aseguradora, la referencia protegida o su identidad.

Conclusión vinculante:

```txt
La trazabilidad demuestra el origen y se conserva para auditoría.
No sustituye la identidad estable del recurso.
No puede bloquear por sí sola una recuperación ya resuelta por identificadores y hashes exactos.
```

## Corrección aplicada

1. El mapa conserva la reconciliación exacta de las 70 filas contra la fuente original válida.
2. El dry-run valida el contrato de trazabilidad, pero no compara la traza actual como clave de identidad.
3. La recuperación simulada continúa limitada a:
   - asignar `accountRef` en exactamente 68 cuentas;
   - retirar exactamente 2 filas duplicadas entrantes;
   - no modificar hoja, fila, contactos, portales, teléfonos, credenciales, links ni otros campos.
4. El validador estático exige:
   - 70 trazas reconciliadas;
   - 0 ambiguas y 0 sin mapear;
   - traza como metadato de auditoría;
   - cero escritura de campos de traza;
   - ausencia de los bloqueos obsoletos `RECOVERY_TRACE_MISMATCH` y `DUPLICATE_TRACE_MISMATCH`.
5. Academia diferencia trazabilidad auditable de identidad estable.

## No incluido en esta corrección

- No se modifica el parser productivo.
- No se reimportan directorios.
- No se escribe Firestore ni Secret Manager.
- No se corrigen datos operativos.
- No se toca Colombia.
- No se ejecuta deploy, navegador o revisión visual.

La corrección estructural futura del parser debe preservar explícitamente la fila física o registrar ambos sistemas de numeración. Ese trabajo permanece separado de la recuperación del incidente.

## Criterio único para el siguiente dry-run

Solo se acepta evidencia sanitizada `ok:true` con:

```txt
before: 414 clientes · 26 aseguradoras · 7 asesores
23 referencias válidas · 70 pendientes · 91 filas en bóveda · 0 valores completos
proposal: 68 restauraciones · 2 deduplicaciones · 13 documentos GT
0 cambios no relacionados · 0 cambios de traza · 0 cambios Colombia
simulatedAfter: 91 referencias válidas · 0 pendientes · 0 duplicadas
writesExecuted:false
deployExecuted:false
migrationExecuted:false
```

Si vuelve a fallar, no se autoriza otro intento hasta clasificar la nueva causa con el artefacto preservado.
