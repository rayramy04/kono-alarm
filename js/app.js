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

// ポモドーロ設定
const POMODORO_WORK_TIME = 25 * 60; // 25分
const POMODORO_BREAK_TIME = 5 * 60; // 5分
const POMODORO_LONG_BREAK_TIME = 15 * 60; // 15分
const POMODORO_CYCLES = 4; // 4サイクル

const $ = id => document.getElementById(id);
const [
    currentTimeDisplay,
    currentTimeSection,
    alarmSection,
    timerSection,
    pomodoroSection,
    alarmModeBtn,
    timerModeBtn,
    pomodoroModeBtn,
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
    presetsContainer,
    pomodoroMinutesDisplay,
    pomodoroSecondsDisplay,
    pomodoroStatusDisplay,
    pomodoroCycleDisplay,
    pomodoroWorkBtn,
    pomodoroBreakBtn
] = [
    'currentTime',
    'currentTimeSection',
    'alarmSection',
    'timerSection',
    'pomodoroSection',
    'alarmModeBtn',
    'timerModeBtn',
    'pomodoroModeBtn',
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
    'timerPresets',
    'pomodoroMinutes',
    'pomodoroSeconds',
    'pomodoroStatus',
    'pomodoroCycle',
    'pomodoroWorkBtn',
    'pomodoroBreakBtn'
].map($);

let alarmTime = null, checkInterval = null, timerTimeout = null, currentMode = 'alarm', timerInput = '';

// ポモドーロの状態
let pomodoroTimer = null;
let pomodoroTimeLeft = POMODORO_WORK_TIME;
let pomodoroIsWork = true;
let pomodoroCycle = 1;
let pomodoroAutoTransition = false; // 自動遷移中かどうかのフラグ

const pad = value => String(value).padStart(2, '0');
const formatTime = date => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const setStatus = (message, state = 'not-set') => {
    const variant = state === 'waiting' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600';
    statusEl.textContent = message;
    statusEl.className = `${STATUS_BASE} ${variant}`;
};
const toggleButtons = running => {
    setAlarmBtn.classList.toggle('hidden', running);
    cancelAlarmBtn.classList.toggle('hidden', !running);
};
const clearTimers = () => {
    if (checkInterval) clearInterval(checkInterval);
    if (timerTimeout) clearTimeout(timerTimeout);
    if (pomodoroTimer) clearInterval(pomodoroTimer);
    checkInterval = timerTimeout = pomodoroTimer = null;
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
    
    // セクションの表示/非表示を切り替え
    alarmSection.classList.toggle('hidden', mode !== 'alarm');
    timerSection.classList.toggle('hidden', mode !== 'timer');
    pomodoroSection.classList.toggle('hidden', mode !== 'pomodoro');
    
    // 現在時刻の表示/非表示を切り替え
    currentTimeSection.classList.toggle('hidden', mode !== 'alarm');
    
    // ボタンの状態を更新
    setModeButtonState(alarmModeBtn, mode === 'alarm');
    setModeButtonState(timerModeBtn, mode === 'timer');
    setModeButtonState(pomodoroModeBtn, mode === 'pomodoro');
    
    // 実行中のタイマーをリセット
    resetAlarm();
    
    // ポモドーロモードの場合は初期化
    if (mode === 'pomodoro') {
        resetPomodoro();
    }
};

setModeButtonState(alarmModeBtn, true);
setModeButtonState(timerModeBtn, false);
setModeButtonState(pomodoroModeBtn, false);
alarmModeBtn.addEventListener('click', () => setMode('alarm'));
timerModeBtn.addEventListener('click', () => setMode('timer'));
pomodoroModeBtn.addEventListener('click', () => setMode('pomodoro'));

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

        const displayHours = hours > 0 ? `${hours}時間` : '';
        const displayMinutes = minutes > 0 ? `${minutes}分` : '';
        const displaySeconds = seconds > 0 ? `${seconds}秒` : '';
        const timeText = displayHours + displayMinutes + displaySeconds;

        startTimer(totalSeconds * 1000, timeText);
    } else if (currentMode === 'pomodoro') {
        startPomodoro();
    } else {
        alarmTime = alarmTimeInput.value;
        if (!alarmTime) {
            alert('時刻を設定してください！');
            return;
        }

        setStatus(`アラーム設定: ${alarmTime} にアラームが再生されます`, 'waiting');
        toggleButtons(true);
        clearTimers();
        checkInterval = setInterval(() => {
            const now = new Date();
            const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
            if (currentTime === alarmTime) triggerAlarm();
        }, 1000);
    }
});

cancelAlarmBtn.addEventListener('click', () => resetAlarm());

function resetAlarm() {
    clearTimers();
    alarmTime = null;
    timerInput = '';
    if (currentMode === 'timer') updateTimerDisplay();
    // ポモドーロモードでも、明示的にリセットが呼ばれた場合のみリセット
    // カウントダウン終了時の自動リセットでは呼ばれないようにする
    if (currentMode === 'pomodoro' && !pomodoroAutoTransition) resetPomodoro();
    setStatus('設定されていません');
    toggleButtons(false);
}

// ポモドーロ機能
function resetPomodoro() {
    pomodoroTimeLeft = POMODORO_WORK_TIME;
    pomodoroIsWork = true;
    pomodoroCycle = 1;
    updatePomodoroDisplay();
    pomodoroWorkBtn.disabled = false;
    pomodoroBreakBtn.disabled = false;
}

function updatePomodoroDisplay() {
    const minutes = Math.floor(pomodoroTimeLeft / 60);
    const seconds = pomodoroTimeLeft % 60;
    pomodoroMinutesDisplay.textContent = pad(minutes);
    pomodoroSecondsDisplay.textContent = pad(seconds);
    pomodoroStatusDisplay.textContent = pomodoroIsWork ? '作業時間' : '休憩時間';
    pomodoroCycleDisplay.textContent = pomodoroCycle;
}

function startPomodoro() {
    clearTimers();
    toggleButtons(true);
    pomodoroAutoTransition = false;
    
    // 作業中か休憩中かに応じてステータスを設定
    const statusText = pomodoroIsWork ? '作業中' : '休憩中';
    const timeText = Math.floor(pomodoroTimeLeft / 60) + '分';
    
    // 4サイクルごとに長い休憩があることを表示するが、サイクル数は無限
    const cycleInfo = pomodoroIsWork ? `サイクル ${pomodoroCycle}` : 
                     (pomodoroCycle % 4 === 0 && !pomodoroIsWork ? '長い休憩' : '休憩');
    setStatus(`ポモドーロ: ${statusText} (${timeText}) - ${cycleInfo}`, 'waiting');
    
    // ボタンを無効化
    pomodoroWorkBtn.disabled = true;
    pomodoroBreakBtn.disabled = true;
    
    // タイマー開始
    pomodoroTimer = setInterval(() => {
        pomodoroTimeLeft--;
        updatePomodoroDisplay();
        
        if (pomodoroTimeLeft <= 0) {
            clearInterval(pomodoroTimer);
            pomodoroAutoTransition = true;
            
            // 作業が終わったら休憩、休憩が終わったら次の作業へ
            if (pomodoroIsWork) {
                // 作業終了、休憩開始
                pomodoroIsWork = false;
                
                // 4サイクルごとに長い休憩
                if (pomodoroCycle % 4 === 0) {
                    pomodoroTimeLeft = POMODORO_LONG_BREAK_TIME;
                } else {
                    pomodoroTimeLeft = POMODORO_BREAK_TIME;
                }
                
                // 作業終了のアラーム
                triggerAlarm();
            } else {
                // 休憩終了、次の作業へ
                pomodoroIsWork = true;
                pomodoroTimeLeft = POMODORO_WORK_TIME;
                pomodoroCycle++; // 休憩の後に次のサイクルへ
                
                // 休憩終了のアラーム
                triggerAlarm();
            }
            
            updatePomodoroDisplay();
            
            // アラームは表示するが、ポモドーロの状態はリセットしない
            clearTimers();
            videoOverlay.classList.remove('hidden');
            alarmVideo.play();
            
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('河野アラーム', {
                    body: pomodoroIsWork ? '作業開始！' : '休憩時間です！',
                    icon: pomodoroIsWork ? '📝' : '☕'
                });
            }
            
            // アラーム後も自動的に次のフェーズに移行できるようにボタンを有効化
            pomodoroWorkBtn.disabled = false;
            pomodoroBreakBtn.disabled = false;
            toggleButtons(false);
        }
    }, 1000);
}

// ポモドーロボタンのイベントリスナー
pomodoroWorkBtn.addEventListener('click', () => {
    pomodoroIsWork = true;
    pomodoroTimeLeft = POMODORO_WORK_TIME;
    updatePomodoroDisplay();
    
    // 作業ボタンを押したら動画を再生
    if (currentMode === 'pomodoro') {
        // 一度アラームを表示
        videoOverlay.classList.remove('hidden');
        alarmVideo.play();
        
        // 通知も表示（許可されている場合）
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('河野アラーム', {
                body: '作業開始！勉強してください！',
                icon: '📝'
            });
        }
        
        // アラームを止めた後にタイマーを開始するため、ここではタイマーは開始しない
        // アラームを止めるボタンのイベントリスナーで処理する
        pomodoroAutoTransition = true;
    }
});

pomodoroBreakBtn.addEventListener('click', () => {
    pomodoroIsWork = false;
    // 4サイクルごとに長い休憩
    pomodoroTimeLeft = pomodoroCycle % 4 === 0 ? POMODORO_LONG_BREAK_TIME : POMODORO_BREAK_TIME;
    updatePomodoroDisplay();
    
    // 休憩ボタンを押したら動画を再生
    if (currentMode === 'pomodoro') {
        // 一度アラームを表示
        videoOverlay.classList.remove('hidden');
        alarmVideo.play();
        
        // 通知も表示（許可されている場合）
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('河野アラーム', {
                body: '休憩時間です！',
                icon: '☕'
            });
        }
        
        // アラームを止めた後にタイマーを開始するため、ここではタイマーは開始しない
        // アラームを止めるボタンのイベントリスナーで処理する
        pomodoroAutoTransition = true;
    }
});

function triggerAlarm() {
    // ポモドーロモードの場合は、startPomodoro内で独自の処理を行うため、
    // ここでは何もしない（既に処理済み）
    if (currentMode === 'pomodoro' && pomodoroAutoTransition) {
        return;
    }
    
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
    
    // ポモドーロモードの場合は状態を保持してタイマーを開始
    if (currentMode === 'pomodoro' && pomodoroAutoTransition) {
        // アラームだけを閉じて、ポモドーロの状態は保持
        pomodoroAutoTransition = false;
        
        // タイマーを開始
        startPomodoro();
    } else {
        // 通常のアラームモードやタイマーモードの場合は完全リセット
        resetAlarm();
    }
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !videoOverlay.classList.contains('hidden')) {
        alarmVideo.play();
    }
});