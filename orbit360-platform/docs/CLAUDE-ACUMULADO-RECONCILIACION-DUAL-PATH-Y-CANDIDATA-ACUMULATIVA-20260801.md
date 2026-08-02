# Acumulado Claude — reconciliación dual-path y candidata acumulativa

Fecha: 2026-08-01

## Clasificación

### REPLICABLE_CLAUDE_ACUMULADO

Patrón reusable de auditoría entre dos rutas o stores sin escritura:

- comparar conteos por colección;
- calcular digest del conjunto de IDs;
- calcular digest estable del contenido;
- clasificar IDs compartidos, solo-origen y solo-destino;
- separar contenido igual y divergente;
- comparar esquema top-level y tipos;
- producir únicamente evidencia sanitizada;
- no declarar autoridad dentro del mismo gate de medición.

Patrón reusable de continuidad visual:

- una sola candidata acumulativa;
- baseline aceptada más HEAD incremental;
- manifiesto de archivos por roots;
- digest de rutas, contenido e `index.html`;
- prohibición de shells reducidos o paralelos;
- evidencia por módulo antes de sustituir o retirar una versión;
- aprobación humana separada del smoke automatizado.

### ACADEMIA_ACTUALIZAR

Incluir:

- diferencia entre defecto funcional y `DATA_CONTRACT_FAILURE`;
- doble ruta física;
- comparación por IDs, digests y esquema;
- trazabilidad antes de declarar autoridad;
- dry-run antes de migrar o adaptar;
- continuidad visual acumulativa y no fragmentación.

### BACKEND_PROTEGIDO_NO_CLAUDE

No enviar:

- implementación del verificador Firestore;
- nombres de proyecto o tenant;
- rutas concretas del entorno A&S;
- service accounts, secrets o workflows de ejecución;
- conteos que permitan reconstruir datos reales fuera de evidencia sanitizada;
- decisiones futuras sobre migración real.

### TENANT_AYS_ONLY

Los resultados concretos de reconciliación, conteos por colección y decisión futura de ruta pertenecen a A&S. El patrón es reusable; los datos y la resolución no lo son.

## Estado

```text
patrón documentado: sí
evidencia sanitizada: sí
autoridad declarada: no
migración autorizada: no
visualización autorizada: no
```
