# Contrato técnico `import_batches` — Orbit 360 A&S

**Fecha:** 2026-07-03  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**Tenant:** `alianzas-soluciones`  
**Estado:** contrato técnico sin datos personales ni valores sensibles.

## Objetivo

Todo proceso de importación debe crear un lote de control antes de escribir registros operativos. El lote permite trazabilidad, revisión, auditoría, reversión y reporte de errores.

## Colección

```txt
import_batches
```

## Ruta LAB actual

```txt
tenantId/alianzas-soluciones/import_batches/{batchId}
```

## ID sugerido

```txt
imp_ays_<tipo>_<yyyymmdd_hhmmss>
```

## Campos mínimos del lote

```js
{
  id: "",
  tenantId: "alianzas-soluciones",
  tipo: "",
  origen: "",
  archivoNombre: "",
  hoja: "",
  estado: "preview",
  modo: "lab",
  creadoEn: "",
  creadoPor: "",
  actualizadoEn: "",
  totalFilas: 0,
  filasValidas: 0,
  filasConAdvertencia: 0,
  filasConError: 0,
  filasInsertadas: 0,
  filasActualizadas: 0,
  filasDuplicadas: 0,
  filasExcluidas: 0,
  requiereRevision: 0,
  columnasDetectadas: [],
  mapeoUsado: {},
  advertencias: [],
  errores: []
}
```

## Estados permitidos

```txt
preview
aprobado
importando
importado
importado_con_advertencias
fallido
cancelado
revertido
```

## Trazabilidad por registro importado

Cada registro creado o actualizado por importador debe llevar:

```js
{
  importBatchId: "",
  importSource: "",
  importFile: "",
  importSheet: "",
  importRow: 0,
  importStatus: "",
  importConfidence: 0,
  importWarnings: [],
  importErrors: [],
  importedAt: "",
  importedBy: "",
  reviewedBy: "",
  reviewedAt: ""
}
```

## Reglas obligatorias

- No escribir datos de importación en `data/seed.js`.
- No hardcodear datos de cliente en módulos.
- No escribir fuera del tenant activo.
- No importar sin lote.
- No mezclar caja/banco con cobros comerciales.
- No mezclar monedas en un mismo total sin equivalencia explícita.
- No marcar cartera histórica como cartera vigente.

## Flujo mínimo

1. Crear lote en estado `preview`.
2. Detectar columnas.
3. Aplicar mapeo.
4. Previsualizar.
5. Validar errores y advertencias.
6. Aprobar.
7. Escribir registros.
8. Actualizar totales del lote.
9. Generar reporte.
10. Validar en UI.

## Estado

**Estado:** LISTO COMO CONTRATO TÉCNICO.  
**Siguiente paso:** usar este contrato al implementar el primer importador real después de smoke LAB aprobado.
