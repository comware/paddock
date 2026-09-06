/**
 * A card you can only reach with a mouse is a card some people cannot reach at all.
 *
 * Twenty-seven elements across the app carried an onClick on a <div> or <tr>: bed cards,
 * planting cards, batch cards, dashboard rows, calendar entries. A div is not focusable and
 * does not fire a click on Enter, so none of them could be reached by keyboard, and a screen
 * reader announced them as ordinary text with no hint they did anything.
 *
 * These assertions are the reason the helper exists, so they are written first.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { clickable } from '../clickable';

function Card({ onActivate }: { onActivate: () => void }) {
  return <div {...clickable(onActivate)}>Bed 3</div>;
}

describe('clickable', () => {
  /**
   * Every card in the app takes its onClick as optional, and several lists do not pass one -
   * the bed list, for instance. Those cards were already a small lie: they had
   * `cursor-pointer` and a handler that called nothing.
   *
   * Making them focusable turned that lie into an obstacle. A keyboard user would tab to
   * something announced as a button, press Enter, and have nothing happen, with no way to
   * tell it apart from a control that was broken. Better to leave a non-interactive card
   * non-interactive.
   */
  it('leaves the element alone when there is nothing to activate', () => {
    render(<div {...clickable(undefined)}>Bed 3</div>);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('announces itself as something you can activate', () => {
    render(<Card onActivate={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Bed 3' })).toBeInTheDocument();
  });

  it('can be reached by keyboard', async () => {
    const user = userEvent.setup();
    render(<Card onActivate={vi.fn()} />);

    await user.tab();

    expect(screen.getByRole('button', { name: 'Bed 3' })).toHaveFocus();
  });

  it('activates on Enter', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<Card onActivate={onActivate} />);

    await user.tab();
    await user.keyboard('{Enter}');

    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('activates on Space', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<Card onActivate={onActivate} />);

    await user.tab();
    await user.keyboard(' ');

    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('still activates on click', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<Card onActivate={onActivate} />);

    await user.click(screen.getByRole('button'));

    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('ignores other keys', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    render(<Card onActivate={onActivate} />);

    await user.tab();
    await user.keyboard('a{Escape}{ArrowDown}');

    expect(onActivate).not.toHaveBeenCalled();
  });

  /**
   * Cards carry their own buttons - Edit, Delete - and every one of them already calls
   * stopPropagation, so a click on Edit does not also open the card behind it.
   *
   * That is load-bearing, not incidental. Pressing Enter on a native button produces a
   * click event, which bubbles like any other; the guard in onKeyDown cannot stop it,
   * because by then it is a click, not a keypress. So a nested control that forgets to stop
   * propagation will fire the card on Enter as well as on mouse - and the keyboard path
   * makes that newly reachable. The fixture below models the real cards.
   */
  it('does not fire when a nested control handles the key itself', async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();
    const onEdit = vi.fn();
    render(
      <div {...clickable(onActivate)}>
        Bed 3
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          Edit
        </button>
      </div>
    );

    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Edit' })).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onActivate).not.toHaveBeenCalled();
  });
});
