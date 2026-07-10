# REGISTRO — INTEGRADOR SEGURO ASEGURADORAS P0.2 / INDEX

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy.

## 1. Motivo

El contrato y patch P0.2 fueron creados como archivos aditivos, pero todavía no están cargados desde `index.html`.

La documentación viva del backend prohíbe reemplazar o editar a ciegas el index por riesgo de:

- mojibake;
- pérdida de loaders LAB;
- pérdida del store protegido;
- duplicación de scripts;
- orden incorrecto;
- regresiones del shell.

## 2. Herramienta creada

```txt
tools/orbit360-integrar-aseguradoras-p02-index.mjs
```

Modo predeterminado:

```txt
check-only
sin escritura
```

Modo de aplicación futura:

```txt
node tools/orbit360-integrar-aseguradoras-p02-index.mjs --apply
```

`--apply` no se ejecutó en este bloque.

## 3. Controles

La herramienta valida:

- rama obligatoria antes de escribir;
- `<!DOCTYPE html>`;
- ausencia de replacement character;
- presencia de backend LAB loader/init;
- presencia de `data/store.js`;
- presencia de store Firestore LAB;
- presencia de `modules/aseguradoras.js`;
- cero tags duplicados;
- contrato P0.2 antes del módulo;
- patch P0.2 después del módulo;
- idempotencia.

Orden esperado:

```txt
core/aseguradoras-sensitive-p02.js
...
modules/aseguradoras.js
modules/aseguradoras-p02-sensitive.js
```

## 4. Backup y rollback

En modo `--apply`:

1. crea backup de `index.html`;
2. escribe UTF-8;
3. vuelve a leer;
4. ejecuta postvalidación;
5. si falla, restaura automáticamente el backup.

No ejecuta:

- commit;
- push;
- deploy;
- reglas;
- Auth;
- Storage;
- escrituras operativas.

## 5. Smoke

```txt
tools/orbit360-test-integrar-aseguradoras-p02-index.mjs
```

Cubre:

- primera inserción;
- orden de scripts;
- conservación de marcadores protegidos;
- segunda ejecución idempotente;
- duplicados bloqueados;
- mojibake bloqueado;
- ausencia de loader protegido bloqueada.

El workflow P0.2 ejecuta además el integrador sobre el index real en modo check-only.

## 6. Estado

```txt
HERRAMIENTA_IMPLEMENTADA
SMOKE_CREADO
WORKFLOW_ACTUALIZADO
INDEX_NO_MODIFICADO
PATCH_NO_ACTIVO_EN_SPA
APPLY_NO_EJECUTADO
```

## 7. Claude y Academia

Claude debe saber que el patch P0.2 existe y no debe borrarlo cuando se consolide la interfaz.

Academia no debe enseñar todavía que Mostrar/Copiar está operativo en producción. El estado correcto es:

```txt
flujo preparado
backend y empalme pendientes
```

## 8. Siguiente uso

La herramienta se ejecutará cuando corresponda el smoke local/navegador y exista un proveedor seguro o un stub explícitamente controlado para validar el flujo, siempre en la rama obligatoria y sin deploy automático.
