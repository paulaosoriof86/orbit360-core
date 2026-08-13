# Cierre LAB — Gate 10.9 de escritura controlada de Cobros

Fecha: 2026-08-01  
Tenant: `alianzas-soluciones`  
Proyecto: `ays-orbit-360-lab`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block10.9-cobros-controlled-write-lab-v20260801`

## Estado

`STOP_RETRY_DATA_CONTRACT_FAILURE`

La Dirección autorizó cuatro casos directos y un caso histórico reforzado. El preflight estático cerró PASS, pero la fase de ejecución LAB no logró completar los cinco grupos después de dos intentos. Conforme al contrato metodológico, no habrá una tercera ejecución, otro request ni otro parche de escritura hasta cerrar la causa raíz.

## Preflight cerrado

```text
run: 30710608492
artifact: 8821741047
digest: sha256:6da1eb4d5fd39ce350ac31b4f9dd2a1ecb34b713346f14cc9d35f23a6e50ed00
resultado: PASS
```

Plan aprobado:

```text
casos: 5
directos: 4
histórico reforzado: 1
grupos atómicos: 5
snapshots: 11
operaciones: 10
rollback steps: 11
```

## Primera ejecución LAB

```text
run: 30711389436
artifact: 8821984014
clasificación: DATA_CONTRACT_FAILURE_CANONICALIZATION
fallo: PRIVATE_PACKAGE_LOGICAL_SHA
Firestore leído: no
escrituras operativas: 0
```

La causa fue una diferencia de canonicalización numérica entre el productor y Node. El fallo ocurrió antes de abrir Firestore y no consumió la autorización.

## Segunda y última ejecución LAB

```text
run: 30711578397
artifact: 8822041409
digest: sha256:f9bd2cde8107481243b2937df11c434a2cff91eeccbbf99569b0f47c9b5f2b00
clasificación: DATA_CONTRACT_FAILURE
fallo: RECEIPT_SNAPSHOT_MISMATCH
caso afectado: tercera tarjeta directa
```

El request, el contrato canónico y el paquete privado pasaron. El baseline leído fue:

```text
polizas: 1373
recibosEsperados: 1293
cobros: 0
finmovs: 0
```

Los dos primeros grupos se ejecutaron de manera transitoria:

```text
cobros insertados temporalmente: 2
recibos actualizados temporalmente: 2
pólizas modificadas: 0
finmovs creados: 0
```

Al validar el snapshot previo del tercer recibo, Firestore no coincidió con la representación esperada en el paquete privado. El gate se detuvo antes de escribir el tercer caso.

## Rollback

El rollback global se ejecutó sobre los dos grupos completados y verificó la restauración:

```text
rollback ejecutado: sí
rollback restaurado: sí
grupos revertidos: 2
```

Estado final comprobado:

```text
polizas: 1373
recibosEsperados: 1293
cobros: 0
finmovs: 0
escrituras operativas remanentes: 0
```

No quedó un cobro parcial ni una actualización parcial de recibos.

## Seguridad y límites

```text
browser: no
deploy: no
Rules: no
Functions: no
producción: intacta
writer genérico abierto para cobros: no
```

El caso histórico no llegó a ejecutarse. Ninguna póliza fue modificada o reactivada y no se creó `finmov`.

## Causa que debe diagnosticarse

La tercera tarjeta corresponde a la referencia opaca:

`cob-auth-d9ed3d5aa03f198a469439cc`

El error indica que el documento real de `recibosEsperados` no coincide con el snapshot esperado del paquete privado. Todavía no está determinado qué campo difiere. No se debe corregir por inferencia ni reemplazar el documento real con la representación canónica sin diagnóstico.

## Siguiente acción exacta

```text
mantener gate 10.9 congelado
→ ejecutar diagnóstico read-only del recibo de la tercera tarjeta
→ comparar nombres de campos, tipos y valores mediante hashes sanitizados
→ clasificar la divergencia como proyección, contrato canónico o dato real
→ documentar causa raíz y alcance transversal
→ decidir expresamente si se reabre el mismo gate
```

El diagnóstico no debe escribir, desplegar, abrir navegador ni pedir nuevamente las fuentes ya registradas.
