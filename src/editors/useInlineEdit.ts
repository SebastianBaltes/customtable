import React, { useState, useRef, useLayoutEffect } from "react";

const identity = (v: string) => v;

export interface UseInlineEditOptions {
  /** Current prop value (used to reset on escape / sync on edit-exit). */
  value: string;
  /** Whether the cell is in editing mode. */
  editing: boolean;
  /** The character that triggered edit mode, null for triple-click, "" for F2/dblclick. */
  initialEditValue: string | null;
  /** Called to commit the current local value. */
  onCommit: (localValue: string) => void;
  /** Optional transform applied to the value before storing locally (e.g. input mask). */
  transformValue?: (val: string) => string;
  /**
   * Guard for *implicit* commits — leaving edit mode without Enter/Tab, i.e.
   * clicking into another cell or blurring the input. Return false for input
   * that cannot be parsed; the edit is then discarded instead of persisting a
   * half-typed value. Explicit commits (Enter/Tab/ArrowRight) are never
   * blocked by this — there the user asserted intent and the editor's own
   * fallback handling applies.
   *
   * Defaults to "everything is committable" (correct for free-text editors).
   */
  canCommitOnExit?: (localValue: string) => boolean;
}

export interface UseInlineEditResult {
  localValue: string;
  setLocalValue: (val: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  /** Spread onto the <input> element's onKeyDown. */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Spread onto the <input> element's onBlur. */
  handleBlur: () => void;
  /**
   * Tell the hook that the pending edit has already been dealt with (committed
   * or deliberately discarded) elsewhere, so no implicit commit happens when
   * edit mode ends. Needed by editors that hand the value over to their own
   * UI, e.g. a dialog with Save/Cancel buttons.
   */
  markHandled: () => void;
}

/**
 * Shared hook for text-based inline cell editors.
 *
 * Handles: local state management, focus/select on edit-enter,
 * Escape (revert), Enter/Tab (commit + bubble), ArrowRight-at-end
 * (commit + navigate), and stopPropagation for all other keys.
 *
 * Leaving edit mode any other way (clicking into another cell, clicking
 * outside the grid, cursor moved programmatically) commits as well — see
 * `commitImplicit` below.
 */
export function useInlineEdit({
  value,
  editing,
  initialEditValue,
  onCommit,
  transformValue,
  canCommitOnExit,
}: UseInlineEditOptions): UseInlineEditResult {
  const transform = transformValue ?? identity;

  const [localValue, setLocalValue] = useState(transform(value));
  // Mirror of the state so the edit-exit effect below never commits a stale
  // closure value.
  const localValueRef = useRef(localValue);
  localValueRef.current = localValue;
  const inputRef = useRef<HTMLInputElement>(null!);
  const isEscapingRef = useRef(false);
  const prevEditingRef = useRef(false);
  const navigateOnArrowRightRef = useRef(false);
  // Enter/Tab/ArrowRight commit and then let the key bubble, which focuses the
  // grid container while this input is still mounted. The browser answers with
  // a synchronous focusout, so handleBlur would commit the same value a second
  // time within one dispatch.
  const hasCommittedRef = useRef(false);
  // What the cell showed when edit mode started. An implicit commit only fires
  // when the user actually changed something, which keeps merely visiting a
  // cell from writing a re-formatted round-trip of the stored value back to the
  // backend (e.g. null -> 0 in NumberEditor, or a locale-formatted date that
  // does not parse back).
  const baselineRef = useRef(transform(value));

  // --- Sync local value on edit-enter / edit-exit / prop change ---
  // useLayoutEffect, not useEffect: entering edit mode happens inside a keydown
  // handler, and the buffer has to hold the typed character before the browser
  // dispatches the *next* keydown. A passive effect runs after paint, so under
  // load the following keystrokes could land in an input that still showed the
  // old cell value ("Becker" + "ellTwoValue" instead of "CellTwoValue").
  useLayoutEffect(() => {
    if (editing && !prevEditingRef.current) {
      isEscapingRef.current = false;
      hasCommittedRef.current = false;
      const baseline = transform(value);
      baselineRef.current = baseline;
      if (initialEditValue !== null && initialEditValue !== "") {
        setLocalValue(transform(initialEditValue));
        navigateOnArrowRightRef.current = true;
      } else {
        setLocalValue(baseline);
        navigateOnArrowRightRef.current = false;
      }
    } else if (!editing) {
      // Leaving edit mode is the real blur moment: when the user clicks into
      // another cell the grid re-renders this cell without an editor, so the
      // <input> is unmounted *without* a focusout/onBlur ever firing (React
      // does not call onBlur on unmount). Without this branch the typed value
      // would be lost silently.
      if (prevEditingRef.current) commitImplicit();
      setLocalValue(transform(value));
    }
    prevEditingRef.current = editing;
  }, [value, editing, initialEditValue]);

  // --- Focus & select on edit-enter ---
  // Also layout phase, for the same reason: the input must own the focus before
  // the next keystroke arrives.
  useLayoutEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (initialEditValue === null) {
        inputRef.current.select();
      } else {
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  }, [editing, initialEditValue]);

  const commit = () => {
    hasCommittedRef.current = true;
    onCommit(localValue);
  };

  /**
   * Commit path for everything that is not an explicit Enter/Tab: onBlur and
   * the editing -> false transition. Both can happen for a single user action
   * (and in either order), so this is idempotent via hasCommittedRef.
   */
  const commitImplicit = () => {
    if (isEscapingRef.current || hasCommittedRef.current) return;
    const current = localValueRef.current;
    if (current === baselineRef.current) return;
    if (canCommitOnExit && !canCommitOnExit(current)) return;
    hasCommittedRef.current = true;
    onCommit(current);
  };

  const markHandled = () => {
    hasCommittedRef.current = true;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      isEscapingRef.current = true;
      setLocalValue(transform(value));
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      commit();
      return;
    }
    if (e.key === "ArrowRight" && navigateOnArrowRightRef.current) {
      const input = inputRef.current!;
      if (
        input.selectionStart === input.value.length &&
        input.selectionEnd === input.value.length
      ) {
        commit();
        return;
      }
    }
    e.stopPropagation();
  };

  const handleBlur = () => {
    commitImplicit();
  };

  return {
    localValue,
    setLocalValue,
    inputRef,
    handleKeyDown,
    handleBlur,
    markHandled,
  };
}
