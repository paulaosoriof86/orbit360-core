# Auditoría candidata Claude v1.146 — 2026-07-06

**Archivo auditado:** `Prototype Development Request - 2026-07-06T114848.441.zip`  
**SHA256:** `5afa8e1f5a4aaf4a89b0548aabe96f336ab441b0b9146dcf44c74943e394deb8`  
**Estado:** no empalmar completa. Puede pasar a empalme selectivo con corrección manual de index/importador, o devolver a Claude por index.

---

## 1. Verificaciones ejecutadas

- ZIP extraído correctamente.
- 98 archivos dentro de `orbit360-platform`.
- 55 archivos JS revisados con `node --check`: 0 errores.
- Revisión de gate de index, copy prohibido, Academia plus/seed, Importador y Configuración.

---

## 2. Resultado por gate

### Gate JS

PASA. 0 errores JS.

### Gate Cliente360

PASA. Ya no aparece `Todo aplicado` ni `Aplicar pago`. Se observa:

```txt
Cartera al día
Sin cobros pendientes
Confirmar cobro
Registrar cobro confirmado
Fecha de confirmación
```

### Gate Academia plus + seed

PASA con observación. `data/seed.js` ya cambió las frases antiguas y Academia cubre explícitamente junio/julio, manifest, fuentes separadas, banco, financiero histórico, documentos soporte, `REQUIERE_VALIDACION`, GTQ y COP.

### Gate Configuración

PASA PARCIAL. La descripción principal ya dice `cobro confirmado/conciliado`, pero aún existe en `scope`:

```txt
Doble conciliación: pago aplicado a póliza creada
```

Ubicación: `core/config.js:373`.

### Gate Importador

PASA PARCIAL. Mejoró, pero conserva residuos en `core/importa.js`:

```txt
noAplicados
pagos aún no aplicados
pagos no aplicados a póliza
Pagado en banco, sin aplicar
pago no aplicado
Aplicar estos % al tarifario
```

Parte puede ser variable interna, pero varias frases están en descripciones/detect visibles del importador y deben ajustarse si se quiere gate limpio.

### Gate Index

NO PASA. El `index.html` del ZIP no conserva scripts backend LAB ni hotfix Portal:

```txt
core/backend-lab-loader.js
core/backend-lab-init.js
data/store-firestore-lab.local.js
core/backend-lab-security-guard.js
modules/portal-v1142-copyfix.js
```

El ZIP trae solo `data/store.js`, `data/seed.js`, `data/academia-plus.js` y `core/auth.js` base. Por tanto, contradice la confirmación de Claude sobre index híbrido conservado.

---

## 3. Textos técnicos visibles/potenciales

Se detectan referencias técnicas en módulos/documentos, algunas pueden ser internas o de administrador:

```txt
modules/academia.js: Demo, backend, migración, soporte
modules/conciliaciones.js: comentario sobre backend ChatGPT/Codex
modules/configuracion.js: comentarios de backend/LAB
core/auth.js: Auth demo/localStorage
```

No bloquean todos si son comentarios internos, pero deben vigilarse para que no aparezcan en UI cliente.

---

## 4. Decisión

**No empalmar completa.**

Opciones:

1. **Devolver a Claude:** pedir v1.147 solo por `index.html` y residuos menores de Importador/Config.
2. **Empalme selectivo ChatGPT/Codex:** tomar módulos corregidos y no tomar `index.html`; corregir manualmente `core/importa.js` y `core/config.js` en la rama viva.

Recomendación: si Claude todavía tiene capacidad inmediata, devolver con corrección final quirúrgica. Si no, hacer empalme selectivo controlado sin reemplazar index.

---

## 5. Paquete mínimo para Claude

Pedir solo:

```txt
1. No tocar index.html o conservar exactamente scripts LAB + portal-v1142-copyfix.
2. core/importa.js: cambiar descripciones visibles que dicen pagos aún/no aplicados o sin aplicar por pendientes de validación/relación/conciliación.
3. core/config.js: cambiar scope viejo de Finanzas.
4. Confirmar 0 errores JS.
5. Confirmar que no se tocaron backend protegido ni tools.
```

---

## 6. Estado

Auditoría documentada. No se empalmó, no se hizo deploy, no se hizo merge y no se procesaron datos reales.