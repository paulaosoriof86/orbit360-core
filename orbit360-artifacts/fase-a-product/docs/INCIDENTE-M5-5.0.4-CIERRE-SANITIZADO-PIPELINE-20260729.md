# Incidente M5 5.0.4 — cierre sanitizado posterior a entrega Hosting LAB

Fecha: 2026-07-29  
Gate: `block5-release-candidate-visualization-v20260728`  
Run: `30411375732`  
Job: `90447991314`

## Clasificación

`PIPELINE_MECHANISM_FAILURE`

No corresponde a `FUNCTIONAL_DEFECT`, `DATA_CONTRACT_FAILURE`, `ENVIRONMENT_FAILURE` ni `SECURITY_FAILURE`.

## Necesidad y esperado

Después de una única entrega Hosting LAB de la RC `d90ec601…`, el workflow debía:

1. comprobar paridad pública 24/24;
2. construir el resumen sanitizado;
3. validar el cierre;
4. publicar estado observable verde.

## Resultado operativo

Los pasos operativos sí finalizaron correctamente:

- solicitud inmutable: PASS;
- preflight canónico: 16/16;
- contrato ejecutable: 31/31;
- identidad exclusiva de Hosting LAB: PASS;
- entrega Hosting LAB: ejecutada una vez;
- revalidación pública: 24/24, cero diferencias;
- RC: `d90ec601d17c8e750cbba6f19197d3f906b29a1377817f53fb73f0779e843045`.

No se ejecutaron Firestore, escrituras operativas, navegador, Functions, Rules, producción, `main`, merge ni Pólizas.

## Causa raíz

Archivo:

`.github/workflows/orbit360-m5-lab-hosting-delivery-v20260728.yml`

Etapa:

`Cerrar evidencia sanitizada de entrega`

Expresión defectuosa:

```js
r && r.remoteLab?.mismatchCount ?? 24
```

JavaScript no permite mezclar `??` con operadores lógicos sin paréntesis. El error ocurrió después de que Hosting y la revalidación 24/24 ya habían concluido.

## Corrección

Se separó el valor en una expresión explícita:

```js
const mismatchCount = (r && r.remoteLab?.mismatchCount) ?? 24;
```

La corrección no toca la RC, los activos publicados, datos, backend ni autorización de deploy. El workflow no se reejecuta porque la autorización de Hosting quedó consumida al completarse el paso de publicación.

## Evidencia

- Run: `30411375732`
- Artifact: `8708510538`
- Artifact digest: `sha256:fbe4ba382fe6d51294b2a08f17e2ba48a35e8b36dd0973303943cef8c631e1ec`
- Evidencia sanitizada persistida: `runtime-gate-crm-v20260716/m5-lab-hosting-delivery-504-remote-parity-evidence.json`

## Impacto y estado

- Impacto funcional: ninguno.
- Impacto en datos: ninguno.
- Impacto en seguridad: ninguno.
- Impacto en paridad LAB: ninguno.
- Estado: causa raíz corregida; cierre documental reparado sin segundo deploy.

## Academia

Este incidente demuestra por qué un status rojo del pipeline no debe interpretarse automáticamente como fallo del producto. Primero se debe identificar la etapa exacta y distinguir:

- resultado operativo ya completado;
- validador o mecanismo de cierre defectuoso;
- necesidad real o no de reintento.

En este caso, reintentar el workflow habría duplicado un deploy ya exitoso. La acción correcta fue consumir la autorización, reparar el mecanismo y cerrar con la evidencia durable existente.
