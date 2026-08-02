'use strict';

export const TENANT = 'alianzas-soluciones';
export const PROJECT = 'ays-orbit-360-lab';
export const GATE = 'block7-policies-dual-path-provenance-recommendation-readonly-v20260801';
export const VERSION = '7.3.0';
export const COLLECTIONS = [
  'clientes',
  'aseguradoras',
  'polizas',
  'vehiculos',
  'recibosEsperados',
  'carteraPrimas',
  'cobros'
];

export const EXPECTED = {
  clientes: {canonicalCount:414,legacyCount:430,sharedIds:414,onlyCanonical:0,onlyLegacy:16,canonicalIdSetDigest:'30a1194148faaf56b47bea190c3efbe8bc01f6cce9caa7723fa7d7cdcd2de29a',legacyIdSetDigest:'32b85ddd0a390adb41781a5ce418e44975efafe12d8918e80f24ce70afb906f2',canonicalContentDigest:'32f08f32a4fc276d692d1c0c7d724521e07c9e8ff5c2c05c4dd4ec4f59571f3d',legacyContentDigest:'ef61b008f60e069e13531a6225d8a74e68b97feafa4d467f2e4f5b89b5d1817e'},
  aseguradoras: {canonicalCount:26,legacyCount:30,sharedIds:26,onlyCanonical:0,onlyLegacy:4,canonicalIdSetDigest:'12c0ea26dd68eeb167023499ba6c48ba2fbf8b0ddff4ac5b1bef4e622fd7ba11',legacyIdSetDigest:'4dd7356b5e705953f2cb0b2359eda96980408596e839162161e2c69e904627ec',canonicalContentDigest:'54042a9186c66c41a431d96ee42490be88088052b016886aaf0e47c392e5f1e2',legacyContentDigest:'d11d4e8af2462596775fd6aff3fd955b117bef16a46726ce9749bac575e93a70'},
  polizas: {canonicalCount:2,legacyCount:1373,sharedIds:0,onlyCanonical:2,onlyLegacy:1373,canonicalIdSetDigest:'5ec5c00f293c292566917a02a71b53136c9ac3df62a8e30c126d40f05a8c1317',legacyIdSetDigest:'4e2de1742d07105f061bce47f3b3ed32066be44d6db10d087b2fefded48a7129',canonicalContentDigest:'e0cc9d74610a05fa69c4c6eb88edb5b59dd944325af1b99fba34276b36a0ff32',legacyContentDigest:'754b7c148671580db0cc5fe8b34da878403355e3556d66bc30ef9bbe5896b79d'},
  vehiculos: {canonicalCount:1,legacyCount:1032,sharedIds:0,onlyCanonical:1,onlyLegacy:1032,canonicalIdSetDigest:'f7e34e15069c75bf71bbe9c20631660fde621a9a4fd35b85d7b61251151fc2d8',legacyIdSetDigest:'c5a5eb51b69eedef33588c6e3bb8bb3746ceac8bffc4a7a9181ebcbe4995682d',canonicalContentDigest:'172599a8be0d9285b37c023a4013e648ba1cfcfcf9c1ad1582c9e9ae67924bf1',legacyContentDigest:'141e766b0c95843c5ce88ed853679477164f2dcb7641a350a870c225ebde37f9'},
  recibosEsperados: {canonicalCount:0,legacyCount:1294,sharedIds:0,onlyCanonical:0,onlyLegacy:1294,canonicalIdSetDigest:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',legacyIdSetDigest:'795cc0c540b92adb671ae63a1870130f3cda8b9f277d595e9005759fe79ab5c6',canonicalContentDigest:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',legacyContentDigest:'2e8f29cf62187fbe3c9939917266b407a23949ba5bea3974e6fc91c74335493a'},
  carteraPrimas: {canonicalCount:0,legacyCount:673,sharedIds:0,onlyCanonical:0,onlyLegacy:673,canonicalIdSetDigest:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',legacyIdSetDigest:'a70d953bc51771ddc71cca00d66d350cf618a2804671cd986ecf12636e814753',canonicalContentDigest:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',legacyContentDigest:'974dd19ca514adbcfa357e0c945bd48c4f93b97fac6298d9771ea787c7207b83'},
  cobros: {canonicalCount:2,legacyCount:5,sharedIds:0,onlyCanonical:2,onlyLegacy:5,canonicalIdSetDigest:'b3d5497e3a5abe3f48c77c6de389893ca3dafd13d959b80296500d8f133308b6',legacyIdSetDigest:'7bbcaebfe9a16599f71293b845d2af542285f97e97483ec671944bb494ecc8ec',canonicalContentDigest:'67871cff2c10293d01b2bbf71e280a16fec3995899bc2f99289f6a4930bb1121',legacyContentDigest:'b394ddae88ae16d3fae1a9386416fe9338c9f6f4f0f4e6d2d40e1738e35f0596'}
};

export const PROVENANCE_KEYS = new Set(['sourceRefs','sourceRef','sourceTrace','trace','importBatchId','batchId','sourceBatchId','importadorP0','authorizationRef','idempotencyKey','origenRegistro','originRegistro','fuenteAutoridad','sourceType','sourceProofCount','_sourceVersionKey']);
export const VALIDATION_KEYS = new Set(['validationStatus','requiereValidacion','calidad_datos','motivosCalidad','motivoCalidad','alertasCalidad','motivosPendientes','matchQuality','conciliacion','conciliado','enRevision']);
export const TECHNICAL_KEYS = new Set(['_loadedAt','_loadedBy','_seed','createdAt','createdBy','updatedAt','updatedBy']);
export const CRITICAL = {
  clientes:new Set(['nombre','numeroDocumento','pais','moneda','asesorId','estadoOperativo','correo','whatsapp','telefono','telefonoAlterno','tenantId']),
  aseguradoras:new Set(['nombre','pais','estadoOperativo','vinculada','tarifasHabilitadas','cotizadorHabilitado','comparativoHabilitado','tenantId'])
};

export const VISUAL_SEAL = {
  trackedFileCount: 309,
  pathDigest: '517056dee1200503b2e7295a333cb804bc71271bbaa87847fa762da025f276f1',
  contentDigest: '9e737a2e20ee868ec804a66d249957260164ea393ed4576d4a67b3508a00f762',
  indexDigest: 'b57b6581ee02d2dde42a8a2c1272d57f19b7ad6809d13a1d25111f3d71a96074',
  sealRevision: 'academia-rootfix-20260802.1',
  sourceRun: 30762785016,
  sourceArtifact: 8837976901
};
