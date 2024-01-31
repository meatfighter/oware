import { onHamburgerClicked } from "./app";
import { CreateOperation, NodeType, Player, TreeNode } from "./tree-node";
import { Board, BoardStatus, House, Render } from "./board";
import { Mover } from "./mover";
import { startAnimation, stopAnimation } from "./animate";
import { RemainderCapturer } from "./remainder-capturer";
import { Thinker } from "./thinker.js";
import { CancelAllRequest, Message, MessageType, SearchManyRequest, SearchNarrowRequest, SearchResponse }
        from "./worker";
import { Updatable } from "./updatable";

enum GameState {
    WAITING_FOR_HUMAN,
    HUMAN_SOWING,
    WAITING_FOR_AI,
    AI_SOWING,
    CAPTURING_REMAINDER,
    GAME_OVER,
}

const board = new Board();
const updaters: Updatable[] = [];
let thinker: Thinker | null;
let gameState = GameState.WAITING_FOR_HUMAN;
let node = new TreeNode();
let capturers = 0;
let depth = 0;

let searchManyRequest: SearchManyRequest | null = null;
let searchNarrowRequest: SearchNarrowRequest | null = null;
let searchResponse: SearchResponse | null = null;

const worker = new Worker('scripts/worker.bundle.js');
worker.onmessage = (e: MessageEvent<Message>) => {
    const message = e.data;
    if (message.type === MessageType.SEARCH_RESPONSE) {
        onSearchResponse(message as SearchResponse);
    }
};

let canvas: HTMLCanvasElement | null;
let ctx: CanvasRenderingContext2D | null;

export function reset(firstPlayer: Player, searchDepth: number) {
    node = new TreeNode();
    board.reset();

    updaters.length = 0;
    thinker = null;
    capturers = 0;
    depth = searchDepth;
    searchManyRequest = null;
    searchNarrowRequest = null;
    searchResponse = null;
    render();

    sendCancelAllRequest();
    stopAnimation();

    if (firstPlayer === Player.A) {
        node.createPlayer = Player.B;
        gameState = GameState.WAITING_FOR_HUMAN;
        sendSearchManyRequest();
    } else {
        node.createPlayer = Player.A;
        gameState = GameState.WAITING_FOR_AI;
        sendSearchFirstRequest();
        startThinking();
    }
}

export function enter() {
    const mainElement = document.getElementById("main-content") as HTMLElement;
    mainElement.innerHTML = '<canvas id="oware-canvas" class="canvas" width="1" height="1"></canvas>';
    canvas = document.getElementById("oware-canvas") as HTMLCanvasElement | null;
    if (!canvas) {
        return;
    }
    canvas.addEventListener('click', e => {
        if (!canvas) {
            return;
        }
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (canvas.width >= canvas.height) {
            canvasClicked(Render.WIDTH * x / (canvas.width - 1), Render.HEIGHT * y / (canvas.height - 1));
        } else {
            canvasClicked(Render.WIDTH * (1 - y / (canvas.height - 1)), Render.HEIGHT * x / (canvas.width - 1));
        }
    });
    windowResized();
}

function removeUpdater(updater: Updatable | null) {
    if (updater) {
        const index = updaters.findIndex(e => e === updater);
        if (index > -1) {
            updaters.splice(index, 1);
        }
    }
}

export function update() {
    if (board.updateFades() && updaters.length === 0) {
        stopAnimation();
    }
    for (let i = 0; i < updaters.length; ++i) {
        updaters[i].update();
    }
}

export function render() {
    if (!ctx) {
        windowResized();
        return;
    }
    board.render(ctx);
}

export function windowResized() {

    ctx = null;
    canvas = document.getElementById("oware-canvas") as HTMLCanvasElement | null;
    if (!canvas) {
        return;
    }
    canvas.width = canvas.height = 1;

    const dpr = window.devicePixelRatio || 1;
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;

    let width = Render.WIDTH;
    let height = Render.HEIGHT;
    const transform = new DOMMatrix();

    if (innerWidth >= innerHeight) {
        let scale = 1;
        if (innerWidth < Render.WIDTH) {
            width = innerWidth;
            scale = width / Render.WIDTH;
            height = scale * Render.HEIGHT;
        }
        if (innerHeight < height) {
            height = innerHeight;
            scale = height / Render.HEIGHT;
            width = scale * Render.WIDTH;
        }
        transform.a = transform.d = scale;
        transform.b = transform.c = transform.e = transform.f = 0;
    } else {
        let scale = 1;
        if (innerHeight < Render.WIDTH) {
            width = innerHeight as number;
            scale = width / Render.WIDTH;
            height = scale * Render.HEIGHT;
        }
        if (innerWidth < height) {
            height = innerWidth as number;
            scale = height / Render.HEIGHT;
            width = scale * Render.WIDTH;
        }
        transform.a = transform.d = transform.e = 0;
        transform.b = -scale;
        transform.c = scale;
        transform.f = width;
        let t = width;
        width = height as number;
        height = t;
    }

    canvas.width = Math.floor(width);
    canvas.height = Math.floor(height);

    ctx = canvas.getContext('2d');
    if (!ctx) {
        return;
    }
    ctx.setTransform(transform);

    canvas.style.left = `${(innerWidth - width) / 2}px`
    canvas.style.top = `${(innerHeight - height) / 2}px`;

    board.render(ctx);
}

function startThinking() {
    thinker = new Thinker(board);
    updaters.push(thinker);
    thinker.thinkingDoneCallback = () => removeUpdater(thinker);
    startAnimation();
}

function stopThinking() {
    if (thinker) {
        thinker.stop();
        thinker = null;
    }
}

function remainderCaptured() {
    if (--capturers === 0) {
        updateBoardStatus();
        gameState = GameState.GAME_OVER;
    }
}

export function sendCancelAllRequest() {
    worker.postMessage(new CancelAllRequest());
}

function sendSearchFirstRequest() {
    searchManyRequest = new SearchManyRequest(0, [ node ], depth);
    searchNarrowRequest = new SearchNarrowRequest(0, 0);
    searchResponse = null;
    worker.postMessage(searchManyRequest);
}

function sendSearchManyRequest() {
    const requestID = (searchManyRequest === null) ? 0 : (searchManyRequest.requestID + 1);
    const children = node.children();
    for (let i = children.length - 1; i >= 0; --i) { // parent chain will be cloned and shared from first child
        if (i > 0) {
            children[i].parent = null;
        }
    }
    searchManyRequest = new SearchManyRequest(requestID, children, depth);
    searchNarrowRequest = null;
    searchResponse = null;
    worker.postMessage(searchManyRequest);
}

function sendSearchNarrowRequest(nodeIndex: number) {
    if (searchManyRequest === null) {
        return;
    }
    searchNarrowRequest = new SearchNarrowRequest(searchManyRequest.requestID, nodeIndex);
    if (searchResponse === null) {
        worker.postMessage(searchNarrowRequest);
    } else {
        handleSearchResponse();
    }
}

function onSearchResponse(response: SearchResponse) {
    if (searchManyRequest === null || searchManyRequest.requestID !== response.requestID) {
        return;
    }
    searchResponse = response;
    handleSearchResponse();
}

function handleSearchResponse() {
    if (gameState !== GameState.WAITING_FOR_AI) {
        return;
    }
    if (searchManyRequest === null || searchNarrowRequest === null || searchResponse === null) {
        return;
    }
    if (searchManyRequest.requestID !== searchNarrowRequest.requestID
            || searchManyRequest.requestID !== searchResponse.requestID) {
        return;
    }
    const result = searchResponse.results[searchNarrowRequest.nodeIndex];
    if (!result) {
        return;
    }

    stopThinking();

    switch (result.outcome) {
        case NodeType.DRAW:
            board.status = BoardStatus.DRAW_FAVORED;
            break;
        case NodeType.A_WON:
            board.status = BoardStatus.A_FAVORED;
            break;
        case NodeType.B_WON:
            board.status = BoardStatus.B_FAVORED;
            break;
    }
    render();

    const bestChild = new TreeNode(result.bestChild as TreeNode);
    bestChild.parent = node;
    node = bestChild;
    if (node.createSownHouse >= 0) {
        gameState = GameState.AI_SOWING;
        const mover = new Mover(board, Player.B, node.createSownHouse, node.createCaptured, aiSowCompleted, false);
        mover.updatesDoneCallback = () => removeUpdater(mover);
        updaters.push(mover);
        startAnimation();
    } else {
        captureRemainder();
    }
}

function captureRemainder() {
    gameState = GameState.CAPTURING_REMAINDER;
    capturers = 2;

    const aRemainderCapturer = new RemainderCapturer(board, Player.A, remainderCaptured);
    updaters.push(aRemainderCapturer);
    aRemainderCapturer.updatesDoneCallback = () => removeUpdater(aRemainderCapturer);

    const bRemainderCapturer = new RemainderCapturer(board, Player.B, remainderCaptured);
    updaters.push(bRemainderCapturer);
    bRemainderCapturer.updatesDoneCallback = () => removeUpdater(bRemainderCapturer);

    startAnimation();
}

function aiSowCompleted() {
    if (node.type !== NodeType.INTERMEDIATE) {
        if (node.createOperation === CreateOperation.CAPTURED_REMAINDER) {
            captureRemainder();
        } else {
            updateBoardStatus();
            gameState = GameState.GAME_OVER;
        }
    } else {
        const children = node.children();
        if (children.length === 1 && children[0].createOperation === CreateOperation.CAPTURED_REMAINDER
                && children[0].createSownHouse < 0) {
            node = children[0];
            captureRemainder();
        } else {
            gameState = GameState.WAITING_FOR_HUMAN;
            sendSearchManyRequest();
        }
    }
}

function updateBoardStatus() {
    switch (node.type) {
        case NodeType.DRAW:
            board.status = BoardStatus.DRAW;
            break;
        case NodeType.A_WON:
            board.status = BoardStatus.A_WON;
            break;
        case NodeType.B_WON:
            board.status = BoardStatus.B_WON;
            break;
    }
    render();
}

async function humanSowCompleted() {
    updateBoardStatus();

    if (node.type !== NodeType.INTERMEDIATE) {
        if (node.createOperation === CreateOperation.CAPTURED_REMAINDER) {
            captureRemainder();
        } else {
            updateBoardStatus();
            gameState = GameState.GAME_OVER;
        }
        return;
    }

    gameState = GameState.WAITING_FOR_AI;
    startThinking();
    handleSearchResponse();
}

function houseClicked(house: number) {
    if (gameState !== GameState.WAITING_FOR_HUMAN || searchManyRequest === null) {
        return;
    }
    const children = searchManyRequest.nodes;
    let nodeIndex = 0;
    outer: {
        for (let i = children.length - 1; i >= 0; --i) {
            if (children[i].createSownHouse === house) {
                nodeIndex = i;
                break outer;
            }
        }
        return;
    }
    gameState = GameState.HUMAN_SOWING;
    node = children[nodeIndex];
    if (node.type === NodeType.INTERMEDIATE) {
        sendSearchNarrowRequest(nodeIndex);
    } else {
        sendCancelAllRequest();
    }
    const mover = new Mover(board, Player.A, house, node.createCaptured, humanSowCompleted, true);
    mover.updatesDoneCallback = () => removeUpdater(mover);
    updaters.push(mover);
    startAnimation();
}

function canvasClicked(x: number, y: number) {
    if (x < House.SIZE + House.PADDING / 2) {
        if (y < (House.SIZE + House.PADDING) / 2) {
            onHamburgerClicked(gameState === GameState.GAME_OVER);
        }
    } else if (y >= House.SIZE + House.PADDING / 2) {
        const house = Math.floor((x - (House.SIZE + House.PADDING / 2)) / (House.SIZE + House.PADDING));
        if (house < 0 || house > 5) {
            return;
        }
        houseClicked(house);
    }
}

