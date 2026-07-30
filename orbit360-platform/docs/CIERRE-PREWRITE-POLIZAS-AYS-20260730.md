# CIERRE PREWRITE PÓLIZAS A&S — 2026-07-30

Tenant: `alianzas-soluciones`  
Proyecto: `ays-orbit-360-lab`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: `PREWRITE_READY / REAL_WRITE_NOT_AUTHORIZED`

## 1. Resultado ejecutivo

El bloque de Pólizas quedó preparado hasta el límite previo a una escritura real, sin materializar todavía ninguna póliza, cliente, aseguradora, recibo, cartera, cobro o movimiento financiero.

Prewrite read-only:

- run: `30584100004`;
- artifact: `8775774711`;
- status: `PREWRITE_READY`;
- Firestore read: `true`;
- Firestore writes: `0`;
- operational writes: `0`.

Baseline confirmado inmediatamente antes de la futura escritura:

```txt
clientes: 414
aseguradoras: 26
asesores: 7
polizas: 0
recibosEsperados: 0
carteraPrimas: 0
cobros: 0
finmovs: 0
```

## 2. Paquete privado congelado

Archivo privado: `ORBIT360-AYS-POLIZAS-CANONICAL-PRIVATE-20260730`

```txt
physicalSha256: b63c5d10be40fcd4039be1b7844cafb0bf45c2a9904dd47ad65443b5fb43a89f
logicalSha256: 315a4f7169688a03a44e69edd608750e199c381cf6b532c574d7981f473e3011
targetIdDigest: bf3a21bbaae98cc5d2c14fd8068cc3b9c431c40ba3bdba96a0f4abe8aa701e2e
```

El payload real no vive en GitHub. Se mantiene en Drive privado y está compartido únicamente en lectura con la cuenta técnica LAB. El canal privado fue probado con hash exacto y cero escrituras operativas.

## 3. Plan de escritura congelado

```txt
clientes nuevos con calidad pendiente: 16
aseguradoras referencia restringida: 4
polizas a crear: 1373
polizas con calidad pendiente: 64
polizas excluidas: 4
recibos a escribir: 0
cartera a escribir: 0
cobros a escribir: 0
finmovs a escribir: 0
```

Post-write esperado, si se autoriza y pasa:

```txt
clientes: 430
aseguradoras: 30
asesores: 7
polizas: 1373
```

Las cuatro aseguradoras adicionales son referencias restringidas derivadas de pólizas históricas (`SURA`, `Colmena`, `Mundial`, `Liberty`). Quedan con:

- `requiereValidacion = true`;
- `validationStatus = requiere_validacion`;
- `estadoOperativo = pendiente_validacion`;
- `vinculada = false`;
- cotizador/comparativo/tarifas deshabilitados.

No se convierten en aseguradoras activas del tenant.

## 4. Clientes retenidos y creación desde Pólizas

La revisión del bloque previo de Clientes confirmó que los registros ausentes no eran una pérdida de migración: 26 filas habían quedado retenidas por grupos de duplicidad exacta/probable y no se escribieron automáticamente.

Para Pólizas se crean únicamente las 16 identidades realmente necesarias, cada una con:

- ID determinístico;
- `calidad_datos = pendiente_completar`;
- `validationStatus = pendiente_completar`;
- alertas de duplicidad cuando corresponde;
- sin inventar documentos ni fusionar pares probables.

## 5. Regla contractual de vigencia

Decisión confirmada por Paula:

> En el estado contractual de Pólizas manda la vigencia. Un valor fuente `Vencida` puede corresponder al estado de pago y se resolverá posteriormente con Recibos/Cobros.

Implementación:

- `Vencida` + vigencia activa → `Vigente` operativa;
- se conserva `estadoFuenteOriginal`;
- se marca contradicción de fuente para trazabilidad;
- `Terminada` y `Reexpedida` no se reactivan automáticamente;
- la condición de pago no se resuelve dentro de Pólizas.

## 6. Calidad pendiente de Pólizas

64 pólizas pueden persistirse como expediente histórico/contractual con calidad pendiente, pero no pueden materializar recibos/cartera mientras falten datos críticos.

Motivos principales, con superposición entre registros:

- periodicidad/conducto insuficiente;
- prima faltante;
- asesor histórico fuera del catálogo actual;
- aseguradora en referencia restringida.

Para esos registros se exige:

```txt
validationStatus = pendiente_completar
requiereValidacion = true
carteraMaterializada = false
recibosMaterializados = false
cobroAplicado = false
```

## 7. Exclusiones

4 pólizas quedan fuera del write package:

- 2 por vigencia invertida;
- 2 por aseguradora no identificable en la fuente.

No se adivina su relación.

## 8. País y moneda

Regla tenant A&S conservada con provenance:

- divisa explícita prevalece salvo contradicción demostrada por cliente/aseguradora/continuidad de término;
- sin divisa, GT/GTQ por defecto;
- importes muy altos pueden ser indicio de CO/COP;
- USD explícito se conserva;
- los conflictos corregidos preservan el valor fuente original y la evidencia de resolución.

Distribución final del paquete canónico:

```txt
GT/GTQ: 1266
CO/COP: 99
CO/USD: 7
GT/USD: 1
```

## 9. Causa raíz / gates cerrados

Durante la preparación se aplicó `STOP_RETRY` donde correspondía y se corrigieron capas responsables, no síntomas:

1. `VALIDATOR_STALE`: entrypoint canónico todavía enlazaba contrato 7.0.0.
2. `VALIDATOR_STALE`: validator esperaba identidad de póliza antigua sin `clienteId`.
3. `PIPELINE_MECHANISM_FAILURE`: test sintético del writer mantenía vivo un timer browser.
4. `ENVIRONMENT_FAILURE`: Drive API estaba deshabilitada en LAB; se habilitó una vez y queda reusable.
5. `VALIDATOR_STALE`: hash físico esperado anterior a la serialización final del XLSX.
6. `PIPELINE_MECHANISM_FAILURE`: mecanismo de evidencia del prewrite; se sustituyó por escritura atómica + parse self-check.

Resultado actual: prewrite PASS.

## 10. Reuso transversal

Este bloque deja reusable para Vehículos, Recibos/Cobros y fuentes posteriores:

- staging privado fuera de GitHub;
- hash físico + lógico;
- resolución idempotente de relaciones;
- IDs determinísticos;
- referencias restringidas fail-closed;
- calidad pendiente persistible sin activar procesos derivados;
- mismo motor para DRY_RUN y WRITE;
- baseline y post-write exactos;
- rollback fail-closed;
- request inmutable de una sola ejecución.

## 11. Autorización

La escritura real continúa bloqueada.

Request esperado:

```txt
.github/orbit360-requests/policies-write-20260730.json
```

Estado al cierre:

```txt
REQUEST: AUSENTE
REAL_WRITE: NO EJECUTADO
```

Única autorización macro válida para abrir el write:

```txt
AUTORIZO ESCRITURA CONTROLADA POLIZAS AYS 20260730
```

La autorización cubre exclusivamente:

- +16 clientes con calidad pendiente;
- +4 referencias de aseguradora restringidas/inactivas;
- +1,373 pólizas;
- 64 de ellas marcadas con calidad pendiente;
- 4 pólizas excluidas;
- 0 recibos;
- 0 cartera;
- 0 cobros;
- 0 finmovs.

Si cualquier invariant falla, el ejecutor debe restaurar el baseline y terminar `ROLLED_BACK_SAFE`.

## 12. Siguiente bloque después de WRITE_PASS

Vehículos, reutilizando la fuente `Reporte de vehículos 2017 a 2026.xlsx` ya recibida. No se solicitará nuevamente la historia completa; solo un delta posterior al 30-07-2026 si existiera al momento del bloque.
