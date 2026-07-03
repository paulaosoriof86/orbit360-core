# Run maestro A&S LAB v99

**Fecha:** 2026-07-03  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**Script:** `tools/orbit360-run-flujo-ays-lab-v99.ps1`  
**Estado:** creado, pendiente ejecución local.

## 1. Objetivo

Reducir carga manual para Paula ejecutando en un solo flujo:

1. verificar repo;
2. sincronizar rama obligatoria;
3. ejecutar integración local de backend LAB en `index.html`;
4. ejecutar smoke A&S LAB v99;
5. reportar estado Git posterior.

## 2. Qué hace

El script maestro:

- hace `git fetch` de la rama obligatoria;
- cambia a `ays/backend-tenant-lab-v99-20260703`;
- hace `git pull --ff-only`;
- ejecuta `tools/orbit360-integrar-backend-lab-index.ps1`;
- ejecuta `tools/orbit360-smoke-ays-lab-v99.ps1`;
- genera reporte maestro;
- copia reporte al portapapeles;
- abre Notepad.

## 3. Qué NO hace

No hace:

- deploy;
- Hosting;
- producción;
- secretos;
- datos reales;
- commit automático;
- push automático;
- merge.

## 4. Reportes

Genera un reporte maestro:

```txt
_orbit360_reports/RUN-FLUJO-AYS-LAB-V99-<fecha>.txt
```

Y además los reportes individuales de:

```txt
INTEGRAR-BACKEND-LAB-INDEX-<fecha>.txt
SMOKE-AYS-LAB-V99-<fecha>.txt
```

## 5. Resultado esperado

El flujo maestro puede terminar como `EJECUTADO`, pero el criterio técnico real está en el reporte individual del smoke. El backend LAB se considera validado solo si el smoke dice:

```txt
RESULTADO SMOKE A&S LAB V99: COMPLETADO
```

## 6. Criterios de bloqueo

El flujo se bloquea si:

- no existe repo local;
- no puede cambiar a rama obligatoria;
- hay conflictos de Git;
- falta algún script requerido;
- falla integración local del index;
- falla smoke LAB;
- falta Firebase config local;
- no se autentica usuario LAB;
- falla CRUD ficticio.

## 7. Estado

**Estado:** LISTO PARA EJECUCIÓN LOCAL.  
**Siguiente acción:** usar este script cuando se quiera validar todo el flujo A&S LAB con la menor carga manual posible.
