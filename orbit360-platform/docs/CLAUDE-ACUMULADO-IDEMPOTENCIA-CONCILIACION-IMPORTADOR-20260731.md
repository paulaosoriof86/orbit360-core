# CLAUDE ACUMULADO — IDEMPOTENCIA, ACTUALIZACIÓN Y CONCILIACIÓN TRANSVERSAL

Fecha: 2026-07-31  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`

## Objetivo para el prototipo comercializable

El prototipo base debe reflejar que Orbit 360 es autoadministrable y que las mismas reglas operan para cualquier tenant, tanto en captura manual como en importación/actualización masiva.

## Patrones que Claude debe incorporar

### 1. Actualizar sin duplicar

Toda experiencia de alta/importación debe soportar:

- Crear;
- Actualizar existente;
- Omitir sin cambio;
- Requiere validación.

La UI nunca debe asumir que importar = insertar.

Cuando la identidad es exacta, mostrar actualización del registro existente. Cuando es probable/ambigua, mostrar HOLD y solicitar validación; nunca ofrecer crear un duplicado como camino automático.

### 2. Vista previa antes de escribir

El dry-run debe mostrar por entidad:

- Crear;
- Actualizar;
- Sin cambio;
- Requiere validación;
- Motivo;
- Campos que se completan;
- Campos que cambian;
- Campos existentes que se conservan.

Un campo vacío de la nueva fuente no debe mostrarse como borrado de un dato existente.

### 3. Aplicación transversal

Este patrón debe reutilizarse en:

- Clientes;
- Aseguradoras/Directorio;
- Pólizas;
- Vehículos/bienes;
- Recibos;
- Cartera;
- Cobros;
- módulos posteriores con identidad estable.

No crear una UX de deduplicación diferente por módulo salvo reglas específicas del dominio.

### 4. Póliza: prima semántica

Mostrar siempre separadamente cuando exista:

- prima neta;
- gastos/expedición;
- financiamiento/recargo;
- ajuste o descuento de fuente;
- IVA/impuestos;
- prima total.

Nunca completar prima total visualmente desde prima neta. Si hay diferencias entre fuente y suma de componentes, mostrar la diferencia de forma comprensible y trazable.

### 5. Pago de póliza

Separar en UI y formularios:

- frecuencia de pago;
- forma/método de pago;
- conducto de pago.

No usar un único campo ambiguo para las tres dimensiones. No precargar `Contado` si la fuente/configuración no lo demuestra.

### 6. Recibo / cartera / cobro

Estados visuales obligatorios:

- Recibo esperado;
- Cartera conciliada con aseguradora;
- Pago reportado · por conciliar;
- Cobro conciliado;
- Requiere validación.

**Cartera conciliada con aseguradora** significa saldo pendiente contrastado con la aseguradora. No significa pago.

**Cobro conciliado** significa pago confirmado por conciliación de fuentes.

### 7. Conciliación

La UX debe poder mostrar:

- fuente CRM;
- fuente aseguradora;
- identificador de recibo/cuota;
- monto de cada fuente;
- fecha de cada fuente;
- diferencias conservadas;
- resultado one-to-one;
- HOLD si hay empate/conflicto.

No ocultar diferencias menores porque el pago haya sido identificado como el mismo.

### 8. FIFO

En Cobros, la interfaz debe explicar/aplicar la obligación exigible aplicable más antigua primero. Recibos vencidos de vigencias recientes vencidas pueden mantenerse como exigibles según regla configurable; esto no reactiva la póliza.

### 9. Autoadministración

Debe existir UX consistente para:

- alta manual;
- edición;
- importación;
- actualización posterior;
- revisión de HOLD;
- merge controlado cuando corresponda;
- historial antes/después;
- trazabilidad de fuente.

La lógica se representa como capacidad de producto, no como flujo exclusivo A&S.

## No enviar / no hardcodear

No incluir:

- PII real;
- nombres/números reales;
- fuentes privadas;
- hashes privados;
- Firebase/Rules/secrets;
- decisiones reales de fusión A&S;
- montos reales de conciliación.

## Riesgo si Claude ignora este patrón

- duplicados recurrentes;
- importadores que insertan en lugar de actualizar;
- formularios inconsistentes;
- pérdida de datos por vacíos;
- confusión entre cartera y cobro;
- regresión de primas y forma de pago;
- necesidad de reacondicionar cada módulo nuevamente.
