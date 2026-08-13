# Contrato backend — Clientes + asesor + portal + calidad de datos

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Estado:** contrato/modelo agregado; sin persistencia real.

---

## 1. Objetivo

Definir el modelo backend plan-only para clientes, relación asesor, portal cliente y calidad de datos, sin crear datos reales ni activar Firestore LAB.

Este contrato prepara la base para importación futura, portal cliente y gestión comercial, pero no escribe `clientes` todavía.

---

## 2. Restricciones fijas

- No datos reales en código.
- No crear clientes desde movimientos financieros.
- No inferir clientes desde `finmovs` ni `financiero_historico`.
- No crear ni modificar clientes desde documentos soporte sin confirmación y diff.
- No mezclar fuentes.
- No Firestore writes.
- No `Orbit.store` writes.
- No deploy.
- No merge.
- No exponer textos técnicos en UI cliente.

---

## 3. Fuentes permitidas para proponer cliente

Fuentes válidas:

```txt
clientes
configuracion_catalogo
documentos_soporte
```

Reglas:

- `clientes` es la fuente natural para crear/actualizar cliente.
- `configuracion_catalogo` puede completar catálogos o defaults controlados.
- `documentos_soporte` solo propone datos y requiere confirmación con diff.
- `polizas` puede relacionarse con cliente existente o dejar pendiente validación; no debe crear cliente sin regla explícita posterior.
- `financiero_historico`, `finmovs` y `estado_cuenta_bancario` no crean clientes.

---

## 4. Colecciones previstas

```txt
clientes
clienteAsesorRelaciones
portalUsuarios
calidadDatosSolicitudes
auditLog
```

Estas colecciones mantienen aislamiento por tenant y trazabilidad.

---

## 5. Modelo `clientes`

Campos mínimos:

```txt
tenantId
cliente_id
tipo_cliente
display_name
pais
moneda
estado_cliente
fuente_origen
source_ref
calidad_datos
asesor_principal_id
created_at
updated_at
```

Reglas:

- `tenantId` obligatorio.
- `cliente_id` generado por sistema, no por nombre.
- `display_name` no debe exponer datos reales en seed/demo.
- `pais` y `moneda` son obligatorios para escritura operativa.
- Si falta país o moneda: `REQUIERE_VALIDACION`.
- GT usa GTQ.
- CO usa COP.
- No sumar ni comparar monedas distintas sin conversión/regla posterior.

---

## 6. Relación asesor/cliente

Colección:

```txt
clienteAsesorRelaciones
```

Campos mínimos:

```txt
tenantId
cliente_id
asesor_id
relacion_estado
tipo_relacion
source_ref
created_at
updated_at
```

Reglas:

- Todo cliente debe tener asesor principal o quedar con estado de validación pendiente.
- Puede existir más de un asesor si el tenant lo configura.
- La relación debe tener trazabilidad de fuente.
- La relación no se infiere desde movimientos financieros.
- La relación no se deduce desde documentos sin confirmación.

---

## 7. Portal cliente

Colección:

```txt
portalUsuarios
```

Campos mínimos:

```txt
tenantId
portal_user_id
cliente_id
estado_acceso
canales_autorizados
portal_cliente_sin_opcion_correo
created_at
updated_at
```

Reglas:

- Activación por invitación controlada.
- Portal cliente sin opción de correo para cliente.
- Canales autorizados configurables por tenant.
- Acceso siempre relacionado a `cliente_id` y `tenantId`.
- No mostrar datos de otros tenants.
- No activar Auth real sin fase aprobada.

---

## 8. Calidad de datos

Colección:

```txt
calidadDatosSolicitudes
```

Campos mínimos:

```txt
tenantId
quality_request_id
cliente_id
campos_requeridos
estado_solicitud
bloquea_escritura_operativa
source_ref
created_at
updated_at
```

Estados mínimos:

```txt
COMPLETO
INCOMPLETO
REQUIERE_VALIDACION
SOLICITADO
BLOQUEADO
```

Reglas:

- Si falta país o moneda, bloquea escritura operativa.
- Si falta identificador confiable, bloquea creación automática.
- Si el dato viene de documento soporte, queda como propuesta.
- Toda solicitud debe conservar trazabilidad.
- Las solicitudes al cliente deben ser claras, amables y específicas.

---

## 9. Portal y calidad de datos

El portal puede usarse para solicitar actualización de datos, pero:

- no debe permitir que el cliente active cambios sensibles sin revisión si el tenant lo requiere;
- no debe modificar pólizas/cobros automáticamente;
- no debe mostrar términos técnicos internos;
- debe diferenciar dato propuesto, dato validado y dato pendiente.

---

## 10. Validador agregado

```txt
tools/orbit360-validar-modelo-clientes-ays.mjs
```

Uso previsto:

```txt
node tools/orbit360-validar-modelo-clientes-ays.mjs --model ruta/modelo-clientes.json --tenant alianzas-soluciones
```

El validador bloquea:

- fuente financiera como origen de cliente;
- documentos soporte creando cliente sin confirmación;
- país/moneda incorrectos;
- portal cliente con opción de correo;
- payload/filas reales;
- secretos o credenciales;
- modelo con `can_write_now` distinto de `false`.

---

## 11. Tests sintéticos agregados

```txt
tools/orbit360-test-validar-modelo-clientes-ays.mjs
```

Casos cubiertos:

- modelo válido;
- bloqueo por financiero histórico como fuente;
- bloqueo por documento sin confirmación;
- bloqueo por país/moneda incoherente;
- bloqueo por opción de correo cliente en portal;
- bloqueo por payload/filas reales.

---

## 12. Impacto en Academia y manuales

Debe actualizarse cuando Claude retome:

- lección de calidad de datos del cliente;
- diferencia entre cliente, póliza, cobro y conciliación;
- rol asesor vs admin vs cliente;
- portal cliente y solicitudes de datos;
- estados `REQUIERE_VALIDACION`, `SOLICITADO` y `BLOQUEADO`;
- regla de no usar datos financieros para crear clientes.

---

## 13. Estado

Contrato y tooling agregados en rama. No se ejecutó localmente. No hay persistencia real ni creación de clientes.