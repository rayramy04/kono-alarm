const KONO_CLONES = [
    { top: '23%', right: '1%', size: 310, distance: '-38px', rotate: '3.5deg' },
    { top: '38%', left: '1%', size: 290, flip: true, distance: '-42px', rotate: '-2.5deg', duration: '7.5s' },
    { top: '33%', right: '25%', size: 265, flip: true, distance: '-32px', rotate: '4deg' },
    { top: '27%', left: '18%', size: 275, distance: '-36px', rotate: '-1.8deg', duration: '5s' }
];

const KEYPAD_LAYOUT = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
    ['C', 0, '⌫']
];

const TIMER_PRESETS = [1, 3, 5, 10, 15, 30];
const MODE_ACTIVE_CLASSES = ['bg-sky-500', 'text-white', 'border-sky-500', 'shadow-lg'];
const MODE_INACTIVE_CLASSES = ['bg-slate-100', 'text-slate-600', 'border-white/40'];
const STATUS_BASE = 'text-center text-base font-medium rounded-xl py-3 px-4 shadow-sm';
const STATUS_VARIANTS = {
    'not-set': 'bg-slate-100 text-slate-600',
    waiting: 'bg-emerald-50 text-emerald-700'
};

const $ = id => document.getElementById(id);
const clonesContainer = $('konoClones');
const currentTimeDisplay = $('currentTime');
const currentTimeSection = $('currentTimeSection');
const alarmSection = $('alarmSection');
const timerSection = $('timerSection');
const alarmModeBtn = $('alarmModeBtn');
const timerModeBtn = $('timerModeBtn');
const setAlarmBtn = $('setAlarmBtn');
const cancelAlarmBtn = $('cancelAlarmBtn');
const status = $('status');
const videoOverlay = $('videoOverlay');
const alarmVideo = $('alarmVideo');
const stopAlarmBtn = $('stopAlarmBtn');
const alarmTimeInput = $('alarmTime');
const timerMinutesDisplay = $('timerMinutes');
const timerSecondsDisplay = $('timerSeconds');
const keypadContainer = $('timerKeypad');
const presetsContainer = $('timerPresets');

let alarmTime = null;
let checkInterval = null;
let timerTimeout = null;
let currentMode = 'alarm';
let timerInput = '';

const pad = value => String(value).padStart(2, '0');
const formatTime = date => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const setStatus = (message, state = 'not-set') => {
    status.textContent = message;
    status.className = `${STATUS_BASE} ${STATUS_VARIANTS[state] ?? STATUS_VARIANTS['not-set']}`;
};
const toggleButtons = running => {
    setAlarmBtn.classList.toggle('hidden', running);
    cancelAlarmBtn.classList.toggle('hidden', !running);
};
const clearTimers = () => {
    if (checkInterval) clearInterval(checkInterval);
    if (timerTimeout) clearTimeout(timerTimeout);
    checkInterval = timerTimeout = null;
};
const setModeButtonState = (button, isActive) => {
    MODE_ACTIVE_CLASSES.forEach(cls => button.classList.toggle(cls, isActive));
    MODE_INACTIVE_CLASSES.forEach(cls => button.classList.toggle(cls, !isActive));
};

KONO_CLONES.forEach(cfg => {
    const clone = document.createElement('div');
    clone.className = 'kono-clone';
    Object.assign(clone.style, {
        top: cfg.top,
        left: cfg.left ?? 'auto',
        right: cfg.right ?? 'auto',
        width: `${cfg.size}px`,
        height: `${cfg.size}px`,
        opacity: cfg.opacity ?? 0.9,
        zIndex: cfg.zIndex ?? 1
    });
    clone.style.setProperty('--base-transform', cfg.flip ? 'scaleX(-1)' : 'scaleX(1)');
    clone.style.setProperty('--float-distance', cfg.distance ?? '-34px');
    clone.style.setProperty('--float-rotate', cfg.rotate ?? '0deg');
    clone.style.setProperty('--float-duration', cfg.duration ?? '6.5s');
    clonesContainer.appendChild(clone);
});

const keypadButtonBase = 'rounded-lg border border-slate-200 font-bold text-lg py-2 transition active:scale-95';
KEYPAD_LAYOUT.flat().forEach(key => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = key;

    if (typeof key === 'number') {
        btn.className = `${keypadButtonBase} text-slate-700 bg-slate-100 hover:bg-slate-200`;
        btn.addEventListener('click', () => {
            if (timerInput.length < 4) {
                timerInput += key;
                updateTimerDisplay();
            }
        });
    } else if (key === 'C') {
        btn.className = `${keypadButtonBase} bg-rose-500 text-white border-rose-500 hover:bg-rose-600`;
        btn.addEventListener('click', () => {
            timerInput = '';
            updateTimerDisplay();
        });
    } else {
        btn.className = `${keypadButtonBase} bg-amber-500 text-white border-amber-500 hover:bg-amber-600`;
        btn.addEventListener('click', () => {
            timerInput = timerInput.slice(0, -1);
            updateTimerDisplay();
        });
    }

    keypadContainer.appendChild(btn);
});

const presetBtnBase = 'rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold py-2 transition hover:bg-sky-500 hover:text-white';
TIMER_PRESETS.forEach(minutes => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = presetBtnBase;
    btn.textContent = `${minutes}分`;
    btn.addEventListener('click', () => startTimer(minutes * 60 * 1000, `${minutes}分`));
    presetsContainer.appendChild(btn);
});

const updateCurrentTime = () => {
    const now = new Date();
    currentTimeDisplay.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};
updateCurrentTime();
setInterval(updateCurrentTime, 1000);

const updateTimerDisplay = () => {
    const padded = timerInput.padStart(4, '0');
    timerMinutesDisplay.textContent = padded.slice(0, 2);
    timerSecondsDisplay.textContent = padded.slice(2, 4);
};

const setMode = mode => {
    if (currentMode === mode) return;
    currentMode = mode;
    const isTimer = mode === 'timer';
    alarmSection.classList.toggle('hidden', isTimer);
    timerSection.classList.toggle('hidden', !isTimer);
    currentTimeSection.classList.toggle('hidden', isTimer);
    setModeButtonState(alarmModeBtn, !isTimer);
    setModeButtonState(timerModeBtn, isTimer);
    resetAlarm();
};

setModeButtonState(alarmModeBtn, true);
setModeButtonState(timerModeBtn, false);
alarmModeBtn.addEventListener('click', () => setMode('alarm'));
timerModeBtn.addEventListener('click', () => setMode('timer'));

const startTimer = (durationMs, labelText) => {
    clearTimers();
    const targetTime = new Date(Date.now() + durationMs);
    const descriptor = labelText ? `${labelText}後` : '後';
    setStatus(`タイマー設定: ${descriptor} (${formatTime(targetTime)}) に勉強してください！が再生されます`, 'waiting');
    toggleButtons(true);
    timerTimeout = setTimeout(triggerAlarm, durationMs);
};

setAlarmBtn.addEventListener('click', () => {
    if ('Notification' in window && Notification.permission === 'default') {
        if (confirm('アラーム通知を有効にしますか？（バックグラウンド時に通知が表示されます）')) {
            Notification.requestPermission();
        }
    }

    if (currentMode === 'timer') {
        const padded = timerInput.padStart(4, '0');
        const minutes = parseInt(padded.slice(0, 2), 10);
        const seconds = parseInt(padded.slice(2, 4), 10);
        const totalSeconds = minutes * 60 + seconds;

        if (totalSeconds === 0) {
            alert('時間を設定してください！');
            return;
        }

        const label = `${minutes ? `${minutes}分` : ''}${seconds ? `${seconds}秒` : ''}`;
        startTimer(totalSeconds * 1000, label || '数秒');
    } else {
        alarmTime = alarmTimeInput.value;
        if (!alarmTime) {
            alert('時刻を設定してください！');
            return;
        }

        setStatus(`アラーム設定: ${alarmTime} に勉強してください！が再生されます`, 'waiting');
        toggleButtons(true);
        clearTimers();
        checkInterval = setInterval(() => {
            const now = new Date();
            const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
            if (currentTime === alarmTime) {
                triggerAlarm();
            }
        }, 1000);
    }
});

cancelAlarmBtn.addEventListener('click', resetAlarm);

function resetAlarm() {
    clearTimers();
    alarmTime = null;
    timerInput = '';
    if (currentMode === 'timer') {
        updateTimerDisplay();
    }
    setStatus('設定されていません', 'not-set');
    toggleButtons(false);
}

function triggerAlarm() {
    clearTimers();
    videoOverlay.classList.remove('hidden');
    alarmVideo.play();

    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('河野アラーム', {
            body: '勉強してください！',
            icon: '📚'
        });
    }
}

stopAlarmBtn.addEventListener('click', () => {
    alarmVideo.pause();
    alarmVideo.currentTime = 0;
    videoOverlay.classList.add('hidden');
    resetAlarm();
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !videoOverlay.classList.contains('hidden')) {
        alarmVideo.play();
    }
});

resetAlarm();
