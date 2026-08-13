# Registro control maestro — P0.6 Carril C cotizadores reales

Fecha: 2026-07-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5 draft/open`  
Estado: `BLOQUE_P06_IMPLEMENTADO / CI_VISIBLE_PENDIENTE / SIN_MERGE_DEPLOY`

## Fuente real utilizada

Ocho cotizadores/tarifarios Excel GT recibidos en la conversación actual.

Los archivos no se subieron al repositorio. Los reportes y código no contienen PII ni tasas reales hardcodeadas.

## Carril A — Prototipo/UX/Claude

Avance:

- requisitos UX derivados para Autos, Motos y Gastos Médicos;
- salida única por selección;
- coberturas opcionales;
- secciones e impresión por aseguradora;
- requisitos de historial, evidencia, versionado y estados honestos;
- addendum Claude/Academia P0.6.

Pendiente:

- candidata visual;
- wizard real;
- preview/diff;
- historial visual;
- impresión final;
- WhatsApp Cotizador.

Claude no se solicita todavía.

## Carril B — Backend/contratos

Avance:

```text
core/tariff-rule-proposal-p06.js
tools/orbit360-test-tariff-rule-proposal-p06.mjs
.github/workflows/orbit360-tariff-rule-proposal-p06-smoke.yml
```

Cerrado:

- tipos de cálculo;
- base monetaria;
- componentes;
- aplicabilidad;
- financiamiento;
- ruta de salida;
- validaciones;
- conflictos;
- diff;
- segundo gate.

Pendiente:

- CI visible;
- integración con provider P0.5;
- writer externo controlado;
- gate de habilitación;
- runtime Aseguradoras;
- adapter PDF.

## Carril C — Fuentes reales

Avance:

- inventario de ocho libros;
- auditoría de hojas visibles/ocultas;
- clasificación de entrada, cálculo, tarifas y salida;
- patrones por vehículo/producto/plan;
- gastos, asistencia, financiamiento e impuestos;
- matrices de Salud;
- anomalías y elementos legacy.

Pendiente:

- reporte sanitizado individual por archivo/hoja/rango;
- extracción numérica propuesta;
- validación humana;
- cotizaciones PDF ejemplo;
- Drive.

## No reabrir

- CRM/Clientes;
- dry-run clientes;
- Pólizas/Activos;
- Cobros/Recibos/Cartera;
- Comisiones/CxC/CxP;
- auditoría general v110.

## Próxima acción

P0.6b:

1. convertir cada libro en manifiesto sanitizado;
2. producir propuestas de reglas con evidencia hoja/rango;
3. generar matriz de conflictos y faltantes;
4. revisar primero Autos completos y Salud;
5. no habilitar;
6. después iniciar adapter PDF.

## Archivos relacionados

- `AUDITORIA-FORENSE-COTIZADORES-REALES-GT-MULTIPRODUCTO-P06-20260710.md`
- `IMPLEMENTACION-P06-CONTRATO-REGLAS-TARIFARIAS-MULTIPRODUCTO-20260710.md`
- `ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P06-COTIZADORES-REALES-20260710.md`
