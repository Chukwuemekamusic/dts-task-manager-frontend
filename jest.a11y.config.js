module.exports = {
  roots: ['<rootDir>/src/test/a11y'],
  testRegex: '(/src/test/.*|\\.(test|spec))\\.(ts|js)$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testEnvironment: 'jsdom',
  // Resolve packages' "node" export condition (not "browser") so server-side
  // libraries like axios load their Node build with a working HTTP adapter.
  testEnvironmentOptions: {
    customExportConditions: ['node'],
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/support/axe-setup.ts'],
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
};
