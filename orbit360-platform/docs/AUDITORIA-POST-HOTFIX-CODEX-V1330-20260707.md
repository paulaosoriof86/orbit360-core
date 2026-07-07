# Auditoría post-hotfix Codex v1330 — 2026-07-07

## Estado

```txt
Repo: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge: no
Deploy: no
Main: no tocado
Commit auditado: 65e309b0cd0420a3b790a52baa7e28c3d76ec3b7
```

## Commit auditado

```txt
65e309b0cd0420a3b790a52baa7e28c3d76ec3b7
fix(ays): hotfixes renovaciones credenciales finanzas v1330
```

## Archivos modificados por Codex

```txt
orbit360-platform/modules/renovaciones.js
orbit360-platform/modules/cliente360.js
orbit360-platform/modules/aseguradoras.js
orbit360-platform/modules/finanzas.js
```

## Resultado ejecutivo

Hotfix aplicado correctamente según alcance solicitado.

No se detectó modificación de archivos backend protegidos en el reporte de Codex.

## Validado — Renovaciones

Archivos:

```txt
orbit360-platform/modules/renovaciones.js
orbit360-platform/modules/cliente360.js
```

Resultado:

- Se agregó helper `esRenovable`.
- Renovaciones globales filtra solo:

```txt
Vigente
Por renovar
```

- Cliente360 usa el mismo criterio en resumen por ramo y pestaña Renovaciones.
- Se bloquea propuesta para pólizas no renovables.

Regla preservada:

```txt
Renovación activa ≠ recuperación comercial.
Vencida/Cancelada/Anulada/Rechazada/Requiere validación no entran al pipeline activo de renovación.
```

## Validado — Aseguradoras / credenciales

Archivo:

```txt
orbit360-platform/modules/aseguradoras.js
```

Resultado:

- Se agregó `portalSnapshot()`.
- Ya no se guarda `pass` en `portales`.
- El input de contraseña no precarga valor previo.
- Si se escribe contraseña, se guarda solo:

```txt
credentialRef: backend_required
```

- Los portales quedan con nombre, URL, usuario y referencia segura.

Regla preservada:

```txt
No secretos ni credenciales reales en frontend/store.
```

Pendiente futuro backend:

- Implementar bóveda/secret manager o integración backend segura para credenciales reales.
- En prototipo, mantener estado honesto: “credencial pendiente de bóveda segura”.

## Validado — Finanzas / conciliación bancaria

Archivo:

```txt
orbit360-platform/modules/finanzas.js
```

Resultado:

- `banco()` ya no muestra KPIs hardcodeados `3` y `1`.
- Calcula desde `conciliacionBanco` cuando existe.
- Si no hay importación/fuente, muestra `0` con `pendiente de importación`.

Regla preservada:

```txt
No simular datos productivos o conciliaciones no conectadas.
```

## Validado — producciónNeta

Archivo:

```txt
orbit360-platform/modules/finanzas.js
```

Resultado:

- `produccionNeta()` ahora usa `primaNeta` y no `prima`.

Regla preservada:

```txt
Producción/metas/comisiones se basan en prima neta, no prima total visible.
```

## Validaciones reportadas por Codex

```txt
node --check orbit360-platform/modules/renovaciones.js: OK
node --check orbit360-platform/modules/cliente360.js: OK
node --check orbit360-platform/modules/aseguradoras.js: OK
node --check orbit360-platform/modules/finanzas.js: OK
node tools/orbit360-validar-backend-lab-contrato.mjs: OK, 0 errores, 1 warning esperado del guard LAB en index
```

## Confirmación de protegidos

Codex reportó que no tocó:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-*
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
```

## Pendientes restantes inmediatos

1. Smoke visual/manual cuando corresponda, especialmente:
   - Renovaciones global.
   - Cliente360 > Renovaciones.
   - Aseguradoras > ficha > portales.
   - Finanzas > Conciliación bancaria.
2. Continuar auditoría de módulos restantes.
3. Mantener pendiente futuro de integración Cotizador/Comparativo A&S v110.
4. Mantener documentación para Claude separando:
   - patrones reutilizables Orbit 360;
   - detalles exclusivos de A&S;
   - backend protegido ChatGPT/Codex.

## Estado

```txt
Hotfix Codex post-v1330: aplicado y documentado.
Bloque cerrado salvo smoke visual posterior.
```
