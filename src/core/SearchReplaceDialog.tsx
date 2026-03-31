import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { useStopMousedownPropagation } from "./useStopMousedownPropagation";

export interface SearchReplaceProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Callback to close the dialog. */
  onClose: () => void;
  /**
   * Called to execute the replacement.
   * Returns the number of replacements made.
   */
  onReplace: (params: {
    search: string;
    replace: string;
    scope: "all" | "selection";
    matchCase: boolean;
    useRegex: boolean;
  }) => number;
}

export const SearchReplaceDialog: React.FC<SearchReplaceProps> = ({
  open,
  onClose,
  onReplace,
}) => {
  const [search, setSearch] = useState("");
  const [replace, setReplace] = useState("");
  const [scope, setScope] = useState<"all" | "selection">("all");
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setResult(null);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  useStopMousedownPropagation(overlayRef, open);

  const handleReplace = useCallback(() => {
    if (!search) return;
    try {
      const count = onReplace({ search, replace, scope, matchCase, useRegex });
      setResult(`${count} replacement${count !== 1 ? "s" : ""} made`);
    } catch (e: any) {
      setResult(`Error: ${e.message}`);
    }
  }, [search, replace, scope, matchCase, useRegex, onReplace]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleReplace();
    }
    e.stopPropagation();
  };

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      ref={overlayRef}
      className="search-replace-overlay"
      onMouseDown={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="search-replace-dialog" onKeyDown={handleKeyDown}>
        <div className="search-replace-header">
          <span className="search-replace-title">Search & Replace</span>
          <button className="search-replace-close" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        <div className="search-replace-body">
          <label className="search-replace-field">
            <span>Search:</span>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setResult(null); }}
              placeholder="Find text..."
              autoComplete="off"
            />
          </label>

          <label className="search-replace-field">
            <span>Replace:</span>
            <input
              type="text"
              value={replace}
              onChange={(e) => { setReplace(e.target.value); setResult(null); }}
              placeholder="Replace with..."
              autoComplete="off"
            />
          </label>

          <div className="search-replace-options">
            <label>
              <input
                type="radio"
                name="scope"
                checked={scope === "all"}
                onChange={() => setScope("all")}
              />
              Entire dataset
            </label>
            <label>
              <input
                type="radio"
                name="scope"
                checked={scope === "selection"}
                onChange={() => setScope("selection")}
              />
              Selection only
            </label>
            <label>
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(e) => setMatchCase(e.target.checked)}
              />
              Match case
            </label>
            <label>
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
              />
              Regex
            </label>
          </div>
        </div>

        <div className="search-replace-footer">
          {result && <span className="search-replace-result">{result}</span>}
          <button
            className="search-replace-btn search-replace-btn-primary"
            onClick={handleReplace}
            disabled={!search}
          >
            Replace All
          </button>
          <button className="search-replace-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
