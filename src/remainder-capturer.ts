import { MILLIS_PER_FRAME } from "./animate";
import { Player } from "./tree-node";
import { Updatable } from "./updatable";
import { NoParamVoidFunc } from "./no-param-void-func";
import {
    Board,
    HouseState,
    FRAMES_PER_FADE,
    BROWN_TO_CYAN_GRADIENT,
    BROWN_TO_MAGENTA_GRADIENT,
    CYAN_TO_LIGHT_CYAN_GRADIENT,
    MAGENTA_TO_LIGHT_MAGENTA_GRADIENT
} from "./board";

const CAPTURES_PER_SECOND = 10;

const FRAMES_PER_CAPTURE = (1000 / CAPTURES_PER_SECOND) / MILLIS_PER_FRAME;

enum RemainderCapturerState {
    WAITING_FOR_FADE,
    CAPTURING,
    WAITING_FOR_CAPTURE_FADE,
    WAITING_FOR_CLEAR_FADE,
    FINISHED_CLEAR_FADE,
    DONE,
}

export class RemainderCapturer implements Updatable {

    private readonly board: Board;
    private readonly player: Player;
    private timer: number;
    private scoreHouseState: HouseState;
    private currentHouse: number;
    private state: RemainderCapturerState;
    private capturesDone: NoParamVoidFunc | null;
    private updatesDone: NoParamVoidFunc | null;

    constructor(board: Board, player: Player, capturesDoneCallback: NoParamVoidFunc) {
        this.board = board;
        this.player = player;
        this.timer = FRAMES_PER_FADE;
        this.scoreHouseState = board.houseStates[(player === Player.A) ? 12 : 13];
        this.capturesDone = capturesDoneCallback;
        this.updatesDone = null;

        this.currentHouse = (player === Player.A) ? 0 : 6;
        while (true) {
            if (this.currentHouse > ((this.player === Player.A) ? 5 : 11)) {
                this.state = RemainderCapturerState.FINISHED_CLEAR_FADE;
                break;
            }
            if (this.board.houseStates[this.currentHouse].seeds > 0) {
                this.state = RemainderCapturerState.CAPTURING;
                break;
            }
            ++this.currentHouse;
        }
    }

    set updatesDoneCallback(value: NoParamVoidFunc) {
        this.updatesDone = value;
    }

    update() {
        switch (this.state) {
            case RemainderCapturerState.CAPTURING:
                this.updateCapture();
                break;
            case RemainderCapturerState.WAITING_FOR_CAPTURE_FADE:
                this.updateWaitingForCaptureFade();
                break;
            case RemainderCapturerState.WAITING_FOR_CLEAR_FADE:
                this.updateWaitingForClearFade();
                break;
            case RemainderCapturerState.FINISHED_CLEAR_FADE:
                this.updateFinishedClearFade();
                break;
        }
    }

    updateCapture() {
        if (this.timer > 0) {
            --this.timer;
            return;
        }

        const houseState = this.board.houseStates[this.currentHouse];
        this.scoreHouseState.seeds += houseState.seeds;
        houseState.seeds = 0;
        this.scoreHouseState.gradient = houseState.gradient = (this.player === Player.A)
                ? CYAN_TO_LIGHT_CYAN_GRADIENT : MAGENTA_TO_LIGHT_MAGENTA_GRADIENT;
        this.scoreHouseState.gradientFrac = houseState.gradientFrac = 1;
        this.scoreHouseState.updater = houseState.updater = this;

        while (true) {
            if (this.currentHouse > ((this.player === Player.A) ? 5 : 11)) {
                this.state = RemainderCapturerState.WAITING_FOR_CAPTURE_FADE;
                return;
            }
            if (this.board.houseStates[this.currentHouse].seeds > 0) {
                break;
            }
            ++this.currentHouse;
        }

        this.timer = FRAMES_PER_CAPTURE;
    }

    private updateWaitingForCaptureFade() {
        if (this.capturesDone) {
            this.capturesDone();
            this.capturesDone = null;
        }
        if (this.isFadeCompleted()) {
            for (let i = 13; i >= 0; --i) {
                const houseState = this.board.houseStates[i];
                if (houseState.updater === this) {
                    if (houseState.gradient === CYAN_TO_LIGHT_CYAN_GRADIENT) {
                        houseState.gradient = BROWN_TO_CYAN_GRADIENT;
                        houseState.gradientFrac = 1;
                    } else if (houseState.gradient === MAGENTA_TO_LIGHT_MAGENTA_GRADIENT) {
                        houseState.gradient = BROWN_TO_MAGENTA_GRADIENT;
                        houseState.gradientFrac = 1;
                    }
                }
            }
            this.state = RemainderCapturerState.WAITING_FOR_CLEAR_FADE;
        }
    }

    private isFadeCompleted() {
        for (let i = 13; i >= 0; --i) {
            const houseState = this.board.houseStates[i];
            if (houseState.updater === this && houseState.gradientFrac > 0) {
                return false;
            }
        }
        return true;
    }

    private updateWaitingForClearFade() {
        if (this.isFadeCompleted()) {
            this.state = RemainderCapturerState.FINISHED_CLEAR_FADE; // ensures final frame of fade is rendered
        }
    }

    private updateFinishedClearFade() {
        for (let i = 13; i >= 0; --i) {
            const houseState = this.board.houseStates[i];
            if (houseState.updater === this) {
                houseState.updater = null;
            }
        }
        if (this.capturesDone) {
            this.capturesDone();
            this.capturesDone = null;
        }
        if (this.updatesDone) {
            this.updatesDone();
            this.updatesDone = null;
        }
    }
}