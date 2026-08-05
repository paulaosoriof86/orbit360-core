# CIERRE MICROBLOQUE 1.1 — BASELINE CANÓNICO RC A&S

Fecha: 2026-08-04  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Resultado

```text
PASS_CANONICAL_BASELINE
```

## Baseline preservado

```text
sourceBaseline: 548cffa50cddfd93ad2118f5a06e9bb420699bde
singleRc: RC-AYS-LAB-CANONICA-01
newCandidateCreated: false
```

## Owners fundacionales cerrados

- Router: `core/router.js`; tenant bootstrap es soporte pre-router.
- Access: `core/access-scope.js`; Auth, session owner y ceilings tienen responsabilidades distintas.
- Cliente 360: `modules/cliente360.js`; CRM bridge y contrato visual son soporte clasificado.
- Aseguradoras: `modules/aseguradoras.js`; importación, edición y directorio operativo conservan owners de sección explícitos.

No se retiraron bridges ni se sustituyeron módulos. Dos capas quedan marcadas para retiro posterior condicionado a prueba runtime: la proyección temporal de Cliente 360 y el resources bridge inactivo de Aseguradoras.

## Conteos reconciliados

```text
M1/M4 durable:
clientes 414
aseguradoras 26
asesores 7

Gate 7.8 create-only:
clientes +16
aseguradoras +4
updates 0
sobrescrituras 0
REQUIERE_VALIDACION 20/20 preservado

Baseline acumulativo:
clientes 430
aseguradoras 30
pólizas 1,375
vehículos 1,033
recibosEsperados 1,294
carteraPrimas 673
cobros 7
memberships 1
```

Conclusión: cero delta inexplicado de Clientes/Aseguradoras, cero pérdida de datos y cero necesidad de reimportación.

## Evidencia

- `docs/RECONCILIACION-FOCALIZADA-BASELINE-RC-AYS-LAB-CANONICA-01-20260804.md`;
- `runtime-gate-crm-v20260716/rc-ays-lab-canonica-01-baseline-reconciliation-v20260804.json`;
- cierres M4 de escritura y revalidación durable;
- cierre Gate 7.8 de padres HOLD;
- manifiesto acumulativo RC1.2;
- inspección del source baseline.

## Carriles

### A — Frontend/UX/Academia

La mejor versión se define como composición sellada de owner + soportes clasificados. Academia debe enseñar la diferencia entre módulo owner, overlay y owner de sección.

### B — Backend/seguridad

Store, Auth, Access y backend protegido no fueron modificados. No se usaron secretos, Firebase, Functions, Rules ni deploy.

### C — Datos A&S

Los conteos quedaron trazados hasta sus gates. No se reimportan Clientes/Aseguradoras ni se elimina el delta HOLD.

## Siguiente acción exacta

Microbloque 2.0:

1. validar el arnés sintético existente;
2. exigir un contexto aislado y URL directa por cada una de ocho rutas;
3. prohibir navegación por hash acumulativa y variantes visuales nuevas;
4. ejecutar sin Firebase, secretos, deploy o datos reales;
5. cerrar `PASS_ISOLATED_ROUTE_HARNESS` o aplicar `STOP_RETRY` con causa raíz del mismo owner.

Producción, main y merge permanecen prohibidos.
