'use strict';

const VERSION='ays-cotcomp-real-quote-corpus-s471-v1.0';

const CLUSTERS=Object.freeze([
  Object.freeze({
    clusterId:'GT_AUTO_YARIS_2008_37500',
    country:'GT',product:'AUTO',brand:'TOYOTA',lineModel:'YARIS',year:2008,insuredValue:37500,
    currentW5Case:true,
    sources:Object.freeze([
      Object.freeze({
        insurer:'Aseguradora Guatemalteca',
        sourceSha256:'0bad818159c0b16f72ba1f697b8224b6fed5107f1cd12b8f5b50d8ef612c05ca',
        sourceDate:'2026-09-30',
        alternatives:Object.freeze([
          Object.freeze({label:'Aseguate Premium',cashPremium:2508.80}),
          Object.freeze({label:'Aseguate Plus',cashPremium:2273.60})
        ])
      }),
      Object.freeze({
        insurer:'MAPFRE Seguros Guatemala',
        sourceSha256:'ba1b1ef624f96d26ddf5bea85cd9ef25cec238d4743cb09d1ea4609dfc6431e2',
        sourceDate:'2026-09-30',
        alternatives:Object.freeze([Object.freeze({label:'Seguro de Automóvil',cashPremium:3292.80})])
      })
    ])
  }),
  Object.freeze({
    clusterId:'GT_MOTO_PULSAR_NS400Z_2026_25000',
    country:'GT',product:'MOTO',brand:'BAJAJ',lineModel:'PULSAR NS 400Z',year:2026,insuredValue:25000,
    currentW5Case:false,
    sources:Object.freeze([
      Object.freeze({insurer:'Seguros El Roble',sourceSha256:'76443001b665b4fced44267b9485c4305354134fb945b0dfbeb77330602a8782',sourceDate:'2026-09-28',alternatives:Object.freeze([Object.freeze({label:'Motos Seguro Completo y RC',cashPremium:3181.92})])}),
      Object.freeze({insurer:'Seguros Columna',sourceSha256:'386101691f09f77dc5cfd604467a4eb957b40f0b4069e67d9ce09c3f43310221',sourceDate:'2026-09-28',alternatives:Object.freeze([Object.freeze({label:'Manejo Seguro',cashPremium:1965.60,promptPaymentPremium:1867.32})])}),
      Object.freeze({insurer:'MAPFRE Seguros Guatemala',sourceSha256:'34157ce6667d07edb3d1ce3a669874c947a399d62ab901c917ea636e4bb1e23d',sourceDate:'2026-09-28',alternatives:Object.freeze([Object.freeze({label:'Seguro Completo MAPFRE',cashPremium:3618.18})])}),
      Object.freeze({insurer:'Aseguradora La Ceiba',sourceSha256:'2d7b786148d5df0a4b7efc187bbf90fc74f28af7da594a2859daa336c683cafb',sourceDate:'2026-09-28',alternatives:Object.freeze([Object.freeze({label:'Seguro de Motocicleta',cashPremium:2793.00,promptPaymentPremium:2374.05})])})
    ])
  }),
  Object.freeze({
    clusterId:'GT_AUTO_CX5_2022_158000',
    country:'GT',product:'AUTO',brand:'MAZDA',lineModel:'CX-5',year:2022,insuredValue:158000,
    currentW5Case:false,
    sources:Object.freeze([
      Object.freeze({insurer:'Seguros G&T',sourceSha256:'635646588a1a949ab93e6c0c1eded8e69451fb86fc834897b3eb3181c6ec68dd',sourceDate:'2026-09-23',alternatives:Object.freeze([Object.freeze({label:'Todo Riesgo',cashPremium:6021.12,netPremium:5120.00})])}),
      Object.freeze({insurer:'Seguros El Roble',sourceSha256:'a8514a223d0c485a8e2c73b1e06c5bcb4a3b87dfaf97c810468d7db6796ebfbb',sourceDate:'2026-09-23',alternatives:Object.freeze([Object.freeze({label:'Seguro Auto Completo',cashPremium:5609.95})])}),
      Object.freeze({insurer:'Seguros Universales',sourceSha256:'6a625c3664cfe94ea8e3827812726a80aec9d42f0f48c60b91187ed71a650bea',sourceDate:'2026-09-23',alternatives:Object.freeze([Object.freeze({label:'Riesgo Plus',cashPremium:5388.43,promptPaymentPremium:5119.01})])}),
      Object.freeze({insurer:'Aseguradora General',sourceSha256:'f3687c9eda6cbf5404b2018645ac072d52b66e4fdc7c25ef4a5ec25e76d14bbf',sourceDate:'2026-09-23',alternatives:Object.freeze([Object.freeze({label:'GEN Auto',cashPremium:5103.84,promptPaymentPremium:4848.65})])})
    ])
  }),
  Object.freeze({
    clusterId:'GT_AUTO_CX5_2014_58000',
    country:'GT',product:'AUTO',brand:'MAZDA',lineModel:'CX-5',year:2014,insuredValue:58000,
    currentW5Case:false,
    sources:Object.freeze([
      Object.freeze({insurer:'Seguros Bantrab',sourceSha256:'28c6619e614467dfab94a9f39930c1abde75bebf26c4cb7685e7ba34c6dc33cf',sourceDate:'2026-09-22',alternatives:Object.freeze([Object.freeze({label:'Automóvil VIP Todo Riesgo',cashPremium:null,premiumMissing:true})])}),
      Object.freeze({insurer:'Aseguradora Rural',sourceSha256:'d128a85c1d793d82883af437f8a226812c85678e938c2e5aa7ea1d4f6c7825fd',sourceDate:'2026-09-22',alternatives:Object.freeze([Object.freeze({label:'Mi Carro Seguro',cashPremium:3175.20})])}),
      Object.freeze({insurer:'Aseguradora La Ceiba',sourceSha256:'42ee7ded7fd9e8edb2c7715a9b181f2c1007078c1a5e9465b747c4f121f6614e',sourceDate:'2026-09-22',alternatives:Object.freeze([
        Object.freeze({label:'Plan A',cashPremium:3413.46,labelNeedsValidation:true}),
        Object.freeze({label:'Plan B',cashPremium:3942.66,labelNeedsValidation:true})
      ])}),
      Object.freeze({insurer:'Aseguradora Guatemalteca',sourceSha256:'a54693cb21eec6a8449d78991aa9fa8e0ce2fdd9f34c05e1377e219c1da75eda',sourceDate:'2026-09-22',alternatives:Object.freeze([
        Object.freeze({label:'Aseguate Premium',cashPremium:2508.80}),
        Object.freeze({label:'Aseguate Plus',cashPremium:2273.60})
      ])}),
      Object.freeze({insurer:'Seguros Universales',sourceSha256:'c926c9dc398adbdaf563973ac083724c8bf1aab580707873cd595255ae229465',sourceDate:'2026-09-22',alternatives:Object.freeze([Object.freeze({label:'Riesgo Plus',cashPremium:2704.80})])})
    ])
  }),
  Object.freeze({
    clusterId:'GT_AUTO_CRV_2002_35000',
    country:'GT',product:'AUTO',brand:'HONDA',lineModel:'CRV',year:2002,insuredValue:35000,
    currentW5Case:false,
    sources:Object.freeze([
      Object.freeze({insurer:'Seguros Columna',sourceSha256:'4f58078c6153cf4c70add035e7cd3fdd316e54ae44066bdc4028f0870c22b897',sourceDate:'2026-09-28',alternatives:Object.freeze([Object.freeze({label:'Manejo Seguro',cashPremium:2699.20})])})
    ])
  })
]);

function summary(){
  const docs=CLUSTERS.flatMap(c=>c.sources);
  const alternatives=docs.flatMap(s=>s.alternatives);
  return Object.freeze({
    version:VERSION,
    clusters:CLUSTERS.length,
    sourceDocuments:docs.length,
    alternatives:alternatives.length,
    uniqueInsurers:new Set(docs.map(x=>x.insurer)).size,
    currentW5Clusters:CLUSTERS.filter(x=>x.currentW5Case).length,
    motorcycleSourceDocuments:CLUSTERS.find(x=>x.product==='MOTO').sources.length,
    missingPremiumSources:docs.filter(x=>x.alternatives.some(a=>a.premiumMissing===true)).length,
    ambiguousPlanLabelSources:docs.filter(x=>x.alternatives.some(a=>a.labelNeedsValidation===true)).length
  });
}

module.exports=Object.freeze({VERSION,CLUSTERS,summary});
