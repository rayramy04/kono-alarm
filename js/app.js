// 設定
const KONO_CLONES = [
    { top: '23%', right: '1%', size: 310, distance: '-38px', rotate: '3.5deg' },
    { top: '38%', left: '1%', size: 290, flip: true, distance: '-42px', rotate: '-2.5deg', duration: '7.7s' },
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

// DOM要素
const $ = id => document.getElementById(id);
const currentTimeDisplay = $('currentTime');
const videoOverlay = $('videoOverlay');
const alarmVideo = $('alarmVideo');
const status = $('status');
const currentTimeSection = document.querySelector('.current-time-section');

// 状態
let alarmTime = null;
let checkInterval = null;
let timerTimeout = null;
let currentMode = 'alarm';
let timerInput = '';

// ユーティリティ
const pad = (num, size = 2) => String(num).padStart(size, '0');
const formatTime = date => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
const setStatus = (message, state = 'not-set') => {
    status.textContent = message;
    status.className = `status ${state}`;
};
const toggleButtons = isRunning => {
    $('setAlarmBtn').style.display = isRunning ? 'none' : 'block';
    $('cancelAlarmBtn').style.display = isRunning ? 'block' : 'none';
};
const clearTimers = () => {
    if (checkInterval) clearInterval(checkInterval);
    if (timerTimeout) clearTimeout(timerTimeout);
    checkInterval = timerTimeout = null;
};

// 河野クローンを生成
KONO_CLONES.forEach(config => {
    const div = document.createElement('div');
    div.className = 'kono-clone';
    Object.assign(div.style, {
        top: config.top,
        left: config.left ?? 'auto',
        right: config.right ?? 'auto',
        width: `${config.size}px`,
        height: `${config.size}px`,
        opacity: config.opacity ?? 0.9,
        zIndex: config.zIndex ?? 0,
        animationDuration: config.duration ?? '6.5s',
        animationDelay: config.delay ?? '0s'
    });
    div.style.setProperty('--base-transform', config.flip ? 'scaleX(-1)' : 'scaleX(1)');
    div.style.setProperty('--float-distance', config.distance ?? '-34px');
    div.style.setProperty('--float-rotate', config.rotate ?? '0deg');
    $('konoClones').appendChild(div);
});

// キーパッドを生成
const keypadContainer = $('timerKeypad');
KEYPAD_LAYOUT.flat().forEach(key => {
    const btn = document.createElement('button');
    btn.className = 'keypad-btn';
    btn.textContent = key;

    if (typeof key === 'number') {
        btn.dataset.num = key;
        btn.onclick = () => {
            if (timerInput.length < 4) {
                timerInput += key;
                updateTimerDisplay();
            }
        };
    } else if (key === 'C') {
        btn.classList.add('clear');
        btn.onclick = () => {
            timerInput = '';
            updateTimerDisplay();
        };
    } else if (key === '⌫') {
        btn.classList.add('delete');
        btn.onclick = () => {
            timerInput = timerInput.slice(0, -1);
            updateTimerDisplay();
        };
    }

    keypadContainer.appendChild(btn);
});

// プリセットボタンを生成
const presetsContainer = $('timerPresets');
TIMER_PRESETS.forEach(minutes => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.textContent = `${minutes}分`;
    btn.onclick = () => startTimer(minutes * 60 * 1000, `${minutes}分`);
    presetsContainer.appendChild(btn);
});

// 現在時刻更新
const updateCurrentTime = () => {
    const now = new Date();
    currentTimeDisplay.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};
updateCurrentTime();
setInterval(updateCurrentTime, 1000);

// タイマー表示更新
const updateTimerDisplay = () => {
    const padded = timerInput.padStart(4, '0');
    $('timerMinutes').textContent = padded.slice(0, 2);
    $('timerSeconds').textContent = padded.slice(2, 4);
};

// モード切り替え
const setMode = mode => {
    currentMode = mode;
    const isTimer = mode === 'timer';
    $('alarmModeBtn').classList.toggle('active', !isTimer);
    $('timerModeBtn').classList.toggle('active', isTimer);
    $('alarmSection').classList.toggle('active', !isTimer);
    $('timerSection').classList.toggle('active', isTimer);
    currentTimeSection.classList.toggle('hidden', isTimer);
    resetAlarm();
};

$('alarmModeBtn').onclick = () => setMode('alarm');
$('timerModeBtn').onclick = () => setMode('timer');

// タイマー開始
const startTimer = (durationMs, labelText) => {
    clearTimers();
    const targetTime = new Date(Date.now() + durationMs);
    setStatus(`タイマー設定: ${labelText}後 (${formatTime(targetTime)}) に勉強してください！が再生されます`, 'waiting');
    toggleButtons(true);
    timerTimeout = setTimeout(triggerAlarm, durationMs);
};

// アラーム設定
$('setAlarmBtn').onclick = () => {
    // 通知許可リクエスト
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

        const displayMinutes = minutes > 0 ? `${minutes}分` : '';
        const displaySeconds = seconds > 0 ? `${seconds}秒` : '';
        startTimer(totalSeconds * 1000, displayMinutes + displaySeconds);
    } else {
        alarmTime = $('alarmTime').value;
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
            if (currentTime === alarmTime) triggerAlarm();
        }, 1000);
    }
};

// アラームキャンセル
$('cancelAlarmBtn').onclick = resetAlarm;

function resetAlarm() {
    clearTimers();
    alarmTime = null;
    timerInput = '';
    if (currentMode === 'timer') updateTimerDisplay();
    setStatus('設定されていません', 'not-set');
    toggleButtons(false);
}

// アラーム発動
function triggerAlarm() {
    clearTimers();
    videoOverlay.classList.add('active');
    alarmVideo.play();

    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('河野アラーム', {
            body: '勉強してください！',
            icon: '📚'
        });
    }
}

// アラーム停止
$('stopAlarmBtn').onclick = () => {
    alarmVideo.pause();
    alarmVideo.currentTime = 0;
    videoOverlay.classList.remove('active');
    resetAlarm();
};

// ページ非表示時も動作
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && videoOverlay.classList.contains('active')) {
        alarmVideo.play();
    }
});
