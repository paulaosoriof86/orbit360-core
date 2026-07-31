# CIERRE PREWRITE VEHÍCULOS A&S — 2026-07-30

Tenant: `alianzas-soluciones`  
Proyecto: `ays-orbit-360-lab`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block8-vehicles-static-v20260730` / contrato `8.0.1`  
Estado histórico del corte: `PREWRITE_READY / REAL_WRITE_NOT_AUTHORIZED`

> Este documento conserva el estado previo a la autorización. El cierre posterior está documentado en `CIERRE-WRITE-VEHICULOS-AYS-20260730.md` con estado `WRITE_PASS`.

## 1. Resultado ejecutivo

Vehículos quedó preparado hasta el límite previo a escritura real. No se creó, actualizó ni eliminó ningún documento operativo.

Prewrite read-only:

- run: `30589096805`;
- artifact: `8777656292`;
- artifact digest: `sha256:e19361b5d081019528a1c9625eaaa2a03699631bf1b2ba08685d907a31babaa4`;
- status: `PREWRITE_READY`;
- Firestore read: `true`;
- Firestore writes: `0`;
- operational writes: `0`.

## 2. Baseline real verificado

```text
clientes: 430
aseguradoras: 30
asesores: 7
polizas: 1373
vehiculos: 0
recibosEsperados: 0
carteraPrimas: 0
cobros: 0
finmovs: 0
```

El baseline coincide con el cierre real de Pólizas y confirma que Vehículos inicia sobre colección destino vacía; no hay que reconciliar escrituras previas.

## 3. Fuentes exactas y canonicalización

Fuentes privadas ya recibidas y verificadas por hash:

- `Autos.xlsx`: 1,041 filas;
- `Autos a partir de julio 2026.xlsx`: 19 filas;
- paquete canónico privado de Pólizas: 1,373 pólizas.

Perfil final:

```text
filas crudas: 1060
identidades fuente: 1036
duplicados: 18 grupos / 24 filas extra absorbidas
relaciones vehículo–póliza a crear: 1032
calidad pendiente: 60
excluidas: 4
fallback solo por número de póliza: 0
```

`targetIdDigest` congelado:

`c5a5eb51b69eedef33588c6e3bb8bb3746ceac8bffc4a7a9181ebcbe4995682d`

## 4. Validación contra Firestore real

```text
missingParents: 0
clientMismatches: 0
insurerMismatches: 0
policyNumberMismatches: 0
vigencyMismatches: 0
targetCollisions: 0
parentPoliciesAvailable: 1373
targetIdsUnique: 1032
```

Cada relación se enlaza a una póliza canónica real. La póliza persistida es autoridad para cliente, aseguradora, vigencia y estado contractual.

## 5. Regla contractual preservada

El `Estatus póliza` del archivo de Vehículos es provenance y no modifica la póliza canónica. La vigencia contractual continúa mandando en Pólizas; estados de pago se resolverán posteriormente en Recibos/Cobros.

No se colapsan renovaciones distintas en un vehículo físico global. La unidad inicial segura es `vehicle_policy_association`. La placa es únicamente candidato de correlación futura cuando no existe VIN confiable y no autoriza reasignación histórica de cliente.

## 6. Calidad pendiente y exclusiones

60 relaciones pueden persistirse con `pendiente_completar` sin inventar atributos. Las cuatro exclusiones permanecen fuera por `Estatus póliza = Eliminada` y/o ausencia de relación padre segura. No se usa fallback solo por número de póliza.

## 7. Causa raíz cerrada antes del prewrite

El primer canonical dry-run fue detenido tras un fallo. El diagnóstico demostró que 123 identidades con números de póliza numéricos de 13–14 dígitos eran transformadas por SheetJS mediante formato de presentación (`raw:false`). La causa definitiva fue `FUNCTIONAL_DEFECT` del normalizador, no pérdida de datos.

Corrección:

- identidad leída por valor crudo (`raw:true`);
- presentación Excel prohibida como parte de claves;
- prueba regresiva específica;
- contrato del gate actualizado a `8.0.1`;
- Academia actualizada con el patrón reusable.

La única corrida corregida posterior pasó y el prewrite real también pasó; no hubo tercer intento.

## 8. Plan de futura escritura en ese corte

El write podía crear exclusivamente:

```text
vehiculos: +1032
auditoriaImportaciones: +1
clientes: +0
aseguradoras: +0
polizas: +0
recibos: +0
cartera: +0
cobros: +0
finmovs: +0
```

Post-write esperado:

```text
clientes: 430
aseguradoras: 30
asesores: 7
polizas: 1373
vehiculos: 1032
recibosEsperados: 0
carteraPrimas: 0
cobros: 0
finmovs: 0
```

## 9. Autorización y cierre posterior

La autorización macro posterior fue:

`AUTORIZO ESCRITURA CONTROLADA VEHICULOS AYS 20260730`

Fue consumida una sola vez y terminó `WRITE_PASS`; ver `CIERRE-WRITE-VEHICULOS-AYS-20260730.md`.

## 10. Siguiente acción tras WRITE_PASS

Avanzar directamente a `Recibos/cartera`, reutilizando el patrón transversal ya validado y manteniendo Cobros como fuente y conciliación separadas.
