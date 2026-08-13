# Cierre del contrato de promoción financiero histórico → movimientos operativos

Fecha: 2026-07-13  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Carriles: B y C  
Estado: contrato implementado; propuesta únicamente; cero escrituras

## Necesidad

El dry-run financiero histórico no puede convertirse automáticamente en movimientos operativos. Debe existir una puerta explícita que diferencie:

- registro histórico reconciliado;
- movimiento realmente ejecutado;
- movimiento pendiente o parcial;
- saldo de apertura;
- financiamiento;
- duplicado ya promovido.

## Implementación

Contrato:

`core/financiero-historico-finmovs-promotion-contract-p0.js`

Validador:

`tools/orbit360-validar-financiero-historico-finmovs-promotion-p0.mjs`

CI:

`.github/workflows/orbit360-financiero-historico-finmovs-promotion-p0-smoke.yml`

## Puertas bloqueantes

Solo se propone una operación `create` cuando se cumplen simultáneamente:

1. `tenantId` presente;
2. país soportado;
3. GT usa GTQ y CO usa COP;
4. estado fuente `REALIZADO`;
5. candidato `LISTO_FINMOVS` o `LISTO_FINMOVS_NATURE_FINANCING`;
6. fecha exacta válida;
7. monto de caja distinto de cero;
8. dirección ingreso o egreso;
9. no es saldo de apertura;
10. trazabilidad completa;
11. no representa cobro, cartera, póliza o creación de cliente;
12. no declara comisión como recaudo de prima;
13. no existe duplicado por ID destino, registro fuente o hash de trazabilidad.

## Naturaleza financiera

Los financiamientos conservan:

```txt
nature = financing
isOperatingIncome = false
isPremiumCollection = false
```

Un ingreso por comisión conserva:

```txt
isPremiumCollection = false
```

Por tanto, no alimenta producción ni metas de prima neta recaudada.

## Duplicados

El contrato genera un fingerprint determinista y bloquea repetición por:

- ID de destino;
- `sourceRecordId`;
- `sourceTraceHash`.

El resultado es `omit`, nunca sobrescritura automática.

## Resultado del contrato

El contrato devuelve una propuesta con:

```txt
create
omit
requires_validation
```

Además declara:

```txt
writeAuthorized = false
```

No contiene llamadas a `Orbit.store`, almacenamiento del navegador ni funciones de escritura.

## Trazabilidad de destino

Cada propuesta a `finmovs` conserva:

- colección origen `financiero_historico`;
- ID del registro origen;
- hash de trazabilidad;
- lote de importación;
- país;
- moneda;
- fecha;
- periodo;
- categoría;
- contraparte referenciada;
- naturaleza financiera.

## Archivos protegidos

No fueron modificados:

- `data/store.js`;
- `data/store-firestore-lab.local.js`;
- `core/backend-lab-*`;
- `core/auth.js`;
- `core/importa.js`;
- `firestore.rules`;
- pipeline existente.

## Carriles

### Carril A

Sin cambios directos. Se documentó un delta separado para la siguiente candidata/Academia.

### Carril B

Puerta reusable implementada y cubierta por smoke de CI.

### Carril C

Las 841 filas del dry-run siguen sin escritura. Solo los registros realizados, fechados y no duplicados podrán generar una propuesta futura.

## Siguiente acción

El siguiente bloque independiente puede preparar el contrato de escritura controlada específico para:

```txt
financiero_historico → finmovs
```

pero deberá permanecer inactivo hasta disponer de:

- backend productivo;
- membresía multirol;
- diff aprobado;
- confirmación explícita;
- auditoría antes/después;
- rollback.

Acción manual requerida: ninguna.
