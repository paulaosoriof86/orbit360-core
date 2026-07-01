// Fixture de ejemplo ANONIMIZADO del export de la plataforma actual (T&A).
// Úsalo para diseñar y probar el importador de migración. NO contiene datos reales.
// Esquema: tya_cxorbia_export_demo_v1
window.CX = window.CX || {};
CX.MIGRATION_SAMPLE = {
  "_schema": "tya_cxorbia_export_demo_v1",
  "_nota": "Pegar aquí el JSON del export real al migrar. Mapeo de campos en docs/MIGRACION.md.",
  "tya_cfg_projects": "→ CX.data.projects (id, nombre/cliente, pais[], honorarios{pais:{moneda,hon,reembolso}}, cuestionario{preguntas[]}, docs[])",
  "tya_shoppers_extra": "→ CX.data.shoppers (id, nombre, email, wa/telefono, dpi/documento, pais, ciudad, estado, certs[], histCerts[])",
  "VISITAS": "→ CX.data._visitas (id, proj, pais, ciudad, sucursal/shopping, quincena, franja WK/WKND, formato, combo, compra/canal, disponible, hon, moneda, estado_demo)",
  "tya_posts": "→ CX.data._posts (id, sid, vid, proj, est, fd/fecha, fp=fecha programada, freal, cuest_done, submit, liq, agendaStatus, confirmada_por_shopper)",
  "tya_liquidaciones": "→ liquidaciones (benefitKey, visitKey, postId, honorario, boleto, combo, reembolso, total, estado, freal, cuest, submit, fechaEstimadaPago, loteId)",
  "tya_lotes": "→ lotes (id, pais, moneda, estado, benefits[], total, movimientoId)",
  "tya_finance": "→ movimientos (tipo ingreso/egreso/anticipo, categoria, pais, moneda, monto, fecha, origen, benefitKey)",
  "tya_docs_b64": "→ documentos (id, proj, tipo, titulo, mime, b64, visShop)",
  "tya_recursos": "→ aprendizaje/recursos (id, proj, titulo, tipo, url|docId, visible, orden)",
  "tya_noticias": "→ tablón/notificaciones (id, titulo, mensaje, tipo, dest, fecha, _navDest, _opsEvent)",
  "HIST": "→ derivable: KPIs por pais/periodo (sin_asignar, asign_list, real_list, sin_agendar, sin_submit_list, liq_list). En la nueva plataforma se RECALCULA desde visitas/posts, no se importa."
};
