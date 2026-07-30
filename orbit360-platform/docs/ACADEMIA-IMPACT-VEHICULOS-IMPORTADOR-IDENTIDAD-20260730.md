# Academia Orbit 360 — Impacto Vehículos / identidad de importación

Fecha: 2026-07-30  
Bloque: Vehículos  
Gate: `block8-vehicles-static-v20260730`

## Qué debe enseñar Academia

### 1. Fuente separada y autoridad del dato

Vehículos se importa desde su propia fuente. No se reconstruyen vehículos desde movimientos financieros, recibos o cobros. La póliza canónica ya validada es la autoridad para `polizaId`, `clienteId`, aseguradora, vigencia y estado contractual.

El estado de póliza presente en un archivo de Vehículos es provenance. No sustituye el estado contractual definido en Pólizas y no decide mora o cobranza.

### 2. Identificadores de Excel no son cantidades

Un número de póliza puede venir en Excel como celda numérica aunque conceptualmente sea un identificador. Su valor no debe pasar por formato de presentación, separadores, notación científica ni redondeo antes de formar una clave.

Regla reusable del importador:

```text
valor crudo de celda → normalización semántica del identificador → clave canónica
```

Nunca:

```text
valor de celda → formato visual de Excel → clave canónica
```

Este criterio aplica también a documentos, códigos, folios, placas y otros identificadores cuando la fuente los represente como números.

### 3. Relación fail-closed

Para vincular un vehículo con una póliza se exige número de póliza + vigencia exacta. Cuando existe más de una candidata, solo se permite desambiguación con evidencia adicional segura. No se enlaza una fila a una póliza anterior usando solo el número.

### 4. Vehículo histórico vs activo físico global

La unidad segura inicial es la relación vehículo–versión de póliza. Una placa puede reaparecer en renovaciones y clientes distintos; sin VIN confiable, la placa es un candidato de correlación y no autoriza a fusionar o reasignar propiedad histórica.

### 5. Calidad pendiente no equivale a inventar datos

Un registro puede persistirse con calidad pendiente si la relación padre es segura, pero se conserva vacío aquello que la fuente no demuestra. Placa, línea, modelo, marca o inciso incompletos generan gestión de calidad; no se rellenan por inferencia.

### 6. Diferencia entre defecto funcional y falla de datos

Caso del 30/07/2026:

- el primer dry-run mostró 123 relaciones aparentemente sin póliza padre;
- la fuente y el paquete canónico estaban completos;
- la causa era que el parser usaba la representación visual de 123 identificadores numéricos largos;
- clasificación final: `FUNCTIONAL_DEFECT` del normalizador, no `DATA_CONTRACT_FAILURE` de la fuente.

La lección es detener el reintento, aislar la capa responsable y corregir el owner correcto antes de volver a ejecutar.

## Roles

- Dirección/Operativo: revisan calidad, excepciones y trazabilidad del importador.
- Asesor: consulta únicamente vehículos de clientes dentro de su scope y puede reportar datos faltantes según permisos; no reasigna vínculos ni corrige pólizas de forma indirecta.
- Administrador técnico: valida gates, contratos y evidencia sanitizada; los secretos y payloads reales permanecen fuera de Academia.

## Patrón reusable

Clasificación: `ACADEMIA_ACTUALIZAR` + `REPLICABLE_CLAUDE_ACUMULADO`.

El patrón reusable es separar **valor semántico de identidad** de **formato visual de la fuente**. Los detalles de workflows, secretos, Drive privado y writer real permanecen `BACKEND_PROTEGIDO_NO_CLAUDE`.
