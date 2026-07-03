# Rama activa obligatoria — A&S Backend / Orbit 360

**Fecha:** 2026-07-03  
**Repo:** `paulaosoriof86/orbit360-core`  
**Estado:** regla obligatoria de continuidad.

## 1. Rama que se debe actualizar

Para cualquier continuidad de backend A&S, migración real, Firestore LAB, tenant A&S, reglas, importadores, Auth LAB, documentación técnica backend o smoke de operación interna, la rama activa obligatoria es:

```txt
ays/backend-tenant-lab-v99-20260703
```

## 2. PR asociado

El PR draft asociado es:

```txt
PR #5 — draft: A&S backend LAB v99 continuidad y fix reglas Firestore
```

Este PR debe mantenerse en draft hasta que Paula autorice avance/merge/deploy.

## 3. Por qué esta rama es la correcta

Esta rama fue creada desde el `head_sha` del PR #3, que contenía la base backend LAB protegida y Fase 8 validada:

```txt
eb8a3fc542b0addb59f8cf6da76b8cc3348055d7
```

Por tanto, no reinicia backend desde `main` ni desde un ZIP/prototipo Claude.

## 4. Ramas que NO deben usarse para continuar A&S/backend

No usar para continuidad backend A&S:

```txt
main
ays/backend-tenant-continuidad-20260703
backend/v99-clean-claude-lab-20260701
cualquier rama de prototipo o Claude
```

Notas:

- `main` no debe recibir continuidad directa de backend A&S.
- `ays/backend-tenant-continuidad-20260703` quedó superseded porque nació desde `main` y no desde backend v99 validado.
- `backend/v99-clean-claude-lab-20260701` queda como antecedente/base protegida del PR #3, no como rama de trabajo nueva.
- Las ramas de prototipo/Claude son para frontend, UX, módulos visuales y ZIPs, no para backend real A&S.

## 5. Regla antes de cualquier cambio

Antes de crear, actualizar o borrar archivos, la siguiente conversación debe confirmar:

```txt
Estoy trabajando en la rama: ays/backend-tenant-lab-v99-20260703
```

Si no está en esa rama, debe detenerse y corregir el carril antes de tocar archivos.

## 6. Qué sí se puede trabajar en esta rama

- Firestore LAB.
- `Orbit.store` backend.
- Reglas Firestore.
- Tenant `alianzas-soluciones`.
- Migración CRM real A&S por bloques.
- Importadores backend/datos.
- Smoke LAB A&S.
- Auth LAB cuando corresponda.
- Documentación técnica backend A&S.
- Backlog para Claude derivado de hallazgos backend.
- Empalme aditivo del nuevo prototipo solo si conserva backend LAB, `Orbit.store`, tenant, scripts y documentación.

## 7. Qué no se debe hacer sin autorización explícita

- Merge a `main`.
- Deploy Hosting.
- Deploy producción.
- Subir secretos.
- Cargar datos reales en código, `seed.js` o prototipo demo.
- Usar rama de prototipo para backend.
- Reemplazar backend validado por ZIP nuevo de Claude.
- Entregar ZIPs/paquetes descargables a Paula si no los pide expresamente.

## 8. Regla para nuevos prototipos Claude

Cuando Claude entregue un ZIP nuevo:

1. Se audita como mini-release.
2. Se documentan resueltos/pendientes/regresiones.
3. No se cambia esta rama backend automáticamente.
4. Solo se empalma frontend si no rompe `Orbit.store`, tenant, Auth, reglas ni datos reales.
5. Todo hallazgo que Claude deba absorber se registra en backlog Claude.
6. Todo ajuste hecho por ChatGPT/Codex también se documenta para que Claude lo conserve en el prototipo base.

## 9. Estado v1.104

**Estado:** ACTIVO Y OBLIGATORIO.  
**Rama vigente:** `ays/backend-tenant-lab-v99-20260703`.  
**PR vigente:** `#5`.  
**Último bloque aplicado:** Backend LAB v1.104 — loader/init endurecidos, guard de seguridad para secretos/auth, script de integración local actualizado y validador estático agregado.  
**Siguiente paso:** empalme completo/aditivo del candidato Claude final sin reemplazar backend LAB; luego smoke local real y continuidad Firestore/Auth por fases.
