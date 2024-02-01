import { enter as enterStart, windowResized as startWindowResized } from "./start";
import {
    enter as enterGame,
    reset as resetGame,
    sendCancelAllRequest,
    windowResized as gameWindowResized,
} from "./game";
import { enter as enterQuit, windowResized as quitWindowResized } from "./quit";
import { Player } from "./tree-node";
import { stopAnimation } from "./animate";
import { NoParamVoidFunc } from "./no-param-void-func";

enum Page {
    START,
    GAME,
    QUIT,
}

let page = Page.START;

let wakeLock: WakeLockSentinel | null = null;
let acquiringWaitLock = false;

let removeMediaEventListener: NoParamVoidFunc | null = null;

let lastTouchEnd = 0;

export function onStartButtonClicked(firstPlayer: Player, depth: number) {
    page = Page.GAME;
    acquireWakeLock();
    enterGame();
    resetGame(firstPlayer, depth);
}

export function onHamburgerClicked(gameOver: boolean) {
    if (gameOver) {
        onQuitButtonClicked();
    } else {
        page = Page.QUIT;
        enterQuit();
    }
}

export function onQuitButtonClicked() {
    page = Page.START;
    releaseWakeLock();
    sendCancelAllRequest();
    stopAnimation();
    enterStart();
}

export function onResumeButtonClicked() {
    page = Page.GAME;
    enterGame();
}

function windowResized() {
    switch (page) {
        case Page.START:
            startWindowResized();
            break;
        case Page.GAME:
            gameWindowResized();
            break;
        case Page.QUIT:
            quitWindowResized();
            break;
    }
}

function acquireWakeLock() {
    if (!acquiringWaitLock && wakeLock === null && 'wakeLock' in navigator) {
        acquiringWaitLock = true;
        navigator.wakeLock.request('screen')
            .then(w => {
                if (acquiringWaitLock) {
                    wakeLock = w;
                    wakeLock.addEventListener("release", () => {
                        if (!acquiringWaitLock) {
                            wakeLock = null;
                        }
                    });
                }
            }).catch(_ => {
            }).finally(() => acquiringWaitLock = false);
    }
}

function releaseWakeLock() {
    if (wakeLock !== null && 'wakeLock' in navigator) {
        acquiringWaitLock = false;
        wakeLock.release()
            .then(() => {
                if (!acquiringWaitLock) {
                    wakeLock = null;
                }
            }).catch(_ => {
            });
    }
}

const updatePixelRatio = () => {
    if (removeMediaEventListener != null) {
        removeMediaEventListener();
    }
    const media = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
    media.addEventListener("change", updatePixelRatio);
    removeMediaEventListener = () => media.removeEventListener("change", updatePixelRatio);

    windowResized();
};

function init() {
    document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
    window.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && page !== Page.START) {
            acquireWakeLock();
        }
    });
    window.addEventListener('resize', windowResized);
    enterStart();
    updatePixelRatio();
}

document.addEventListener('DOMContentLoaded', init);