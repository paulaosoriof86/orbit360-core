# ADDENDUM AL CONTROL MAESTRO CLAUDE — ASEGURADORAS MULTIFUENTE

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Estado de envío a Claude: `NO_ENVIADO`  
Estado técnico: `CONTRATO_IMPLEMENTADO / RUNTIME_DIMENSIONES_PENDIENTE`

## 1. Motivo del addendum

Este addendum evita que una futura candidata de Claude reduzca la base de conocimiento de una aseguradora a un documento por categoría o a un único perfil general.

Debe leerse junto con:

- `CONTROL-MAESTRO-ACUMULADO-CLAUDE-BACKEND-UX-ACADEMIA-ORBIT360-AYS-20260709.md`;
- `AUDITORIA-FORENSE-PROFUNDA-COTIZADOR-COMPARATIVO-V110-CONTRATO-AYS-20260709.md`;
- `DECISION-MAESTRA-ASEGURADORAS-COTIZADOR-COMPARATIVO-HISTORIALES-IA-TARIFAS-20260710.md`;
- `DECISION-MAESTRA-COTIZACIONES-POR-ASEGURADORA-SECCIONES-FIDELIDAD-FUENTES-20260710.md`;
- `DECISION-MAESTRA-ASEGURADORAS-MULTIPLES-FUENTES-USOS-COMBINATION-20260710.md`.

## 2. Registro acumulado del cambio

```txt
Fecha: 2026-07-10
Carril: A + B
Módulo: Aseguradoras / Fuentes / Cotizador / Comparativo
Necesidad: admitir muchas pólizas, cotizaciones, cotizadores, tarifarios, condiciones y beneficios por aseguradora y producto.
Causa raíz: el inventario inicial permitía múltiples filas, pero el contrato evaluaba suficiencia demasiado cerca del nivel aseguradora/producto general y podía interpretarse como una fuente por tipo.
Esperado: cobertura por combinación y múltiples usos por fuente.
Backend reusable: matriz de dimensiones, agrupación, conteos y usos.
Archivo principal: core/cotizacion-esquema-aseguradora-p0.js
Test: tools/orbit360-test-cotizacion-esquema-aseguradora-p0.mjs
Impacto UX Claude: alto.
Impacto Academia: alto.
Estado backend: implementado y smoke local aprobado.
Estado runtime: inventario básico implementado; dimensiones avanzadas pendientes de UI.
Estado Claude: documentado, no enviado.
Condición de cierre: runtime muestra grupos y faltantes por combinación; Claude consolida UX sin simplificar.
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

## 4. UX requerida

Claude deberá diseñar posteriormente:

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
- estados honestos de lectura y validación.

No se necesita que el prototipo ejecute IA real, pero sí debe representar correctamente:

- pendiente de lectura;
- extracción en prueba;
- requiere validación;
- calibrado;
- validado/habilitado;
- reemplazado por versión.

## 5. Integración con Cotizador

Claude debe mostrar que Cotizador consume únicamente la combinación aplicable.

Ejemplos:

- una tasa para Automóvil no aparece al cotizar Motocicleta;
- un cotizador de Gastos Médicos individual no se usa automáticamente para familiar;
- una versión vencida no se ofrece como vigente;
- el asesor puede consultar qué fuente/version produjo el resultado.

## 6. Integración con Comparativo

Comparativo debe:

- usar la capa canónica para campos equivalentes;
- conservar pólizas, cotizaciones, condiciones y beneficios particulares como fuentes relacionadas;
- permitir abrir la propuesta individual completa;
- no descartar campos no comunes;
- explicar faltantes o baja confianza.

## 7. Academia requerida

### Dirección/Admin/Operativo

- crear grupos de cobertura;
- cargar varias fuentes;
- marcar usos;
- revisar inferencias;
- completar faltantes;
- validar versiones;
- reemplazar sin borrar;
- identificar cuando un cotizador Excel sirve como tarifario inferido.

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

## 8. Prohibiciones

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
- copiar el directorio de aseguradoras de v110.

## 9. Momento de intervención de Claude

Claude no es indispensable todavía.

Se solicitará intervención cuando estén listos:

1. dimensiones avanzadas en runtime;
2. accesos/cuentas sensibles;
3. matching Drive;
4. adapter de inventario Excel/PDF;
5. primer flujo de propuesta/diff.

En ese punto deberá recibir el paquete acumulado completo y no un resumen parcial.
