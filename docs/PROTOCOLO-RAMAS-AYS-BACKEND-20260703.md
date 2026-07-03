# Protocolo de ramas — A&S backend / Orbit 360

**Fecha:** 2026-07-03  
**Repo:** `paulaosoriof86/orbit360-core`  
**Rama de continuidad A&S/backend:** `ays/backend-tenant-continuidad-20260703`  
**Estado:** activo desde este documento.

## 1. Corrección operativa

Se registraron documentos iniciales en `main`. Desde este punto, la continuidad de backend A&S debe hacerse en la rama específica:

```txt
ays/backend-tenant-continuidad-20260703
```

Esta rama se creó para separar el trabajo de A&S como primer tenant y evitar mezclarlo con ramas de prototipo/frontend Claude.

## 2. Regla obligatoria

No usar ramas de prototipo para backend A&S.

- Ramas de prototipo/Claude: UX, módulos, frontend, ZIPs, mejoras visuales.
- Rama A&S/backend: contrato de datos, Firestore LAB, tenant, Auth, migración, integraciones, bitácoras backend.

## 3. Qué se documenta también para Claude

Aunque el backend avance en esta rama, todo hallazgo que afecte el prototipo debe quedar en backlog Claude:

- ajustes UI necesarios;
- cambios locales de lógica que Claude debe replicar;
- contradicciones documentales;
- reglas core que el frontend debe respetar;
- pendientes de importador/PWA/comisiones/finanzas.

## 4. Regla para siguientes actualizaciones

Toda actualización posterior de A&S/backend debe indicar explícitamente:

- rama usada;
- archivos cambiados;
- si toca backend, frontend o solo documentación;
- si aplica a Claude/prototipo;
- si aplica a core multi-tenant;
- si aplica solo a A&S.

## 5. Estado

**Activo:** sí.  
**Rama vigente para continuar:** `ays/backend-tenant-continuidad-20260703`.  
**No usar para continuidad A&S/backend:** ramas de prototipo o Claude.
