# Corrección de causa raíz — M2 y proyecto Firebase existente

Fecha: 2026-07-24  
Gate: `block2-product-readonly-runtime-v20260723`  
Run analizado: `30054801961`

## Corrección vinculante

El proyecto Firebase de Orbit 360 **sí existe** y ya ha sido utilizado por workflows anteriores:

```text
projectId: ays-orbit-360-lab
Auth: existente
Firestore: existente
Rules: existentes
Membresías/roles: existentes
Cuenta de servicio: disponible mediante aliases históricos del repositorio
```

La ejecución 30054801961 no probó ausencia del proyecto. Se detuvo porque el workflow nuevo creó el entorno GitHub `orbit360-product-readonly` y buscó cinco nombres nuevos que no habían sido reconciliados con las referencias existentes.

## Causa raíz corregida

```text
Clasificación anterior: ENVIRONMENT_FAILURE
Clasificación correcta: PIPELINE_MECHANISM_FAILURE
```

El mecanismo introdujo nombres y un entorno nuevos sin auditar primero:

- `FIREBASE_SERVICE_ACCOUNT_ORBIT360_LAB`;
- `FIREBASE_SERVICE_ACCOUNT_ORBIT_360_LAB`;
- `FIREBASE_SERVICE_ACCOUNT`;
- el proyecto conocido `ays-orbit-360-lab`;
- los usuarios y memberships ya creados.

También pretendía aplicar Rules globales durante el mismo intento. Sobre el proyecto que mantiene el LAB, esa acción podía afectar el baseline validado. Por ello, Rules quedan totalmente bloqueadas hasta completar una reconciliación read-only y definir una estrategia que no destruya LAB.

## Corrección implementada

1. Se reutiliza el proyecto existente; no se crea otro.
2. Se reutilizan los aliases históricos de cuenta de servicio.
3. Se elimina el entorno GitHub nuevo como requisito del diagnóstico.
4. Se retiran del gate de reconciliación la Web API key y la identidad bootstrap inventada.
5. Auth y memberships se inspeccionan en solo lectura y con evidencia sanitizada.
6. No se crean usuarios ni memberships.
7. No se aplican Rules.
8. No se ejecuta runtime, navegador, Hosting, Functions, importaciones, Pólizas ni M3.

## Criterio de salida del diagnóstico

```text
PROJECT IDENTITY: MATCH
AUTH READABLE: PASS
MEMBERSHIP READABLE: PASS
ACTIVE MEMBERSHIP LINKED TO AUTH: PASS
RULES: UNCHANGED
WRITES: ZERO
EVIDENCE: SANITIZED
```

Solo después de este diagnóstico podrá diseñarse el siguiente gate runtime contra la identidad real existente y sin alterar el LAB.
