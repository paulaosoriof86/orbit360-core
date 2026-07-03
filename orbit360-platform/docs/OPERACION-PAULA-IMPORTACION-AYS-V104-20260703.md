# Operación Paula — importación A&S v1.104

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`

## Archivo único

```txt
tools/orbit360-operacion-paula-importacion-ays-v104.ps1
```

## Modo seguro por defecto

```txt
tools/orbit360-operacion-paula-importacion-ays-v104.ps1
```

Equivale a:

```txt
-Modo ensayo
```

No escribe Firestore.

## Modos disponibles

### 1. Ensayo sin escritura

```txt
tools/orbit360-operacion-paula-importacion-ays-v104.ps1 -Modo ensayo
```

Ejecuta preparación, conversión Excel, mapeo, validación, auditoría, payload dry-run, lotes, rollback dry-run y resumen ejecutivo.

### 2. Preflight de autorización

```txt
tools/orbit360-operacion-paula-importacion-ays-v104.ps1 -Modo preflight
```

Verifica que el resumen esté apto. No escribe.

### 3. Escritura LAB controlada

```txt
tools/orbit360-operacion-paula-importacion-ays-v104.ps1 -Modo escribir-lab -ProjectId <PROJECT_ID_LAB> -Confirmacion ESCRIBIR_LAB_AYS
```

Solo debe usarse con autorización explícita de Paula. Exige resumen apto y credencial local.

### 4. Smoke post carga

```txt
tools/orbit360-operacion-paula-importacion-ays-v104.ps1 -Modo smoke-post-carga -ProjectId <PROJECT_ID_LAB>
```

Solo lectura.

## Restricciones

- No deploy.
- No producción.
- No `main`.
- No datos reales en repo.
- No secretos en repo.
- No commit automático.
- No push automático.

## Estado

Listo para uso local cuando Paula decida iniciar ensayo con archivos reales.
