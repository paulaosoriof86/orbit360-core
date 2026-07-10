# Decisión P0.6c — binding AseGuate tarifa ↔ presentación bloqueado

Fecha: 2026-07-10  
Módulo: Aseguradoras / Cotizador / Comparativo  
Estado: `COTIZADOR_AUTOMATICO_BLOQUEADO / PDF_EXTERNO_Y_COMPARATIVO_PENDIENTES_VALIDACION`

## 1. Fuentes contrastadas

Se contrastaron, fuera del repositorio:

- tarifario Excel AseGuate;
- cotización oficial de automóvil;
- cotización oficial de microbús hasta nueve pasajeros.

Se preservó trazabilidad por archivo, hoja/rango y página/bloque. No se publican tasas, importes, nombres ni datos de los casos.

## 2. Resultado tarifario

El Excel permitió proponer:

- tres bloques de producto/plan;
- tasa o prima mínima según el bloque;
- asistencia;
- deducibles y antigüedad;
- descuentos;
- calendario general de financiamiento.

El calendario de financiamiento quedó como grupo independiente porque la fuente no demuestra automáticamente su alcance exacto por producto y variante.

## 3. Resultado de presentación

Los dos PDFs pertenecen a una misma familia visual, pero son variantes distintas:

```text
Automóvil
Microbús hasta 9 pasajeros
```

Cambian límites, deducibles, coberturas, beneficios y condiciones. El tipo de vehículo debe formar parte obligatoria del binding.

## 4. Reconciliación

La fórmula parcial inferida del tarifario no permite reproducir de manera completa y verificable los totales observados en ambas cotizaciones.

Persisten componentes o bases sin evidencia suficiente, entre ellos:

- orden exacto de aplicación de asistencia, gastos e impuesto;
- existencia y base de gasto de emisión;
- base imponible completa;
- ajustes específicos por tipo de vehículo;
- descuentos o recargos aplicados al caso;
- scope exacto del financiamiento;
- denominación exacta del plan en una de las propuestas.

La diferencia no se corrige añadiendo un factor manual. Hacerlo convertiría un caso particular en regla general sin fuente.

## 5. Decisión

El binding queda:

```text
status: incomplete_requires_validation
cotizador_automatico: BLOQUEADO
cotizador_pdf_externo: PENDIENTE_VALIDACION
comparativo: PENDIENTE_VALIDACION
```

Cotizador automático no puede habilitarse hasta que:

1. la regla incluya todos los componentes;
2. las bases de cálculo estén explícitas;
3. la variante de vehículo esté identificada;
4. el financiamiento tenga scope confirmado;
5. al menos un caso por variante reconcilie dentro de tolerancia;
6. una segunda validación administrativa apruebe el binding.

## 6. Lo que sí puede avanzar

Las cotizaciones PDF pueden continuar como propuestas externas para:

- lectura y edición;
- historial de Cotizador;
- incorporación al tablero;
- selección para Comparativo;
- preservación del formato individual.

Esto requiere validar su extracción y presentación, pero no exige que Orbit haya calculado la prima.

## 7. No hacer

- no inferir gasto de emisión por regla general;
- no asumir que el IVA se aplica sobre la misma base en todos los productos;
- no usar la diferencia como “ajuste de aseguradora” sin evidencia;
- no aplicar la variante automóvil al microbús;
- no asignar el financiamiento global al plan más cercano;
- no habilitar por coincidencia visual;
- no convertir importes de los PDFs en tarifas maestras.

## 8. Fuente adicional requerida en el futuro

Para cerrar el binding automático se necesita evidencia oficial adicional o validación documentada de A&S sobre:

- composición de prima;
- gasto de emisión;
- base de IVA;
- reglas por tipo de vehículo;
- forma de pago;
- ejemplo de cálculo reproducible.

No es una acción manual inmediata: el sistema puede continuar construyendo la interfaz de revisión y el wire backend antes de solicitar esa validación.
