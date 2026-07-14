# Restricción de ejecución local — Paula — NO `.cmd`

Fecha de formalización en Orbit 360 A&S: 2026-07-14  
Antecedente confirmado: 2026-06-30

## Regla vinculante

El computador de Paula **no permite ejecutar archivos `.cmd`**.

Por tanto, para cualquier flujo local de Orbit 360 A&S:

- no entregar `.cmd` como método principal ni alternativo;
- no pedir doble clic sobre `.cmd`;
- no asumir que un `.cmd` resolverá ExecutionPolicy;
- no pedir cadenas repetidas de PowerShell por errores del propio flujo;
- priorizar ejecución directa desde navegador autenticado, HTML local controlado o una única acción PowerShell solo cuando sea indispensable;
- cuando PowerShell sea inevitable, entregar un único bloque autocontenido, no interactivo y validado;
- mantener metodología 0 manual salvo la acción local final que requiera acceso a credenciales/sesión del equipo de Paula.

## Incidente 2026-07-14

Se generó por error el paquete:

```txt
ORBIT360-CARGA-AUTENTICADA-NAVEGADOR-AYS-LAB-20260714.zip
```

con `EJECUTAR-UNA-VEZ.cmd` como entrada. Ese método queda **invalidado** para Paula y no debe reutilizarse.

## Método preferido vigente

Para cargas autenticadas en LAB:

1. usar la sesión Firebase LAB ya autorizada en el navegador;
2. abrir un HTML local controlado mediante una sola acción compatible;
3. evitar service account si no existe localmente;
4. no exponer secretos;
5. no tocar producción, deploy, main ni datos fuera del alcance autorizado.

## Aplicación futura

Esta restricción debe revisarse antes de generar cualquier ZIP, ejecutor, paquete local, smoke o flujo de importación para Paula.
