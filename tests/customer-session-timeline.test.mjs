import assert from 'node:assert/strict';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/features/order/data/customerSessionApi.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
let endpoints;
const loaded = new Module('customer-session-timeline-test');
loaded.require = (name) => {
  if (name.endsWith('/baseApi')) {
    return { baseApi: { injectEndpoints: ({ endpoints: create }) => {
      endpoints = create({
        query: (config) => config,
        queryFn: (config) => config,
      });
      return {};
    } } };
  }
  if (name.endsWith('/endpoints')) {
    return { API_ENDPOINTS: { CUSTOMER: { SESSIONS: '/api/customer/sessions' } } };
  }
  throw new Error(`Unexpected dependency: ${name}`);
};
loaded._compile(compiled.outputText, 'customer-session-timeline-test');

const session = (sessionId, orderId = 7) => ({
  session_id: sessionId,
  order_id: orderId,
  status: 'CULTIVATING',
  harvest_status: null,
  start_at: null,
  end_at: null,
  mushroom_name: 'Nấm',
  tray_quantity: 1,
  trays: [],
});

function page(pageNumber, sessions, total, totalPages) {
  return {
    data: sessions,
    pagination: { page: pageNumber, pageSize: 100, total, totalPages },
  };
}

test('loads every customer session page for the unified timeline', async () => {
  const requests = [];
  const result = await endpoints.getAllCustomerSessions.queryFn(
    { status: 'ALL' },
    {},
    {},
    async (request) => {
      requests.push(request);
      return {
        data: request.params.page === 1
          ? page(1, [session(1), session(2)], 3, 2)
          : page(2, [session(3, 8)], 3, 2),
      };
    },
  );

  assert.deepEqual(requests.map(({ params }) => params.page), [1, 2]);
  assert.equal(requests[0].params.pageSize, 100);
  assert.deepEqual(result.data.map(({ session_id }) => session_id), [1, 2, 3]);
});

test('returns API failures and rejects incomplete session pages', async () => {
  const failure = { status: 503, code: 'UNAVAILABLE', message: 'Unavailable' };
  const failed = await endpoints.getAllCustomerSessions.queryFn(
    { status: 'ALL' }, {}, {}, async () => ({ error: failure }),
  );
  assert.equal(failed.error, failure);

  const incomplete = await endpoints.getAllCustomerSessions.queryFn(
    { status: 'ALL' },
    {},
    {},
    async () => ({ data: page(1, [session(1)], 2, 1) }),
  );
  assert.equal(incomplete.error.code, 'INVALID_RESPONSE');
  assert.equal(incomplete.data, undefined);

  const malformedTray = await endpoints.getAllCustomerSessions.queryFn(
    { status: 'ALL' },
    {},
    {},
    async () => ({ data: page(1, [{ ...session(1), trays: [{}] }], 1, 1) }),
  );
  assert.equal(malformedTray.error.code, 'INVALID_RESPONSE');
  assert.equal(malformedTray.data, undefined);
});
