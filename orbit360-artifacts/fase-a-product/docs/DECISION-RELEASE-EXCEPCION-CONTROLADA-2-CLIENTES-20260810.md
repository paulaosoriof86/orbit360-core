# DECISIÓN DE RELEASE — EXCEPCIÓN CONTROLADA DE PROCEDENCIA PARA 2 CLIENTES

Fecha: 2026-08-10 18:25 GT
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Gate único: `block1-client360-insurers-lab-v20260717`
Contrato vivo: `1.0.41`

## Decisión

Se adopta `GO_PRODUCTION_PATH_WITH_2_CONTROLLED_CLIENT_PROVENANCE_EXCEPTIONS`.

La procedencia todavía no adjudicada de exactamente dos clientes deja de ser bloqueante por sí sola para la ruta de producción. No se declara que los registros sean correctos o incorrectos y no se altera el contrato para fabricar un PASS.

## Evidencia que sustenta la decisión

- Baseline contractual: 414 clientes / 26 aseguradoras / 7 asesores.
- Universo raw observado históricamente: 430 / 30 / 7.
- De 16 clientes post-cierre investigados, 14 quedaron reconciliados contra el conjunto retained26.
- Permanecen dos fingerprints sanitizados sin adjudicación final: `43a8841d19f7fec03ad6` y `a96956c63fdf22d44cfe`.
- La auditoría forense posterior encontró que v28 no leyó los campos reales de actor que `Orbit.store` ya escribía históricamente (`ownerUid`, `ownerEmail`, `updatedByUid`, `updatedByEmail`). Por tanto, la ausencia de actor/procedencia no quedó completamente demostrada y la clasificación previa no puede tratarse como prueba de corrupción.

## Tratamiento de release

Los dos clientes:

- no se borran;
- no se ocultan;
- no se fusionan;
- no se reimportan;
- no se modifican;
- no se declaran legítimos por inferencia;
- conservan todas sus relaciones existentes.

El contrato 414/26/7 permanece sin cambio. La excepción aplica únicamente al carácter bloqueante de su procedencia pendiente.

## Única condición antes de continuar

Ejecutar una comprobación read-only que:

1. localice exactamente ambos clientes por fingerprint en memoria;
2. confirme que ambos documentos existen;
3. cuantifique relaciones por `clienteId` en Pólizas, Vehículos, Recibos Esperados, Cartera de Primas y Cobros;
4. persista únicamente fingerprints y conteos, nunca IDs ni PII;
5. realice cero escrituras, cero Auth reads, cero Logging/IAM, cero Hosting/browser/deploy.

La presencia de relaciones no bloquea release porque los clientes y sus relaciones permanecen intactos. Solo debe detenerse este macrobloque si alguno de los dos clientes no existe o si la comprobación no puede completarse dentro del contrato read-only.

## Resultado esperado

Con PASS de impacto:

`RELEASE_UNIVERSE_ACCEPTED_WITH_2_CLIENT_PROVENANCE_EXCEPTIONS`

Después corresponde retomar el universe/release gate sin volver a exigir adjudicación de procedencia 16/16 y continuar a la matriz visual final de Block 1.

## Pendiente post-go-live

Owner: `DATA_MIGRATION_TRACEABILITY_CLIENT_CREATION_PROVENANCE`.

Resolver la procedencia exacta de los dos registros utilizando el schema real de actor de `Orbit.store` y/o evidencia autoritativa disponible, sin reimportación ni inferencia.
