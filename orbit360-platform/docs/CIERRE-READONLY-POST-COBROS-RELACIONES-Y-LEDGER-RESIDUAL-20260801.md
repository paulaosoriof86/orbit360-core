# CIERRE READ-ONLY POST-COBROS — RELACIONES Y LEDGER RESIDUAL

**Fecha:** 2026-08-01  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Gate:** `block10.9-cobros-controlled-write-lab-v20260801`  
**Contrato:** `10.9.0`  
**Entorno:** LAB  
**Deploy / producción / main / merge:** no ejecutados

## 1. Resultado

La verificación posterior al `WRITE_PASS` cerró con:

```text
POST_CLOSE_RELATIONS_PASS
```

Evidencia final:

```text
run: 30713372720
job: 91404684192
artifact: 8822577914
artifact digest: sha256:f3f76d7cad4bd5e44a55ed5ceea915b0f02cb3e93e1d389ebe9553701845b614
HEAD: 1496c7e42dabdb9329ae1dbc3e582973309e5549
```

## 2. Relaciones verificadas

```text
casos: 5
casos directos: 4
caso histórico reforzado: 1
relaciones cobro ↔ póliza: 5/5
relaciones cobro ↔ recibo: 5/5
referencias de autorización: 5/5
claves de idempotencia: 5/5
estados de póliza preservados: 5/5
casos sin finmov: 5/5
casos inválidos: 0
```

Estado LAB comprobado:

```text
polizas: 1373
recibosEsperados: 1294
cobros: 5
finmovs: 0
```

El recibo histórico existe, mantiene su relación correcta y no reactivó la póliza vencida/no renovada.

## 3. Seguridad y alcance

- request 10.9 sellado;
- replay bloqueado;
- writer genérico de Cobros bloqueado;
- Firestore writes: 0;
- operational writes: 0;
- navegador: 0;
- deploy: 0;
- producción: intacta;
- evidencia sin PII, importes, números de póliza ni secretos.

## 4. Incidencia metodológica y causa raíz

La primera versión del verificador post-cierre reportó una inconsistencia en los recibos directos. El diagnóstico demostró que:

- las cinco relaciones de póliza, recibo, autorización e idempotencia eran correctas;
- los cinco estados de póliza estaban preservados;
- los cinco casos mantenían cero `finmovs`;
- el único campo señalado era el mapa anidado `conciliacion`.

Clasificación:

```text
VALIDATOR_STALE
```

Causa raíz:

El verificador exigía igualdad exacta del mapa anidado `conciliacion`, aunque la escritura con `merge` conserva metadatos adicionales válidos. Se corrigió el validador para aplicar comparación recursiva por subconjunto esperado, sin relajar los campos contractuales ni modificar producto o datos operativos.

Evidencia diagnóstica:

```text
run: 30713306139
artifact: 8822557910
artifact digest: sha256:20e89e3435125b6e80ba4194ea5ae81913b7402aa5c927cc0e62fb72364e9f83
campo divergente detectado: conciliacion
```

## 5. Carriles

### Carril A — frontend, UX y Academia

No se modificó la UI. Se registra como patrón reusable que el estado visible de conciliación debe ser honesto y que metadatos adicionales no deben crear falsos negativos visuales.

### Carril B — backend, seguridad y gates

Se corrigió exclusivamente el mecanismo del validador. El lifecycle quedó `CLOSED_WRITE_PASS_POST_VERIFIED`, sin capacidad de lectura, escritura, deploy o replay.

### Carril C — datos reales A&S

No hubo nuevas escrituras. Los cinco cobros permanecen íntegros. El ledger fuente conserva:

```text
filas de pagos de aseguradora revisadas: 9
candidatos uno-a-uno aplicados: 5
HOLD / NO_MATCH pendientes: 4
```

Los cuatro casos pendientes no pueden inferirse ni reconstruirse desde evidencia agregada.

## 6. Ruta crítica vigente

El Plan Maestro separa:

```text
Cobros realizados
→ Conciliación
→ Planillas y comisiones
```

El cierre de los cinco candidatos uno-a-uno no autoriza saltar los cuatro casos `HOLD/NO_MATCH`. El siguiente bloque corresponde a un ledger residual read-only de esos cuatro casos usando las fuentes vigentes y trazabilidad por fila.

## 7. Siguiente acción exacta

```text
localizar las fuentes autoritativas vigentes de las 9 filas
→ reconstruir únicamente el ledger residual de 4 HOLD/NO_MATCH
→ verificar si permanecen sin coincidencia o existe evidencia nueva suficiente
→ no escribir ni inferir coincidencias
→ si los 4 quedan resueltos o ratificados con evidencia, cerrar Conciliación
→ solo entonces pasar a Planillas y comisiones
```
