(function(){
  'use strict';
  var API='https://us-central1-ays-orbit-360-lab.cloudfunctions.net/siniestrosPublicResolverS512D';
  function el(id){return document.getElementById(id);}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function setStatus(v){el('status').textContent=v||'';}
  function renderChannel(c){
    if(!c)return '';
    var label=c.type==='assistance'?'Asistencia':'Emergencias';
    return '<div class="channel"><strong>'+esc(label)+' · '+esc(c.value)+'</strong><span class="muted">Alcance: '+esc(c.scope||'según canal de la aseguradora')+' · revisado '+esc(c.reviewedAt||'')+'</span></div>';
  }
  function renderFallback(rows){
    rows=[].concat(rows||[]);
    return rows.map(function(c){
      var label=c.type==='whatsapp'?'WhatsApp A&S':'Correo A&S';
      return '<div class="channel"><strong>'+esc(label)+' · '+esc(c.value)+'</strong><span class="muted">Canal de continuidad A&S. No confirma cobertura ni elegibilidad.</span></div>';
    }).join('');
  }
  async function loadList(){
    setStatus('Cargando canales validados…');
    try{
      var r=await fetch(API+'?action=list&country=GT',{headers:{'accept':'application/json'}});
      var j=await r.json();
      if(!r.ok||!j.ok)throw new Error('LIST_FAILED');
      var select=el('insurer');
      select.innerHTML='<option value="">Selecciona una aseguradora</option>';
      [].concat(j.insurerNames||[]).forEach(function(name){
        var o=document.createElement('option');o.value=name;o.textContent=name;select.appendChild(o);
      });
      el('resolve').disabled=false;
      setStatus('Se muestran únicamente aseguradoras con canal validado para este candidato LAB.');
    }catch(e){
      setStatus('No fue posible cargar el directorio validado. Puedes continuar con A&S: +502 5614 9048 · info@aysseguros.com');
    }
  }
  async function resolve(){
    var name=el('insurer').value;
    if(!name){setStatus('Selecciona una aseguradora.');return;}
    el('resolve').disabled=true;setStatus('Consultando canal validado…');el('result').classList.add('hidden');
    try{
      var r=await fetch(API+'?country=GT&insurer='+encodeURIComponent(name),{headers:{'accept':'application/json'}});
      var j=await r.json();
      if(!r.ok||!j.ok)throw new Error('RESOLVE_FAILED');
      var html='';
      if(j.insurerChannel){
        html+='<strong>Canal validado de la aseguradora</strong>'+renderChannel(j.insurerChannel);
      }else{
        html+='<strong>No hay un canal de aseguradora validado para publicación.</strong><p class="muted">No mostraremos un número interno no verificado.</p>';
      }
      html+='<div style="margin-top:12px"><strong>Continuidad con A&S</strong>'+renderFallback(j.fallbackChannels)+'</div>';
      html+='<p class="truth">Estos canales sirven para contacto y orientación. No significan que la cobertura o elegibilidad estén confirmadas.</p>';
      el('result').innerHTML=html;el('result').classList.remove('hidden');setStatus('');
    }catch(e){
      setStatus('No pudimos consultar el canal. Continúa con A&S: +502 5614 9048 · info@aysseguros.com');
    }finally{el('resolve').disabled=false;}
  }
  document.addEventListener('DOMContentLoaded',function(){el('resolve').addEventListener('click',resolve);loadList();},{once:true});
})();