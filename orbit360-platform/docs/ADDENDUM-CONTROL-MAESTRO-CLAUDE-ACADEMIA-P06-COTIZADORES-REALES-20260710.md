# Addendum control maestro Claude/Academia — P0.6 cotizadores reales

Fecha: 2026-07-10  
Estado: `ACUMULADO / NO_ENVIADO_A_CLAUDE / CONTRATO_BACKEND_IMPLEMENTADO`

## 1. Regla de continuidad

La futura candidata Claude no puede diseñar Cotizador/Comparativo como un formulario genérico ni copiar el HTML v110 completo.

Debe conservar:

- Aseguradoras como fuente única;
- múltiples libros y versiones por aseguradora/producto;
- reglas por tipo/uso de vehículo, riesgo, plan y país;
- salida individual específica;
- formato y secciones de cada aseguradora;
- listas desplegables dependientes;
- evidencia, diff y validación;
- historial y estados honestos.

## 2. Aseguradoras — UX requerida

La ficha debe organizar el conocimiento en tabs o vistas equivalentes:

1. Fuentes.
2. Productos y aplicabilidad.
3. Reglas tarifarias.
4. Componentes y financiamiento.
5. Presentación/impresión.
6. Evidencia y diff.
7. Versiones.
8. Casos de prueba.

Cada regla debe mostrar:

- producto y combinación;
- tipo de cálculo;
- base neta/bruta;
- prima mínima o rango cuando aplique;
- asistencia/gastos/impuestos;
- cuotas;
- coberturas opcionales;
- fuente y hoja/rango;
- confianza;
- estado;
- versión vigente y reemplazada.

No mostrar valores reales a roles sin autorización.

## 3. Cotizador Autos/Motos

Flujo esperado:

```text
País
→ producto
→ tipo de vehículo
→ uso
→ marca/línea/modelo
→ valor/año y demás datos
→ plan aplicable
→ coberturas opcionales
→ forma de pago
→ cotizar
```

Reglas visuales:

- no mostrar productos no aplicables;
- no mezclar salidas de varios vehículos;
- una sola cotización/plantilla por resultado;
- permitir varias aseguradoras en el tablero, pero cada tarjeta conserva su formato y desglose;
- prima neta, gastos, asistencia, financiamiento, IVA y total separados según la regla real;
- cuotas de tercero identificadas como tales;
- requisitos/exclusiones visibles.

## 4. Cotizador Gastos Médicos

Flujo esperado:

```text
País
→ modalidad Individual/Familiar
→ integrantes
→ edad y género por integrante
→ plan/territorio
→ maternidad cuando aplique
→ dental
→ demás adicionales habilitados
→ forma de pago
→ cotizar
```

No simplificar maternidad a un recargo fijo universal. Algunos libros usan una matriz tarifaria alternativa completa.

Debe diferenciar:

- edad de ingreso;
- edad de continuidad;
- prima individual;
- suma por grupo familiar;
- cargo por persona;
- cargo por hogar/familia;
- tablas netas;
- tablas brutas con IVA/gastos incluidos.

## 5. Impresión

### Cotización individual

- formato A&S con fidelidad material a la aseguradora;
- secciones I/II/III y secciones libres;
- beneficios, exclusiones y adicionales;
- pagos;
- fuente/versión interna no visible al cliente salvo necesidad;
- preview y PDF;
- WhatsApp con plantilla propia de Cotizador.

### Comparativo

- normaliza campos equivalentes;
- conserva beneficios diferenciales;
- no sustituye la cotización individual;
- recomendación consultiva con criterio visible;
- puede abrir la propuesta individual original.

## 6. Estados honestos

Usar estados como:

```text
fuente inventariada
reglas propuestas
requiere validación
conflicto
validado pendiente de habilitación
habilitado
reemplazado por versión
bloqueado
```

No usar “activo”, “conectado”, “actualizado” o “enviado” sin confirmación backend.

## 7. Prohibiciones para Claude

- no hardcodear tasas ni aseguradoras en JS;
- no crear un catálogo paralelo;
- no tocar `Orbit.store` directamente;
- no cargar secretos al frontend;
- no reutilizar datos personales de los ejemplos;
- no ejecutar macros;
- no migrar referencias rotas;
- no asumir 5% de gastos para todas las aseguradoras;
- no asumir recargo por financiamiento universal;
- no sumar IVA/gastos a tablas brutas;
- no mezclar Autos y Motos;
- no mezclar plan individual y familiar;
- no diseñar una sola plantilla de cotización.

## 8. Academia profunda

Rutas mínimas:

### Asesor

- elegir producto y datos correctos;
- entender qué aseguradoras aplican;
- seleccionar coberturas;
- explicar cuotas;
- imprimir/enviar;
- retomar historial;
- reportar una regla incorrecta.

### Operativo

- consultar fuente y versión;
- identificar estado;
- revisar condiciones y requisitos;
- no alterar reglas validadas.

### Admin/Dirección

- cargar fuente;
- clasificar producto/combinación;
- revisar evidencia;
- resolver conflictos;
- corregir propuesta;
- validar;
- habilitar mediante segundo gate;
- reemplazar una versión;
- revisar auditoría.

Evaluaciones:

- escoger regla correcta por vehículo;
- detectar doble IVA;
- diferenciar maternidad fija vs matriz;
- diferenciar gasto, asistencia y financiamiento;
- identificar fuente incompleta;
- resolver un conflicto de versiones.

## 9. Condición para solicitar candidata

Claude será requerido cuando estén cerrados:

1. primer reporte sanitizado por hoja/rango;
2. primer diff real validado;
3. wire Drive o mecanismo temporal seguro;
4. adapter PDF inicial;
5. contrato del gate de habilitación.

Hasta entonces, estado: `NO_ENVIADO_A_CLAUDE`.
