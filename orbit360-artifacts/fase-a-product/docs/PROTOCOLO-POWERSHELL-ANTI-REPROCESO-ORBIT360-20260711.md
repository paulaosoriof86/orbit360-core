# PROTOCOLO POWERSHELL ANTI-REPROCESO — ORBIT 360

Fecha: 2026-07-11  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open; sin merge, deploy ni producción.

## Objetivo

Evitar que una falla de PowerShell, un validador o un servidor local provoque repetir `fetch`, `pull`, auditorías, validadores o pasos ya superados.

## Errores previos que no deben repetirse

### 1. Confundir un bloqueo de validadores con una falla del servidor

Si el reporte termina con:

```txt
Uno o más validadores fallaron. No se levantó el servidor.
```

el servidor **no intentó iniciar**. No corresponde revisar navegador, puerto o proceso. Primero se identifica el validador exacto utilizando el reporte ya generado.

### 2. Repetir `git fetch`, `switch` o `pull` después de una actualización exitosa

Si Git ya confirmó la rama y descargó los cambios, no se vuelve a ejecutar esa parte para diagnosticar un test. El diagnóstico se hace sobre el HEAD ya presente.

### 3. Ejecutar un `.ps1` sin bypass de proceso

La política de Windows puede bloquear scripts aunque el archivo sea correcto. Los lanzadores oficiales deben usar:

```txt
powershell.exe -NoProfile -ExecutionPolicy Bypass -File <script>
```

El bypass es solo para el proceso lanzado; no se cambia permanentemente la política del equipo.

### 4. Entregar un resultado genérico sin identificar el check fallido

Todo runner debe registrar por cada archivo:

```txt
[OK] nombre · exit 0
[FALLO] nombre · exit N
```

Al bloquear debe listar exactamente los checks fallidos. No basta con “uno o más validadores fallaron”.

### 5. Volver a correr toda la validación para conocer un error ya registrado

Antes de repetir un runner se lee el último archivo en:

```txt
_orbit360_reports/
```

El diagnóstico debe extraer del reporte existente:

- sección;
- salida;
- exit code cuando esté disponible;
- archivo afectado;
- línea o assertion.

### 6. Servidor oculto o efímero

El servidor local debe:

- usar `127.0.0.1`, no `file://`;
- abrirse en ventana visible;
- permanecer con `-NoExit`;
- verificar HTTP 200 antes de abrir el navegador;
- imprimir PID de ventana y listener;
- indicar explícitamente que la ventana debe permanecer abierta.

### 7. Usar una ruta local rígida

Los scripts deben resolver el repositorio desde `$PSScriptRoot` o localizarlo entre las rutas GitHub conocidas. No deben asumir un nombre de usuario o una carpeta única.

### 8. Problemas de codificación

Antes de mostrar salidas Node/PowerShell se debe configurar UTF-8. La presencia de caracteres como `P|liza`, `n|mero` o `can|nicos` es un problema de consola, no un fallo funcional del validador.

### 9. Perder el resultado

Cada bloque debe:

- guardar reporte;
- copiar resultado o diagnóstico al portapapeles;
- imprimir la ruta del archivo;
- no exigir selección manual de texto.

### 10. Cambiar el repositorio desde scripts de validación

Los scripts de validación no pueden:

- hacer commit;
- hacer push;
- hacer merge;
- hacer deploy;
- cambiar rama automáticamente;
- descartar cambios locales;
- cargar datos reales;
- modificar reglas o producción.

## Secuencia obligatoria

```txt
1. confirmar rama/HEAD
2. revisar cambios locales sin tocarlos
3. validar sintaxis
4. registrar [OK]/[FALLO] por check
5. si falla: detener y diagnosticar el reporte existente
6. corregir únicamente la causa
7. volver a ejecutar solo después de la corrección
8. si todo pasa: levantar servidor visible
9. esperar HTTP 200
10. abrir navegador
11. copiar reporte al portapapeles
```

## Regla de comunicación con Paula

Cuando un bloque falle:

- no pedirle repetir todo;
- no decir que el servidor falló si nunca se intentó iniciar;
- no proporcionar rutas alternativas;
- no pedirle buscar manualmente entre cientos de líneas;
- entregar un único bloque que lea el reporte existente o ejecute únicamente el check afectado;
- explicar qué quedó válido y qué único punto sigue bloqueado.

## Estado de la validación integrada v1.203

La ejecución del 2026-07-11 llegó a los validadores y terminó antes de iniciar el servidor. Por tanto:

```txt
ExecutionPolicy: superada con bypass de proceso
Git/branch/pull: superados
Servidor: no ejecutado
Causa pendiente: identificar el check exacto en el reporte existente
Acción correcta: diagnosticar el reporte; no repetir el runner completo
```
