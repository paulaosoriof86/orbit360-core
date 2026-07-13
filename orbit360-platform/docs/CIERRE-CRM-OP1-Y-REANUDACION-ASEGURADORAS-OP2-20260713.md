# Cierre CRM OP-1 y reanudación exclusiva Aseguradoras OP-2

Fecha: 2026-07-13  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge ni deploy

## Resultado recibido

### CRM OP-1

```txt
Validador CRM: 65 pass / 0 fail
Cotizador-Comparativo relacionado: 41 pass / 0 fail
Matriz visual: 10/10
Errores JavaScript: 0
Overflow global: 0
Copy técnico visible: 0
Backend protegido: OK
```

Decisión:

```txt
CRM OP-1 = CERRADO FUNCIONAL Y VISUALMENTE EN DEMO
```

Las advertencias restantes no reabren CRM:

- la fuente separada de Pólizas pertenece al siguiente carril C;
- el warning de visual gate quedó satisfecho por el mismo reporte 10/10.

## Aseguradoras OP-2

Antes de la matriz visual:

```txt
Política cuentas/credenciales: 32 pass / 0 fail
Validador Aseguradoras: 89 pass / 0 fail
Backend protegido: OK
```

Los 15 escenarios fallaron por la misma excepción del harness:

```txt
ReferenceError: view is not defined
```

Causa raíz:

```js
{ roleAvailable, view, route: ... }
```

se ejecutaba dentro del HTML generado, donde la variable disponible era `VIEW`.

Corrección:

```js
{ roleAvailable, view: VIEW, route: ... }
```

No existe evidencia de fallo funcional del módulo en ese reporte; el bloqueo fue del instrumento de prueba.

## Prevención de reproceso

Se agregó:

```txt
tools/orbit360-validar-smoke-aseguradoras-op2-v1218.mjs
tools/orbit360-run-aseguradoras-op2-visual-resume.ps1
```

El validador impide volver a introducir una referencia libre a `view` y conserva las 15 verificaciones de roles, cuentas y credenciales.

El ejecutor de reanudación:

1. comprueba que exista evidencia CRM 10/10 aprobada;
2. no vuelve a ejecutar CRM;
3. confirma integración idempotente;
4. valida el harness corregido;
5. valida Aseguradoras y su política de recursos;
6. selecciona puerto libre automáticamente;
7. ejecuta únicamente los 15 escenarios de Aseguradoras;
8. abre y copia el reporte.

## Metodología 0% manual

```txt
No cerrar aplicaciones.
No seleccionar puerto.
No editar archivos.
No volver a ejecutar CRM.
No abrir rutas manualmente.
No copiar capturas una por una.
No usar datos reales.
```

La única acción local inevitable es iniciar el ejecutor de reanudación. Todo lo demás queda automatizado.

## Estado

```txt
CRM OP-1: CERRADO
Aseguradoras OP-2 funcional/estático: APROBADO
Aseguradoras OP-2 visual: PENDIENTE ÚNICAMENTE DE REEJECUCIÓN DEL HARNESS CORREGIDO
Carril C GT/CO: PENDIENTE DESPUÉS DEL CIERRE VISUAL OP-2
```
