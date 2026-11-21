import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import Module from 'node:module';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(
  new URL('../src/features/rental/domain/automaticPackage.ts', import.meta.url),
  'utf8',
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
});
const loaded = new Module('automatic-rental-package-test');
loaded._compile(compiled.outputText, 'automatic-rental-package-test');
const { selectAutomaticRentalPackage } = loaded.exports;

const packages = [
  { package_id: 12, duration_days: 15 },
  { package_id: 8, duration_days: 20 },
  { package_id: 5, duration_days: 15 },
  { package_id: 3, duration_days: 20 },
];

test('selects the backend duration at each growth-day boundary', () => {
  assert.equal(selectAutomaticRentalPackage(7, packages)?.duration_days, 15);
  assert.equal(selectAutomaticRentalPackage(9, packages)?.duration_days, 15);
  assert.equal(selectAutomaticRentalPackage(10, packages)?.duration_days, 20);
  assert.equal(selectAutomaticRentalPackage(15, packages)?.duration_days, 20);
});

test('uses the lowest package ID when multiple active packages share a duration', () => {
  assert.equal(selectAutomaticRentalPackage(9, packages)?.package_id, 5);
  assert.equal(selectAutomaticRentalPackage(12, packages)?.package_id, 3);
});

test('returns no package for unsupported growth durations or missing package tiers', () => {
  assert.equal(selectAutomaticRentalPackage(6, packages), null);
  assert.equal(selectAutomaticRentalPackage(16, packages), null);
  assert.equal(selectAutomaticRentalPackage(12, [packages[0]]), null);
});
