# Decisión P0.6c/P0.10 — binding AseGuate tarifa ↔ presentación

Fecha inicial: 2026-07-10  
Actualización: 2026-07-10  
Módulo: Aseguradoras / Cotizador / Comparativo  
Estado: `COMPONENTES_FINANCIEROS_CONFIRMADOS / RECONCILIACION_DE_CASOS_OK / BINDING_REAL_PENDIENTE_VALIDACION_Y_GATE`

## 1. Fuentes contrastadas

Se contrastaron, fuera del repositorio:

- tarifario Excel AseGuate;
- cotización oficial de automóvil;
- cotización oficial de microbús hasta nueve pasajeros;
- confirmación de Dirección del tenant A&S sobre gastos de emisión e IVA.

Se preservó trazabilidad por archivo, hoja/rango y página/bloque. No se publican tasas completas, datos personales ni payloads de los casos.

## 2. Resultado tarifario

El Excel permitió proponer:

- tres bloques de producto/plan;
- tasa o prima mínima según el bloque;
- asistencia;
- deducibles y antigüedad;
- descuentos;
- calendario general de financiamiento.

El calendario de financiamiento continúa como grupo independiente hasta confirmar su alcance exacto por producto, variante y cantidad de pagos.

## 3. Resultado de presentación

Los dos PDFs pertenecen a una misma familia visual, pero son variantes distintas:

```text
Automóvil
Microbús hasta 9 pasajeros
```

Cambian límites, deducibles, coberturas, beneficios y condiciones. El tipo de vehículo forma parte obligatoria del binding y de la ruta de salida.

## 4. Componentes financieros confirmados

Para Aseguradora Guatemalteca en A&S se confirmó:

```text
Gastos de emisión = 5% de la prima neta
IVA = 12% de la base gravable previa al impuesto
```

La base gravable utilizada por los ejemplos incluye los componentes gravables anteriores al IVA, entre ellos:

- prima neta;
- gastos de emisión;
- asistencia cuando forma parte gravable de la propuesta;
- otros componentes gravables expresamente configurados.

El core reusable no contiene esta regla. Se registra en configuración del tenant A&S mediante:

```text
orbit360-platform/data/tenant-alianzas-soluciones-insurers-p10.js
```

El contrato reusable que la interpreta es:

```text
orbit360-platform/core/tenant-insurer-config-p10.js
```

Así, otro tenant puede tener una base o porcentaje diferente sin modificar el núcleo.

## 5. Reconciliación de los ejemplos

### Microbús

El caso de ejemplo se reproduce mediante:

```text
Prima neta        Q 1,800.00
Asistencia        Q   350.00
Gasto emisión 5% Q    90.00
Subtotal gravable Q 2,240.00
IVA 12%           Q   268.80
Prima total       Q 2,508.80
```

### Automóvil

El caso de ejemplo se reproduce mediante:

```text
Prima neta        Q 2,500.00
Asistencia        Q   350.00
Gasto emisión 5% Q   125.00
Subtotal gravable Q 2,975.00
IVA 12%           Q   357.00
Prima total       Q 3,332.00
```

La asistencia sigue siendo un componente derivado de la fuente/producto; no se hardcodea como regla universal del tenant.

Estos resultados cierran los bloqueos anteriores de:

- existencia del gasto de emisión;
- porcentaje del gasto de emisión;
- base del gasto de emisión;
- porcentaje de IVA;
- base gravable de los dos ejemplos.

## 6. Bloqueos que permanecen

El Cotizador automático todavía no se habilita porque falta:

1. mapear cada bloque tarifario al plan y variante exactos;
2. confirmar la denominación del plan cuando logo, encabezado u observación difieran;
3. asignar el calendario de financiamiento a cada producto/variante con evidencia;
4. validar las reglas generadas con hoja/rango;
5. validar los perfiles PDF con página/bloque;
6. persistir el binding real en LAB;
7. ejecutar el segundo gate administrativo.

No se requiere volver a preguntar por gasto de emisión, porcentaje de IVA, Banrural/Aseguradora Rural ni Columna.

## 7. Decisión actualizada

El binding queda:

```text
componentes_financieros: CONFIRMADOS
reconciliacion_automovil: DENTRO_DE_TOLERANCIA
reconciliacion_microbus: DENTRO_DE_TOLERANCIA
binding_real: PENDIENTE_VALIDACION
cotizador_automatico: DESHABILITADO_HASTA_GATE
cotizador_pdf_externo: ELEGIBLE_TRAS_VALIDAR_PRESENTACION
comparativo: ELEGIBLE_TRAS_VALIDAR_PRESENTACION
```

La coincidencia de los dos casos demuestra la composición financiera, pero no sustituye la validación de cada regla, variante, versión y fuente.

## 8. Lo que puede avanzar

Las cotizaciones PDF pueden continuar como propuestas externas para:

- lectura y edición;
- historial de Cotizador;
- incorporación al tablero;
- selección para Comparativo;
- preservación del formato individual.

El tarifario puede continuar hacia:

- reglas por producto/vehículo;
- vinculación con automóvil y microbús;
- revisión de financiamiento;
- validación de versión;
- segundo gate.

## 9. No hacer

- no convertir 5% de gastos en regla de todas las aseguradoras;
- no aplicar IVA sobre una base distinta sin configuración/evidencia;
- no convertir la asistencia de estos ejemplos en valor universal;
- no aplicar la variante automóvil al microbús;
- no asignar el financiamiento global al plan más cercano;
- no habilitar por coincidencia aritmética sin validar fuentes;
- no convertir importes particulares del PDF en tarifas maestras;
- no guardar esta configuración en el core reusable.

## 10. Estado operativo real

```text
configuración tenant implementada: sí
smoke sintético de los dos ejemplos: preparado
reglas reales persistidas en Firestore LAB: no
binding real persistido: no
Cotizador automático habilitado: no
Comparativo habilitado: no
```

El siguiente paso es aplicar la configuración P0.10 durante la construcción de las reglas reales y ejecutar el binding P0.8 dentro del flujo P0.9e, manteniendo el segundo gate cerrado.