# Checklist validación Marketing + Integraciones · Orbit 360

**Fecha:** 2026-07-03  
**Base:** Claude v1.97  
**Estado:** preparado para uso posterior.

---

## Objetivo

Dejar claros los criterios mínimos para validar el frente Marketing + Integraciones antes de considerarlo cerrado.

---

## Validación técnica esperada

Debe confirmarse:

- archivos críticos presentes;
- `Orbit.integraciones` disponible;
- Marketing emitiendo eventos seguros;
- panel diagnóstico disponible;
- mock LAB disponible;
- botón LAB solo en entorno demo o desarrollo;
- reglas seguras sin llamadas externas directas;
- sin credenciales ni secretos;
- sin storage directo desde módulos;
- sintaxis JS válida.

---

## Validación visual esperada

Debe confirmarse:

- Marketing permite generar eventos desde botones de trabajo;
- el panel de integraciones abre correctamente;
- los eventos se ven con estado y proveedor;
- la simulación LAB cambia estado sin conexión real;
- la UI no muestra notas técnicas;
- producción no muestra controles LAB.

---

## Estado

**PENDIENTE DE EJECUCIÓN LOCAL CUANDO SEA NECESARIO.**
