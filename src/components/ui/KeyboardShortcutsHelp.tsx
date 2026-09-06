/**
 * KeyboardShortcutsHelp - Modal showing available keyboard shortcuts.
 *
 * Was a hand-rolled overlay: a plain div with a backdrop click handler, no dialog role, no
 * focus trap and no focus management. Escape did work, but from a global document listener
 * in useKeyboardShortcuts rather than from anything here - so the dialog could be dismissed
 * while focus was still somewhere behind it in the page.
 *
 * The shared Modal is a native <dialog> opened with showModal(), so the role, the focus
 * trap, the inert background and Escape all come from the platform. The footer line reading
 * "Press Esc to close" is gone: the shortcut list itself is the place to document
 * shortcuts, and the close button is now visible rather than implied.
 */

import { Modal } from './Modal';

interface Shortcut {
  key: string;
  label: string;
  description: string;
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
}

export function KeyboardShortcutsHelp({ isOpen, onClose, shortcuts }: KeyboardShortcutsHelpProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="md">
      <dl className="space-y-2">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.key} className="flex items-center justify-between py-2 gap-4">
            <dt className="text-sm text-slate-600 dark:text-slate-300">
              {shortcut.description}
            </dt>
            <dd>
              <kbd className="px-2 py-1 text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-600">
                {shortcut.label}
              </kbd>
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
