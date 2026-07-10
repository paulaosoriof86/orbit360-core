# ADDENDUM AL CONTROL MAESTRO CLAUDE — ASEGURADORAS MULTIFUENTE

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Estado de envío a Claude: `NO_ENVIADO`  
Estado técnico: `CONTRATO_IMPLEMENTADO / RUNTIME_P01B_IMPLEMENTADO / PENDIENTE_UX_FINAL`

## 1. Motivo del addendum

Este addendum evita que una futura candidata de Claude reduzca la base de conocimiento de una aseguradora a un documento por categoría o a un único perfil general.

Debe leerse junto con:

- `CONTROL-MAESTRO-ACUMULADO-CLAUDE-BACKEND-UX-ACADEMIA-ORBIT360-AYS-20260709.md`;
- `AUDITORIA-FORENSE-PROFUNDA-COTIZADOR-COMPARATIVO-V110-CONTRATO-AYS-20260709.md`;
- `DECISION-MAESTRA-ASEGURADORAS-COTIZADOR-COMPARATIVO-HISTORIALES-IA-TARIFAS-20260710.md`;
- `DECISION-MAESTRA-COTIZACIONES-POR-ASEGURADORA-SECCIONES-FIDELIDAD-FUENTES-20260710.md`;
- `DECISION-MAESTRA-ASEGURADORAS-MULTIPLES-FUENTES-USOS-COMBINATION-20260710.md`;
- `IMPLEMENTACION-P01B-ASEGURADORAS-COBERTURA-POR-COMBINACION-20260710.md`.

## 2. Registro acumulado del cambio

```txt
Fecha: 2026-07-10
Carril: A + B
Módulo: Aseguradoras / Fuentes / Cotizador / Comparativo
Necesidad: admitir muchas pólizas, cotizaciones, cotizadores, tarifarios, condiciones y beneficios por aseguradora y producto.
Causa raíz: el inventario inicial permitía múltiples filas, pero evaluaba suficiencia demasiado cerca del nivel aseguradora general.
Esperado: cobertura por combinación y múltiples usos por fuente.
Backend reusable: matriz de dimensiones, agrupación, conteos y usos.
Archivo contrato: core/cotizacion-esquema-aseguradora-p0.js
Archivo runtime: modules/aseguradoras.js
Tests: tools/orbit360-test-cotizacion-esquema-aseguradora-p0.mjs + tools/orbit360-test-aseguradoras-fuentes-runtime-p0.mjs
Impacto UX Claude: alto.
Impacto Academia: alto.
Estado contrato: implementado y smoke local aprobado.
Estado runtime: P0.1b implementado; grupos, dimensiones y faltantes visibles.
Estado Claude: documentado, no enviado.
Condición de cierre: Claude consolida UX sin simplificar después de accesos, Drive y adapters.
```

## 3. Reglas obligatorias para Claude

### Multiplicidad

- Una aseguradora puede tener muchos documentos por categoría.
- Una misma combinación puede tener varias pólizas y cotizaciones ejemplo.
- Una nueva versión no borra las anteriores.
- Los documentos se filtran y agrupan, no se reemplazan por una única tarjeta.

### Dimensiones

Claude debe prever desplegables y filtros para:

- país;
- moneda;
- ramo;
- producto;
- familia de producto;
- subtipo;
- segmento;
- tipo de riesgo;
- tipo de vehículo;
- uso del vehículo;
- plan;
- versión;
- vigencia.

Debe existir opción `Otro / Requiere validación` cuando el catálogo no contenga el valor.

### Tipo frente a usos

La UI debe distinguir:

```txt
Qué archivo es
vs.
Para qué sirve
```

Un cotizador Excel puede mostrar simultáneamente badges como:

```txt
Tarifas
Reglas
Presentación
Casos de prueba
Entrenamiento
```

No debe obligarse al usuario a duplicar el mismo archivo para cada uso.

### Cobertura por combinación

La ficha debe mostrar grupos, por ejemplo:

```txt
GT · Autos · Automóvil
GT · Autos · Motocicleta
GT · Gastos Médicos · Individual
GT · Gastos Médicos · Familiar
```

Cada grupo debe tener su propio estado:

- completo pendiente de validación;
- fuentes incompletas;
- requiere cotización ejemplo;
- requiere tarifas/reglas;
- sin casos de prueba;
- calibrado;
- validado/habilitado.

Una fuente de Autos no puede ocultar el faltante de Motos.

## 4. Implementación runtime ya existente que Claude debe preservar

P0.1b ya implementó en `modules/aseguradoras.js`:

- contador de fuentes y combinaciones en tarjetas;
- alerta de grupos incompletos;
- bloque `Cobertura de conocimiento por combinación`;
- grupos desplegables;
- conteos por tipo documental;
- badges de tarifa, reglas, presentación y casos;
- campos de país, moneda, ramo, producto, familia, subtipo, segmento, riesgo, vehículo, uso y plan;
- `datalist` construidos desde la información existente;
- persistencia incremental dentro de `aseguradora.docs[]`;
- compatibilidad con registros legacy;
- resumen y clave de combinación expuestos en `_fuentes`.

Claude no debe eliminar esta semántica al rediseñar la interfaz.

## 5. UX final requerida

Claude deberá mejorar posteriormente:

- resumen por grupo;
- filtros y búsqueda;
- carga múltiple;
- selección masiva de país/producto/tipo;
- edición individual de metadatos;
- conteos de pólizas/cotizaciones/cotizadores;
- vista del documento original;
- usos detectados y corregibles;
- diff de versión;
- alerta de fuente insuficiente;
- historial de sustitución;
- vínculo a Drive;
- estados honestos de lectura y validación;
- responsive y densidad visual de la ficha.

No se necesita que el prototipo ejecute IA real, pero sí debe representar correctamente:

- pendiente de lectura;
- extracción en prueba;
- requiere validación;
- calibrado;
- validado/habilitado;
- reemplazado por versión.

## 6. Integración con Cotizador

Claude debe mostrar que Cotizador consume únicamente la combinación aplicable.

Ejemplos:

- una tasa para Automóvil no aparece al cotizar Motocicleta;
- un cotizador de Gastos Médicos individual no se usa automáticamente para familiar;
- una versión vencida no se ofrece como vigente;
- el asesor puede consultar qué fuente/versión produjo el resultado.

## 7. Integración con Comparativo

Comparativo debe:

- usar la capa canónica para campos equivalentes;
- conservar pólizas, cotizaciones, condiciones y beneficios particulares como fuentes relacionadas;
- permitir abrir la propuesta individual completa;
- no descartar campos no comunes;
- explicar faltantes o baja confianza.

## 8. Academia requerida

### Dirección/Admin/Operativo

- crear y revisar grupos de cobertura;
- cargar varias fuentes;
- marcar usos;
- revisar inferencias;
- completar faltantes;
- validar versiones;
- reemplazar sin borrar;
- identificar cuándo un cotizador Excel sirve como tarifario inferido;
- interpretar los estados de grupo del runtime P0.1b.

### Asesor

- consultar fuente y versión;
- interpretar si la cotización está validada;
- distinguir producto y segmento;
- no reutilizar una propuesta fuera de su combinación.

### Seguridad/IT

- trazabilidad de archivos;
- control de versiones;
- aislamiento tenant;
- Drive/Storage;
- permisos y auditoría.

## 9. Prohibiciones

Claude no debe:

- diseñar un campo único `Póliza ejemplo`;
- limitar `Cotización ejemplo` a un solo archivo;
- asumir que una aseguradora tiene un tarifario universal;
- mezclar productos o tipos de vehículo;
- duplicar el mismo documento por cada uso;
- ocultar versiones anteriores;
- hardcodear aseguradoras o productos A&S en la base reusable;
- sustituir `Orbit.store`;
- tocar backend protegido;
- copiar el directorio de aseguradoras de v110;
- revertir los grupos runtime ya implementados.

## 10. Momento de intervención de Claude

Claude no es indispensable todavía.

Ya está listo:

```txt
1. dimensiones avanzadas y grupos en runtime P0.1b
```

Falta antes de pedir nueva candidata:

```txt
2. accesos/cuentas sensibles
3. matching Drive
4. adapter de inventario Excel/PDF
5. primer flujo de propuesta/diff
```

En ese punto Claude deberá recibir el paquete acumulado completo y no un resumen parcial.
