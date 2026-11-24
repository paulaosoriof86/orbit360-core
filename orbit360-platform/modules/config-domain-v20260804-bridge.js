/* ============================================================
   Orbit 360 · Configuración autoadministrable de Flujos y Conciliación
   Extiende Configuración sin reemplazar el módulo base.
   ============================================================ */
(function () {
  'use strict';
  window.Orbit = window.Orbit || {};
  Orbit.modules = Orbit.modules || {};
  if (Orbit.__configDomainBridgeV20260804) return;
  Orbit.__configDomainBridgeV20260804 = true;

  const VERSION = 'orbit360-config-domain-bridge-v1';
  const U = () => Orbit.ui || {};
  const esc = value => U().esc ? U().esc(String(value == null ? '' : value)) : String(value == null ? '' : value);
  const text = value => String(value == null ? '' : value).trim();
  const bool = (root, id) => !!(root.querySelector('#' + id) || {}).checked;
  const num = (root, id, fallback) => {
    const parsed = Number((root.querySelector('#' + id) || {}).value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const toast = message => { try { U().toast(message); } catch (e) {} };

  function toggle(id, checked, label, hint) {
    return `<label class="cfg-row" style="cursor:pointer"><div class="cfg-lab">${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</div><div class="cfg-ctrl"><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}></div></label>`;
  }
  function field(label, control, hint) {
    return `<div class="cfg-row"><div class="cfg-lab">${esc(label)}${hint ? `<small>${esc(hint)}</small>` : ''}</div><div class="cfg-ctrl">${control}</div></div>`;
  }

  const DEFAULT_CADENCE_STEPS = [
    {day:1,channel:'whatsapp',label:'Bienvenida y primer contacto',templateId:'lead_wa_d1',subject:'',body:'Hola {nombre}, gracias por contactarnos. ¿En qué podemos ayudarte?'},
    {day:3,channel:'whatsapp',label:'Seguimiento comercial',templateId:'lead_wa_d3',subject:'',body:'Hola {nombre}, seguimos atentos a tu solicitud de {producto}.'},
    {day:7,channel:'email',label:'Seguimiento por correo',templateId:'lead_email_d7',subject:'Seguimiento a tu solicitud',body:'Hola {nombre}, te damos seguimiento a tu solicitud de {producto}.'},
    {day:14,channel:'whatsapp',label:'Último seguimiento',templateId:'lead_wa_d14',subject:'',body:'Hola {nombre}, seguimos disponibles cuando quieras retomar tu seguro.'}
  ];
  const DEFAULT_WORKFLOW_STAGES = {
    nuevo:{label:'Nuevo',leads:true,ops:false,next:['contactado','cotizando','perdido']},
    contactado:{label:'Contactado',leads:true,ops:false,next:['cotizando','perdido']},
    cotizando:{label:'Cotizando',leads:true,ops:true,opsList:'Cotizaciones',next:['propuesta','perdido']},
    propuesta:{label:'Propuesta',leads:true,ops:false,next:['negociacion','inspeccion','emision','perdido']},
    negociacion:{label:'Negociación',leads:true,ops:false,next:['inspeccion','emision','perdido']},
    inspeccion:{label:'Inspección',leads:true,ops:true,opsList:'Inspecciones',next:['emision','perdido']},
    emision:{label:'Emisión',leads:true,ops:true,opsList:'Emisiones',next:['emitido','perdido']},
    emitido:{label:'Emitido',leads:true,ops:false,terminal:true,next:[]},
    perdido:{label:'Perdido',leads:true,ops:false,terminal:true,next:['contactado']}
  };
  function cadenceRow(step) {
    return `<tr data-wf-cadence-row="1">
      <td><input class="o-sel" type="number" min="0" max="365" step="1" data-cad="day" value="${Number(step.day||0)}" style="width:66px"></td>
      <td><select class="o-sel" data-cad="channel">${[['whatsapp','WhatsApp'],['email','Correo'],['internal','Tarea interna']].map(([id,name])=>`<option value="${id}" ${step.channel===id?'selected':''}>${name}</option>`).join('')}</select></td>
      <td><input class="o-sel" data-cad="label" maxlength="160" value="${esc(step.label||'')}" style="min-width:160px"></td>
      <td><input class="o-sel" data-cad="templateId" maxlength="100" value="${esc(step.templateId||'')}" style="min-width:110px"></td>
      <td><input class="o-sel" data-cad="subject" maxlength="240" value="${esc(step.subject||'')}" placeholder="Asunto (correo)" style="min-width:145px"></td>
      <td><textarea class="o-sel" data-cad="body" maxlength="1500" rows="2" style="min-width:240px">${esc(step.body||'')}</textarea></td>
      <td><button type="button" class="btn ghost sm" data-cad-remove="1" title="Quitar paso">✕</button></td>
    </tr>`;
  }

  async function workflow(body) {
    const response = await Orbit.domainConfig.get('workflow');
    const cfg = response.config || Orbit.domainConfig.defaults('workflow');
    const stageConfig=cfg.stages&&Object.keys(cfg.stages).length?cfg.stages:DEFAULT_WORKFLOW_STAGES;
    const stages = Object.entries(stageConfig);
    const cadenceSteps = Array.isArray(cfg.cadenceSteps)&&cfg.cadenceSteps.length?cfg.cadenceSteps:DEFAULT_CADENCE_STEPS;
    body.innerHTML = `<div class="cfg-h"><b>Flujos de trabajo</b><span>Etapas, sincronización, SLA y automatizaciones sin código</span></div>
      <div class="cfg-note">Una oportunidad se conserva como un solo registro y se muestra en Leads, Ops o ambos según la etapa configurada.</div>
      ${toggle('wf-advisor', cfg.advisorManagementProjection !== false, 'Gestiones visibles al asesor', 'Muestra en Leads las gestiones operativas asignadas.')}
      ${toggle('wf-portal', cfg.portalResponseEnabled !== false, 'Respuesta en Portal', 'Conserva la respuesta de cada gestión para que el cliente pueda consultarla.')}
      ${toggle('wf-cadence', cfg.cadenceEnabled !== false, 'Cadencias comerciales', 'El calendario comienza con la creación del lead. Cada oportunidad puede desactivarlo o desplazar su inicio.')}
      ${toggle('wf-escalation', cfg.escalationEnabled !== false, 'Escalamientos', 'Eleva gestiones vencidas o sin actividad según SLA.')}
      ${toggle('wf-duplicates', cfg.duplicateDetectionEnabled !== false, 'Detección de duplicados', 'Evita crear solicitudes repetidas para el mismo cliente y asunto.')}
      ${field('SLA predeterminado', `<input id="wf-sla" type="number" min="0" class="o-sel" value="${Number(cfg.defaultManagementSlaHours || 72)}" style="width:130px"> horas`, 'Puede ajustarse posteriormente por tipo de gestión.')}
      <div class="cfg-h" style="margin-top:20px"><b>Etapas del ciclo</b><span>Visibilidad y tiempo objetivo</span></div>
      <div class="card" style="overflow:auto"><table class="tbl"><thead><tr><th>Etapa</th><th>Leads</th><th>Ops</th><th>Lista Ops</th><th>SLA horas</th><th>Siguientes</th></tr></thead><tbody>
        ${stages.map(([id, stage]) => `<tr data-wf-stage="${esc(id)}"><td><b>${esc(stage.label || id)}</b><div class="muted mono" style="font-size:10px">${esc(id)}</div></td><td><input type="checkbox" data-field="leads" ${stage.leads !== false ? 'checked' : ''}></td><td><input type="checkbox" data-field="ops" ${stage.ops ? 'checked' : ''}></td><td><input class="o-sel" data-field="opsList" value="${esc(stage.opsList || '')}" style="min-width:140px"></td><td><input class="o-sel" type="number" min="0" data-field="slaHours" value="${Number(stage.slaHours || 0)}" style="width:90px"></td><td><input class="o-sel" data-field="next" value="${esc((stage.next || []).join(', '))}" style="min-width:190px"></td></tr>`).join('')}
      </tbody></table></div>
      <div class="cfg-h" style="margin-top:20px"><b>Cadencias y plantillas por paso</b><span>Autoadministrables por tenant · días contados desde la creación</span></div>
      <div class="cfg-note">Configura días, canal, asunto y texto. Variables: {nombre}, {producto}. Guardar un paso no acredita que el proveedor haya enviado el mensaje; la entrega se confirma por separado.</div>
      <div class="card" style="overflow:auto"><table class="tbl"><thead><tr><th>Día</th><th>Canal</th><th>Acción</th><th>ID plantilla</th><th>Asunto</th><th>Mensaje</th><th></th></tr></thead><tbody id="wf-cadence-rows">${cadenceSteps.map(cadenceRow).join('')}</tbody></table></div>
      <button type="button" class="btn ghost sm" id="wf-cadence-add" style="margin-top:8px">+ Añadir paso</button>
      <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn primary" id="wf-save">Guardar flujos</button></div>`;

    body.querySelector('#wf-cadence-add').addEventListener('click',()=>{
      const rows=body.querySelector('#wf-cadence-rows');
      if(rows.querySelectorAll('[data-wf-cadence-row]').length>=12){toast('Máximo 12 pasos por cadencia.');return;}
      const prior=[...rows.querySelectorAll('[data-wf-cadence-row]')].slice(-1)[0];
      const lastDay=Number(prior&&prior.querySelector('[data-cad="day"]').value||0);
      rows.insertAdjacentHTML('beforeend',cadenceRow({day:lastDay+1,channel:'internal',label:'Nuevo seguimiento',templateId:'lead_followup_'+(lastDay+1),subject:'',body:'Seguimiento de {nombre}.'}));
    });
    body.querySelector('#wf-cadence-rows').addEventListener('click',event=>{
      const button=event.target.closest('[data-cad-remove]');if(!button)return;
      const rows=body.querySelectorAll('[data-wf-cadence-row]');
      if(rows.length<=1){toast('Debe conservarse al menos un paso.');return;}
      button.closest('[data-wf-cadence-row]').remove();
    });

    body.querySelector('#wf-save').addEventListener('click', async () => {
      const stagesOut = {};
      body.querySelectorAll('[data-wf-stage]').forEach(row => {
        const stageId = row.dataset.wfStage;
        const previous = stageConfig[stageId] || {};
        const get = name => row.querySelector('[data-field="' + name + '"]');
        stagesOut[stageId] = {
          label: previous.label || stageId,
          leads: !!get('leads').checked,
          ops: !!get('ops').checked,
          opsList: text(get('opsList').value),
          terminal: previous.terminal === true,
          probability: Number(previous.probability || 0),
          slaHours: Number(get('slaHours').value || 0),
          next: text(get('next').value).split(',').map(v => text(v)).filter(Boolean)
        };
      });
      const stepsOut=[...body.querySelectorAll('[data-wf-cadence-row]')].map(row=>{
        const val=key=>text(row.querySelector('[data-cad="'+key+'"]').value);
        return{day:Number(val('day')),channel:val('channel'),label:val('label'),templateId:val('templateId'),subject:val('subject'),body:val('body')};
      });
      const validSteps=stepsOut.length>=1&&stepsOut.length<=12&&stepsOut.every((step,index)=>Number.isInteger(step.day)&&step.day>=0&&step.day<=365&&
        (index===0||step.day>stepsOut[index-1].day)&&step.label&&step.templateId&&step.body&&
        (step.channel!=='email'||step.subject));
      if(!validSteps){toast('Revisa los días crecientes, las plantillas y los asuntos de correo.');return;}
      const next = Object.assign({}, cfg, {
        stages: stagesOut,
        advisorManagementProjection: bool(body, 'wf-advisor'),
        portalResponseEnabled: bool(body, 'wf-portal'),
        cadenceEnabled: bool(body, 'wf-cadence'),cadenceStart:'creation',cadenceSteps:stepsOut,
        escalationEnabled: bool(body, 'wf-escalation'),
        duplicateDetectionEnabled: bool(body, 'wf-duplicates'),
        defaultManagementSlaHours: num(body, 'wf-sla', 72)
      });
      try {
        const result = await Orbit.domainConfig.save('workflow', next, 'Configuración de flujos actualizada por el administrador del tenant');
        if(result.syncPending||result.source!=='protected')throw Error('WORKFLOW_CONFIG_CANONICAL_READBACK_REQUIRED');
        toast('Cadencia y plantillas guardadas en configuración del tenant. La entrega externa todavía requiere prueba del proveedor.');
      } catch (error) { toast('No fue posible guardar los flujos. Revisa las transiciones.'); }
    });
  }

  async function reconciliation(body) {
    const response = await Orbit.domainConfig.get('reconciliation');
    const cfg = response.config || Orbit.domainConfig.defaults('reconciliation');
    body.innerHTML = `<div class="cfg-h"><b>Reglas de conciliación</b><span>Evidencia, inferencias y controles para Cobros</span></div>
      <div class="cfg-note">Las reglas pueden proponer conciliaciones, pero la aplicación al recibo siempre requiere confirmación autorizada.</div>
      ${toggle('rc-inf', cfg.inferenceEnabled !== false, 'Inferencias habilitadas', 'Permite usar secuencias comprobables de planillas y cartera.')}
      ${toggle('rc-commission', cfg.commissionRecognitionEnabled !== false, 'Reconocer planillas de comisión', 'Una fila positiva de la aseguradora puede confirmar la cuota vinculada.')}
      ${toggle('rc-commission-seq', cfg.commissionSequenceEnabled !== false, 'Inferir cuotas anteriores por planilla', 'Solo misma póliza, vigencia, moneda y calendario continuo.')}
      ${toggle('rc-portfolio-seq', cfg.completePortfolioSequenceEnabled !== false, 'Inferir cuotas anteriores por cartera', 'Solo cuando el estado de cartera es completo y la secuencia pendiente es continua.')}
      ${toggle('rc-bank', cfg.bankSupportRequiresCounterpart !== false, 'Banco requiere contraparte', 'Un movimiento bancario aislado no aplica un cobro.')}
      ${toggle('rc-absence', cfg.absenceAloneNeverReconciles !== false, 'La ausencia aislada no concilia', 'Exige un corte completo o evidencia adicional.')}
      ${toggle('rc-currency', cfg.requireSameCurrency !== false, 'Exigir misma moneda')}
      ${toggle('rc-term', cfg.requireSameTerm !== false, 'Exigir misma vigencia')}
      ${toggle('rc-negative', cfg.holdOnNegative !== false, 'Líneas negativas a validación')}
      ${toggle('rc-reversal', cfg.holdOnReversal !== false, 'Reversos a validación')}
      ${toggle('rc-duplicate', cfg.holdOnDuplicate !== false, 'Duplicados a validación')}
      <div class="cfg-note" data-gtq-documentary-rounding="1"><b>Guatemala / GTQ: Q0.05.</b> Tolerancia para variaciones documentales de todas las aseguradoras. Se conservan los importes de cada fuente; los pagos se aplican por su importe real y moneda exacta.</div>
      ${field('Tolerancia documental general', `<input id="rc-amount" type="number" step="0.01" min="0" class="o-sel" value="${Number(cfg.amountTolerance == null ? 0.02 : cfg.amountTolerance)}" style="width:130px">`)}
      ${field('Tolerancia de fecha', `<input id="rc-days" type="number" min="0" class="o-sel" value="${Number(cfg.dateToleranceDays == null ? 7 : cfg.dateToleranceDays)}" style="width:130px"> días`)}
      <div style="display:flex;justify-content:flex-end;margin-top:14px"><button class="btn primary" id="rc-save">Guardar reglas</button></div>`;

    body.querySelector('#rc-save').addEventListener('click', async () => {
      const next = Object.assign({}, cfg, {
        inferenceEnabled: bool(body, 'rc-inf'),
        commissionRecognitionEnabled: bool(body, 'rc-commission'),
        commissionSequenceEnabled: bool(body, 'rc-commission-seq'),
        completePortfolioSequenceEnabled: bool(body, 'rc-portfolio-seq'),
        bankSupportRequiresCounterpart: bool(body, 'rc-bank'),
        absenceAloneNeverReconciles: bool(body, 'rc-absence'),
        requireSameCurrency: bool(body, 'rc-currency'),
        requireSameTerm: bool(body, 'rc-term'),
        holdOnNegative: bool(body, 'rc-negative'),
        holdOnReversal: bool(body, 'rc-reversal'),
        holdOnDuplicate: bool(body, 'rc-duplicate'),
        amountTolerance: num(body, 'rc-amount', 0.02),
        dateToleranceDays: num(body, 'rc-days', 7),
        humanConfirmationRequired: true
      });
      try {
        const result = await Orbit.domainConfig.save('reconciliation', next, 'Reglas de conciliación actualizadas por el administrador del tenant');
        toast(result.syncPending ? '✓ Reglas guardadas; la sincronización se completará al activar el servicio.' : '✓ Reglas guardadas');
      } catch (error) { toast('No fue posible guardar las reglas de conciliación.'); }
    });
  }

  function mount(host) {
    const side = host && host.querySelector('.cfg-side');
    const body = host && host.querySelector('#cfg-body');
    if (!side || !body || side.querySelector('[data-domain-config]')) return;
    const buttons = [
      ['workflow', '🔄 Flujos'],
      ['reconciliation', '🔗 Conciliación']
    ];
    buttons.forEach(([domain, label]) => {
      const button = document.createElement('button');
      button.className = 'cfg-navi cli';
      button.dataset.domainConfig = domain;
      button.textContent = label;
      button.addEventListener('click', () => {
        side.querySelectorAll('.cfg-navi').forEach(item => item.classList.remove('on'));
        button.classList.add('on');
        if (domain === 'workflow') workflow(body); else reconciliation(body);
      });
      side.insertBefore(button, side.querySelector('.cfg-navi.int') || null);
    });
  }

  const module = Orbit.modules.configuracion;
  if (module && typeof module.render === 'function' && !module.__domainConfigV1) {
    const original = module.render.bind(module);
    module.render = function (host) {
      const result = original(host);
      setTimeout(() => mount(host), 0);
      return result;
    };
    module.__domainConfigV1 = { original };
  }

  Orbit.configDomainBridge = Object.freeze({ VERSION, mount });
})();
