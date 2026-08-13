# Bloque 1 · Disparador estructural de Cliente 360 excluido

Fecha: 2026-07-21  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`

## Clasificación

```txt
FUNCTIONAL_DEFECT_CLIENT360_STRUCTURAL_TRIGGER_MISSING
```

## Evidencia del run

```txt
Run: 29877114230
Artifact: 8513405578
Digest: sha256:68104495274a8b1aa63e7762bad7e358ce3708e4200d0f8f70473a918a912765
HEAD: d7fc4f44c9186e2b232a81bea7ab99900ec70b39
```

La publicación Hosting LAB, el SHA desplegado, el contrato `1.0.32`, la prueba idempotente y los conteos 414/26/7 fueron correctos. El ciclo de mutaciones anterior no volvió a presentarse: el gate abrió Aseguradoras y continuó hasta la validación de filtros de Cliente 360.

## Error exacto

```txt
CLIENT_FILTER_COUNTRY_VALIDATION_COUNT_INVALID:desktopDirection:414
```

El conjunto canónico leído por el mismo gate era correcto:

```txt
Total: 414
GT: 337
CO: 16
REQUIERE_VALIDACION: 61
Persona: 391
Empresa: 23
Pendiente de clasificar: 414
```

Pero la interfaz mostraba:

```txt
Filtro CO: 16
Filtro REQUIERE_VALIDACION: 414
qualityOptionPresent: false
qualityChipPresent: false
segmentOptionPresent: false
segmentCriteriaPresent: false
```

## Causa raíz

Al corregir la autorreacción del `MutationObserver`, el owner fue limitado a estructuras de Aseguradoras:

```txt
#asg-ficha
#af-body
filas de contactos, portales y bancos
```

El predicate `nodeNeedsCanonicalEnhancement()` dejó fuera los nodos estructurales de Cliente 360:

```txt
#f-pais
#f-seg
```

Por eso `enhanceClient360()` existía y la proyección canónica tenía los 61 casos correctos, pero nunca se ejecutaba cuando el Router insertaba la página de Cliente 360. Al intentar seleccionar un valor inexistente (`REQUIERE_VALIDACION`), el select conservaba el valor vacío y la tabla mostraba los 414 registros.

## Corrección

Se modificó únicamente:

```txt
orbit360-platform/core/client-insurer-visual-contract-v20260720.js
```

El owner idempotente ahora reconoce como mutaciones base:

- `#f-pais`;
- `#f-seg`;
- cualquier contenedor nuevo que incluya esos controles.

Se conserva:

- desconexión del observer durante escrituras propias;
- escrituras idempotentes;
- alcance estructural, no cualquier mutación;
- cero cambios en Store, Auth, backend, datos y `modules/aseguradoras.js`.

Revisión del owner:

```txt
20260721.4
```

## Prueba determinista ampliada

La prueba exige 27 checks:

```txt
f-pais detectado como disparador
f-seg detectado como disparador
contrato client360StructuralTrigger:true
una mutación base
una transformación canónica
cero entregas posteriores del observer
```

## Siguiente acción exacta

1. registrar contrato `1.0.33`;
2. ejecutar un único preflight estático;
3. exigir `GO_GATE_CONTRACT`, 27/27 checks y patrón 1→1→0;
4. no abrir navegador ni desplegar durante el preflight;
5. solo después considerar una autorización separada del gate final.
