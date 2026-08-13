# M5 5.0.7 — Cierre Hosting LAB RC b25bf275 · paridad 25/25

Fecha: 2026-07-29 UTC / 2026-07-28 Guatemala  
Gate: `block5-release-candidate-visualization-v20260728`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 `draft/open`

## Bloque

Entrega controlada de la release candidate:

```txt
b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091
```

al canal Hosting LAB `orbit360-ays-lab`, seguida de verificación pública hash por hash de 25 activos.

## Carriles

- **A — frontend/UX/Academia:** publicados preview, addendum Academia y owner de contenido estático.
- **B — backend/seguridad:** preflight antes de identidad; Hosting-only; loader/store LAB, Firestore, Functions y Rules sin cambios.
- **C — datos reales:** sin lectura ni escritura. Baseline 414 clientes, 26 aseguradoras, 7 asesores y destino canónico 1/1/414/26 preservado.

## Avance visible

1. Package check 5.0.7 aprobado sin secretos ni deploy.
2. Solicitud inmutable ligada al SHA padre exacto.
3. Identidad LAB resuelta únicamente después del preflight.
4. Hosting LAB publicado una sola vez.
5. El cierre automático posterior falló por dependencia efímera del validador; no se repitió el deploy.
6. Se corrigió el mecanismo de evidencia y se ejecutó una recuperación pública sin secretos ni Firebase CLI.
7. Paridad final: 25/25, cero diferencias.

## Evidencia

### Package check

```txt
Commit: 4aa996d37b413a59b48135a728edffa3fd547dd6
Run: 30417610407
Job: 90467411035
Artifact: 8710708337
Digest: sha256:4c861ebebcedb84bee5a31a797845b9edb2a5df15fd935fb945f992ed09a4307
```

### Entrega Hosting LAB

```txt
Authorized base: c43b7d88bd709d15e51c558af903a1f3de1af8bd
Request commit: 98c28c188f00141476044628ca9a4a1d0ef6c43a
Run: 30417743516
Job: 90467807470
Artifact: 8710762943
Digest: sha256:eca16e06d89a9accb29c98a7d36ed2719bac869fab451f87165c81e0da845669
Preflight: 24/24
Contrato: 35/35
Hosting deploy executions: 1
```

### Recuperación de paridad pública

```txt
Commit: ba891fd1e7a534be437527e8b5b3de7dd8116666
Run: 30418258733
Job: 90469348278
Artifact: 8710924084
Digest: sha256:accbc8ea34cabe7daf657b1ae2dd7968d76b9d2805c2a03200a6ad04e45d80cf
Contrato de recuperación: 20/20
Activos críticos: 42/42
Activos públicos: 25/25
Mismatches: 0
Remote parity: true
Redeploy: no
```

## Incidentes metodológicos controlados

### 1. Package inicial antes del router 5.0.7

- Clasificación: `PIPELINE_MECHANISM_FAILURE`.
- Causa: el workflow se creó antes de que el router canónico cambiara de 5.0.6 a 5.0.7.
- Resultado: preflight falló; secretos y deploy no se ejecutaron.

### 2. Revalidación posterior al deploy

- Clasificación: `PIPELINE_MECHANISM_FAILURE`.
- Causa: `m5-release-candidate-readiness` exigía un fixture efímero generado por otro workflow.
- Resultado: el deploy ya había concluido; la validación falló antes de consultar los 25 activos.
- Corrección: el validador usa el cierre durable 5.0.6 y solo consume el fixture efímero cuando existe.
- Redeploy: no requerido y no ejecutado.

### 3. Contrato inicial de recuperación

- Clasificación: `PIPELINE_MECHANISM_FAILURE`.
- Causa: una búsqueda literal confundió un campo sanitizado `secrets:false` con una referencia real a GitHub Secrets.
- Resultado: el contrato falló antes de consultar LAB.
- Corrección: detección específica de `${{ secrets.* }}`.

Ninguno de estos incidentes fue un defecto del producto ni una falla de Hosting.

## Alcance final

```txt
Hosting deploy executions: 1
Redeploy executions: 0
Firestore reads/writes: 0/0
Operational writes: 0
Client/insurer/config/membership writes: 0
Runtime/browser: no/no
Functions/Rules: no/no
Production/main/merge: no/no/no
Pólizas: no
```

## Estado

`M5_LAB_HOSTING_DELIVERED_AND_25_OF_25_VERIFIED`.

La autorización Hosting y la recuperación de paridad están consumidas. La RC está lista técnicamente para solicitar un nuevo runtime smoke, pero ese runtime no está autorizado.

## Acumulado Claude

- Política reusable de contenido estático de Academia: `REPLICABLE_CLAUDE_ACUMULADO`.
- Separación revisión visual/PWA vs runtime backend: `REPLICABLE_CLAUDE_ACUMULADO`.
- Gates, workflows, identidad Firebase y evidencia de ejecución: `BACKEND_PROTEGIDO_NO_CLAUDE`.
- No se comparten secretos, datos reales ni artefactos con identificadores sensibles.

## Impacto Academia

La Academia debe conservar estas enseñanzas:

1. contenido estático no equivale a mutación durable;
2. progreso y certificaciones sí requieren persistencia explícita;
3. un status rojo posterior al deploy no prueba una falla del producto;
4. antes de reintentar se identifica la etapa exacta y la causa raíz;
5. entrega Hosting, paridad pública, runtime smoke y revisión visual son gates separados.

No se modifica otra vez el activo productivo de Academia después de cerrar la RC; esta actualización queda documentada para la siguiente revisión acumulada.

## Pendiente

- Runtime smoke LAB: no autorizado.
- Revisión visual: no autorizada.
- Pólizas: bloqueado hasta solicitar y recibir su fuente real vigente específica.

## Siguiente acción exacta

Solicitar autorización explícita independiente para **un único runtime smoke LAB** sobre la RC `b25bf275…`, con Firestore read-only cuando el gate lo necesite, cero escrituras, cero deploy y cero producción. Solo después de evidencia sanitizada `ok:true` podrá habilitarse la revisión visual única.
