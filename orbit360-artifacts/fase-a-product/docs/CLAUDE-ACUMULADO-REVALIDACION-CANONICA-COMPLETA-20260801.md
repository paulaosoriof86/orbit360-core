# Claude acumulado — Revalidación canónica completa

Fecha: 2026-08-01

## Clasificación

```text
REPLICABLE_CLAUDE_ACUMULADO
```

Transferible:

- separar paridad física, semántica y relacional;
- comparar IDs compartidos, source-only y target-only;
- clasificar target-only como seeds antes de excluirlos;
- comparar esquema de negocio ignorando envolturas técnicas controladas;
- exigir coincidencia del estado de validación por ID;
- validar relaciones con el universo operativo y no con seeds;
- sellar snapshots mediante digests reproducibles;
- producir evidencia con agregados y sin IDs ni valores.

```text
TENANT_AYS_ONLY
```

No transferir conteos, digests, nombres de proyecto, tenant, runs, jobs, artifacts ni distribuciones concretas de A&S.

```text
BACKEND_PROTEGIDO_NO_CLAUDE
```

No transferir rutas físicas Firestore, credenciales, secrets, implementación exacta de validadores ni detalles de identidad LAB.

```text
ACADEMIA_ACTUALIZAR
```

Enseñar que una migración puede combinar payloads físicamente iguales y proyecciones semánticamente equivalentes, siempre que el esquema, la validación y las relaciones estén alineados.

## Patrón reusable

### Entrada

- snapshot fuente sellado;
- snapshot destino sellado;
- colecciones y conteos esperados;
- reglas de equivalencia de negocio;
- claves técnicas, de trazabilidad y validación;
- reglas de relaciones;
- clasificación de seeds.

### Proceso

1. Verificar conteos e ID sets por colección.
2. Exigir cero source-only cuando la migración se declara completa.
3. Clasificar todos los target-only.
4. Comparar hash físico por ID.
5. Para los no exactos, validar proyección semántica sin conflictos críticos.
6. Comparar esquema de negocio y validación por ID.
7. Auditar relaciones en fuente y destino con los mismos padres operativos.
8. Sellar el digest canónico.
9. Revalidar el manifiesto acumulativo.
10. Emitir evidencia sanitizada y cero escrituras.

### Salida

```text
coverage
+ exact parity
+ semantic parity
+ schema parity
+ validation parity
+ target-only classification
+ relation graph parity
+ sealed canonical digest
+ zero-write evidence
```

## Regla para el siguiente adapter

La adaptación del frontend debe conservar la API pública de `Orbit.store`, todos los módulos acumulados y los estados honestos. La revalidación de datos no autoriza navegador, visualización, deploy ni aprobación humana.
