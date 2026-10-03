# CotComp · S4.80A · Unified searchable combobox preview

**Fecha:** 2026-10-03  
**Estado inicial:** `DEVELOPED / ZERO-PERSISTENCE / OWNER UX REVISION`

## Trigger

Owner completed S4.80 successfully but identified a usability concern: the interface separated "Buscar" and "Seleccionar" into two controls for one task.

S4.80A does not change catalog authority or the business model. It only tests a better interaction pattern.

## Target interaction

- Tipo de vehículo: normal select.
- Marca: **one editable combobox**. The user types in the same field and the option popup filters below it.
- Línea/Modelo: **one dependent editable combobox** with the same behavior.
- Año: normal select.
- Missing option: explicit "No encuentro..." fallback to review.

## Accessibility/keyboard behavior

The preview implements:
- `role=combobox`;
- popup `role=listbox`;
- `aria-expanded`, `aria-controls`, `aria-activedescendant`;
- Arrow Down/Up;
- Enter;
- Escape.

## Boundaries

- Uses S4.79 catalog only as LAB/test data.
- No PII.
- No QuoteCase.
- No consent.
- No provider/rater.
- No production.
- No claim that the SAT catalog is the final production authority.

After the Gravicentra authority freeze, the final production combobox must consume a versioned catalog projection governed by Gravicentra. S4.80A validates UX only.

## Acceptance

Technical PASS requires:
- QA accumulated PASS;
- only one visible brand input control;
- only one visible model input control;
- options filter in the popup;
- keyboard controls present;
- Corolla 2006 support from S4.79;
- no persistence/write action;
- POST rejected.

Owner visual validation remains required before S4.81.
