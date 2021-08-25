import type {Config} from '@jest/types';
import {pathsToModuleNameMapper} from 'ts-jest/utils';

import {compilerOptions} from './tsconfig.json';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testTimeout: 30000,
  testEnvironment: 'node',
  rootDir: './',
  testMatch: ['<rootDir>/src/**/*.test.ts'],
  moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
    prefix: '<rootDir>/',
  }),
  collectCoverage: true,
  coverageDirectory: './coverage',
  reporters: ['default'],
};
export default config;
