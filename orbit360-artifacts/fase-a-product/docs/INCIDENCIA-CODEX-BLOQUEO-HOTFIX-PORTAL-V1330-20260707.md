# Incidencia Codex — bloqueo antes de commit hotfix portal v1330 — 2026-07-07

## Estado reportado por Paula/Codex

Codex ejecutó el prompt:

```txt
orbit360-platform/docs/PROMPT-CODEX-HOTFIX-PORTAL-SINIESTROS-AUTOMATIZACIONES-PLANTILLAS-V1330-20260707.md
```

pero quedó bloqueado antes del commit por el sistema de aprobaciones/uso al intentar `git add`.

## Worktree local reportado

```txt
C:\Users\paula\OneDrive\Documentos\GitHub\orbit360-core\_codex_hotfix_portal_v1330
```

## Estado remoto

```txt
Sin commit SHA del hotfix.
Sin push del hotfix.
Sin merge.
Sin deploy.
Main no tocado.
```

El PR #5 permanece con el último commit remoto anterior al hotfix local bloqueado.

## Archivos cambiados localmente por Codex, no empujados

```txt
orbit360-platform/modules/portal.js
orbit360-platform/modules/siniestros.js
orbit360-platform/modules/automatizaciones.js
orbit360-platform/modules/plantillas.js
orbit360-platform/docs/HOTFIX-PORTAL-SINIESTROS-AUTOMATIZACIONES-PLANTILLAS-V1330-20260707.md
```

## Cambios reportados

Resumen de cambios locales reportado por Codex:

```txt
+119 líneas
-28 líneas
```

## Validaciones reportadas por Codex

```txt
node --check orbit360-platform/modules/portal.js: OK
node --check orbit360-platform/modules/siniestros.js: OK
node --check orbit360-platform/modules/automatizaciones.js: OK
node --check orbit360-platform/modules/plantillas.js: OK
node tools/orbit360-validar-backend-lab-contrato.mjs: OK, 0 errores, 1 warning esperado del guard LAB en index
Búsqueda equivalente con Select-String/rg: sin coincidencias problemáticas
```

## Protegidos

Codex reportó:

```txt
No se tocaron protegidos.
```

Archivos protegidos que deben mantenerse intactos:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
tools/orbit360-*
```

## Decisión operativa

El hotfix NO se considera aplicado en GitHub hasta que exista commit SHA remoto.

Para aplicar sin pérdida:

1. Retomar el mismo worktree local cuando Codex tenga capacidad o aprobación.
2. Crear commit con los 5 archivos reportados.
3. Hacer push a:

```txt
ays/backend-tenant-lab-v99-20260703
```

4. Entregar commit SHA.
5. ChatGPT verificará en GitHub y documentará cierre.

## Alternativa segura si Codex no puede retomar

Si se entrega el diff completo de los 5 archivos, ChatGPT puede evaluar aplicar el hotfix por GitHub. Sin diff completo, no se debe reconstruir manualmente el cambio porque `portal.js` y `siniestros.js` son sensibles y es más seguro conservar el trabajo local validado por Codex.

## Impacto Claude / prototipo reutilizable

Aplica a Claude/prototipo: Sí.

Patrones a conservar cuando el hotfix quede aplicado:

```txt
Portal: reportar pago no aplica pago.
Portal: documento subido registra soporte/revisión, no carga real sin Storage/backend.
Siniestros: reclamado ≠ aprobado ≠ pagado.
Automatizaciones: preparado/registrado ≠ enviado por proveedor.
Plantillas: WhatsApp Web abierto ≠ mensaje entregado.
```

Academia impactada:

```txt
Portal del cliente
Siniestros
Automatizaciones
Plantillas y comunicaciones
Estados honestos de integración
```

## Estado

```txt
Incidencia documentada.
Hotfix pendiente de commit remoto.
No bloquea continuar auditorías, pero debe resolverse antes de demo ejecutiva o producción.
```
