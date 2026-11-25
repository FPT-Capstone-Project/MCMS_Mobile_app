import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/features/order/domain/customerSessions.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const loaded = new Module('customer-sessions-test');
loaded._compile(compiled.outputText, 'customer-sessions-test');
const {
  customerSessionTrayDetail,
  customerSessionDeviceHistoryAvailable,
  customerSessionTrayLabel,
  customerCanChooseHarvestMethod,
} = loaded.exports;

const active = {
  session_tray_id: 8, tray_id: 3, tray_code: 'K3', assignment_status: 'ACTIVE',
  floor_id: 4, floor_number: 2, floor_name: 'Tầng 2', row_number: 1, column_number: 3,
};
const released = { ...active, session_tray_id: 9, assignment_status: 'RELEASED' };
const session = { session_id: 12, order_id: 7, mushroom_name: 'Nấm', trays: [active] };

test('tray detail keeps the selected order, session and assignment identity', () => {
  const detail = customerSessionTrayDetail(session, active);
  assert.equal(detail.orderId, 7);
  assert.equal(detail.sessionId, 12);
  assert.equal(detail.sessionTrayId, 8);
  assert.equal(detail.floorId, 4);
  assert.equal(customerSessionDeviceHistoryAvailable(session), true);
  assert.equal(detail.floorName, 'Tầng 2');
  assert.equal(detail.rowNumber, 1);
  assert.equal(detail.columnNumber, 3);
  assert.equal(detail.code, 'Khay 1');
  assert.equal(customerSessionTrayLabel({ ...session, trays: [active, released] }, released), 'Khay 2');
});

test('released assignments cannot expose a reused tray floor or device history', () => {
  const detail = customerSessionTrayDetail(session, released);
  assert.equal(detail.sessionTrayId, 9);
  assert.equal(detail.floorId, undefined);
  assert.equal(detail.floorNumber, undefined);
  assert.equal(detail.floorName, undefined);
  assert.equal(detail.rowNumber, undefined);
  assert.equal(detail.columnNumber, undefined);
  assert.equal(customerSessionDeviceHistoryAvailable({ ...session, trays: [active, released] }), false);
});

test('receiving-method filter only includes harvest-ready sessions without a selected method', () => {
  const eligible = {
    status: 'CULTIVATING',
    harvest_status: 'HARVEST_READY',
    harvest_request_status: 'PENDING',
    harvest_method: null,
  };
  assert.equal(customerCanChooseHarvestMethod(eligible), true);
  assert.equal(customerCanChooseHarvestMethod({ ...eligible, harvest_method: 'DELIVERY' }), false);
  assert.equal(customerCanChooseHarvestMethod({ ...eligible, status: 'COMPLETED' }), false);
  assert.equal(customerCanChooseHarvestMethod({ ...eligible, harvest_request_status: 'COMPLETED' }), false);
  assert.equal(customerCanChooseHarvestMethod({ ...eligible, harvest_status: 'NOT_READY' }), false);
});
