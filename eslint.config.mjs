import expo from 'eslint-config-expo/flat.js';

export default [
  ...expo,
  {
    ignores: [
      'node_modules/',
      '.expo/',
      'dist/',
      'Backend/',
      '2e08d929-02ae-4987-a7db-0a8abf10e4da/',
      '*.config.js',
    ],
  },
];
