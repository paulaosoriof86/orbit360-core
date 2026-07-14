# Auditoría delta — candidata Claude v1.243

Fecha: 2026-07-13  
Candidata: `Prototype Development Request - 2026-07-13T225715.904.zip`  
SHA-256: `5557aefef3d8d12a0fb2f9456ab9574b53c2c222ff789c09d5f7952abe4d3858`  
Base: candidata v1.239 aceptada + paquete residual corregido post-v1.239.

## Resultado

**Aceptar como base incremental v1.243; no empalmar todavía.**

## Verificaciones

- 106 archivos.
- 58 JavaScript.
- `node --check`: 58/58 PASS.
- Delta v1.239→v1.243: 17 archivos modificados, sin altas ni eliminaciones.
- `data/store.js`, `core/auth.js`, `core/importa.js`: byte-idénticos.
- Sin secretos literales nuevos detectados en el delta.
- Evidencia visual: solo 909×540; no cubre responsive ni 15 escenarios.

## Cierres aceptados — no repetir

- rol validado contra usuario destino;
- rol legacy canonicalizado;
- rol persistido inválido vuelve a default válido;
- cuentas bancarias visibles/copiables por defecto para usuarios de Aseguradoras;
- motivo obligatorio al replantear;
- ponderación precio/cobertura configurable;
- proveedor de credenciales llamado al clic;
- estado pendiente cuando no resuelve;
- contexto de aseguradora/plataforma/módulo en auditoría;
- helper legacy propia/equipo/todo/ninguno en listas de seis módulos;
- bloqueo de detalle Cliente360 fuera del alcance;
- Academia bancaria corregida.

## P0 reproducidos pendientes

1. Usuario sin `roles[]`, `rolDefault` ni `rol` válido hereda el rol activo (`Dirección`) mediante `return [d.rol]`.
2. `dataScopes.default` y `dataScopes.modules{}` no se leen; solo funciona legacy `dataScope`.
3. own/team incluyen registros sin `advisorId`; un registro no asignado se filtra hacia usuarios restringidos.
4. Si falta advisor/team para un scope restrictivo, el helper puede devolver todo.
5. Visibilidad final no aplica base + `modulesExtra[]` − `modulesRestricted[]`; sigue en `modulosOverride` legacy.
6. Pólizas, Cobros, Renovaciones, Siniestros y Ops/Leads conservan fichas/mutaciones por ID sin gate de scope.
7. Confirmación reforzada solo cubre scope todo o permiso extra; faltan rol privilegiado, propia→equipo, módulo/país, quitar restricción y reactivar membresía.
8. Falta motivo y diff integral antes/después en cambios de permisos.
9. El proveedor default devuelve el mismo `credentialRef`, exponiendo la referencia como si fuera secreto.
10. `Orbit.vault.field(valorReal, opts)` todavía acepta y conserva el argumento en memoria.
11. Usuario de plataforma continúa dependiendo de `p.user` real.
12. Auditoría de credencial no distingue intento/denegación/revelación/copia ni registra tipo, plataforma estable, motivo y resultado.
13. `Finanzas` conserva acceso a credenciales de plataformas, contra la regla vigente.
14. La UI conserva un checkbox de restricción bancaria individual; Paula confirmó que todos los usuarios del módulo deben poder informar cuentas bancarias.

## Documentación pendiente

- no hay manifiesto v1.243;
- README sigue en `v1.234+` y enlaza v1.215;
- CHANGELOG mantiene saltos de orden;
- BITÁCORA llega solo a v1.242;
- PENDIENTES conserva bloques obsoletos;
- REPORTE-SMOKE conserva cuerpo v1.163 y no adjunta evidencia vigente;
- se afirma “datos reales” sin artefacto que lo demuestre;
- Academia todavía enumera nombres técnicos internos en contenido visible.

## P1 pendiente

- criterios disponibles por tenant;
- motivo/diff para cambios de ponderación;
- persistencia inmediata del replanteo;
- orden de secciones y override por aseguradora;
- gates de scope en detalles/mutaciones;
- evidencia 1366/768/390 y 15 escenarios Aseguradoras.

## Paquete residual

Archivo local entregado a Paula:

`PAQUETE-RESIDUAL-EXCLUSIVO-CLAUDE-ORBIT360-POST-V1243-20260713.zip`

SHA-256:

`d3aa8c38e5eec3aad0d3593215e2240e9e4a352f5ef63c031501b52a2fd87938`

La siguiente candidata debe ser v1.244 o superior. No reconstruir cierres v1.224–v1.243.
