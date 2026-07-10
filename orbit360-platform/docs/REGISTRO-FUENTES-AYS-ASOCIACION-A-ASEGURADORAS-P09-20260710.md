# Registro A&S — asociación de fuentes a Aseguradoras P0.9

Fecha: 2026-07-10  
Tenant: Alianzas y Soluciones  
Estado: `FUENTES_IDENTIFICADAS_Y_AUDITADAS / ASOCIACION_DEFINIDA / PERSISTENCIA_OPERATIVA_PENDIENTE`

## 1. Decisión

Todas las fuentes recibidas de cotizadores, tarifarios y cotizaciones ejemplo se administrarán dentro del módulo Aseguradoras del tenant A&S.

No se hardcodean en el core reusable. Se vinculan mediante:

```text
tenant A&S
→ aseguradora del directorio
→ país
→ producto/ramo
→ vehículo/riesgo/plan
→ documento y versión
→ manifiesto
→ reglas/presentación
→ binding
```

## 2. Fuentes Excel identificadas

Quedan preparadas para ingestión controlada:

- BAM Vehículos;
- BAM Salud;
- Bantrab Autos;
- Bantrab Motos;
- Columna Vehículos;
- Aseguradora Guatemalteca tarifario;
- Banrural Mi Carro Seguro;
- Banrural/Aseguradora Rural Gastos Médicos.

Cada libro debe quedar separado por aseguradora, producto, tipo de vehículo/riesgo, plan y versión.

## 3. Fuentes PDF identificadas

- Aseguradora Guatemalteca — automóvil;
- Aseguradora Guatemalteca — microbús hasta nueve pasajeros;
- Seguros Universales — Riesgo Plus.

Los dos documentos AseGuate forman una familia con variantes distintas. Universales es una familia independiente.

## 4. Dónde quedará cada elemento

### En la ficha Aseguradoras

```text
aseguradoras.docs[]
```

Mostrará la referencia visible del Excel/PDF, estado, producto, combinación, versión, usos y trazabilidad.

### En conocimiento profundo

```text
aseguradora_manifiestos
aseguradora_propuestas
aseguradora_reglas_tarifarias
aseguradora_presentaciones
aseguradora_bindings
aseguradora_revisiones
```

### En auditoría

```text
actividades
```

## 5. Qué no se guardará

- archivos binarios dentro de Orbit.store;
- base64;
- macros;
- tokens;
- claves de IA;
- nombres, teléfonos, correos, documentos o placas de ejemplos;
- fórmulas rotas como reglas;
- referencias externas legacy;
- tasas hardcodeadas en JavaScript;
- una regla de A&S como configuración global para otros tenants.

Los archivos originales vivirán en la fuente documental autorizada, por ejemplo Drive o almacenamiento backend. Orbit conservará la referencia y la trazabilidad.

## 6. Estados iniciales

Al ingresar por P0.9:

```text
fuente: requiere_validacion
manifiesto: requiere_validacion
propuesta: requiere_validacion
regla: propuesta o validada pendiente de habilitación
presentación: requiere_validacion
binding: incompleto, conflicto o completo pendiente de gate
```

Ninguna fuente se marca activa solo por estar cargada.

## 7. AseGuate

La asociación prevista es:

```text
AseGuate
├─ tarifario Excel
├─ cotización PDF automóvil
└─ cotización PDF microbús
```

Sin embargo, el binding automático continúa bloqueado porque aún faltan bases completas de gasto, IVA, asistencia, financiamiento y reglas específicas reproducibles.

Los PDFs sí podrán registrarse como presentaciones externas pendientes de validación.

## 8. Reutilización para otros tenants

Otro tenant podrá:

1. configurar su directorio de aseguradoras;
2. cargar sus propios Excel/PDF;
3. ejecutar los mismos providers y adapters;
4. corregir mappings;
5. validar reglas;
6. conservar versiones;
7. habilitar productos propios.

No recibirá las fuentes ni reglas de A&S salvo una migración explícita, autorizada y trazable.

## 9. Estado real al cierre

La estructura de asociación y persistencia ya está implementada en P0.9.

La escritura operativa de estas once fuentes todavía requiere:

- scripts P0.9 cargados en la SPA;
- providers backend registrados;
- referencias Drive/upload autorizadas;
- ejecución del runtime;
- revisión humana;
- plan de persistencia confirmado.

Por tanto, las fuentes están preparadas y asignadas conceptualmente a A&S, pero todavía no se declara que estén persistidas en el store operativo.
