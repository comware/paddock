/**
 * Sanity test - Verify Vitest is configured correctly
 */

import { describe, it, expect } from 'vitest';

describe('Test Setup', () => {
  it('should run tests with Vitest', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to DOM APIs', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello';
    expect(div.textContent).toBe('Hello');
  });

  it('should have testing-library matchers', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello World';
    document.body.appendChild(div);
    expect(div).toBeInTheDocument();
    document.body.removeChild(div);
  });
});
