const STORAGE_KEY = "easy-timer-state-v1";

const currentTimeDisplay = document.getElementById("currentTimeDisplay");
const startTimeDisplay = document.getElementById("startTimeDisplay");
const endTimeDisplay = document.getElementById("endTimeDisplay");
const setupBtn = document.getElementById("setupBtn");
const resetBtn = document.getElementById("resetBtn");
const setupOverlay = document.getElementById("setupOverlay");
const closeModalBtn = document.getElementById("closeModalBtn");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const examTitleInput = document.getElementById("examTitleInput");
const examTitleHeader = document.getElementById("examTitleHeader");
const hoursInput = document.getElementById("hoursInput");
const minutesInput = document.getElementById("minutesInput");

let currentDurationMs = 25 * 60 * 1000;
let elapsedMs = 0;
let runStartedAt = null;
let isRunning = false;
let timerId = null;
let sessionStartWallClock = null;
let sessionEndWallClock = null;

const hoursSegment = document.getElementById("hoursSegment");
const hoursValue = document.getElementById("hoursValue");
const minutesValue = document.getElementById("minutesValue");
const secondsValue = document.getElementById("secondsValue");

function renderCountdown() {
    const remainingMs = getRemainingMs();
    const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    hoursValue.textContent = hours;
    minutesValue.textContent = String(minutes).padStart(2, "0");
    secondsValue.textContent = String(seconds).padStart(2, "0");

    // hide the "h" segment entirely when there are no hours left
    hoursSegment.style.display = hours > 0 ? "flex" : "none";
}

function formatDisplayTime(date) {
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const suffix = hours >= 12 ? "PM" : "AM";
    const normalizedHours = ((hours + 11) % 12) + 1;
    return `${normalizedHours}:${minutes} ${suffix}`;
}

function renderCurrentTime() {
    currentTimeDisplay.textContent = formatDisplayTime(
        new Date(),
    ).toLowerCase();
}

// Single source of truth: how much time has actually elapsed, right now.
function getElapsedMs() {
    if (isRunning && runStartedAt !== null) {
        return elapsedMs + (Date.now() - runStartedAt);
    }
    return elapsedMs;
}

function getRemainingMs() {
    return Math.max(0, currentDurationMs - getElapsedMs());
}

function updateMetaTimes() {
    if (sessionStartWallClock)
        startTimeDisplay.textContent = formatDisplayTime(sessionStartWallClock);
    if (sessionEndWallClock)
        endTimeDisplay.textContent = formatDisplayTime(sessionEndWallClock);
}

function persistState() {
    const state = {
        title: examTitleHeader.textContent || "",
        hours: Number(hoursInput.value || 0),
        minutes: Number(minutesInput.value || 0),
        currentDurationMs,
        elapsedMs: getElapsedMs(),
        isRunning,
        runStartedAt,
        sessionStartWallClock: sessionStartWallClock
            ? sessionStartWallClock.getTime()
            : null,
        sessionEndWallClock: sessionEndWallClock
            ? sessionEndWallClock.getTime()
            : null,
        savedAt: Date.now(),
    };
    if (state.minutes == 0 && state.hours == 0) {
        state.minutes = 25;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function restoreState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        setTimerFromSettings();
        return;
    }

    try {
        const saved = JSON.parse(raw);
        if (!saved) {
            setTimerFromSettings();
            return;
        }

        const title = saved.title || "";
        examTitleHeader.textContent = title;
        examTitleInput.value = title === "" ? "" : title;

        const hourValue = Number(saved.hours ?? 0);
        let minuteValue = Number(saved.minutes ?? 0);
        if (hourValue == 0 && minuteValue == 0) {
            minuteValue = 25;
        }
        hoursInput.value = hourValue;
        minutesInput.value = minuteValue;

        currentDurationMs = Number(
            saved.currentDurationMs ||
                (hourValue * 60 + minuteValue) * 60 * 1000 ||
                25 * 60 * 1000,
        );

        if (saved.sessionStartWallClock) {
            sessionStartWallClock = new Date(saved.sessionStartWallClock);
        }

        if (saved.sessionEndWallClock) {
            sessionEndWallClock = new Date(saved.sessionEndWallClock);
        }

        const now = Date.now();
        elapsedMs = Number(saved.elapsedMs || 0);

        if (saved.isRunning && saved.runStartedAt) {
            const delta = now - saved.savedAt;
            elapsedMs = Math.min(currentDurationMs, elapsedMs + delta);
        }

        isRunning = false;

        runStartedAt = null;
        renderCountdown();
        updateMetaTimes();
        persistState();
    } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
        setTimerFromSettings();
    }
}

function setTimerFromSettings() {
    const totalMinutes = Math.max(
        0,
        Number(hoursInput.value || 0) * 60 + Number(minutesInput.value || 0),
    );
    currentDurationMs =
        totalMinutes > 0 ? totalMinutes * 60 * 1000 : 25 * 60 * 1000;

    stopTicking();
    elapsedMs = 0;
    runStartedAt = null;
    isRunning = false;
    sessionStartWallClock = null;
    sessionEndWallClock = null;

    renderCountdown();
    startTimeDisplay.textContent = "--:--";
    endTimeDisplay.textContent = "--:--";
    persistState();
}

function stopTicking() {
    if (timerId) {
        clearInterval(timerId);
        timerId = null;
    }
}
function showNotification(title, body) {
    new Notification(title, { body, icon: "icon.png" });
}
function tick() {
    renderCountdown();
    persistState();

    if (getRemainingMs() <= 0) {
        isRunning = false;
        runStartedAt = null;
        stopTicking();
        renderCountdown();
        persistState();
        resetTimer()
        showNotification("Time's up!", "Your timer has finished.");
    }
}

function startTimer() {
    if (isRunning) return;
    if (getRemainingMs() <= 0) return;

    runStartedAt = Date.now();
    isRunning = true;
    startButton.textContent = "Start";

    if (!sessionStartWallClock) {
        sessionStartWallClock = new Date(Date.now() - elapsedMs);
    }

    const remaining = getRemainingMs();
    sessionEndWallClock = new Date(Date.now() + remaining);
    updateMetaTimes();

    stopTicking();
    timerId = setInterval(tick, 250);
    tick();
}

function pauseTimer() {
    if (!isRunning) return;

    elapsedMs = getElapsedMs();
    isRunning = false;
    runStartedAt = null;
    startButton.textContent = "Restart";

    stopTicking();
    renderCountdown();
    sessionStartWallClock = new Date(Date.now() - elapsedMs);
    sessionEndWallClock = new Date(Date.now() + getRemainingMs());
    updateMetaTimes();
    persistState();
}

function resetTimer() {
    stopTicking();
    setTimerFromSettings();
    startButton.textContent = "Start";
}

function updateExamTitleDisplay() {
    const title = (examTitleInput.value || "").trim();
    examTitleHeader.textContent = title || "";
}

function openModal() {
    examTitleInput.value =
        examTitleHeader.textContent === "Exam Timer"
            ? ""
            : examTitleHeader.textContent;
    setupOverlay.classList.add("visible");
    setupOverlay.setAttribute("aria-hidden", "false");
}

function closeModal() {
    setupOverlay.classList.remove("visible");
    setupOverlay.setAttribute("aria-hidden", "true");
}

setupBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);

saveSettingsBtn.addEventListener("click", () => {
    const hourValue = Number(hoursInput.value || 0);
    const minuteValue = Number(minutesInput.value || 0);
    const totalMinutes = hourValue * 60 + minuteValue;

    if (!(Number.isFinite(totalMinutes) && totalMinutes > 0)) {
        hoursInput.value = 0;
        minutesInput.value = 25;
    }

    updateExamTitleDisplay();
    setTimerFromSettings();
    closeModal();
});

resetBtn.addEventListener("click", resetTimer);

hoursInput.addEventListener("input", () => {
    if (Number(hoursInput.value) < 0) hoursInput.value = 0;
});

minutesInput.addEventListener("input", () => {
    if (Number(minutesInput.value) < 0) minutesInput.value = 0;
    if (Number(minutesInput.value) > 59) minutesInput.value = 59;
});

window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && setupOverlay.classList.contains("visible")) {
        closeModal();
    }
});

window.addEventListener("beforeunload", persistState);

renderCurrentTime();
setInterval(renderCurrentTime, 1000);
restoreState();

const startButton = document.createElement("button");
startButton.id = "startBtn";
startButton.type = "button";
startButton.className = "timer-btn";
startButton.textContent = isRunning ? "Start" : "Restart";
startButton.addEventListener("click", startTimer);

const pauseButton = document.createElement("button");
pauseButton.id = "pauseBtn";
pauseButton.type = "button";
pauseButton.className = "timer-btn";
pauseButton.textContent = "Pause";
pauseButton.addEventListener("click", pauseTimer);

const controls = document.createElement("div");
controls.className = "timer-controls";
controls.appendChild(startButton);
controls.appendChild(pauseButton);

document.getElementById("timerCard").appendChild(controls);
