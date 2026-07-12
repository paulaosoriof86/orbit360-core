# Patrón reutilizable para Claude — Desglose real de cotización y estimación interna no elegible

Fecha: 2026-07-12  
Proyecto: Orbit 360  
Aplicación: prototipo comercializable, todos los tenants  
Origen: cierre local posterior a candidata Claude v1.215

## Propósito

Evitar que futuras candidatas del prototipo reintroduzcan dos errores críticos:

1. validar una cotización reconstruyendo los gastos desde el mismo total, lo cual produce una comprobación circular;
2. tratar una estimación interna como si fuera una propuesta validada de una aseguradora.

Este patrón es generalizable. No contiene tarifas, aseguradoras, documentos ni reglas exclusivas de A&S.

## Regla 1 — Desglose independiente y persistente

Una cotización debe conservar por separado:

```txt
primaNeta
gastos.emision
gastos.financiamiento
gastos.otros
impuestos.ivaMonto
impuestos.otros
primaTotal
moneda
```

La validación correcta es:

```txt
primaNeta + gastos.emision + gastos.financiamiento + gastos.otros
+ impuestos.ivaMonto + impuestos.otros
≈ primaTotal
```

Tolerancia de redondeo vigente:

```txt
± 0.51 unidades monetarias
```

### Prohibido

```txt
extras = primaTotal - primaNeta - impuestos
```

Ese cálculo no valida nada: por construcción vuelve a producir el mismo total y oculta errores en gastos o recargos.

### Requisitos de datos

- Todos los importes deben ser finitos.
- `primaNeta > 0`.
- Gastos e impuestos no pueden ser negativos.
- País y moneda deben ser compatibles.
- Una edición debe persistir el desglose mediante `Orbit.store`.
- Después de editar, la cotización vuelve a requerir validación.
- El DTO debe aceptar formatos heredados planos, pero normalizarlos al esquema estructurado.

## Regla 2 — Estimación interna

Una estimación propia no es una cotización de aseguradora.

Contrato mínimo:

```txt
cotizacionOrigen = estimacion_interna
estadoValidacion = revisada_interna
trazabilidad.clasificacion = estimacion_interna
trazabilidad.elegibleComparativo = false
trazabilidad.elegibleEmision = false
```

Puede conservarse como referencia de trabajo, pero nunca debe:

- presentarse como propuesta validada de una aseguradora;
- participar en ranking o recomendación;
- aparecer en impresión o comunicación al cliente como alternativa elegible;
- ser aceptada;
- generar una solicitud de emisión;
- habilitar una tarifa o fuente.

Una revisión humana de la estimación no cambia su naturaleza. Para convertirse en propuesta elegible debe existir una cotización real/documental o una configuración tarifaria validada, con su propia identidad y trazabilidad.

## Regla 3 — País y moneda

La moneda debe venir del contexto confiable del comparativo o de la configuración tenant:

```txt
GT → GTQ
CO → COP
```

No asumir GTQ en registros manuales o PDF. Si país o moneda no pueden establecerse de manera confiable:

```txt
REQUIERE_VALIDACION
```

## Regla 4 — Persistencia y auditoría

Toda creación o modificación de cotización debe usar `Orbit.store` y registrar:

```txt
antes
después
actor
rol activo
fecha
motivo
origen
estado de validación
fuente o referencia documental cuando corresponda
```

Los módulos no deben usar almacenamiento operativo directo.

## Comportamiento UI requerido para Claude

- Mostrar el desglose completo antes de validar.
- Identificar visualmente una estimación interna como “Referencia interna — no elegible”.
- No mostrar acciones de recomendar, compartir, aceptar o emitir para estimaciones internas.
- Mostrar errores de cuadre de forma comprensible, indicando esperado y total registrado.
- Después de editar una propuesta validada, cambiarla a “Requiere validación”.
- Mantener lenguaje de preparación/confirmación; no afirmar envío sin evidencia.

## Pruebas obligatorias en una futura candidata Claude

1. Cotización cuyo desglose cuadra exactamente: válida.
2. Diferencia de 0.50: válida por tolerancia.
3. Diferencia mayor de 0.51: bloqueada.
4. Gasto negativo, `NaN` o infinito: bloqueado.
5. Edición de gastos: persiste después de recarga y exige revalidación.
6. Estimación interna revisada: permanece `revisada_interna`.
7. Estimación interna: ausente de ranking, impresión elegible, comunicación, aceptación y emisión.
8. PDF/manual en CO: usa COP; en GT: usa GTQ.
9. País/moneda faltante: requiere validación.

## Academia

Actualizar el curso profundo existente de Cotizador/Comparativo para enseñar:

- diferencia entre cotización real, estimación interna y configuración tarifaria;
- desglose de prima;
- validación y tolerancia;
- efectos de editar una propuesta;
- por qué una estimación interna nunca genera emisión.

No crear un curso duplicado.

## Aplicación a Claude/prototipo reutilizable

```txt
¿Aplica a Claude/prototipo? Sí
Patrón UX/módulo: Cotizador, Comparativo, Aseguradoras, Academia
Riesgo si se omite: recomendación o emisión basada en importes no comprobados o en una estimación no contractual
Estado local: implementado en contrato canónico de la rama A&S
Estado prototipo Claude: obligatorio en la próxima candidata que modifique Cotizador/Comparativo
```

## Archivos de referencia del empalme local

```txt
core/quote-comparison-contracts-v1203.js
core/quote-comparison-contracts-v1203-refinements.js
modules/cotizador-v1203-source-gate.js
modules/comparativo-v1203-operational-bridge.js
```

Claude debe implementar el comportamiento en la fuente principal del prototipo y conservar compatibilidad con estos contratos. No debe copiar datos, bindings ni decisiones exclusivas del runtime A&S.
