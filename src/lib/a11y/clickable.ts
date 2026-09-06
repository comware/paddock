/**
 * Makes a non-interactive element behave like a button for people not using a mouse.
 *
 * The obvious fix for a clickable <div> is to make it a <button>. That is not available
 * here: these cards carry their own Edit and Delete buttons, and a button inside a button
 * is invalid HTML that browsers resolve by dropping one of them. So the element stays a
 * div and takes on the button role explicitly - which is what the ARIA authoring practices
 * prescribe for exactly this case.
 *
 * Spread it in place of the onClick:
 *
 *   <div {...clickable(() => onOpen(bed.id))}>
 */

import type { KeyboardEvent, MouseEvent } from 'react';

export function clickable(onActivate: (() => void) | undefined) {
  // No handler, no button. See the test for why this matters more once focusable.
  if (!onActivate) return {};

  return {
    role: 'button',
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      // A nested control - an Edit button, a link - handles its own keys. Without this,
      // Enter on the Edit button would fire Edit and then open the card behind it.
      if (event.target !== event.currentTarget) return;

      // Space scrolls the page by default, which is not what pressing a card should do.
      event.preventDefault();
      onActivate();
    },
  };
}

/**
 * The same, for a handler that wants the click event - to stop it propagating to a card
 * behind, or to read a modifier key.
 */
export function clickableWithEvent(
  onActivate: ((event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => void) | undefined
) {
  if (!onActivate) return {};

  return {
    role: 'button',
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.target !== event.currentTarget) return;
      event.preventDefault();
      onActivate(event);
    },
  };
}
