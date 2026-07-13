# Hallazgo visual Aseguradoras OP-2 — 12/15 aprobados

Fecha: 2026-07-13  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Carriles: A/B  
Estado: pendiente únicamente de tres vistas de Plataformas

## Evidencia aprobada reutilizable

El gate visual confirmó 12/15 escenarios:

```txt
dir-directorio-desktop
dir-resumen-desktop
dir-contactos-desktop
dir-bancos-desktop
dir-documentos-desktop
dir-tarifas-desktop
op-directorio-tablet
op-resumen-tablet
op-bancos-tablet
ase-directorio-mobile
ase-resumen-mobile
ase-bancos-mobile
```

Esto confirma:

- directorio y ficha-página;
- resumen operativo;
- contactos, documentos y tarifas;
- responsive desktop/tablet/móvil;
- ausencia de overflow, errores JS y copy técnico;
- cuenta bancaria completa y copiable para Dirección, Operativo y Asesor.

## Tres escenarios pendientes

```txt
dir-plataformas-desktop
op-plataformas-tablet
ase-plataformas-mobile
```

### Dirección y Operativo

El componente y los botones aparecieron, pero el smoke leyó el DOM 500 ms después del clic y no encontró todavía usuario/contraseña revelados.

No hubo:

```txt
error JavaScript
overflow
copy técnico
botón ausente
```

Debe distinguirse entre demora del harness, wiring del botón o respuesta del proveedor antes de modificar código operativo.

### Asesor

Se confirmó:

```txt
sin botones de credenciales
sin usuario/contraseña revelados
sin error JS
sin overflow
```

El smoke falló porque no encontró una frase exacta de restricción. La validación correcta debe usar el marcador estructural `.asg218-restricted`, no depender de una cadena visible o de su tiempo de render.

## Corrección metodológica

No se repiten CRM ni los otros doce escenarios de Aseguradoras.

Nuevos archivos:

```txt
tools/orbit360-smoke-op2-plataformas-focused-v1218.mjs
tools/orbit360-validar-smoke-op2-plataformas-focused-v1218.mjs
tools/orbit360-run-aseguradoras-op2-plataformas-resume.ps1
```

La reanudación focalizada:

1. verifica CRM 10/10 existente;
2. verifica Aseguradoras 12/15 y sus capturas;
3. ejecuta solo tres escenarios de Plataformas;
4. espera el render operativo real;
5. espera el botón habilitado y el resultado visible;
6. comprueba también la respuesta directa del proveedor;
7. valida al Asesor por marcador estructural y ausencia de secretos;
8. combina automáticamente 12 + 3 para declarar 15/15 únicamente si todo pasa.

## Metodología 0% manual

```txt
una sola ejecución local
sin seleccionar archivos
sin escoger puerto
sin cerrar aplicaciones
sin repetir CRM
sin repetir los doce escenarios aprobados
sin deploy, producción, merge, main, datos reales, commit o push automático
```

## Siguiente acción

Ejecutar únicamente la reanudación focalizada. Si aprueba 3/3, CRM OP-1 y Aseguradoras OP-2 quedan cerrados visualmente. Después corresponde Carril C: dry-run separado del directorio GT y luego del directorio CO.
