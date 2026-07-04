# Plan dry-run LAB — `finmovs` históricos A&S GT/CO

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** plan técnico documental  
**Estado:** plan definido; ejecución bloqueada hasta autorización explícita.

## 1. Objetivo

Preparar una prueba controlada de importación financiera histórica A&S hacia la estructura `finmovs`, sin escribir datos reales en Firestore y sin tocar clientes, pólizas, cobros ni cartera.

## 2. Fuente prevista

```txt
Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx
```

Uso permitido:

```txt
movimientos históricos financieros GT/CO hasta abril 2026
```

Excluido:

- hoja `Listado producción 2025-2026`;
- mayo 2026 como cierre definitivo;
- junio y julio;
- clientes;
- pólizas;
- cobros;
- cartera.

## 3. Fases del dry-run

### Fase 0 — Confirmación de alcance

Validar antes de ejecutar:

- archivo correcto;
- alcance financiero histórico;
- no inferir CRM;
- no escritura Firestore;
- no modificar `data/store.js`;
- no generar descargables salvo solicitud explícita.

### Fase 1 — Lectura estructural

Detectar:

- hojas del libro;
- hojas mensuales GT/CO;
- hojas soporte/no migrables;
- hojas excluidas;
- periodo por hoja;
- país por hoja.

### Fase 2 — Segmentación financiera

Detectar bloques:

- ingresos;
- egresos;
- saldo anterior;
- ajustes;
- sin clasificar.

### Fase 3 — Normalización candidata

Construir objetos candidatos en memoria con esquema `finmovs`, incluyendo:

- país;
- moneda;
- periodo;
- tipo de movimiento;
- concepto;
- monto;
- trazabilidad de origen;
- validaciones;
- estado.

### Fase 4 — Validación

Clasificar cada registro como:

- candidato válido;
- referencia;
- requiere validación;
- excluido.

### Fase 5 — Reporte sin payload real

Emitir reporte con solo conteos y errores agrupados:

- hojas procesadas;
- hojas excluidas;
- candidatos válidos;
- excluidos;
- ingresos;
- egresos;
- saldos iniciales;
- registros con validación pendiente;
- errores bloqueantes;
- resumen por país/moneda/periodo.

## 4. Controles de seguridad

El dry-run debe bloquearse si ocurre cualquiera de estos casos:

1. intenta escribir Firestore;
2. intenta modificar `Orbit.store` o `data/store.js`;
3. intenta crear colecciones distintas a `finmovs`;
4. intenta crear clientes/pólizas/cobros/cartera;
5. intenta procesar hoja de producción como CRM;
6. mezcla GTQ y COP;
7. no puede determinar país/moneda;
8. encuentra datos sensibles en salida repo;
9. genera payload para GitHub;
10. no puede conservar trazabilidad.

## 5. Salida esperada del dry-run

La salida debe ser un reporte técnico, no un archivo de datos reales:

```txt
DRYRUN-FINMOVS-HISTORICOS-AYS-GT-CO-<fecha>.md
```

Contenido permitido:

- conteos;
- reglas aplicadas;
- errores agrupados;
- validaciones pendientes;
- nombres de hojas si no contienen datos sensibles;
- decisión listo/no listo.

Contenido prohibido:

- nombres de clientes/proveedores si son datos reales sensibles;
- importes específicos;
- números de póliza;
- números de cuenta;
- payload JSON con registros;
- secretos;
- credenciales.

## 6. Criterios listo/no listo

### Listo para futura escritura LAB

Solo si:

- todos los registros tienen país/moneda confiable;
- saldos iniciales están definidos;
- categorías mínimas están definidas;
- no hay errores bloqueantes;
- se revisa el reporte;
- Paula autoriza explícitamente.

### No listo para escritura LAB

Si:

- quedan registros sin país/moneda;
- hay monto no numérico o dudoso;
- hay `Saldo anterior` sin regla;
- se detecta mezcla GTQ/COP;
- hay intento de inferir pólizas/cobros/cartera;
- mayo/junio/julio se mezclan con histórico cerrado.

## 7. Script futuro sugerido

Nombre sugerido, no creado aún:

```txt
tools/orbit360-dryrun-finmovs-historicos-ays.mjs
```

Restricciones del script:

- modo lectura/análisis;
- sin Firebase Admin;
- sin credenciales;
- sin writes;
- salida agregada;
- respetar tenant A&S solo como metadata de validación;
- no subir resultado al repo si contiene datos reales.

## 8. Pendientes antes de crear script

1. Definir catálogo mínimo de categorías financieras.
2. Definir regla final de `Saldo anterior`.
3. Definir si terceros se conservan en LAB o se anonimizan en reportes.
4. Confirmar si mayo 2026 queda excluido totalmente o marcado como borrador no conciliado.
5. Confirmar formato de reporte seco sin datos reales.

## 9. Pendientes para Claude / prototipo base

1. Vista de dry-run antes de importar.
2. Selector de alcance obligatorio.
3. Bloqueo visual de inferencias CRM cuando el alcance sea financiero.
4. Resumen por país/moneda/periodo.
5. Separación de cierres manuales y conciliación.
6. Panel de errores bloqueantes.

## 10. Restricciones cumplidas

- No deploy.
- No merge.
- No main.
- No Firestore.
- No carga LAB.
- No datos reales en repo.
- No secretos.
- No modificación de `data/store.js`.
- No backend LAB protegido modificado.
- No descargables.

## Estado

**Plan de dry-run definido, ejecución bloqueada.**
