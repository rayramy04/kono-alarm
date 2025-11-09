const CLONES = [
    { top: '23%', right: '1%', size: 310 },
    { top: '38%', left: '1%', size: 290, flip: 1 },
    { top: '33%', right: '25%', size: 265, flip: 1 },
    { top: '27%', left: '18%', size: 275 }
];

const $ = id => document.getElementById(id);
let alarmTime, checkInterval, timerTimeout, timerInput = '', currentMode = 'alarm';

const pad = n => String(n).padStart(2, '0');
const setStatus = (msg, cls = 'not-set') => {
    $('status').textContent = msg;
    $('status').className = `status ${cls}`;
};
const toggleBtns = show => {
    $('setAlarmBtn').style.display = show ? 'none' : 'block';
    $('cancelAlarmBtn').style.display = show ? 'block' : 'none';
};
const clearTimers = () => {
    if (checkInterval) clearInterval(checkInterval);
    if (timerTimeout) clearTimeout(timerTimeout);
    checkInterval = timerTimeout = null;
};

CLONES.forEach(c => {
    const d = document.createElement('div');
    d.className = 'kono';
    d.style.cssText = `position:fixed;top:${c.top};${c.left ? 'left' : 'right'}:${c.left || c.right};width:${c.size}px;height:${c.size}px${c.flip ? ';transform:scaleX(-1)' : ''}`;
    $('konoClones').appendChild(d);
});

setInterval(() => {
    const n = new Date();
    $('currentTime').textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
}, 1000);

const updateTimer = () => {
    const p = timerInput.padStart(4, '0');
    $('timerMinutes').textContent = p.slice(0, 2);
    $('timerSeconds').textContent = p.slice(2);
};

const setMode = mode => {
    currentMode = mode;
    const isTimer = mode === 'timer';
    $('alarmModeBtn').classList.toggle('active', !isTimer);
    $('timerModeBtn').classList.toggle('active', isTimer);
    $('alarmSection').classList.toggle('active', !isTimer);
    $('timerSection').classList.toggle('active', isTimer);
    document.querySelector('.current-time-section').classList.toggle('hidden', isTimer);
    resetAlarm();
};

$('alarmModeBtn').onclick = () => setMode('alarm');
$('timerModeBtn').onclick = () => setMode('timer');

document.querySelectorAll('.keypad-btn[data-num]').forEach(btn => {
    btn.onclick = () => {
        if (timerInput.length < 4) {
            timerInput += btn.dataset.num;
            updateTimer();
        }
    };
});

$('clearBtn').onclick = () => { timerInput = ''; updateTimer(); };
$('deleteBtn').onclick = () => { timerInput = timerInput.slice(0, -1); updateTimer(); };

document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.onclick = () => {
        const ms = parseInt(btn.dataset.minutes) * 60000;
        const t = new Date(Date.now() + ms);
        setStatus(`タイマー設定: ${btn.dataset.minutes}分後 (${pad(t.getHours())}:${pad(t.getMinutes())}) に勉強してください！が再生されます`, 'waiting');
        toggleBtns(true);
        clearTimers();
        timerTimeout = setTimeout(triggerAlarm, ms);
    };
});

$('setAlarmBtn').onclick = () => {
    if ('Notification' in window && Notification.permission === 'default') {
        if (confirm('アラーム通知を有効にしますか？（バックグラウンド時に通知が表示されます）')) {
            Notification.requestPermission();
        }
    }

    if (currentMode === 'timer') {
        const p = timerInput.padStart(4, '0');
        const m = parseInt(p.slice(0, 2)), s = parseInt(p.slice(2));
        const total = m * 60 + s;
        if (!total) return alert('時間を設定してください！');
        const ms = total * 1000;
        const t = new Date(Date.now() + ms);
        const txt = (m ? `${m}分` : '') + (s ? `${s}秒` : '');
        setStatus(`タイマー設定: ${txt}後 (${pad(t.getHours())}:${pad(t.getMinutes())}) に勉強してください！が再生されます`, 'waiting');
        toggleBtns(true);
        clearTimers();
        timerTimeout = setTimeout(triggerAlarm, ms);
    } else {
        alarmTime = $('alarmTime').value;
        if (!alarmTime) return alert('時刻を設定してください！');
        setStatus(`アラーム設定: ${alarmTime} に勉強してください！が再生されます`, 'waiting');
        toggleBtns(true);
        clearTimers();
        checkInterval = setInterval(() => {
            const n = new Date();
            if (`${pad(n.getHours())}:${pad(n.getMinutes())}` === alarmTime) triggerAlarm();
        }, 1000);
    }
};

$('cancelAlarmBtn').onclick = resetAlarm;

function resetAlarm() {
    clearTimers();
    alarmTime = null;
    timerInput = '';
    if (currentMode === 'timer') updateTimer();
    setStatus('設定されていません');
    toggleBtns(false);
}

function triggerAlarm() {
    clearTimers();
    $('videoOverlay').classList.add('active');
    $('alarmVideo').play();
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('河野アラーム', { body: '勉強してください！', icon: '📚' });
    }
}

$('stopAlarmBtn').onclick = () => {
    const v = $('alarmVideo');
    v.pause();
    v.currentTime = 0;
    $('videoOverlay').classList.remove('active');
    resetAlarm();
};

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && $('videoOverlay').classList.contains('active')) {
        $('alarmVideo').play();
    }
});
