# IMPACTO ACADEMIA — IDENTIDAD, IMPORTACIÓN, RECIBOS, CARTERA Y CONCILIACIÓN

Fecha: 2026-07-31  
Clasificación: `ACADEMIA_ACTUALIZAR`

## Módulos modificados

- Importador transversal;
- Clientes;
- Pólizas;
- Recibos/Cartera;
- Cobros/Conciliación (contrato previo al bloque operativo).

## Manuales que deben actualizarse

### Importador

Enseñar que importar no significa insertar. El dry-run debe diferenciar:

- Crear;
- Actualizar;
- Sin cambio;
- Requiere validación.

Explicar que una coincidencia probable se bloquea y nunca crea automáticamente un duplicado.

### Clientes

Explicar identidad exacta vs probable, actualización de campos faltantes y regla de no borrar datos válidos con celdas vacías.

### Pólizas

Explicar:

- prima neta vs prima total;
- componentes de prima;
- diferencia de fuente;
- frecuencia vs forma de pago vs conducto;
- por qué Orbit no inventa un dato faltante.

### Recibos y cartera

Explicar:

- Recibo esperado;
- Cartera conciliada con aseguradora;
- Pago reportado;
- Cobro conciliado;
- Cartera histórica exigible;
- diferencia entre saldo confirmado y pago confirmado.

### Cobros

Explicar:

- conciliación one-to-one;
- fuentes autoritativas;
- conflictos/HOLD;
- preservación de diferencias de fecha/monto;
- FIFO sobre la obligación exigible aplicable más antigua;
- recibos exigibles de vigencias recientes vencidas sin reactivar la póliza.

## Rutas afectadas

### Administrativo / Operativo

Debe dominar:

1. Actualización sin duplicados.
2. Revisión del dry-run.
3. Validación de HOLD.
4. Lectura de prima y forma de pago.
5. Diferencia entre recibo/cartera/cobro.
6. Conciliación y FIFO.

### Dirección / Superadmin

Debe comprender:

1. Contrato reusable de identidad/upsert.
2. Configuración tenant de catálogos y campos de pago.
3. Reglas de conciliación.
4. Auditoría antes/después.
5. Por qué un dato vacío no debe borrar información.
6. Cómo evitar regresiones mediante gates.

### Asesor

Debe comprender estados visibles del cliente sin capacidad de forzar conciliación, fusionar duplicados o modificar datos protegidos fuera de su scope.

## Evaluaciones afectadas

Agregar casos prácticos:

1. Se vuelve a importar el mismo cliente con teléfono nuevo y correo vacío: ¿qué ocurre?
   - Esperado: actualizar teléfono, conservar correo, no duplicar.

2. Dos clientes parecen iguales pero falta identificador fuerte: ¿qué ocurre?
   - Esperado: HOLD, no auto-merge.

3. La fuente tiene prima neta pero no total: ¿Orbit calcula el total?
   - Esperado: no; requiere completar/validar.

4. Un recibo aparece como pendiente en estado de aseguradora: ¿es cobro?
   - Esperado: no; es cartera/saldo.

5. Un pago aparece en CRM y reporte de cobros de aseguradora con identidad one-to-one, conservando una diferencia menor de fuente: ¿qué estado puede asumir?
   - Esperado: conciliado según contrato, preservando la discrepancia.

6. Un pago solo aparece en una fuente: ¿se auto-concilia?
   - Esperado: no.

7. Hay varias obligaciones exigibles: ¿cuál recibe primero un pago aplicable?
   - Esperado: la más antigua según FIFO y reglas de elegibilidad.

## Notificaciones/novedades requeridas

Cuando este patrón llegue al prototipo comercializable, publicar novedad de Academia para Operativo, Dirección y Asesores indicando:

- actualización del importador;
- nuevos estados de conciliación;
- separación de campos de pago;
- regla de no duplicados.

## Pendiente backend

- materialización controlada de cobros conciliados;
- workflow de resolución de HOLD/merge con auditoría;
- persistencia de diferencias de fuente;
- gestión de FIFO en el bloque Cobros;
- autorizaciones de escritura correspondientes.

## Pendiente Claude

Representar estos patrones en UX reusable/autoadministrable sin datos A&S, sin backend técnico visible y sin hardcode de tenant.
