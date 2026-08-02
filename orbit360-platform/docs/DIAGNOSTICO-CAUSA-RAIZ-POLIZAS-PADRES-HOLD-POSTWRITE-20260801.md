# Diagnóstico de causa raíz — Pólizas y padres excluidos en HOLD

Fecha: 2026-08-01  
Gate congelado: `block7-policies-canonical-postwrite-revalidation-readonly-v20260801`  
Contrato: `7.6.0`

## Estado

El gate 7.6 fue congelado después de dos fallos en la misma etapa. No se permiten más reintentos con este lifecycle.

```text
Primer intento: 30727254049
Clasificación: VALIDATOR_STALE
Causa: variable de evidencia inexistente
Escrituras: 0

Segundo intento: 30727341881
Clasificación: DATA_CONTRACT_FAILURE
Límite alcanzado: validación de relaciones de Pólizas
Escrituras: 0
```

## Evidencia preservada

Los dos intentos confirmaron sin deriva:

```text
sourceSnapshotDigest:
88b8e16b0d4531b2f5c0ce2b1a21068837853080943f7584f6f3fab0cc2ff18d

targetSnapshotAfterDigest:
724e1efbbc29f60791350ea180ef54230ecf888f9914b98fc70fda62ca6ac305
```

También se confirmó:

- 414 Clientes compartidos con paridad semántica;
- 26 Aseguradoras compartidas con paridad semántica;
- cero conflictos críticos en esos 440 registros;
- 16 Clientes heredados y 4 Aseguradoras heredadas siguen fuera de la ruta canónica en `REQUIERE_VALIDACION`;
- cinco seeds canónicos permanecen conservados;
- cero escrituras durante la revalidación.

## Causa raíz

La escritura 7.5 creó correctamente los 4,377 documentos aprobados y probó que sus payloads coincidían con el plan. El gate 7.4 había validado las relaciones de Pólizas contra el universo heredado completo de 430 Clientes y 30 Aseguradoras.

El gate 7.6 aplicó una condición más estricta y correcta para el read model: los padres debían existir dentro del conjunto canónico operativo de 414 Clientes y 26 Aseguradoras. La ejecución pasó Clientes y Aseguradoras y se detuvo al validar Pólizas.

La conclusión con confianza alta es:

```text
CANONICAL_POLICIES_REFERENCE_EXCLUDED_VALIDATION_PARENTS
```

Al menos una Póliza migrada depende de uno o más de los veinte registros excluidos por permanecer en `REQUIERE_VALIDACION`.

Esto no demuestra corrupción de la Póliza ni invalidez del padre. Demuestra que excluir completamente esos padres del destino rompe integridad referencial para las Pólizas que sí fueron migradas.

## Por qué no se corrige todavía

Aún no está medido:

- cuántas Pólizas dependen de los 16 Clientes retenidos;
- cuántas dependen de las 4 Aseguradoras retenidas;
- si una misma Póliza depende de ambos tipos de padre;
- qué Vehículos, Recibos, Cartera o Cobros quedan vinculados a esas Pólizas;
- cuáles de los veinte padres pueden migrarse conservando `REQUIERE_VALIDACION` sin habilitarlos operativamente.

No se debe elegir entre migrar padres o retener Pólizas sin ese mapa exacto.

## Estado de seguridad

```text
Firestore writes gate 7.6: 0
Operational writes gate 7.6: 0
Frontend adaptado: no
Navegador: no
Preview: no
Deploy: no
Producción: no
Main/merge: no
```

La escritura 7.5 permanece intacta; no se requiere rollback porque no se detectó corrupción ni deriva de payloads.

## Siguiente gate requerido

Debe ser un diagnóstico read-only de dependencias de padres HOLD que produzca únicamente agregados sanitizados:

1. conteo de Pólizas afectadas por Clientes HOLD;
2. conteo de Pólizas afectadas por Aseguradoras HOLD;
3. intersección entre ambos grupos;
4. dependencias descendentes por módulo;
5. clasificación de cada padre como migrable en `REQUIERE_VALIDACION` o bloqueo real;
6. dry-run de alternativas sin escribir:
   - migrar el padre preservando HOLD operativo;
   - mantener el padre fuera y retener dependientes;
   - crear referencia de corrección, sin inventar datos.

La ejecución requiere autorización nueva.
