# Modelo de datos

Estado actual: datos **mock** en `core/data.js`. Este documento define las entidades para que el equipo técnico implemente el backend real (Firebase RTDB/Firestore u otro) **sin cambiar la UI**.

## Entidades

### Project (proyecto / cliente)
El eje de la plataforma. Cambiarlo reconfigura todo.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | slug único (`retail`) |
| `name` / `client` | string | nombre comercial |
| `industry` | string | rubro (adapta narrativa y cuestionarios) |
| `countries` | string[] | `['GT','HN']` |
| `currency` | map | `{GT:'Q', HN:'L'}` — **nunca se suman entre sí** |
| `accent` | color | color del proyecto (UI) |
| `sucursales` | number | nº de puntos |
| `honorario` | map | por país `{GT:60, HN:180}` |
| `combo` | string\|null | reembolso/combo |
| `scenarios` | string[] | versiones de cuestionario |
| `quincenas` | string[] | periodos |

### Shopper (evaluador)
| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `nombre` | string | |
| `pais` / `ciudad` | string | |
| `estado` | enum | `Activo` · `Certificado` · `Pendiente` |
| `rating` | number | 0–5, **calculado** (cumplimiento + tiempos + alertas + certs) |
| `visitas` / `postulaciones` | number | histórico |
| `promCuest` | number | días promedio de cuestionario |
| `certs` | number | certificaciones aprobadas |
| `honorarioPref` | enum | `Estándar` · `Preferente` |

### Visita
| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `projectId` | string | FK → Project |
| `sucursal` / `ciudad` / `pais` | string | |
| `currency` | string | derivado del país |
| `quincena` / `escenario` / `franja` | string | reglas del proyecto |
| `honorario` / `combo` | number / string | |
| `estado` | enum | ver máquina de estados ↓ |
| `shopperId` | string\|null | FK → Shopper |
| `rango` | string | ventana válida de ejecución |
| `agendada` / `fechaRealizada` | date\|null | |

**Máquina de estados de la visita:**
```
disponible → postulada → asignada → agendada → realizada → cuestionario → liquidada
                  ↘ (rechazada/standby)              ↘ fuera_rango (si excede el rango)
```

### Postulación
| Campo | Tipo | Notas |
|---|---|---|
| `id` | string | |
| `visitaId` / `projectId` / `shopperId` | string | FKs |
| `estado` | enum | `pendiente` · `aprobada` · `rechazada` · `standby` |
| `aprobadaPor` | string\|null | firma de auditoría ("Aprobada por Paula Osorio") |
| `reprog` | bool | tiene solicitud de reprogramación |

### Otras (a modelar en profundización)
- **Certificación**: `{shopperId, projectId, escenario, score, intentos, aprobada, feedback[]}`
- **Liquidación**: `{visitaId, shopperId, honorario, boleto, combo, moneda, estado, loteId}`
- **Lote**: `{id, visitaIds[], total, moneda, estado: pagado|revision|borrador}`
- **Movimiento**: `{projectId, tipo: ingreso|egreso, categoria, monto, moneda, fecha}`
- **Usuario**: `{id, nombre, rol: super|admin|ops|shopper, permisos[]}`
- **Cuestionario**: `{projectId, version, escenario, preguntas:[{tipo, texto, puntaje}]}`
- **Notificación**: `{destino, tipo, texto, leida, ts}`

## Reglas de negocio clave

1. **Monedas separadas**: GT (Q) y HN (L) **jamás** se agregan en un mismo total.
2. **Gate de certificación**: una visita no se ejecuta si el shopper no aprobó la certificación del escenario.
3. **Rango de ejecución**: marcar realizada fuera del `rango` → estado `fuera_rango` (alerta).
4. **Trazabilidad**: toda decisión (aprobar, reprogramar, liquidar) guarda autor + timestamp.
5. **Aislamiento por proyecto/tenant**: ningún dato cruza entre proyectos ni entre clientes.

## Nodos sugeridos (Firebase RTDB)
```
/tenants/{tenantId}/projects/{projectId}
/tenants/{tenantId}/visitas/{visitaId}
/tenants/{tenantId}/posts/{postId}
/tenants/{tenantId}/shoppers/{shopperId}
/tenants/{tenantId}/liquidaciones/{id}  /lotes/{id}  /movimientos/{id}
/tenants/{tenantId}/users/{uid}
```
Reglas: lectura/escritura **solo** dentro del propio `tenantId` y según rol. Ver [SECURITY.md](SECURITY.md).
