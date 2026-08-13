# Registro — validador post-runner y umbral Claude v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Paula pidió continuar y avisar más adelante cuando haya suficientes pendientes para Claude, usando Claude solo cuando realmente sea importante y sin acumular demasiado.

## Bloque trabajado

Se creó:

```txt
orbit360-platform/docs/scripts/VALIDAR-POST-RUNNER-HOTFIXES-P0-V1330.mjs
```

También se documentó política de uso de Claude:

```txt
orbit360-platform/docs/POLITICA-USO-CLAUDE-PENDIENTES-POST-V1330-20260708.md
```

## Qué valida el post-runner

- Rama correcta.
- Git status.
- Cambios fuera de lista permitida.
- Protegidos sin cambios.
- `node --check` de seis archivos.
- Patrones prohibidos.
- Señales esperadas de hotfix.
- Estado `commit_ready` o `blocked`.

## Política Claude creada

Claude se usará cuando haya un paquete coherente de 3 a 5 pendientes de alto impacto frontend/UX/Academia, no por cada hotfix aislado.

No usar Claude para:

- backend protegido;
- Firestore/Auth/store/importadores/validadores;
- cambios sin auditoría;
- pendientes aislados menores;
- antes de ejecutar/validar runner P0.

Candidatos actuales para próximo paquete Claude, pero todavía no enviar:

```txt
1. Cliente360 Documentos: acciones por rol, visibilidad, responsable, aprobar/rechazar propuestas.
2. UX visual de estados: reportado / en revisión / validado no aplicado / aplicado / conciliado.
3. Academia: materializar rutas nuevas con progreso/certificado/manuales visibles.
4. Smoke visual post-hotfixes: revisar Portal, Cobros, M5, Config/Equipo y Academia.
```

## Estado

Validador post-runner y política Claude creados. Pendiente ejecución local del runner P0 y posterior validación.