import { onQuitButtonClicked, onResumeButtonClicked } from "./app";

export function enter() {
    const mainElement = document.getElementById('main-content') as HTMLElement;
    mainElement.innerHTML = `
            <div id="quit-buttons">
                <button id="quit-button">Quit</button>
                <button id="resume-button">Resume</button>
            </div>`;
    const quitButton = document.getElementById('quit-button') as HTMLButtonElement;
    quitButton.addEventListener('click', _ => onQuitButtonClicked());
    const resumeButton = document.getElementById('resume-button') as HTMLButtonElement;
    resumeButton.addEventListener('click', _ => onResumeButtonClicked());
    windowResized();
}

export function windowResized() {
    const quitButtons = document.getElementById('quit-buttons') as HTMLDivElement;
    const quitButton = document.getElementById('quit-button') as HTMLButtonElement;
    const resumeButton = document.getElementById('resume-button') as HTMLButtonElement;

    quitButtons.style.top = quitButtons.style.left = quitButtons.style.transform = resumeButton.style.width
            = quitButton.style.width = '';
    quitButtons.style.display = 'none';
    const innerWidth = window.innerWidth;
    const innerHeight = window.innerHeight;
    quitButtons.style.display = 'block';

    quitButton.style.width = resumeButton.style.width = `${resumeButton.getBoundingClientRect().width}px`;

    if (innerWidth >= innerHeight) {
        const rect = quitButtons.getBoundingClientRect();
        quitButtons.style.left = `${(innerWidth - rect.width) / 2}px`
        quitButtons.style.top = `${(innerHeight - rect.height) / 2}px`;
    } else {
        quitButtons.style.transform = 'rotate(-90deg)';
        const rect = quitButtons.getBoundingClientRect();
        quitButtons.style.left = `${(innerWidth - rect.height) / 2}px`
        quitButtons.style.top = `${(innerHeight - rect.width) / 2}px`;
    }
}