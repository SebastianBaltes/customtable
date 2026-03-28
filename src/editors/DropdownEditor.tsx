import React, { useContext, useEffect, useRef, useState } from "react";
import { TranslationsContext } from "../core/TranslationsContext";

interface DropdownEditorProps {
  options: string[];
  selected: string[];
  multiselect: boolean;
  freeText?: boolean;
  displayText: string;
  textEllipsisLength?: number;
  onChange: (newSelected: string[]) => void;
  onRequestClose?: () => void;
}

/**
 * Shared custom dropdown UI for Combobox (single) and MultiCombobox columns.
 *
 * Single-select: commits immediately on option click or Enter.
 * Multi-select:  buffers toggles in local state; commits only on Enter / Tab / blur
 *                so intermediate changes don't trigger the rows-change side-effect that
 *                would close the editor.
 *
 * Keyboard contract
 * -----------------
 *   ArrowDown / ArrowUp  — move the option highlight
 *   Enter (single)       — select highlighted option OR commit typed text; bubbles so
 *                          useCursorKeys can advance to the next row
 *   Enter (multi, empty input) — commit buffered selection; bubbles → next row
 *   Enter (multi, non-empty)   — add custom entry; stays in edit mode
 *   Space  (multi)       — toggle highlighted option (local buffer, no immediate commit)
 *   Tab                  — commit and bubble to useCursorKeys
 *   Escape               — bubble (useCursorKeys exits edit mode; blur commit suppressed)
 */
export const DropdownEditor: React.FC<DropdownEditorProps> = ({
  options,
  selected,
  multiselect,
  freeText = true,
  displayText,
  textEllipsisLength,
  onChange,
  onRequestClose,
}) => {
  const t = useContext(TranslationsContext);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [inputValue, setInputValue] = useState(
    freeText && !multiselect ? (selected[0] ?? "") : "",
  );
  const [hasUserTyped, setHasUserTyped] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  // Multi-select: buffer toggles locally, commit only on explicit close.
  const [localSelected, setLocalSelected] = useState<string[]>(selected);
  const localSelectedRef = useRef(localSelected);
  localSelectedRef.current = localSelected;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Prevents onBlur from committing a stale value after Enter / Tab / Escape.
  const suppressBlurRef = useRef(false);

  const effectiveSelected = multiselect ? localSelected : selected;

  const customSelected = effectiveSelected.filter((s) => !options.includes(s));
  const allOptions = [...options, ...customSelected];

  // Multi-select: sort checked options to the top on initial open.
  // Capture initial selected set once so the order stays stable during interaction.
  const [initialSelected] = useState(() => new Set(selected));
  const sortedOptions = multiselect
    ? [...allOptions].sort((a, b) => {
        const aChecked = initialSelected.has(a) ? 0 : 1;
        const bChecked = initialSelected.has(b) ? 0 : 1;
        return aChecked - bChecked;
      })
    : allOptions;

  const filteredOptions =
    freeText && hasUserTyped && inputValue.trim() !== ""
      ? sortedOptions.filter((o) => o.toLowerCase().includes(inputValue.toLowerCase()))
      : sortedOptions;

  // Clamp highlight when filtered list shrinks
  const prevLenRef = useRef(filteredOptions.length);
  if (prevLenRef.current !== filteredOptions.length) {
    prevLenRef.current = filteredOptions.length;
    if (highlightedIndex !== null && highlightedIndex >= filteredOptions.length) {
      setHighlightedIndex(filteredOptions.length > 0 ? filteredOptions.length - 1 : null);
    }
  }

  useEffect(() => {
    if (freeText) {
      inputRef.current?.focus();
      if (!multiselect) inputRef.current?.select();
    } else {
      dropdownRef.current?.focus();
    }
  }, [freeText, multiselect]);

  useEffect(() => {
    if (highlightedIndex === null || !listRef.current) return;
    const item = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  // ---- Commit helpers ----

  const commitSingle = (text: string) => onChange([text]);
  const commitMulti = () => onChangeRef.current(localSelectedRef.current);

  const toggleLocal = (opt: string) => {
    setLocalSelected((prev) =>
      prev.includes(opt) ? prev.filter((s) => s !== opt) : [...prev, opt],
    );
  };

  const addCustomEntry = () => {
    const trimmed = inputValue.trim();
    if (trimmed === "") return;
    if (!localSelected.includes(trimmed)) {
      setLocalSelected((prev) => [...prev, trimmed]);
    }
    setInputValue("");
  };

  // ---- Navigation ----

  const moveHighlight = (delta: number) => {
    const len = filteredOptions.length;
    if (len === 0) return;
    setHighlightedIndex((prev) => {
      if (prev === null) return delta > 0 ? 0 : len - 1;
      return (prev + delta + len) % len;
    });
  };

  // Returns true if fully handled (caller should return early).
  const handleNav = (e: React.KeyboardEvent): boolean => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      moveHighlight(+1);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      moveHighlight(-1);
      return true;
    }
    if (e.key === " " && multiselect && highlightedIndex !== null) {
      e.preventDefault();
      e.stopPropagation();
      toggleLocal(filteredOptions[highlightedIndex]);
      return true;
    }
    return false;
  };

  // ---- Enter commit logic (shared) ----

  /**
   * Perform the commit for Enter. Returns true if the caller should
   * stopPropagation (custom-entry case; stay in edit mode), false if Enter
   * should bubble to useCursorKeys (advance row).
   */
  const handleEnterCommit = (): boolean => {
    if (highlightedIndex !== null) {
      const opt = filteredOptions[highlightedIndex];
      if (multiselect) {
        toggleLocal(opt);
        // We need localSelected AFTER the toggle for commitMulti.
        // Since setLocalSelected is async, compute it directly:
        const next = localSelected.includes(opt)
          ? localSelected.filter((s) => s !== opt)
          : [...localSelected, opt];
        onChangeRef.current(next);
      } else {
        commitSingle(opt);
      }
      suppressBlurRef.current = true;
      return false; // bubble → next row
    }
    if (multiselect) {
      if (inputValue.trim()) {
        // Add custom entry, stay in edit mode
        addCustomEntry();
        return true; // stop propagation
      }
      commitMulti();
      suppressBlurRef.current = true;
      return false; // bubble
    } else {
      commitSingle(inputValue);
      suppressBlurRef.current = true;
      return false; // bubble
    }
  };

  // ---- Render ----

  return (
    <div
      ref={dropdownRef}
      className="combo-dropdown"
      tabIndex={-1}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          suppressBlurRef.current = true;
          return; // bubble
        }
        if (e.key === "Tab") {
          suppressBlurRef.current = true;
          if (multiselect) commitMulti();
          return; // bubble
        }
        if (e.key === "Enter") {
          // Only handle Enter originating from the div itself, not bubbled from the input.
          // (The input's handler already committed; we just need to let Enter bubble.)
          const fromInput = inputRef.current && e.target === inputRef.current;
          if (!fromInput) {
            const stopProp = handleEnterCommit();
            if (stopProp) { e.stopPropagation(); return; }
          }
          return; // bubble → useCursorKeys
        }
        if (handleNav(e)) return;
        e.stopPropagation();
      }}
    >
      {freeText ? (
        <input
          ref={inputRef}
          className="combo-dropdown-input"
          type="text"
          autoComplete="off"
          data-lpignore="true"
          value={inputValue}
          onChange={(e) => { setHasUserTyped(true); setInputValue(e.target.value); }}
          placeholder={multiselect ? t["Filter or add value..."] : t["Enter or select..."]}
          onBlur={() => {
            if (suppressBlurRef.current) return;
            if (!multiselect) commitSingle(inputValue);
            else commitMulti();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              suppressBlurRef.current = true;
              return; // bubble
            }
            if (e.key === "Tab") {
              suppressBlurRef.current = true;
              if (multiselect) {
                if (inputValue.trim()) addCustomEntry();
                commitMulti();
              } else {
                commitSingle(inputValue);
              }
              return; // bubble
            }
            if (e.key === "Enter") {
              const stopProp = handleEnterCommit();
              if (stopProp) { e.stopPropagation(); return; }
              return; // bubble — div handler will see it but skip re-commit (fromInput check)
            }
            if (handleNav(e)) return;
            e.stopPropagation();
          }}
        />
      ) : (
        <div className="combo-dropdown-display" title={displayText}>
          {(textEllipsisLength && displayText.length > textEllipsisLength
            ? displayText.substring(0, textEllipsisLength) + " [...]"
            : displayText) || t["-- select --"]}
        </div>
      )}

      <div ref={listRef} className="combo-dropdown-list">
        {filteredOptions.map((opt, idx) => {
          const isSelected = effectiveSelected.includes(opt);
          const isHighlighted = idx === highlightedIndex;
          const isCustom = !options.includes(opt);
          return (
            <div
              key={opt}
              className={[
                "combo-dropdown-option",
                isSelected ? "is-selected" : "",
                isHighlighted ? "is-highlighted" : "",
                isCustom ? "is-custom" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseDown={(e) => {
                e.preventDefault();
                if (!multiselect) {
                  if (freeText) setInputValue(opt);
                  suppressBlurRef.current = true;
                  commitSingle(opt);
                  onRequestClose?.();
                } else {
                  toggleLocal(opt);
                  if (freeText) setInputValue("");
                }
              }}
              onMouseEnter={() => setHighlightedIndex(idx)}
              onMouseLeave={() => setHighlightedIndex(null)}
            >
              {multiselect && (
                <span className="combo-dropdown-checkbox" aria-hidden="true">
                  {isSelected ? "☑" : "☐"}
                </span>
              )}
              <span>{opt}</span>
              {isCustom && (
                <span className="combo-dropdown-custom-badge" aria-hidden="true">
                  eigener Wert
                </span>
              )}
            </div>
          );
        })}
        {freeText && filteredOptions.length === 0 && (
          <div className="combo-dropdown-empty">
            {multiselect ? t["Press Enter to add"] : t["Press Enter to save"]}
          </div>
        )}
      </div>
    </div>
  );
};
