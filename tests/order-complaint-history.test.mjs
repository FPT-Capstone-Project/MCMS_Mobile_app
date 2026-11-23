import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/features/order/data/complaintApi.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
let endpoints;
const loaded = new Module('order-complaint-api-test');
loaded.require = (name) => {
  if (name.endsWith('/baseApi')) {
    return { baseApi: { injectEndpoints: ({ endpoints: create }) => {
      endpoints = create({ query: (config) => config, mutation: (config) => config });
      return {};
    } } };
  }
  if (name.endsWith('/endpoints')) {
    return { API_ENDPOINTS: { COMPLAINTS: {
      MY: '/api/complaints/my',
      REPLIES: (id) => `/api/complaints/${id}/replies`,
      STATUS: (id) => `/api/complaints/${id}/status`,
    } } };
  }
  if (name === 'react-native') return { Platform: { OS: 'android' } };
  throw new Error(`Unexpected dependency: ${name}`);
};
loaded._compile(compiled.outputText, 'order-complaint-api-test');

const complaint = (id, orderId = id) => ({
  complaint_id: id,
  order_id: orderId,
  complaint_type: 'DAMAGED',
  description: 'Damaged',
  status: 'PENDING',
  created_at: '2026-11-20T00:00:00.000Z',
  assigned_to: null,
  resolved_at: null,
});

test('loads all complaint pages, including older orders beyond the first 100', async () => {
  const requests = [];
  const firstPage = Array.from({ length: 100 }, (_, index) => complaint(index + 1));
  const result = await endpoints.getMyComplaints.queryFn({}, {}, {}, async (request) => {
    requests.push(request);
    return { data: { data: request.params.page === 1 ? firstPage : [complaint(101, 42)], total: 101 } };
  });
  assert.equal(result.data.length, 101);
  assert.equal(result.data[100].order_id, 42);
  assert.deepEqual(requests.map((request) => request.params.page), [1, 2]);
});

test('does not present a partial list as complete when a later page fails', async () => {
  const failure = { status: 503, code: 'UNAVAILABLE', message: 'Unavailable' };
  const result = await endpoints.getMyComplaints.queryFn({}, {}, {}, async (request) => (
    request.params.page === 1
      ? { data: { data: Array.from({ length: 100 }, (_, index) => complaint(index + 1)), total: 101 } }
      : { error: failure }
  ));
  assert.equal(result.error, failure);
  assert.equal(result.data, undefined);
});

test('rejects malformed or incomplete complaint pages', async () => {
  for (const response of [
    { data: [{ complaint_id: 1 }], total: 1 },
    { data: [], total: 1 },
    { data: [complaint(1)], total: 2 },
  ]) {
    const result = await endpoints.getMyComplaints.queryFn({}, {}, {}, async () => ({ data: response }));
    assert.equal(result.error.code, 'INVALID_RESPONSE');
    assert.equal(result.data, undefined);
  }
});

test('builds customer and operator conversation updates from complaint endpoints', () => {
  assert.deepEqual(
    endpoints.replyToComplaint.query({ complaintId: 7, message: 'Thông tin bổ sung' }),
    {
      url: '/api/complaints/7/replies',
      method: 'POST',
      data: { message: 'Thông tin bổ sung' },
    },
  );
  assert.deepEqual(
    endpoints.updateStaffComplaintStatus.query({ complaintId: 7, status: 'NEED_MORE_INFO' }),
    {
      url: '/api/complaints/7/status',
      method: 'PATCH',
      data: { status: 'NEED_MORE_INFO' },
    },
  );
  assert.deepEqual(
    endpoints.updateStaffComplaintStatus.query({
      complaintId: 7,
      status: 'RESOLVED',
      resolution: 'Đã hoàn tiền',
    }),
    {
      url: '/api/complaints/7/status',
      method: 'PATCH',
      data: { status: 'RESOLVED', resolution: 'Đã hoàn tiền' },
    },
  );
});
