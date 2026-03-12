import { useMemo } from "react";
import { PanOnScrollMode, SelectionMode } from "@xyflow/react";

/**
 * Custom hook to provide Excalidraw-like canvas controls for ReactFlow.
 * This encapsulates panning, zooming, and interactive behaviors to be reusable.
 */
export function useExcalidrawControls() {
  return useMemo(
    () => ({
      panOnScroll: true,
      panOnScrollMode: PanOnScrollMode.Free,
      panOnDrag: [1, 2],
      selectionOnDrag: true,
      selectionMode: SelectionMode.Partial,
      panActivationKeyCode: "Space",
      zoomActivationKeyCode: ["Meta", "Control", "Alt"],
      zoomOnPinch: true,
      zoomOnDoubleClick: false,
      minZoom: 0.1, // Minimum zoom level
      maxZoom: 2,   // Maximum zoom level
    }),
    [],
  );
}
