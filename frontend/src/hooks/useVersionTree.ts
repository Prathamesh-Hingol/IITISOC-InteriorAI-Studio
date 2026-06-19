import { useState, useCallback } from "react";
import type { VersionNode, VersionEdge } from "../types";

const INITIAL_NODES: VersionNode[] = [
  {
    id: "v1",
    type: "original",
    title: "V1: Minimalist Base",
    image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=400&q=80",
    createdAt: "Today, 9:30 AM",
    x: 400,
    y: 350,
    prompt: "Original room upload",
    preset: "Minimalist",
    creativityStrength: 0,
    generationMode: "restyle",
    status: "Source: V1",
  },
  {
    id: "v2",
    type: "active",
    title: "V2: Scandi Luxury",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=400&q=80",
    parentId: "v1",
    createdAt: "Just now • 2.3s gen",
    x: 750,
    y: 230,
    prompt: "Describe your vision... e.g., 'Make walls beige and replace sofa with a modern curved bouclé piece.'",
    preset: "Scandinavian",
    creativityStrength: 65,
    generationMode: "restyle",
    status: "Generated",
  },
  {
    id: "v-placeholder",
    type: "placeholder",
    title: "New Variation",
    parentId: "v1",
    createdAt: "From V1 Base",
    x: 750,
    y: 470,
  },
];

const INITIAL_EDGES: VersionEdge[] = [
  { id: "e1-2", source: "v1", target: "v2" },
  { id: "e1-placeholder", source: "v1", target: "v-placeholder" },
];

export function useVersionTree() {
  const [nodes, setNodes] = useState<VersionNode[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<VersionEdge[]>(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("v2");

  const selectNode = useCallback((id: string) => {
    // If clicking a placeholder, we might want to keep it selected but not change other nodes
    if (id === "v-placeholder") {
      setSelectedNodeId(id);
      return;
    }

    setSelectedNodeId(id);
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.type === "placeholder") return node;
        if (node.id === id) {
          return { ...node, type: "active" as const };
        } else if (node.type === "active") {
          return { ...node, type: (node.parentId ? "generated" : "original") as "generated" | "original" };
        }
        return node;
      })
    );
  }, []);

  const addVersion = useCallback((
    title: string,
    image: string,
    parentId: string,
    prompt?: string,
    preset?: string,
    strength?: number,
    mode?: "restyle" | "furnish-empty"
  ) => {
    const newId = `v${Date.now()}`;
    
    // Determine positioning based on parent y coordinates or number of children
    const parentNode = nodes.find(n => n.id === parentId);
    const parentX = parentNode?.x || 400;
    const parentY = parentNode?.y || 350;
    
    // Position newly generated node
    const newX = parentX + 350;
    
    // Count existing children of this parent to stagger them vertically
    const existingChildren = nodes.filter(n => n.parentId === parentId);
    const offsetMultiplier = existingChildren.length;
    const newY = parentY - 120 + (offsetMultiplier * 240);

    const newNode: VersionNode = {
      id: newId,
      type: "active",
      title,
      image,
      parentId,
      createdAt: `Just now • ${(Math.random() * 2 + 1).toFixed(1)}s gen`,
      x: newX,
      y: newY,
      prompt,
      preset,
      creativityStrength: strength,
      generationMode: mode,
      status: "Generated",
    };

    const newEdge: VersionEdge = {
      id: `e-${parentId}-${newId}`,
      source: parentId,
      target: newId,
    };

    setNodes((prevNodes) => {
      // 1. Demote any active node to standard generated/original
      const updatedNodes = prevNodes.map((n) => {
        if (n.type === "active") {
          return { ...n, type: (n.parentId ? "generated" : "original") as "generated" | "original" };
        }
        return n;
      });

      // 2. Add the new node
      return [...updatedNodes, newNode];
    });
    setEdges((prevEdges) => [...prevEdges, newEdge]);
    setSelectedNodeId(newId);

    return newId;
  }, [nodes]);

  const removeNode = useCallback((id: string) => {
    if (id === "v1" || id === "v-placeholder") return; // Keep core nodes
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setEdges((prev) => prev.filter((e) => e.source !== id && e.target !== id));
    if (selectedNodeId === id) {
      setSelectedNodeId("v2");
    }
  }, [selectedNodeId]);

  return {
    nodes,
    edges,
    selectedNodeId,
    selectNode,
    addVersion,
    removeNode,
  };
}
