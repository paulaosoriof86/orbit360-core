# Bloque 1 · Reparación visual controlada M1

Fecha: 2026-07-19
Rama: `ays/backend-tenant-lab-v99-20260703`
Gate: `block1-client360-insurers-lab-v20260717`
Contrato preservado: `1.0.27`

## Estado de entrada

El gate técnico final quedó aprobado con `ok:true`, 414 clientes, 26 aseguradoras y 7 asesores. La revisión visual humana detectó defectos no cubiertos por el validador. Se conserva la aprobación técnica previa y se abre un solo corte de reparación.

Estado: `NO_GO_VISUAL_CONTROLLED_REPAIR`.

## Causas raíz

- `DATA_CONTRACT_FAILURE`: tipo, país y fecha no siempre llegaban a valores canónicos.
- `FUNCTIONAL_DEFECT`: ausencia de pólizas o cartera se mostraba como salud favorable.
- `VALIDATOR_STALE`: el gate cambiaba rol mediante un control oculto y no probaba búsqueda móvil usable.
- `PIPELINE_MECHANISM_FAILURE`: proyección y snapshots provocaban repintados repetidos.
- `FUNCTIONAL_DEFECT`: cerrar un importador sin resultado podía dejar el módulo vacío.

## Implementación

### Carril A

- Proyección canónica: normaliza `Persona/Empresa`, `GT/CO` y fechas; evita reaplicar la misma proyección.
- Integridad visual: mantiene rol y búsqueda visibles en tableta/móvil; presenta estados pendientes cuando faltan relaciones; recupera la vista si un importador se cierra sin resultado.
- Sincronización LAB: conserva renderers canónicos y deduplica repintados por firma de ruta y conteos.
- Academia: enseña estados honestos, filtros canónicos, controles humanos y diferencia entre defecto funcional y validador obsoleto.

### Carril B

- Sin cambios en Store, Auth, Router, importador protegido, reglas o adaptadores Firestore.
- El overlay conserva contrato 1.0.27 y agrega `visual-human-repair-v2`.
- El validador prueba filtros Colombia/Empresa, fechas, controles visibles y estados vacíos honestos.
- El reporte normaliza el campo de error para que el publicador auxiliar no convierta un éxito en falso rojo.

### Carril C

- No se reimportan clientes ni aseguradoras.
- No se cargan datos posteriores al 9 de julio en este corte.
- No se infieren pólizas, cartera o cobros desde Clientes.
- Los reportes SIGA del 1 al 19 de julio quedan para Bloque 4, por fuentes separadas y dry-run con deduplicación.

## Aceptación

1. Conteos 414/26/7.
2. Cero tipos fuera de `Persona/Empresa`.
3. Cero países fuera de `GT/CO` para el lote validado.
4. Filtros Colombia y Empresa con resultados.
5. Cero `InvalidDate` visible.
6. Cliente sin pólizas muestra pendiente o sin datos.
7. Rol y búsqueda visibles en tableta/móvil.
8. Navegación sin repintados redundantes.
9. Cerrar importador sin archivo recupera la ficha o módulo.
10. Cero copy técnico visible.

El gate se ejecuta una sola vez después de `GO_GATE_CONTRACT`. Si la misma etapa o código falla dos veces, se detienen reintentos y se diagnostica el owner o validador.

## Fuera de alcance

Recursos protegidos, cuentas operativas, Drive, versionado definitivo de tarifarios, branding A&S, nuevos datos SIGA y los módulos posteriores del plan.

Sin producción, sin `main`, sin merge y sin reimportación.
