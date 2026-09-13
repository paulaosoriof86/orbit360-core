# Gravicentra Insurance — Mechanism Freeze V5 · Cierre I5 y transición segura a I6

Estado: `FROZEN`
Fecha: 2026-09-12
Ámbito: cierre formal de I5 después de aceptación LIVE física y transición controlada a I6.

## 1. Prevalencia y alcance

Este addendum complementa V3 y V4 únicamente para el estado posterior a I5. No cambia la secuencia I0–I6, no reabre I0–I4B, no modifica la identidad del producto certificado y no autoriza por sí mismo el refresh de agosto.

V3 y V4 continúan gobernando la recuperación y la preservación de evidencia hasta I5. A partir del cierre formal de I5, `CONTROL_PLANE.json` sigue siendo la única autoridad operativa viva y debe representar explícitamente `PRODUCTION_ACCEPTED` antes de habilitar cualquier preparación ejecutable de I6.

## 2. Evidencia física terminal de I5

La aceptación LIVE terminal corresponde al run `34733712152`, attempt `2`, sobre el mismo HEAD de control `e0b58e2c2e6cedd33217bad153d20f68edea212a` y la misma release certificada:

- product source: `16f174d087024085eff18079c486f717ef98d691`;
- build: `gi-i3-16f174d08702-57f234755dc1`;
- artifact I3: `10183074943`;
- evidence artifact I5: `10311055390`;
- evidence artifact digest: `sha256:5aad2082722a0c8eedcc3d2b6d48c702c1fab8ad3d57815f4bf5382963747ceb`.

La evidencia terminal demuestra readback Hosting exacto 202/202, prueba pública PASS, prueba autenticada PASS en los cinco roles, matriz transversal 15/15 antes del write, write sintético controlado con tres escrituras y ausencia final comprobada, y matriz transversal 15/15 después del cleanup. El refresh de agosto no fue tocado.

El primer intento del mismo run falló durante el readback inmediato posterior a la promoción y ejecutó rollback automático completo. El attempt 2 repitió exactamente la misma candidata, artifact y harness y terminó PASS; por tanto, ese fallo anterior no autoriza cambio de product source ni reconstrucción.

## 3. Regla de cierre formal

La evidencia física puede preceder al estado formal. I5 solo queda formalmente cerrado cuando se cumplen simultáneamente:

1. existe un receipt persistente ligado al run, attempt, artifact y digests de evidencia;
2. `CAPABILITY_STATUS_LEDGER.json` materializa `LATEST_APPROVED_VERSION_LIVE_PASS` para las 15 capacidades sobre la misma release;
3. `CONTROL_PLANE.json` registra I5=`PASS`, `productionAccepted=true`, progreso de producción 100% y la transición a I6;
4. el preflight canónico reconoce el estado post-I5 y bloquea cualquier reejecución de I5;
5. el Control Plane Guard central pasa sobre el HEAD posterior al sello.

## 4. Separación producción / datos / agosto

`productionTouchedByRecovery=true` significa que la release certificada fue promovida a LIVE. `dataTouchedByRecovery=true` significa únicamente que el escenario sintético controlado de I5 escribió y limpió datos de prueba, dejando los registros de auditoría persistentes esperados. No significa carga de agosto ni resultado empresarial.

`augustRefresh` permanece `HOLD`. I6 requiere preparación, dry-run, diff, deduplicación, autorización explícita, auditoría y rollback antes de cualquier mutación de datos del período 2026-08-01 a 2026-08-31.

## 5. Estado permitido inmediatamente después del sello

- `status=PRODUCTION_ACCEPTED`.
- I0–I5=`PASS`.
- `lastFormallyCompletedIteration=5`.
- `nextFrozenIteration=I6`.
- I6=`HOLD_PENDING_EXPLICIT_AUTHORIZATION`.
- `productionProgress.formalPercent=100.0`.
- `productionProgress.certifiedPhysicalPercent=100.0`.
- autorizaciones I5 desactivadas.
- no existe autorización de ejecución I6.

## 6. Regla anti-regresión

Después del sello, un push documental, cambio de harness, timeout o conversación no puede volver a `I5_IN_PROGRESS`. Solo una invalidación causal demostrada de la release productiva puede abrir una ruta correctiva gobernada. La preparación de I6 no modifica por sí sola la aceptación de I5.
