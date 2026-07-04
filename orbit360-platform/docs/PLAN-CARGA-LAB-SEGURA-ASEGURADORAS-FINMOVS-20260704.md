# Plan carga LAB segura — aseguradoras y financiero histórico

Fecha: 2026-07-04  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Estado: planificación backend segura. Sin carga Firestore. Sin deploy. Sin merge.

## Propósito

Definir el siguiente bloque backend sin interferir con Claude ni Codex:

- Claude trabaja prototipo, UX, módulos y correcciones frontend.
- Codex aplica scripts/documentación que el conector bloqueó.
- Este plan deja lista la lógica de carga LAB futura para fuentes ya separadas y prevalidadas.

## Fuentes habilitadas para este plan

| Fuente | Tipo | Destino LAB permitido | Estado |
|---|---|---|---|
| Directorio aseguradoras Guatemala | `aseguradoras` | `aseguradoras` | listo para preview estructural |
| Directorio aseguradoras Colombia | `aseguradoras` | `aseguradoras` | listo para preview estructural |
| Movimientos ingresos/egresos GT/CO | `financiero_historico` | `finmovs` | requiere validación por país/moneda mixta |

## Fuente excluida expresamente

`Listado producción 2025-2026` queda ignorado.

No se usa como pólizas, financiero histórico, cartera, producción ni manifest separado. La fuente real de pólizas será entregada por Paula después, como archivo separado, cuando corresponda.

## Reglas de carga para `aseguradoras`

Destino único:

```txt
aseguradoras
```

Prohibido crear desde esta fuente:

```txt
clientes
polizas
cobros
cartera
finmovs
produccion
comisiones
```

Campos permitidos a futuro, según disponibilidad real y validación:

- nombre comercial;
- país;
- moneda operativa;
- ramos o líneas;
- contactos comerciales;
- contactos de reclamos;
- observaciones;
- plataformas y accesos solo como referencia protegida.

Regla crítica:

- Cualquier contraseña, usuario privado, token, acceso sensible o dato equivalente no debe quedar visible en UI cliente ni en seed demo.
- Si no existe bóveda/almacenamiento seguro aprobado, marcar como `REQUIERE_CONFIG_PRIVADA`.

## Reglas de carga para `financiero_historico`

Destino único:

```txt
finmovs
```

Prohibido crear desde financiero histórico:

```txt
clientes
polizas
cobros
cartera
aseguradoras
produccion
comisiones
```

Reglas:

- No inferir clientes desde descripciones financieras.
- No inferir pólizas desde conceptos financieros.
- No convertir depósitos bancarios en cobros sin conciliación.
- No sumar GTQ y COP en crudo.
- Libro mixto GT/CO debe separarse por hoja o periodo validado.
- Si una hoja no tiene país/moneda confiable, queda `REQUIERE_VALIDACION`.

## Estados del preview normalizado

Antes de cualquier `writeToStore`, cada fuente debe pasar por preview con estados:

```txt
LISTO
REQUIERE_VALIDACION
BLOQUEADO
OMITIDO
DUPLICADO_PROBABLE
```

Criterios:

- `LISTO`: fuente separada, país/moneda confiables, destino permitido, sin payload prohibido.
- `REQUIERE_VALIDACION`: faltan datos no críticos o hay país/moneda mixta separable.
- `BLOQUEADO`: destino prohibido, payload embebido, write habilitado, moneda incompatible o fuente mal clasificada.
- `OMITIDO`: hoja fuera de alcance.
- `DUPLICADO_PROBABLE`: estructura o identificador coincide con una fuente ya procesada.

## Secuencia segura futura

1. Manifest estructural sin payload real.
2. Validación contra contrato canónico.
3. Dry-run estructural.
4. Preview normalizado.
5. Revisión humana si hay `REQUIERE_VALIDACION`.
6. Autorización expresa de Paula para LAB.
7. Carga LAB deshabilitada por defecto hasta autorización.
8. Smoke de lectura por tenant.
9. Documentación de resultados.

## Pendiente Codex relacionado

Codex debe crear o integrar:

```txt
tools/orbit360-preview-normalizado-fuente-ays.mjs
```

El conector de ChatGPT bloqueó la escritura de ese script. Esta planificación no reemplaza esa tarea.

## Estado final de este documento

Plan documentado. No ejecuta carga. No contiene datos reales. No autoriza Firestore, deploy, merge ni producción.
