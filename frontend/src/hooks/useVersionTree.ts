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
    if (generations.length > 0) {
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
    const root = generations.find((g) => !g.parentId);
    if (!root) {
      // fallback to the first generation if no clear root
      return { nodes: nodesList, edges: edgesList };
    }

    // Map parentId to children list
    const childrenMap: Record<string, any[]> = {};
    generations.forEach((gen) => {
      if (gen.parentId) {
        if (!childrenMap[gen.parentId]) {
          childrenMap[gen.parentId] = [];
        }
        childrenMap[gen.parentId].push(gen);
      }
    });

    // Recursive positioning function
    function positionNode(node: any, x: number, y: number) {
      nodesList.push({
        id: node.id,
        type: node.id === selectedNodeId ? "active" : (!node.parentId ? "original" : "generated"),
        title: node.title,
        image: node.imageUrl,
        parentId: node.parentId || undefined,
        createdAt: formatTime(node.createdAt) + (node.creativityStrength !== 0 && node.creativityStrength !== undefined ? ` • ${node.creativityStrength}% strength` : ""),
        x,
        y,
        prompt: node.prompt || undefined,
        preset: node.preset || undefined,
        creativityStrength: node.creativityStrength || undefined,
        generationMode: node.generationMode || undefined,
        status: node.status === "completed" ? "Generated" : node.status,
      });

      const children = childrenMap[node.id] || [];
      const count = children.length;
      children.forEach((child, index) => {
        edgesList.push({
          id: `e-${node.id}-${child.id}`,
          source: node.id,
          target: child.id,
        });

        const childX = x + 350;
        // Symmetric vertical spacing centered on parent Y
        const offsetY = count === 1 ? 0 : -((count - 1) * 120) + (index * 240);
        positionNode(child, childX, y + offsetY);
      });
    }

    // Layout tree starting from root at coordinates (400, 350)
    positionNode(root, 400, 350);

    // Add the UI-only "v-placeholder" node under the selected node (if completed)
    let placeholderParentId = root.id;
    if (selectedNodeId && generations.some((g) => g.id === selectedNodeId)) {
      placeholderParentId = selectedNodeId;
    }

    const parentNodeObj = nodesList.find((n) => n.id === placeholderParentId);
    if (parentNodeObj && parentNodeObj.status !== "pending") {
      const pX = parentNodeObj.x! + 350;
      const existingChildren = childrenMap[placeholderParentId] || [];
      const pY = parentNodeObj.y! - (existingChildren.length * 100) + (existingChildren.length * 240);

      nodesList.push({
        id: "v-placeholder",
        type: "placeholder",
        title: "New Variation",
        parentId: placeholderParentId,
        createdAt: `From ${parentNodeObj.title.split(":")[0]} Base`,
        x: pX,
        y: pY,
      });

      edgesList.push({
        id: `e-${placeholderParentId}-placeholder`,
        source: placeholderParentId,
        target: "v-placeholder",
      });
    }

    return { nodes: nodesList, edges: edgesList };
  }, [generations, selectedNodeId]);

  return {
    nodes,
    edges,
    selectedNodeId,
    selectNode,
  };
}
