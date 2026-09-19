import { useEffect } from "react";

/**
 * Listens for Cmd/Ctrl+C anywhere on the page and calls `onCopy` - but
 * only when it wouldn't hijack a normal copy action:
 *   - never while focus is in an input/textarea/contenteditable (the
 *     user is almost certainly trying to copy something they typed or
 *     selected there, not the whole prompt)
 *   - never while the user has an actual text selection on the page
 *     (respect their intent to copy just that selection)
 *
 * `enabled` lets the caller turn this off entirely, e.g. while a dialog
 * with its own text fields is open on top of the page.
 */
export function useCopyShortcut(onCopy: () => void, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const isCopyChord = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c";
      if (!isCopyChord) return;

      const activeElement = document.activeElement;
      const tagName = activeElement?.tagName;
      const isEditableFocused =
        tagName === "INPUT" ||
        tagName === "TEXTAREA" ||
        (activeElement as HTMLElement | null)?.isContentEditable;
      if (isEditableFocused) return;

      const hasSelection = (window.getSelection()?.toString().length ?? 0) > 0;
      if (hasSelection) return;

      e.preventDefault();
      onCopy();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCopy, enabled]);
}
