// ================================================================
// MODULE: day-events.js
// Gestión de eventos de día en el calendario (vacaciones, libre, etc.)
// y función openGoogleMaps
// ================================================================

function showEventOptions(dateStr) {
// Create modal overlay
const overlay = document.createElement('div');
overlay.style.cssText = `
position: fixed;
top: 0;
left: 0;
width: 100%;
height: 100%;
background: rgba(0, 0, 0, 0.5);
z-index: 10000;
display: flex;
align-items: center;
justify-content: center;
`;

// Create modal content
const modal = document.createElement('div');
modal.style.cssText = `
background: white;
border-radius: 12px;
padding: 24px;
max-width: 300px;
width: 90%;
box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
`;

const date = new Date(dateStr);
const formattedDate = date.toLocaleDateString('es-ES', { 
weekday: 'long', 
day: 'numeric', 
month: 'long' 
});

modal.innerHTML = `
<h3 style="margin: 0 0 16px 0; color: #2d333a; text-align: center;">Agregar Evento</h3>
<p style="margin: 0 0 20px 0; color: #666; text-align: center; font-size: 14px;">${formattedDate}</p>

<div style="display: grid; gap: 12px;">
<button class="event-option" data-type="agendar-cita" style="background: #10a37f; color: white;">
<svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
<rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
<path d="m9 14 2 2 4-4"></path>
</svg>
Agendar Cita
</button>

<button class="event-option" data-type="vacaciones" style="background: #dc2626; color: white;">
<svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
</svg>
Vacaciones
</button>

<button class="event-option" data-type="libre" style="background: #059669; color: white;">
<svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
</svg>
Libre
</button>

<button class="event-option" data-type="compromiso" style="background: #d97706; color: white;">
<svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<circle cx="12" cy="12" r="10"></circle>
<polyline points="12,6 12,12 16,14"></polyline>
</svg>
Compromiso
</button>

<button class="event-option" data-type="salida" style="background: #7c3aed; color: white;">
<svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
</svg>
Salida
</button>

<button class="event-option" data-type="sin-pega" style="background: #6b7280; color: white;">
<svg style="width: 20px; height: 20px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
<path d="M18 6L6 18M6 6l12 12"></path>
</svg>
Sin Pega
</button>
</div>

<button onclick="this.closest('.event-modal-overlay').remove()" style="
width: 100%;
background: var(--bg-tertiary);
color: var(--text-tertiary);
border: none;
border-radius: 8px;
padding: 12px;
margin-top: 16px;
font-weight: 600;
cursor: pointer;
">Cancelar</button>
`;

// Add event listeners to options
const options = modal.querySelectorAll('.event-option');
options.forEach(option => {
option.style.cssText += `
border: none;
border-radius: 8px;
padding: 12px;
font-weight: 600;
cursor: pointer;
display: flex;
align-items: center;
gap: 8px;
transition: all 0.2s;
`;

option.addEventListener('click', () => {
const eventType = option.getAttribute('data-type');

if (eventType === 'agendar-cita') {
// Navigate to schedule view instead of adding an event
overlay.remove();
showView('schedule');
} else {
// Add regular event to the day
addEventToDay(dateStr, eventType);
overlay.remove();
}
});

option.addEventListener('mouseover', () => {
option.style.transform = 'translateY(-1px)';
option.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
});

option.addEventListener('mouseout', () => {
option.style.transform = 'translateY(0)';
option.style.boxShadow = 'none';
});
});

overlay.className = 'event-modal-overlay';
overlay.appendChild(modal);
document.body.appendChild(overlay);

// Close on overlay click
overlay.addEventListener('click', (e) => {
if (e.target === overlay) {
overlay.remove();
}
});
}

// Function to add event to day
function addEventToDay(dateStr, eventType) {
let events = JSON.parse(localStorage.getItem('dayEvents') || '{}');
events[dateStr] = eventType;
localStorage.setItem('dayEvents', JSON.stringify(events));

// Regenerate calendar to show the event
generateWeeklyCalendar();
}

// Function to get event for day
function getDayEvent(dateStr) {
const events = JSON.parse(localStorage.getItem('dayEvents') || '{}');
return events[dateStr] || null;
}

// Function to remove event from day
function removeEventFromDay(dateStr) {
let events = JSON.parse(localStorage.getItem('dayEvents') || '{}');
delete events[dateStr];
localStorage.setItem('dayEvents', JSON.stringify(events));

// Regenerate calendar to remove the event
generateWeeklyCalendar();
}

// Function to open Google Maps
function openGoogleMaps(address, city) {
const fullAddress = `${address}, ${city}, Utah`;
const encodedAddress = encodeURIComponent(fullAddress);

// Try to open in Google Maps app first (mobile), then web
const mapsAppUrl = `comgooglemaps://?q=${encodedAddress}`;
const mapsWebUrl = `https://www.google.com/maps/search/${encodedAddress}`;

// Detect if we're on mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

if (isMobile) {
// Try to open native app first
const iframe = document.createElement('iframe');
iframe.style.display = 'none';
iframe.src = mapsAppUrl;
document.body.appendChild(iframe);

// Fallback to web after a short delay
setTimeout(() => {
document.body.removeChild(iframe);
window.open(mapsWebUrl, '_blank');
}, 500);
} else {
// Desktop - open in new tab
window.open(mapsWebUrl, '_blank');
}
}
