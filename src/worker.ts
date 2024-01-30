import { TreeNode } from "./tree-node";
import { Canceller } from "./cancel";
import { search, SearchResult } from "./ai";

export enum MessageType {
    SEARCH_MANY,
    SEARCH_NARROW,
    SEARCH_RESPONSE,
    CANCEL_ALL,
}

export interface Message {
    readonly type: MessageType;
}

export class SearchManyRequest {
    readonly type = MessageType.SEARCH_MANY;
    readonly requestID: number;
    readonly nodes: TreeNode[];
    readonly depth: number;

    constructor(requestID: number, nodes: TreeNode[], depth: number) {
        this.requestID = requestID;
        this.nodes = nodes;
        this.depth = depth;
    }
}

export class SearchNarrowRequest {
    readonly type = MessageType.SEARCH_NARROW;
    readonly requestID: number;
    readonly nodeIndex: number;

    constructor(requestID: number, nodeIndex: number) {
        this.nodeIndex = nodeIndex;
        this.requestID = requestID;
    }
}

export class CancelAllRequest {
    readonly type = MessageType.CANCEL_ALL;
}

export class SearchResponse {
    readonly type = MessageType.SEARCH_RESPONSE;
    readonly results: (SearchResult | null)[];
    readonly requestID: number;

    constructor(results: (SearchResult | null)[], requestID: number) {
        this.results = results;
        this.requestID = requestID;
    }
}

class QueueElement {
    readonly searchManyRequest: SearchManyRequest;
    readonly canceller = new Canceller();
    readonly cancelled: boolean[];
    readonly results: (SearchResult | null)[];
    nodeIndex = 0;

    constructor(searchManyRequest: SearchManyRequest) {
        this.searchManyRequest = searchManyRequest;
        this.cancelled = new Array(searchManyRequest.nodes.length).fill(false);
        this.results = new Array(searchManyRequest.nodes.length).fill(null);
    }
}

const queue: QueueElement[] = [];
let processingQueue = false;

onmessage = async (e: MessageEvent<Message>) => {
    const message = e.data;
    switch (message.type) {
        case MessageType.SEARCH_MANY:
            await onSearchMany(message as SearchManyRequest);
            break;
        case MessageType.SEARCH_NARROW:
            onSearchNarrow(message as SearchNarrowRequest);
            break;
        case MessageType.CANCEL_ALL:
            onCancelAll();
            break;
    }
};

async function onSearchMany(searchManyRequest: SearchManyRequest) {
    cloneNodes(searchManyRequest.nodes);
    queue.push(new QueueElement(searchManyRequest));
    if (processingQueue) {
        return;
    }

    // search() occasionally yields to the event thread, enabling this method to be invoked mid-queue processing.
    processingQueue = true;
    while (queue.length > 0) {
        const element = queue[0];
        if (element.nodeIndex < element.searchManyRequest.nodes.length) {
            element.canceller.cancelled = false;
            if (element.cancelled[element.nodeIndex]) {
                element.results[element.nodeIndex] = null;
            } else {
                const result = await search(element.searchManyRequest.nodes[element.nodeIndex],
                        element.searchManyRequest.depth, element.canceller);
                if (result && result.bestChild && !element.cancelled[element.nodeIndex]) {
                    result.bestChild.parent = null;
                    element.results[element.nodeIndex] = result;
                } else {
                    element.results[element.nodeIndex] = null;
                }
            }
            ++element.nodeIndex;
        } else {
            queue.shift();
            for (let cancel of element.cancelled) {
                if (!cancel) {
                    postMessage(new SearchResponse(element.results, element.searchManyRequest.requestID));
                    break;
                }
            }
        }
    }
    processingQueue = false;
}

function cloneNodes(nodes: TreeNode[]) {
    if (nodes.length === 0) {
        return;
    }
    let parents = cloneParentChain(nodes[0]);
    for (let i = nodes.length - 1; i >= 0; --i) {
        nodes[i] = new TreeNode(nodes[i]);
        nodes[i].parent = parents;
    }
}

function cloneParentChain(node: TreeNode) {
    let result: TreeNode | null = null;
    let p: TreeNode | null = null;

    while (node.parent !== null) {
        node = node.parent;
        if (p === null) {
            p = result = new TreeNode(node);
            p.parent = null;
        } else {
            const q = new TreeNode(node);
            q.parent = null;
            p.parent = q;
            p = q;
        }
    }

    return result;
}

function onSearchNarrow(searchNarrowRequest: SearchNarrowRequest) {
    for (let element of queue) {
        if (element.searchManyRequest.requestID === searchNarrowRequest.requestID) {
            if (element.nodeIndex !== searchNarrowRequest.nodeIndex) {
                element.canceller.cancelled = true;
            }
            for (let i = element.cancelled.length - 1; i >= 0; --i) {
                element.cancelled[i] = (i !== searchNarrowRequest.nodeIndex);
            }
        }
    }
}

function onCancelAll() {
    for (let element of queue) {
        element.canceller.cancelled = true;
        for (let i = element.cancelled.length - 1; i >= 0; --i) {
            element.cancelled[i] = true;
        }
    }
}

