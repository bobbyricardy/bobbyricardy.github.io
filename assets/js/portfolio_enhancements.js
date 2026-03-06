// ─── Footer Year ──────────────────────────────────────────────────────────────
const updateFooterYear = () => {
    const year = new Date().getFullYear();
    document.getElementById('yearSoFar').innerHTML = year === 2017 ? `${year}` : `2017 - ${year}`;

    const ageEl = document.querySelector('age');
    if (ageEl) ageEl.textContent = year - 1990;
};

// ─── Typing Animation ─────────────────────────────────────────────────────────
const initTyped = () => {
    Typed.new('.masthead-brand', {
        strings: [
            'testing123',
            'Bobby',
            'Bob Ricardy <i id="peace" class="fa fa-hand-peace-o fa-lg"></i>',
        ],
        backDelay: 500,
        backSpeed: 200,
        startDelay: 1000,
        typeSpeed: 100,
        cursorChar: '',
        contentType: 'html',
    });
};

// ─── Border Flash (nav links) ─────────────────────────────────────────────────
const flashElement = (el) => {
    el.style.transition = 'opacity 0.4s';
    el.style.opacity = '0';
    setTimeout(() => {
        el.style.opacity = '1';
    }, 400);
};

// ─── Resume Shake Animation ───────────────────────────────────────────────────
const initResumeShake = () => {
    const resumeLink = document.getElementById('linkResume');
    resumeLink.addEventListener('mouseenter', () => resumeLink.classList.add('animated', 'shake'));
    resumeLink.addEventListener('mouseleave', () =>
        resumeLink.classList.remove('animated', 'shake'),
    );
};

// ─── Smooth Scrolling ─────────────────────────────────────────────────────────
const initSmoothScroll = () => {
    document.querySelectorAll('a[href*="#"]:not([href="#"])').forEach((anchor) => {
        anchor.addEventListener('click', (e) => {
            const target = document.querySelector(anchor.hash);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
};

// ─── Bootstrap Tooltips ───────────────────────────────────────────────────────
const initTooltips = () => {
    $('[data-toggle="tooltip"]').tooltip();
};

// ─── Konami Code Easter Egg ───────────────────────────────────────────────────
const initKonamiCode = () => {
    const sequence = [
        'ArrowUp',
        'ArrowUp',
        'ArrowDown',
        'ArrowDown',
        'ArrowLeft',
        'ArrowRight',
        'ArrowLeft',
        'ArrowRight',
        'b',
        'a',
    ];
    let position = 0;
    let inverted = false;

    const toggleInvert = () => {
        inverted = !inverted;
        const style = document.createElement('style');
        style.textContent = `html { filter: invert(${inverted ? '100%' : '0%'}); }`;
        document.head.appendChild(style);
    };

    document.addEventListener('keydown', ({ key }) => {
        if (key === sequence[position]) {
            position++;
            if (position === sequence.length) {
                toggleInvert();
                position = 0;
            }
        } else {
            position = 0;
        }
    });
};

// ─── Nav Flash Handlers ───────────────────────────────────────────────────────
const initNavFlash = () => {
    document
        .querySelector('a[href="#aboutMe"]')
        ?.addEventListener('click', () =>
            flashElement(document.getElementById('borderAboutMe')),
        );
    document
        .querySelector('a[href="#contact"]')
        ?.addEventListener('click', () => flashElement(document.getElementById('contact')));
};

// ─── Init ─────────────────────────────────────────────────────────────────────
updateFooterYear();
initTyped();
initResumeShake();
initSmoothScroll();
initTooltips();
initKonamiCode();
initNavFlash();
