# Matriz Evergreen de Criterios — Gravicentra Insurance Fase A

Esta matriz define qué debe probarse; no contiene estado operativo actual. El estado vigente de cada gate/release se obtiene de `CONTROL_PLANE.json`. El lineage aprobado se obtiene de `CAPABILITY_LINEAGE_LOCK.json`.

| Capability | Lineage | Ruta/UI | Datos | Roles/permisos | Acciones/persistencia | Relaciones | Errores/responsive | Preview | Live |
|---|---|---|---|---|---|---|---|---|---|
| Login | aceptación + owner/blob | login/entrypoint | membresía/tenant | rol asignado fail-closed | sign-in/session/reload | shell/startup | 0 page/console/http; móvil | requerido | requerido |
| Roles/scopes | policy/owner exactos | rol activo visible/aplicable | scoped read-model | rol debe estar asignado | cambio de rol permitido | módulos afectados | sin leakage | requerido | requerido |
| Shell/router/nav | index único | rutas Fase A alcanzables | n/a | navegación por rol | navegación/reload | todos los módulos | 0 404 | requerido | requerido |
| Startup/PWA/performance | owners exactos | primer render | hidratación esencial | todos los roles aplicables | reload/startup | shell/auth/store | no espera SW/no timeout normal | requerido | requerido |
| Inicio | aceptación + owner/blob | UI aprobada/KPIs | corte rector | scopes | acciones aprobadas | Cliente/Póliza/Cobros | responsive/0 errors | requerido | requerido |
| Cliente 360 | aceptación + owner/blob | lista/ficha/UI | clientes/pólizas/cobros | scopes | filtros/ficha/reload | cliente→póliza/vehículo | pagination/render coherente | requerido | requerido |
| Vehículos | aceptación/read-model owner | vista dentro de owner aprobado | vehículos reales | scopes | navegación/ficha | cliente/póliza | responsive/0 errors | requerido | requerido |
| Relaciones transversales | joins aprobados | navegación cruzada | IDs canónicos | scopes en ambos extremos | persistencia si aplica | cliente↔póliza↔vehículo y demás | sin joins por nombre | requerido | requerido |
| Aseguradoras | módulo/owner/blob | directorio/ficha | aseguradoras | Dirección/SuperAdmin/AdminTenant/Admin/Operativo completo; Asesor restringido | copiar/editar aprobado | directorio operacional | responsive/0 errors | requerido | requerido |
| Directorio credenciales | owner/policy/provider | usuario/reveal/copy/cuentas | credentialRef + Secret Manager | backend autoritativo | reveal/copy/re-auth | aseguradora/portal/cuenta | no secretos persistentes browser | requerido | requerido |
| Ops | módulo + ciclo + write transport | board/UI | negocio/gestiones | scopes | write callable aprobado | sincroniza con Leads | 0 errors | requerido | requerido |
| Leads | módulo + ciclo + write transport | board/UI | negocio | scopes | transiciones aprobadas | sincroniza con Ops | 0 errors | requerido | requerido |
| Pólizas | owner/blob exactos | tabla/ficha | pólizas reales | scopes | acciones aprobadas/reload | cliente/vehículo | golden invariants | requerido | requerido |
| Recibos/Cartera | lineage financiero independiente | UI aprobada | `recibosEsperados` + `carteraPrimas` distintos | scopes | acciones aprobadas | póliza/cliente por IDs | no remap a cobros | requerido | requerido |
| Cobros | lineage independiente | UI aprobada | eventos/evidencia de cobro | scopes | conciliación/write contract aprobado | cartera/póliza/cliente | no cobro ficticio | requerido | requerido |

## Criterios transversales obligatorios
- source SHA y blob SHA exactos;
- owner y dependencias;
- buildId y artifact/digest aplicables;
- ruta/carga y última UI aprobada;
- datos bajo el corte vigente;
- permisos backend, no solo ocultamiento UI;
- persistencia/recarga cuando exista write o estado durable;
- ausencia de 404, page errors, console errors y HTTP errors relevantes;
- responsive en viewports aplicables;
- evidencia vinculada al mismo release identity;
- no PASS por inspección de source cuando el gate exige runtime.

## Estados válidos
En Preview: `LATEST_APPROVED_VERSION_PREVIEW_PASS`.
En producción: `LATEST_APPROVED_VERSION_LIVE_PASS`.

Una capability no se reabre por reflejo. Debe existir diff causal en owner/dependencia/contrato o una regresión reproducible que invalide evidencia previa.
