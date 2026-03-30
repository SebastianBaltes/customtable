import React, { useEffect, useRef, useState } from "react";

interface ComboboxFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
}

/** Sentinel used internally to represent the empty-string value in the filter state. */
const EMPTY_SENTINEL = "\x01empty\x01";

/**
 * Prefix that marks a filter value as multi-select (checkbox) mode.
 * Without this prefix the value is treated as a plain substring filter.
 */
export const MULTI_SELECT_PREFIX = "\x00";

const encodeOption = (opt: string) => (opt === "" ? EMPTY_SENTINEL : opt);

/** Build the filter-state string from selected values. */
const encodeSelected = (sel: string[]): string =>
  sel.length > 0 ? MULTI_SELECT_PREFIX + sel.join("\n") : "";

/** Parse a filter value back into { selected[], isMulti }. */
export const parseFilterValue = (
  value: string,
): { selected: string[]; isMulti: boolean } => {
  if (!value) return { selected: [], isMulti: false };
  if (value.startsWith(MULTI_SELECT_PREFIX)) {
    return {
      selected: value
        .slice(MULTI_SELECT_PREFIX.length)
        .split("\n")
        .filter(Boolean),
      isMulti: true,
    };
  }
  return { selected: [], isMulti: false };
};

/**
 * Filter combobox for columns with selectOptions.
 *
 * - **Typing** immediately filters the table rows by substring AND narrows
 *   the dropdown list.
 * - **Checking** options switches to exact-match mode; typed text then only
 *   narrows the dropdown, not the table data.
 * - The `×` button clears all selections and resets the text.
 *
 * Encoding in FilterState (string):
 * - `"\x00HR\nIT"` → multi-select exact match on "HR" and "IT"
 * - `"HR"` → plain substring match on "HR"
 * - `""` → no filter
 */
export const ComboboxFilter: React.FC<ComboboxFilterProps> = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Parse the stored filter value
  const { selected, isMulti } = parseFilterValue(value);

  // Plain-text portion (non-multi mode) — shown when no checkboxes are active
  const textFilter = !isMulti ? value : "";

  const filteredOptions = searchText
    ? options.filter((o) => {
        const display = o === "" ? "(leer)" : o;
        return display.toLowerCase().includes(searchText.toLowerCase());
      })
    : options;

  const toggle = (opt: string) => {
    const encoded = encodeOption(opt);
    const newSelected = selected.includes(encoded)
      ? selected.filter((s) => s !== encoded)
      : [...selected, encoded];
    onChange(encodeSelected(newSelected));
  };

  const isSelected = (opt: string) => selected.includes(encodeOption(opt));

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onChange("");
    setSearchText("");
  };

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchText("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Sort: checked options first
  const sortedOptions = [...filteredOptions].sort((a, b) => {
    const aChecked = isSelected(a) ? 0 : 1;
    const bChecked = isSelected(b) ? 0 : 1;
    return aChecked - bChecked;
  });

  // Display value: when dropdown is open show the search text,
  // otherwise show selected labels or text filter
  const selectedLabels = selected.map((s) => (s === EMPTY_SENTINEL ? "(leer)" : s));
  const displayValue = open
    ? searchText
    : selectedLabels.length > 0
      ? selectedLabels.join(", ")
      : textFilter;

  const handleTextChange = (text: string) => {
    setSearchText(text);
    if (!open) setOpen(true);
    // When checkboxes are active, typing only narrows the dropdown.
    // When no checkboxes, typing is a live substring filter on the table.
    if (selected.length === 0) {
      onChange(text);
    }
  };

  return (
    <div
      ref={ref}
      className="col-filter-combobox"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        className="col-filter-input"
        type="text"
        value={displayValue}
        placeholder=""
        title={selectedLabels.length > 0 ? selectedLabels.join(", ") : ""}
        onFocus={() => {
          setOpen(true);
          setSearchText(isMulti ? "" : textFilter);
        }}
        onChange={(e) => handleTextChange(e.target.value)}
      />
      {(selected.length > 0 || textFilter) && (
        <button
          className="col-filter-clear"
          onMouseDown={clearAll}
          tabIndex={-1}
          aria-label="Clear filter"
        >
          ×
        </button>
      )}
      {open && (
        <div ref={listRef} className="col-filter-dropdown">
          {sortedOptions.map((opt) => {
            const checked = isSelected(opt);
            const isEmpty = opt === "";
            return (
              <label
                key={isEmpty ? EMPTY_SENTINEL : opt}
                className={
                  "col-filter-dropdown-option" +
                  (checked ? " is-selected" : "") +
                  (isEmpty ? " is-empty-value" : "")
                }
                onMouseDown={(e) => {
                  e.preventDefault();
                  toggle(opt);
                }}
              >
                <span className="col-filter-dropdown-checkbox" aria-hidden="true">
                  {checked ? "☑" : "☐"}
                </span>
                {isEmpty ? (
                  <span className="col-filter-empty-label">(leer)</span>
                ) : (
                  <span>{opt}</span>
                )}
              </label>
            );
          })}
          {sortedOptions.length === 0 && (
            <div className="col-filter-dropdown-empty">—</div>
          )}
        </div>
      )}
    </div>
  );
};
