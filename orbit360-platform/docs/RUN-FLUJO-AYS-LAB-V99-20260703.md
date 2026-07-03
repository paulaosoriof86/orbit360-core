# Run maestro A&S LAB v99

**Fecha:** 2026-07-03  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**Script:** `tools/orbit360-run-flujo-ays-lab-v99.ps1`  
**Estado:** creado, pendiente ejecución local.

## 1. Objetivo

Reducir carga manual para Paula ejecutando en un solo flujo:

1. verificar repo;
2. sincronizar rama obligatoria;
3. validar/preparar config Firebase LAB local;
4. ejecutar integración local de backend LAB en `index.html`;
5. ejecutar smoke A&S LAB v99;
6. reportar estado Git posterior.

## 2. Qué hace

El script maestro:

- hace `git fetch` de la rama obligatoria;
- cambia a `ays/backend-tenant-lab-v99-20260703`;
- hace `git pull --ff-only`;
- verifica que exista `orbit360-platform/core/auth-firebase.config.local.js`;
- verifica que la config local no tenga placeholders `REEMPLAZAR_`;
- ejecuta `tools/orbit360-integrar-backend-lab-index.ps1`;
- ejecuta `tools/orbit360-smoke-ays-lab-v99.ps1`;
- genera reporte maestro;
- copia reporte al portapapeles;
- abre Notepad.

## 3. Config Firebase LAB local

El archivo local real debe existir aquí:

```txt
orbit360-platform/core/auth-firebase.config.local.js
```

Ese archivo está ignorado por Git y no debe subirse.

Si falta, se puede ejecutar el flujo maestro con:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tools/orbit360-run-flujo-ays-lab-v99.ps1 -PrepararConfig
```

Eso crea el archivo local desde:

```txt
orbit360-platform/core/auth-firebase.config.local.example.js
```

Luego abre Notepad para reemplazar placeholders con la config LAB autorizada. No se deben pegar secretos en chats ni reportes.

## 4. Qué NO hace

No hace:

- deploy;
- Hosting;
- producción;
- secretos en reporte;
- datos reales;
- commit automático;
- push automático;
- merge.

## 5. Reportes

Genera un reporte maestro:

```txt
_orbit360_reports/RUN-FLUJO-AYS-LAB-V99-<fecha>.txt
```

Y además los reportes individuales de:

```txt
PREPARAR-CONFIG-FIREBASE-LAB-LOCAL-<fecha>.txt
INTEGRAR-BACKEND-LAB-INDEX-<fecha>.txt
SMOKE-AYS-LAB-V99-<fecha>.txt
```

## 6. Resultado esperado

El flujo maestro puede terminar como `EJECUTADO`, pero el criterio técnico real está en el reporte individual del smoke. El backend LAB se considera validado solo si el smoke dice:

```txt
RESULTADO SMOKE A&S LAB V99: COMPLETADO
```

## 7. Criterios de bloqueo

El flujo se bloquea si:

- no existe repo local;
- no puede cambiar a rama obligatoria;
- hay conflictos de Git;
- falta Firebase config local;
- la config local todavía tiene placeholders;
- falta algún script requerido;
- falla integración local del index;
- falla smoke LAB;
- no se autentica usuario LAB;
- falla CRUD ficticio.

## 8. Estado

**Estado:** LISTO PARA EJECUCIÓN LOCAL.  
**Siguiente acción:** usar `-PrepararConfig` solo si falta config local; luego ejecutar sin esa bandera para validar todo el flujo A&S LAB.
