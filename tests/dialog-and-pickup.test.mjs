import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

function loadTypeScript(relativePath) {
  const filename = fileURLToPath(new URL(relativePath, import.meta.url));
  const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loaded = new Module(filename);
  loaded._compile(compiled.outputText, filename);
  return loaded.exports;
}

const schedule = loadTypeScript('../src/features/order/domain/harvestSchedule.ts');
const shipmentDomain = loadTypeScript('../src/features/order/domain/shipment.ts');

test('a returned shipment cannot complete handover even when its old delivered timestamp remains', () => {
  const returned = { shipment_id: 12, status: 'RETURNED', delivered_at: '2026-11-17T09:00:00Z' };
  assert.equal(shipmentDomain.deliveryHandoverAllowed([returned]), false);
  assert.equal(shipmentDomain.shipmentLabel(returned.status), 'Đã hoàn hàng');
});

test('delivery handover uses the latest attempt, regardless of response ordering or previous delivery', () => {
  const delivered = { shipment_id: 3, status: 'DELIVERED' };
  const retry = { shipment_id: 8, status: 'IN_TRANSIT' };
  assert.equal(shipmentDomain.deliveryHandoverAllowed([delivered, retry]), false);
  assert.equal(shipmentDomain.deliveryHandoverAllowed([retry, delivered]), false);
  assert.equal(shipmentDomain.deliveryHandoverAllowed([delivered, { ...retry, status: 'DELIVERED' }]), true);
});

test('missing, cancelled, pending and unknown delivery statuses do not imply customer receipt', () => {
  assert.equal(shipmentDomain.deliveryHandoverAllowed([]), false);
  for (const status of ['PENDING', 'SHIPPED', 'CANCELLED', 'RETURNED', 'NEW_BACKEND_STATUS']) {
    assert.equal(shipmentDomain.deliveryHandoverAllowed([{ shipment_id: 1, status }]), false);
  }
  assert.match(shipmentDomain.shipmentLabel('NEW_BACKEND_STATUS'), /NEW_BACKEND_STATUS/);
});
const now = new Date('2026-11-18T08:16:00+07:00');

test('pickup uses quarter-hour slots and keeps the closing-time slot', () => {
  const slots = schedule.getCustomerPickupTimeOptions('2026-11-19', now);
  assert.equal(slots.length, 41);
  assert.equal(slots[0], '07:00');
  assert.equal(slots.at(-1), '17:00');
  assert.ok(slots.every((slot) => /:(00|15|30|45)$/.test(slot)));
  assert.ok(!slots.includes('17:15'));
});

test('today omits elapsed minutes, including a slot at the exact current time', () => {
  assert.equal(schedule.getCustomerPickupTimeOptions('2026-11-18', now)[0], '08:30');
  assert.equal(schedule.getCustomerPickupTimeOptions('2026-11-18', new Date('2026-11-18T08:30:00+07:00'))[0], '08:45');
});

test('past dates and after-closing dates have no selectable hours', () => {
  assert.deepEqual(schedule.getCustomerPickupTimeOptions('2026-11-17', now), []);
  assert.deepEqual(schedule.getCustomerPickupTimeOptions('2026-11-18', new Date('2026-11-18T17:00:00+07:00')), []);
  assert.deepEqual(schedule.getCustomerPickupMinuteOptions('2026-11-18', '18', now), []);
});

test('Vietnam date boundaries do not use the device timezone', () => {
  const midnight = new Date('2026-11-18T17:05:00Z');
  assert.equal(schedule.getVietnamDateKey(midnight), '2026-11-19');
  assert.deepEqual(schedule.getCustomerPickupTimeOptions('2026-11-18', midnight), []);
  assert.equal(schedule.toVietnamDateTime('2026-11-19', '08:15'), '2026-11-19T01:15:00.000Z');
});

test('pickup deadline remains anchored to harvest readiness', () => {
  assert.deepEqual(schedule.getCustomerPickupDateKeys('2026-11-18T07:00:00+07:00', now), ['2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21']);
  assert.deepEqual(schedule.getCustomerPickupDateKeys('2026-11-14T07:00:00+07:00', now), []);
});

test('saved non-quarter-hour schedules cannot be submitted as new slots', () => {
  assert.ok(!schedule.getCustomerPickupTimeOptions('2026-11-19', now).includes('08:17'));
});

function alerts() {
  return loadTypeScript('../src/shared/components/feedback/appAlertStore.ts');
}

test('confirmation callbacks execute once and can enqueue a follow-up message', () => {
  const { AppAlert, appAlertStore } = alerts();
  let actions = 0;
  AppAlert.alert('Confirm', 'Question', [{ text: 'Confirm', onPress: () => { actions++; AppAlert.alert('Saved'); } }]);
  const id = appAlertStore.getSnapshot().requests[0].id;
  appAlertStore.press(id, 0);
  appAlertStore.press(id, 0);
  assert.equal(actions, 1);
  assert.equal(appAlertStore.getSnapshot().requests[0].title, 'Saved');
});

test('dismissal cannot bypass non-cancelable confirmation or invoke destructive action', () => {
  const { AppAlert, appAlertStore } = alerts();
  let deleted = false;
  AppAlert.alert('Delete', '', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { deleted = true; } }]);
  const id = appAlertStore.getSnapshot().requests[0].id;
  appAlertStore.dismiss(id);
  assert.equal(appAlertStore.getSnapshot().requests.length, 1);
  appAlertStore.press(id, 0);
  assert.equal(deleted, false);
  assert.equal(appAlertStore.getSnapshot().requests.length, 0);
});

test('cancelable backdrop invokes onDismiss once and queued messages remain', () => {
  const { AppAlert, appAlertStore } = alerts();
  let dismissed = 0;
  AppAlert.alert('First', '', undefined, { cancelable: true, onDismiss: () => { dismissed++; } });
  AppAlert.alert('Second');
  const id = appAlertStore.getSnapshot().requests[0].id;
  appAlertStore.dismiss(id);
  appAlertStore.dismiss(id);
  assert.equal(dismissed, 1);
  assert.equal(appAlertStore.getSnapshot().requests[0].title, 'Second');
});

test('nested sheets remain above parents even with child-first React effects', () => {
  const { appAlertStore } = alerts();
  const removeChild = appAlertStore.registerHost('child', 1);
  const removeParent = appAlertStore.registerHost('parent', 0);
  assert.equal(appAlertStore.getSnapshot().hosts.at(-1).id, 'child');
  removeChild();
  assert.equal(appAlertStore.getSnapshot().hosts.at(-1).id, 'parent');
  removeParent();
  assert.equal(appAlertStore.getSnapshot().hosts.length, 0);
});

const { completeDeliveryReceiving } = loadTypeScript('../src/features/order/domain/completeDelivery.ts');

test('shipment transitions move forward and terminal attempts cannot be reopened', () => {
  assert.deepEqual(shipmentDomain.nextShipmentStatuses('PENDING'), ['SHIPPED', 'CANCELLED']);
  assert.deepEqual(shipmentDomain.nextShipmentStatuses('SHIPPED'), ['IN_TRANSIT', 'RETURNED']);
  assert.deepEqual(shipmentDomain.nextShipmentStatuses('IN_TRANSIT'), ['DELIVERED', 'RETURNED']);
  assert.deepEqual(shipmentDomain.nextShipmentStatuses('DELIVERED'), ['RETURNED']);
  for (const status of ['CANCELLED', 'RETURNED', 'UNKNOWN', 'toString']) {
    assert.deepEqual(shipmentDomain.nextShipmentStatuses(status), []);
  }
});

test('delivery completes eligible sessions only and retries skip already completed requests', async () => {
  const base = { order_id: 8, harvest_method: 'DELIVERY', status: 'COMPLETED', cultivation_status: 'HARVESTING', harvest_request_status: 'CONFIRMED' };
  const rows = [
    { ...base, harvest_request_id: 1 },
    { ...base, harvest_request_id: 2 },
    { ...base, harvest_request_id: 3, harvest_method: 'PICKUP' },
    { ...base, harvest_request_id: 4, status: 'IN_PROGRESS' },
    { ...base, harvest_request_id: 5, order_id: 9 },
    { ...base, harvest_request_id: 6, harvest_request_status: 'COMPLETED' },
    { ...base, harvest_request_id: 7, harvest_request_status: 'CANCELLED' },
  ];
  const calls = [];
  let fail = true;
  const repository = {
    getAdminHarvests: async ({ orderId }) => { assert.equal(orderId, 8); return rows; },
    completeHarvestReceiving: async (id) => {
      calls.push(id);
      if (id === 2 && fail) throw new Error('network');
      rows.find(row => row.harvest_request_id === id).harvest_request_status = 'COMPLETED';
    },
  };
  await assert.rejects(completeDeliveryReceiving(8, repository), /network/);
  fail = false;
  assert.equal(await completeDeliveryReceiving(8, repository), 1);
  assert.deepEqual(calls, [1, 2, 2]);
  assert.equal(await completeDeliveryReceiving(8, repository), 0);
});
