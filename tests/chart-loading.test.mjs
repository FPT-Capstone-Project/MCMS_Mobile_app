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
      CUSTOMER: {
        CULTIVATION_PROGRESS: id => `progress/${id}`,
        IOT_HISTORY: id => `devices/${id}`,
        IOT_CURRENT_SENSOR_READINGS: id => `current/${id}`,
      },
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

test('current sensor readings use the latest-per-sensor endpoint without history pagination', async () => {
  const calls = [];
  const repo = repository(async (url, options) => {
    calls.push([url, options]);
    return { data: { data: { readings: [
      { id: '2:1', temperature: '25.5', humidity: '82', sensorId: 1 },
      { id: '2:2', temperature: '26', humidity: '80', sensorId: 2 },
    ] } } };
  });
  const readings = await repo.getCustomerCurrentSensorReadings(7);
  assert.deepEqual(calls, [['current/7', undefined]]);
  assert.deepEqual(readings.map(reading => reading.temperature), [25.5, 26]);
  assert.deepEqual(readings.map(reading => reading.humidity), [82, 80]);
});

test('growth detail reads the latest progress of the selected session, including numeric strings', async () => {
  const repo = repository(
    async () => ({ data: { data: [
      { session_id: 7, progress_percent: '20' },
      { session_id: 8, progress_percent: '99' },
    ] } }),
    async () => ({ sessions: [
      { session_id: 8, progress_percent: '99' },
      { session_id: 7, progress_percent: '37.5' },
    ] }),
  );
  assert.equal((await repo.getCustomerCultivationDetails(7, 4)).progress_percent, 37.5);
});

test('growth detail preserves zero and reports invalid progress instead of inventing a value', async () => {
  const get = async () => ({ data: { data: [{ session_id: 7 }] } });
  const zero = repository(get, async () => ({ sessions: [{ session_id: 7, progress_percent: '0' }] }));
  assert.equal((await zero.getCustomerCultivationDetails(7, 4)).progress_percent, 0);
  const invalid = repository(get, async () => ({ sessions: [{ session_id: 7, progress_percent: '101' }] }));
  await assert.rejects(invalid.getCustomerCultivationDetails(7, 4), /Tiến độ nuôi trồng.*không hợp lệ/);
});

test('staff tray detail uses the latest progress record for the selected session', async () => {
  const repo = repository(async () => ({ data: { data: { progress_history: [
    { session_id: 7, progress_percent: '12' },
    { session_id: 7, progress_percent: '58.5' },
  ] } } }));
  assert.equal((await repo.getCustomerCultivationDetails(7)).progress_percent, 58.5);
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

function trayDetailHarness(sensorRequest, deviceRequest, detail = {}) {
  const slots = [];
  let index = 0;
  let effects = [];
  const same = (left, right) => left && right && left.length === right.length &&
    left.every((value, i) => Object.is(value, right[i]));
  const react = {
    __esModule: true,
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const current = index++;
      if (!(current in slots)) slots[current] = initial;
      return [slots[current], (value) => {
        slots[current] = typeof value === 'function' ? value(slots[current]) : value;
      }];
    },
    useRef(initial) {
      const current = index++;
      if (!(current in slots)) slots[current] = { current: initial };
      return slots[current];
    },
    useCallback(callback, deps) {
      const current = index++;
      if (!slots[current] || !same(slots[current].deps, deps)) slots[current] = { value: callback, deps };
      return slots[current].value;
    },
    useEffect(effect, deps) {
      const current = index++;
      if (!slots[current] || !same(slots[current].deps, deps)) {
        effects.push(() => {
          slots[current]?.cleanup?.();
          slots[current] = { deps, cleanup: effect() };
        });
      }
    },
  };
  react.default = react;
  const token = new Proxy({}, { get: () => token });
  const placeholder = () => null;
  const repositoryMock = {
    getCustomerCultivationDetails: async () => ({
      session_id: 7, growth_history: [], sensor_readings: [], device_logs: [], ...detail,
    }),
    getCustomerCurrentSensorReadings: sensorRequest,
    getCustomerDeviceLogs: deviceRequest,
  };
  const source = readFileSync(new URL('../src/features/tray/presentation/components/CustomerTrayDetail.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React },
  });
  const loaded = new Module('tray-detail-test');
  loaded.require = (name) => {
    if (name === 'react') return react;
    if (name === 'react-native') return {
      ActivityIndicator: placeholder, Pressable: placeholder, ScrollView: placeholder,
      View: placeholder, StyleSheet: { create: (styles) => styles, hairlineWidth: 1 },
    };
    if (name === '@expo/vector-icons') return { Ionicons: placeholder };
    if (name.endsWith('/growthStages')) return { GROWTH_STAGE_LABELS: {
      FRUITING_INITIATION: 'Khởi đầu', PINNING: 'Ra nụ',
      YOUNG_FRUITING: 'Nấm non', MATURATION: 'Trưởng thành',
    } };
    if (name.endsWith('/appError')) return { AppError: Error };
    if (name.endsWith('/theme')) return { theme: token };
    if (name.endsWith('/shared/components')) return { AppButton: placeholder, AppText: placeholder };
    if (name.endsWith('/TrayRepository')) return { trayRepository: repositoryMock };
    if (name.endsWith('/CustomerEnvironmentHistoryChart')) return { CustomerEnvironmentHistoryChart: placeholder };
    if (name.endsWith('/CustomerDailyReport')) return { CustomerDailyReport: placeholder };
    throw new Error(`Unexpected dependency: ${name}`);
  };
  loaded._compile(compiled.outputText, 'tray-detail-test');
  const selectedTray = { id: 1, code: 'K1', usage: 'MY_CULTIVATION', sessionId: 7, orderId: 3 };
  function render() {
    index = 0;
    effects = [];
    const tree = loaded.exports.CustomerTrayDetail({ selectedTray, onClose: () => {} });
    effects.forEach((effect) => effect());
    return tree;
  }
  function find(node, name, predicate = () => true) {
    if (Array.isArray(node)) {
      for (const child of node) {
        const found = find(child, name, predicate);
        if (found) return found;
      }
      return undefined;
    }
    if (!node || typeof node !== 'object') return undefined;
    if (node.type?.name === name && predicate(node.props)) return node;
    return find(node.props?.children, name, predicate);
  }
  return {
    async openGrowth() {
      render();
      await new Promise(setImmediate);
      return find(render(), 'GrowthHistory');
    },
    async openDevices() {
      render();
      await new Promise(setImmediate);
      const ready = render();
      find(ready, 'DetailTabButton', (props) => props.label === 'Nhật ký thiết bị').props.onPress();
      render();
      await new Promise(setImmediate);
      return find(render(), 'DeviceHistory');
    },
    close() {
      slots.forEach((slot) => slot?.cleanup?.());
    },
  };
}

test('growth percentage and bar use the database value instead of the stage position', async () => {
  const harness = trayDetailHarness(async () => [], async () => [], {
    current_stage: 'MATURATION', progress_percent: 37.5,
  });
  try {
    const growth = await harness.openGrowth();
    const tree = growth.type(growth.props);
    assert.ok(renderedText(tree).includes('37.5%'));
    const bar = findElement(tree, (node) => node.props?.accessibilityRole === 'progressbar');
    assert.equal(bar.props.accessibilityValue.now, 37.5);
    assert.ok(bar.props.children.some((node) =>
      Array.isArray(node?.props?.style) && node.props.style.some((style) => style?.width === '37.5%')));
  } finally {
    harness.close();
  }
});

test('missing progress is shown as unavailable, not a calculated stage percentage', async () => {
  const harness = trayDetailHarness(async () => [], async () => [], { current_stage: 'MATURATION' });
  try {
    const growth = await harness.openGrowth();
    const tree = growth.type(growth.props);
    assert.ok(renderedText(tree).includes('Chưa cập nhật'));
    const bar = findElement(tree, (node) => node.props?.accessibilityRole === 'progressbar');
    assert.equal(bar.props.accessibilityValue.text, 'Chưa cập nhật tiến độ');
  } finally {
    harness.close();
  }
});

test('zero progress remains visible', async () => {
  const harness = trayDetailHarness(async () => [], async () => [], {
    current_stage: 'MATURATION', progress_percent: 0,
  });
  try {
    const growth = await harness.openGrowth();
    const tree = growth.type(growth.props);
    assert.ok(renderedText(tree).includes('0%'));
    assert.equal(findElement(tree, (node) => node.props?.accessibilityRole === 'progressbar').props.accessibilityValue.now, 0);
  } finally {
    harness.close();
  }
});

function findElement(node, predicate) {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElement(child, predicate);
      if (found) return found;
    }
    return undefined;
  }
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  return findElement(node.props?.children, predicate);
}

function renderedText(node) {
  if (Array.isArray(node)) return node.flatMap(renderedText);
  if (typeof node === 'string') return [node];
  return node && typeof node === 'object' ? renderedText(node.props?.children) : [];
}

test('sensor readings remain visible when device history fails', async () => {
  const readings = [
    { sensorId: 1, temperature: 25, humidity: 80, ok: true },
    { sensorId: 2, temperature: 26, humidity: 82, ok: true },
    { sensorId: 3, temperature: 27, humidity: 84, ok: true },
  ];
  const harness = trayDetailHarness(async () => readings, async () => { throw new Error('device timeout'); });
  try {
    const history = await harness.openDevices();
    const props = history.props;
    assert.deepEqual(props.readings, readings);
    assert.equal(props.refreshError, null);
    assert.equal(props.deviceRefreshError, 'device timeout');
    const text = renderedText(history.type(props));
    assert.ok(text.includes('26.0°C'));
    assert.ok(text.includes('82%'));
  } finally {
    harness.close();
  }
});

test('stale sensor readings are not presented as current', async () => {
  const harness = trayDetailHarness(
    async () => [{ sensorId: 1, temperature: 25.5, humidity: 80, ok: false }],
    async () => [],
  );
  try {
    const history = await harness.openDevices();
    const text = renderedText(history.type(history.props));
    assert.ok(text.includes('Chưa có dữ liệu cảm biến hợp lệ trong 60 giây gần nhất.'));
    assert.ok(!text.includes('25.5°C'));
  } finally {
    harness.close();
  }
});

test('device history remains visible when sensor readings fail', async () => {
  const logs = [{ commandId: 1 }];
  const harness = trayDetailHarness(async () => { throw new Error('sensor timeout'); }, async () => logs);
  try {
    const props = (await harness.openDevices()).props;
    assert.deepEqual(props.logs, logs);
    assert.equal(props.refreshError, 'sensor timeout');
    assert.equal(props.deviceRefreshError, null);
  } finally {
    harness.close();
  }
});
