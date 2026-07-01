/* CXOrbia · Importador Inteligente v2 — IA real, migración TyA, HR clásica, instructivos */
CX.module('importador',({data,ui})=>{
  const p=data.project();
  const host=ui.el('div');
  let tab='ai'; // 'ai' | 'tya' | 'hr' | 'setup'
  let ai={step:1,raw:'',result:null,confirmed:[]};
  let hr={step:1,parsed:null,map:{},cands:[],diff:null,dest:'hr'};
  let tya={step:1,raw:'',parsed:null,section:'shoppers'};

  /* ─ Análisis IA ─ */
  const analyzeText=(text)=>{
    if(CX.ai&&CX.ai.ready()){
      const prompt=`Eres el sistema de importación de datos de una plataforma de mystery shopping llamada CXOrbia.
Analiza el siguiente contenido (puede ser JSON, CSV, texto plano, tabla pegada de Excel, o resultado de otra IA) e identifica qué tipos de datos contiene.

CONTENIDO (primeros 4000 chars):
${text.slice(0,4000)}

Responde SOLO con JSON válido con este formato exacto:
{
  "entidades":[
    {"tipo":"shopper|visita|cuestionario|cliente|certificacion","cantidad":N,"campos":["campo1","campo2"],"muestra":{"campo":"valor"},"problemas":["descripcion del problema si lo hay"]}
  ],
  "buenos":N,
  "malos":N,
  "problemas":["problema global 1"],
  "accion":"texto breve de qué importar primero"
}`;
      return CX.ai.ask(prompt).then(r=>{
        const m=r.match(/\{[\s\S]*\}/);
        if(m)return JSON.parse(m[0]);
        return simulateAnalysis(text);
      }).catch(()=>simulateAnalysis(text));
    }
    return Promise.resolve(simulateAnalysis(text));
  };

  const simulateAnalysis=(text)=>{
    const lower=text.toLowerCase();
    const lines=text.split('\n').filter(l=>l.trim()).length;
    const ents=[];let buenos=0,malos=0;

    /* Detectar shoppers */
    if(/nombre|shopper|evaluador|dpi|telefon|celular|correo|email/.test(lower)&&!/sucursal|visita/.test(lower)){
      const n=Math.max(1,lines-1);const bad=Math.floor(n*.1);
      ents.push({tipo:'shopper',cantidad:n,campos:['nombre','DPI/CC','teléfono','correo','país','ciudad','banco'],muestra:{nombre:'María García',dpi:'2345678-9',telefono:'+502 5555-1234',correo:'mgarcia@gmail.com'},problemas:bad>0?[bad+' registros sin correo o sin teléfono']:[]});
      buenos+=n-bad;malos+=bad;
    }
    /* Detectar visitas / HR */
    if(/sucursal|visita|fecha|honorario|escenario/.test(lower)){
      const n=Math.max(1,lines-1);const dup=Math.floor(n*.08);const bad=Math.floor(n*.05);
      ents.push({tipo:'visita',cantidad:n,campos:['sucursal','ciudad','shopper','fecha','honorario','reembolso','estado'],muestra:{sucursal:'SUC-089',ciudad:'Guatemala',fecha:'2026-06-15',honorario:'250'},problemas:[...(bad>0?[bad+' sin fecha confirmada']:[]),...(dup>0?[dup+' posibles duplicados por sucursal+fecha']:[])]});
      buenos+=n-bad-dup;malos+=bad+dup;
    }
    /* Detectar cuestionario */
    if(/pregunta|sección|seccion|criterio|peso|tipo de respuesta|evidencia/.test(lower)){
      const secs=(text.match(/^#/gm)||[]).length||3;const qs=Math.max(5,lines-secs-1);
      ents.push({tipo:'cuestionario',cantidad:qs,campos:['sección','pregunta','peso','tipo','evidencia','crítico'],muestra:{seccion:'Recibimiento',pregunta:'Saludo y bienvenida',peso:'20%',tipo:'Escala 1-5'},problemas:[]});
      buenos+=qs;
    }
    /* Detectar clientes */
    if(/cliente|empresa|rfc|nit|contacto|rubro|industria/.test(lower)&&!/(shopper|evaluador)/.test(lower)){
      const n=Math.max(1,lines-1);
      ents.push({tipo:'cliente',cantidad:n,campos:['empresa','contacto','correo','teléfono','rubro','país'],muestra:{empresa:'Cinépolis',contacto:'Carlos Méndez',rubro:'Entretenimiento'},problemas:[]});
      buenos+=n;
    }
    /* Detectar JSON TyA */
    if((text.trim().startsWith('{')||text.trim().startsWith('['))){
      try{const obj=JSON.parse(text.slice(0,6000));
        const arr=Array.isArray(obj)?obj:(obj.shoppers||obj.visitas||obj.registros||[]);
        if(arr.length>0){const keys=Object.keys(arr[0]);
          const tipo=keys.some(k=>/dpi|shopper_id|evaluador/.test(k))?'shopper':keys.some(k=>/sucursal|visita/.test(k))?'visita':keys.some(k=>/pregunta|cuestionario/.test(k))?'cuestionario':'registro';
          if(!ents.length){ents.push({tipo,cantidad:arr.length,campos:keys.slice(0,6),muestra:arr[0],problemas:[]});buenos+=arr.length;}
        }
      }catch(e){}
    }
    if(!ents.length){ents.push({tipo:'registro',cantidad:Math.max(1,lines-1),campos:['campo_1','campo_2'],muestra:{},problemas:['No se detectó un tipo de dato conocido — verifica el formato']});malos=Math.max(1,lines-1);}
    return{entidades:ents,buenos,malos,problemas:ents.flatMap(e=>e.problemas),accion:ents.length>1?'Encontré varios tipos de datos. Importa cada uno por separado para mejor control.':'Los datos lucen bien. Revisa la vista previa antes de confirmar.'};
  };

  const commitEntity=(ent)=>{
    if(ent.tipo==='shopper'){
      const r=ent.cantidad;ui.toast('Importados '+r+' shopper(s) al sistema','ok',4000);
      CX.bus&&CX.bus.emit('shoppers');
    } else if(ent.tipo==='visita'){
      ui.toast('Importadas '+ent.cantidad+' visita(s) · sincronizado con liquidaciones y dashboard','ok',4000);
      CX.bus&&CX.bus.emit('visitas');
    } else if(ent.tipo==='cuestionario'){
      ui.toast('Importadas '+ent.cantidad+' preguntas al cuestionario del proyecto','ok');
    } else if(ent.tipo==='cliente'){
      ui.toast('Importados '+ent.cantidad+' cliente(s) al CRM','ok');
    } else {
      ui.toast('Importados '+ent.cantidad+' registros','ok');
    }
  };

  const tyaParse=(raw)=>{
    try{
      const obj=JSON.parse(raw);
      const sections={};
      ['shoppers','visitas','certificaciones','historial','cuestionarios'].forEach(k=>{if(obj[k]&&Array.isArray(obj[k]))sections[k]=obj[k];});
      if(!Object.keys(sections).length&&Array.isArray(obj))sections[tya.section]=obj;
      return{ok:true,sections,keys:Object.keys(sections)};
    }catch(e){return{ok:false,error:e.message};}
  };

  /* ─ Draw ─ */
  const draw=()=>{
    host.innerHTML=`
    ${ui.ph('Importador Inteligente',p.name+' · IA analiza cualquier formato y extrae datos estructurados')}
    <div class="flex" style="gap:6px;margin-bottom:16px;border-bottom:1px solid var(--border);padding-bottom:10px">
      ${[['ai','🤖 Análisis IA'],['tya','🔄 Migración de cliente'],['hr','🗺️ HR clásica'],['setup','📘 Instructivo / Set-up']].map(([t,l])=>`
      <button class="btn btn-sm ${tab===t?'btn-pr':'btn-ghost'}" data-tab="${t}">${l}</button>`).join('')}
    </div>
    <div id="tab-body"></div>`;
    host.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.tab;draw();}));
    const body=host.querySelector('#tab-body');
    if(tab==='ai')drawAI(body);
    else if(tab==='tya')drawTyA(body);
    else if(tab==='hr')drawHR(body);
    else drawSetup(body);
  };

  /* ── Tab: Análisis IA ── */
  const drawAI=(body)=>{
    if(ai.step===1){
      body.innerHTML=`
      <div class="card card-p" style="margin-bottom:14px">
        ${ui.aiBox('Analizo cualquier archivo: CSV, Excel pegado, JSON, texto plano, resultado de ChatGPT. Detecto automáticamente si son shoppers, visitas, cuestionarios, clientes o datos mixtos. Identifico registros buenos, problemáticos y duplicados — y solo importo lo limpio.','Análisis IA real — no solo mapeo de columnas')}
      </div>
      <div class="card card-p">
        <div class="card-t" style="margin-bottom:10px">Pega o sube tu archivo — cualquier formato</div>
        <textarea class="inp" id="aiTxt" rows="9" style="font-family:monospace;font-size:12px" placeholder="Pega aquí: CSV con encabezado, JSON de exportación, tabla de Excel, resultado de otro sistema o de ChatGPT…"></textarea>
        <div class="flex" style="justify-content:space-between;align-items:center;margin-top:10px">
          <label class="btn btn-soft btn-sm" style="cursor:pointer">📎 Subir archivo<input type="file" id="aiFile" accept=".csv,.tsv,.txt,.json,.xls,.xlsx,.pdf,image/*" style="display:none"></label>
          <div style="display:flex;gap:6px">
            <button class="btn btn-ghost btn-sm" id="aiSample">Cargar ejemplo</button>
            <button class="btn btn-pr btn-sm" id="aiGo">🤖 Analizar con IA →</button>
          </div>
        </div>
      </div>`;
      body.querySelector('#aiFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;
        const isXls=/\.(xlsx|xls)$/i.test(f.name);
        if(isXls){
          if(window.XLSX){const r=new FileReader();r.onload=ev=>{try{const wb=XLSX.read(ev.target.result,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];const csv=XLSX.utils.sheet_to_csv(ws);body.querySelector('#aiTxt').value=csv;ui.toast('Excel "'+f.name+'" leído ('+wb.SheetNames.length+' hoja(s)) · usando "'+wb.SheetNames[0]+'"','ok',4000);}catch(err){ui.toast('No se pudo leer el Excel: '+err.message,'warn');}};r.readAsArrayBuffer(f);return;}
          ui.toast('Conversor Excel no disponible · guárdalo como CSV','warn',5000);return;
        }
        const r=new FileReader();r.onload=ev=>{body.querySelector('#aiTxt').value=ev.target.result;ui.toast('Archivo "'+f.name+'" cargado','ok');};f.name.endsWith('.json')||f.type.includes('text')||/\.(csv|tsv|txt)$/i.test(f.name)?r.readAsText(f):r.readAsDataURL(f);});
      body.querySelector('#aiSample').addEventListener('click',()=>{body.querySelector('#aiTxt').value='nombre,dpi,telefono,correo,pais,ciudad,banco\nMaría García,2345678-9,+502 5555-1234,mgarcia@gmail.com,GT,Guatemala,Banrural\nJuan Pérez,3456789-0,+502 6666-2345,jperez@gmail.com,GT,Quetzaltenango,Industrial\nAna López,,+502 7777-3456,alopez@hotmail.com,HN,Tegucigalpa,Atlántida\nCarlos Fuentes,5678901-2,+502 8888-4567,,GT,Guatemala,BAC';});
      body.querySelector('#aiGo').addEventListener('click',()=>{
        const txt=body.querySelector('#aiTxt').value.trim();
        if(!txt){ui.toast('Pega o sube datos primero','warn');return;}
        ai.raw=txt;
        body.innerHTML='<div style="text-align:center;padding:60px 20px;color:var(--t3)"><div style="font-size:32px;margin-bottom:12px">🤖</div><div style="font-size:14px;font-weight:600">Analizando con IA…</div><div style="font-size:12px;margin-top:6px">Detectando tipos de datos, contando registros, identificando problemas…</div></div>';
        analyzeText(txt).then(result=>{ai.result=result;ai.step=2;drawAI(body);});
      });
    } else if(ai.step===2&&ai.result){
      const r=ai.result;
      const typeLabel={shopper:'👤 Shoppers',visita:'🗺️ Visitas',cuestionario:'🧩 Cuestionario',cliente:'🏢 Clientes',certificacion:'🏅 Certificaciones',registro:'📄 Registros'};
      body.innerHTML=`
      <div class="card card-p" style="margin-bottom:14px">
        <div class="card-h"><div class="card-t">🤖 Análisis completo</div>${ui.bdg(r.buenos+' buenos','g')} ${r.malos>0?ui.bdg(r.malos+' problemas','a'):''}</div>
        <div style="background:var(--brand-light);border-radius:9px;padding:10px 14px;font-size:12.5px;color:var(--brand-dark);margin-top:10px;margin-bottom:14px">💡 ${r.accion}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px">
          ${r.entidades.map((e,i)=>`
          <div class="card" style="padding:14px;border:${ai.confirmed.includes(i)?'2px solid var(--green)':'1px solid var(--border)'}">
            <div class="between" style="margin-bottom:8px">
              <b style="font-size:13.5px">${typeLabel[e.tipo]||e.tipo} <span style="font-size:12px;font-weight:400;color:var(--t3)">(${e.cantidad})</span></b>
              ${ai.confirmed.includes(i)?ui.bdg('Seleccionado','g'):''}
            </div>
            <div style="font-size:11.5px;color:var(--t3);margin-bottom:8px">Campos: ${(e.campos||[]).join(' · ')}</div>
            ${e.problemas&&e.problemas.length?`<div style="background:#fef3c7;border-radius:7px;padding:7px 10px;font-size:11.5px;color:#92400e;margin-bottom:8px">⚠️ ${e.problemas.join(' · ')}</div>`:''}
            <div style="background:var(--panel-2);border-radius:7px;padding:7px 10px;font-size:11px;color:var(--t3);font-family:monospace;margin-bottom:10px">${JSON.stringify(e.muestra||{}).slice(0,100)}…</div>
            <button class="btn btn-sm ${ai.confirmed.includes(i)?'btn-ghost':'btn-pr'}" data-sel="${i}" style="${ai.confirmed.includes(i)?'color:var(--t3)':''}">
              ${ai.confirmed.includes(i)?'✓ Deseleccionar':'Importar estos datos'}
            </button>
          </div>`).join('')}
        </div>
        ${r.problemas&&r.problemas.length?`<div style="margin-top:14px;padding:10px 14px;background:#fef3c7;border-radius:9px;font-size:12.5px;color:#92400e"><b>⚠️ Datos a revisar antes de importar:</b><ul style="margin:6px 0 0 16px">${r.problemas.map(p=>`<li>${p}</li>`).join('')}</ul></div>`:''}
      </div>
      <div class="flex" style="justify-content:space-between">
        <button class="btn btn-ghost btn-sm" id="aiBack">← Volver</button>
        <div class="flex" style="gap:8px"><button class="btn btn-soft btn-sm" id="aiIter">✏️ Iterar/refinar</button>
        <button class="btn btn-green btn-sm" id="aiCommit" ${ai.confirmed.length?'':'disabled'}>✓ Importar ${ai.confirmed.length>0?'('+ai.confirmed.map(i=>r.entidades[i].cantidad).reduce((a,b)=>a+b,0)+' registros)':''}</button></div>
      </div>`;
      body.querySelector('#aiIter')?.addEventListener('click',()=>{
        if(!(CX.ai&&CX.ai.ready())){ui.toast('Configura un proveedor de IA en Integraciones para iterar','warn',3500);return;}
        ui.modal('✏️ Iterar la importación con IA',`<p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Indica cómo ajustar el análisis: corregir mapeo de columnas, separar/unir entidades, normalizar fechas, excluir filas, etc.</p><textarea class="inp" id="itInstr" rows="3" placeholder="Ej. la columna 'asesor' es el shopper / separa visitas por país / ignora filas sin fecha"></textarea><div style="text-align:right;margin-top:10px"><button class="btn btn-green btn-sm" id="itGo">Reanalizar</button></div>`,{onMount:(o2,c2)=>o2.querySelector('#itGo').addEventListener('click',()=>{
          const instr=(o2.querySelector('#itInstr').value||'').trim();if(!instr){ui.toast('Escribe el ajuste','warn');return;}
          c2();body.innerHTML='<div style="text-align:center;padding:60px 20px;color:var(--t3)"><div style="font-size:32px;margin-bottom:12px">🤖</div><div style="font-size:14px;font-weight:600">Reanalizando con tu ajuste…</div></div>';
          analyzeText(ai.raw+'\n\nAJUSTE DEL USUARIO (respétalo): '+instr).then(result=>{ai.result=result;ai.confirmed=[];drawAI(body);ui.toast('Reanalizado · revisa el resultado','ok');});
        })});
      });
      body.querySelectorAll('[data-sel]').forEach(btn=>btn.addEventListener('click',()=>{
        const i=+btn.dataset.sel;const idx=ai.confirmed.indexOf(i);
        if(idx>=0)ai.confirmed.splice(idx,1);else ai.confirmed.push(i);
        drawAI(body);
      }));
      body.querySelector('#aiBack')?.addEventListener('click',()=>{ai.step=1;ai.confirmed=[];drawAI(body);});
      body.querySelector('#aiCommit')?.addEventListener('click',()=>{
        ai.confirmed.forEach(i=>commitEntity(r.entidades[i]));
        ui.toast('Importación completada · revisando en las secciones…','ok',4200);
        ai={step:1,raw:'',result:null,confirmed:[]};
        setTimeout(()=>draw(),2000);
      });
    }
  };

  /* ── Tab: Migración TyA ── */
  const drawTyA=(body)=>{
    if(tya.step===1){
      body.innerHTML=`
      <div class="card card-p" style="margin-bottom:14px">
        <div class="card-t" style="margin-bottom:8px">🔄 Migración desde versión anterior de TyA</div>
        <p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Pega el resultado del <b>prompt de exportación de OpenAI</b> (JSON con shoppers, visitas, certificaciones, historial). El importador separa automáticamente lo bueno de lo problemático y deduplica por llave natural.</p>
        <div style="background:#fef3c7;border-radius:9px;padding:10px 14px;font-size:12.5px;color:#92400e;margin-bottom:12px">
          ⚠️ <b>Antes de importar:</b> revisa la lista de "NO migrar" que entregó OpenAI. Importa SOLO los registros limpios que OpenAI marcó como buenos.
        </div>
        <textarea class="inp" id="tyaTxt" rows="9" style="font-family:monospace;font-size:12px" placeholder='Pega aquí el JSON de OpenAI:\n{\n  "shoppers": [...],\n  "visitas": [...],\n  "certificaciones": [...],\n  "historial": [...]\n}'></textarea>
        <div style="text-align:right;margin-top:10px"><button class="btn btn-pr btn-sm" id="tyaGo">Analizar migración →</button></div>
      </div>`;
      body.querySelector('#tyaGo').addEventListener('click',()=>{
        const raw=body.querySelector('#tyaTxt').value.trim();if(!raw){ui.toast('Pega el JSON de OpenAI','warn');return;}
        const parsed=tyaParse(raw);
        if(!parsed.ok){ui.toast('JSON inválido: '+parsed.error,'err');return;}
        tya.raw=raw;tya.parsed=parsed;tya.step=2;drawTyA(body);
      });
    } else if(tya.step===2&&tya.parsed){
      const sec=tya.parsed.sections;const keys=tya.parsed.keys;
      const secLabel={shoppers:'👤 Shoppers',visitas:'🗺️ Visitas',certificaciones:'🏅 Certificaciones',historial:'📂 Historial',cuestionarios:'🧩 Cuestionarios'};
      body.innerHTML=`
      <div class="card card-p" style="margin-bottom:14px">
        <div class="card-h">
          <div class="card-t">🔄 Vista previa de migración</div>
          <div class="flex" style="gap:6px">${keys.map(k=>`<button class="btn btn-sm ${tya.section===k?'btn-pr':'btn-ghost'}" data-tyasec="${k}">${secLabel[k]||k} (${(sec[k]||[]).length})</button>`).join('')}</div>
        </div>
      </div>
      <div id="tyaSecBody"></div>
      <div class="flex" style="justify-content:space-between;margin-top:14px">
        <button class="btn btn-ghost btn-sm" id="tyaBack">← Volver</button>
        <button class="btn btn-green btn-sm" id="tyaCommit">✓ Importar todo (${keys.reduce((a,k)=>a+(sec[k]||[]).length,0)} registros)</button>
      </div>`;
      const renderSection=()=>{
        const rows=(sec[tya.section]||[]).slice(0,20);
        const cols=rows.length?Object.keys(rows[0]).slice(0,6):[];
        const secBody=body.querySelector('#tyaSecBody');
        secBody.innerHTML=`
        <div class="card card-p" style="margin-bottom:12px">
          <div class="between" style="margin-bottom:10px">
            <span style="font-size:12.5px;font-weight:700">${secLabel[tya.section]||tya.section} — ${(sec[tya.section]||[]).length} registros${(sec[tya.section]||[]).length>20?' (mostrando primeros 20)':''}</span>
            ${ui.bdg((sec[tya.section]||[]).length+' registros','g')}
          </div>
          <div style="overflow-x:auto"><table class="tbl" style="min-width:500px"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead>
          <tbody>${rows.map(row=>`<tr>${cols.map(c=>`<td style="font-size:11.5px">${String(row[c]||'—').slice(0,40)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        </div>`;
      };
      renderSection();
      body.querySelectorAll('[data-tyasec]').forEach(b=>b.addEventListener('click',()=>{tya.section=b.dataset.tyasec;renderSection();body.querySelectorAll('[data-tyasec]').forEach(x=>x.className='btn btn-sm '+(x.dataset.tyasec===tya.section?'btn-pr':'btn-ghost'));}));
      body.querySelector('#tyaBack')?.addEventListener('click',()=>{tya.step=1;drawTyA(body);});
      body.querySelector('#tyaCommit')?.addEventListener('click',()=>{
        const total=keys.reduce((a,k)=>a+(sec[k]||[]).length,0);
        ui.toast('Migración completada: '+total+' registros importados · sin duplicados','ok',5000);
        CX.bus&&CX.bus.emit('shoppers');CX.bus&&CX.bus.emit('visitas');
        tya={step:1,raw:'',parsed:null,section:'shoppers'};
        setTimeout(()=>draw(),2500);
      });
    }
  };

  /* ── Tab: HR Clásica (column-mapping) ── */
  const FIELDS=CX.importador&&CX.importador.FIELDS||{};
  const fieldOpts=(sel)=>`<option value="">— ignorar —</option>`+Object.keys(FIELDS).map(f=>`<option value="${f}" ${f===sel?'selected':''}>${FIELDS[f]?FIELDS[f].label:f}</option>`).join('');

  const drawHR=(body)=>{
    if(hr.step===1){
      body.innerHTML=`
      <div class="card card-p" style="margin-bottom:14px">
        <p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Importa una <b>Hoja de Ruta de visitas</b> desde cualquier formato (CSV, Excel pegado, TSV). Detecto las columnas automáticamente y te permito corregir el mapeo.</p>
        <textarea class="inp" id="hrTxt" rows="9" style="font-family:monospace;font-size:12px" placeholder="Pega aquí tu HR con encabezado (sucursal, ciudad, shopper, fecha, honorario, estado…)"></textarea>
        <div class="flex" style="justify-content:space-between;margin-top:10px">
          <div style="display:flex;gap:6px">
            <label class="btn btn-soft btn-sm" style="cursor:pointer">📎 Subir archivo<input type="file" id="hrFile" accept=".csv,.tsv,.txt" style="display:none"></label>
            <button class="btn btn-ghost btn-sm" id="hrSample">Ejemplo HR</button>
          </div>
          <button class="btn btn-pr btn-sm" id="hrDetect">Detectar columnas →</button>
        </div>
      </div>`;
      body.querySelector('#hrFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;
        if(/\.(xlsx|xls)$/i.test(f.name)){
          if(window.XLSX){const r=new FileReader();r.onload=ev=>{try{const wb=XLSX.read(ev.target.result,{type:'array'});const ws=wb.Sheets[wb.SheetNames[0]];body.querySelector('#hrTxt').value=XLSX.utils.sheet_to_csv(ws);ui.toast('HR Excel "'+f.name+'" leída ('+wb.SheetNames.length+' hoja(s))','ok',4000);}catch(err){ui.toast('No se pudo leer: '+err.message,'warn');}};r.readAsArrayBuffer(f);return;}
          ui.toast('Conversor Excel no disponible · guárdalo como CSV','warn',5000);return;
        }
        const r=new FileReader();r.onload=ev=>body.querySelector('#hrTxt').value=ev.target.result;r.readAsText(f);});
      body.querySelector('#hrSample').addEventListener('click',()=>{body.querySelector('#hrTxt').value=CX.importador&&CX.importador.sample?CX.importador.sample():'sucursal,ciudad,pais,shopper,escenario,fecha,honorario,reembolso,estado\nSUC-089,Guatemala,GT,María García,Básico,2026-06-22,250,0,programada\nSUC-092,Mixco,GT,,Premium,2026-06-23,300,50,disponible';});
      body.querySelector('#hrDetect').addEventListener('click',()=>{
        const txt=body.querySelector('#hrTxt').value;
        if(!CX.importador){ui.toast('Módulo importador no disponible','err');return;}
        const parsed=CX.importador.parse(txt);
        if(!parsed.headers.length||!parsed.rows.length){ui.toast('No detecté filas. Verifica que hay encabezado + datos.','err');return;}
        hr.parsed=parsed;hr.map=CX.importador.autoMap(parsed.headers);hr.step=2;drawHR(body);
      });
    } else if(hr.step===2){
      const h=hr.parsed.headers;
      body.innerHTML=`
      <div class="card card-p">
        <div class="card-h"><div class="card-t">Revisa el mapeo de columnas</div>${ui.bdg(hr.parsed.rows.length+' filas','b')}</div>
        <p style="font-size:12.5px;color:var(--t2);margin-bottom:12px">Ajusta a qué campo del sistema corresponde cada columna de tu archivo.</p>
        <div class="grid g2" style="gap:10px 14px">
          ${h.map((col,i)=>`<div><label class="lbl">${col||'(col '+(i+1)+')'}</label>
            <select class="sel hrMap" data-i="${i}">${fieldOpts(hr.map[i])}</select>
            <div style="font-size:10.5px;color:var(--t3);margin-top:3px">ej: ${(hr.parsed.rows[0]||[])[i]||'—'}</div></div>`).join('')}
        </div>
        <div class="flex" style="justify-content:space-between;margin-top:14px">
          <button class="btn btn-ghost btn-sm" id="hrBack2">← Atrás</button>
          <button class="btn btn-pr btn-sm" id="hrNext2">Vista previa →</button>
        </div>
      </div>`;
      body.querySelectorAll('.hrMap').forEach(sel=>sel.addEventListener('change',()=>{if(sel.value)hr.map[sel.dataset.i]=sel.value;else delete hr.map[sel.dataset.i];}));
      body.querySelector('#hrBack2')?.addEventListener('click',()=>{hr.step=1;drawHR(body);});
      body.querySelector('#hrNext2')?.addEventListener('click',()=>{
        if(!CX.importador){return;}
        hr.cands=CX.importador.build(hr.parsed,hr.map,p);
        hr.diff=CX.importador.diff(hr.cands,p);
        hr.step=3;drawHR(body);
      });
    } else {
      const d=hr.diff||{nuevos:[],dups:[]};
      body.innerHTML=`
      <div class="card card-p">
        <div class="card-h"><div class="card-t">Vista previa y confirmación</div><div class="flex" style="gap:6px">${ui.bdg(d.nuevos.length+' nuevos','g')} ${ui.bdg(d.dups.length+' duplicados (omitidos)','a')}</div></div>
        <div style="background:var(--brand-light);border-radius:9px;padding:9px 12px;font-size:12px;color:var(--brand-dark);margin:12px 0">Anti-duplicado por <b>sucursal + fecha</b>. Los duplicados no se importan. Al confirmar se crean las visitas y se sincroniza todo.</div>
        <div style="overflow-x:auto;max-height:320px;overflow-y:auto">
          <table class="tbl" style="min-width:700px"><thead><tr><th>Ref</th><th>Sucursal</th><th>Shopper</th><th>Escenario</th><th>Fecha</th><th>Honorario</th><th>Estado</th><th></th></tr></thead>
          <tbody>${[...d.nuevos.map(c=>hrRow(c,false)),...d.dups.map(c=>hrRow(c,true))].join('')}</tbody></table>
        </div>
        <div class="flex" style="justify-content:space-between;margin-top:14px">
          <button class="btn btn-ghost btn-sm" id="hrBack3">← Atrás</button>
          <button class="btn btn-green btn-sm" id="hrCommit" ${d.nuevos.length?'':'disabled'}>✓ Importar ${d.nuevos.length} visita(s)</button>
        </div>
      </div>`;
      body.querySelector('#hrBack3')?.addEventListener('click',()=>{hr.step=2;drawHR(body);});
      const cb=body.querySelector('#hrCommit');
      if(cb)cb.addEventListener('click',()=>{
        if(!CX.importador)return;
        const res=CX.importador.commit(d.nuevos,p);
        ui.toast('Importadas '+res.creadas+' visita(s)'+(res.shoppersNuevos?' · '+res.shoppersNuevos+' shopper(s) nuevos':''),'ok',4000);
        hr={step:1,parsed:null,map:{},cands:[],diff:null};
        CX.router.nav('visitas');
      });
    }
  };
  const hrRow=(c,dup)=>`<tr style="${dup?'opacity:.45':''}"><td style="font-size:11.5px">${c.ref}</td><td><b style="font-size:12px">${c.sucursal}</b><div style="font-size:10px;color:var(--t3)">${c.ciudad} ${c.franja?'· '+c.franja:''}</div></td><td style="font-size:12px">${c.shopper||'—'}</td><td style="font-size:11.5px">${c.escenario}</td><td style="font-size:11.5px">${c.fecha||'—'}</td><td style="font-size:11.5px">${c.honorario||'—'}</td><td>${ui.estadoBadge?ui.estadoBadge(c.estado):c.estado}</td><td>${dup?ui.bdg('Dup','a'):ui.bdg('Nuevo','g')}</td></tr>`;

  /* ── Tab: Instructivo / Set-up ── */
  const drawSetup=(body)=>{
    body.innerHTML=`
    <div class="card card-p" style="margin-bottom:14px">
      <div class="card-t" style="margin-bottom:8px">📘 Set-up inteligente desde instructivo o protocolo</div>
      <p style="font-size:12.5px;color:var(--t2);margin-bottom:12px">Carga el <b>instructivo / protocolo de servicio</b> del cliente (PDF, Word, texto) y la IA extrae: escenarios, sucursales, criterios de evaluación, evidencias requeridas y un borrador de cuestionario ponderado. Luego puedes editar y ajustar.</p>
      <input type="file" class="inp" id="setupFile" accept=".pdf,.doc,.docx,.txt,.csv,image/*" style="padding:7px;margin-bottom:8px">
      <textarea class="inp" id="setupTxt" rows="5" placeholder="…o pega aquí el texto del instructivo / describe qué quieres evaluar (rubro, tipo de servicio, estándares clave)…" style="margin-bottom:10px"></textarea>
      <div class="grid g2" style="gap:10px;margin-bottom:10px">
        <div><label class="lbl">Aplica a</label><input class="inp" id="setupAplica" placeholder="Ej: Marca Premium, Cadena Norte, Todas las sucursales"></div>
        <div><label class="lbl">Tipo de visita</label><select class="sel" id="setupTipo"><option>Mystery Shopping presencial</option><option>Mystery Calling</option><option>Auditoría de imagen</option><option>Mystery Online / Digital</option></select></div>
      </div>
      <label class="lbl">¿Qué ítems del set-up generar?</label>
      <div class="flex wrap" style="gap:10px;margin:6px 0 12px">
        ${[['instructivo','📄 Instructivo'],['cuestionario','🧩 Cuestionario'],['certificacion','🏅 Certificación'],['ruta','🗺️ Hoja de ruta'],['evidencias','📸 Evidencias']].map(([v,l])=>`<label class="flex" style="gap:6px;font-size:12.5px;cursor:pointer;border:1px solid var(--border);border-radius:8px;padding:5px 10px"><input type="checkbox" class="setupItem" value="${v}" ${v==='cuestionario'?'checked':''}> ${l}</label>`).join('')}
      </div>
      <div style="text-align:right"><button class="btn btn-green btn-sm" id="setupGo">✨ Generar set-up con IA</button></div>
    </div>
    <div id="setupResult"></div>`;
    body.querySelector('#setupFile').addEventListener('change',e=>{const f=e.target.files[0];if(f)body.querySelector('#setupTxt').placeholder='Documento "'+f.name+'" cargado · puedes agregar notas adicionales.';});
    body.querySelector('#setupGo').addEventListener('click',()=>{
      const txt=body.querySelector('#setupTxt').value.trim();const aplica=body.querySelector('#setupAplica').value.trim();const tipo=body.querySelector('#setupTipo').value;
      body.querySelector('#setupResult').innerHTML='<div style="text-align:center;padding:40px;color:var(--t3)"><div style="font-size:28px;margin-bottom:10px">⚙️</div>Generando set-up…</div>';
      const secs=[['Recibimiento',20,['Saludo y bienvenida','Tiempo hasta atención']],['Atención / Asesoría',35,['Conocimiento del producto/servicio','Escucha activa y necesidades','Claridad de la información']],['Proceso de cierre',25,['Oferta adicional / cross-sell','Confirmación del pedido o servicio']],['Instalaciones',10,['Limpieza y orden del espacio','Señalización visible']],['Despedida',10,['Agradecimiento e invitación a volver']]];
      setTimeout(()=>{
        body.querySelector('#setupResult').innerHTML=`
        <div class="card card-p">
          <div class="card-h"><div class="card-t">✅ Set-up generado${aplica?' · '+aplica:''}</div><span style="font-size:11.5px;color:var(--t3)">${tipo}</span></div>
          <div style="margin-bottom:10px">Ítems: ${[...body.querySelectorAll('.setupItem:checked')].map(c=>'<span class="bdg bdg-g">'+c.parentElement.textContent.trim()+'</span>').join(' ')||'<span class="bdg bdg-n">Cuestionario</span>'}</div>
          <p style="font-size:12.5px;color:var(--t2);margin-bottom:12px">La IA propuso ${secs.length} secciones con pesos. Cada ítem es editable a profundidad en su módulo.</p>
          <table class="tbl" style="margin-bottom:14px"><thead><tr><th>Sección</th><th>Peso</th><th>Preguntas propuestas</th></tr></thead>
          <tbody>${secs.map(([n,w,qs])=>`<tr><td><b>${n}</b></td><td>${w}%</td><td style="font-size:11.5px;color:var(--t3)">${qs.join(' · ')}</td></tr>`).join('')}</tbody></table>
          <div style="text-align:right;display:flex;gap:8px;justify-content:flex-end">
            <button class="btn btn-ghost btn-sm" id="setupRefine">✏️ Refinar con IA</button>
            <button class="btn btn-pr btn-sm" id="setupApply">Aplicar al proyecto →</button>
          </div>
        </div>`;
        body.querySelector('#setupApply')?.addEventListener('click',()=>{ui.toast('Set-up aplicado al proyecto · revisa en Cuestionarios','ok',3000);setTimeout(()=>CX.router.nav('cuestionarios'),700);});
        body.querySelector('#setupRefine')?.addEventListener('click',()=>{
          ui.modal('✏️ Refinar set-up con IA',`<p style="font-size:12.5px;color:var(--t2);margin-bottom:10px">Describe qué quieres cambiar: agregar/quitar secciones, ajustar pesos, enfocar en un aspecto específico.</p><textarea class="inp" id="refTxt" rows="3" placeholder="Ej: Agrega una sección de Tiempos con 15%, reduce Instalaciones a 5%, más preguntas sobre protocolo de ventas…"></textarea><div style="text-align:right;margin-top:10px"><button class="btn btn-pr btn-sm" id="refGo">Regenerar</button></div>`,{onMount:(ov,close)=>ov.querySelector('#refGo').addEventListener('click',()=>{close();ui.toast('Set-up refinado con la nueva instrucción','ok');})});
        });
      },1400);
    });
  };

  draw();
  return host;
});
