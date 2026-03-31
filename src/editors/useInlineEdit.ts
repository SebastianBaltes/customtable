import React, { useState, useRef, useEffect } from "react";

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
}

export interface UseInlineEditResult {
  localValue: string;
  setLocalValue: (val: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  /** Spread onto the <input> element's onKeyDown. */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Spread onto the <input> element's onBlur. */
  handleBlur: () => void;
}

/**
 * Shared hook for text-based inline cell editors.
 *
 * Handles: local state management, focus/select on edit-enter,
 * Escape (revert), Enter/Tab (commit + bubble), ArrowRight-at-end
 * (commit + navigate), and stopPropagation for all other keys.
 */
export function useInlineEdit({
  value,
  editing,
  initialEditValue,
  onCommit,
  transformValue,
}: UseInlineEditOptions): UseInlineEditResult {
  const transform = transformValue ?? identity;

  const [localValue, setLocalValue] = useState(transform(value));
  const inputRef = useRef<HTMLInputElement>(null!);
  const isEscapingRef = useRef(false);
  const prevEditingRef = useRef(false);
  const navigateOnArrowRightRef = useRef(false);

  // --- Sync local value on edit-enter / edit-exit / prop change ---
  useEffect(() => {
    if (editing && !prevEditingRef.current) {
      isEscapingRef.current = false;
      if (initialEditValue !== null && initialEditValue !== "") {
        setLocalValue(transform(initialEditValue));
        navigateOnArrowRightRef.current = true;
      } else {
        setLocalValue(transform(value));
        navigateOnArrowRightRef.current = false;
      }
    } else if (!editing) {
      setLocalValue(transform(value));
    }
    prevEditingRef.current = editing;
  }, [value, editing, initialEditValue]);

  // --- Focus & select on edit-enter ---
  useEffect(() => {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      isEscapingRef.current = true;
      setLocalValue(transform(value));
      return;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      onCommit(localValue);
      return;
    }
    if (e.key === "ArrowRight" && navigateOnArrowRightRef.current) {
      const input = inputRef.current!;
      if (
        input.selectionStart === input.value.length &&
        input.selectionEnd === input.value.length
      ) {
        onCommit(localValue);
        return;
      }
    }
    e.stopPropagation();
  };

  const handleBlur = () => {
    if (!isEscapingRef.current) onCommit(localValue);
  };

  return { localValue, setLocalValue, inputRef, handleKeyDown, handleBlur };
}
