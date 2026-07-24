# Resultado M2 runtime productivo read-only — ENVIRONMENT_FAILURE

Fecha: 2026-07-23  
Gate: `block2-product-readonly-runtime-v20260723`  
Run: `30054801961`  
Commit: `8d797dc8fb9b96cb297c9d6b7741b8049a66db2d`  
Artifact: `8582366020`  
Digest: `sha256:b174f40a6b174b1049fd79777cbddc780e36de1c7f73a8fed64a175ed397c1ae`

## Resultado vinculante

```text
PRECHECK: GO_GATE_CONTRACT 164/164
CONTROL CONTRACT: PASS 30/30
PRIMERA ETAPA REAL FALLIDA: VERIFY_ENVIRONMENT_REFERENCES
CLASIFICACIÓN: ENVIRONMENT_FAILURE
```

No se ejecutaron Firebase, Firestore, Rules, Auth, membership, runtime, navegador, Hosting, Functions, importaciones ni Pólizas. Se realizaron cero escrituras de configuración y cero escrituras operativas.

## Referencias faltantes

El entorno `orbit360-product-readonly` no contiene:

- `ORBIT360_PRODUCT_FIREBASE_PROJECT_ID`
- `ORBIT360_PRODUCT_FIREBASE_SERVICE_ACCOUNT_JSON`
- `ORBIT360_PRODUCT_FIREBASE_WEB_API_KEY`
- `ORBIT360_PRODUCT_BOOTSTRAP_UID`
- `ORBIT360_PRODUCT_BOOTSTRAP_EMAIL`

Los nombres son evidencia sanitizada; los valores no existen en el reporte ni deben documentarse.

## Diagnóstico

La documentación viva ya señalaba que no existía `.firebaserc` ni proyecto productivo asociado. El gate confirmó que tampoco existen las referencias seguras requeridas. No es un defecto del frontend, de Cliente 360, de Aseguradoras, del store ni del validador.

## Acción permitida siguiente

1. crear o identificar el proyecto Firebase productivo autorizado;
2. habilitar Auth, Firestore y Storage;
3. configurar las cinco referencias en el entorno protegido de GitHub;
4. verificar únicamente presencia y alcance, sin mostrar valores;
5. solicitar una nueva autorización explícita de una sola ejecución.

Queda prohibido reutilizar LAB como producción, hardcodear el proyecto, mostrar secretos, repetir el gate sin insumo nuevo, modificar módulos para eludir el entorno o avanzar a Pólizas/M3.

## Claude y Academia

- Claude: no aplica; es `BACKEND_PROTEGIDO_NO_CLAUDE`.
- Academia: conservar como caso real de diferencia entre defecto funcional y fallo de entorno.
