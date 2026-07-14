# Paquete residual Claude post-v1.233

## Base obligatoria

Trabajar solo sobre `Prototype Development Request - 2026-07-13T202357.007.zip`, SHA-256 `2ea0c986ef42bc7482c6acd71190f742df5c159af73704c0b9a50bb674863a58`. Próxima candidata: v1.234 o superior.

## No repetir

Conservar: source-lock legacy, `core/access-scope.js`, filtros `propia` ya aplicados, fichas Cliente360/Póliza, gestión de corrección, vault 15s/key estable, Academia dataScope/vault, gates de propuestas, `issuance_request`, endoso con diff e impresión individual.

## P0 residual

1. Identidad documental coherente: README, manifiesto v1.234+, CHANGELOG ordenado, BITACORA/PENDIENTES/SMOKE actualizados.
2. Multirol real en prototipo: `roles[]`, `rolDefault`, rol activo solo entre asignados, sin `ase001` hardcodeado, scope own/team/all/none, módulos base + extras - restringidos, diff/motivo/fecha y confirmación reforzada al ampliar acceso.
3. Guard de ruta directa en router; no basta ocultar el menú.
4. Aseguradoras accesible para Operativo y Asesor según política, sin edición automática.
5. Separar permisos de credenciales de plataforma y bancos operativos; restricción explícita gana.
6. No mostrar `p.user` en claro a rol restringido. Vault recibe `credentialRef`, no valor real desde store; proveedor temporal, auditoría y re-localización tras await; 15s máximo.
7. Academia: ampliar cursos existentes con default/active/extras/restrictions, plataformas vs bancos, histórico financiero→finmovs y verificación productiva en solo lectura.

## P1 residual

1. Replanteamiento trazable: antes/después, motivo, actor, fecha y cambio de recomendación; criterios/ponderaciones configurables.
2. Línea temporal de comparativo con carga, corrección, validación, replanteamiento, envío preparado, decisión e `issuance_request`.
3. Plantilla de impresión configurable por tenant/aseguradora.
4. Ops/Leads respetan own/team/all/none y guard de ruta; no rehacer kanban, cadencias, issuance_request ni endoso.
5. Evidencia focalizada 1366/768/390 y Aseguradoras 15/15.

## Patrones reutilizables nuevos

- Directorios de aseguradoras: aseguradora vs aliado vs fuente contaminada; aliases/duplicados; dry-run crear/actualizar/omitir/validar; trazabilidad; credentialRef.
- Financiero histórico: destino inicial `financiero_historico`; nunca inferir clientes/pólizas/cartera/cobros; saldo apertura y financiamiento separados; promoción a finmovs solo con fecha, país, moneda, trazabilidad, no duplicado, diff, aprobación, auditLog y rollback.
- Acceso fail-closed: pendiente de conexión segura, verificación en solo lectura y escritura bloqueada hasta smoke; sin términos técnicos en UI cliente.
- Toda consulta conceptual respeta tenant + país + own/team/all; none no consulta.

El ZIP descargable contiene la matriz completa, checklist y prompt corto.
