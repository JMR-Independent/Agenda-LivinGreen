// ================================================================
// MODULE: bento-ui.js
// Sliders animados del bento grid y carga de datos (hoy, analytics)
// ================================================================

function initCalendarSlider() {
const slidesContainer = document.querySelector('.calendar-slides');
if (!slidesContainer) return;

let isSecondSlide = false;

function getRandomInterval() {
return Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000; // 3-5 segundos
}

function toggleSlide() {
if (isSecondSlide) {
// Volver al primer slide
slidesContainer.classList.remove('show-second');
} else {
// Ir al segundo slide
slidesContainer.classList.add('show-second');
}

isSecondSlide = !isSecondSlide;

// Schedule next transition with random interval
setTimeout(toggleSlide, getRandomInterval());
}

// Start the slider after a random initial delay
setTimeout(toggleSlide, getRandomInterval());
}

// Update mini calendar in bento grid with current date
function updateMiniCalendar() {
const now = new Date();
const year = now.getFullYear();
const month = now.getMonth();
const today = now.getDate();

// Month names in English
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
'July', 'August', 'September', 'October', 'November', 'December'];

// Update month header
const monthHeader = document.getElementById('mini-calendar-month');
if (monthHeader) {
monthHeader.textContent = `${monthNames[month]} ${year}`;
}

// Get first day of month and number of days
const firstDay = new Date(year, month, 1);
const lastDay = new Date(year, month + 1, 0);
const daysInMonth = lastDay.getDate();

// Get day of week for first day (0 = Sunday, 1 = Monday, etc.)
// Convert to Monday = 0
let firstDayOfWeek = firstDay.getDay();
firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

// Generate calendar dates
const datesContainer = document.getElementById('mini-calendar-dates');
if (datesContainer) {
datesContainer.innerHTML = '';

// Add empty cells for days before first of month
for (let i = 0; i < firstDayOfWeek; i++) {
const emptyCell = document.createElement('div');
datesContainer.appendChild(emptyCell);
}

// Add days of month
for (let day = 1; day <= daysInMonth; day++) {
const dayCell = document.createElement('div');
dayCell.textContent = day;

// Mark today
if (day === today) {
dayCell.className = 'today';
}

datesContainer.appendChild(dayCell);
}
}
}

// Update "Citas de hoy" header with current date
function updateTodayAppointmentsHeader() {
const now = new Date();
const day = now.getDate();

// Month names abbreviated in English
const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const month = monthNamesShort[now.getMonth()];

// Update header
const header = document.getElementById('today-appointments-header');
if (header) {
header.textContent = `Citas de hoy - ${month} ${day}`;
}
}

// Initialize calendar slider when DOM is ready
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', initCalendarSlider);
document.addEventListener('DOMContentLoaded', updateMiniCalendar);
document.addEventListener('DOMContentLoaded', updateTodayAppointmentsHeader);
} else {
initCalendarSlider();
updateMiniCalendar();
updateTodayAppointmentsHeader();
}

// Analytics Auto Slider
function initAnalyticsSlider() {
const slidesContainer = document.querySelector('.analytics-slides');
if (!slidesContainer) return;

let isSecondSlide = false;

function getRandomInterval() {
return Math.floor(Math.random() * (5500 - 3500 + 1)) + 3500; // 3.5-5.5 segundos
}

function toggleSlide() {
if (isSecondSlide) {
// Volver al primer slide
slidesContainer.classList.remove('show-second');
} else {
// Ir al segundo slide
slidesContainer.classList.add('show-second');
}

isSecondSlide = !isSecondSlide;

// Schedule next transition with random interval
setTimeout(toggleSlide, getRandomInterval());
}

// Start the slider after a random initial delay
setTimeout(toggleSlide, getRandomInterval());
}

// Load today's total amount
async function loadTodayTotal() {
try {
const appointments = await getAppointmentsFromSupabase();

// Get today's date in LOCAL timezone (YYYY-MM-DD format)
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');
const todayStr = `${year}-${month}-${day}`;

console.log('📅 Today date (local):', todayStr);

// Filter appointments for today and calculate total
const todayAppointments = appointments.filter(apt => {
if (!apt.date) return false;

// Extract YYYY-MM-DD from appointment date
let aptDate;
if (apt.date.includes('T')) {
aptDate = apt.date.split('T')[0];
} else {
aptDate = apt.date.split(' ')[0];
}

const isToday = aptDate === todayStr;
if (isToday) {
console.log('📌 Today appointment found:', apt.name, apt.price, apt.date);
}
return isToday;
});

const todayTotal = todayAppointments.reduce((sum, apt) => {
return sum + (parseFloat(apt.price) || 0);
}, 0);

// Update the amount display
const todayAmountEl = document.getElementById('today-total-amount');
if (todayAmountEl) {
todayAmountEl.textContent = `$${Math.round(todayTotal)}`;
}

// Update the progress ring (0-500 range)
const progressRing = document.getElementById('today-progress-ring');
if (progressRing) {
const maxAmount = 500;
const progress = Math.min(todayTotal / maxAmount, 1); // Cap at 100%
const circumference = 377;
const offset = circumference * (1 - progress);

progressRing.style.strokeDashoffset = offset;

console.log('🔵 Progress ring updated:', {
todayTotal,
progress: `${(progress * 100).toFixed(1)}%`,
offset: offset.toFixed(1)
});
}

// Update the appointments list
const appointmentsList = document.getElementById('today-appointments-list');
if (appointmentsList) {
if (todayAppointments.length === 0) {
appointmentsList.innerHTML = `
<div style="text-align:center; padding: 18px 8px 10px; color: rgba(255,255,255,0.45);">
<svg style="width:28px; height:28px; margin-bottom:8px; opacity:0.5;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
</svg>
<div style="font-size:13px; font-weight:500;">Día libre</div>
<div style="font-size:11px; margin-top:2px; opacity:0.7;">Sin citas agendadas hoy</div>
</div>`;
} else {
// Show up to 3 appointments
const displayAppointments = todayAppointments.slice(0, 3);
appointmentsList.innerHTML = displayAppointments.map((apt, index) => {
const name = apt.name || 'Cliente';
const city = apt.city || 'Sin ciudad';
return `<div class="appointment-item">${index + 1}. ${name} - ${city}</div>`;
}).join('');

// If there are more than 3, show a count
if (todayAppointments.length > 3) {
const remaining = todayAppointments.length - 3;
appointmentsList.innerHTML += `<div class="appointment-item" style="color: rgba(200, 200, 200, 0.6); font-style: italic;">+${remaining} más...</div>`;
}
}
}

// Calculate and display tomorrow's cities
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowYear = tomorrow.getFullYear();
const tomorrowMonth = String(tomorrow.getMonth() + 1).padStart(2, '0');
const tomorrowDay = String(tomorrow.getDate()).padStart(2, '0');
const tomorrowStr = `${tomorrowYear}-${tomorrowMonth}-${tomorrowDay}`;

const tomorrowAppointments = appointments.filter(apt => {
if (!apt.date) return false;
let aptDate;
if (apt.date.includes('T')) {
aptDate = apt.date.split('T')[0];
} else {
aptDate = apt.date.split(' ')[0];
}
return aptDate === tomorrowStr;
});

// Get unique cities for tomorrow
const tomorrowCities = new Set();
tomorrowAppointments.forEach(apt => {
if (apt.city) {
tomorrowCities.add(apt.city);
}
});

const tomorrowCitiesEl = document.getElementById('tomorrow-cities');
if (tomorrowCitiesEl) {
if (tomorrowCities.size === 0) {
tomorrowCitiesEl.textContent = 'No hay citas programadas';
tomorrowCitiesEl.style.color = 'rgba(200, 200, 200, 0.6)';
} else {
const citiesArray = Array.from(tomorrowCities);
tomorrowCitiesEl.textContent = citiesArray.join(' y ');
tomorrowCitiesEl.style.color = 'rgba(180, 220, 255, 0.95)';
}
}

console.log('✅ Today total loaded:', {
todayStr,
todayTotal,
appointmentsCount: todayAppointments.length,
totalAppointments: appointments.length,
tomorrowStr,
tomorrowCities: Array.from(tomorrowCities)
});

} catch (error) {
console.error('❌ Error loading today total:', error);
// Keep default $0 on error
}
}

// Load real analytics data for bento card
async function loadBentoAnalytics() {
try {
// Use the SAME data source as Registro section
// Get appointments from OfflineDB (which loads from Supabase if online)
let appointments = await OfflineDB.getAppointments();

// If online, get from Supabase (same as loadClientRegistry does)
if (navigator.onLine) {
try {
const supabaseAppointments = await getAppointmentsFromSupabase();
if (supabaseAppointments && supabaseAppointments.length > 0) {
appointments = supabaseAppointments;
}
} catch (error) {
console.log('⚠️ Using offline data for bento analytics');
}
}

console.log('📊 Bento: Loaded appointments for analytics:', appointments.length);

// Filter: Only count appointments with valid client names (same as Registro does)
const validAppointments = appointments.filter(apt => apt.name && apt.name.trim());
console.log('📊 Bento: Valid client appointments (with names):', validAppointments.length);
console.log('📊 Bento: Filtered out (no name):', appointments.length - validAppointments.length);

// Calculate UNIQUE clients (by name)
const uniqueClientNames = new Set();
const clientFirstAppointment = {}; // Track first appointment date for each client

validAppointments.forEach(apt => {
const clientName = apt.name.toLowerCase().trim();
uniqueClientNames.add(clientName);

// Track first appointment date for this client
const aptDate = new Date(apt.date);
if (!clientFirstAppointment[clientName] || aptDate < clientFirstAppointment[clientName]) {
clientFirstAppointment[clientName] = aptDate;
}
});

const totalUniqueClients = uniqueClientNames.size;

// Get current month's appointments
const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();
const appointmentsThisMonth = validAppointments.filter(apt => {
const aptDate = new Date(apt.date);
return aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear;
}).length;

// Calculate NEW clients this month (clients whose first appointment is this month)
let newClientsThisMonth = 0;
for (const [clientName, firstDate] of Object.entries(clientFirstAppointment)) {
if (firstDate.getMonth() === currentMonth && firstDate.getFullYear() === currentYear) {
newClientsThisMonth++;
}
}

// Calculate unique cities
const uniqueCities = new Set();
validAppointments.forEach(apt => {
if (apt.city) uniqueCities.add(apt.city);
});
const activeCities = uniqueCities.size;

// Calculate unique services/jobs
const uniqueJobs = new Set();
validAppointments.forEach(apt => {
if (apt.job) {
// Jobs are stored as comma-separated string
const jobs = apt.job.split(',').map(j => j.trim());
jobs.forEach(job => {
if (job) uniqueJobs.add(job);
});
}
});
const totalServices = uniqueJobs.size;

// Update datos/analytics card
const totalClientsEl = document.getElementById('bento-total-clients');
const monthlyApptsEl = document.getElementById('bento-monthly-appts');
const activeCitiesEl = document.getElementById('bento-active-cities');
const totalServicesEl = document.getElementById('bento-total-services');

if (totalClientsEl) totalClientsEl.textContent = totalUniqueClients;
if (monthlyApptsEl) monthlyApptsEl.textContent = appointmentsThisMonth;
if (activeCitiesEl) activeCitiesEl.textContent = activeCities;
if (totalServicesEl) totalServicesEl.textContent = totalServices;

// Update registry card
const registryTotalEl = document.getElementById('registry-total-clients');
const registryNewEl = document.getElementById('registry-new-clients');

if (registryTotalEl) registryTotalEl.textContent = totalUniqueClients;
if (registryNewEl) registryNewEl.textContent = newClientsThisMonth;

console.log('✅ Bento analytics loaded:', {
totalUniqueClients,
newClientsThisMonth,
appointmentsThisMonth,
activeCities,
totalServices
});

} catch (error) {
console.error('❌ Error loading bento analytics:', error);
// Keep default values on error
}
}

// Registry Auto Slider
function initRegistrySlider() {
const slidesContainer = document.querySelector('.registry-slides');
if (!slidesContainer) return;

let isSecondSlide = false;

function getRandomInterval() {
return Math.floor(Math.random() * (5500 - 3500 + 1)) + 3500; // 3.5-5.5 segundos
}

function toggleSlide() {
if (isSecondSlide) {
slidesContainer.classList.remove('show-second');
} else {
slidesContainer.classList.add('show-second');
}

isSecondSlide = !isSecondSlide;
setTimeout(toggleSlide, getRandomInterval());
}

setTimeout(toggleSlide, getRandomInterval());
}

// Message cards sliders
// Nueva cita button slider
function initNuevaCitaSlider() {
const slides = document.getElementById('nueva-cita-slides');
if (!slides) return;
let isSecond = false;
function toggle() {
isSecond = !isSecond;
slides.classList.toggle('show-second', isSecond);
setTimeout(toggle, Math.floor(Math.random() * 2000) + 3000);
}
setTimeout(toggle, 2500);
}

// Initialize sliders and load data when DOM is ready
if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', () => {
initAnalyticsSlider();
initRegistrySlider();
initNuevaCitaSlider();

loadBentoAnalytics();
loadTodayTotal();
});
} else {
initAnalyticsSlider();
initRegistrySlider();
initNuevaCitaSlider();
loadBentoAnalytics();
loadTodayTotal();
}

