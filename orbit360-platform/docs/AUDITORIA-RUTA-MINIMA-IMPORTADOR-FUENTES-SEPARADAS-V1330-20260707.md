# Auditoría y ruta mínima — Importador por fuentes separadas v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Auditar el estado real del importador y definir la ruta mínima para migración real controlada sin tocar todavía archivos protegidos.

## Archivos leídos

- `orbit360-platform/modules/importar.js`
- `orbit360-platform/core/importa.js`

## Estado real encontrado

### Hub de importación

`modules/importar.js` ya es un hub de importación por grupos:

- Arranque.
- Conciliación con aseguradoras.
- Finanzas y Marketing.

Cada tarjeta abre `Orbit.importa.open(kind)`.

### Motor transversal

`core/importa.js` ya contiene elementos clave:

- parseo CSV/TSV/TXT;
- carga perezosa de librerías;
- extracción por IA si está disponible;
- mapeo de encabezados;
- dry-run;
- reporte CSV descargable;
- scope guard por fuente;
- propuesta de conciliación sin aplicación directa;
- documentos como parches pendientes, no escritura directa;
- estados bancarios a bandeja de conciliación;
- financiero histórico a `finmovs` sin crear clientes/pólizas/cartera;
- planillas de comisión con filas reales y `REQUIERE_VALIDACION` cuando falta dato confiable.

## Lo que ya cumple la regla maestra

### Fuentes separadas

Existe `SCOPE` por fuente. Cada fuente declara qué puede crear y qué queda bloqueado.

Ejemplos:

- `estados-banco` crea `conciliacionBanco`, no cobros, clientes, pólizas ni cartera.
- `financiero-historico` crea `finmovs`, no clientes, pólizas, cobros ni producción real.
- `documentos` crea `parchesPendientes`, no modifica clientes/pólizas/cobros directamente.
- `planillas-comision` crea comisiones, no clientes/pólizas/cobros.

### País/moneda

El importador no debe asumir GT/GTQ si falta dato confiable. Hay lógica para sugerir moneda por país, pero bloquear o marcar validación cuando la moneda explícita no existe.

### Banco

El estado bancario queda como conciliación pendiente; no aplica pagos ni crea cobros directos.

### Documentos soporte

Documentos generan propuestas/diff como `parchesPendientes`; no modifican expediente directo.

### Planillas de comisión

Las tarifas se leen desde filas reales. Si no hay columnas confiables o match de aseguradora/% de comisión, no actualiza tarifario.

## Brechas para migración real

### 1. No cargar datos reales desde UI sin smoke local

Aunque el importador ya tiene guardas, sigue pendiente validar en entorno local completo antes de cargar archivos reales.

### 2. Falta prueba con archivos reales A&S

Archivos prioritarios para ensayo controlado:

- Directorio Aseguradoras Guatemala 2026.
- Directorio Aseguradoras Colombia 2024.
- Movimientos Ing y Eg Alianzas Guate y Col 2026.
- Calendario Maestro Contenidos 2026.
- Planillas de comisiones junio/julio cuando estén disponibles.
- Estados de cuenta cliente/aseguradora recientes.

### 3. Junio/julio requiere caso especial

El documento maestro indica que junio/julio pueden tener pagos aplicados en planillas de comisión que no aparecen en financiero histórico. Además, estados de cuenta de clientes pueden mostrar pagos pendientes y no realizados.

Por eso junio/julio no debe resolverse con una sola fuente.

### 4. Confirmación final de escritura

Antes de carga real debe verificarse que el paso final muestre claramente:

- crear nuevos;
- actualizar;
- omitir;
- errores;
- fuente;
- hoja;
- fila;
- país;
- moneda;
- qué colección escribe;
- qué colecciones bloquea.

### 5. Equipo/Configuración siguen pendientes

La migración puede ensayarse en LAB/dry-run, pero operación real requiere cerrar gates de Equipo y Configuración.

## Ruta mínima recomendada

### Bloque M1 — Smoke local del importador

Ejecutar validaciones locales sin datos reales productivos:

- `node --check orbit360-platform/core/importa.js`
- `node --check orbit360-platform/modules/importar.js`
- validador backend LAB.

### Bloque M2 — Ensayo con archivo de bajo riesgo

Primer ensayo recomendado:

- `AyS — Calendario Maestro Contenidos 2026 — Flujo híbrido.xlsx`

Motivo: impacta Marketing/contenidos, no cartera ni producción.

### Bloque M3 — Directorios aseguradoras

Segundo ensayo:

- Directorio Aseguradoras Guatemala 2026.
- Directorio Aseguradoras Colombia 2024.

Debe quedar como directorio/vinculación, no crear pólizas/clientes.

### Bloque M4 — Financiero histórico

Tercer ensayo:

- Movimientos Ing y Eg Alianzas Guate y Col 2026.

Debe entrar a `finmovs` como histórico/operativo, separado por país/moneda, sin escribir cartera ni producción.

### Bloque M5 — Cobros/planillas/conciliación

Último bloque, por ser más sensible:

- planilla aseguradora;
- planilla comisiones;
- estados bancarios;
- estados cliente.

Debe crear propuestas/dry-run y no aplicar pagos sin gate.

## Criterios de aceptación antes de migración real

No cargar información real hasta que:

- dry-run muestre fuente/hoja/fila;
- país/moneda estén explícitos o quede `REQUIERE_VALIDACION`;
- se confirme que banco no aplica cobros;
- se confirme que financiero histórico no crea cartera;
- documentos no actualicen clientes/pólizas sin diff;
- planillas de comisión no simulen tarifas;
- haya reporte descargable de importación;
- haya rollback o modo LAB claro.

## ¿Aplica a Claude/prototipo?

Sí.

Claude debe conservar en UX:

- importador por fuentes separadas;
- banner de alcance por fuente;
- etiquetas de bloqueado/no crea;
- dry-run visible;
- reporte descargable;
- confirmación antes de escribir;
- `REQUIERE_VALIDACION` para país/moneda dudosos;
- banco como propuesta de conciliación;
- documentos como parches pendientes;
- planillas de comisión desde filas reales.

## Estado

Auditoría documental creada.
No se tocó código funcional.
No se tocó `core/importa.js`.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No datos reales.
No secretos.
