# Autorización controlada de carga A&S LAB v1.104

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** script creado; por defecto no escribe.

## Archivo

```txt
tools/orbit360-autorizar-carga-ays-lab-v104.ps1
```

## Objetivo

Dejar lista la ruta de primera escritura LAB sin permitir una carga accidental.

## Modo preflight

```txt
tools/orbit360-autorizar-carga-ays-lab-v104.ps1
```

Este modo:

- verifica rama obligatoria;
- ejecuta resumen ejecutivo;
- exige decisión `APTO_PARA_SOLICITAR_AUTORIZACION_LAB`;
- no escribe en Firestore.

## Modo escritura LAB

Solo después de autorización explícita:

```txt
tools/orbit360-autorizar-carga-ays-lab-v104.ps1 -EscribirLab -Confirmacion ESCRIBIR_LAB_AYS -ProjectId <PROJECT_ID_LAB>
```

Requisitos locales:

- resumen ejecutivo apto;
- `GOOGLE_APPLICATION_CREDENTIALS` local configurado;
- `ProjectId` LAB;
- confirmación exacta;
- rama correcta.

## Restricciones

- No deploy.
- No producción.
- No `main`.
- No datos reales en repo.
- No credenciales en repo.
- No commit/push automático.

## Estado

Listo para preflight. Escritura LAB sigue bloqueada hasta autorización explícita de Paula.
