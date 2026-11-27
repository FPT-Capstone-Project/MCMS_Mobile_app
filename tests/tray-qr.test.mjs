import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import ts from 'typescript';

function repository() {
  const source = readFileSync(new URL('../src/features/cultivation/data/trayQr.ts', import.meta.url), 'utf8');
  const calls = [];
  const client = {
    post: async (url, data) => { calls.push({ url, data }); return { data: { data: { issue_id: 42 } } }; },
  };
  const loaded = new Module('qr-repository');
  loaded.require = name => {
    if (name === 'react-native') return { Platform: { OS: 'web' } };
    if (name.endsWith('/axiosClient')) return { axiosClient: client };
    if (name.endsWith('/endpoints')) return { API_ENDPOINTS: {} };
    throw new Error('Unexpected dependency ' + name);
  };
  loaded._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, 'trayQr.js');
  return { calls, api: loaded.exports.trayQr };
}

test('growth without photos updates the daily stage and growth with photos sends one inspection', async () => {
  const { api, calls } = repository();
  const fields = { qr_token: 'tray-token', growth_status: 'PINNING' };
  const photo = { file: new Blob(['test'], { type: 'image/jpeg' }), fileName: 'tray.jpg' };
  await api.growth(fields, []);
  await api.growth(fields, [photo, photo]);
  assert.deepEqual(calls.map(x => x.url), ['/api/cultivation-sessions/admin/qr-growth-update', '/api/cultivation-sessions/admin/inspections']);
  assert.equal(calls[1].data.get('qr_token'), 'tray-token');
  assert.equal(calls[1].data.get('growth_status'), 'PINNING');
  assert.equal(calls[1].data.getAll('images').length, 2);
});
test('QR incident submits evidence together and returns the issue identifier for expert consultation', async () => {
  const { api, calls } = repository();
  const result = await api.issue({ qr_token: 'tray-token', title: 'Test', description: 'Spots', issue_type: 'DISEASE' },
    [{ file: new Blob(['test'], { type: 'image/jpeg' }), fileName: 'evidence.jpg' }]);
  assert.equal(result.issue_id, 42);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/api/issues/qr');
  assert.equal(calls[0].data.get('images').name, 'evidence.jpg');
});
