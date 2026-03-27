import { useRef, useCallback } from "react";
import { Row } from "./Types";

export interface UndoRedo {
  pushState: (rows: Row[]) => void;
  undo: (currentRows: Row[]) => Row[] | null;
  redo: (currentRows: Row[]) => Row[] | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export function useUndoRedo(): UndoRedo {
  const undoStack = useRef<Row[][]>([]);
  const redoStack = useRef<Row[][]>([]);

  const pushState = useCallback((rows: Row[]) => {
    undoStack.current.push(rows.map((r) => ({ ...r })));
    redoStack.current = [];
  }, []);

  const undo = useCallback((currentRows: Row[]): Row[] | null => {
    if (undoStack.current.length === 0) return null;
    // Save current state to redo stack before restoring
    redoStack.current.push(currentRows.map((r) => ({ ...r })));
    const previousState = undoStack.current.pop()!;
    return previousState;
  }, []);

  const redo = useCallback((currentRows: Row[]): Row[] | null => {
    if (redoStack.current.length === 0) return null;
    // Save current state to undo stack before restoring
    undoStack.current.push(currentRows.map((r) => ({ ...r })));
    const state = redoStack.current.pop()!;
    return state;
  }, []);

  const canUndo = useCallback(() => undoStack.current.length > 0, []);
  const canRedo = useCallback(() => redoStack.current.length > 0, []);

  return { pushState, undo, redo, canUndo, canRedo };
}

