# Autorización read-only — Planillas y Comisiones

Fecha y hora: 2026-08-01 14:21 -06:00  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5`, debe permanecer draft/open  
Estado: `READONLY_AUTHORIZATION_CONSUMED`

## Alcance expresamente autorizado

Paula Osorio autorizó recibir y verificar las fuentes vigentes, procesarlas en paquete privado read-only, ejecutar adaptadores y resolvers desconectados, cruzar las fuentes con pólizas y recibos de LAB y generar dry-runs sanitizados, sin escrituras operativas.

## Resultado consumido

```text
fuentes recibidas: 19
filas observadas: 67
candidatas CRM: 65
identidades de póliza resueltas: 49
HOLD de identidad de póliza: 16
relaciones con recibo resueltas: 5
HOLD de recibo: 44
comisiones A&S candidatas: 5
documentos propuestos: 15
HOLD de liquidación de vendedor: 3
escrituras: 0
finanzas activadas: no
```

Evidencia principal:

```text
policy identity run: 30719208561
receipt link run: 30719464732
commission planner static run: 30719949803
commission dry-run live run: 30720089823
```

La autorización read-only quedó consumida y el lifecycle cerró en:

```text
PLANILLAS_COMMISSION_DRYRUN_CLOSED
```

## No autorizado

Esta autorización no permite:

- escribir registros de comisión;
- crear `finmovs`;
- modificar cobros, recibos, pólizas, cartera o clientes;
- crear facturas, CxC o CxP;
- liquidar asesores;
- inferir tasas de comisión;
- aplicar el porcentaje 50% por defecto;
- reutilizar planillas de otro periodo;
- usar la fecha de pago de la comisión para escoger póliza o recibo;
- conectar los resolvers a UI o a la colección genérica `comisiones`;
- ejecutar navegador, deploy, Functions, Rules, Storage o producción;
- modificar `main`, hacer merge o cerrar el PR.

## Resultado exacto para una futura autorización

```text
candidatos: 5
colecciones: 3
documentos exactos: 15
planillasComisiones: 5
comisionesDevengadas: 5
conciliacionesComisiones: 5
colecciones actualmente vacías: sí
```

Sellos:

```text
candidateSetDigest: 04c7da071ddadfe689e0137e730448ada36abe7aff6c228cd5abb0206c26c680
targetSnapshotDigest: 12b3763f976433e1e7e809f461dc835bca3a4c39b1d6dd1655e42a202e6cbf3f
```

Una escritura futura requiere autorización separada y deberá ser atómica, idempotente, post-verificada y reversible. Los tres HOLD de vendedor deben conservar `liquidacionAsesorAutorizada: false`; los 60 registros sin recibo inequívoco permanecen excluidos.
