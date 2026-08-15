# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
3. último workflow/evidencia indicado por `lastEvidence`;
4. `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`;
5. `orbit360-platform/docs/CIERRE-R4-HARNESS-SOURCE-ONLY-ROOTFIX-PASS-20260815.md`;
6. `orbit360-platform/CHANGELOG-R4-GOLIVE-20260814.md`.

No usar memoria ni documentación histórica como sustituto del live-state.

## Estado vivo · R4 PUBLICADO / HARNESS RECUPERADO SOURCE-ONLY · 2026-08-15

```text
R1/R2/R3: CERRADOS
app.aysseguros.com: PUBLICADO, login visible
paquete: exacto R3 certificado, sin rebuild
R4 browser frontier #1: no válida por timeout del harness
rootfix harness source-only: PASS
Auth/product defect: todavía NO CLASIFICADOS
workflow R4 browser: continúa congelado source-only
avance: 100% funcional / 75% técnico / 67% gates
```

## Recuperación del harness cerrada

Rootfix control-plane: `442ca5fc5a6ca6f70e7607daaa108ee0b84d8956`.

Run source-only `31907519696`, job `95067552998`: **SUCCESS**.

- gate canónico PASS;
- `node --check` PASS;
- watchdog sintético forced-hang PASS;
- timeout sintético observado a 120 ms;
- evidencia incremental existía antes del timeout;
- deadline global del harness: 480000 ms, inferior al timeout del job;
- comparación SHA-256 de `core/auth.js` publicada contra source R3 incorporada antes de diagnóstico de credencial;
- instalación skipped;
- secretos skipped;
- identity resolver skipped;
- browser skipped;
- datos/Firestore: no acceso;
- writes: 0;
- producción: no tocada por esta recuperación.

Artifact: `9252752191`.

La causa de la primera corrida queda corregida a nivel mecanismo. Esto **no** convierte el fallo humano de login en contraseña incorrecta ni en PASS de Auth: todavía falta una frontera automatizada válida que lo clasifique.

## Siguiente acción exacta

En la **siguiente iteración**, mantener el harness recuperado sin cambios y activar exactamente **una** segunda frontera productiva read-only R4. Debe verificar primero manifest + hash de `core/auth.js`, y después aislar login HTTP → Auth → `emailVerified` → membership → tenant → runtime → roles/scopes/rutas.

Ante el primer fallo clasificado se detiene. No modificar Auth, usuarios, memberships, producto, paquete ni datos por intuición.

No reconstrucción, no reimportación, no main, no merge.
