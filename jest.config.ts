/* eslint-disable */
export default {
  displayName: 'event-sourcing',
  preset: '../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    },
  },
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  transformIgnorePatterns: [
    "node_modules/(?!lodash-es)"
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/libs/event-sourcing',
  setupFilesAfterEnv: ["./src/setup.ts"]
};
