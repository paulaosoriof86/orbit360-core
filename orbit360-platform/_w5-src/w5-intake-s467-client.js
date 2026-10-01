import { initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from 'firebase/app-check';
import { getFunctions, httpsCallable } from 'firebase/functions';

const EXPECTED_PROJECT = 'ays-orbit-360-lab';
const EXPECTED_APP_ID = '1:646761409743:web:2ec4595ee9160f9d945bba';

const state = window.__AYS_W5_INTAKE_STATE__ = {
  ready: false,
  submitted: false,
  failed: false
};

const form = document.getElementById('w5-intake-form');
const submit = document.getElementById('submit');
const status = document.getElementById('status');
const formRegion = document.getElementById('form-region');

function setStatus(message, kind = '') {
  status.textContent = message;
  status.dataset.kind = kind;
}

function disableForm(disabled) {
  Array.from(form.elements).forEach((el) => { el.disabled = disabled; });
}

function publicFailure() {
  state.failed = true;
  setStatus('No fue posible habilitar el formulario seguro. Intenta nuevamente en unos minutos.', 'error');
  disableForm(true);
}

async function boot() {
  const runtime = window.__AYS_W5_INTAKE_CONFIG__;
  if (!runtime || !runtime.firebaseConfig || !runtime.appCheckSiteKey) {
    throw new Error('RUNTIME_CONFIG_MISSING');
  }
  if (runtime.firebaseConfig.projectId !== EXPECTED_PROJECT || runtime.firebaseConfig.appId !== EXPECTED_APP_ID) {
    throw new Error('RUNTIME_CONFIG_SCOPE_MISMATCH');
  }
  if (runtime.appCheckProvider !== 'RECAPTCHA_ENTERPRISE') {
    throw new Error('APPCHECK_PROVIDER_MISMATCH');
  }

  const app = initializeApp(runtime.firebaseConfig);
  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(runtime.appCheckSiteKey),
    isTokenAutoRefreshEnabled: true
  });

  await getToken(appCheck, false);

  const fn = httpsCallable(
    getFunctions(app, 'us-central1'),
    'cotcompW5FirstRealIntake',
    { timeout: 30000, limitedUseAppCheckTokens: true }
  );

  state.ready = true;
  disableForm(false);
  setStatus('Formulario seguro listo.', 'ready');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (state.submitted || !state.ready) return;

    const data = new FormData(form);
    const payload = {
      brand: String(data.get('brand') || ''),
      lineModel: String(data.get('lineModel') || ''),
      contactName: String(data.get('contactName') || ''),
      contactWhatsapp: String(data.get('contactWhatsapp') || ''),
      contactEmail: String(data.get('contactEmail') || ''),
      requestManagementConsent: data.get('requestManagementConsent') === 'on',
      marketingConsent: data.get('marketingConsent') === 'on'
    };

    submit.disabled = true;
    setStatus('Registrando tu solicitud…');

    try {
      const response = await fn(payload);
      const body = response && response.data || {};
      if (!body.ok || body.code !== 'W5_INTAKE_ACCEPTED') throw new Error('INTAKE_NOT_ACCEPTED');
      state.submitted = true;
      form.reset();
      disableForm(true);
      formRegion.setAttribute('aria-disabled', 'true');
      setStatus('Solicitud registrada correctamente. No debes enviar otra cotización.', 'success');
    } catch (error) {
      const code = String(error && error.code || '');
      if (code.includes('failed-precondition')) {
        state.submitted = true;
        disableForm(true);
        setStatus('Este intake ya fue utilizado. No envíes otra cotización.', 'success');
        return;
      }
      submit.disabled = false;
      setStatus('No fue posible registrar la solicitud. Verifica los datos e intenta nuevamente.', 'error');
    }
  });
}

disableForm(true);
setStatus('Verificando acceso seguro…');
boot().catch(publicFailure);
