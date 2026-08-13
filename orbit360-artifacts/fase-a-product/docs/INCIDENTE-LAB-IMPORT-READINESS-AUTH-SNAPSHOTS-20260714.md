# Incidente LAB — sesión visible sin readiness del importador

Fecha: 2026-07-14

## Contexto

- Proyecto: Orbit 360 A&S.
- Rama: `ays/backend-tenant-lab-v99-20260703`.
- PR #5 draft/open.
- Carril: C con guardas B.
- Entorno: Firebase LAB preview, no producción.

## Evidencia

Después de autenticar, el chrome mostraba `Usuario entorno de validación`, pero el modal de carga inicial respondía `Dry-run no disponible: Inicia sesión.`

No se ejecutó escritura.

## Causa raíz

La sesión Firebase ya estaba visible para la capa de autenticación, pero el importador dependía exclusivamente de `Orbit.store._labStatus().auth`. Existía una carrera entre:

1. restauración de Firebase Auth;
2. actualización del estado del store;
3. desmontaje/reconexión de listeners Firestore;
4. disponibilidad de `snapshotAttached`.

El handler del dry-run evaluaba el estado de forma inmediata y podía recibir `auth: null` aunque el usuario canónico ya estuviera autenticado.

## Corrección

Archivo nuevo:

```txt
orbit360-platform/core/backend-lab-import-readiness-guard.js
```

Integración:

```txt
orbit360-platform/core/backend-lab-init.js
```

El guard:

- valida correo y UID canónicos directamente contra Firebase Auth;
- nunca acepta una sesión demo ni otro usuario;
- sincroniza el contrato de estado de `Orbit.store` y `OrbitBackend`;
- rearma listeners mediante `_detachSnapshots` y `_attachSnapshots`;
- espera hasta 15 segundos por `snapshotAttached`;
- intercepta dry-run, escritura y rollback antes del handler operativo;
- conserva los gates originales del importador;
- no contiene datos reales, contraseña ni secretos.

Prueba añadida:

```txt
tools/orbit360-test-lab-import-readiness.mjs
```

## Seguridad

- No producción.
- No main.
- No modificación de reglas.
- No payload versionado.
- No bypass de Auth.
- No escritura automática.
- La confirmación humana continúa siendo obligatoria.

## Academia y Claude

Aplica como patrón reusable: la interfaz no debe representar una sesión como operativa hasta que autenticación, membresía y fuente de datos estén listas. Los botones de importación deben mostrar un estado de sincronización y esperar readiness, sin exponer nombres técnicos al usuario final.

No se comparte con Claude código Firebase, UID, secretos ni lógica protegida.

## Estado

Fix aplicado. Pendiente redeploy automático y repetición exclusiva del dry-run con el mismo JSON sanitizado.
