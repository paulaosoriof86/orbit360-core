# Resultado M2 — reconciliación del proyecto Firebase existente

Fecha: 2026-07-24  
Gate: `block2-product-readonly-runtime-v20260723`  
Contrato: `2.1.1`  
Run: `30094359595`  
Commit evaluado: `7df2bdb43008e9f9a55a440645ae8e6bc7fd4403`  
Artifact: `8596955497`  
Digest: `sha256:fc1b8b8766156d1ced5a3a873ddcf3e1b5a9aaef8dfee25c5611a21ac06d0769`

## Resultado vinculante

```text
Preflight canónico: GO_GATE_CONTRACT 119/119
Contrato de reconciliación: PASS 15/15
Resultado: EXISTING_ORBIT_PROJECT_RECONCILED_READ_ONLY
```

## Infraestructura confirmada

```text
Proyecto Firebase: ays-orbit-360-lab
Identidad del proyecto: MATCH
Proyecto existente reutilizado: sí
Proyecto nuevo requerido: no
Alias histórico de cuenta de servicio: resuelto
Auth: legible
Usuarios Auth: 2
Memberships tenant alianzas-soluciones: 1
Membership activa: 1
Membership activa enlazada a Auth: 1
Candidato privilegiado inicial: 1
```

Roles canónicos observados:

- Dirección
- SuperAdmin
- AdminTenant
- Operativo
- Asesor

## Seguridad y no regresión

```text
Escrituras operativas: 0
Escrituras de configuración: 0
Rules modificadas: no
Runtime ejecutado: no
Navegador ejecutado: no
Hosting desplegado: no
Functions desplegadas: no
Importaciones: no
Pólizas/M3: no
Producción tocada: no
PII/secretos en evidencia: no
```

## Causa raíz cerrada

La ejecución anterior no probó que Firebase estuviera ausente. El fallo provenía del pipeline: se introdujo un entorno GitHub nuevo y nombres nuevos de secretos sin reconciliarlos con el proyecto y aliases existentes. La clasificación vinculante queda corregida a `PIPELINE_MECHANISM_FAILURE`.

## Siguiente frontera

Preparar el runtime M2 usando la identidad, Auth y membership existentes, sin modificar Rules y sin crear infraestructura duplicada. Cualquier nueva ejecución externa requerirá un preflight actualizado y una autorización única nueva.
