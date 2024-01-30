import { Player } from "./tree-node";
import { onStartButtonClicked as onAppStartButtonClicked } from "./app";

const MIN_DEPTH = 1;
const MAX_DEPTH = 19;

let firstPlayer = Player.A;
let depth = MIN_DEPTH;
let landscape = false;

export function enter() {
    const mainElement = document.getElementById('main-content') as HTMLElement;
    mainElement.innerHTML = `
            <div id="start-div">
                <div id="level-div">
                    <button id="minus-button">&minus;</button>
                    <span id="level-span" class="no-wrap">Level ${depth}</span>
                    <button id="plus-button">&plus;</button>
                </div>
                <div id="first-player-div">
                    <input type="radio" id="human-radio" name="first-player" value="human" 
                            ${firstPlayer === Player.A ? 'checked' : ''}>
                    <label for="human-radio" class="no-wrap">Human First</label>                
                    <input type="radio" id="ai-radio" name="first-player" value="ai"
                            ${firstPlayer === Player.B ? 'checked' : ''}>
                    <label for="ai-radio" class="no-wrap">AI First</label>
                </div>
                <div id="go-div">
                    <button id="start-button">Start</button>
                </div>
            </div>`;
    const minusButton = document.getElementById('minus-button') as HTMLButtonElement;
    minusButton.addEventListener('click', _ => onMinusButtonClicked());
    const plusButton = document.getElementById('plus-button') as HTMLButtonElement;
    plusButton.addEventListener('click', _ => onPlusButtonClicked());
    const humanRadio = document.getElementById('human-radio') as HTMLButtonElement;
    humanRadio.addEventListener('click', _ => onHumanRadioClicked());
    const aiRadio = document.getElementById('ai-radio') as HTMLButtonElement;
    aiRadio.addEventListener('click', _ => onAiRadioClicked());
    const startButton = document.getElementById('start-button') as HTMLButtonElement;
    startButton.addEventListener('click', _ => onStartButtonClicked());
    updateLevelSpan();
    windowResized();
}

function onStartButtonClicked() {
    onAppStartButtonClicked(firstPlayer, depth);
}

function onMinusButtonClicked() {
    if (depth > MIN_DEPTH) {
        --depth;
        updateLevelSpan();
    }
}

function onPlusButtonClicked() {
    if (depth < MAX_DEPTH) {
        ++depth;
        updateLevelSpan();
    }
}

function onHumanRadioClicked() {
    firstPlayer = Player.A;
}

function onAiRadioClicked() {
    firstPlayer = Player.B;
}

function updateLevelSpan() {
    const minusButton = document.getElementById('minus-button') as HTMLButtonElement;
    const plusButton = document.getElementById('plus-button') as HTMLButtonElement;
    const levelSpan = document.getElementById('level-span') as HTMLDivElement;
    levelSpan.style.width = '';
    levelSpan.style.display = 'inline-block';
    levelSpan.style.textAlign = 'center';
    levelSpan.textContent = 'Level 00';
    if (landscape) {
        const width = levelSpan.getBoundingClientRect().width;
        levelSpan.style.width = `${width}px`;
    } else {
        const height = levelSpan.getBoundingClientRect().height;
        levelSpan.style.width = `${height}px`;
    }
    levelSpan.textContent = `Level ${depth}`;
    minusButton.disabled = (depth === MIN_DEPTH);
    plusButton.disabled = (depth === MAX_DEPTH);
}

export function windowResized() {
    const startDiv = document.getElementById('start-div') as HTMLDivElement;
    const minusButton = document.getElementById('minus-button') as HTMLButtonElement;
    const plusButton = document.getElementById('plus-button') as HTMLButtonElement;

    minusButton.style.width = plusButton.style.width = startDiv.style.top = startDiv.style.left
            = startDiv.style.transform = '';
    startDiv.style.display = 'none';
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    landscape = (innerWidth >= innerHeight);
    startDiv.style.display = 'flex';

    minusButton.style.width = plusButton.style.width = `${plusButton.getBoundingClientRect().width}px`;

    if (landscape) {
        const rect = startDiv.getBoundingClientRect();
        startDiv.style.left = `${(innerWidth - rect.width) / 2}px`
        startDiv.style.top = `${(innerHeight - rect.height) / 2}px`;
    } else {
        startDiv.style.transform = 'rotate(-90deg)';
        const rect = startDiv.getBoundingClientRect();
        startDiv.style.left = `${(innerWidth - rect.height) / 2}px`
        startDiv.style.top = `${(innerHeight - rect.width) / 2}px`;
    }
    updateLevelSpan();
}