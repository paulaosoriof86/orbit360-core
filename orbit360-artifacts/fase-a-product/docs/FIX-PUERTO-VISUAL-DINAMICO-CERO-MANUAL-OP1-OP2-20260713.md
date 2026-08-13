# Fix de puerto visual dinámico — OP1/OP2

Fecha: 2026-07-13  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Carril: B — pipeline local, validación y seguridad

## Incidente

El runner común quedó bloqueado al encontrar el puerto `5000` ocupado por otra aplicación local:

```txt
firebase serve --only hosting --project finanzas-personales-paula-dev --port 5000
```

El comportamiento anterior protegió correctamente la otra aplicación y no la detuvo, pero exigía liberar el puerto manualmente. Eso contradice la metodología 0% manual cuando existe una alternativa automatizable y segura.

## Regla corregida

```txt
No cerrar aplicaciones ajenas.
No pedir al usuario liberar puertos.
No reutilizar a la fuerza un puerto ocupado.
Seleccionar automáticamente un puerto loopback libre.
```

El puerto preferido continúa siendo `5000`. Si está ocupado, el runner prueba en orden:

```txt
5001 ... 5040
```

La selección se registra en el reporte y se transmite a los smokes CRM OP1 y Aseguradoras OP2.

## Implementación

Archivo:

```txt
tools/orbit360-run-operacion-op1-op2-visual.ps1
```

Funciones agregadas:

```txt
Test-LocalPortAvailable
Describe-PortOwner
Resolve-VisualPort
```

Comportamiento:

1. prueba disponibilidad mediante `TcpListener` en loopback;
2. conserva cualquier proceso existente;
3. documenta propietario y comando del puerto ocupado cuando Windows permite resolverlos;
4. elige el primer puerto libre;
5. ejecuta el smoke CRM;
6. vuelve a confirmar o reseleccionar puerto para Aseguradoras;
7. no usa `Stop-Process`;
8. no requiere intervención humana.

## CI preventivo

Archivo:

```txt
.github/workflows/orbit360-aseguradoras-op2-smoke.yml
```

El workflow exige:

```txt
Resolve-VisualPort 5000
no process is stopped
```

y rechaza cualquier reintroducción de:

```txt
Stop-Process
```

en el runner común.

## Metodología 0% manual

La política queda explícita:

- sincronización, integración, selección de puerto, validadores, smokes, capturas y reporte deben ser automáticos;
- PowerShell solo se usa como punto de entrada indispensable a la máquina local;
- no se pide cerrar aplicaciones, mover archivos, editar `index.html`, escoger puertos ni abrir rutas manualmente;
- una intervención humana solo se solicita cuando requiere juicio visual final, autorización sensible o acceso a una fuente real que el sistema no puede obtener por sí mismo.

## Estado

```txt
Causa raíz: puerto fijo ocupado por otra aplicación
Otra aplicación detenida: NO
Puerto 5000 alterado: NO
Fallback automático: IMPLEMENTADO
CI preventivo: IMPLEMENTADO
Deploy/producción/datos reales: NO
Siguiente acción local: ejecutar una vez el mismo runner; se sincroniza y relanza solo
```
