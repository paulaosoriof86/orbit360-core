# Registro fix de acceso y validación idempotente LAB

Fecha: 2026-07-17

Rama: `ays/backend-tenant-lab-v99-20260703`

PR: #5 draft/open

Alcance: LAB; sin producción, merge ni `main`.

## Necesidad

El formulario de acceso LAB quedaba esperando y el recorrido visual no avanzaba hacia Cliente 360 y Aseguradoras. Además, la validación previa repetía tareas de preparación aunque los recursos necesarios ya existieran.

## Cambios

- Manejo de sesión con límite de espera y mensajes visibles.
- Caché del navegador versionada y estrategia de red primero.
- Entrada LAB con limpieza controlada y carga explícita del recurso vigente.
- Preparación administrativa idempotente: verifica recursos existentes sin volver a modificarlos.
- Verificador read-only sanitizado disponible para evolución del pipeline.

## Carriles

### A — Frontend

No se reemplazó el prototipo ni los renderers de Cliente 360 o Aseguradoras. El cambio visible se limita al acceso LAB y manejo de caché.

### B — Backend y seguridad

No se modificaron `Orbit.store`, el adaptador de datos, reglas ni importadores. Se redujeron operaciones administrativas repetidas durante validaciones visuales.

### C — Datos reales

No se reimportaron ni modificaron clientes o aseguradoras. Conteos confirmados antes del incidente: 414 clientes, 26 aseguradoras y 7 asesores.

## Patrón reutilizable para Claude y Academia

- Un gate visual debe verificar, no repetir preparación administrativa.
- Separar preparación, reparación y validación read-only.
- Versionar recursos críticos y service workers.
- Usar red primero para recursos sensibles al runtime y caché solo como respaldo.
- Mostrar un límite de espera y un mensaje útil; nunca dejar una acción indefinidamente pendiente.
- No repetir cargas ni modificar datos para resolver un problema de acceso.

## Estado

`IMPLEMENTADO_PENDIENTE_GATE_RUNTIME_FINAL`.
