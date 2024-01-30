import { MILLIS_PER_FRAME } from "./animate";
import { Updatable } from "./updatable";
import { NoParamVoidFunc } from "./no-param-void-func";
import { Board } from "./board";

const DOTS_PER_SECOND = 2;
const APPEARANCE_DELAY_MILLIS = 1000;

const APPEARANCE_DELAY_FRAMES = APPEARANCE_DELAY_MILLIS / MILLIS_PER_FRAME;
const FRAMES_PER_DOT = (1000 / DOTS_PER_SECOND) / MILLIS_PER_FRAME;

enum ThinkerState {
    WAITING_TO_APPEAR,
    DOTTING,
    FINISHING,
    DONE,
}

export class Thinker implements Updatable {

    private readonly board: Board;
    private thinkingDone: NoParamVoidFunc | null;
    private timer: number;
    private state: ThinkerState;

    constructor(board: Board) {
        this.board = board;
        this.thinkingDone = null;

        this.timer = APPEARANCE_DELAY_FRAMES;
        this.state = ThinkerState.WAITING_TO_APPEAR;

        board.thinkingIndex = 0;
    }

    set thinkingDoneCallback(value: NoParamVoidFunc) {
        this.thinkingDone = value;
    }

    stop() {
        this.state = ThinkerState.FINISHING; // ensures no dots frame is rendered
        this.board.thinkingIndex = 0;
    }

    update() {
        switch (this.state) {
            case ThinkerState.WAITING_TO_APPEAR:
                this.updateWaitToAppear();
                break;
            case ThinkerState.DOTTING:
                this.updateDots();
                break;
            case ThinkerState.FINISHING:
                this.updateFinish();
                break;
        }
    }

    private updateWaitToAppear() {
        if (this.timer > 0) {
            --this.timer;
            return;
        }

        this.state = ThinkerState.DOTTING;
    }

    private updateDots() {
        if (this.timer > 0) {
            --this.timer;
            return;
        }

        if (++this.board.thinkingIndex > 3) {
            this.board.thinkingIndex = 0;
        }
        this.timer = FRAMES_PER_DOT;
    }

    private updateFinish() {
        this.state = ThinkerState.DONE;
        if (this.thinkingDone) {
            this.thinkingDone();
            this.thinkingDone = null;
        }
    }
}