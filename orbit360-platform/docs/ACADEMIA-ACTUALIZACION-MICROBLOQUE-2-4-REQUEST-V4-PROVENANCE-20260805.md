# ACADEMIA — REQUEST V4, PROVENANCE Y GATES SOURCE-ONLY

Fecha: 2026-08-05  
RC de referencia: `RC-AYS-LAB-CANONICA-01`  
Microbloque: `2.4`  
Gate: `PASS_REQUEST_V4_PROVENANCE_COMPOSITION`

## Objetivo formativo

Enseñar cómo distinguir un defecto funcional del producto de un fallo del mecanismo que prepara o valida una ejecución, y cómo probar el control plane sin acceder a secretos, datos o infraestructura.

## Caso estudiado

Una ejecución LAB se detuvo antes del preflight canónico con:

```text
fatal: Invalid revision range <baseline>..HEAD^
```

El producto no había fallado. El checkout del workflow era superficial y no contenía el commit baseline requerido para verificar provenance.

Clasificación correcta:

```text
PIPELINE_MECHANISM_FAILURE
```

No correspondía clasificarlo como:

```text
FUNCTIONAL_DEFECT
DATA_CONTRACT_FAILURE
SECURITY_FAILURE
```

## Conceptos clave

### 1. Provenance antes de capacidades

Antes de leer secretos o ejecutar Firebase debe demostrarse:

- que el baseline existe en el checkout;
- que es ancestro del parent HEAD;
- que el producto no cambió frente al baseline congelado;
- que el commit disparador contiene únicamente el request autorizado.

Contrato aplicado:

```text
fetch-depth: 0
git cat-file -e "$ORBIT360_SOURCE_BASELINE^{commit}"
git merge-base --is-ancestor <baseline> HEAD^
git diff --quiet <baseline> HEAD^ -- <paths de producto>
```

### 2. Request source-only y request runtime son distintos

El request source-only permite validar contratos y provenance con todas las capacidades operativas en `false`.

El request runtime puede existir solamente después de una autorización explícita nueva.

```text
source-only consumido:
.github/orbit360-requests/block12-go-lab-candidate-visible-v4-source-only.json

runtime futuro ausente:
.github/orbit360-requests/block12-go-lab-candidate-visible-v4.json
```

### 3. Un request disparador consumido es inmutable

Nunca se marca un request como consumido modificando el mismo archivo que dispara el workflow. El consumo se registra en lifecycle, ledger y evidencia separados.

Esta regla evita ejecuciones administrativas accidentales y garantiza que cada commit disparador sea auditable.

### 4. Outer router e inner engine deben probarse juntos

No basta con validar sus archivos por separado. El gate source-only ejecutó:

```text
outer router → lifecycle → inner engine → preflight sanitizado
```

Resultado:

```text
continuidad/provenance: 33/33 PASS
inner preflight: 32/32 PASS
outer router exit: 0
inner engine reached: true
```

### 5. Source-only significa cero capacidades

La prueba confirmó:

```text
runtime: no
secretos: no
Firebase: no
Firestore: no
Functions: no
Hosting: no
navegador: no
deploy: no
Rules: no
reimportación: no
producción/main/merge: no
```

## Enseñanza por rol

### Dirección

Debe leer el veredicto de salida: qué gate pasó, qué autorización sigue pendiente y si existe riesgo para producto, datos o producción.

### Operativo

Debe entender la evidencia del gate, el owner de un fallo y la diferencia entre una etapa no ejecutada y una capacidad que realmente falló.

### Asesor

No debe recibir copy técnico en la interfaz cliente. Para este rol solo importa que la plataforma muestre estados operativos honestos y relaciones autorizadas dentro de su scope.

## Regla reutilizable

Cuando una ejecución se detiene antes de secretos:

1. identificar la primera etapa fallida;
2. clasificar la causa;
3. comprobar si el producto llegó a ejecutarse;
4. congelar runtime si el mismo mecanismo falla dos veces;
5. corregir y validar source-only;
6. solicitar una autorización nueva solamente después del PASS integrado.

## Evidencia

```text
run: 30979519198
artifactId: 8919572096
checks: 33/33 PASS
inner preflight: 32/32 PASS
```
