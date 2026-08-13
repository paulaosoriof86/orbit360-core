# CLAUDE ACUMULADO — COBROS, RELACIONES, MERGE Y HOLD RESIDUAL

**Fecha:** 2026-08-01  
**Clasificación principal:** `REPLICABLE_CLAUDE_ACUMULADO`  
**Backend protegido:** `BACKEND_PROTEGIDO_NO_CLAUDE`  
**Datos A&S:** `TENANT_AYS_ONLY`

## Patrones reutilizables para el prototipo

### 1. Un cobro debe mostrar relaciones verificables

La experiencia de Cobros y Conciliación debe permitir identificar, sin copy técnico:

- el recibo al cual se aplicó;
- la póliza relacionada;
- si corresponde a un recibo vigente o histórico;
- el estado de validación y conciliación;
- la ausencia o existencia de un movimiento financiero separado.

No debe presentarse un cobro aislado sin su contexto operativo.

### 2. Los metadatos adicionales no invalidan el estado visible

Cuando el backend conserva metadatos adicionales válidos dentro de un objeto de conciliación, la UI debe consumir los campos contractuales que necesita y tolerar extensiones compatibles.

No debe asumir que un objeto es inválido únicamente porque contiene más campos que la proyección visual.

### 3. HOLD / NO_MATCH es un estado honesto

Un pago de aseguradora o banco sin evidencia suficiente para una coincidencia uno-a-uno debe permanecer visible como:

```text
Pendiente de conciliación
Requiere validación de fuente
Sin aplicación automática
```

La UI no debe:

- forzar una coincidencia por similitud parcial;
- crear un cobro;
- cambiar el recibo;
- reactivar una póliza;
- crear un movimiento financiero;
- ocultar que faltan datos.

### 4. Tipos de causa visibles y comprensibles

Sin exponer detalles técnicos, la interfaz puede diferenciar:

- importe no coincidente;
- referencia incompleta;
- periodo o vigencia no comprobados;
- documento o soporte pendiente;
- coincidencia múltiple;
- sin candidato encontrado.

### 5. Separación de dominios

Debe conservarse visualmente la secuencia:

```text
Pago reportado
→ Cobro aplicado
→ Conciliación confirmada
→ Planilla / comisión
→ Movimiento financiero, cuando corresponda
```

No avanzar visualmente al siguiente estado si el anterior permanece en `HOLD`.

## Módulos impactados

- Cobros;
- Conciliaciones;
- Recibos / Cartera;
- Cliente 360;
- Historial;
- Planillas y Comisiones;
- Finanzas;
- Portal;
- Academia.

## Estados y copy reutilizable

```text
Conciliado
Pendiente de conciliación
Requiere validar importe
Referencia incompleta
Periodo pendiente de confirmar
Sin coincidencia suficiente
No se aplicaron cambios
Recibo histórico — póliza no reactivada
Sin movimiento financiero asociado
```

## Patrones que no deben trasladarse a Claude

- rutas Firestore;
- writers;
- workflows;
- service accounts;
- IDs de documentos o archivos;
- hashes privados;
- números de póliza;
- importes;
- nombres de clientes;
- referencias de autorización;
- paquete privado de ejecución.

## Impacto Academia

Academia debe enseñar que:

- `HOLD` protege contra aplicaciones erróneas;
- una coincidencia parcial no es una conciliación;
- un validador obsoleto no debe obligar a modificar datos correctos;
- Cobros, Comisiones y Finanzas son etapas separadas;
- los recibos históricos no reactivan pólizas;
- los datos faltantes deben convertirse en una gestión de validación.

## Instrucción acumulada para una futura candidata

```text
En Cobros y Conciliaciones, representar relaciones claras entre cobro, recibo y póliza. Admitir metadatos compatibles adicionales sin falsos negativos visuales. Mantener HOLD/NO_MATCH como estado honesto cuando importe, referencia, periodo o soporte no permitan una coincidencia única. No crear cobros, comisiones ni movimientos financieros desde coincidencias parciales. Preservar el caso histórico sin reactivar la póliza y usar únicamente Orbit.store.
```
