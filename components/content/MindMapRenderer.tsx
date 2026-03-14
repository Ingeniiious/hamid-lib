"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { MindMapContent } from "@/lib/ai/types";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface MindMapRendererProps {
  content: MindMapContent;
}

interface TreeNode {
  id: string;
  label: string;
  edgeLabel?: string;
  children: TreeNode[];
}

/**
 * Build a tree structure from flat nodes + edges.
 * Root = node with no incoming edges.
 * Returns null if cycle detected or no clear root.
 */
function buildTree(
  nodes: MindMapContent["nodes"],
  edges: MindMapContent["edges"],
): TreeNode | null {
  if (nodes.length === 0) return null;

  const nodeMap = new Map<string, MindMapContent["nodes"][number]>();
  for (const n of nodes) nodeMap.set(n.id, n);

  // Track which nodes have incoming edges
  const hasIncoming = new Set<string>();
  const childrenMap = new Map<string, { childId: string; label?: string }[]>();

  for (const edge of edges) {
    hasIncoming.add(edge.target);
    const list = childrenMap.get(edge.source) ?? [];
    list.push({ childId: edge.target, label: edge.label });
    childrenMap.set(edge.source, list);
  }

  // Find root(s) — nodes with no incoming edges
  const roots = nodes.filter((n) => !hasIncoming.has(n.id));
  if (roots.length === 0) return null; // cycle or no clear root

  const root = roots[0];
  const visited = new Set<string>();

  function traverse(
    nodeId: string,
    edgeLabel?: string,
  ): TreeNode | null {
    if (visited.has(nodeId)) return null; // prevent cycles
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return null;

    const childEdges = childrenMap.get(nodeId) ?? [];
    const children: TreeNode[] = [];

    for (const ce of childEdges) {
      const child = traverse(ce.childId, ce.label);
      if (child) children.push(child);
    }

    return {
      id: node.id,
      label: node.data.label,
      edgeLabel,
      children,
    };
  }

  return traverse(root.id);
}

function TreeBranch({
  node,
  depth,
  index,
}: {
  node: TreeNode;
  depth: number;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease, delay: (depth * 0.1) + (index * 0.03) }}
      className="flex flex-col items-center"
    >
      {/* Edge label connector */}
      {node.edgeLabel && (
        <span className="mb-1 text-[10px] font-medium text-gray-900/40 dark:text-white/40">
          {node.edgeLabel}
        </span>
      )}

      {/* Vertical connector line */}
      {depth > 0 && (
        <div className="h-4 w-px bg-gray-900/15 dark:bg-white/15" />
      )}

      {/* Node pill */}
      <span
        className={`inline-block rounded-full px-4 py-1.5 text-center text-sm font-medium transition-all ${
          depth === 0
            ? "bg-[#5227FF] text-white"
            : "border border-gray-900/10 bg-white/50 text-gray-900 backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:text-white"
        }`}
      >
        {node.label}
      </span>

      {/* Children */}
      {node.children.length > 0 && (
        <>
          {/* Vertical connector to children */}
          <div className="h-4 w-px bg-gray-900/15 dark:bg-white/15" />

          {/* Horizontal spread for multiple children */}
          {node.children.length > 1 && (
            <div
              className="h-px bg-gray-900/15 dark:bg-white/15"
              style={{
                width: `${Math.min(node.children.length * 120, 600)}px`,
                maxWidth: "100%",
              }}
            />
          )}

          <div className="flex flex-wrap items-start justify-center gap-4">
            {node.children.map((child, ci) => (
              <TreeBranch
                key={child.id}
                node={child}
                depth={depth + 1}
                index={ci}
              />
            ))}
          </div>
        </>
      )}
    </motion.div>
  );
}

export function MindMapRenderer({ content }: MindMapRendererProps) {
  const nodes = content.nodes ?? [];
  const edges = content.edges ?? [];

  const tree = useMemo(() => buildTree(nodes, edges), [nodes, edges]);

  if (nodes.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-900/10 bg-white/50 px-12 py-16 text-center backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <p className="text-sm text-gray-900/50 dark:text-white/50">
          No Mind Map Available
        </p>
      </div>
    );
  }

  // Fallback: flat list when tree can't be resolved
  if (!tree) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Flat node list */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {nodes.map((node, idx) => (
            <motion.span
              key={node.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease, delay: idx * 0.03 }}
              className="rounded-full border border-gray-900/10 bg-white/50 px-4 py-1.5 text-center text-sm font-medium text-gray-900 backdrop-blur-xl dark:border-white/15 dark:bg-white/10 dark:text-white"
            >
              {node.data.label}
            </motion.span>
          ))}
        </div>

        {/* Edge list */}
        {edges.length > 0 && (
          <div className="space-y-2">
            <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-gray-900/40 dark:text-white/40">
              Connections
            </p>
            {edges.map((edge, idx) => {
              const sourceNode = nodes.find((n) => n.id === edge.source);
              const targetNode = nodes.find((n) => n.id === edge.target);
              return (
                <motion.div
                  key={edge.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, ease, delay: idx * 0.03 }}
                  className="flex items-center justify-center gap-2 text-center"
                >
                  <span className="rounded-full bg-gray-900/5 px-3 py-1 text-xs text-gray-900/70 dark:bg-white/5 dark:text-white/70">
                    {sourceNode?.data.label ?? edge.source}
                  </span>
                  <span className="text-xs text-gray-900/30 dark:text-white/30">
                    {edge.label ? `-- ${edge.label} --` : "--"}
                  </span>
                  <span className="rounded-full bg-gray-900/5 px-3 py-1 text-xs text-gray-900/70 dark:bg-white/5 dark:text-white/70">
                    {targetNode?.data.label ?? edge.target}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Tree view
  return (
    <div className="mx-auto max-w-3xl">
      <div className="overflow-x-auto rounded-2xl border border-gray-900/10 bg-white/50 p-6 backdrop-blur-xl dark:border-white/15 dark:bg-white/10">
        <div className="flex min-w-fit justify-center">
          <TreeBranch node={tree} depth={0} index={0} />
        </div>
      </div>
    </div>
  );
}
