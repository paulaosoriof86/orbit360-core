# CIERRE PREWRITE RECIBOS / CARTERA A&S — 2026-07-30

Tenant: `alianzas-soluciones`  
Proyecto: `ays-orbit-360-lab`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block9-receipts-portfolio-static-v20260730` / contrato `9.0.0`  
Estado: `PREWRITE_READY / REAL_WRITE_NOT_AUTHORIZED`

## 1. Resultado ejecutivo

Recibos/Cartera quedó preparado hasta el límite previo a escritura real.

Gate estático:

- run: `30597885462`;
- resultado: `SUCCESS`;
- 25/25 checks canónicos;
- request de escritura: ausente;
- escrituras operativas: `0`.

Prewrite real read-only:

- run: `30597919217`;
- resultado final: `SUCCESS`;
- artifact: `8780894845`;
- artifact digest: `sha256:7575f0da9b98be9f692f40dd3d596a5bb17be82d58dd2f45431ccebf77154c87`;
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
vehiculos: 1032
recibosEsperados: 0
carteraPrimas: 0
cobros: 0
finmovs: 0
```

El prewrite no modificó ningún conteo.

## 3. Universo contractual operativo

```text
pólizas Vigente / Por renovar: 224
pólizas activas con calendario seguro: 223
pólizas activas sin calendario fuente seguro: 1
términos Vigente futura excluidos: 7
```

La única póliza activa sin calendario fuente seguro permanece en `REQUIERE_VALIDACION`; no se inventan forma de pago, frecuencia ni recibos.

El calendario operativo excluye términos cancelados, históricos, ya renovados/sustituidos y términos futuros que aún no iniciaron.

## 4. Plan de escritura congelado

Si se autoriza, el write podrá crear exclusivamente:

```text
recibosEsperados: +1261
carteraPrimas: +641
auditoriaImportaciones: +1
clientes: +0
aseguradoras: +0
asesores: +0
polizas: +0
vehiculos: +0
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
recibosEsperados: 1261
carteraPrimas: 641
cobros: 0
finmovs: 0
```

## 5. Semántica de calendario y cartera

`recibosEsperados` contiene el calendario completo conocido del término contractual activo, no solo mora.

Estados operativos congelados:

```text
futuro_pendiente: 542
pago_reportado: 365
no_pendiente_segun_aseguradora: 211
pendiente_vencido: 97
pendiente_vence_corte: 2
requiere_validacion_estado: 44
TOTAL: 1261
```

`carteraPrimas` contiene únicamente obligaciones todavía pendientes:

```text
pendientes totales: 641
exigibles/vencidos al 30/07/2026: 99
futuros: 542
```

Los pagos reportados no crean `cobros`; Cobros/conciliación permanece como bloque separado posterior.

## 6. Integridad contra Firestore real

```text
missingParents: 0
invalidPolicyState: 0
policyRelationMismatches: 0
targetReceiptCollisions: 0
targetPortfolioCollisions: 0
parentPoliciesAvailable: 1373
activePolicies: 224
activePoliciesWithCalendar: 223
activePoliciesWithoutCalendar: 1
```

Cada candidato conserva relación segura con la póliza canónica y su cliente/aseguradora.

## 7. Calidad y reconciliación

- 44 recibos permanecen en HOLD por estado no resoluble de forma segura;
- 28 obligaciones de cartera conservan alerta de calidad persistible;
- 20 programaciones SIGA quedaron excluidas por estar superadas por el balance/estructura confirmada por la aseguradora;
- identidad de recibo: `polizaId + vigencia + endoso + serie + fechaLimite`;
- los endosos que generan prima no se colapsan;
- el estado contractual de `polizas` manda sobre etiquetas financieras de las fuentes;
- los snapshots de aseguradoras refinan saldo/serie/fecha cuando existe match seguro, pero no se suman entre sí ni trasladan deuda entre vigencias.

## 8. Paquete privado congelado

Archivo privado fuera de GitHub:

`ORBIT360-AYS-RECIBOS-CARTERA-CANONICAL-PRIVATE-20260730`

Controles:

```text
physicalSha256: e64e75f78f6a64101627a9a860db566a95b83677fcf20eeb05be44c6f3f6a1d7
logicalSha256: bb494a05aff75ff7baad39a07f23512187e39480d509f8ca1ace01e0b671362b
receiptIdDigest: f700a11643a1e4e62a13c3894d6f1097acef2ad5edfc0a32703d0d9b2ed5facf
portfolioIdDigest: 144c8967704d1d06475144508e24cd8792ea8264faa7045eb50132316264bcd6
```

El paquete contiene datos reales y no se publica en GitHub.

## 9. Causa raíz del primer intento de prewrite

El primer intento del run `30597919217` se detuvo antes de Firestore con:

`ENVIRONMENT_FAILURE: DRIVE_404`

Diagnóstico:

- gate canónico: PASS 25/25;
- owner: no alcanzó a ejecutarse;
- Firestore: no abierto;
- escrituras: 0;
- causa: el nuevo archivo privado no tenía permiso `reader` para el principal técnico LAB.

Corrección:

1. se verificó el principal técnico por hash, sin exponer su identidad ni secretos;
2. se otorgó únicamente acceso `reader` al archivo privado;
3. el diagnóstico temporal se retiró después de usarlo;
4. se reejecutó el mismo run, sin crear un segundo workflow ni modificar producto;
5. la descarga privada y el prewrite pasaron.

Clasificación definitiva: `ENVIRONMENT_FAILURE`, no defecto funcional ni de datos.

## 10. Autorización macro requerida

La escritura real sigue bloqueada. La única autorización válida para este alcance es:

`AUTORIZO ESCRITURA CONTROLADA RECIBOS CARTERA AYS 20260730`

La autorización cubre exclusivamente:

```text
+1261 recibosEsperados
+641 carteraPrimas
+1 auditoriaImportaciones
0 cobros
0 finmovs
0 cambios a clientes/aseguradoras/asesores/polizas/vehiculos
```

Cualquier desviación debe hacer fallar el write y restaurar el baseline exacto mediante rollback fail-closed.

## 11. Visualización obligatoria tras WRITE_PASS

La revisión visual integrada ocurre inmediatamente después de la escritura y antes de Cobros/conciliación.

Debe comprobar:

- Cliente 360 → póliza activa → vehículo(s) → calendario completo;
- forma/frecuencia de pago;
- endosos y series;
- futuro / por vencer / vencido / pago reportado-en revisión;
- cartera pendiente total y cartera exigible/vencida separadas;
- términos históricos/cancelados fuera del calendario operativo;
- cero copy técnico visible.

## 12. Reuso transversal / Academia

Los fixes y patrones de esta etapa quedan documentados para producto comercializable:

- separación estado contractual vs financiero;
- calendario completo vs cartera exigible;
- identidad endoso-aware;
- reconciliación por autoridad/alcance de fuente;
- HOLD en vez de inferencia;
- mismo pipeline para importación individual y masiva;
- canal privado reusable de paquetes con permiso técnico read-only.

Clasificación:

- `REPLICABLE_CLAUDE_ACUMULADO`: UX/importador y reglas genéricas;
- `ACADEMIA_ACTUALIZAR`: calendario/cartera/conciliación/calidad;
- `TENANT_AYS_ONLY`: aliases y mapeos de fuentes concretas;
- `BACKEND_PROTEGIDO_NO_CLAUDE`: owner, workflow, rollback, Auth/Firestore;
- `SECRETO_DATO_REAL`: paquetes y archivos reales.
