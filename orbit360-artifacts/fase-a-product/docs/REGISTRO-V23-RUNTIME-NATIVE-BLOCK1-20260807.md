# Registro v23 — runtime nativo Block1

Estado inicial: source candidate. Runtime no iniciado.

## Secuencia obligatoria

1. Sourcecheck exacto sobre base autorizada.
2. Solo con PASS: transición lifecycle a runtime-pending.
3. Crear un único request v23 nuevo e inmutable.
4. `GO_GATE_CONTRACT` antes de secretos.
5. Adjudicación read-only 414/26/7 antes de Hosting.
6. Solo con PASS de universo: restore baseline autorizado, backup, máximo un deploy Hosting LAB, precheck y matriz nativa.
7. Snapshot final idéntico y cero writes.
8. Consume/freeze siempre al cierre; rollback ante cualquier fallo posterior al deploy.

No Functions, Rules, reimportación, producción, main ni merge.
