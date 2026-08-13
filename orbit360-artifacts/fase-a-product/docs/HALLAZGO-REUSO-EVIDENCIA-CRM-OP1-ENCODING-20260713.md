# Hallazgo — falso bloqueo al reutilizar evidencia CRM OP-1

Fecha: 2026-07-13  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Carril: B — validación y continuidad 0% manual

## Estado previo confirmado

El reporte visual CRM OP-1 contenía:

```txt
10/10 escenarios aprobados
RESULTADO CRM OP-1: VALIDACIÓN VISUAL AUTOMÁTICA APROBADA
```

También existían las diez capturas correspondientes.

CRM OP-1 no debía volver a ejecutarse.

## Causa raíz

El reanudador de Aseguradoras:

1. elegía únicamente el archivo CRM más reciente;
2. leía con una sola interpretación de codificación;
3. exigía dos frases exactas con tildes;
4. no verificaba los diez IDs de escenario ni las capturas.

Una diferencia de codificación/acentos produjo un falso “reporte no aprobado”, aunque la evidencia real era 10/10.

## Corrección

`tools/orbit360-run-aseguradoras-op2-visual-resume.ps1` ahora:

- revisa todos los reportes CRM disponibles del más reciente al más antiguo;
- lee UTF-8 estricto y usa fallback del sistema si hace falta;
- normaliza Unicode y elimina dependencia de tildes;
- exige los diez IDs de escenario aprobados;
- exige el resumen 10/10 y el resultado aprobado;
- rechaza cualquier escenario visual fallido;
- exige las diez capturas físicas;
- selecciona automáticamente el primer conjunto completo;
- reutiliza CRM sin volver a ejecutarlo;
- ejecuta únicamente el gate visual pendiente de Aseguradoras.

## Metodología preservada

```txt
0% manual salvo iniciar un único comando local inevitable
sin repetir CRM
sin seleccionar archivos o carpetas
sin escoger puertos
sin cerrar otras aplicaciones
sin deploy, merge, main, datos reales, commit o push automático
```

## Estado

```txt
CRM OP-1: cerrado con evidencia 10/10
Aseguradoras OP-2: pendiente únicamente de reanudar sus 15 escenarios visuales
Falso bloqueo por reporte: corregido
```
