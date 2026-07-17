# Paquete acumulado Claude post-v1.255 — 2026-07-17

Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Bloque del plan: 0 — Baseline canónico y control de deltas  
Carril: A, con exclusiones B/C

## Estado

```txt
PAQUETE: PREPARADO
ENTREGA A CLAUDE: PENDIENTE DE PAULA
INCORPORACIÓN: NO DECLARADA
EMPALME: PENDIENTE DE NUEVA CANDIDATA
```

## Base obligatoria

```txt
Prototype Development Request - 2026-07-17T001643.602.zip
SHA-256: abb6bbe417e5d9a2172adfe1b4852045dd3579abf49a495ec4ef82ad81da34d4
Versión funcional: v1.255
```

## Artefacto entregado a Paula

```txt
PAQUETE-CLAUDE-ACUMULADO-POST-V1255-ORBIT360-20260717.zip
SHA-256: 19eaafecce77effae97730b1415332a73287db1475b2b3eb4feabe813be7fbc8
Archivos internos: 15
```

## Alcance acumulado

El paquete solicita a Claude, sin reconstruir el prototipo:

1. conservar todos los fixes incorporados en v1.255;
2. consolidar `Orbit.access` y `Orbit.accessScope` en un único propietario compatible;
3. incorporar proyección canónica reusable de clientes importados, sin escritura ni datos A&S;
4. incorporar estados reusables de conocimiento de aseguradoras: mapeado, persistido, validado y habilitado;
5. mantener router y legal como propietarios únicos;
6. mantener PWA libre de lógica operativa;
7. eliminar copy técnico pendiente;
8. unificar README, CHANGELOG y manifiesto;
9. actualizar Academia profunda;
10. entregar ZIP completo, validadores y evidencia honesta de Dirección escritorio, Operativo tableta y Asesor móvil.

## Exclusiones

No contiene ni autoriza:

```txt
backend protegido
Firebase/Auth/Firestore/Storage reales
reglas
secretos
credenciales reales
datos o payload A&S
loaders LAB
service account
rutas privadas
hardcodes del tenant
```

`data/store.js`, `core/auth.js` y `core/importa.js` deben permanecer byte-idénticos respecto de la candidata v1.255.

## Relación con el plan

Este paquete es un paso intermedio formal del Bloque 0 y no cambia el orden:

```txt
paquete Claude
→ nueva candidata acumulada
→ auditoría contra ledger
→ empalme selectivo propietario
→ validadores
→ Bloque 1: gate LAB y revisión visual única
```

Después del gate visual, solo se enviarán correcciones puntuales derivadas de evidencia, salvo nuevo hallazgo estructural.

## Control de sincronización

La nueva candidata se auditará contra:

- `BASELINE-CANONICO-Y-DELTA-CLAUDE-20260717.md`;
- `SINCRONIZACION-CLAUDE-ACUMULADA-20260717.md`;
- este registro;
- el Plan Maestro de Ejecución Productiva y Anti-desviación.

Los estados del ledger no cambian a `INCORPORADO_CANDIDATA` o `VALIDADO_EMPAlME` hasta recibir, auditar y empalmar la nueva entrega.
