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
    undoStack.current.push([...rows]);
    redoStack.current = [];
  }, []);

  const undo = useCallback((currentRows: Row[]): Row[] | null => {
    if (undoStack.current.length === 0) return null;
    redoStack.current.push([...currentRows]);
    const previousState = undoStack.current.pop()!;
    return previousState;
  }, []);

  const redo = useCallback((currentRows: Row[]): Row[] | null => {
    if (redoStack.current.length === 0) return null;
    undoStack.current.push([...currentRows]);
    const state = redoStack.current.pop()!;
    return state;
  }, []);

  const canUndo = useCallback(() => undoStack.current.length > 0, []);
  const canRedo = useCallback(() => redoStack.current.length > 0, []);

  return { pushState, undo, redo, canUndo, canRedo };
}
