# Academia — importaciones recurrentes, Cobros y Conciliación

Fecha: 2026-08-04  
Alcance: contenido reusable y multi-tenant.

## Objetivo

Enseñar a cada rol a procesar documentos mensuales sin confundir extracción, evidencia, conciliación, aplicación al recibo y movimientos financieros.

## Conceptos centrales

```text
Documento adjunto ≠ dato aplicado
Dato extraído ≠ evidencia confirmada
Evidencia confirmada ≠ pago conciliado
Pago conciliado ≠ pago aplicado
Pago aplicado ≠ movimiento financiero de la empresa
```

## Dirección

Debe poder:

- configurar perfiles y mappings por tipo de fuente;
- definir tolerancias, reglas inferenciales y HOLD;
- revisar permisos y scopes;
- aprobar aperturas de alcance;
- consultar lotes, eventos y rollback;
- distinguir fallos funcionales, de contrato, pipeline o validador.

Caso práctico: cambiar un sinónimo de columna de una planilla sin modificar código y reutilizar el perfil en el siguiente periodo.

## Operativo

Flujo recomendado:

1. seleccionar el tipo de fuente;
2. adjuntar el archivo;
3. revisar detección y mapping;
4. completar país, moneda y periodo cuando falten;
5. revisar crear, actualizar, omitir y requiere validación;
6. corregir contradicciones;
7. confirmar evidencia;
8. revisar la propuesta en Conciliaciones;
9. aplicar únicamente las filas autorizadas;
10. dejar HOLD con causa exacta cuando corresponda.

El Operativo no debe convertir un depósito bancario en cobro sin contraparte suficiente.

## Finanzas

Debe distinguir:

- pago reportado por A&S o por el tenant;
- reconocimiento de aseguradora;
- conciliación directa;
- conciliación inferencial por planilla;
- conciliación inferencial por cartera;
- aplicación al recibo;
- comisión devengada y pagada;
- movimiento financiero real de caja o banco.

Una planilla puede reconocer el pago de una cuota, pero la evidencia se registra antes de actualizar el recibo. Un estado bancario es soporte de conciliación; no crea por sí solo `finmovs` ni cobros.

## Asesor

Puede consultar, dentro de su alcance:

- estado de cobros y recibos de sus clientes;
- gestiones de aplicación o corrección de pago;
- notas y resultado;
- casos en HOLD que requieran información;
- fecha de resolución y trazabilidad.

No puede aplicar, borrar o alterar conciliaciones validadas. Cuando detecta una inconsistencia, crea una gestión de corrección.

## Portal del cliente

Debe mostrar estados honestos, por ejemplo:

- pago recibido o reportado;
- en validación;
- conciliado;
- aplicado;
- requiere información.

No debe mostrar procesos internos, reglas inferenciales, fuentes privadas ni mensajes técnicos.

## Fuentes recurrentes

| Fuente | Resultado inicial | No debe hacer automáticamente |
|---|---|---|
| Calendario de recibos | evidencia de obligaciones | crear cobros si falta contrato confiable |
| Pagos reportados | evidencia del pago reportado | declararlo conciliado sin cruce |
| Reporte de aseguradora | evidencia directa | aplicar si la contraparte es ambigua |
| Estado de cartera | evidencia de pendientes | inferir por ausencia aislada |
| Planilla de comisiones | evidencia de reconocimiento | cambiar tarifas o aplicar cobros sin confirmación |
| Estado bancario | soporte de conciliación | crear cobros o finmovs sin vínculo |
| Documento soporte | propuesta de evidencia | modificar expediente directamente |

## Calidad y HOLD

Mantener en HOLD cuando exista:

- país o moneda faltante;
- póliza no identificada;
- vigencia contradictoria;
- cuota ambigua;
- reverso o valor negativo;
- duplicado;
- diferencia material;
- banco sin contraparte;
- documento parcial presentado como fuente completa.

Cada HOLD debe indicar causa, evidencia disponible, responsable y siguiente acción.

## Cierre y rollback

La confirmación del lote registra evidencia. La aplicación posterior modifica el recibo o la conciliación. Mientras la evidencia no haya sido consumida, el lote puede revertirse exactamente. Después del consumo, el rollback debe ejecutarse desde el dominio que aplicó el cambio, conservando auditoría.

## Evaluación sugerida

1. Identificar por qué un estado bancario no es suficiente para crear un cobro.
2. Explicar cuándo una cuota reconocida en planilla permite inferir cuotas anteriores.
3. Diferenciar pago conciliado de pago aplicado.
4. Resolver un caso con país o moneda faltante.
5. Explicar cómo reutilizar un perfil mensual sin eliminar el dry-run.
6. Identificar quién puede confirmar evidencia y quién solo puede consultar.
