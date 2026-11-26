import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';

function compile(path, suffix = '') {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8') + suffix;
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  }).outputText;
}

const shipmentModule = new Module('shipment-test');
shipmentModule._compile(compile('../src/features/order/domain/shipment.ts'), 'shipment-test');

function handover(query, user = { id: 'customer-1' }) {
  const react = {
    __esModule: true,
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Fragment: Symbol('Fragment'),
  };
  react.default = react;
  const placeholder = () => null;
  const token = new Proxy({}, { get: () => token });
  let queryOptions;
  const loaded = new Module('handover-test');
  loaded.require = (name) => {
    if (name === 'react') return react;
    if (name === 'react-native') return {
      ActivityIndicator: placeholder, Pressable: placeholder, ScrollView: placeholder,
      View: placeholder, StyleSheet: { create: (styles) => styles },
    };
    if (name === '@expo/vector-icons') return { Ionicons: placeholder };
    if (name.endsWith('/AppDialog')) return { AppModal: placeholder };
    if (name.endsWith('/growthStages')) return { GROWTH_STAGE_DESCRIPTIONS: {} };
    if (name.endsWith('/theme')) return { theme: token };
    if (name.endsWith('/currency')) return { formatVND: (amount) => `${amount}đ` };
    if (name.endsWith('/shared/components')) return { AppButton: placeholder, AppCard: placeholder, AppText: placeholder };
    if (name.endsWith('/MushroomImage')) return { MushroomImage: placeholder };
    if (name.endsWith('/auth')) return { useAuth: () => ({ user }) };
    if (name.endsWith('/OrderRepository')) return { orderRepository: {} };
    if (name.endsWith('/shipmentApi')) return { useGetOrderShipmentsQuery: (_args, options) => {
      queryOptions = options;
      return { refetch: () => {}, isFetching: false, isError: false, ...query };
    } };
    if (name.endsWith('/shipment')) return shipmentModule.exports;
    if (name.endsWith('/sessionWorkflow')) return {};
    if (name.endsWith('/CustomerEnvironmentHistoryChart')) return {};
    throw new Error(`Unexpected dependency: ${name}`);
  };
  loaded._compile(
    compile('../src/features/order/presentation/components/CompletedOrderReportModal.tsx', '\nexport { HandoverDetails };'),
    'handover-test',
  );
  return {
    render(session, method) {
      const tree = loaded.exports.HandoverDetails({ orderId: 7, session, method });
      return { tree, queryOptions };
    },
  };
}

function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== 'object' || !node.props) return [];
  return [node, ...elements(node.props.children)];
}

function rows(tree) {
  return Object.fromEntries(elements(tree)
    .filter((node) => node.type?.name === 'ReportRow')
    .map((node) => [node.props.label, node.props.value]));
}

function text(tree) {
  if (Array.isArray(tree)) return tree.flatMap(text);
  if (typeof tree === 'string') return [tree];
  return tree && typeof tree === 'object' && tree.props ? text(tree.props.children) : [];
}

test('pickup displays actual completion and appointment without requesting shipments', () => {
  const view = handover({});
  const { tree, queryOptions } = view.render({
    harvest_request_status: 'COMPLETED', scheduled_at: '2026-11-18T03:00:00Z',
    handover_completed_at: '2026-11-18T04:00:00Z',
  }, 'PICKUP');
  const details = rows(tree);
  assert.equal(queryOptions.skip, true);
  assert.equal(details['Phương thức'], 'Khách nhận tại trại');
  assert.equal(details['Trạng thái'], 'Đã xác nhận hoàn tất');
  assert.equal(details['Lịch hẹn nhận'], new Date('2026-11-18T03:00:00Z').toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }));
  assert.equal(details['Hoàn tất bàn giao'], new Date('2026-11-18T04:00:00Z').toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }));
});

test('delivery shows the latest order-level shipment and does not mislabel returned delivery', () => {
  const view = handover({ currentData: [
    { shipment_id: 1, status: 'DELIVERED', recipient_name: 'Old' },
    { shipment_id: 2, status: 'RETURNED', recipient_name: 'New', address: 'Address',
      recipient_phone: '123', shipping_fee: '10000', delivered_at: '2026-11-18T04:00:00Z' },
  ] });
  const { tree, queryOptions } = view.render({ delivery_address: 'Selected address' }, 'DELIVERY');
  const details = rows(tree);
  assert.equal(queryOptions.skip, false);
  assert.equal(details['Địa chỉ đã chọn'], 'Selected address');
  assert.equal(details['Mã vận đơn nội bộ'], undefined);
  assert.equal(details['Người nhận'], 'New');
  assert.equal(details['Trạng thái giao'], 'Đã hoàn hàng');
  assert.equal(details['Phí giao hàng'], '10000đ');
  assert.equal(details['Đơn vị vận chuyển'], undefined);
  assert.ok(details['Lần giao trước']);
  assert.equal(details['Đã giao lúc'], undefined);
  assert.ok(text(tree).some((item) => item.includes('không xác định riêng cho phiên này')));
});

test('missing handover data and shipment errors are not displayed as successful delivery', () => {
  const view = handover({ isError: true });
  const { tree } = view.render({}, 'DELIVERY');
  const details = rows(tree);
  assert.equal(details['Trạng thái'], 'Chưa có xác nhận bàn giao');
  assert.equal(details['Hoàn tất bàn giao'], 'Chưa ghi nhận');
  assert.ok(text(tree).includes('Không tải được thông tin vận đơn.'));
  assert.ok(!text(tree).includes('Chưa có vận đơn cho đơn hàng.'));
});

test('delivery distinguishes loading from an empty shipment list', () => {
  const loading = handover({ isFetching: true }).render({}, 'DELIVERY').tree;
  assert.ok(!text(loading).includes('Chưa có vận đơn cho đơn hàng.'));
  const empty = handover({ currentData: [] }).render({}, 'DELIVERY').tree;
  assert.ok(text(empty).includes('Chưa có vận đơn cho đơn hàng.'));
});
