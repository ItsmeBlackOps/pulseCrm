import { describe, it, expect } from 'vitest';
import { hasComponentAccess } from '../lib/roleAccess';

describe('hasComponentAccess', () => {
  it('grants access when allowed entry exists', () => {
    expect(hasComponentAccess(1, 'dashboard')).toBe(true);
    expect(hasComponentAccess(5, 'leads')).toBe(true);
  });

  it('denies access when no entry exists', () => {
    expect(hasComponentAccess(3, 'settings')).toBe(false);
  });
});
