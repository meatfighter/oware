import seedCoordinates from "./seeds";
import { MILLIS_PER_FRAME } from "./animate";
import { Updatable } from "./updatable";

const MILLIS_PER_FADE = 500;

export const FRAMES_PER_FADE = MILLIS_PER_FADE / MILLIS_PER_FRAME;
const FADE_FRACS_PER_FRAME = 1.0 / FRAMES_PER_FADE;

export enum Color {
    BROWN = '#C3986F',
    CYAN = '#00B9BA',
    DARK_GRAY = '#1E1F22',
    LIGHT_CYAN = '#4DFFFF',
    LIGHT_GRAY = '#BCBEC4',
    LIGHT_MAGENTA = '#FFA9FF',
    MAGENTA = '#FF32FF',
}

const GRADIENT_STEPS = 64;

export const MAGENTA_TO_LIGHT_MAGENTA_GRADIENT = createGradient(Color.MAGENTA, Color.LIGHT_MAGENTA, GRADIENT_STEPS);
export const BROWN_TO_MAGENTA_GRADIENT = createGradient(Color.BROWN, Color.MAGENTA, GRADIENT_STEPS);
export const CYAN_TO_LIGHT_CYAN_GRADIENT = createGradient(Color.CYAN, Color.LIGHT_CYAN, GRADIENT_STEPS);
export const BROWN_TO_CYAN_GRADIENT = createGradient(Color.BROWN, Color.CYAN, GRADIENT_STEPS);

export enum House {
    SIZE = 100,
    PADDING = 15,
    RADIUS = 20,
}

enum Seed {
    RADIUS = House.SIZE / 16,
    DIAMETER = House.SIZE / 8,
}

enum Hamburger {
    WIDTH = 18,
    BAR_HEIGHT = 2,
    PADDING = 5,
    HEIGHT = 2 * Hamburger.PADDING + BAR_HEIGHT,
}

enum Outcome {
    RADIUS = Seed.DIAMETER,
    DIAMETER = 2 * Outcome.RADIUS,
}

enum Thinking {
    SIZE = Seed.DIAMETER,
    PADDING = 0.75 * Seed.DIAMETER,
}

enum Favored {
    WIDTH = 4.5 * Seed.DIAMETER,
    HEIGHT = Seed.DIAMETER,
}

export enum Render {
    WIDTH = 8 * House.SIZE + 7 * House.PADDING,
    HEIGHT = 2 * House.SIZE + House.PADDING,
}

const housePath = createRoundedRectPath(0, 0, House.SIZE, House.SIZE, House.RADIUS);
const seedPath = createCirclePath(Seed.RADIUS);
const hamburgerPath = createHamburgerPath();
const winPath = createCirclePath(Outcome.RADIUS);
const drawPath = createSemicirclePath(Outcome.RADIUS);
const thinkingPaths = createThinkingPaths();
const favoredPath = createFavoredPath();

function createGradient(fromColor: string, toColor: string, steps: number) {
    const fromRGB = colorToRGB(fromColor);
    const toRGB = colorToRGB(toColor);
    const deltaRGB = [ toRGB[0] - fromRGB[0], toRGB[1] - fromRGB[1], toRGB[2] - fromRGB[2]];
    const result: string[] = new Array(steps);
    for (let i = steps - 1; i >= 0; --i) {
        const frac = i / (steps - 1);
        result[i] = rgbToColor([ fromRGB[0] + frac * deltaRGB[0], fromRGB[1] + frac * deltaRGB[1],
            fromRGB[2] + frac * deltaRGB[2]]);
    }
    return result;
}

function rgbToColor(rgb: number[]) {
    return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
}

function toHex(value: number) {
    return Math.max(0x00, Math.min(0xFF, Math.round(value))).toString(16).padStart(2, '0').toUpperCase();
}

function colorToRGB(color: string) {
    return [ parseInt(color.substring(1, 3), 16), parseInt(color.substring(3, 5), 16),
        parseInt(color.substring(5, 7), 16) ];
}

function createFavoredPath() {
    const favoredPath = new Path2D();
    favoredPath.rect(-Favored.WIDTH / 2, 0, Favored.WIDTH, Favored.HEIGHT);
    return favoredPath;
}

function createThinkingPaths() {
    const thinkingPaths = new Array(4).fill(null).map(() => new Path2D());
    const x = -(3 * Thinking.SIZE + 2 * Thinking.PADDING) / 2;
    for (let i = 3; i >= 0; --i) {
        for (let j = i; j > 0; --j) {
            thinkingPaths[i].rect(x + (j - 1) * (Thinking.SIZE + Thinking.PADDING), 0, Thinking.SIZE, Thinking.SIZE);
        }
    }
    return thinkingPaths;
}

function createHamburgerPath() {
    const hamburgerPath = new Path2D();
    hamburgerPath.rect(0, 0, Hamburger.WIDTH, Hamburger.BAR_HEIGHT);
    hamburgerPath.rect(0, Hamburger.PADDING, Hamburger.WIDTH, Hamburger.BAR_HEIGHT);
    hamburgerPath.rect(0, 2 * Hamburger.PADDING, Hamburger.WIDTH, Hamburger.BAR_HEIGHT);
    return hamburgerPath;
}

function createCirclePath(radius: number) {
    const circlePath = new Path2D();
    circlePath.arc(0, 0, radius, 0, 2 * Math.PI);
    return circlePath;
}

function createSemicirclePath(radius: number) {
    const circlePath = new Path2D();
    circlePath.arc(0, 0, radius, Math.PI, 2 * Math.PI);
    return circlePath;
}

function createRoundedRectPath(x: number, y: number, width: number, height: number, radius: number) {
    const roundedRectPath = new Path2D();
    roundedRectPath.roundRect(x, y, width, height, radius);
    return roundedRectPath;
}


export class HouseState {
    seeds = 0;
    gradient = BROWN_TO_CYAN_GRADIENT;
    gradientFrac = 0;
    updater: Updatable | null = null;
}

export enum BoardStatus {
    INTERMEDIATE,
    A_FAVORED,
    B_FAVORED,
    DRAW_FAVORED,
    A_WON,
    B_WON,
    DRAW
}

export class Board {

    houseStates = new Array(14).fill(null).map(() => new HouseState());
    status = BoardStatus.INTERMEDIATE;
    thinkingIndex = 0;

    private fadesDone = false; // ensures final frame of fade is rendered

    constructor() {
        this.reset();
    }

    reset() {
        for (let i = 13; i >= 0; --i) {
            const houseState = this.houseStates[i];
            houseState.seeds = (i > 11) ? 0 : 4;
            houseState.gradient = BROWN_TO_CYAN_GRADIENT;
            houseState.gradientFrac = 0;
        }
        this.status = BoardStatus.INTERMEDIATE;
        this.thinkingIndex = 0;
    }

    updateFades() {
        let done = true;
        for (let i = 13; i >= 0; --i) {
            const houseState = this.houseStates[i];
            if (houseState.gradientFrac > 0) {
                done = false;
                houseState.gradientFrac = Math.max(0, houseState.gradientFrac - FADE_FRACS_PER_FRAME);
            }
        }
        const result = done && this.fadesDone;
        this.fadesDone = done;
        return result;
    }

    render(g: CanvasRenderingContext2D) {
        g.fillStyle = Color.DARK_GRAY;
        g.fillRect(0, 0, Render.WIDTH, Render.HEIGHT);

        for (let i = 13; i >= 0; --i) {
            const houseState = this.houseStates[i];
            let x: number;
            let y: number;
            if (i < 6) {
                x = (House.SIZE + House.PADDING) * (i + 1);
                y = House.SIZE + House.PADDING;
            } else if (i < 12) {
                x = (House.SIZE + House.PADDING) * (12 - i);
                y = 0;
            } else if (i === 12) {
                x = 7 * (House.SIZE + House.PADDING);
                y = (Render.HEIGHT - House.SIZE) / 2;
            } else {
                x = 0;
                y = (Render.HEIGHT - House.SIZE) / 2;
            }

            g.save();
            g.fillStyle = houseState.gradient[Math.round((GRADIENT_STEPS - 1) * houseState.gradientFrac)];
            g.translate(x, y);
            g.fill(housePath);

            g.fillStyle = Color.DARK_GRAY;
            for (let c of seedCoordinates[houseState.seeds]) {
                g.save();
                g.translate(Seed.DIAMETER + Seed.DIAMETER * c.x, Seed.DIAMETER + Seed.DIAMETER * c.y);
                g.fill(seedPath);
                g.restore();
            }
            g.restore();
        }

        g.fillStyle = Color.LIGHT_GRAY;
        g.save();
        g.translate((House.SIZE - Hamburger.WIDTH) / 2, (((Render.HEIGHT - House.SIZE) / 2) - Hamburger.HEIGHT) / 2);
        g.fill(hamburgerPath);
        g.restore();

        if (this.status === BoardStatus.B_WON) {
            g.fillStyle = Color.BROWN;
            g.save();
            g.translate(House.SIZE / 2, (Render.HEIGHT - House.SIZE) / 2 + House.SIZE + House.PADDING + Outcome.RADIUS);
            g.fill(winPath);
            g.restore();
        } else if (this.status === BoardStatus.A_WON) {
            g.fillStyle = Color.BROWN;
            g.save();
            g.translate(7 * (House.SIZE + House.PADDING) + House.SIZE / 2,
                    (Render.HEIGHT - House.SIZE) / 2 + House.SIZE + House.PADDING + Outcome.RADIUS);
            g.fill(winPath);
            g.restore();
        } else if (this.status === BoardStatus.DRAW) {
            g.fillStyle = Color.BROWN;
            g.save();
            g.translate(House.SIZE / 2, (Render.HEIGHT - House.SIZE) / 2 + House.SIZE + House.PADDING + Outcome.RADIUS);
            g.fill(drawPath);
            g.restore();

            g.save();
            g.translate(7 * (House.SIZE + House.PADDING) + House.SIZE / 2,
                (Render.HEIGHT - House.SIZE) / 2 + House.SIZE + House.PADDING + Outcome.RADIUS);
            g.fill(drawPath);
            g.restore();
        } else {
            if (this.status === BoardStatus.B_FAVORED || this.status === BoardStatus.DRAW_FAVORED) {
                g.fillStyle = Color.BROWN;
                g.save();
                g.translate(House.SIZE / 2, (Render.HEIGHT - House.SIZE) / 2 + House.SIZE + House.PADDING);
                g.fill(favoredPath);
                g.restore();
            }
            if (this.status === BoardStatus.A_FAVORED || this.status === BoardStatus.DRAW_FAVORED) {
                g.fillStyle = Color.BROWN;
                g.save();
                g.translate(7 * (House.SIZE + House.PADDING) + House.SIZE / 2,
                        (Render.HEIGHT - House.SIZE) / 2 + House.SIZE + House.PADDING);
                g.fill(favoredPath);
                g.restore();
            }
        }

        if (this.thinkingIndex > 0) {
            g.fillStyle = Color.BROWN;
            g.save();
            g.translate(House.SIZE / 2, (Render.HEIGHT - House.SIZE) / 2 + House.SIZE + 2 * House.PADDING
                    + Favored.HEIGHT);
            g.fill(thinkingPaths[this.thinkingIndex]);
            g.restore();
        }
    }
}