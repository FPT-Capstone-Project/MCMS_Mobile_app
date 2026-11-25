import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import React from 'react';
import ts from 'typescript';

const filename = fileURLToPath(new URL('../src/shared/components/layout/AppHeader.tsx', import.meta.url));
const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
});
const IconButton = () => null;
let pathname = '/orders';
let segments = ['(tabs)', 'orders'];
let canGoBack = false;
let navigation = [];
const router = {
  canGoBack: () => canGoBack,
  back: () => navigation.push('back'),
  replace: (target) => navigation.push(target),
};
const dependencies = {
  '@expo/vector-icons': { Ionicons: () => null },
  'expo-router': { useRouter: () => router, usePathname: () => pathname, useSegments: () => segments },
  react: React,
  'react-native': { StyleSheet: { create: (styles) => styles }, View: 'View' },
  'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0 }) },
  '../../../core/theme': {
    theme: {
      colors: { text: {}, background: {}, border: {} },
      layout: { heights: {} },
      spacing: {},
    },
  },
  '../primitives/AppIconButton': { AppIconButton: IconButton },
  '../primitives/AppLogo': { AppLogo: () => null },
  '../primitives/AppText': { AppText: () => null },
};
const loaded = new Module(filename);
loaded.require = (name) => {
  if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
  return dependencies[name];
};
loaded._compile(compiled.outputText, filename);
const { AppHeader } = loaded.exports;

function buttons(element) {
  if (!React.isValidElement(element)) return [];
  return [
    ...(element.type === IconButton ? [element] : []),
    ...React.Children.toArray(element.props.children).flatMap(buttons),
  ];
}

test('main tabs show only home, but the home screen shows no navigation button', () => {
  pathname = '/orders';
  segments = ['(tabs)', 'orders'];
  let actions = buttons(AppHeader({ title: 'Phiên' }));
  assert.deepEqual(actions.map((item) => item.props.accessibilityLabel), ['Về trang chủ']);
  actions[0].props.onPress();
  assert.equal(navigation.pop(), '/');

  pathname = '/';
  assert.equal(buttons(AppHeader({ title: 'Trang chủ' })).length, 0);
});

test('detail screens and multi-step flows prioritize their own back action', () => {
  pathname = '/orders';
  let calls = 0;
  const actions = buttons(AppHeader({ showBack: true, onBack: () => calls++ }));
  assert.deepEqual(actions.map((item) => item.props.accessibilityLabel), ['Quay lại']);
  actions[0].props.onPress();
  assert.equal(calls, 1);
});

test('route back works with history and falls back to home without history', () => {
  pathname = '/customer-orders';
  segments = ['customer-orders'];
  canGoBack = true;
  let actions = buttons(AppHeader({ showBack: true }));
  assert.equal(actions[0].props.accessibilityLabel, 'Quay lại');
  actions[0].props.onPress();
  assert.equal(navigation.pop(), 'back');

  canGoBack = false;
  actions = buttons(AppHeader({ showBack: true }));
  assert.equal(actions[0].props.accessibilityLabel, 'Về trang chủ');
  actions[0].props.onPress();
  assert.equal(navigation.pop(), '/');
});

test('authentication keeps its back action without showing home', () => {
  pathname = '/register';
  segments = ['(auth)', 'register'];
  let calls = 0;
  const actions = buttons(AppHeader({ showBack: true, onBack: () => calls++ }));
  assert.deepEqual(actions.map((item) => item.props.accessibilityLabel), ['Quay lại']);
  actions[0].props.onPress();
  assert.equal(calls, 1);
});
