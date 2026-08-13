# Auditoría post-empalme v1330 — 2026-07-07

## Estado

Empalme real de candidata:

```txt
Prototype Development Request - 2026-07-06T182633.902.zip
```

Rama:

```txt
ays/backend-tenant-lab-v99-20260703
```

PR:

```txt
#5 draft/open, sin merge y sin deploy
```

## Validaciones reportadas localmente antes del push

```txt
JS CHECK PASS: 61 archivos
Backend LAB contrato PASS
Protegidos intactos PASS
Commit local de empalme: f5105dd
Commit remoto tras rebase/push: 317f3fb0a36a748d82d42b0d96d30fc9f0533684
```

## Auditoría remota posterior

Comparación remota revisada:

```txt
base: 9eadd12262989e9396da5ab977aa87ad6b61531d
head: 317f3fb0a36a748d82d42b0d96d30fc9f0533684
resultado: ahead_by 1, behind_by 0
```

No se detectó modificación directa en protegidos formales:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-*
orbit360-platform/index.html
```

## Hallazgo crítico corregido

El empalme v1330 sí modificó:

```txt
orbit360-platform/core/auth.js
```

Riesgo detectado:

- La candidata sustituyó la lógica Auth LAB por login demo/local simplificado.
- Eso eliminaba soporte de `?orbitBackend=firestore-lab`, `loginFirebase`, `fbAuth`, `fbUser`, `mapFbUser`, validación de contraseña LAB y listener `onAuthStateChanged`.
- Impacto: podía romper el acceso Firestore/Auth LAB aunque los archivos backend protegidos formales estuvieran intactos.

Corrección aplicada directamente en GitHub:

```txt
commit: 6e23791902fd29a547ae0c488ada8a65b8712576
archivo: orbit360-platform/core/auth.js
acción: restaurado desde baseline remoto previo 9eadd12262989e9396da5ab977aa87ad6b61531d
```

## Estado tras corrección

PR #5 actualizado a:

```txt
head_sha: 6e23791902fd29a547ae0c488ada8a65b8712576
```

Diferencia entre `317f3fb` y `6e2379`:

```txt
solo orbit360-platform/core/auth.js
```

## Pendiente inmediato

Continuar auditoría post-empalme remoto sobre:

- `core/importa.js`
- `core/integraciones*.js`
- `core/comisiones-eng.js`
- `modules/academia.js` y `data/academia-plus.js`
- `modules/cobros.js`
- `modules/comisiones.js`
- `modules/conciliaciones.js`
- `modules/renovaciones.js`
- `modules/polizas.js`
- documentación Claude agregada

Criterios:

- no textos técnicos visibles al cliente;
- no `localStorage` operativo fuera de capas autorizadas;
- no mezcla de monedas;
- no escritura de cartera desde financiero histórico;
- no simulación de backend productivo;
- Academia debe conservar rutas profundas, progreso, evaluaciones y pendientes por rol.
