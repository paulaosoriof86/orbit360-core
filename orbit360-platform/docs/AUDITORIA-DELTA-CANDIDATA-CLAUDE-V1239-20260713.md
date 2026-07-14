# Auditoría delta — candidata Claude v1.239

Fecha: 2026-07-13  
Candidata: `Prototype Development Request - 2026-07-13T211052.476.zip`  
SHA-256: `3beb57d70757b2f685432747198c329b092e4e49f82a813d1aafe2ece43a6a03`

## Resultado técnico

- 106 archivos.
- 58 JavaScript; `node --check` 58/58 PASS.
- Delta frente a v1.233: 13 archivos modificados, sin altas/bajas.
- `data/store.js`, `core/auth.js` y `core/importa.js` permanecen byte-idénticos.
- Sin secretos literales nuevos detectados.
- Avance físico real hasta v1.239; se acepta como nueva base incremental, pero no se empalma aún.

## Conservar sin repetir

- guard de ruta directa;
- selector sin `asesorId:'ase001'` hardcodeado;
- Aseguradoras visible para Operativo/Asesor;
- UI Equipo `roles[]`, `rolDefault`, `ninguno` y permisos separados;
- confirmación reforzada ya creada;
- Ops/Leads con filtro role-based propio/equipo;
- Comparativo con replanteos, línea temporal y plantilla tenant;
- Academia con histórico→finmovs, solo lectura y ampliación de acceso;
- cierres anteriores v1.224–v1.233.

## Fallas P0 reproducidas

1. `Orbit.session.set('Finanzas','ase002')` acepta el cambio aunque `ase002.roles=['Asesor']`; cambiar asesor evade la validación de rol.
2. Un usuario legacy sin `roles[]` recibe todo `Object.keys(Orbit.ROLES)`; no es fail-closed.
3. Un rol persistido no asignado no vuelve a `rolDefault`: `Finanzas` permanece activo para `ase001` aunque solo tiene Dirección/Admin.
4. `ase002.dataScope='ninguno'` no se aplica: `Orbit.accessScope.dataScope()` devuelve `propia`. La configuración de Equipo es declarativa, no efectiva.
5. Los módulos CRM scoped solo implementan `propia`, no `team/none`; Ops/Leads usa defaults del rol, no scope del usuario, y acciones directas no revalidan alcance.
6. `Orbit.credentials.resolve()` existe pero no es llamado; el vault sigue recibiendo el valor al render, `ctxMap` no se usa y la auditoría carece de aseguradora/plataforma/motivo.
7. Operativo recibe bancos por rol automáticamente; falta política explícita del tenant.
8. Documentación incoherente: no hay manifiesto v1.239, BITÁCORA no incorpora v1.224–v1.239, CHANGELOG no está completamente descendente, PENDIENTES conserva bloque obsoleto y REPORTE-SMOKE sigue encabezado por v1.163.
9. Copy técnico visible: Equipo declara modo de demostración y una lección de Academia enumera términos internos prohibidos.

## Residuos P1

- Comparativo: motivo de replanteamiento opcional; criterios/ponderaciones siguen hardcodeados; plantilla no tiene orden ni override por aseguradora.
- Ops/Leads: proteger también detalle y mutaciones, no solo listas.
- Academia: corregir afirmaciones anticipadas y ampliar proveedor/auditoría de credenciales sin duplicar cursos.
- Evidencia: solo una captura 909×540; faltan 1366/768/390 y 15 escenarios.

## Veredicto

`ACEPTAR COMO BASE v1.239 · CORREGIR RESIDUOS P0 · NO REHACER MÓDULOS · NO EMPALMAR TODAVÍA.`

El paquete residual exclusivo para Claude post-v1.239 fue generado fuera del repo con P0/P1, patrones reutilizables y checklist de entrega.