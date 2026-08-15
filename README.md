# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
3. último workflow/evidencia indicado por `lastEvidence`;
4. `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`;
5. `orbit360-platform/docs/CIERRE-R4-VALIDATOR-STALE-AUTH-PASS-ACCESS-FILTER-ROOTFIX-20260815.md`;
6. `orbit360-platform/CHANGELOG-R4-GOLIVE-20260814.md`.

No usar memoria ni documentación histórica como sustituto del live-state.

## Estado vivo · R4 PUBLICADO / AUTH PASS / ACCESS FILTER ROOTFIX SOURCE PASS · 2026-08-15

```text
R1/R2/R3 histórico: CERRADOS
app.aysseguros.com: PUBLICADO con el ZIP R3 certificado exacto
ZIP R3 publicado: INMUTABLE / sin rebuild / sin parche in-place
HostDime: NO es blocker demostrado
smoke antiguo /core/auth.js: VALIDATOR_STALE
Auth productivo real: PASS
emailVerified: PASS
membership/tenant/roles requeridos: PASS
runtime/router/tenant-context/store read-only: PASS
clientes: 430 PASS
aseguradoras: 30 PASS
legal gate: observado read-only, sin persistir aceptación
causa raíz vigente: rendimiento de Orbit.access.filter()
medición producción: filter(430, scope=all) = 38.27 s
rootfix source: df4c217c34722c03215f88b62f6865ab41c2a9f3
postapply source: PASS
store.get Direction 430: 1720 -> 4, mismo resultado 430/430
browser R4: CONGELADO SOURCE-ONLY
avance: 100% funcional / 75% técnico / 67% gates
```

## Diagnóstico corregido

El paquete durable R3 original demostró que el entrypoint productivo certificado usa `core/auth-product-runtime-p0.js`; `core/auth.js`, `core/auth-password-change-v20260805.js` y `core/user-credential-selfservice-v20260805.js` no forman parte del ZIP productivo. Por tanto, las conclusiones que trataban el HTTP 500 de esos assets excluidos como bloqueo de Auth/HostDime quedan **superadas**.

La frontera corregida contra el contrato productivo real demostró login HTTP 200, usuario autenticado, `emailVerified`, membership activa, tenant correcto, roles requeridos, runtime iniciado, router iniciado y store `ready-read-only`, con cero escrituras.

## Causa raíz real y fix

La medición aislada del rol Dirección mostró:

- `Orbit.session.set('Dirección')`: ~5.9 s;
- `hashchange`: ~0.1 ms;
- `Inicio.render`: no fue la causa;
- `Orbit.access.filter('clientes', 430, 'cliente360')`: ~38.27 s.

La causa fue recomputar contexto invariante de acceso por cada registro. `actorAdvisor()` volvía a resolver asesor y el store productivo implementa `get()` sobre `all()`, que clona la colección antes de buscar.

El commit funcional `df4c217c34722c03215f88b62f6865ab41c2a9f3` modifica únicamente `orbit360-platform/core/access-scope.js`: resuelve rol/módulo/país/scope una vez por filtro y usa fast-path para `scope=all`; `canView()`, `canAccessRecord()` y la API pública permanecen intactos.

Regresión y post-aplicación:

- Dirección 430: 430 registros antes y después;
- `store.get()` 1720 -> 4;
- Asesor own: 144;
- Operativo team: 287;
- país restringido, módulo denegado y colección sensible: equivalencia PASS;
- sintaxis PASS;
- cero browser/secrets/data/deploy/rebuild en la validación source-only.

## Siguiente acción exacta

El ZIP R3 publicado **no contiene todavía este rootfix** y no debe modificarse en sitio. La siguiente acción requiere autorización explícita para generar una sucesora mínima e inmutable del R3 cuyo único delta de producto sea `core/access-scope.js` desde `df4c217c34722c03215f88b62f6865ab41c2a9f3`.

La sucesora debe demostrar byte-identidad de todos los demás archivos frente a R3, regenerar manifest/hashes y pasar gates source/static antes de cualquier publicación. Publicación y browser final continúan sin autorización en este momento.

No cambiar contraseña, usuarios, memberships, Auth, datos, main ni merge. No abrir caso HostDime por el diagnóstico anterior.
