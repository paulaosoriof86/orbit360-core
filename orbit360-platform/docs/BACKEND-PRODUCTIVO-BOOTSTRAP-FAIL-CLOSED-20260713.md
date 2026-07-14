# Backend productivo — bootstrap fail-closed

Fecha: 2026-07-13  
Carril: B — backend, Auth, seguridad y `Orbit.store`  
Estado: contrato de readiness implementado; conexión productiva no ejecutada

## Propósito

Evitar que Orbit 360 entre en un estado aparentemente operativo usando silenciosamente demo, LAB, seed o `localStorage` cuando el backend productivo no está listo.

## Contrato implementado

```txt
core/backend-product-readiness-contract-p0.js
```

El contrato valida, sin conectarse ni escribir:

- modo explícito `product`;
- tenant canónico;
- referencia de configuración de entorno;
- presencia de los campos públicos mínimos de Firebase;
- usuario autenticado y correo verificado;
- membresía activa del mismo UID y tenant;
- rol activo incluido en `roles[]`;
- adapter con API completa de `Orbit.store`;
- metadata `mode=product` y `noFallback=true`;
- contratos de rutas y acceso declarados;
- ausencia de identidades, rutas y marcadores demo/LAB;
- ausencia de secretos dentro del reporte de readiness.

## Resultado permitido

```txt
ready   -> puede iniciarse un smoke read-only
blocked -> login/datos/escrituras/deploy permanecen bloqueados
```

Incluso en `ready`, el contrato mantiene:

```txt
writeAuthorized: false
writeDisabledUntilSmoke: true
```

## Bootstrap planificado

1. Instalar adapter productivo compatible con `Orbit.store`.
2. Adjuntar observador Auth.
3. Resolver membresía del tenant.
4. Activar rol y política de scopes.
5. Adjuntar snapshots filtrados por scope/país.
6. Ejecutar smoke read-only.
7. Solo después habilitar planes de escritura controlada.

El contrato no ejecuta ninguno de estos pasos.

## Bloqueos que provocan fallo cerrado

- modo demo o `firestore-lab`;
- correo o identidad demo;
- configuración de entorno ausente;
- membresía suspendida/inactiva;
- rol activo no asignado;
- tenant de Auth/membresía/store inconsistente;
- API incompleta de `Orbit.store`;
- adapter con fallback;
- fuente LAB/localStorage/seed;
- secreto incluido en el objeto de preflight;
- contratos de rutas/acceso ausentes.

## Dependencia externa pendiente

La conexión real requiere que el entorno disponga de un proyecto productivo autorizado, Auth, Firestore, Hosting y referencias de secretos. Ningún valor secreto debe entrar al repositorio, chat, documentos ni reportes.

## ¿Aplica a Claude/prototipo?

Sí, únicamente como estados UX:

```txt
Acceso pendiente de activación
Conexión segura pendiente
No se pudo verificar la membresía
Vista no disponible para este rol
Servicio temporalmente no disponible
```

No debe mostrar nombres técnicos, rutas, Firebase, Firestore, LAB, fallback o secretos.
