function init() {
    (document.getElementById('play-button') as HTMLButtonElement).addEventListener('click',
        _ => window.location.href = 'app.html');
}

document.addEventListener('DOMContentLoaded', init);