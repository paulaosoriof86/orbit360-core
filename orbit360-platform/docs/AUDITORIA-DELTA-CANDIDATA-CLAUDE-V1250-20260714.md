# Auditoría delta — candidata Orbit 360 v1.250

Fecha: 2026-07-14  
Candidata: `Prototype Development Request - 2026-07-14T084835.886(1).zip`  
SHA-256: `965f0c5b643970e7d3150e93235c668c0ca6cd0a23f9f88b357ff392da277b97`  
Base comparada: v1.244 + paquete maestro post-v1.244 + contratos backend hasta `d26f8a6ff9a5cf2ed3faab93183e89059eb32055`.

## Resultado técnico

- 108 archivos.
- 58 JavaScript; `node --check` 58/58 PASS.
- Delta: 1 archivo añadido, 15 modificados, 0 eliminados.
- `data/store.js`, `core/auth.js` y `core/importa.js` byte-idénticos.
- Sin secretos literales nuevos.
- Evidencia visual: una captura 909×540.

## Cierres aceptados — no repetir

- identidad destino inexistente/inactiva bloqueada;
- `canSee` bloquea rol desconocido;
- Equipo persiste `teamId`, `countries`, `modulesExtra`, `modulesRestricted` y `dataScopes`;
- confirmación detecta más ampliaciones;
- gates por ID agregados a múltiples acciones;
- bancos retirados del vault visible;
- auditoría del vault por estados;
- replanteamiento persistido de inmediato;
- etiquetas de criterios configurables;
- campaña de renovación filtrada;
- country gate básico cuando el selector global usa un país específico.

## P0 que bloquean el empalme

1. `access-scope` sigue fail-open: error de rol cae a Dirección, error de visibilidad devuelve `true`, scope no resuelto puede caer a `todo`, y bootstrap devuelve `[d.rol]`.
2. `puedeAccederRegistro(asesorId, modulo)` no valida tenant, país ni acción. Con `Orbit.pais='TODOS'`, `countries[]` no limita registros.
3. Ops/Leads usa la clave de scope `negocios` en vez de `ops`/`leads`; un scope por módulo puede ser evadido.
4. Persisten mutaciones sin gate central: `crearGestion`, `solicitarGestion`, `nuevoNegocio`, `nuevaGestion`, `conciliarFactura`, `lote` y `siniestros.nuevo`.
5. Los números bancarios siguen naciendo como `****1234`; el botón copia el valor enmascarado, no un número ficticio completo.
6. Vault continúa con `field(valorReal)`, `p.user` directo y fixture que devuelve la referencia como valor. Debe ser ref-only y proveedor separado.
7. La confirmación de ampliación no conserva el motivo exacto ni diff integral de roles/scopes/módulos/países/permisos/restricciones/estado.
8. No existe manifiesto v1.250; README enlaza v1.244 y persisten afirmaciones históricas de datos reales sobre seed.

## Sincronización backend → prototipo/Academia

Los contratos posteriores al paquete maestro agregan política efectiva, catálogo read-only corregido y matriz por rutas. El prototipo debe reflejar:

- bancos visibles a todo usuario con Aseguradoras;
- plataformas y credenciales separadas;
- ficha por ID revalida tenant/país/scope;
- configuración sanitizada;
- membresía propia o privilegiada;
- auditoría/importaciones privilegiadas;
- progreso Academia propio o privilegiado;
- `credentialRefs` solo por proveedor;
- ninguna escritura en estado read-only;
- copy operativo, no técnico.

## Diferidos no críticos

No consumir capacidad actual de Claude en override por aseguradora, orden arrastrable, criterios libres, P2, limpieza histórica completa o capturas exactas. Se retoman después del empalme.

## Veredicto

**Aceptar v1.250 como última base incremental. No empalmar todavía.**  
La siguiente candidata debe ser v1.251 o superior y corregir únicamente los ocho P0 anteriores.
