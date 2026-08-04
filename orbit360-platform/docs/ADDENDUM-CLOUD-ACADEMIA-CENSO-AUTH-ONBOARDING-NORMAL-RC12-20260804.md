# Addendum Cloud / Claude / Academia — censo Auth y onboarding normal RC1.2

Fecha: 2026-08-04

## Clasificación

```text
REPLICABLE_CLAUDE_ACUMULADO
ACADEMIA_ACTUALIZAR
BACKEND_PROTEGIDO_NO_CLAUDE
SECRETO_DATO_REAL
```

## Patrones reutilizables

### CL-139 — Censo Auth antes de memberships

Antes de crear memberships productivas debe censarse el universo completo de usuarios Auth y reconciliarse con:

- tenant;
- rol canónico;
- estado habilitado;
- proveedor;
- `advisorId` cuando aplica;
- membership existente;
- identidad técnica excluida.

El censo se publica únicamente de forma sanitizada. UID, correos, nombres y credenciales permanecen en evidencia privada temporal.

### CL-140 — Un usuario válido no equivale a un perfil resuelto

La existencia de un usuario Auth normal no autoriza asignarle un rol. Se requiere evidencia canónica suficiente y no contradictoria. Si el usuario no puede clasificarse inequívocamente, el perfil permanece faltante.

### CL-141 — Perfiles distintos requieren identidades distintas

Dirección, Operativo y Asesor deben resolverse a usuarios normales distintos cuando el gate exige una sesión real por perfil. No se debe reutilizar una identidad para simular múltiples usuarios productivos.

### CL-142 — Ausencia no es ambigüedad

El resultado debe diferenciar:

```text
missing: cero candidatos válidos
ambiguous: más de un candidato equivalente
resolved: exactamente un candidato inequívoco
```

Esta distinción define la siguiente acción exacta y evita crear usuarios o memberships incorrectas.

### CL-143 — Fail-closed antes de escritura

Si falta o es ambiguo cualquier perfil requerido:

- cero memberships;
- cero cambios Auth;
- cero snapshot;
- cero Gate post-onboarding;
- cero Hosting;
- cero navegador.

El pipeline debe cerrar con el perfil exacto faltante o ambiguo.

### CL-144 — Secret name binding es contrato de pipeline

Los workflows deben reutilizar los nombres de secretos comprobados por la última ejecución válida. Cambiar aliases sin revisar el workflow vivo produce `PIPELINE_MECHANISM_FAILURE`, no un defecto del producto ni de Firebase.

La prueba del binding debe ocurrir después del gate estático y antes de cualquier lectura de datos.

### CL-145 — El cierre de evidencia no cambia el resultado sustantivo

Si el censo ya produjo una decisión sanitizada y luego falla únicamente el escritor final, corresponde:

1. aplicar `STOP_RETRY` al producto;
2. preservar el artefacto inmutable;
3. corregir el escritor source-only;
4. reconstruir el cierre desde la evidencia sanitizada;
5. no repetir Auth, Firestore ni Hosting.

### CL-146 — Candidata acumulativa y acceso productivo son gates diferentes

Una candidata puede conservar la mejor versión de todos los módulos y, aun así, no ser publicable por falta de identidades productivas. La matriz de módulos y el gate de onboarding deben reportarse por separado.

## Academia

La Academia debe incorporar un caso práctico por rol que enseñe:

- diferencia entre usuario Auth, membership, rol activo y scope;
- por qué una identidad técnica no representa al usuario final;
- cómo se resuelve un perfil normal sin inferirlo;
- diferencia entre `missing`, `ambiguous` y `resolved`;
- por qué la creación de memberships ocurre después del censo;
- diferencia entre `DATA_CONTRACT_FAILURE` y `PIPELINE_MECHANISM_FAILURE`;
- aplicación de `STOP_RETRY` después de obtener una decisión sustantiva;
- separación entre candidata acumulativa y candidata publicable.

## Frontera protegida

No se envía a Cloud/Claude:

- correos de usuarios;
- UID;
- credenciales;
- service accounts;
- contenido de custom claims reales;
- documentos de memberships reales;
- writers productivos;
- reglas de seguridad;
- datos A&S.

Sí puede reutilizarse:

- metodología de censo;
- estados `missing/ambiguous/resolved`;
- patrón de transacción atómica de tres memberships;
- patrón de rollback;
- gate de cero escritura;
- separación entre evidencia privada y reporte sanitizado.

## Estado de sincronización

```text
core actualizado: sí
rama viva documentada: sí
Academia documentada: sí
enviado externamente a Claude/Cloud: no
incorporado al prototipo comercializable: pendiente
```
