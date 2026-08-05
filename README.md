# orbit360-core

Repositorio de Orbit 360.

La continuidad operativa vigente de A&S se rige por:

1. `orbit360-platform/docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md`;
2. `orbit360-platform/docs/PLAN-UNICO-SALIDA-RC-AYS-LAB-CANONICA-01-20260804.md`;
3. `orbit360-platform/runtime-gate-crm-v20260716/rc-ays-lab-canonica-01-ledger-v20260804.json`;
4. `orbit360-platform/docs/CIERRE-MICROBLOQUE-2-5-STOP-VISUAL-LEGAL-MODAL-PREVIEW-RETENIDO-20260805.md`;
5. `orbit360-platform/runtime-gate-crm-v20260716/rc-ays-lab-canonica-01-microblock25-preview-retained-visual-review-stop-v20260805.json`;
6. `orbit360-platform/docs/ESTADO-ACTIVO-MICROBLOQUE-2-6-CAPTURA-LEGAL-READINESS-20260805.md`;
7. estado vivo del PR #5.

RC activa:

```text
RC-AYS-LAB-CANONICA-01
```

Gates cerrados:

```text
PASS_PLAN_PERSISTED
PASS_CANONICAL_BASELINE
PASS_ISOLATED_ROUTE_HARNESS
PASS_CANONICAL_PREFLIGHT_COMPOSITION
PASS_REQUEST_V4_PROVENANCE_COMPOSITION
```

Evidencia preservada:

```text
runtime funcional: 30962756387 · 18/18 PASS
rutas aisladas: 30971707956 · 8/8 PASS
composición canónica: 30977179448 · 31/31 PASS
inner preflight canónico: 32/32 PASS
request v4 + provenance: 30979519198 · 33/33 PASS
```

Microbloque 2.5:

```text
run: 31005103975
preflight: 32/32 PASS
Functions: 4/4
Hosting preview: retenido
integridad: PASS
snapshot before/after: idénticos
workflow técnico: GO_LAB_CANDIDATE_VISIBLE
revisión visual final: STOP_VISUAL_EVIDENCE_PREVIEW_RETAINED
```

URL LAB retenida:

```text
https://ays-orbit-360-lab--orbit360-operational-block12-w8ibrr6w.web.app
```

Las ocho capturas mostraron `Acuerdos legales` y no el contenido de las rutas. Esto es un fallo del mecanismo de captura, no una regresión funcional demostrada. El root fix de detección de overlays quedó en:

```text
6c443d0f40e6874675f8c1980ef0cdb353120031
```

Estado activo:

```text
Microbloque 2.6
Gate: PASS_LEGAL_READINESS_CAPTURE_CONTRACT
Estado: PENDING_SOURCE_ONLY_AUTHORIZATION
```

La siguiente acción es exclusivamente source-only. Debe preservar la URL, las cuatro Functions y el Hosting existentes. No se redepliega, no se ejecuta navegador, Firebase, Rules, reimportación, producción, main, merge ni la batería funcional 18/18.

Los requests runtime v3, source-only v4 y runtime v4 están consumidos e inmutables. No usar memoria, conversaciones o estados históricos para sustituir el ledger vivo.
