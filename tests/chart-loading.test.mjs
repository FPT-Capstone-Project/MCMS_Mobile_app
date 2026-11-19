import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';

function repository(get, getStatus = async () => ({ sessions: [{ session_id: 7, status: 'CULTIVATING' }] })) {
  const source = readFileSync(new URL('../src/features/tray/data/repositories/TrayRepository.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
  const loaded = new Module('tray-repository-test');
  loaded.require = (name) => {
    if (name.endsWith('/axiosClient')) return { axiosClient: { get } };
    if (name.endsWith('/endpoints')) return { API_ENDPOINTS: {
      CUSTOMER: { CULTIVATION_PROGRESS: id => `progress/${id}`, IOT_HISTORY: id => `devices/${id}` },
      CULTIVATION_SESSIONS: { ADMIN_PROGRESS: id => `admin/${id}` },
      ENVIRONMENT_HISTORY: { SESSION: id => `history/${id}` },
    } };
    if (name.endsWith('/trayMockData')) return { MOCK_TRAYS: [] };
    if (name.endsWith('/OrderRepository')) return { orderRepository: { getCustomerCultivationStatus: getStatus } };
    if (name.endsWith('/appError')) return { AppError: Error };
    if (name.endsWith('/errorHandler')) return { handleApiError: error => error };
    return {};
  };
  loaded._compile(compiled.outputText, 'tray-repository-test');
  return new loaded.exports.TrayRepository();
}

test('growth detail starts status and progress together without waiting for device APIs', async () => {
  let release;
  const status = new Promise(resolve => { release = resolve; });
  const calls = [];
  const repo = repository(async url => {
    calls.push(url);
    return { data: { data: [{ session_id: 7, current_stage: 'INCUBATION' }] } };
  }, () => status);
  const pending = repo.getCustomerCultivationDetails(7, 4);
  assert.deepEqual(calls, ['progress/4']);
  release({ sessions: [{ session_id: 7, status: 'CULTIVATING' }] });
  const detail = await pending;
  assert.equal(detail.growth_history.length, 1);
  assert.deepEqual(detail.device_logs, []);
  assert.deepEqual(calls, ['progress/4']);
});

test('session chart loads all pages without floor-wide or latest requests', async () => {
  const calls = [];
  const repo = repository(async (url, { params }) => {
    calls.push([url, params.page]);
    return { data: { pagination: { totalPages: 5 }, data: [{
      session_id: 7, floor_id: 2, period_start: `2026-11-20T0${params.page}:00:00Z`,
    }] } };
  });
  const points = await repo.getCustomerEnvironmentHistory(7, 2, '2026-11-20T00:00:00Z', '2026-11-21T00:00:00Z');
  assert.equal(points.length, 5);
  assert.deepEqual(calls, [1, 2, 3, 4, 5].map(page => ['history/7', page]));
});

test('a failed history page is reported instead of returning an incomplete chart', async () => {
  const repo = repository(async (_url, { params }) => {
    if (params.page === 2) throw new Error('timeout');
    return { data: { data: [], pagination: { totalPages: 2 } } };
  });
  await assert.rejects(repo.getCustomerEnvironmentHistory(7, 2, 'from', 'to'), /timeout/);
});
