# Registro — runner único hotfixes P0 v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Ya existen cuatro scripts P0 preparados para el empalme seguro post-candidata Claude v1330:

```txt
APLICAR-HOTFIX-P0-COBROS-CONCILIACIONES-V1330.mjs
APLICAR-HOTFIX-P0-PORTAL-V1330.mjs
APLICAR-HOTFIX-P0-CONFIG-EQUIPO-V1330.mjs
APLICAR-HOTFIX-P0-ACADEMIA-POST-V1330.mjs
```

Paula pidió avanzar con agilidad y mínima manualidad. Por eso se creó un runner único.

## Bloque trabajado

Se creó:

```txt
orbit360-platform/docs/scripts/APLICAR-HOTFIXES-P0-V1330-RUNNER.mjs
```

## Archivos agregados

```txt
orbit360-platform/docs/scripts/APLICAR-HOTFIXES-P0-V1330-RUNNER.mjs
orbit360-platform/docs/RUNBOOK-RUNNER-HOTFIXES-P0-V1330-20260708.md
orbit360-platform/docs/REGISTRO-RUNNER-HOTFIXES-P0-V1330-20260708.md
```

## Qué consolida

### Hotfix Cobros + Conciliaciones

- No base64/factData/readAsDataURL.
- Motivo obligatorio.
- País/moneda obligatorio.
- M5 validada no aplicada.
- Anular con confirmación reforzada.

### Hotfix Portal

- Soporte de pago metadata-only.
- Documento vinculado al cobro.
- Fecha dinámica.
- Historial cliente.

### Hotfix Config + Equipo

- No key/token en frontend/store.
- `credentialRef/backend_required`.
- Motivo en plan/módulos/integraciones.
- Motivo en usuarios/roles/permisos.
- Bloqueo de último administrador.

### Hotfix Academia

- Roles/permisos/auditoría segura.
- Continuidad de cambios locales post-Claude.
- `CONTENT_V` incrementado.

## Validaciones del runner

El runner valida:

- rama correcta;
- scripts existentes;
- ejecución en orden;
- `node --check` de seis archivos;
- patrones prohibidos;
- protegidos sin cambios;
- runner agrupado si existe.

## Restricciones cumplidas

- No merge.
- No deploy.
- No main.
- No producción.
- No datos reales.
- No secretos.
- No Firestore writes.
- No backend protegido.
- No `index.html`.

## ¿Aplica a Claude/prototipo?

Sí.

Instrucción futura para Claude:

- Conservar todos los hotfixes P0 aplicados por este runner.
- No reintroducir base64, key/token ni aplicación automática de pagos.
- Conservar metadata-only y auditoría por rol.
- Conservar Academia post-Claude.

## Estado

Runner único creado. Pendiente ejecución local.