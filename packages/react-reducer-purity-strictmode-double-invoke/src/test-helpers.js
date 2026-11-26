process.env.NODE_ENV = 'development';

import { JSDOM } from 'jsdom';
import { Component, createElement } from 'react';

export function setupTestEnvironment() {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost',
    pretendToBeVisual: true,
  });

  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(global, 'navigator', {
    value: dom.window.navigator,
    writable: true,
    configurable: true,
  });

  return dom;
}

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || createElement('div', null, 'Error caught');
    }
    return this.props.children;
  }
}

let testResults = [];
let failedTests = 0;

export function resetTestResults() {
  testResults = [];
  failedTests = 0;
}

export function getTestResults() {
  return { results: [...testResults], failedTests };
}

export function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    testResults.push(`FAIL: ${message}`);
    failedTests++;
  } else {
    console.log(`PASS: ${message}`);
    testResults.push(`PASS: ${message}`);
  }
}

export function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`FAIL: ${message}`);
    console.error(`   Expected: ${expected}`);
    console.error(`   Actual: ${actual}`);
    testResults.push(`FAIL: ${message} (expected: ${expected}, actual: ${actual})`);
    failedTests++;
  } else {
    console.log(`PASS: ${message}`);
    testResults.push(`PASS: ${message}`);
  }
}

export function assertDeepEqual(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    console.error(`FAIL: ${message}`);
    console.error(`   Expected: ${expectedStr}`);
    console.error(`   Actual: ${actualStr}`);
    testResults.push(`FAIL: ${message}`);
    failedTests++;
  } else {
    console.log(`PASS: ${message}`);
    testResults.push(`PASS: ${message}`);
  }
}

export function assertGreaterThan(actual, threshold, message) {
  if (actual <= threshold) {
    console.error(`FAIL: ${message}`);
    console.error(`   Expected > ${threshold}`);
    console.error(`   Actual: ${actual}`);
    testResults.push(`FAIL: ${message}`);
    failedTests++;
  } else {
    console.log(`PASS: ${message}`);
    testResults.push(`PASS: ${message}`);
  }
}

export function assertLessThan(actual, threshold, message) {
  if (actual >= threshold) {
    console.error(`FAIL: ${message}`);
    console.error(`   Expected < ${threshold}`);
    console.error(`   Actual: ${actual}`);
    testResults.push(`FAIL: ${message}`);
    failedTests++;
  } else {
    console.log(`PASS: ${message}`);
    testResults.push(`PASS: ${message}`);
  }
}
