const pick=(row,keys)=>{
 const out={};for(const k of keys)if(row&&Object.prototype.hasOwnProperty.call(row,k)&&row[k]!=null)
   out[k]=JSON.parse(JSON.stringify(row[k]));
 return out;
};
const sanitize=(v,depth=0)=>{
 if(depth>6)throw new Denied('DIRECTORY_NESTING_EXCEEDED');
 if(Array.isArray(v)){
  if(v.length>300)throw new Denied('DIRECTORY_ARRAY_EXCEEDED');
  return v.map(x=>sanitize(x,depth+1));
 }
 if(v&&typeof v==='object'){
  const out={};
  for(const [key,value] of Object.entries(v)){
   if(/^(?:password|pass|pwd|contrasena|contraseña|clave|secret|token|accesstoken|refreshtoken|privatekey|clientsecret|credentialvalue|credential_value|apikey|passwordhash|jwt|authorization|credentials|secretkey)$/i.test(key))continue;
   if(['__proto__','prototype','constructor'].includes(key))throw new Denied('DIRECTORY_UNSAFE_FIELD');
   out[key]=sanitize(value,depth+1);
  }return out;
 }
 return v;
};
const viewDirectory=(coll,row,id,country,tenantId)=>{
 const base={id,canonicalDocumentId:id,tenantId,pais:country};
 if(coll==='asesores')return Object.assign(sanitize(pick(row,['nombre','displayName','name','activo','active','inactivo','estado','status','paises','countries','paisDefault','countryDefault','teamId','equipoId','roles','rol','rolDefault','tipo','metaPrima','metaRecaudo','email','telefono','tel','cargo','color','foto','avatar','scopeDatos','dataScopes','modulosExtra','modulosRestringidos','modulesExtra','modulesRestricted','comModo','shareCom','comValor','accessProvisioned','invitacionEstado','authUid','uid','userId','equipoAsesorIds'])),base);
 const a=pick(row,['nombre','canonicalName','displayName','nit','codigoIntermediario','web','portal','logo','logoAssetRef','logoContentHash','color','responsable','telGeneral','emergencia','observaciones','ultimaRevision','vinculada','ramos','ramosHabilitados','ramosDetalle','cotTasas','cotTasasValidadas','comisionDefault','comisiones','drive','docs','docsRequeridos','estado','activo','actualizado']);
 const schema={
  facturacion:['razonSocial','dirFiscal','regimen','correo','nit','documento'],
  contactos:['nombre','area','email','tel','ext','cargo','pais','canal','vigencia','gestionPreferida','principal'],
  portales:['id','nombre','tipo','url','usuario','user','login','pais','estadoAcceso','responsable','ultimaVerificacion','credentialRef'],
  cuentas:['id','banco','tipo','numero','moneda','titular','linkPago','ultimaVerificacion','pais']
 };
 for(const [key,keys] of Object.entries(schema)){
  if(Array.isArray(row[key]))a[key]=row[key].map(x=>pick(x,keys));
  else if(key==='facturacion'&&row[key]&&typeof row[key]==='object')a[key]=pick(row[key],keys);
 }
 return Object.assign(sanitize(a),base);
};
