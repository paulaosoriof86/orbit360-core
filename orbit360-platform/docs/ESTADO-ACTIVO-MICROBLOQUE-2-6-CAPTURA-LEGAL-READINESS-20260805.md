# ESTADO ACTIVO — MICROBLOQUE 2.6

Fecha local: 2026-08-05 06:24 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `PASS_LEGAL_READINESS_CAPTURE_CONTRACT`  
Estado: `PENDING_SOURCE_ONLY_AUTHORIZATION`

## Entrada cerrada

Microbloque 2.5:

```text
run: 31005103975
preflight: 32/32 PASS
Functions: 4/4
Hosting preview: retenido
integridad: PASS
snapshot before/after: idénticos
decisión visual final: STOP_VISUAL_EVIDENCE_PREVIEW_RETAINED
```

URL LAB vigente:

```text
https://ays-orbit-360-lab--orbit360-operational-block12-w8ibrr6w.web.app
```

## Bloqueo activo

Las ocho capturas muestran `Acuerdos legales` en lugar del contenido de cada ruta. La plataforma y la integridad no quedaron invalidadas; quedó invalidada la evidencia visual.

Owner:

```text
tools/orbit360-block12-cumulative-visual-v20260804.mjs
```

## Objetivo único

Preparar y validar en modo source-only un contrato de legal readiness que determine:

1. cuál es el owner canónico del estado legal;
2. cómo comprobar que el acuerdo se presenta una sola vez;
3. cómo evitar hardcode de usuarios, tenant o aceptación;
4. cómo preparar una identidad visual lista sin escribir en tenant real ni Auth;
5. cómo detectar overlays bloqueantes antes de aceptar una captura;
6. cómo reutilizar la URL retenida;
7. cómo limitar la siguiente ejecución a recaptura de navegador;
8. cómo impedir redeploy de Functions y Hosting.

## Frontera del Microbloque 2.6

```text
runtime: no
secretos: no
Firebase: no
Firestore read/write: no
Auth read/write: no
Functions: no
Hosting: no
navegador: no
deploy: no
Rules: no
reimportación: no
producción/main/merge: no
repetición 18/18: no
```

## Inmutables

- request runtime v3;
- request source-only v4;
- request runtime v4;
- run `31005103975`;
- artefacto `8930082733`;
- URL LAB retenida;
- candidata y baseline funcional.

## Siguiente acción exacta

Recibir autorización source-only para preparar y ejecutar una sola validación del contrato `PASS_LEGAL_READINESS_CAPTURE_CONTRACT`. Ante fallo, aplicar STOP_RETRY sin navegador, Firebase o deploy.
