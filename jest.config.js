const tsJestPreset = require('ts-jest/jest-preset');

module.exports = {
  ...tsJestPreset,
  coveragePathIgnorePatterns: ['/node_modules/'],
};
