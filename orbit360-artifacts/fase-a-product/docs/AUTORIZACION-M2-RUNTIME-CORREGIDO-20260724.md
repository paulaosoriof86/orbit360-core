# Autorización única — runtime M2 corregido 2.2.1

Fecha: 2026-07-24  
Gate: `block2-product-readonly-runtime-v20260723`  
Proyecto existente: `ays-orbit-360-lab`

## Alcance autorizado

Una sola ejecución read-only del runtime corregido `2.2.1`, reutilizando exclusivamente Auth y membership existentes y aplicando la transición controlada de identidad existente.

## Límites vinculantes

```text
Allowed executions: 1
Crear proyecto: no
Crear o modificar Auth: no
Crear o modificar membership: no
Modificar Rules: no
Escrituras de configuración: 0
Escrituras operativas: 0
Hosting/Functions: no
Importaciones: no
Pólizas/M3: no
Merge/main: no
```

## Precondiciones

- causa raíz `VALIDATOR_STALE` probada;
- validador corregido fail-closed;
- request v2 inmutable ligado al HEAD inmediatamente anterior;
- preflight canónico antes de secretos;
- proyecto, Auth y membership existentes únicamente.

## Aceptación

Solo se acepta evidencia sanitizada `ok:true` que confirme:

- identidad existente controlada aceptada;
- store instalado;
- snapshots adjuntos;
- no fallback;
- store sin escritura;
- intento local de escritura bloqueado;
- cero cambios de Rules;
- cero escrituras de configuración u operativas.

No se autoriza reintento automático. Ante fallo, se detiene y clasifica la primera frontera real.
