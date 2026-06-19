import type { Parent, Text } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

// Matches `[1]`, `[Source 1]`, `[source1]`, `[SOURCE  12]`, etc.
export const CITATION_REF_RE = /\[(?:source\s*)?(\d+)\]/gi;

/**
 * Splits text nodes on citation references and replaces each reference with a
 * `citation-ref` element node, so react-markdown can render it inline via the
 * `components` map while the surrounding paragraph/list structure stays intact.
 */
export const remarkCitations: Plugin = () => (tree) => {
  visit(tree, "text", (node: Text, index, parent: Parent | undefined) => {
    if (!parent || index == null) return;

    const matches = [...node.value.matchAll(CITATION_REF_RE)];
    if (matches.length === 0) return;

    const newNodes: Array<Text | Record<string, unknown>> = [];
    let lastIndex = 0;

    for (const match of matches) {
      const start = match.index ?? 0;
      if (start > lastIndex) {
        newNodes.push({ type: "text", value: node.value.slice(lastIndex, start) });
      }

      const citationIndex = Number.parseInt(match[1] ?? "", 10);
      if (Number.isFinite(citationIndex)) {
        newNodes.push({
          type: "citationRef",
          data: {
            hName: "citation-ref",
            hProperties: { index: citationIndex },
          },
        });
      } else {
        newNodes.push({ type: "text", value: match[0] });
      }

      lastIndex = start + match[0].length;
    }

    if (lastIndex < node.value.length) {
      newNodes.push({ type: "text", value: node.value.slice(lastIndex) });
    }

    parent.children.splice(index, 1, ...(newNodes as never[]));
  });
};
