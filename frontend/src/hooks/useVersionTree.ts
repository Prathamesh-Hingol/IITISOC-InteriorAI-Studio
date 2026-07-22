import { useState, useEffect, useMemo, useCallback } from "react";
import type { VersionNode, VersionEdge } from "../types";

// Helper: Format Dates to human readable strings
function formatTime(dateInput: Date | string): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function useVersionTree(generations: any[]) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Automatically select the active or base node when generations first load
  useEffect(() => {
    if (generations && generations.length > 0) {
      const exists = generations.some((g) => g.id === selectedNodeId);
      if (!selectedNodeId || !exists) {
        // Find root node (parentId is null/undefined)
        const root = generations.find((g) => !g.parentId);
        if (root) {
          setSelectedNodeId(root.id);
        } else {
          setSelectedNodeId(generations[0].id);
        }
      }
    } else {
      setSelectedNodeId(null);
    }
  }, [generations, selectedNodeId]);

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
  }, []);

  const { nodes, edges } = useMemo(() => {
    const nodesList: VersionNode[] = [];
    const edgesList: VersionEdge[] = [];

    if (!generations || generations.length === 0) {
      return { nodes: nodesList, edges: edgesList };
    }

    // Locate the root node
    const root = generations.find((g) => !g.parentId) || generations[0];

    // Map parentId to children list for generation objects
    const childrenMap: Record<string, any[]> = {};
    generations.forEach((gen) => {
      if (gen.parentId) {
        if (!childrenMap[gen.parentId]) {
          childrenMap[gen.parentId] = [];
        }
        childrenMap[gen.parentId].push(gen);
      }
    });

    // Check if placeholder node ("New Variation") should be added under selected node
    let placeholderParentId = root.id;
    if (selectedNodeId && generations.some((g) => g.id === selectedNodeId)) {
      placeholderParentId = selectedNodeId;
    }
    const selectedGen = generations.find((g) => g.id === placeholderParentId);
    const hasPlaceholder = selectedGen && selectedGen.status === "completed";

    const placeholderNode: VersionNode = {
      id: "v-placeholder",
      type: "placeholder",
      title: "New Variation",
      parentId: placeholderParentId,
      createdAt: `From ${selectedGen?.title?.split(":")[0] || "Base"} Base`,
    };

    // Build unified map of node metadata
    const nodeDataMap = new Map<string, VersionNode>();
    generations.forEach((gen) => {
      nodeDataMap.set(gen.id, {
        id: gen.id,
        type: gen.id === selectedNodeId ? "active" : (!gen.parentId ? "original" : "generated"),
        title: gen.title,
        image: gen.imageUrl,
        parentId: gen.parentId || undefined,
        createdAt: formatTime(gen.createdAt) + (gen.creativityStrength !== 0 && gen.creativityStrength !== undefined ? ` • ${gen.creativityStrength}% strength` : ""),
        prompt: gen.prompt || undefined,
        preset: gen.preset || undefined,
        creativityStrength: gen.creativityStrength || undefined,
        generationMode: gen.generationMode || undefined,
        status: gen.status,
      });
    });

    if (hasPlaceholder) {
      nodeDataMap.set(placeholderNode.id, placeholderNode);
    }

    // Build unified children ID list mapping (including placeholder if active)
    const fullChildrenMap = new Map<string, string[]>();
    generations.forEach((gen) => {
      const childIds = (childrenMap[gen.id] || []).map((c) => c.id);
      fullChildrenMap.set(gen.id, childIds);
    });

    if (hasPlaceholder) {
      const parentChildren = fullChildrenMap.get(placeholderParentId) || [];
      fullChildrenMap.set(placeholderParentId, [...parentChildren, placeholderNode.id]);
    }

    // ── Post-Order Leaf-Spacing Tree Layout Algorithm ──
    const X_STEP = 350;      // Horizontal spacing between depth columns
    const ROW_HEIGHT = 195;  // Vertical clearance per leaf node (card height 140 + ~55px gap)
    const TARGET_ROOT_X = 400;
    const TARGET_ROOT_Y = 350;

    let currentY = 0;
    const nodeCoords = new Map<string, { x: number; y: number }>();

    function calculateSubtreeLayout(nodeId: string, depth: number): number {
      const x = TARGET_ROOT_X + depth * X_STEP;
      const childrenIds = fullChildrenMap.get(nodeId) || [];

      if (childrenIds.length === 0) {
        // Leaf node: allocate next vertical slot
        const y = currentY;
        currentY += ROW_HEIGHT;
        nodeCoords.set(nodeId, { x, y });
        return y;
      }

      // Internal node: process children first, then center parent between them
      const childYs: number[] = [];
      childrenIds.forEach((childId) => {
        edgesList.push({
          id: `e-${nodeId}-${childId}`,
          source: nodeId,
          target: childId,
        });

        const childY = calculateSubtreeLayout(childId, depth + 1);
        childYs.push(childY);
      });

      const firstChildY = childYs[0];
      const lastChildY = childYs[childYs.length - 1];
      const y = (firstChildY + lastChildY) / 2;

      nodeCoords.set(nodeId, { x, y });
      return y;
    }

    // Compute raw tree layout starting from root
    calculateSubtreeLayout(root.id, 0);

    // Shift entire tree vertically so root sits at TARGET_ROOT_Y
    const rootCoord = nodeCoords.get(root.id);
    const yShift = rootCoord ? TARGET_ROOT_Y - rootCoord.y : 0;

    // Assemble final nodes list with shifted coordinates
    nodeDataMap.forEach((nodeObj, id) => {
      const coord = nodeCoords.get(id);
      if (coord) {
        nodesList.push({
          ...nodeObj,
          x: coord.x,
          y: coord.y + yShift,
        });
      }
    });

    return { nodes: nodesList, edges: edgesList };
  }, [generations, selectedNodeId]);

  return {
    nodes,
    edges,
    selectedNodeId,
    selectNode,
  };
}
