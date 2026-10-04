# CotComp S4.97 — Visual Asset Map and Repetition Control

**Date:** 2026-10-04  
**Status:** AUDITED CANDIDATE MAP / PLACEMENT NOT YET OWNER-APPROVED  
**Source:** AYS_LIB_V3 + V4 forensic manifest  
**Rule:** Library-first. Asset existence does not equal placement approval.

## 1. Finding

The library already contains enough differentiated material to avoid the repetition seen in S4.95–S4.96B.

The failure was not lack of assets. It was resolver design:
- one generic/fallback human image was reused across states;
- family/context was not treated as a first-class visual key;
- candidate assets were not mapped explicitly to a slot before implementation.

The next runtime must have a deterministic visual map and a no-repeat rule.

## 2. Hero candidate pool

### Preferred candidate A — insurance consultation / team
Path:
`03_REALES/consulta_de_seguros_en_equipo.png`

- status: `candidate_real`
- SHA-256: `2e319b2c2b41b8d843fe31135a37099715e3563098c12056d2b027f59635be32`
- dimensions: 1448×1086
- role: contextual human insurance consultation
- suitability: strong for CotComp opening because it communicates human guidance + product review
- placement status: CANDIDATE, not automatically approved

### Candidate B — modern insurance consultation
Path:
`03_REALES/consulta_de_seguros_en_oficina_moderna.png`

- status: `candidate_real`
- SHA-256: `f3b0a056bd173632908006d44d8f129cd9efa484acf41d7e5cd8bf0042be23e0`
- dimensions: 1448×1086
- role: consultation / assisted journey
- placement status: CANDIDATE

### Do not use as hero source
`02_WEB/cotiza_con_criterio_alianzas_y_soluciones.png`
- status: candidate
- SHA-256: `f19ff71740af1b8ac9ceaa5efbf2fcbee519ecb3ccaa94316f65a3187a4dc9ab`
- reason: it is already a designed advertising piece with baked typography/branding, not a clean photographic slot.

## 3. Family visual candidate map

### Vehículo / Movilidad
`03_REALES/reunión_amistosa_en_oficina_automotriz.png`
- status: candidate_real
- SHA-256: `4c3e2e7ced02fdc01d56124805ec162ac49b99fc6f5e3da5a8ecff6c1176623e`
- dimensions: 1672×941
- visual role: automotive consultation
- rule: preferred family image; may later resolve subtype-specific imagery if exact governed assets exist.

### Hogar
`04_CTX/familia_feliz_en_hogar_moderno.png`
- status: context
- SHA-256: `ab3cbe3c2c7e91c8244ad7f8bd1bf84c1f5f58331e6b75de651b1f6756297464`
- dimensions: 1672×941
- visual role: home/family context
- caveat: context asset, not A&S-team scene; placement requires visual gate.

### Salud / Gastos médicos
`03_REALES/consulta_familiar_en_un_ambiente_acogedor.png`
- status: candidate_real
- SHA-256: `e62a5d9525941674067cc1e12a2a685bdff3cf2cbf8d9dd3a2bd745e57b81e70`
- dimensions: 1672×941
- visual role: family protection / consultation
- caveat: do not claim medical care; it represents consultation/orientation.

### Vida / Ingreso
`03_REALES/consulta_de_seguros_en_familia.png`
- status: candidate_real
- SHA-256: `c01dc364069480b54b3d1c3db26905e7590ef619dc5e1e5adf434ffa7980165c`
- dimensions: 1672×941
- visual role: family continuity / protection planning.

### Empresa
`03_REALES/reunión_profesional_con_presentación_digital.png`
- status: candidate_real
- SHA-256: `0a4dea893a12af5bc3d44fb63ffbb8c36e723467de0956bcaf61693fb1227488`
- dimensions: 1672×941
- visual role: business decision / proposal review.

Alternate:
`03_REALES/reunión_corporativa_sobre_opciones_de_seguros.png`
- status: candidate_real
- SHA-256: `18332a453322753ce282fe89d0fb2b0c29d55e7d161f5afcbbf1fd83271aee75`
- dimensions: 1672×941.

### Transporte / Carga
`03_REALES/equipo_logístico_revisando_planos_en_el_almacén.png`
- status: candidate_real
- SHA-256: `055528673cf433988a9d476430d946883a6e242ac3e8fb63a0277546267e88e5`
- dimensions: 1672×941
- visual role: logistics/transport operation and advisory.

### Otros / No sé cuál necesito
`03_REALES/colaboración_en_alianzas_soluciones.png`
- status: candidate_real
- SHA-256: `9a2b5dc14c7b5f495c72ef53edf3ccd053ac31bef8ad7ddcde8d416b333335a2`
- dimensions: 1448×1086
- visual role: orientation/discovery with A&S.
- use: only if it reads as consultation rather than a specific product.

## 4. Assisted-mode visual

Do **not** swap every family to one generic “asesoría” image.

Assisted mode keeps the family image and changes:
- badge;
- explanatory copy;
- human-handoff affordance.

A separate advisory photo may appear only in an explicit handoff/confirmation panel, not as universal family replacement.

## 5. Priscila requirement

Existing governed asset:
`10_OWNER_APPROVED_20260921/PRISCILA_CUTOUT_APPROVED.png`

- status: `owner_approved_library_asset`
- SHA-256: `d091beb90594abc3a7c4fac01e6028fda188301589b0c712b3b8fb1a997f2a60`
- dimensions: 1086×1448
- placement is governed by surface audit.

Owner requirement remains: include Priscila in some scenes where natural and commercially/humanly useful.

Decision for S4.97:
- do not mechanically paste the cutout into existing photos;
- create/use a governed composite only after the exact slot is defined;
- candidate slots: opening human anchor or “Otros / orientación / acompañamiento”;
- any new composite gets new filename + hash + placement gate.

## 6. Approved rector pieces — reference only for CotComp

The following V3 pieces have `approved` status:
- `01_Hablemos_de_lo_que_necesitas_proteger.png`
- `02_Proteccion_para_tu_operacion_logistica.png`
- `03_Siniestros_orientacion_paso_a_paso.png`
- `04_Nuestro_equipo_y_contactos.png`

They are finished communication pieces, not automatic web-photo slots. They can guide composition/brand language but should not be cropped blindly into CotComp.

## 7. No-repeat policy

Within a single CotComp session:
- hero asset cannot also be the active family image;
- a family image cannot be reused for another family;
- assisted mode does not replace all routes with one image;
- fallback may not choose the immediately previous visual;
- if no appropriate governed asset exists, render a designed no-photo contextual panel rather than an unrelated repeated photo.

## 8. Resolver contract

Required key:
`country + family + subtype + mode + stage`

Resolver output:
- asset ID/path;
- asset status;
- aspect ratio;
- object-position;
- crop;
- alt role;
- whether repetition is permitted.

Fail closed:
- unknown asset status;
- missing hash;
- forbidden/rework/no-use asset;
- incompatible visual role.

## 9. Current placement status

This map identifies viable assets and eliminates the “we have no variety” explanation.

It does **not** promote candidate assets to approved placement.

Before new Owner review:
- hero selection must pass visual compare;
- every family has a distinct mapped visual or designed no-photo state;
- any Priscila composite is versioned and audited;
- screenshots verify no repetition through the full journey.
