import { NodeType, TreeNode } from "./tree-node";
import { Canceller } from "./cancel";

const MAX_DEPTH = 32;
const ITERATIONS_PER_YIELD = 100_000;

export class SearchResult {
    value = 0;
    bestChild: TreeNode | null = null;
    outcome = NodeType.INTERMEDIATE;
}

enum StackFrameState {
    ENTERED,
    BEFORE,
    AFTER,
}

class StackFrame {
    node = new TreeNode();
    alpha = 0;
    beta = 0;
    children: TreeNode[] = [];
    value = 0;
    bestChild: TreeNode | null = null;
    outcome = NodeType.INTERMEDIATE;
    i = 0;
    state = StackFrameState.ENTERED;
}

const callStack: StackFrame[] = new Array(MAX_DEPTH).fill(null).map(() => new StackFrame());

async function negamax(depth: number, canceller: Canceller) {
    const startDepth = depth;
    callStack[depth].state = StackFrameState.ENTERED;
    let y = ITERATIONS_PER_YIELD;

    while (depth <= startDepth) {
        if (--y === 0) {
            y = ITERATIONS_PER_YIELD;
            await new Promise(resolve => setTimeout(resolve, 0)); // yield to event thread
            if (canceller.cancelled) {
                break;
            }
        }

        const f = callStack[depth];
        switch (f.state) {
            case StackFrameState.ENTERED:
                if (depth === 0 || f.node.type !== NodeType.INTERMEDIATE) {
                    f.value = -f.node.createPlayer * f.node.heuristicValue;
                    f.outcome = f.node.type;
                    f.bestChild = null;
                    ++depth;
                    continue;
                }

                f.children = f.node.children();
                f.value = -Infinity;
                f.bestChild = null;
                f.outcome = NodeType.INTERMEDIATE;
                f.i = 0;
                f.state = StackFrameState.BEFORE;
                break;
            case StackFrameState.BEFORE: {
                if (f.i === f.children.length) {
                    ++depth;
                    continue;
                }

                const g = callStack[--depth];
                g.node = f.children[f.i++];
                f.state = StackFrameState.AFTER;
                g.state = StackFrameState.ENTERED;
                g.alpha = -f.beta;
                g.beta = -f.alpha;
                break;
            }
            case StackFrameState.AFTER: {
                const g = callStack[depth - 1];
                if (-g.value > f.value) {
                    f.value = -g.value;
                    f.bestChild = g.node;
                    f.outcome = g.outcome;
                }
                f.alpha = Math.max(f.alpha, f.value);
                if (f.alpha >= f.beta) {
                    ++depth;
                    continue;
                }
                f.state = StackFrameState.BEFORE;
                break;
            }
        }
    }
}

export async function search(node: TreeNode, depth: number, canceller: Canceller) {
    const f = callStack[depth];
    f.node = node;
    f.alpha = -Infinity;
    f.beta = Infinity;
    await negamax(depth, canceller);
    const result = new SearchResult();
    result.bestChild = f.bestChild;
    result.value = f.value;
    result.outcome = f.outcome;
    return result;
}