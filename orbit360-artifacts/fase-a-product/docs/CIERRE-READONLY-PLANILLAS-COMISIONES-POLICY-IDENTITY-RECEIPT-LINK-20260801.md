# CIERRE READ-ONLY — PLANILLAS Y COMISIONES — IDENTIDAD DE PÓLIZA Y RELACIÓN CON RECIBOS

**Fecha:** 2026-08-01  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Gate:** `block11-planillas-comisiones-linkage-readonly-v20260801`  
**Entorno:** LAB read-only

## 1. Alcance cerrado

Se analizó el corte histórico de comisiones de junio de 2026:

```text
archivos recibidos: 19
paquetes de fuente: 10
filas observadas: 67
candidatas CRM: 65
omitidas por comisión cero: 2
```

No se modificaron las fuentes, no se calcularon tasas y no se activó el carril financiero.

## 2. Causa raíz del linkage inicial

El primer linkage había clasificado:

```text
póliza única: 10
póliza no encontrada: 29
póliza ambigua: 26
HOLD de identidad: 55
```

La causa raíz fue `VALIDATOR_STALE`. El validador trataba el número normalizado exacto como primera y suficiente identidad. Esto producía dos problemas:

1. no aplicaba aliases de número documentados por aseguradora;
2. no utilizaba el calendario de recibos para distinguir vigencias con el mismo número.

Se corrigió el mecanismo reusable sin cambiar las filas reales. La fecha en que la aseguradora pagó la comisión no se utilizó para escoger póliza ni recibo.

## 3. Resolver reusable de identidad de póliza

Componente puro:

```text
orbit360-platform/core/planillas-comisiones-policy-identity-resolver-p0.js
```

Prueba estática:

```text
run: 30719074310
job: 91419680404
artifact: 8824265883
artifact digest: sha256:9c3dbc8ee18b2c09fcd3518d4877c5fe651461131ffb3d113d98df12f5b5a0f1
checks: 19/19
fixtures: 9
filas reales: 0
```

El resolver separa:

- coincidencia exacta única;
- alias único por aseguradora;
- renovación distinguida por recibo y prima;
- identidad respaldada por asegurado, ramo y recibo;
- conflictos de asegurado;
- números no mapeados;
- errores canónicos que requieren corregir la fuente;
- detalle agrupado insuficiente.

## 4. Diagnóstico vivo de identidad de póliza

```text
run: 30719208561
job: 91420032333
artifact: 8824310023
artifact digest: sha256:28518aead736f2d3709e02492d0e7f8eb99b0ba9a4d87a44bf9a5934d05e4567
resultado: PLANILLAS_POLICY_IDENTITY_DIAGNOSTIC_PASS
```

Resultado:

```text
filas procesadas: 65
identidades resueltas: 49
HOLD de identidad: 16
HOLD anteriores resueltos: 39
```

Decisiones sanitizadas:

```text
RESOLVE_EXACT_UNIQUE: 9
RESOLVE_ALIAS_UNIQUE: 16
RESOLVE_RENEWAL_BY_RECEIPT_AMOUNT: 22
RESOLVE_BY_INSURED_BRANCH_RECEIPT_AMOUNT: 2
HOLD_RENEWAL_AMBIGUITY_NO_RECEIPT_MATCH: 9
HOLD_INSURED_CONFLICT: 2
HOLD_POLICY_NUMBER_UNMAPPED: 2
HOLD_CANONICAL_POLICY_NUMBER_TYPO: 1
HOLD_GROUPED_POLICY_DETAIL_REQUIRED: 2
```

## 5. Resolver reusable de relación con recibos

Componente puro:

```text
orbit360-platform/core/planillas-comisiones-receipt-link-resolver-p0.js
```

Prueba estática:

```text
run: 30719316572
job: 91420315804
artifact: 8824340344
artifact digest: sha256:37b923832fc189733ea7f196672b9f1d73ee2031968c56a6e4dccf4698c0600a
checks: 14/14
fixtures: 6
filas reales: 0
```

El resolver prioriza referencias fuertes. Solo usa prima neta como fallback cuando existe un único recibo compatible en la misma moneda. Un importe repetido no autoriza elegir una cuota.

## 6. Diagnóstico vivo de recibos

```text
run: 30719464732
job: 91420695963
artifact: 8824388638
artifact digest: sha256:fd81c22fd70ad62511d2ec8a8a53f0f5d2aa3e058d0d31dcfd8a3f9cedffa054
HEAD auditado: 18ae924d6f2e97478be5ba44a51e245bc363d5de
resultado: PLANILLAS_RECEIPT_LINK_DIAGNOSTIC_PASS
```

Resultado sobre las 49 identidades de póliza resueltas:

```text
relaciones con recibo resueltas: 5
HOLD de recibo: 44
HOLD de póliza excluidos: 16
relaciones con cobros actuales: 0
```

Clasificación de los 44 HOLD:

```text
HOLD_RECEIPT_AMOUNT_AMBIGUOUS: 30
HOLD_RECEIPT_NOT_FOUND: 14
```

Los 30 casos ambiguos corresponden a pólizas con varios recibos que repiten la misma prima. Los 14 casos restantes no tienen un recibo compatible en el calendario vivo. La fuente no contiene una referencia fuerte suficiente para resolverlos.

## 7. Significado de las cinco relaciones resueltas

Las cinco relaciones son evidencia read-only de correspondencia entre una fila histórica, una póliza y un recibo. No son autorización para:

- crear una comisión;
- modificar el recibo;
- crear un cobro;
- producir un `finmov`;
- reconocer una cuenta por cobrar o pagar;
- liquidar al asesor.

Antes de una futura escritura deberá existir un dry-run específico de registros de comisión, idempotencia, diff, snapshot y rollback, seguido por autorización separada.

## 8. Controles preservados

```text
baseline pólizas: 1373
baseline recibosEsperados: 1294
baseline cobros: 5
baseline finmovs: 0
Firestore writes: 0
operational writes: 0
finance activated: false
browser: false
deploy: false
production: false
```

Los cinco cobros actuales corresponden a un corte posterior y no fueron vinculados con las planillas históricas de junio.

## 9. Carriles

### Carril A — UX y Academia

Debe mostrarse por separado:

```text
Póliza identificada
Recibo pendiente de identificar
Comisión aún no registrada
```

No mostrar una relación parcial como comisión confirmada.

### Carril B — backend, seguridad y gates

Los dos resolvers son componentes puros y desconectados. El gate fue read-only y no habilitó writer.

### Carril C — datos reales A&S

```text
filas con póliza identificada: 49
filas con póliza en HOLD: 16
filas con póliza y recibo identificados: 5
filas con recibo en HOLD: 44
filas escritas: 0
```

## 10. Siguiente acción exacta

```text
mantener las cinco relaciones como candidatos read-only
→ no escribir comisiones todavía
→ mantener 30 HOLD por cuota repetida hasta recibir requerimiento, serie, endoso o recibo autoritativo
→ mantener 14 HOLD como histórico sin recibo actual o fuente insuficiente
→ mantener 16 HOLD de póliza separados
→ preparar contrato de dry-run de comisión únicamente para las cinco relaciones inequívocas
→ comprobar idempotencia, estructura destino, asesor y ausencia de duplicados
→ solicitar autorización separada antes de cualquier escritura
```
