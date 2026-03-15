// ================================================================
// MODULE: receipt-url.js
// Detección de recibos en URL, auto-generación y display de recibos
// ================================================================

async function checkForReceiptInURL() {
const hash = window.location.hash;
const params = new URLSearchParams(window.location.search);
const path = window.location.pathname;

console.log('=== URL DETECTION DEBUG ===');
console.log('Full URL:', window.location.href);
console.log('Hash:', hash);
console.log('Search params:', window.location.search);
console.log('Path:', path);
console.log('Has r param:', params.has('r'));
if (params.has('r')) {
console.log('r param value:', params.get('r'));
}
console.log('========================');

// Check for receipt data format in hash
if (hash.startsWith('#receipt=')) {
try {
const encodedData = hash.replace('#receipt=', '');
const receiptData = JSON.parse(atob(encodedData));

// Create receipt page and replace current content
displayReceiptPage(receiptData);
return true; // Receipt displayed
} catch (error) {
console.error('Error loading receipt from hash:', error);
alert('Error cargando el recibo. El enlace puede estar dañado.');
return false;
}
}

// Check for short receipt ID format in hash (#RC001)
if (hash.startsWith('#RC')) {
try {
const shortId = hash.replace('#', '');
console.log('Looking for receipt short ID in localStorage:', shortId);

const receiptDataStr = localStorage.getItem(shortId);
if (receiptDataStr) {
const receiptData = JSON.parse(receiptDataStr);
console.log('Found receipt in localStorage:', receiptData);

// Create receipt page and replace current content
displayReceiptPage(receiptData);
return true; // Receipt displayed
} else {
console.error('Receipt not found in localStorage for short ID:', shortId);
alert('Recibo no encontrado. El enlace puede haber expirado.');
return false;
}
} catch (error) {
console.error('Error loading receipt from localStorage:', error);
alert('Error cargando el recibo. El enlace puede estar dañado.');
return false;
}
}

// Check for compressed receipt data in query params (?data=)
if (params.has('data')) {
try {
const encodedData = params.get('data');
console.log('Found compressed receipt data in URL');

const compressedData = JSON.parse(atob(encodedData));
console.log('Decoded compressed data:', compressedData);

// Reconstruct full receipt data from compressed format
const receiptData = {
receiptNumber: compressedData.n,
clientName: compressedData.c,
clientPhone: compressedData.p,
services: compressedData.s.map(s => ({ service: s.n, total: s.p })),
totalAmount: compressedData.t,
date: new Date().toISOString(), // Use current date
address: '', // Not included in compressed data
city: '' // Not included in compressed data
};

console.log('Reconstructed receipt data:', receiptData);

// AUTO-GENERATE the receipt (expert solution)
await autoGenerateReceiptPage(receiptData);
return true; // Receipt displayed
} catch (error) {
console.error('Error loading compressed receipt:', error);
alert('Error cargando el recibo. El enlace puede estar dañado.');
return false;
}
}

// Check for short receipt ID in query params (?id=) - legacy support
if (params.has('id')) {
try {
const shortId = params.get('id');
console.log('Found short receipt ID in URL:', shortId);

// Try to find receipt data in localStorage
let receiptDataStr = localStorage.getItem(`receipt_${shortId}`);

// If not found, try backup keys
if (!receiptDataStr) {
console.log('Trying backup storage keys...');
const possibleKeys = [
`RC_${shortId}`,
`RC_${shortId.slice(0, 3)}`,
shortId,
`receipt_${shortId.slice(0, 7)}`
];

for (const key of possibleKeys) {
receiptDataStr = localStorage.getItem(key);
if (receiptDataStr) {
console.log('Found receipt data with backup key:', key);
break;
}
}
}

if (receiptDataStr) {
const receiptData = JSON.parse(receiptDataStr);
console.log('Found receipt data:', receiptData);

// Create receipt page and replace current content
displayReceiptPage(receiptData);
return true; // Receipt displayed
} else {
console.error('Receipt not found for ID:', shortId);
alert('Recibo no encontrado. El enlace puede haber expirado o necesita ser generado desde el mismo dispositivo.');
return false;
}
} catch (error) {
console.error('Error loading receipt by ID:', error);
alert('Error cargando el recibo. El enlace puede estar dañado.');
return false;
}
}

// Check for self-contained receipt data in query params (?receipt=) - legacy support
if (params.has('receipt')) {
try {
const encodedData = params.get('receipt');
console.log('Found self-contained receipt data in URL');

const receiptData = JSON.parse(atob(encodedData));
console.log('Decoded receipt data:', receiptData);

// Create receipt page and replace current content
displayReceiptPage(receiptData);
return true; // Receipt displayed
} catch (error) {
console.error('Error loading self-contained receipt:', error);
alert('Error cargando el recibo. El enlace puede estar dañado.');
return false;
}
}

// Check for ultra-short receipt ID in URL path (bit.ly/RZR123ABC redirects to /r/123ABC)
const pathMatch = path.match(/\/r\/([A-Z0-9]{6})$/);
if (pathMatch) {
try {
const shortId = pathMatch[1];
console.log('Looking for ultra-short receipt ID:', shortId);

// Try localStorage first
let receiptDataStr = localStorage.getItem(`receipt_${shortId}`);

// If not found, try server
if (!receiptDataStr) {
console.log('Not found in localStorage, trying server...');
try {
const response = await fetch(`/api/get-receipt/${shortId}`);
if (response.ok) {
const serverData = await response.json();
receiptDataStr = JSON.stringify(serverData.data || serverData);
}
} catch (e) {
console.log('Server not available');
}
}

if (receiptDataStr) {
const receiptData = JSON.parse(receiptDataStr);
console.log('Found receipt data, AUTO-GENERATING PDF:', receiptData);

// EXPERT SOLUTION: Auto-generate receipt page immediately
await autoGenerateReceiptPage(receiptData);
return true; // Receipt displayed
} else {
console.error('Receipt not found for ID:', shortId);
document.body.innerHTML = `
<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
<h2>🔍 Recibo no encontrado</h2>
<p>El enlace puede haber expirado o el recibo fue generado en otro dispositivo.</p>
<a href="/" style="background: #10a37f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Volver al inicio</a>
</div>`;
return true; // We handled it
}
} catch (error) {
console.error('Error loading ultra-short receipt:', error);
document.body.innerHTML = `
<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
<h2>❌ Error</h2>
<p>No se pudo cargar el recibo. El enlace puede estar dañado.</p>
<a href="/" style="background: #10a37f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Volver al inicio</a>
</div>`;
return true; // We handled it
}
}

// Check for receipt ID format in query params (?r=) - LEGACY SUPPORT
if (params.has('r')) {
try {
const receiptId = params.get('r');
console.log('Looking for receipt ID:', receiptId);

// Try localStorage first
let receiptDataStr = localStorage.getItem(`receipt_${receiptId}`);

// If not found, try server
if (!receiptDataStr) {
console.log('Not found in localStorage, trying server...');
try {
const response = await fetch(`/api/get-receipt/${receiptId}`);
if (response.ok) {
const serverData = await response.json();
receiptDataStr = JSON.stringify(serverData.data);
}
} catch (e) {
console.log('Server not available');
}
}

if (receiptDataStr) {
const receiptData = JSON.parse(receiptDataStr);
console.log('Found receipt data, AUTO-GENERATING PDF:', receiptData);

// EXPERT SOLUTION: Auto-generate receipt page immediately
await autoGenerateReceiptPage(receiptData);
return true; // Receipt displayed
} else {
console.error('Receipt not found for ID:', receiptId);
document.body.innerHTML = `
<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
<h2>🔍 Recibo no encontrado</h2>
<p>El enlace puede haber expirado o el recibo fue generado en otro dispositivo.</p>
<a href="/" style="background: #10a37f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Volver al inicio</a>
</div>`;
return true; // We handled it
}
} catch (error) {
console.error('Error loading receipt:', error);
document.body.innerHTML = `
<div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
<h2>❌ Error</h2>
<p>No se pudo cargar el recibo. El enlace puede estar dañado.</p>
<a href="/" style="background: #10a37f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Volver al inicio</a>
</div>`;
return true; // We handled it
}
}

// Check for receipt ID format in path (/RC220)
const legacyPathMatch = path.match(/\/RC(\d+)$/);
if (legacyPathMatch) {
try {
const shortId = `RC${legacyPathMatch[1]}`;
console.log('Looking for receipt short ID in localStorage:', shortId);

const receiptDataStr = localStorage.getItem(shortId);
if (receiptDataStr) {
const receiptData = JSON.parse(receiptDataStr);
console.log('Found receipt in localStorage:', receiptData);

// Create receipt page and replace current content
displayReceiptPage(receiptData);
return true; // Receipt displayed
} else {
console.error('Receipt not found in localStorage for short ID:', shortId);
alert('Recibo no encontrado. El enlace puede haber expirado.');
return false;
}
} catch (error) {
console.error('Error loading receipt from localStorage:', error);
alert('Error cargando el recibo. El enlace puede estar dañado.');
return false;
}
}

// Check if we should show the latest receipt (when no specific receipt requested)
if (path === '/' || path === '/receipt' || path === '') {
const latestReceipt = localStorage.getItem('latestReceipt');
const timestamp = localStorage.getItem('latestReceiptTimestamp');

// Show latest receipt if it's recent (within 24 hours)
if (latestReceipt && timestamp) {
const ageInHours = (Date.now() - parseInt(timestamp)) / (1000 * 60 * 60);
if (ageInHours < 24) {
try {
const receiptData = JSON.parse(latestReceipt);
console.log('Showing latest receipt:', receiptData);
displayReceiptPage(receiptData);
return true;
} catch (error) {
console.error('Error loading latest receipt:', error);
}
}
}
}

return false; // No receipt in URL
}

// EXPERT SOLUTION: Auto-generate receipt page with PDF ready
async function autoGenerateReceiptPage(data) {
console.log('AUTO-GENERATING receipt page for:', data);

// Clear the page
document.body.innerHTML = '';
document.body.style.fontFamily = 'Arial, sans-serif';
document.body.style.margin = '0';
document.body.style.padding = '20px';
document.body.style.background = '#f5f5f5';

// Show loading first
document.body.innerHTML = `
<div style="text-align: center; padding: 50px;">
<h2>🧾 Generando tu recibo...</h2>
<p>Un momento por favor</p>
</div>`;

// Wait a moment for visual feedback
await new Promise(resolve => setTimeout(resolve, 1000));

// Auto-generate the receipt display
displayReceiptPage(data);

// Auto-generate PDF after showing receipt
setTimeout(async () => {
if (typeof window.jspdf !== 'undefined') {
console.log('Auto-generating PDF...');
// Create a download button that works
const downloadBtn = document.createElement('button');
downloadBtn.innerHTML = '📄 Descargar PDF';
downloadBtn.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10a37f; color: white; border: none; padding: 15px 25px; border-radius: 8px; font-size: 16px; cursor: pointer; z-index: 1000; box-shadow: 0 4px 12px rgba(0,0,0,0.15);';
downloadBtn.onclick = () => generatePDFFromDataHTML(data);
document.body.appendChild(downloadBtn);
}
}, 500);
}

// Display receipt page  
function displayReceiptPage(data) {
const receiptDate = new Date(data.date).toLocaleDateString('es-ES');

// Create simple receipt page
document.body.innerHTML = '';
document.body.style.fontFamily = 'Arial, sans-serif';
document.body.style.margin = '0';
document.body.style.padding = '20px';
document.body.style.background = '#f5f5f5';

const container = document.createElement('div');
container.style.maxWidth = '800px';
container.style.margin = '0 auto';
container.style.background = 'white';
container.style.padding = isMobile ? '15px' : '30px';
container.style.borderRadius = '10px';
container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';

// Add mobile responsive styling to body
if (isMobile) {
document.body.style.padding = '10px';
}

// Header - Mobile optimized
const header = document.createElement('div');
header.style.background = 'linear-gradient(135deg, #444 60%, #00bfff 60%)';
header.style.color = 'white';
header.style.padding = window.innerWidth <= 768 ? '20px' : '30px';
header.style.borderRadius = '10px';
header.style.marginBottom = '20px';

// Check if mobile
const isMobile = window.innerWidth <= 768;

header.innerHTML = `
<div style="display: ${isMobile ? 'block' : 'flex'}; ${isMobile ? '' : 'justify-content: space-between;'}">
<div style="${isMobile ? 'text-align: center; margin-bottom: 20px;' : ''}">
<h1 style="margin: 0; color: #00bfff; font-size: ${isMobile ? '18px' : '24px'};">${getBC().emoji} ${getBC().name.toUpperCase()}</h1>
<p style="margin: 2px 0; font-size: ${isMobile ? '11px' : '14px'};">📞 ${getBC().phone}</p>
${isMobile ? '' : `<p style="margin: 2px 0; font-size: 14px;">✉️ ${getBC().email}</p>`}
</div>
<div style="text-align: ${isMobile ? 'center' : 'right'};">
<h2 style="margin: 0; font-size: ${isMobile ? '24px' : '32px'}; color: #333;">INVOICE</h2>
<p style="font-size: ${isMobile ? '12px' : '14px'};">Invoice No: ${data.receiptNumber}</p>
<p style="font-size: ${isMobile ? '12px' : '14px'};">Date: ${receiptDate}</p>
<div style="background: #333; padding: ${isMobile ? '8px 12px' : '10px'}; border-radius: 5px; margin-top: 10px; display: inline-block;">
<strong style="font-size: ${isMobile ? '16px' : '18px'};">TOTAL: $${data.totalAmount.toFixed(2)}</strong>
</div>
</div>
</div>
`;

// Client info
const clientInfo = document.createElement('div');
clientInfo.style.marginBottom = '30px';
clientInfo.innerHTML = `
<h3 style="color: #333; margin-bottom: 15px;">BILL TO</h3>
<p style="margin: 5px 0; font-weight: bold;">${data.clientName.toUpperCase()}</p>
<p style="margin: 5px 0;">📞 ${data.clientPhone}</p>
${data.address ? `<p style="margin: 5px 0;">📍 ${data.address}</p>` : ''}
${data.city ? `<p style="margin: 5px 0;">${data.city}</p>` : ''}
`;

// Services table - Mobile optimized
const servicesTable = document.createElement('div');
servicesTable.style.marginBottom = '20px';
servicesTable.style.overflowX = 'auto';

if (isMobile) {
// Mobile: Stack format instead of table
let mobileServicesHTML = '<div>';
data.services.forEach((service, index) => {
mobileServicesHTML += `
<div style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'}; padding: 15px; border: 1px solid #ddd; margin-bottom: 10px; border-radius: 8px;">
<div style="font-weight: bold; color: #333; margin-bottom: 8px;">${service.service}</div>
<div style="display: flex; justify-content: space-between; font-size: 14px;">
<span>Cantidad: 1</span>
<span style="font-weight: bold; color: #00bfff;">$${service.total.toFixed(2)}</span>
</div>
</div>
`;
});
mobileServicesHTML += '</div>';
servicesTable.innerHTML = mobileServicesHTML;
} else {
// Desktop: Table format
const table = document.createElement('table');
table.style.width = '100%';
table.style.borderCollapse = 'collapse';

let tableHTML = `
<thead>
<tr style="background: #00bfff; color: white;">
<th style="padding: 15px; text-align: left; border: 1px solid #ddd;">Service</th>
<th style="padding: 15px; text-align: center; border: 1px solid #ddd;">Qty</th>
<th style="padding: 15px; text-align: right; border: 1px solid #ddd;">Unit Price</th>
<th style="padding: 15px; text-align: right; border: 1px solid #ddd;">Total</th>
</tr>
</thead>
<tbody>
`;

data.services.forEach((service, index) => {
const rowColor = index % 2 === 0 ? '#f8f9fa' : 'white';
tableHTML += `
<tr style="background: ${rowColor};">
<td style="padding: 12px; border: 1px solid #ddd;">${service.service}</td>
<td style="padding: 12px; text-align: center; border: 1px solid #ddd;">1</td>
<td style="padding: 12px; text-align: right; border: 1px solid #ddd;">$${service.total.toFixed(2)}</td>
<td style="padding: 12px; text-align: right; border: 1px solid #ddd;">$${service.total.toFixed(2)}</td>
</tr>
`;
});

tableHTML += '</tbody>';
table.innerHTML = tableHTML;
servicesTable.appendChild(table);
}

// Totals section - Mobile optimized
const totals = document.createElement('div');
totals.style.display = isMobile ? 'block' : 'flex';
totals.style.justifyContent = isMobile ? 'center' : 'space-between';
totals.style.marginBottom = '20px';

if (isMobile) {
totals.innerHTML = `
<div style="text-align: center; margin-bottom: 20px;">
<div style="background: #333; color: white; padding: 20px; border-radius: 8px; margin: 10px 0;">
<div style="font-size: 18px; font-weight: bold;">GRAND TOTAL: $${data.totalAmount.toFixed(2)}</div>
</div>
<div style="background: var(--bg-tertiary); padding: 15px; border-radius: 8px; margin-top: 15px;">
<h4 style="color: #00bfff; margin: 0 0 10px 0; font-size: 16px;">Payment Methods</h4>
<p style="margin: 5px 0; font-size: 13px;">Cash, Check, Credit Card, Zelle</p>
<p style="margin: 5px 0; font-size: 13px;">PayPal, Venmo, Apple Pay</p>
<h4 style="color: #00bfff; margin: 15px 0 5px 0; font-size: 16px;">Terms</h4>
<p style="margin: 5px 0; font-size: 13px;">Payment due within 30 days</p>
</div>
</div>
`;
} else {
totals.innerHTML = `
<div>
<h4 style="color: #00bfff;">Payment Methods We Accept</h4>
<p>Cash, Check, Credit Card, Zelle, PayPal, Venmo, Apple Pay</p>
<h4 style="color: #00bfff;">Terms & Conditions</h4>
<p>Payment due within 30 days</p>
</div>
<div style="text-align: right; min-width: 250px;">
<div style="border-bottom: 1px solid #eee; padding: 8px 0;">
<span>SUB TOTAL: </span><strong>$${data.totalAmount.toFixed(2)}</strong>
</div>
<div style="border-bottom: 1px solid #eee; padding: 8px 0;">
<span>TAX, VAT: </span><strong>$0.00</strong>
</div>
<div style="border-bottom: 1px solid #eee; padding: 8px 0;">
<span>DISCOUNT: </span><strong>$0.00</strong>
</div>
<div style="background: #333; color: white; padding: 15px; margin: 15px 0; border-radius: 5px;">
<span>GRAND TOTAL: </span><strong>$${data.totalAmount.toFixed(2)}</strong>
</div>
</div>
`;
}

// Action buttons - Mobile optimized
const buttons = document.createElement('div');
buttons.style.textAlign = 'center';
buttons.style.marginBottom = isMobile ? '15px' : '30px';

const printBtn = document.createElement('button');
printBtn.innerHTML = '🖨️ Imprimir Recibo';
printBtn.style.background = '#00bfff';
printBtn.style.color = 'white';
printBtn.style.border = 'none';
printBtn.style.padding = isMobile ? '15px 20px' : '12px 24px';
printBtn.style.borderRadius = '8px';
printBtn.style.fontSize = isMobile ? '18px' : '16px';
printBtn.style.cursor = 'pointer';
printBtn.style.margin = isMobile ? '8px 0' : '5px';
printBtn.style.width = isMobile ? '90%' : 'auto';
printBtn.style.display = isMobile ? 'block' : 'inline-block';
printBtn.onclick = () => window.print();

const downloadBtn = document.createElement('button');
downloadBtn.innerHTML = '📄 Descargar PDF';
downloadBtn.style.background = '#444';
downloadBtn.style.color = 'white';
downloadBtn.style.border = 'none';
downloadBtn.style.padding = isMobile ? '15px 20px' : '12px 24px';
downloadBtn.style.borderRadius = '8px';
downloadBtn.style.fontSize = isMobile ? '18px' : '16px';
downloadBtn.style.cursor = 'pointer';
downloadBtn.style.margin = isMobile ? '8px 0' : '5px';
downloadBtn.style.width = isMobile ? '90%' : 'auto';
downloadBtn.style.display = isMobile ? 'block' : 'inline-block';
downloadBtn.onclick = () => {
window.print();
setTimeout(() => {
alert('💡 Para descargar como PDF:\n1. En la ventana de impresión, selecciona "Guardar como PDF"\n2. O usa "Imprimir a PDF" según tu navegador');
}, 1000);
};

buttons.appendChild(printBtn);
buttons.appendChild(downloadBtn);

// Footer
const footer = document.createElement('div');
footer.style.background = 'linear-gradient(135deg, #00bfff 70%, #444 70%)';
footer.style.color = 'white';
footer.style.textAlign = 'center';
footer.style.padding = '20px';
footer.style.borderRadius = '10px';
footer.innerHTML = '<h3 style="margin: 0;">THANK YOU FOR YOUR BUSINESS</h3>';

// Append all elements
container.appendChild(header);
container.appendChild(clientInfo);
container.appendChild(servicesTable);
container.appendChild(totals);
container.appendChild(buttons);
container.appendChild(footer);

document.body.appendChild(container);
}
