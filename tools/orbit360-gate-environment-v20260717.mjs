export function readGateEnvironment() {
  return {
    baseUrl: String(process.env.ORBIT360_PREVIEW_URL || '').replace(/\/$/, ''),
    email: String(process.env.ORBIT360_LAB_LOGIN_EMAIL || 'orbit.lab@demo.com'),
    accessValue: String(process.env.ORBIT360_LAB_LOGIN_PASSWORD || '').replace(/[\r\n]+$/g, ''),
    runtime: String(process.env.ORBIT360_EXPECTED_RUNTIME || '20260717-2')
  };
}
