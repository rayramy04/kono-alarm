const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'];

const TIMER_PRESETS = [
    { label: '1分', seconds: 60 },
    { label: '3分', seconds: 180 },
    { label: '5分', seconds: 300 },
    { label: '10分', seconds: 600 },
    { label: '30分', seconds: 1800 },
    { label: '1時間', seconds: 3600 }
];
const MODE_ACTIVE_CLASSES = ['bg-sky-500', 'text-white', 'border-sky-500', 'shadow-lg'];
const MODE_INACTIVE_CLASSES = ['bg-slate-100', 'text-slate-600', 'border-white/40'];
const STATUS_BASE = 'text-center text-base font-medium rounded-xl py-3 px-4 shadow-sm';

const $ = id => document.getElementById(id);
const [
    currentTimeDisplay,
    currentTimeSection,
    alarmSection,
    timerSection,
    alarmModeBtn,
    timerModeBtn,
    setAlarmBtn,
    cancelAlarmBtn,
    statusEl,
    videoOverlay,
    alarmVideo,
    stopAlarmBtn,
    alarmTimeInput,
    timerHoursDisplay,
    timerMinutesDisplay,
    timerSecondsDisplay,
    keypadContainer,
    presetsContainer
] = [
    'currentTime',
    'currentTimeSection',
    'alarmSection',
    'timerSection',
    'alarmModeBtn',
    'timerModeBtn',
    'setAlarmBtn',
    'cancelAlarmBtn',
    'status',
    'videoOverlay',
    'alarmVideo',
    'stopAlarmBtn',
    'alarmTime',
    'timerHours',
    'timerMinutes',
    'timerSeconds',
    'timerKeypad',
    'timerPresets'
].map($);

let alarmTime = null, checkInterval = null, timerTimeout = null, currentMode = 'alarm', timerInput = '';

const pad = value => String(value).padStart(2, '0');
const formatTime = date => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const setStatus = (message, state = 'not-set') => {
    statusEl.textContent = message;
    const variant = state === 'waiting' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600';
    statusEl.className = `${STATUS_BASE} ${variant}`;
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
const keypadButtonBase = 'rounded-lg border border-slate-200 font-bold text-lg py-2 transition active:scale-95';
const keypadClasses = {
    digit: `${keypadButtonBase} text-slate-700 bg-slate-100 hover:bg-slate-200`,
    clear: `${keypadButtonBase} bg-rose-500 text-white border-rose-500 hover:bg-rose-600`,
    back: `${keypadButtonBase} bg-amber-500 text-white border-amber-500 hover:bg-amber-600`
};
keypadContainer.innerHTML = KEYPAD_KEYS.map(key => {
    const type = /\d/.test(key) ? 'digit' : key === 'C' ? 'clear' : 'back';
    return `<button type="button" data-type="${type}" data-value="${key}" class="${keypadClasses[type]}">${key}</button>`;
}).join('');
keypadContainer.addEventListener('click', e => {
    const btn = e.target.closest('button[data-type]');
    if (!btn) return;
    if (btn.dataset.type === 'digit' && timerInput.length < 6) {
        timerInput += btn.dataset.value;
    } else if (btn.dataset.type === 'clear') {
        timerInput = '';
    } else if (btn.dataset.type === 'back') {
        timerInput = timerInput.slice(0, -1);
    }
    updateTimerDisplay();
});

const presetBtnBase = 'rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold py-2 transition hover:bg-sky-500 hover:text-white';
presetsContainer.innerHTML = TIMER_PRESETS.map(preset => `<button type="button" data-sec="${preset.seconds}" class="${presetBtnBase}">${preset.label}</button>`).join('');
presetsContainer.addEventListener('click', e => {
    const btn = e.target.closest('button[data-sec]');
    if (!btn) return;
    startTimer(parseInt(btn.dataset.sec, 10) * 1000, btn.textContent);
});

const updateCurrentTime = () => {
    const now = new Date();
    currentTimeDisplay.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};
updateCurrentTime();
setInterval(updateCurrentTime, 1000);

const updateTimerDisplay = () => {
    const padded = timerInput.padStart(6, '0');
    timerHoursDisplay.textContent = padded.slice(0, 2);
    timerMinutesDisplay.textContent = padded.slice(2, 4);
    timerSecondsDisplay.textContent = padded.slice(4, 6);
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
    setStatus(`タイマー設定: ${descriptor} (${formatTime(targetTime)}) にアラームが再生されます`, 'waiting');
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
        const padded = timerInput.padStart(6, '0');
        const hours = parseInt(padded.slice(0, 2), 10);
        const minutes = parseInt(padded.slice(2, 4), 10);
        const seconds = parseInt(padded.slice(4, 6), 10);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;

        if (totalSeconds === 0) {
            alert('何やってるんですか？？時間を設定してください！！！');
            timerInput = '';
            updateTimerDisplay();
            return;
        }

        if (totalSeconds > 86399) {
            alert('何やってるんですか？？23時間59分59秒以内で設定してください！！！');
            timerInput = '';
            updateTimerDisplay();
            return;
        }

        const label = `${hours ? `${hours}時間` : ''}${minutes ? `${minutes}分` : ''}${seconds ? `${seconds}秒` : ''}`;
        startTimer(totalSeconds * 1000, label || '数秒');
    } else {
        alarmTime = alarmTimeInput.value;
        if (!alarmTime) {
            alert('何やってるんですか？？時刻を設定してください！！！');
            return;
        }

        setStatus(`アラーム設定: ${alarmTime} にアラームが再生されます`, 'waiting');
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
            body: '何やってるんですか？？勉強してください！！！',
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
