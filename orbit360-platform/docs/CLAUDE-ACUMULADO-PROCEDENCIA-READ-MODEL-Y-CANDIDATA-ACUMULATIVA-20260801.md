# Claude acumulado — procedencia, read model y candidata acumulativa

Fecha: 2026-08-01

## Clasificación

```text
REPLICABLE_CLAUDE_ACUMULADO
ACADEMIA_ACTUALIZAR
BACKEND_PROTEGIDO_NO_CLAUDE
TENANT_AYS_ONLY
```

## Reusable para futuras candidatas

1. Una diferencia de digest entre dos documentos no debe clasificarse automáticamente como conflicto funcional. Comparar primero una vista semántica que excluya campos técnicos, fechas de carga y metadatos de procedencia.
2. Distinguir explícitamente fuente autoritativa, read model y seed/bootstrap.
3. Cuando una ruta tenga mayor cobertura y trazabilidad, puede recomendarse como fuente; la declaración de autoridad debe quedar en un gate separado.
4. Los registros `REQUIERE_VALIDACION` se preservan y nunca se eliminan para igualar conteos.
5. Las referencias de import batch no resueltas deben permanecer en HOLD o normalizarse mediante un dry-run trazable; no se inventan.
6. Toda visualización posterior debe partir de una candidata acumulativa completa. No usar shells reducidos ni reemplazar la plataforma por una página aislada del módulo.

## No enviar a Claude

```text
IDs de documentos
nombres de clientes o aseguradoras
números de póliza
valores o montos
rutas privadas del tenant
service accounts
secrets
implementación de Firestore Admin
resultados privados fila por fila
```

## Contrato reusable de salida

Una auditoría dual-path sanitizada puede publicar:

```text
conteos agregados
número de IDs compartidos y exclusivos
categorías de procedencia
categorías de validación
campos divergentes agregados
recomendación de ruta no vinculante
confianza y códigos de razón
cero IDs y cero valores
```

## Barrera visual reusable

```text
singleCandidate = true
parallelCandidatesAllowed = false
reducedShellAllowed = false
partialModuleSelectionAllowed = false
moduleDowngradeAllowed = false
mustUseSameHeadOrAuditedDescendant = true
mustPreserveAllTrackedModules = true
```

## Resultado tenant-only no reusable

Los conteos concretos, la distribución por colección y la recomendación específica para A&S son `TENANT_AYS_ONLY`. Solo el patrón de clasificación y la barrera acumulativa son reutilizables.
