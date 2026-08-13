# Auditoría forense sanitizada — cotizadores reales GT multiproducto P0.6

Fecha: 2026-07-10  
Carril: C, con traducción a B y A  
Estado: `FUENTES_REALES_ANALIZADAS / DATOS_PERSONALES_NO_REPOSITORIO / REGLAS_NO_HABILITADAS`

## 1. Objetivo

Auditar ocho libros reales entregados por A&S para identificar, por aseguradora y producto:

- estructura multihoja;
- formularios de entrada;
- tablas tarifarias y fórmulas;
- primas mínimas;
- aplicabilidad por tipo/uso de vehículo o riesgo;
- gastos, asistencias, impuestos y financiamiento;
- planes y coberturas opcionales;
- hoja/ruta de salida e impresión;
- errores, vínculos antiguos y parches que no deben migrarse.

Esta auditoría no habilita reglas, no escribe tarifas operativas y no incorpora los archivos al repositorio.

## 2. Fuentes inventariadas

1. `COTIZADOR BAM 2025 vehiculos seg. completo pr..xlsx`
2. `Cotizador BAMSALUD 2025.xlsx`
3. `COTIZADOR V13. CORREDORES.xlsx`
4. `COTIZADOR MOTO - INTERMEDIARIO 2024.xlsx`
5. `Cotizador VA 2026 V1.4.xlsx`
6. `Tasas AseGuate.xlsx`
7. `Mi Carro Seguro Cotizador Banrural.xlsx`
8. `Cotizador Gastos Médicos Individual 2025.xlsx`

Los libros contienen datos personales de ejemplos operativos. No se deben subir nombres, documentos, placas, correos, teléfonos, fechas de nacimiento ni valores de clientes al repositorio, a Claude o a Academia.

Los valores tarifarios exactos permanecen vinculados a la evidencia de cada archivo/hoja/rango y no se hardcodean en documentación reusable ni en el core.

## 3. Resultado transversal

No existe una fórmula única aplicable a todos los cotizadores.

Se encontraron, entre otros, estos patrones:

- porcentaje sobre valor asegurado con prima mínima;
- porcentaje más cargo fijo con prima mínima;
- prima fija;
- lookup por rango de valor;
- lookup por tipo y uso de vehículo;
- tabla por año/antigüedad;
- matriz por edad y género;
- matriz alternativa con y sin maternidad;
- cargo opcional individual o familiar;
- tabla mensual bruta que ya incorpora impuestos/gastos;
- calendario de pagos con recargos por número de cuotas;
- cuotas sin recargo financiadas por tercero;
- salida separada por producto/tipo de vehículo;
- salida única dinámica;
- libro tarifario sin salida de cotización.

Por tanto, Cotizador debe seleccionar la regla mediante una clave compuesta:

```text
aseguradora + país + producto + familia/subtipo + segmento + tipo de riesgo + tipo/uso de vehículo + plan + versión
```

Una cotización solo puede renderizar la salida del tipo de vehículo, riesgo o plan seleccionado. Las demás hojas no deben mostrarse ni mezclarse.

## 4. Auditoría por fuente

### 4.1 BAM — Vehículos

Estructura observada:

- menú;
- entrada diferenciada para vehículos particulares y comerciales;
- salidas separadas para particulares, terceros, microbuses, panel/camiones livianos, buses, camiones pesados, cabezales, transporte por plataforma y motocicletas;
- hoja legacy oculta que no debe migrarse como fuente activa.

Reglas detectadas:

- tasas y primas mínimas diferentes por categoría de vehículo;
- algunos productos usan porcentaje simple;
- otros usan porcentaje más cargo fijo y mínimo;
- asistencias/cargos adicionales por producto;
- anexos y coberturas opcionales con reglas propias;
- gastos de emisión, IVA y recargos de financiamiento;
- pagos de contado y mecanismos sin recargo financiados por tercero.

Requisito de producto:

- el selector de vehículo debe resolver una sola ruta de salida;
- cada salida conserva sus secciones, coberturas, beneficios y área de impresión.

### 4.2 BAM Salud

Estructura observada:

- hoja de datos;
- hoja de cotización;
- cálculos;
- cinco planes separados;
- tablas para titular, cónyuge e hijos.

Reglas detectadas:

- planes con máximos y sumas de vida diferentes;
- primas por edad y composición familiar;
- maternidad como componente opcional por plan;
- dental como cargo por cantidad/composición de asegurados;
- prima de vida agregada al total;
- tablas mensuales cuya base monetaria debe verificarse antes de agregar impuestos o gastos.

Hallazgo P0:

- el modelo debe distinguir `net` de `gross_includes_tax_and_fees`; de lo contrario puede duplicar IVA/gastos.
- se detectó una validación de fecha dañada que no debe trasladarse.

### 4.3 Bantrab — Autos

Estructura observada:

- hoja de datos;
- hoja de cálculo oculta;
- salidas separadas para producto premium con agencia, premium estándar y producto esencial.

Reglas detectadas:

- tablas por rango de valor asegurado;
- primas mínimas por rango;
- límites de antigüedad diferentes por producto;
- exclusiones de ciertos tipos de vehículo en una modalidad;
- recargos por conductor joven y equipo especial;
- asistencia y otros cargos fijos;
- gastos, IVA y calendario de financiamiento por cuotas.

Anomalías:

- nombres definidos y referencias externas rotas;
- funciones Excel modernas que deben normalizarse en backend;
- tarifa interna/colaborador separada de la oferta comercial.

### 4.4 Bantrab — Motos

Estructura observada:

- entrada independiente;
- salidas diferentes para cobertura completa, solo robo y responsabilidad civil.

Reglas detectadas:

- porcentaje con mínimo para cobertura completa y robo;
- prima fija para responsabilidad civil;
- asistencia;
- gastos, IVA y financiamiento;
- condiciones particulares de dispositivo/servicio que no deben confundirse con prima automática.

Requisito:

- este libro es un producto independiente del cotizador de Autos y debe conservar su propia combinación, versión y salida.

### 4.5 Columna — Vehículos

Estructura observada:

- datos;
- base oculta;
- una hoja dinámica de impresión.

Reglas detectadas:

- tasas, mínimos y deducibles por tipo de vehículo y uso;
- diferenciación particular/comercial;
- asistencia por categoría;
- gastos de emisión propios de la aseguradora;
- IVA;
- pagos consecutivos sin recargo;
- cuotas financiadas por tercero;
- descuentos y cotización de corto plazo;
- planes/límites de responsabilidad civil.

Requisito:

- la salida dinámica debe recibir únicamente el vehículo/uso seleccionado y preservar Secciones I, II, III, adicionales, beneficios y exclusiones aplicables.

### 4.6 Aseguradora Guatemalteca — Tarifas

Estructura observada:

- tarifario puro;
- no contiene una salida oficial completa de cotización.

Reglas detectadas:

- productos con tasas, primas mínimas, asistencia, deducibles, antigüedad y financiamiento;
- variantes de producto con bases diferentes.

Pendiente obligatorio:

- cotización oficial de ejemplo por producto relevante;
- confirmar gastos, base de IVA, secciones, beneficios y plantilla de impresión.

Estado:

```text
fuente tarifaria disponible
presentación no disponible
requiere cotización ejemplo
```

### 4.7 Banrural — Mi Carro Seguro

Estructura observada:

- tabla de ingresos;
- hoja de cotización;
- fórmulas y políticas ocultas.

Reglas detectadas:

- tipos de vehículo permitidos y usos excluidos;
- tasas por rango de valor y tipo de vehículo;
- primas mínimas específicas;
- recargos por conductor joven y equipo especial;
- deducibles por tipo de vehículo;
- gastos e IVA;
- dos esquemas de financiamiento;
- cuotas de tarjeta con umbrales;
- salida con Secciones I, II, III, coberturas adicionales, beneficios y pagos.

Anomalías:

- existe una tabla alternativa de mínimos por año/modelo que no coincide de forma evidente con la fórmula principal; debe quedar `REQUIERE_VALIDACION` y no activarse.
- se identificaron funciones modernas de Excel que deben normalizarse.

### 4.8 Aseguradora Rural/Banrural — Gastos Médicos

Estructura observada:

- salida final visible;
- cotizador y listas ocultas;
- cuatro planes independientes.

Reglas detectadas:

- titular, cónyuge e hijos;
- bandas de edad;
- tarifas diferenciadas por género;
- plan individual o familiar según composición;
- maternidad como matriz tarifaria alternativa, no como simple recargo fijo;
- dental opcional con cargo individual o familiar;
- prima de vida;
- gastos aplicados a componentes específicos;
- IVA sobre una base compuesta;
- salida comparativa de planes con beneficios y límites.

Hallazgo P0:

- edad máxima de contratación y continuidad tarifaria no son el mismo concepto; deben modelarse por separado.

## 5. Contrato reusable resultante

Se requiere modelar explícitamente:

- `calculationType`;
- `amountBasis`;
- aplicabilidad;
- componentes de prima;
- financiamiento;
- opciones seleccionables;
- tabla tarifaria/matriz;
- ruta de salida;
- evidencia hoja/rango;
- versión;
- estado de validación;
- segundo gate de habilitación.

Tipos de cálculo mínimos:

```text
fixed
rate
rate_with_minimum
rate_plus_fixed_with_minimum
lookup_range
matrix_age_gender
matrix_age_gender_maternity
per_member
household_tier
gross_table
manual_validated
```

Bases monetarias mínimas:

```text
net
gross_includes_tax
gross_includes_fees
gross_includes_tax_and_fees
requires_validation
```

## 6. Reglas de UX/Cotizador derivadas

### Autos y motos

- primero país;
- después producto;
- después tipo y uso de vehículo;
- mostrar únicamente planes aplicables;
- aplicar la tabla y mínimo de esa combinación;
- permitir coberturas opcionales reales;
- mostrar pagos permitidos;
- renderizar una única salida correspondiente a la selección.

### Gastos Médicos

- plan Individual/Familiar;
- integrantes;
- edad y género por integrante;
- maternidad seleccionable cuando aplique;
- dental seleccionable;
- otras coberturas adicionales configuradas;
- plan y territorio;
- evitar doble cálculo de gastos/IVA cuando la tabla ya entrega prima bruta.

## 7. Hallazgos que no deben migrarse

- nombres definidos rotos;
- referencias externas legacy;
- hojas antiguas duplicadas;
- PII de ejemplos;
- rutas o fórmulas con `#REF!`;
- cálculos internos para colaboradores si no se autorizan como producto;
- tablas huérfanas sin evidencia de uso;
- supuestos del HTML v110 no respaldados por el archivo fuente;
- claves de IA o llamadas directas desde frontend.

## 8. Estado y próximos pasos

Cerrado:

- inventario y auditoría inicial de ocho fuentes;
- separación por producto/tipo de riesgo;
- identificación de patrones de cálculo;
- identificación de rutas de salida;
- anomalías y riesgos;
- contrato P0.6 reusable sin datos reales.

Pendiente:

- generar reportes sanitizados hoja/rango por cada libro;
- construir propuestas numéricas fuera del core;
- revisión humana de cada valor;
- cotizaciones PDF oficiales para completar formatos faltantes;
- wire real Drive;
- habilitación separada para Cotizador y Comparativo;
- diseño UX con Claude una vez confirmado el flujo.
