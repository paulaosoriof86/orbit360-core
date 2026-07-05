# Bitácora backend — Manifest por fuentes separadas A&S

**Fecha:** 2026-07-05  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft  
**Estado:** validador de manifest actualizado y contrato documentado. No writes, no datos reales, no deploy.

---

## 2026-07-05 — Alineación de manifest a `conciliaciones`

- **Módulo/área:** Backend / importador / parser / fuentes separadas / conciliación.
- **Necesidad:** preparar el parser real para que cada archivo entre como manifest separado, con país, moneda, fuente, destino y trazabilidad, sin mezclar fuentes.
- **Esperado:** banco, planillas y cobros realizados no deben escribir `cobros` directo; deben proponer hacia `conciliaciones`.
- **Causa raíz:** el validador existente aún tenía destinos heredados como `conciliacionBanco` o destinos directos a `cobros` para algunas fuentes. Eso ya no coincide con el flujo backend actual.
- **Archivos actualizados/agregados:**
  - `tools/orbit360-validar-manifest-fuente-ays.mjs`
  - `tools/orbit360-test-validar-manifest-fuente-ays.mjs`
  - `orbit360-platform/docs/CONTRATO-MANIFEST-FUENTES-SEPARADAS-AYS-20260705.md`
- **Fix/mejora aplicada:** destinos permitidos alineados a reglas de fuentes separadas y bandeja `conciliaciones`.
- **Impacto comercializable:** reduce riesgo de migración incorrecta y garantiza que la plataforma no cree cartera/cobros/producción desde fuentes que solo deben proponer conciliación o histórico.
- **Estado:** LISTO COMO TOOLING EN RAMA / pendiente ejecución local.

---

## Regla operacional reforzada

```txt
estado_cuenta_bancario -> conciliaciones
planilla_comisiones -> conciliaciones
planilla_aseguradora -> conciliaciones
cobros_realizados -> conciliaciones
financiero_historico -> finmovs
```

`financiero_historico` no alimenta cartera, cobros ni producción.

`documentos_soporte` no crea/modifica clientes o pólizas sin confirmación y diff.

---

## Próximo bloque sugerido

Perfilador de columnas por fuente:

```txt
manifest validado -> perfil columnas -> mapeo candidato -> dryRunReport sin payload real
```

Debe seguir sin datos reales y sin writes.