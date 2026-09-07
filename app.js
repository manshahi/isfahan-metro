let stationsList = [];
let scheduleData = null;

const originSelect = document.getElementById('originSelect');
const destSelect = document.getElementById('destSelect');
const timeInput = document.getElementById('timeInput');
const nowBtn = document.getElementById('nowBtn');

// ۱. بارگذاری اطلاعات از schedule.json
async function loadScheduleData() {
    try {
        const response = await fetch('schedule.json?v=' + new Date().getTime());
        scheduleData = await response.json();
        
        stationsList = scheduleData.stations || [];
        initDropdowns();

        document.getElementById('updateStatus').innerText = `آخرین بروزرسانی جدول: ${scheduleData.last_updated}`;
        setCurrentTime();
    } catch (err) {
        console.error('خطا در بارگذاری داده‌ها:', err);
        document.getElementById('updateStatus').innerText = 'خطا در بارگذاری جدول اطلاعات آنلاین';
    }
}

// ۲. مقداردهی اولیه منوها
function initDropdowns() {
    originSelect.innerHTML = '';
    destSelect.innerHTML = '';

    stationsList.forEach((st, idx) => {
        originSelect.add(new Option(st.name, idx));
        destSelect.add(new Option(st.name, idx));
    });

    if (stationsList.length > 15) {
        originSelect.value = 10; // تختی
        destSelect.value = 15;  // آزادی
    }
}

function toMinutes(tStr) {
    const [h, m] = tStr.split(':').map(Number);
    return h * 60 + m;
}

function toTimeString(m) {
    const h = Math.floor(m / 60) % 24;
    const mins = m % 60;
    return `${String(h).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function setCurrentTime() {
    const d = new Date();
    timeInput.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    calculateRoute();
}

// ۳. محاسبه مسیر و نمایش زمان‌بندی
function calculateRoute() {
    if (!scheduleData || !stationsList.length) return;

    const originIdx = parseInt(originSelect.value);
    const destIdx = parseInt(destSelect.value);
    const userTimeStr = timeInput.value;

    if (isNaN(originIdx) || isNaN(destIdx) || !userTimeStr) return;

    if (originIdx === destIdx) {
        document.getElementById('routeTitle').innerText = "مبدا و مقصد یکسان است!";
        document.getElementById('stationCount').innerText = "0";
        document.getElementById('travelTime').innerText = "0 دقیقه";
        document.getElementById('nextTrainTime').innerText = "-";
        document.getElementById('arrivalTime').innerText = "-";
        document.getElementById('scheduleTableBody').innerHTML = "";
        return;
    }

    // تشخیص روز جمعه (5 در JS)
    const today = new Date();
    const isFriday = today.getDay() === 5;
    const activeSchedule = isFriday ? scheduleData.friday : scheduleData.weekday;

    const isSouthbound = originIdx < destIdx;
    const stationCount = Math.abs(destIdx - originIdx);
    const originSt = stationsList[originIdx];
    const destSt = stationsList[destIdx];

    const travelMinutes = isSouthbound 
        ? Math.abs(destSt.offsetSouth - originSt.offsetSouth)
        : Math.abs((40 - destSt.offsetSouth) - (40 - originSt.offsetSouth));

    const baseTimes = isSouthbound ? activeSchedule.southTimes : activeSchedule.northTimes;
    const offset = isSouthbound ? originSt.offsetSouth : (40 - originSt.offsetSouth);

    const stationSchedule = baseTimes.map(t => toTimeString(toMinutes(t) + offset));
    const userMin = toMinutes(userTimeStr);

    let nextTrainMin = -1;
    let firstUpcomingIdx = -1;

    for (let i = 0; i < stationSchedule.length; i++) {
        const trainMin = toMinutes(stationSchedule[i]);
        if (trainMin >= userMin) {
            nextTrainMin = trainMin;
            firstUpcomingIdx = i;
            break;
        }
    }

    const dirText = isSouthbound ? "به سمت جنوب (صفه)" : "به سمت شمال (قدس)";
    const dayTag = isFriday ? " [برنامه روز جمعه]" : " [برنامه روزهای عادی]";
    document.getElementById('routeTitle').innerText = `از ${originSt.name} به ${destSt.name} (${dirText})${dayTag}`;
    document.getElementById('stationCount').innerText = `${stationCount} ایستگاه`;
    document.getElementById('travelTime').innerText = `حدود ${travelMinutes} دقیقه`;

    if (nextTrainMin !== -1) {
        const diffMin = nextTrainMin - userMin;
        const diffText = diffMin === 0 ? "هم‌اکنون" : `${diffMin} دقیقه دیگر`;
        document.getElementById('nextTrainTime').innerText = `${toTimeString(nextTrainMin)} (${diffText})`;
        document.getElementById('arrivalTime').innerText = toTimeString(nextTrainMin + travelMinutes);
    } else {
        document.getElementById('nextTrainTime').innerText = "پایان حرکت روزانه";
        document.getElementById('arrivalTime').innerText = "-";
    }

    const tbody = document.getElementById('scheduleTableBody');
    tbody.innerHTML = '';
    stationSchedule.forEach((t, i) => {
        const tr = document.createElement('tr');
        if (i === firstUpcomingIdx) tr.className = 'highlight-row';
        
        const m = toMinutes(t);
        let status = m < userMin ? "حرکت کرده" : (i === firstUpcomingIdx ? "⭐ قطار بعدی" : "آینده");
        
        tr.innerHTML = `<td>${i + 1}</td><td><strong>${t}</strong></td><td>${status}</td>`;
        tbody.appendChild(tr);
    });
}

// رویدادها
originSelect.addEventListener('change', calculateRoute);
destSelect.addEventListener('change', calculateRoute);
timeInput.addEventListener('input', calculateRoute);
nowBtn.addEventListener('click', setCurrentTime);

// اجرای اولیه
loadScheduleData();