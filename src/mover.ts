import { Player } from "./tree-node";
import { MILLIS_PER_FRAME } from "./animate";
import { Updatable } from "./updatable";
import { NoParamVoidFunc } from "./no-param-void-func";
import {
    Board,
    FRAMES_PER_FADE,
    BROWN_TO_CYAN_GRADIENT,
    BROWN_TO_MAGENTA_GRADIENT,
    CYAN_TO_LIGHT_CYAN_GRADIENT,
    MAGENTA_TO_LIGHT_MAGENTA_GRADIENT
} from "./board";

const SOWS_PER_SECOND = 10;

const FRAMES_PER_SOW = (1000 / SOWS_PER_SECOND) / MILLIS_PER_FRAME;

enum MoveState {
    SOWING,
    CAPTURING,
    WAITING_FOR_MOVE_FADE,
    WAITING_FOR_CLEAR_FADE,
    FINISHED_CLEAR_FADE,
    DONE,
}

export class Mover implements Updatable {

    private readonly board: Board;
    private readonly player: Player;
    private timer: number;
    private seeds: number;
    private currentHouse: number;
    private readonly sourceHouse: number;
    private readonly capture: boolean;
    private moveDone: NoParamVoidFunc | null;
    private readonly waitForMoveFade: boolean;
    private updatesDone: NoParamVoidFunc | null;
    private state: MoveState;

    constructor(board: Board, player: Player, house: number, capture: boolean, moveDoneCallback: NoParamVoidFunc,
                waitForMoveFade: boolean) {

        this.board = board;
        this.player = player;
        this.sourceHouse = house;
        this.capture = capture;
        this.moveDone = moveDoneCallback;
        this.waitForMoveFade = waitForMoveFade;
        this.updatesDone = null;

        this.state = MoveState.SOWING;
        const houseState = this.board.houseStates[house];
        this.currentHouse = house + 1;
        if (this.currentHouse > 11) {
            this.currentHouse = 0;
        }

        // collect
        this.seeds = houseState.seeds;
        houseState.seeds = 0;
        houseState.gradient = (player === Player.A) ? CYAN_TO_LIGHT_CYAN_GRADIENT : MAGENTA_TO_LIGHT_MAGENTA_GRADIENT;
        houseState.gradientFrac = 1;
        houseState.updater = this;
        this.timer = FRAMES_PER_FADE; // pause after collecting
    }

    set updatesDoneCallback(value: NoParamVoidFunc) {
        this.updatesDone = value;
    }

    update() {
        switch (this.state) {
            case MoveState.SOWING:
                this.updateSow();
                break;
            case MoveState.CAPTURING:
                this.updateCapture();
                break;
            case MoveState.WAITING_FOR_MOVE_FADE:
                this.updateWaitingForMoveFade();
                break;
            case MoveState.WAITING_FOR_CLEAR_FADE:
                this.updateWaitingForClearFade();
                break;
            case MoveState.FINISHED_CLEAR_FADE:
                this.updateFinishedClearFade();
                break;
        }
    }

    private updateSow() {
        if (this.timer > 0) {
            --this.timer;
            return;
        }

        // sow
        const houseState = this.board.houseStates[this.currentHouse];
        ++houseState.seeds;
        houseState.gradient = (this.player === Player.A)
            ? CYAN_TO_LIGHT_CYAN_GRADIENT : MAGENTA_TO_LIGHT_MAGENTA_GRADIENT;
        houseState.gradientFrac = 1;
        houseState.updater = this;

        this.timer = FRAMES_PER_SOW;
        if (--this.seeds > 0) {
            if (++this.currentHouse > 11) {
                this.currentHouse = 0;
            }
            if (this.currentHouse === this.sourceHouse && ++this.currentHouse > 11) {
                this.currentHouse = 0;
            }
        } else if (this.capture) {
            this.timer = FRAMES_PER_FADE;
            this.state = MoveState.CAPTURING;
        } else {
            this.state = MoveState.WAITING_FOR_MOVE_FADE;
        }
    }

    private updateCapture() {
        if (this.timer > 0) {
            --this.timer;
            return;
        }

        // capture
        const houseState = this.board.houseStates[this.currentHouse];
        const scoreHouseState = this.board.houseStates[(this.player === Player.A) ? 12 : 13];
        scoreHouseState.seeds += houseState.seeds;
        houseState.seeds = 0;
        houseState.gradient = scoreHouseState.gradient = (this.player === Player.A)
            ? CYAN_TO_LIGHT_CYAN_GRADIENT : MAGENTA_TO_LIGHT_MAGENTA_GRADIENT;
        houseState.gradientFrac = scoreHouseState.gradientFrac = 1;
        scoreHouseState.updater = houseState.updater = this;

        this.timer = FRAMES_PER_SOW;
        if (--this.currentHouse < ((this.player === Player.A) ? 6 : 0)) {
            this.state = MoveState.WAITING_FOR_MOVE_FADE;
        } else {
            const nextHouseState = this.board.houseStates[this.currentHouse];
            if (nextHouseState.seeds < 2 || nextHouseState.seeds > 3) {
                this.state = MoveState.WAITING_FOR_MOVE_FADE;
            }
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

    private updateWaitingForMoveFade() {
        if (this.moveDone && !this.waitForMoveFade) {
            this.moveDone();
            this.moveDone = null;
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
            this.state = MoveState.WAITING_FOR_CLEAR_FADE;
            if (this.moveDone) {
                this.moveDone();
                this.moveDone = null;
            }
        }
    }

    private updateWaitingForClearFade() {
        if (this.isFadeCompleted()) {
            this.state = MoveState.FINISHED_CLEAR_FADE; // ensures final frame of fade is rendered
        }
    }

    private updateFinishedClearFade() {
        for (let i = 13; i >= 0; --i) {
            const houseState = this.board.houseStates[i];
            if (houseState.updater === this) {
                houseState.updater = null;
            }
        }
        if (this.updatesDone) {
            this.updatesDone();
            this.updatesDone = null;
        }
    }
}