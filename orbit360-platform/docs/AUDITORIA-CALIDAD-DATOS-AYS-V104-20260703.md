# Auditoría calidad de datos A&S v1.104

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** auditor creado e integrado al primer ensayo sin escritura.

## 1. Objetivo

Detectar problemas de calidad y relaciones antes de generar payload o escribir en Firestore LAB.

## 2. Archivos creados

```txt
tools/orbit360-auditar-calidad-datos-ays-v104.mjs
tools/orbit360-auditar-calidad-datos-ays-v104.ps1
```

También se actualizó:

```txt
tools/orbit360-run-primer-ensayo-importacion-ays-v104.ps1
```

## 3. Qué revisa

- IDs duplicados por colección.
- Campos requeridos faltantes.
- Vehículos sin cliente válido.
- Pólizas sin cliente o aseguradora válida.
- Cobros sin póliza o cliente válido.
- Comisiones sin póliza o aseguradora válida.
- Reclamos/siniestros sin cliente o póliza válida.
- Clientes sin póliza asociada.
- Moneda esperada por país.
- Montos no numéricos.
- Estados de póliza no estándar.
- `primaNeta` inválida.
- Fechas inválidas.
- Cobros pendientes ligados a pólizas canceladas o vencidas.
- Tipos de movimientos financieros no estándar.

## 4. Ejecución individual

```txt
tools/orbit360-auditar-calidad-datos-ays-v104.ps1
```

El wrapper:

- verifica rama obligatoria;
- ejecuta auditoría local;
- genera reporte en `_orbit360_reports`;
- copia reporte al portapapeles;
- abre Notepad;
- no escribe Firestore.

## 5. Integración al primer ensayo

El script:

```txt
tools/orbit360-run-primer-ensayo-importacion-ays-v104.ps1
```

ahora ejecuta auditoría de calidad después de validar estructura y antes de generar payload.

Si hay errores críticos, el flujo se bloquea y no genera payload.

## 6. Regla comercial protegida

El auditor protege especialmente la regla de cartera:

```txt
Solo cobros pendientes de pólizas vigentes o por renovar pueden pasar como cartera.
```

Cobros pendientes ligados a pólizas canceladas o vencidas se tratan como error crítico.

## 7. Estado

Auditoría de calidad lista para ejecución local con datos reales. Pendiente: probar con archivos reales y revisar reportes.
