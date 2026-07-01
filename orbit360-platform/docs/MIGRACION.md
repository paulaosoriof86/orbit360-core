# Migración desde la plataforma actual (T&A → CXOrbia comercial)

> La migración se hará **cuando la plataforma esté lista y completa** (lo confirmará el usuario). Este documento deja fijado el **esquema real** y el **mapeo de campos** para el importador, basado en el export anonimizado de ejemplo (`tya_cxorbia_export_demo_v1`).

## Estados que vienen del sistema actual (NO perder)

**Estado de postulación (`tya_posts[].est`):** `aprobada` → `agendada` → `realizada` → `cuest_ok` → `submitida`/`pagada`.
Campos de fecha clave: `fd` (aprobación), `fp` (fecha programada/agendada), `freal` (realizada), `cuest_done`, `submit`, `fechaPago`.

**Estado de liquidación (`tya_liquidaciones[].estado`):** `pendiente_cuestionario` → `pendiente_submitir` → (validada) → `pagada`.
Incluye `honorario`, `boleto`, `combo`, `reembolso = boleto+combo`, `total`, `fechaEstimadaPago`, `loteId`.

**Certificaciones (`tya_shoppers_extra[].histCerts[]`):** `{proj, aprobado, score, fecha}` + `certs[]` (lista de proyectos certificados). **Se importan tal cual** para no obligar a recertificar.

## Mapeo entidad → modelo nuevo

| Export actual | Entidad nueva | Notas |
|---|---|---|
| `tya_cfg.projects{}` | `projects[]` | `pais[]`, `honorarios{pais:{moneda,hon,reembolso}}`, `cuestionario.preguntas[]`, `docs[]` |
| `tya_shoppers_extra{}` | `shoppers[]` | perfil + `certs[]` + `histCerts[]`; documento puede venir como `dpi` o `documento` |
| `VISITAS[]` | `_visitas[]` | `estado_demo`, `franja` (WK/WKND), `compra`→`canal`, `hon` string a parsear |
| `tya_posts{}` | `_posts[]` | conserva `agendaStatus`, `confirmada_por_shopper`, todas las fechas |
| `tya_liquidaciones{}` | liquidaciones | clave `benefitKey`; vínculo `visitKey`/`postId` |
| `tya_lotes{}` | lotes | `benefits[]` (lista de benefitKey), `movimientoId` |
| `tya_finance{}` | movimientos | `origen` enlaza lote/pago; `benefitKey` enlaza liquidación |
| `tya_docs_b64{}` | documentos | binarios en base64 + `visShop` |
| `tya_recursos{}` | aprendizaje | `url` o `docId` |
| `tya_noticias{}` | tablón | `_navDest`, `_opsEvent` (eventos que disparan acción) |
| `HIST{}` | — | **No se importa**: se recalcula desde visitas/posts en la nueva plataforma |

## Reglas del importador
1. **Conservar IDs originales** y relaciones por ID (`vid`, `sid`, `postId`, `visitKey`, `benefitKey`) para no romper vínculos.
2. **No duplicar**: si un ID ya existe, actualizar en vez de crear.
3. **Monedas separadas** GT(Q)/HN(L) — nunca sumar.
4. **`reembolso = boleto + combo`** (validar contra `total = honorario + reembolso`).
5. **Parsear `hon`** tipo "Q 60 + combo + boleto" → `honorario:60` + flags de reembolso.
6. **Vista previa anti-duplicados** antes de confirmar (igual que el módulo de Movimientos).
7. **`HIST` se ignora** (derivado); los KPIs se recalculan.

## Plantilla de uso
- `docs/migration/sample-fields.js` contiene el resumen del esquema y se carga como `CX.MIGRATION_SAMPLE`.
- El export real se pega tal cual; el importador (pendiente, P2) lee este esquema y normaliza a `CX.data`.
