# CIERRE READ-ONLY — COBROS / CONCILIACIÓN — LEDGER RESIDUAL DE 4 HOLD

**Fecha:** 2026-08-01  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Entorno:** LAB  
**Deploy / producción / main / merge:** no ejecutados

## 1. Resultado ejecutivo

Después del cierre `WRITE_PASS` y de la verificación posterior de los cinco cobros, se revisó el ledger residual de Conciliación.

Resultado:

```text
filas de aseguradora revisadas: 9
candidatos uno-a-uno aplicados y post-verificados: 5
filas residuales revisadas: 4
nuevos candidatos uno-a-uno: 0
HOLD / NO_MATCH confirmados: 4
escrituras: 0
```

El bloque de Conciliación no debe declararse cerrado todavía y no corresponde pasar a Planillas y Comisiones para estos cuatro casos.

## 2. Fuentes vigentes comprobadas

Se revisaron las fuentes autoritativas que sustentaron las nueve filas:

- reporte vigente de ingresos de Aseguradora General;
- reporte vigente de cobros Mapfre;
- reporte CRM de cobranza desde julio de 2026;
- reporte CRM histórico por fecha de pago, utilizado únicamente cuando la fila no estaba en el corte actual.

Se buscaron versiones posteriores al 30 de julio de 2026. No se localizó una fuente autoritativa más reciente que corrigiera o reemplazara las filas residuales.

No se usaron movimientos financieros, estados de cuenta ni datos agregados para inferir coincidencias.

## 3. Clasificación de los cuatro casos

### Residual 1 — diferencia material de importe

```text
póliza identificada en ambas fuentes: sí
referencia secundaria en ambas fuentes: sí
importe exacto: no
decisión: HOLD
```

La coincidencia de póliza y referencia no es suficiente cuando el importe reportado por la aseguradora no coincide con CRM. Requiere corrección de fuente o soporte autoritativo.

### Residual 2 — referencia secundaria incompleta en CRM

```text
póliza identificada en ambas fuentes: sí
importe exacto: sí
referencia secundaria en aseguradora: sí
referencia secundaria en CRM: no
fecha exacta: no
decisión: HOLD
```

No se autoriza completar la referencia por inferencia. Requiere confirmación documental o corrección del registro CRM.

### Residual 3 — diferencia material y referencia insuficiente

```text
póliza identificada en ambas fuentes: sí
importe exacto: no
referencia secundaria suficiente: no
decisión: HOLD
```

No existe evidencia suficiente para elegir un recibo de forma única.

### Residual 4 — diferencia menor fuera de tolerancia y fuente no vigente

```text
fila localizada en fuente histórica CRM: sí
fila localizada en el corte CRM actual: no
referencia secundaria: sí
importe exacto: no
diferencia dentro de tolerancia vigente: no
periodo actual comprobado: no
decisión: HOLD
```

Aunque la diferencia es pequeña, no puede redondearse ni homologarse automáticamente. Además, la evidencia CRM disponible corresponde a un periodo anterior y no demuestra el pago actual de aseguradora.

## 4. Controles preservados

- no se creó ningún cobro;
- no se actualizó ningún recibo;
- no se reactivó ninguna póliza;
- no se creó ningún `finmov`;
- no se avanzó ningún caso a comisión;
- no se forzó una coincidencia por póliza, fecha o importe aproximado;
- no se publicaron números de póliza, importes, clientes o referencias privadas;
- las filas reales mantienen trazabilidad privada de archivo, hoja y fila.

## 5. Clasificación metodológica

```text
DATA_CONTRACT_FAILURE / SOURCE_EVIDENCE_INSUFFICIENT
```

No existe un defecto funcional demostrado en Orbit 360. Tampoco corresponde modificar el validador para aceptar diferencias o campos faltantes.

El resultado correcto del sistema es `HOLD`, porque las fuentes no sustentan una aplicación uno-a-uno segura.

## 6. Carriles

### Carril A — frontend, UX y Academia

Debe conservarse el estado honesto `Pendiente de conciliación / Requiere validación de fuente`, sin presentar estos pagos como aplicados o conciliados.

### Carril B — backend y seguridad

No se abrió un nuevo writer ni un nuevo request de escritura. El gate 10.9 permanece sellado y no puede reutilizarse.

### Carril C — datos reales A&S

Los cuatro casos continúan en ledger residual. Para cambiar su clasificación se requiere nueva evidencia autoritativa, no una aproximación técnica.

## 7. Impacto Claude

Se acumuló el patrón reusable para:

- relaciones claras cobro–recibo–póliza;
- tolerancia a metadatos compatibles adicionales;
- estado `HOLD/NO_MATCH` honesto;
- separación Cobros → Conciliación → Comisiones → Finanzas;
- prohibición de coincidencias automáticas parciales.

No se compartieron datos reales ni backend protegido.

## 8. Impacto Academia

Academia debe enseñar que:

- misma póliza no implica mismo recibo;
- importe aproximado no equivale a conciliación;
- una referencia faltante no puede completarse por intuición;
- diferencias pequeñas también requieren una regla aprobada y evidencia vigente;
- un caso en `HOLD` no genera cobro, comisión ni movimiento financiero.

## 9. Estado del plan

La secuencia vigente continúa siendo:

```text
Cobros realizados
→ Conciliación
→ Planillas y comisiones
```

Los cinco cobros autorizados están cerrados y post-verificados. Conciliación permanece abierta únicamente por los cuatro residuales.

## 10. Siguiente acción exacta

```text
buscar o recibir evidencia autoritativa corregida para los cuatro HOLD
→ residual 1: confirmar importe correcto mediante soporte de aseguradora o CRM corregido
→ residual 2: confirmar la referencia secundaria faltante
→ residual 3: aportar referencia única e importe correcto
→ residual 4: obtener fuente CRM del periodo actual y resolver la diferencia
→ reconstruir dry-run únicamente para los casos con evidencia suficiente
→ mantener los demás en HOLD
→ cerrar Conciliación cuando el ledger quede resuelto o formalmente ratificado
→ pasar después a Planillas y comisiones
```

No se requiere autorización de escritura en este punto porque no existe ningún nuevo candidato elegible.
