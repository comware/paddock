/**
 * Tests for agent-write notifications.
 *
 * Without these, a proposal staged while the grower is looking at the calendar is simply
 * invisible until the page happens to remount - the bug that prompted this module.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  onProposalsChanged,
  emitProposalsChanged,
  clearProposalListeners,
} from '../events';

beforeEach(() => {
  clearProposalListeners();
});

describe('proposal change notifications', () => {
  it('notifies a subscriber', () => {
    const seen: string[] = [];
    onProposalsChanged((c) => seen.push(c));

    emitProposalsChanged('staged');

    expect(seen).toEqual(['staged']);
  });

  it('notifies every subscriber', () => {
    const a = vi.fn();
    const b = vi.fn();
    onProposalsChanged(a);
    onProposalsChanged(b);

    emitProposalsChanged('approved');

    expect(a).toHaveBeenCalledWith('approved');
    expect(b).toHaveBeenCalledWith('approved');
  });

  it('stops notifying after unsubscribe', () => {
    const listener = vi.fn();
    const off = onProposalsChanged(listener);

    off();
    emitProposalsChanged('staged');

    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps notifying others when one listener throws', () => {
    const survivor = vi.fn();
    onProposalsChanged(() => {
      throw new Error('boom');
    });
    onProposalsChanged(survivor);

    vi.spyOn(console, 'error').mockImplementation(() => {});

    // A broken view must not stop the write that triggered this, nor the other views.
    expect(() => emitProposalsChanged('staged')).not.toThrow();
    expect(survivor).toHaveBeenCalled();
  });

  it('tolerates a listener unsubscribing during dispatch', () => {
    const second = vi.fn();
    const off = onProposalsChanged(() => off());
    onProposalsChanged(second);

    expect(() => emitProposalsChanged('rejected')).not.toThrow();
    expect(second).toHaveBeenCalled();
  });

  it('does nothing when nobody is listening', () => {
    expect(() => emitProposalsChanged('staged')).not.toThrow();
  });
});
