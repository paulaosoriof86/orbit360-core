# Metodologia de trabajo incremental · Orbit 360

**Fecha:** 2026-07-03  
**Proyecto:** Orbit 360 / A&S  
**Rama activa backend:** `ays/backend-tenant-lab-v99-20260703`  
**Base actual de prototipo:** Claude v1.97  
**Objetivo:** evitar perdida de contexto, reprocesos, bloques manuales repetitivos y cambios de plan al abrir una nueva conversacion.

---

## 1. Principio central

Orbit 360 no se reinicia en cada conversacion ni en cada prototipo nuevo de Claude.

Cada avance parte de lo ultimo que ya quedo en GitHub y documentado. El prototipo nuevo de Claude se trata como **release candidate incremental**, no como reemplazo ciego ni reinicio del proyecto.

Base vigente:

- Repositorio: `paulaosoriof86/orbit360-core`
- Rama backend: `ays/backend-tenant-lab-v99-20260703`
- Prototipo base: Claude v1.97
- Plan vivo: `docs/PLAN-ACTIVO-POST-V197-20260703.md`

---

## 2. Separacion obligatoria de frentes

### Frente Claude / Prototipo

Claude se usa para UX, modulos visuales, flujos de interfaz, componentes del prototipo, correcciones visuales, mejoras comerciales, responsive y profundizacion funcional de modulos.

Toda mejora pendiente para Claude se documenta en archivos de pendientes. No se improvisa desde backend salvo fix minimo y documentado.

### Frente ChatGPT/Codex / Backend

ChatGPT/Codex se usa para `Orbit.store`, Firestore LAB/produccion, Auth, tenant/multi-tenant, integraciones, Make/webhooks, importadores reales, validadores, runners, documentacion tecnica y empalme seguro de prototipos.

---

## 3. Regla GitHub primero

Todo avance debe hacerse primero en GitHub cuando sea posible.

No se debe usar el computador de Paula como entorno de desarrollo manual. El equipo local se usa solo para validar lo que no puede verificarse desde GitHub: archivos locales protegidos, credenciales locales, servidor local, visual real en navegador, smoke local o lectura de archivos reales que no deben subirse.

---

## 4. PowerShell solo como runner final

PowerShell no es el lugar para desarrollar la logica pesada.

PowerShell se permite solo para sincronizar rama, ejecutar un runner versionado, levantar servidor local, abrir preview, validar archivos criticos y generar reporte.

No se deben entregar cadenas largas de comandos repetitivos. Si un proceso requiere varios pasos, debe convertirse en script/runner versionado dentro del repo.

---

## 5. Runners versionados

Todo proceso que se repita mas de una vez debe convertirse en runner.

Los runners deben:

- no usar `git clean`,
- no asumir Python,
- usar Node si ya esta validado,
- no tocar `main`,
- no hacer deploy,
- no escribir produccion,
- no subir secretos,
- generar reporte,
- ser idempotentes cuando sea posible,
- detenerse si detectan riesgo.

---

## 6. Seguridad por defecto

Todo avance nace bloqueado por defecto:

- Deploy: 0
- Hosting: 0
- Produccion: 0
- Datos reales: 0
- Firestore writes reales: 0 salvo autorizacion expresa
- Importaciones reales: 0 salvo autorizacion expresa
- Secretos en GitHub: 0

Primero se prepara, valida y documenta. Despues Paula autoriza activacion.

---

## 7. Documentacion inmediata

Si no esta documentado, no se considera hecho.

Cada bloque debe dejar al menos uno de estos entregables:

- archivo nuevo,
- script/runner,
- documento actualizado,
- commit,
- especificacion,
- checklist,
- reporte,
- validacion.

Archivos vivos principales:

- `docs/PLAN-ACTIVO-POST-V197-20260703.md`
- `docs/PENDIENTES-CLAUDE-POST-V197-20260703.md`
- `docs/AUDITORIA-PROTOTIPO-CLAUDE-V197-20260703.md`
- `docs/ESPEC-MARKETING-OPERATIVO-POST-V197-20260703.md`
- `docs/ESPEC-INTEGRACIONES-MARKETING-MAKE-POST-V197-20260703.md`
- `docs/BITACORA-ERRORES-REINCIDENTES-20260703.md`
- `docs/METODOLOGIA-TRABAJO-INCREMENTAL-ORBIT-20260703.md`

---

## 8. Regla puente hacia Claude

Toda mejora, fix o decision que se haga por ChatGPT/Codex y que afecte el prototipo comercializable debe notificarse a Claude en el siguiente paquete.

Ejemplos que SI deben notificarse a Claude:

- fixes de UX aplicados localmente o en backend branch,
- nuevas reglas de negocio descubiertas,
- cambios de esquema que el prototipo debe reflejar,
- helpers globales que los modulos deben usar,
- cambios en botones o flujos UI,
- pendientes cerrados por ChatGPT/Codex que Claude debe incorporar a su base,
- errores reincidentes que Claude debe evitar,
- documentacion de `CHANGELOG.md` y bitacoras que Claude debe actualizar.

Regla practica:

- Si mejora la base Orbit 360, se documenta en `PENDIENTES-CLAUDE-POST-V197-20260703.md` o en un documento puente para el proximo paquete Claude.
- Si es solo backend local/LAB, se documenta en plan/backend y no se le pide a Claude salvo que cambie interfaz o contrato de modulo.

---

## 9. Archivos protegidos en empalmes

No reemplazar a ciegas:

- `core/auth.js`
- `data/store.js`
- `data/store-firestore-lab.local.js`
- `core/backend-lab-loader.js`
- `core/backend-lab-init.js`
- `core/auth-firebase.config.local.js`

Si Claude trae cambios en esos archivos, se hace merge manual y se documenta.

---

## 10. Flujo al abrir una nueva conversacion

La nueva conversacion debe empezar asi:

1. Leer este documento.
2. Leer `docs/PLAN-ACTIVO-POST-V197-20260703.md`.
3. Leer `docs/PENDIENTES-CLAUDE-POST-V197-20260703.md`.
4. Leer `docs/ESPEC-MARKETING-OPERATIVO-POST-V197-20260703.md`.
5. Leer `docs/ESPEC-INTEGRACIONES-MARKETING-MAKE-POST-V197-20260703.md`.
6. Confirmar rama `ays/backend-tenant-lab-v99-20260703`.
7. Continuar desde el ultimo commit, no reiniciar.
8. Hacer todo lo posible en GitHub antes de pedir accion local.
9. Si se entrega runner local, debe ser versionado, seguro y minimo.
10. Registrar cualquier mejora local tambien para Claude si aplica.

---

## 11. Estado

**ACTIVO COMO METODOLOGIA DE TRABAJO.**

Este documento debe usarse para retomar Orbit 360 en conversaciones futuras sin perder contexto ni repetir errores.