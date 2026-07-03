# Bitacora smoke AYS LAB Auth y permisos

Fecha: 2026-07-03
Rama: ays/backend-tenant-lab-v99-20260703
Estado: Firebase inicializa; bloqueo actual es autenticacion/permisos.

## Resultado observado

El reporte smoke mas reciente muestra:

- backendFirebaseInit: initialized
- firebaseApps: 1
- snapshotAttached: true
- snapshotAttachedCount: 27
- authUser: null
- snapshotErrors: Missing or insufficient permissions en colecciones del tenant

## Lectura tecnica

El problema anterior de configuracion Firebase local quedo superado. Firebase ya inicializa y el SDK esta disponible.

El bloqueo actual ocurre porque no hay usuario autenticado en Firebase Auth durante el smoke. Con authUser null, las reglas del tenant niegan lectura/escritura y Firestore devuelve permisos insuficientes.

## Impacto

No confirma fallo de reglas ni de adapter. Confirma que la siguiente validacion requiere login LAB valido o preparar el usuario LAB autorizado en Firebase Auth y membresia del tenant.

## Pendiente controlado

Validar acceso con el usuario LAB autorizado sin exponer contraseña ni valores sensibles en chats o reportes.

Despues del login, repetir smoke y esperar:

- authUser distinto de null
- snapshotErrors vacio o controlado
- CRUD ficticio en actividades completado
- RESULTADO SMOKE AYS LAB V99: COMPLETADO

## Restricciones respetadas

No deploy, no Hosting, no produccion, no secretos, no datos reales.
