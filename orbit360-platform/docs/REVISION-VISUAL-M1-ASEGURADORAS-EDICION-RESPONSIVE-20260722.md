# Revisión visual M1 — Aseguradoras: edición, estados y responsive

**Fecha:** 2026-07-22  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Gate:** `block1-client360-insurers-lab-v20260717`  
**Resultado humano:** RECHAZADO — M1 continúa abierto, M2 bloqueado.

## Evidencia humana

1. La ficha de Aseguradora se visualiza correctamente en modo lectura.
2. Al pulsar **Editar**, toda el área de contenido queda en blanco.
3. Existen aseguradoras con `vinculada:false` y sin motivo auditable visible; la UI muestra el fallback «Motivo pendiente de documentar».
4. Los botones Llamar y WhatsApp no aparecen cuando el contacto no tiene teléfono, comportamiento correcto y honesto.
5. Los títulos en móvil siguen sin adaptarse correctamente en todos los renderers.

## 1. Pantalla en blanco al editar

### Clasificación

```text
FUNCTIONAL_DEFECT
VALIDATOR_STALE
```

### Causa raíz

`core/client-insurer-visual-stability-barrier-v20260721.js` oculta `#asg-ficha` mediante la clase `orbit-insurer-knowledge-pending` hasta que `expectedReady()` confirma que las filas de Contactos, Plataformas o Bancos fueron convertidas a tarjetas canónicas de lectura.

Sin embargo, `core/client-insurer-visual-contract-v20260720.js` omite intencionalmente esas conversiones cuando existe `#af-guardar`, es decir, cuando la ficha está en modo edición.

La barrera no distingue vista de lectura y vista editable. En edición:

- existen filas editables;
- no deben existir tarjetas de lectura;
- `expectedReady()` nunca se cumple;
- después de 30 pases publica `blocked-incomplete-dom`;
- no retira la clase que mantiene oculta la ficha.

### Corrección obligatoria

La barrera debe tener un estado explícito `EDIT_MODE_READY` que:

- detecte `#af-guardar`;
- valide la presencia de controles editables y no tarjetas de lectura;
- libere inmediatamente la visibilidad;
- no ejecute el owner de lectura sobre inputs editables;
- disponga de prueba conductual entrar → editar → cambiar pestaña → cancelar/guardar.

## 2. Contrato 1.0.38 no integrado en el módulo editable

### Clasificación

```text
DATA_CONTRACT_FAILURE
FUNCTIONAL_DEFECT
```

El módulo `modules/aseguradoras.js` conserva reglas históricas que contradicen el addendum vigente:

- texto «Orbit nunca guarda ni muestra contraseñas»;
- cuentas «ficticias» y enmascaradas;
- campo `Uso` visible y editable;
- número bancario descrito como «N.º enmascarado»;
- creación de cuentas con máscara aleatoria;
- reconstrucción de portales con `credentialRef:'backend_required'`;
- reconstrucción de cuentas sin preservar `accountRef`.

Los owners 1.0.38 corrigen la lectura por encima, pero el editor vuelve al contrato antiguo. Esto puede eliminar referencias seguras o reintroducir campos retirados al guardar.

### Corrección obligatoria

Integrar directamente en el owner editable:

```text
portales[].usuario: visible y editable según permiso
portales[].credentialRef: preservar siempre
contraseña: flujo seguro separado; nunca input operativo
cuentas[].numero: visible y editable según permiso
cuentas[].accountRef: preservar siempre como respaldo
campo Uso: no mostrar, no copiar y no reconstruir
cuentas nuevas: sin números ficticios ni máscaras aleatorias
```

El guardado debe hacer merge por identidad estable de portal/cuenta, no reconstruir arrays descartando campos no visibles.

## 3. Estado activo/inactivo

El interruptor representa exclusivamente `aseguradoras[].vinculada`:

```text
vinculada !== false → activa
vinculada === false → inactiva
```

Al cambiarlo, el módulo solicita motivo y usa `Orbit.store.update('aseguradoras', id, patch)`. En Firestore LAB, `Orbit.store.update` escribe el documento del tenant mediante `set(..., {merge:true})`; por tanto, un cambio exitoso queda persistido en backend.

No se autoriza activar masivamente sin validar fuente y motivo. Las aseguradoras con fallback «Motivo pendiente de documentar» requieren calidad de dato antes de decidir si deben activarse.

## 4. Llamar y WhatsApp

El owner de lectura genera acciones automáticamente:

- Correo si existe email;
- Llamar si existe teléfono no vacío;
- WhatsApp si el teléfono contiene al menos ocho dígitos;
- para números locales de 8–10 dígitos agrega prefijo GT `502` o CO `57` según país.

Después de guardar correctamente un teléfono, el store emite el cambio, la ficha se repinta y los botones deben aparecer automáticamente. No deben mostrarse cuando no existe teléfono.

## 5. Títulos móviles

### Clasificación

```text
FUNCTIONAL_DEFECT
VALIDATOR_STALE
```

El CSS declara responsive, pero depende de selectores frágiles como:

```text
.m1-asg-hero [style*="font-size:20px"]
.mod-band .mb-tt h2
```

No cubre todos los renderers ni garantiza límites de ancho, reducción tipográfica y corte semántico en títulos reales. La evidencia humana prevalece sobre el PASS estático.

### Corrección obligatoria

- asignar clases semánticas estables a títulos de módulo y ficha;
- usar `min-width:0`, `max-width:100%`, `overflow-wrap:anywhere` y `clamp()` sobre esas clases;
- eliminar dependencia de fragmentos de estilos inline;
- probar 320, 360, 390, 430, 768 y desktop;
- validar títulos largos reales, pestañas y botones de cabecera.

## 6. Claude y Academia

### Claude

```text
REPLICABLE_CLAUDE_ACUMULADO
```

Enviar más adelante únicamente:

- estado de barrera visual consciente de modo lectura/edición;
- editor que preserva campos no visibles y referencias estables;
- acciones de contacto condicionales;
- títulos responsive con clases semánticas;
- pruebas conductuales edit/cancel/save y breakpoints.

No enviar datos reales, nombres, usuarios, números, bóveda, credenciales, backend protegido, IAM, Functions o Rules.

### Academia

```text
ACADEMIA_ACTUALIZAR
```

Debe enseñar:

- diferencia entre vista de lectura y edición;
- merge por identidad sin pérdida de campos;
- estados activo/inactivo con motivo y auditoría;
- botones de contacto derivados de datos disponibles;
- diferencia entre PASS estático y defecto visual humano;
- clasificación `FUNCTIONAL_DEFECT` frente a `VALIDATOR_STALE`.

## 7. Siguiente acción exacta

Construir un único patch frontend atómico que modifique:

1. `modules/aseguradoras.js` — editor canónico 1.0.38 y merge preservando referencias;
2. `core/client-insurer-visual-stability-barrier-v20260721.js` — estado edit-aware;
3. `styles/client-insurer-visual-contract-v20260720.css` — títulos semánticos responsive;
4. validadores y Academia correspondientes.

Validar sin tocar datos; después publicar una sola visualización Hosting LAB. M2 permanece bloqueado hasta aprobación humana.
