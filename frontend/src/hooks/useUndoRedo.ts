import { useState, useCallback } from "react";

interface UseUndoRedoReturn<T> {
  undoStack: T[];
  redoStack: T[];
  pushState: (state: T) => void;
  undo: (currentState: T) => T | undefined;
  redo: (currentState: T) => T | undefined;
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
}

/**
 * Generic undo/redo hook.
 * Maintains two stacks — undo (past states) and redo (future states).
 * Pushing a new state clears the redo stack.
 */
export function useUndoRedo<T>(): UseUndoRedoReturn<T> {
  const [undoStack, setUndoStack] = useState<T[]>([]);
  const [redoStack, setRedoStack] = useState<T[]>([]);

  const pushState = useCallback((state: T) => {
    setUndoStack((prev) => [...prev, state]);
    setRedoStack([]); // New action invalidates future states
  }, []);

  const undo = useCallback(
    (currentState: T): T | undefined => {
      if (undoStack.length === 0) return undefined;

      const previousState = undoStack[undoStack.length - 1];
      setUndoStack((prev) => prev.slice(0, -1));
      setRedoStack((prev) => [...prev, currentState]);
      return previousState;
    },
    [undoStack],
  );

  const redo = useCallback(
    (currentState: T): T | undefined => {
      if (redoStack.length === 0) return undefined;

      const nextState = redoStack[redoStack.length - 1];
      setRedoStack((prev) => prev.slice(0, -1));
      setUndoStack((prev) => [...prev, currentState]);
      return nextState;
    },
    [redoStack],
  );

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    undoStack,
    redoStack,
    pushState,
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    clear,
  };
}
