# Autorización única M2 — runtime read-only con identidad existente

Fecha: 2026-07-24  
Gate: `block2-product-readonly-runtime-v20260723`  
Contrato: `2.2.0`  
Proyecto: `ays-orbit-360-lab`

## Autorización recibida

Paula autorizó una única ejecución del runtime M2 read-only reutilizando exclusivamente Auth y membership existentes.

## Alcance permitido

- una ejecución;
- preflight canónico antes de secretos;
- resolución de la cuenta de servicio mediante aliases históricos existentes;
- lectura de configuración web de Firebase;
- selección exacta de la identidad Auth + membership elegible ya existente;
- tenant derivado únicamente desde membership;
- ejecución del bootstrap y `Orbit.store` read-only canónicos;
- evidencia exclusivamente sanitizada.

## Prohibiciones vinculantes

```text
Crear proyecto Firebase: no
Crear o modificar usuarios Auth: no
Crear o modificar memberships: no
Modificar Firestore Rules o Storage Rules: no
Escrituras de configuración: 0
Escrituras operativas: 0
Hosting o Functions: no
Importaciones: no
Pólizas: no
M3: no
Merge o main: no
```

## Aceptación

Solo se acepta `ok:true` con identidad de proyecto coincidente, exactamente una identidad elegible, tenant desde membership, bootstrap canónico `ready-read-only`, store sin fallback, escrituras bloqueadas, Rules intactas y cero escrituras.

## Metodología

Ante el primer fallo se detiene la ejecución y se conserva la clasificación real. No se reintenta la misma etapa ni se crea otro parche o proyecto para eludir el fallo.

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`.  
Academia: actualización `1.239`.
