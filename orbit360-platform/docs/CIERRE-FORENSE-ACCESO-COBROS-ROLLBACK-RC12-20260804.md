# Cierre forense — acceso, Cobros y rollback RC1.2

Fecha: 2026-08-04

## 1. Decisión

```text
candidata acumulativa RC1.2: preservada
producto + módulos + datos: PASS 22/22
Gate 7.15.1 corregido: PASS 17/17
provisión temporal del run 30910775651: verificada y revertida
rollback recovery: PASS
Hosting RC1.2: no desplegado
producción Hosting: intacta
reimportación: no
```

La autorización produjo información concluyente sobre dos asuntos que estaban siendo mezclados:

1. los siete registros creados desde la plataforma no equivalían a siete usuarios de Firebase Auth;
2. el conteo `cobros: 5` describe documentos materializados en el snapshot, no todo el universo de pagos cobrados o conciliables.

## 2. Auditoría histórica del acceso

### 2.1 Qué significaba “Usuarios” en Equipo

En la baseline aceptada de Gate 7.11, el módulo Equipo obtenía su listado mediante:

```javascript
const team = S().all('asesores') || [];
```

Por tanto, la creación realizada desde esa interfaz persistía registros operativos de asesores/equipo en `Orbit.store`. No ejecutaba un flujo backend que creara simultáneamente:

- cuenta Firebase Auth;
- membership del tenant;
- proveedor de acceso;
- vínculo UID ↔ membership ↔ advisorId;
- invitación o credencial;
- auditoría y rollback.

La etiqueta visual “Usuarios” ocultaba esta diferencia. Esto constituye un `FUNCTIONAL_DEFECT` de autoadministración y un `DATA_CONTRACT_FAILURE` entre Equipo, Auth y memberships.

### 2.2 Por qué antes sí se podía ingresar

La baseline de Gate 7.11 todavía contenía un acceso LAB fijo:

```javascript
const LAB_EMAIL = 'orbit.lab@demo.com';
```

También proyectaba un rol de Dirección y conservaba fallbacks de demostración. Por eso el acceso exitoso anterior no prueba que las siete personas tuvieran cuentas Firebase normales. Prueba que el runtime de validación podía entrar mediante una identidad técnica fija.

### 2.3 Qué regresó en RC1.1

La reconstrucción acumulativa RC1.1 volvió a combinar owners históricos de:

- `core/auth.js`;
- `core/backend-lab-auth-guard.js`;
- `data/store-firestore-lab.local.js`.

Esa combinación reintrodujo identidad técnica, proyección forzada y comportamiento de compatibilidad. RC1.2 corrigió esos owners para exigir Firebase Auth normal y membership activa.

Clasificación de la regresión: `PIPELINE_MECHANISM_FAILURE`.

### 2.4 Qué existe realmente en el proyecto conectado

El censo read-only sobre `ays-orbit-360-lab` observó antes de la provisión:

```text
Firebase Auth users: 2
asesores/equipo: 7
memberships: 1
```

La identidad de servicio utilizada pertenece exactamente al mismo proyecto `ays-orbit-360-lab`. No se comprobó una conexión accidental con otro proyecto.

Conclusión:

```text
7 personas configuradas en Equipo
≠
7 cuentas Firebase Auth
```

El backend autoadministrable de Equipo sigue pendiente: crear una persona con acceso deberá convertirse en una operación única, auditada y reversible sobre Auth + membership + advisor/team record.

## 3. Ejecución de provisión y fallo posterior

### 3.1 Gate y provisión

Gate 7.15.1 quedó corregido y obtuvo:

```text
17/17 PASS
```

El censo resolvió por nombre canónico y digest a Dirección, Operativo y Asesor. Como no encontró cuentas normales existentes para esos tres correos aprobados, creó temporalmente:

```text
3 usuarios Firebase Auth
3 memberships
0 usuarios existentes modificados
0 credenciales expuestas
0 credenciales enviadas
```

La verificación posterior obtuvo PASS para los tres perfiles, incluido `advisorId` canónico.

### 3.2 Fallo de Gate 7.13

Gate 7.13 recibió una ruta temporal absoluta. Su owner aplicó `path.join(ROOT, rel)` incluso cuando `rel` ya era absoluta, produciendo una ruta duplicada.

Clasificación: `PIPELINE_MECHANISM_FAILURE`.

Owner corregido:

```text
tools/orbit360-validar-gate-contracts-engine-rc12-rootcause-cumulative-closure-v20260803.mjs
```

La lectura y existencia de archivos ahora distinguen rutas absolutas y relativas.

### 3.3 Fallo del rollback inicial

El rollback original leía un documento y lo borraba dentro del mismo ciclo de una transacción. Después del primer `tx.delete`, intentaba ejecutar otra lectura, lo que Firestore rechaza.

Clasificación: `PIPELINE_MECHANISM_FAILURE`.

Owner corregido:

```text
tools/orbit360-provisionar-roster-aprobado-final-rc12-v20260804.mjs
```

Ahora primero lee y valida todos los documentos y solo después ejecuta todos los deletes.

## 4. Recuperación exacta

```text
run: 30911627137
job: 91999553849
artifact: 8893311529
artifactDigest: sha256:8dc8bf7f5210e0c283032171d3ff4028eaa2be33060213dbd088e838621ad844
Gate 7.15.2: 14/14 PASS
```

Antes de borrar, cada uno de los tres usuarios y memberships cumplió:

- digest de correo igual al padrón aprobado;
- creación dentro de la ventana exacta del run fallido;
- proveedor `password`;
- identidad técnica excluida;
- membership con `onboardingRunId = 30910775651`;
- `onboardingVersion = rc12-approved-roster-final-v1`;
- document ID igual al UID;
- tenant exacto.

Resultado:

```text
memberships eliminadas: 3
usuarios Auth eliminados: 3
memberships del run remanentes: 0
usuarios del run remanentes: 0
Hosting deploy intentado: no
producción tocada: no
```

Commit de root fixes:

```text
ac1b292e9492be3066cdee4e53ecef6ae3bec2ab
```

## 5. Semántica correcta de Cobros

El snapshot aceptado contiene:

```text
cobros operativos materializados: 5
documentos canónicos de cobro: 7
```

Eso no significa que A&S solo haya cobrado cinco pagos.

La evidencia privada ya procesada registra además:

```text
pagos reportados no conciliados: 365
sin saldo pendiente según aseguradora: 211
recibos en HOLD: 44
fuentes SIGA excluidas/sustituidas: 20
```

Las planillas de comisiones registraron:

```text
filas de detalle: 67
filas elegibles para CRM: 65
pares exactos de conciliación: 8
impacto financiero activado: no
```

### 5.1 Estados que no pueden mezclarse

1. **Cobro materializado:** ya existe como documento operativo aprobado.
2. **Pago reportado:** existe evidencia, pero falta conciliación.
3. **Pago inferido por secuencia:** una cuota posterior aparece pagada o una anterior dejó de aparecer; es una hipótesis trazable, no un cobro definitivo.
4. **Sin saldo según aseguradora:** evidencia fuerte, pero requiere vínculo con recibo/póliza y periodo.
5. **Evidencia de comisión:** puede respaldar recaudo y comisión, pero no crea automáticamente cobro.
6. **Movimiento financiero:** se deriva después de conciliación y clasificación; cobros y recaudos no son `finmovs`.

El número 5 queda oficialmente rotulado como `cobrosMaterializados`, nunca como `totalCobrado`.

## 6. Tratamiento de las nuevas planillas

Las nuevas planillas se procesarán incrementalmente por:

```text
fuente + aseguradora + país + moneda + periodo + digest
```

No se reimportará todo el universo. Cada paquete deberá producir:

- filas directas;
- filas inferidas;
- filas no resolubles;
- crear/actualizar/omitir/requiere validación;
- conciliación contra pólizas, recibos, cartera, banco y planillas previas;
- cobros materializables;
- comisiones materializables;
- impacto financiero derivado por separado;
- auditoría y rollback.

Una planilla puede impactar CRM, conciliación, comisiones y finanzas, pero mediante registros separados y después de superar sus respectivos gates. No se escribirá un `finmov` directamente desde una fila de planilla.

## 7. Estado actual

```text
candidata RC1.2: intacta
snapshot canónico: intacto
objetos temporales del run fallido: 0
Hosting RC1.2: no desplegado
root fix Gate 7.13: persistido
root fix rollback: persistido
semántica de Cobros: corregida y documentada
```

## 8. Siguiente frontera

La siguiente ejecución deberá volver a provisionar los tres perfiles únicamente después de Gate 7.15.1, ejecutar Gate 7.13 con el owner corregido, tomar snapshot, desplegar solo Hosting y ejecutar el smoke de tres perfiles. Debe conservar el rollback corregido y detenerse ante cualquier nuevo fallo.
