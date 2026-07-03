# Smoke ejecutable A&S LAB v99

**Fecha:** 2026-07-03  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**Script:** `tools/orbit360-smoke-ays-lab-v99.ps1`  
**Estado:** creado, pendiente ejecución local por Paula cuando se autorice.

## 1. Objetivo

Validar que la base backend LAB A&S funciona sin tocar producción ni depender de una rama equivocada.

El script valida:

- rama obligatoria;
- existencia de archivos LAB;
- reglas Firestore alineadas con adapter LAB;
- sintaxis JS de loader/init/store LAB;
- orden de scripts en `index.html`;
- servidor local temporal;
- Auth/Firebase LAB desde navegador;
- API completa de `Orbit.store`;
- tenant `alianzas-soluciones`;
- CRUD ficticio controlado en colección `actividades`.

## 2. Restricciones

El script NO hace:

- deploy;
- Hosting;
- producción;
- commit;
- push;
- merge;
- subida de secretos;
- carga de datos reales en código.

## 3. Qué escribe

Solo intenta crear/actualizar/eliminar un registro ficticio temporal de smoke en LAB:

```txt
colección: actividades
id: smoke_ays_lab_<timestamp>
tipo: smoke_ays_lab
ficticio: true
```

Esto sirve para validar `insert`, `get`, `update` y `remove` de `Orbit.store`.

## 4. Salida

El script genera reporte en:

```txt
_orbit360_reports/SMOKE-AYS-LAB-V99-<fecha>.txt
```

También:

- copia el reporte al portapapeles;
- abre el reporte en Notepad.

## 5. Criterio de aprobación

Aprobado si el reporte indica:

```txt
RESULTADO SMOKE A&S LAB V99: COMPLETADO
```

Y valida:

- `apiComplete = true`;
- `backendMode = firestore-lab`;
- `backendTenant = alianzas-soluciones`;
- Firebase inicializado;
- usuario LAB autenticado;
- snapshots Firestore activos;
- CRUD ficticio completo.

## 6. Criterio de bloqueo

Bloqueado si:

- rama incorrecta;
- falta config local Firebase;
- Firebase no inicializa;
- usuario LAB no autentica;
- reglas Firestore no permiten ruta del adapter;
- snapshots no se adjuntan;
- CRUD ficticio falla.

## 7. Estado

**Estado:** LISTO PARA EJECUCIÓN LOCAL.  
**Siguiente acción:** cuando Paula autorice/ejecute, pegar o enviar el reporte si Notepad/portapapeles no lo trae automáticamente.
