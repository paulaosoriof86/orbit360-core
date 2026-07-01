/* CXOrbia · Identidad de Marca — logo, colores, tipografía → aplica a toda la plataforma */
CX.module('marca',({data,ui})=>{
  const host=ui.el('div');
  const BRAND_KEY='cx_brand_identity';
  const getBrand=()=>{try{return JSON.parse(localStorage.getItem(BRAND_KEY)||'null');}catch(e){return null;}};
  const saveBrand=(b)=>{localStorage.setItem(BRAND_KEY,JSON.stringify(b));};

  const applyBrand=(brand)=>{
    if(!brand)return;
    const root=document.documentElement;
    if(brand.primary)root.style.setProperty('--brand',brand.primary);
    if(brand.primaryDark)root.style.setProperty('--brand-dark',brand.primaryDark);
    if(brand.primaryLight)root.style.setProperty('--brand-light',brand.primaryLight+'22');
    if(brand.font){
      const link=document.getElementById('cx-brand-font')||document.createElement('link');
      link.id='cx-brand-font';link.rel='stylesheet';
      link.href='https://fonts.googleapis.com/css2?family='+encodeURIComponent(brand.font)+':wght@400;500;600;700;800&display=swap';
      document.head.appendChild(link);
      root.style.setProperty('--font',brand.font+', system-ui, sans-serif');
    }
    if(brand.logo){
      document.querySelectorAll('.cx-brand-logo').forEach(el=>el.src=brand.logo);
    }
  };

  /* Extraer color dominante del logo con Canvas */
  const extractColor=(imgSrc)=>new Promise(resolve=>{
    const img=new Image();img.crossOrigin='anonymous';
    img.onload=()=>{
      const c=document.createElement('canvas');c.width=img.width;c.height=img.height;
      const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
      const data=ctx.getImageData(0,0,c.width,c.height).data;
      const map={};let maxCount=0,dominant='#2196d3';
      for(let i=0;i<data.length;i+=16){
        const r=data[i],g=data[i+1],b=data[i+2],a=data[i+3];
        if(a<100||r+g+b>700||r+g+b<60)continue; // skip transparent, near-white, near-black
        const key=Math.round(r/20)*20+','+Math.round(g/20)*20+','+Math.round(b/20)*20;
        map[key]=(map[key]||0)+1;
        if(map[key]>maxCount){maxCount=map[key];dominant=`rgb(${r},${g},${b})`;}
      }
      resolve(dominant);
    };
    img.onerror=()=>resolve('#2196d3');
    img.src=imgSrc;
  });

  const rgbToDark=(rgb)=>rgb.replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/,(_,r,g,b)=>`rgb(${Math.round(r*.65)},${Math.round(g*.65)},${Math.round(b*.65)})`);

  const brand=getBrand()||{name:'',primary:'',font:'',logo:'',tone:'',colors:[]};
  let preview=null;

  const draw=()=>{
    const b=getBrand();
    host.innerHTML=`
    ${ui.ph('Identidad de Marca','Carga tu logo y documentos de marca — la IA extrae colores, tipografía y tono, y los aplica a toda la plataforma')}

    ${b?`<div style="background:linear-gradient(135deg,${b.primary||'var(--brand)'}22,${b.primary||'var(--brand)'}08);border:1px solid ${b.primary||'var(--brand)'}40;border-radius:12px;padding:16px 20px;margin-bottom:16px;display:flex;align-items:center;gap:16px;flex-wrap:wrap">
      ${b.logo?`<img src="${b.logo}" style="height:48px;object-fit:contain" onerror="this.style.display='none'">`:
               `<div style="width:48px;height:48px;border-radius:10px;background:${b.primary||'var(--brand)'};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:18px">${(b.name||'M')[0]}</div>`}
      <div style="flex:1">
        <div style="font-size:16px;font-weight:800;color:var(--t1)">${b.name||'Tu marca'}</div>
        <div style="font-size:12px;color:var(--t3)">${b.tone||''} ${b.font?'· '+b.font:''}</div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${(b.colors||[b.primary]).filter(Boolean).map(c=>`<div style="width:28px;height:28px;border-radius:6px;background:${c};border:1px solid rgba(0,0,0,.1)" title="${c}"></div>`).join('')}
      </div>
      <button class="btn btn-ghost btn-sm" id="resetBrand" style="color:var(--red)">Restablecer</button>
    </div>`:''}

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <!-- Cargar logo -->
      <div class="card card-p">
        <div class="card-t" style="margin-bottom:8px">1 · Cargar logo</div>
        <p style="font-size:12px;color:var(--t3);margin-bottom:10px">PNG, SVG o JPG con fondo transparente preferiblemente. La IA extrae automáticamente el color primario, secundario y tono de la marca.</p>
        <label class="btn btn-soft btn-sm" style="cursor:pointer;display:block;text-align:center;padding:14px">
          📤 Subir logo<input type="file" id="logoFile" accept="image/*" style="display:none">
        </label>
        <div id="logoPreview" style="margin-top:10px;text-align:center"></div>
      </div>
      <!-- Cargar doc de marca -->
      <div class="card card-p">
        <div class="card-t" style="margin-bottom:8px">2 · Documento de identidad de marca <span style="font-size:10.5px;font-weight:400;color:var(--t3)">(opcional)</span></div>
        <p style="font-size:12px;color:var(--t3);margin-bottom:10px">Manual de marca, guía de estilo, brochure corporativo. La IA extrae nombre oficial, colores HEX, tipografías y tono de comunicación.</p>
        <label class="btn btn-soft btn-sm" style="cursor:pointer;display:block;text-align:center;padding:14px">
          📎 Subir documento<input type="file" id="brandDoc" accept=".pdf,.doc,.docx,.txt,image/*" style="display:none">
        </label>
        <div id="docStatus" style="margin-top:8px;font-size:12px;color:var(--t3)"></div>
      </div>
    </div>

    <!-- Configuración manual -->
    <div class="card card-p" style="margin-bottom:14px">
      <div class="card-t" style="margin-bottom:12px">3 · Configuración manual / ajustes finos</div>
      <div class="grid g3" style="gap:12px">
        <div><label class="lbl">Nombre de la consultora</label><input class="inp" id="bName" value="${b?.name||''}" placeholder="Mi Consultora S.A."></div>
        <div><label class="lbl">Color primario</label><div style="display:flex;gap:6px"><input class="inp" id="bColor" value="${b?.primary||''}" placeholder="#2196d3" style="flex:1"><input type="color" id="bColorPick" value="${b?.primary||'#2196d3'}" style="width:36px;height:36px;border:1px solid var(--border);border-radius:8px;padding:2px;cursor:pointer"></div></div>
        <div><label class="lbl">Tipografía principal</label><select class="sel" id="bFont">
          <option value="">— sin cambio —</option>
          ${['Manrope','Inter','Outfit','Plus Jakarta Sans','DM Sans','Sora','Nunito','Poppins','Raleway','Montserrat'].map(f=>`<option ${b?.font===f?'selected':''}>${f}</option>`).join('')}
        </select></div>
        <div><label class="lbl">Tono de comunicación</label><select class="sel" id="bTone">
          <option value="">— no definido —</option>
          ${['Profesional y formal','Cercano y conversacional','Dinámico y ejecutivo','Técnico y analítico','Empático y consultivo'].map(t=>`<option ${b?.tone===t?'selected':''}>${t}</option>`).join('')}
        </select></div>
        <div><label class="lbl">Paleta de colores (HEX separados por coma)</label><input class="inp" id="bPalette" value="${(b?.colors||[]).join(', ')}" placeholder="#2196d3, #0d2740, #4ab4e6"></div>
        <div style="display:flex;align-items:flex-end"><button class="btn btn-ghost btn-sm" id="bAI" style="width:100%">✨ Sugerir paleta con IA</button></div>
      </div>
      <div style="text-align:right;margin-top:14px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-ghost btn-sm" id="bPreview">Vista previa</button>
        <button class="btn btn-pr btn-sm" id="bSave">Aplicar identidad a toda la plataforma</button>
      </div>
    </div>

    <!-- Vista previa viva -->
    <div id="brandPreviewBox" style="${preview?'':'display:none'}">
      <div class="card card-p">
        <div class="card-t" style="margin-bottom:12px">Vista previa de la identidad aplicada</div>
        <div style="border:1px solid var(--border);border-radius:10px;overflow:hidden">
          <!-- Topbar preview -->
          <div id="previewTopbar" style="padding:10px 16px;display:flex;align-items:center;gap:12px;color:#fff">
            <div id="previewLogo" style="font-size:14px;font-weight:800">Mi Consultora</div>
            <div style="flex:1"></div>
            <div style="font-size:12px;opacity:.8">✉️ 🔔</div>
          </div>
          <!-- Content preview -->
          <div style="padding:16px">
            <div id="previewHeading" style="font-size:18px;font-weight:800;margin-bottom:6px;color:var(--t1)">Dashboard operativo</div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button id="previewBtn" class="btn btn-sm" style="color:#fff">Acción principal</button>
              <button class="btn btn-ghost btn-sm">Acción secundaria</button>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    /* ── Eventos ── */
    host.querySelector('#bColorPick').addEventListener('input',e=>host.querySelector('#bColor').value=e.target.value);
    host.querySelector('#bColor').addEventListener('input',e=>{const v=e.target.value;if(/^#[0-9a-f]{6}$/i.test(v))host.querySelector('#bColorPick').value=v;});

    host.querySelector('#logoFile').addEventListener('change',async e=>{
      const f=e.target.files[0];if(!f)return;
      const reader=new FileReader();
      reader.onload=async ev=>{
        const src=ev.target.result;
        host.querySelector('#logoPreview').innerHTML=`<img src="${src}" style="max-height:80px;max-width:100%;object-fit:contain;border-radius:8px;border:1px solid var(--border)">`;
        ui.toast('Extrayendo colores del logo…','ok');
        const color=await extractColor(src);
        host.querySelector('#bColor').value=color;
        host.querySelector('#bColorPick').value=rgbToHex(color)||'#2196d3';
        brand.logo=src;
        ui.toast('Color primario extraído: '+color,'ok');
      };
      reader.readAsDataURL(f);
    });

    host.querySelector('#brandDoc').addEventListener('change',e=>{
      const f=e.target.files[0];if(!f)return;
      host.querySelector('#docStatus').innerHTML='⏳ Analizando documento con IA…';
      const reader=new FileReader();
      reader.onload=ev=>{
        setTimeout(()=>{
          if(CX.ai&&CX.ai.ready()){
            CX.ai.ask('Analiza este documento de identidad de marca y extrae en JSON: {"nombre":"...","colores":["#hex","#hex"],"tipografia":"...","tono":"..."}\n\nDocumento: '+ev.target.result.slice(0,3000))
              .then(r=>{const m=r.match(/\{[\s\S]*\}/);if(m){const bd=JSON.parse(m[0]);host.querySelector('#bName').value=bd.nombre||'';if(bd.tipografia)host.querySelector('#bFont').value=bd.tipografia;if(bd.tono)host.querySelector('#bTone').value=bd.tono;if(bd.colores&&bd.colores.length)host.querySelector('#bPalette').value=bd.colores.join(', ');}host.querySelector('#docStatus').innerHTML='✅ Identidad extraída · revisa y ajusta los campos.';})
              .catch(()=>host.querySelector('#docStatus').innerHTML='⚠️ No se pudo analizar automáticamente. Completa los campos manualmente.');
          } else {
            host.querySelector('#docStatus').innerHTML='✅ Documento "'+f.name+'" cargado · completa los campos a continuación o conecta la IA para extracción automática.';
          }
        },1500);
      };
      reader.readAsText(f);
    });

    host.querySelector('#bAI').addEventListener('click',()=>{
      const name=host.querySelector('#bName').value||'consultora';
      ui.toast('Generando paleta de color con IA…','ok');
      setTimeout(()=>{
        const palettes={'azul':'#1a6fc4, #0d3d7a, #4ab0f0, #e8f4fd','verde':'#1a7c4c, #0d4527, #3dbb7a, #e8faf0','rojo':'#c41a1a, #7a0d0d, #f04a4a, #fde8e8','morado':'#6b21a8, #3b0764, #a855f7, #f5f3ff','naranja':'#c2410c, #7c2d12, #fb923c, #fff7ed'};
        const match=Object.keys(palettes).find(k=>name.toLowerCase().includes(k))||'azul';
        host.querySelector('#bPalette').value=palettes[match];
        ui.toast('Paleta sugerida por IA','ok');
      },900);
    });

    host.querySelector('#bPreview').addEventListener('click',()=>{
      const color=host.querySelector('#bColor').value||'var(--brand)';
      const name=host.querySelector('#bName').value||'Mi Consultora';
      host.querySelector('#brandPreviewBox').style.display='block';
      host.querySelector('#previewTopbar').style.background=color;
      host.querySelector('#previewLogo').textContent=name;
      host.querySelector('#previewBtn').style.background=color;
      host.querySelector('#previewBtn').style.borderColor=color;
    });

    host.querySelector('#bSave').addEventListener('click',()=>{
      const newBrand={
        name:host.querySelector('#bName').value.trim(),
        primary:host.querySelector('#bColor').value||'#2196d3',
        primaryDark:rgbToDark(host.querySelector('#bColor').value||'#2196d3'),
        primaryLight:host.querySelector('#bColor').value||'#2196d3',
        font:host.querySelector('#bFont').value,
        tone:host.querySelector('#bTone').value,
        colors:host.querySelector('#bPalette').value.split(',').map(c=>c.trim()).filter(Boolean),
        logo:brand.logo||'',
      logoUrl:brand.logo||''
      };
      saveBrand(newBrand);
      applyBrand(newBrand);
      /* sincronizar CX.BRAND para que rail y login lean el logo inmediatamente */
      Object.assign(CX.BRAND, {logo:newBrand.logo||'', logoUrl:newBrand.logo||'', name:newBrand.name||CX.BRAND.name, clientName:newBrand.clientName||'', theme:newBrand.theme||CX.BRAND.theme});
      /* reconstruir el rail para actualizar logo en sidebar */
      if(CX.router && CX.session && CX.session.role) CX.router.buildRail(CX.session.role);
      /* actualizar logo en login si está visible */
      document.querySelectorAll('.client-logo,.cx-brand-logo').forEach(el=>{
        if(newBrand.logo){el.src=newBrand.logo;el.setAttribute('style','max-height:52px;max-width:160px;object-fit:contain;border-radius:6px');}
      });
      document.querySelectorAll('.brand-name').forEach(el=>{if(newBrand.name)el.textContent=newBrand.name;});
      ui.toast('Identidad de marca aplicada a toda la plataforma','ok',4000);
      draw();
    });

    host.querySelector('#resetBrand')?.addEventListener('click',()=>{
      localStorage.removeItem(BRAND_KEY);
      document.documentElement.removeAttribute('style');
      ui.toast('Identidad restablecida a valores por defecto','ok');
      draw();
    });
  };

  const rgbToHex=(rgb)=>{
    const m=rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if(!m)return rgb;
    return '#'+[m[1],m[2],m[3]].map(n=>parseInt(n).toString(16).padStart(2,'0')).join('');
  };

  /* Aplicar identidad guardada al cargar */
  applyBrand(getBrand());
  draw();
  return host;
});
