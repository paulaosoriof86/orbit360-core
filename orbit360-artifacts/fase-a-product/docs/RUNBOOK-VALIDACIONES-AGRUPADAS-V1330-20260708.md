# Runbook — validaciones agrupadas v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Cuándo usar

Usar este runner solo cuando sea necesario validar localmente:

- antes de empalmar candidata Claude;
- después de patch funcional JS;
- antes de smoke visual;
- cuando se requiera evidencia agrupada para PR.

No usarlo como excusa para pedir manualidad frecuente a Paula.

## Comando único recomendado

```powershell
node tools/orbit360-run-validaciones-agrupadas-v1330.mjs
```

Con candidata Claude:

```powershell
node tools/orbit360-run-validaciones-agrupadas-v1330.mjs --candidate "C:\ruta\a\candidata-extraida"
```

## Lectura del resultado

El comando imprime JSON con:

```txt
ok
status
branch
head
errors
warnings
reportMd
reportJson
```

Estados:

```txt
ok = apto preliminar
ok_con_warnings = revisar warnings, puede ser aceptable
bloqueado = no empalmar
```

## Reportes

Los reportes quedan en:

```txt
_orbit360_reports/
```

Paula solo debe pegar el JSON final o captura si se le pide. No se le debe pedir copiar reportes largos salvo necesidad.

## Acciones si falla

### Rama incorrecta

No continuar. Confirmar rama antes de cualquier patch.

### Protegidos modificados

No commit. Revisar diff y restaurar si corresponde.

### node --check falla

No empalmar. Identificar archivo y corregir.

### Auditor candidata bloquea

No empalmar candidata Claude. Documentar rechazo o aceptación parcial.

### Warnings de copy técnico

Revisar manualmente si son UI cliente o documentación interna. Si son UI cliente, corregir.

## Estado

Runbook listo para uso posterior.