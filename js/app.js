        // ================================================================
        // RIZE PROFESSIONAL CLEANING - PWA
        // MODULARIZED JAVASCRIPT ARCHITECTURE
        // ================================================================

        // ── Notes textarea keyboard helpers (visualViewport API) ────────
        let _vvListener = null;
        function _notesOnFocus() {
            this.setAttribute('data-ph', this.placeholder);
            this.placeholder = '';
            const notesEl = this;
            const container = document.querySelector('.container');
            const section = document.getElementById('schedule-content-area');
            if (container) {
                // position:fixed prevents iOS main-frame scroll from moving the card
                container.style.position = 'fixed';
                container.style.top = '0';
                container.style.left = '0';
                container.style.right = '0';
            }
            // Make section scrollable so notes is reachable within the fixed container
            if (section) {
                section.style.setProperty('overflow-y', 'auto', 'important');
            }
            if (!window.visualViewport) return;
            _vvListener = function() {
                const vv = window.visualViewport;
                const kbH = window.innerHeight - vv.height;
                if (kbH < 80 || !section) return;
                // Padding so notes can scroll above the keyboard
                section.style.paddingBottom = (kbH + 20) + 'px';
                setTimeout(function() {
                    notesEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 50);
            };
            window.visualViewport.addEventListener('resize', _vvListener);
        }
        function _notesOnBlur() {
            if (!this.value) this.placeholder = this.getAttribute('data-ph');
            if (_vvListener && window.visualViewport) {
                window.visualViewport.removeEventListener('resize', _vvListener);
                _vvListener = null;
            }
            const container = document.querySelector('.container');
            const section = document.getElementById('schedule-content-area');
            if (section) {
                section.scrollTop = 0;
                section.style.removeProperty('overflow-y');
                section.style.paddingBottom = '80px';
            }
            if (container) {
                container.style.position = '';
                container.style.top = '';
                container.style.left = '';
                container.style.right = '';
                container.style.height = '';
            }
        }
        // ────────────────────────────────────────────────────────────────

        // Initialize app view on load
        function initializeAppView() {
            // Show landing page with Bento Grid
            const landingView = document.getElementById('landing-view');
            if (landingView) {
                landingView.style.display = 'flex';
            }

            // Hide main container initially (will show when navigating from Bento Grid)
            const container = document.querySelector('.container');
            if (container) {
                container.style.display = 'none';
            }

            // Hide mobile menu button initially
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            if (mobileMenuBtn) {
                mobileMenuBtn.style.display = 'none';
            }

            // Hide header initially (will show when navigating to a section)
            const header = document.querySelector('.header');
            if (header) {
                header.style.display = 'none';
            }
        }

        // Mobile menu functions - define early to avoid reference errors
        function toggleMobileMenu() {
            const sidebar = document.getElementById('mobile-sidebar');
            const overlay = document.querySelector('.mobile-overlay');
            const body = document.body;
            
            if (sidebar) {
                sidebar.classList.toggle('open');
            }
            if (overlay) {
                overlay.classList.toggle('active');
            }
            if (body) {
                body.classList.toggle('mobile-menu-open');
            }
        }

        function closeMobileMenu() {
            const sidebar = document.getElementById('mobile-sidebar');
            const overlay = document.querySelector('.mobile-overlay');
            const body = document.body;
            
            if (sidebar) {
                sidebar.classList.remove('open');
            }
            if (overlay) {
                overlay.classList.remove('active');
            }
            if (body) {
                body.classList.remove('mobile-menu-open');
            }
        }
        
        // ================================
        // MODULE 1: CONFIGURATION & SETUP
        // ================================

        // SECURITY FIX: API keys now stored in backend (Vercel serverless functions)
        // This prevents key exposure in frontend code and protects against unauthorized use

        // API endpoints configuration
        const isFileProtocol = window.location.protocol === 'file:';
        const isLocalhost = window.location.hostname === 'localhost';

        // Determine API base URL based on environment
        const API_BASE_URL = isFileProtocol
            ? null // No API calls from file:// protocol
            : (isLocalhost
                ? 'http://localhost:3000/api' // Local development
                : '/api'); // Production (Vercel)

        // ================================
        // MODULE 0: DARK MODE SYSTEM
        // ================================
        
        // Dark mode functionality
        function initDarkMode() {
            // Check for saved theme preference or default to light mode
            const savedTheme = localStorage.getItem('theme') || 'light';
            setTheme(savedTheme);
            updateThemeToggleIcon(savedTheme);
        }
        
        function setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('theme', theme);
        }
        
        function toggleDarkMode() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
            updateThemeToggleIcon(newTheme);
        }
        
        function updateThemeToggleIcon(theme) {
            const lightIcon = document.querySelector('.light-icon');
            const darkIcon = document.querySelector('.dark-icon');
            
            if (lightIcon && darkIcon) {
                if (theme === 'dark') {
                    lightIcon.style.display = 'none';
                    darkIcon.style.display = 'block';
                } else {
                    lightIcon.style.display = 'block';
                    darkIcon.style.display = 'none';
                }
            }
        }
        
        // Backup status UI updater
        function updateBackupStatusUI() {
            const statusElement = document.getElementById('backup-status');
            const statusText = statusElement?.querySelector('.status-text');
            
            if (!statusElement || !statusText) return;
            
            const backupStatus = BackupSystem.getBackupStatus();
            statusText.textContent = backupStatus.status;
            
            // Update title for mobile tooltips
            const shortStatus = backupStatus.status.includes('Never') ? 'No backup' : 
                              backupStatus.status.includes('hours ago') || backupStatus.status.includes('Today') ? 'Recent backup' : 
                              'Old backup';
            statusElement.setAttribute('title', shortStatus);
            
            // Remove existing status classes
            statusElement.classList.remove('recent', 'old');
            
            // Add appropriate class based on backup age
            if (backupStatus.status.includes('Never')) {
                // No additional class needed
            } else if (backupStatus.status.includes('hours ago') || backupStatus.status.includes('Today')) {
                statusElement.classList.add('recent');
            } else {
                statusElement.classList.add('old');
            }
        }

        // Sync status UI updater
        async function updateSyncStatusUI() {
            const statusElement = document.getElementById('sync-status');
            const statusText = statusElement?.querySelector('.status-text');
            const statusIcon = statusElement?.querySelector('.status-icon');
            
            if (!statusElement || !statusText || !statusIcon) {
                console.log('❌ Sync status elements not found');
                return;
            }
            
            const isOnline = navigator.onLine;
            
            // Remove existing status classes
            statusElement.classList.remove('online', 'offline', 'syncing');
            
            if (!isOnline) {
                statusElement.classList.add('offline');
                statusText.textContent = 'Offline';
                statusElement.setAttribute('title', 'Offline');
                // Update icon to disconnected/offline state
                statusIcon.innerHTML = '<path d="M17 7L15.59 5.59L12 9.17 8.41 5.59L7 7l4 4-4 4 1.41 1.41L12 12.83l3.59 3.58L17 15l-4-4 4-4zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>';
            } else {
                try {
                    const syncStatus = await OfflineDB.getSyncStatus();
                    
                    if (syncStatus.queued > 0) {
                        statusElement.classList.add('syncing');
                        statusText.textContent = `Syncing (${syncStatus.queued})`;
                        statusElement.setAttribute('title', `Syncing (${syncStatus.queued})`);
                        // Update icon to syncing state
                        statusIcon.innerHTML = '<path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>';
                    } else {
                        statusElement.classList.add('online');
                        statusText.textContent = 'Online';
                        statusElement.setAttribute('title', 'Online');
                        // Update icon to online/connected state
                        statusIcon.innerHTML = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>';
                    }
                } catch (error) {
                    statusElement.classList.add('online');
                    statusText.textContent = 'Online';
                    statusElement.setAttribute('title', 'Online');
                    statusIcon.innerHTML = '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>';
                }
            }
        }

        // Backend health check
        let backendAvailable = false;
        async function checkBackendHealth() {
            // Skip backend check if running from file://
            if (isFileProtocol || !API_BASE_URL) {
                backendAvailable = false;
                console.log('📁 Running from file system. OCR features disabled. Use "npm start" for full functionality.');
                return;
            }
            
            try {
                const response = await fetch(`${API_BASE_URL}/health`);
                backendAvailable = response.ok;
                if (backendAvailable) {
                    console.log('✅ Secure backend connected');
                } else {
                    console.warn('⚠️  Backend unhealthy. OCR features disabled.');
                }
            } catch (error) {
                backendAvailable = false;
                console.warn('⚠️  Backend not available. OCR features disabled. Run "npm start" to enable full functionality.');
            }
        }
        
        // [SUPABASE MODULE] → extraído a js/modules/supabase-init.js

        // [DIAGNOSTICS MODULE] → extraído a js/modules/diagnostics.js

        // [OFFLINE-DB MODULE] → extraído a js/modules/offline-db.js

        // [BACKUP MODULE] → extraído a js/modules/backup.js

        // ================================
        // MODULE 4: BUSINESS CONFIGURATION
        // ================================
        
        // Square Configuration 
        // SANDBOX (para pruebas - no cobra dinero real)
        const SQUARE_APPLICATION_ID_SANDBOX = 'sandbox-sq0idb-twSpS3n2QwxZvYGFvCXKsA';
        const SQUARE_ACCESS_TOKEN_SANDBOX = 'EAAAl4d5K9AoeXdQRhFVlp_CYNUb1WjZDUm50d3tbz1XSb3VpDaXrCtvD4NdR35N';
        
        // PRODUCTION (para dinero real - cámbialo cuando tengas credenciales de producción)
        const SQUARE_APPLICATION_ID_PROD = 'PEGA_AQUÍ_TU_PRODUCTION_APP_ID';
        const SQUARE_ACCESS_TOKEN_PROD = 'PEGA_AQUÍ_TU_PRODUCTION_ACCESS_TOKEN';
        
        // ⚠️ CAMBIAR ESTO PARA ACTIVAR DINERO REAL
        const USE_PRODUCTION = false; // Cambiar a true para cobrar dinero real
        
        const SQUARE_APPLICATION_ID = USE_PRODUCTION ? SQUARE_APPLICATION_ID_PROD : SQUARE_APPLICATION_ID_SANDBOX;
        const SQUARE_ACCESS_TOKEN = USE_PRODUCTION ? SQUARE_ACCESS_TOKEN_PROD : SQUARE_ACCESS_TOKEN_SANDBOX;
        const SQUARE_ENVIRONMENT = USE_PRODUCTION ? 'production' : 'sandbox';
        
        // ── Smart OCR prompt (shared across all extraction methods) ──────────
        const _ocrPrompt = `Analiza esta imagen de conversación (WhatsApp, Messenger, SMS, texto) y extrae los datos de la cita de limpieza.
Responde ÚNICAMENTE con JSON válido sin texto adicional:
{"name":"","time":"","day":"","city":"","address":"","job":"","price":""}

SERVICIO (job) — usa EXACTAMENTE uno o más de estos nombres, separados por coma. NO copies texto literal:
- "Alfombras" → si mencionan alfombras, carpets, carpet cleaning, cuarto/room con carpet
- "Sillones" → si mencionan sillón, sofá, couch, sofa
- "Sillas" → si mencionan sillas, chairs
- "Sala" → si mencionan sala, living room
- "Cuartos" → si mencionan cuartos, habitaciones, bedrooms, rooms
- "Escaleras" → si mencionan escaleras, stairs
- "Pasillo" → si mencionan pasillo, hallway
- "Colchón" → si mencionan colchón, colchones, mattress
- "Auto" → si mencionan carro, auto, car, vehicle, detailing
- Puedes combinar: "Alfombras, Sillones"
- Si no puedes determinarlo con certeza: deja job VACÍO

PRECIO (price) — SOLO el número, sin $ ni símbolos. SOLO extrae si hay un precio ACORDADO explícitamente en la conversación ("te cobro 120", "son 150", "el precio es 200"). NO uses precios de anuncios publicitarios, promociones o flyers aunque aparezcan en la imagen. Si el precio no es confirmado como acuerdo real: deja price VACÍO.

- time: 24h HH:MM ("2pm"→"14:00","10am"→"10:00","noon"→"12:00","3 de la tarde"→"15:00")
- day: día en español, "mañana", "hoy", fecha MM/DD o YYYY-MM-DD
- name: nombre del cliente (encabezado del contacto, firma, presentación)
- address: dirección completa incluyendo formatos Utah ("123 N 400 W", "5 N 100 E Apt 2")
- Si un dato no aparece o no es claro: deja el campo VACÍO. NO inventes datos.`;

        // State management
        let appointmentsToday = 0;
        const MAX_APPOINTMENTS_PER_DAY = 9999;
        let currentView = 'schedule';
        let currentWeekStart; // Will be initialized in setCurrentWeek()
        let selectedAppointment = null;
        let uploadedImages = []; // Store uploaded images data
        // Removed: reminder system variables no longer used

        // [SUPABASE CRUD] → extraído a js/modules/supabase-init.js

        // Mobile menu functions (moved to top of file to avoid reference errors)

        // Close mobile menu when clicking menu items
        function setupMobileMenuClose() {
            const menuItems = document.querySelectorAll('.menu-item');
            menuItems.forEach(item => {
                item.addEventListener('click', closeMobileMenu);
            });
            
        }

        // Function to show event options
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

        // Handle window resize for mobile/desktop view switching
        window.addEventListener('resize', function() {
            if (currentView === 'calendar') {
                generateWeeklyCalendar();
            }
        });

        // [DIAGNOSTICS MODULE — offline/backup testing] → extraído a js/modules/diagnostics.js

        // Function to check if URL contains receipt data and display it
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

        document.addEventListener('DOMContentLoaded', async function() {
            _loadAppAgentConfig(); // carga en paralelo, no bloquea la UI
            // Initialize mobile menu button event listener
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            if (mobileMenuBtn) {
                mobileMenuBtn.addEventListener('click', toggleMobileMenu);
            }
            
            // Check if we need to show a receipt from URL
            if (await checkForReceiptInURL()) {
                return; // Stop normal initialization if showing receipt
            }
            
            // Initialize dark mode first
            initDarkMode();
            
            updateDateTime();
            setInterval(updateDateTime, 1000);
            
            // Check backend availability
            checkBackendHealth();
            
            // Initialize IndexedDB for offline-first functionality
            console.log('🗄️  Initializing offline database...');
            await initDB();
            
            // Show sync status in console
            const syncStatus = await OfflineDB.getSyncStatus();
            console.log('📊 Sync Status:', syncStatus);
            
            // Setup online/offline event handlers
            window.addEventListener('online', async () => {
                console.log('🌐 Back online! Syncing queued changes...');
                await updateSyncStatusUI();
                await OfflineDB.syncWithSupabase();
                const newStatus = await OfflineDB.getSyncStatus();
                console.log('📊 Sync completed. New status:', newStatus);
                await updateSyncStatusUI();
            });
            
            window.addEventListener('offline', async () => {
                console.log('📴 Gone offline. Changes will be queued for sync.');
                await updateSyncStatusUI();
            });
            
            // Update sync status more frequently to catch online/offline changes
            setInterval(updateSyncStatusUI, 2000); // Every 2 seconds
            
            // Initial sync status update
            await updateSyncStatusUI();
            
            // Add manual test function for status (for debugging)
            window.testOfflineStatus = function() {
                console.log('🧪 Testing offline status simulation...');
                const statusElement = document.getElementById('sync-status');
                const statusText = statusElement?.querySelector('.status-text');
                const statusIcon = statusElement?.querySelector('.status-icon');
                
                if (statusElement && statusText && statusIcon) {
                    statusElement.classList.remove('online', 'syncing');
                    statusElement.classList.add('offline');
                    statusText.textContent = 'Offline (Test)';
                    statusIcon.innerHTML = '<path d="M17 7L15.59 5.59L12 9.17 8.41 5.59L7 7l4 4-4 4 1.41 1.41L12 12.83l3.59 3.58L17 15l-4-4 4-4zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>';
                    console.log('📴 Status manually set to offline for testing');
                }
                
                // Reset after 3 seconds
                setTimeout(() => {
                    console.log('🔄 Resetting status to actual state...');
                    updateSyncStatusUI();
                }, 3000);
            };

            // Add debug functions for calendar
            window.debugCalendar = function() {
                console.log('🔍 CALENDAR DEBUG INFO:');
                console.log('📅 currentWeekStart:', currentWeekStart ? currentWeekStart.toDateString() : 'undefined');
                console.log('📅 Today:', new Date().toDateString());
                console.log('📅 Current view:', currentView);
                console.log('📅 Is mobile:', window.innerWidth <= 768);
                
                // Show the 7 days that should be displayed
                if (currentWeekStart) {
                    console.log('📅 Week days:');
                    for (let i = 0; i < 7; i++) {
                        const day = new Date(currentWeekStart);
                        day.setDate(currentWeekStart.getDate() + i);
                        console.log(`  Day ${i}: ${day.toDateString()} (${day.getDate()})`);
                    }
                }
            };

            window.resetToToday = function() {
                console.log('🔄 Resetting calendar to today...');
                setCurrentWeek();
                if (currentView === 'calendar') {
                    generateWeeklyCalendar();
                }
            };

            // Production mode helper
            window.switchToProductionMode = function() {
                console.log('🚀 SWITCHING TO PRODUCTION MODE');
                console.log('This would disable all development logs and enable production optimizations.');
                console.log('In a real deployment, you would:');
                console.log('1. Remove all console.log statements');
                console.log('2. Minify the code');
                console.log('3. Enable service worker for offline functionality');
                console.log('4. Set production API endpoints');
                console.log('5. Enable error reporting');
            };
            
            // Initialize services config (must be before UI renders)
            initServicesConfig();
            applyBusinessBranding();
            initBgTheme();
            // Save ElevenLabs key to localStorage on first load
            if(!localStorage.getItem('elabs_key')) localStorage.setItem('elabs_key','sk_13183fc4f15eb3f848c408956b320ea92f4ebb184361d38c');
            // Remove black background from all agenda-logo images using canvas
            (function(){
                function removeBg(img){
                    function process(){
                        try{
                            const c=document.createElement('canvas');
                            c.width=img.naturalWidth; c.height=img.naturalHeight;
                            const ctx=c.getContext('2d');
                            ctx.drawImage(img,0,0);
                            const d=ctx.getImageData(0,0,c.width,c.height);
                            const px=d.data;
                            for(let i=0;i<px.length;i+=4){
                                const brightness=(px[i]+px[i+1]+px[i+2])/3;
                                px[i+3]=brightness<40?0:brightness<80?Math.round((brightness-40)/40*255):255;
                            }
                            ctx.putImageData(d,0,0);
                            const url=c.toDataURL('image/png');
                            img.src=url;
                            // Apply same transparent url to all other logo images to avoid reprocessing
                            document.querySelectorAll('img[src*="agenda-logo"]').forEach(el=>{if(el!==img)el.src=url;});
                        }catch(e){}
                    }
                    if(img.complete&&img.naturalWidth) process();
                    else img.onload=process;
                }
                const first=document.querySelector('img[src*="agenda-logo"]');
                if(first) removeBg(first);
            })();

            // Initialize backup system
            console.log('📦 Initializing backup system...');
            updateBackupStatusUI();
            
            // Check for daily backup
            const backupCreated = await BackupSystem.checkAndCreateDailyBackup();
            if (backupCreated) {
                updateBackupStatusUI();
            }
            
            // Update backup status every hour
            setInterval(() => {
                updateBackupStatusUI();
            }, 60 * 60 * 1000); // Every hour
            
            // Development mode only
            if (window.location.hostname === 'localhost' || window.location.protocol === 'file:') {
                console.log('🚀 Page loaded. Test with: testMobileMenu() or testJobDropdown()');
            }
            
            // FORCE gas price update on app load (always get fresh price)
            updateGasPrice(true);
            
            // Removed: reminder system initialization
            
            // Check every minute if the day changed and update calendar if needed
            setInterval(function() {
                if (currentView === 'calendar' && updateToCurrentDay()) {
                    generateWeeklyCalendar();
                }
                // Also check if we need to update gas prices (force update when day changes)
                const today = new Date().toDateString();
                const lastGasUpdate = localStorage.getItem('gasPrice_lastUpdate');
                if (lastGasUpdate !== today) {
                    updateGasPrice(true);
                }
                
                // Removed: reminder checking code
            }, 60000); // Check every minute
            
            setupEventListeners();
            loadAppointments();
            setTodayDate();
            setupNavigation();
            setCurrentWeek();
            setupJobCheckboxes();
            setupRegistrySearch();
            setupMobileMenuClose();
            // Start slide cycles for schedule buttons
            startBtnSlide('upload-btn-slides', 3000, 5000);
            startBtnSlide('submit-btn-slides', 6000, 10000);
        });
        
        // Removed: reminder system initialization function

        function setupRegistrySearch() {
            // Real-time search as user types
            const searchName = document.getElementById('search-name');
            const searchCity = document.getElementById('search-city');
            const searchJob = document.getElementById('search-job');

            if (searchName) {
                searchName.addEventListener('input', searchClients);
            }
            if (searchCity) {
                searchCity.addEventListener('change', searchClients);
            }
            if (searchJob) {
                searchJob.addEventListener('change', searchClients);
            }
        }

        function setCurrentWeek() {
            // Always start from today (not traditional week start)
            const today = new Date();
            currentWeekStart = new Date(today);
            currentWeekStart.setHours(0, 0, 0, 0);
        }

        function updateToCurrentDay() {
            // Check if we need to update currentWeekStart to today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // If today is not the first day being shown, update to start from today
            if (currentWeekStart.getTime() !== today.getTime()) {
                currentWeekStart = new Date(today);
                return true; // Indicates update was needed
            }
            return false; // No update needed
        }

        function setupJobCheckboxes() {
            // No-op: bottom sheet handles its own events via onclick
            updateJobSelectionFromSheet();
        }

        function toggleJobDropdown() {
            const sheet = document.getElementById('job-sheet');
            if (sheet && sheet.style.display !== 'none') {
                closeJobDropdown();
            } else {
                openJobDropdown();
            }
        }

        function openJobDropdown() {
            renderJobSheetItems();
            const backdrop = document.getElementById('job-sheet-backdrop');
            const sheet = document.getElementById('job-sheet');
            if (!backdrop || !sheet) return;

            // Position the sheet above the trigger button (like a normal dropdown)
            const trigger = document.getElementById('job-dropdown');
            if (trigger) {
                const rect = trigger.getBoundingClientRect();
                const maxH = Math.min(rect.top - 12, window.innerHeight * 0.55);
                sheet.style.position = 'fixed';
                sheet.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
                sheet.style.top = 'auto';
                sheet.style.left = rect.left + 'px';
                sheet.style.right = 'auto';
                sheet.style.width = Math.max(rect.width, 280) + 'px';
                sheet.style.maxHeight = Math.max(maxH, 180) + 'px';
                sheet.style.borderRadius = '16px';
                sheet.style.borderTop = '1px solid rgba(255,255,255,0.10)';
            }

            backdrop.style.display = 'block';
            sheet.style.display = 'block';
            sheet.classList.remove('sheet-open');
            void sheet.offsetWidth;
            sheet.classList.add('sheet-open');
            document.getElementById('job-dropdown').querySelector('.dropdown-header').classList.add('open');
        }

        function closeJobDropdown() {
            const backdrop = document.getElementById('job-sheet-backdrop');
            const sheet = document.getElementById('job-sheet');
            if (backdrop) backdrop.style.display = 'none';
            if (sheet) {
                sheet.style.display = 'none';
                sheet.classList.remove('sheet-open');
                // Reset inline positioning so next open recalculates cleanly
                sheet.style.bottom = '';
                sheet.style.left = '';
                sheet.style.width = '';
                sheet.style.maxHeight = '';
                sheet.style.borderRadius = '';
            }
            const header = document.querySelector('#job-dropdown .dropdown-header');
            if (header) header.classList.remove('open');
        }

        function updateJobSelection() {
            updateJobSelectionFromSheet();
        }

        function updateDateTime() {
            const now = new Date();
            const options = { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            };
            document.getElementById('datetime').textContent = now.toLocaleDateString('es-ES', options);
        }

        function setTodayDate() {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('date').value = today;
        }

        function setupEventListeners() {
            const fileInput = document.getElementById('file-input');
            const uploadArea = document.getElementById('upload-area');
            const form = document.getElementById('appointment-form');

            console.log('🔧 Setting up event listeners...');
            console.log('🔧 Form element found:', !!form);
            console.log('🔧 Form element:', form);

            // File input change
            fileInput.addEventListener('change', handleFileSelect);

            // Drag and drop
            uploadArea.addEventListener('dragover', handleDragOver);
            uploadArea.addEventListener('dragleave', handleDragLeave);
            uploadArea.addEventListener('drop', handleDrop);

            // Form submit
            if (form) {
                form.addEventListener('submit', handleFormSubmit);
                console.log('🔧 Form submit listener added');
            } else {
                console.error('🔧 ERROR: appointment-form not found!');
            }

            // Edit form submit
            const editForm = document.getElementById('edit-appointment-form');
            if (editForm) {
                editForm.addEventListener('submit', handleEditFormSubmit);
                console.log('🔧 Edit form submit listener added');
            }

            // Modal click outside to close
            document.getElementById('appointment-modal').addEventListener('click', function(e) {
                if (e.target === this) {
                    closeAppointmentModal();
                }
            });

            document.getElementById('reschedule-modal').addEventListener('click', function(e) {
                if (e.target === this) {
                    closeRescheduleModal();
                }
            });

            document.getElementById('client-details-modal').addEventListener('click', function(e) {
                if (e.target === this) {
                    closeClientDetailsModal();
                }
            });

            document.getElementById('edit-appointment-modal').addEventListener('click', function(e) {
                if (e.target === this) {
                    closeEditAppointmentModal();
                }
            });

            // Make functions globally available
            window.viewClientDetails = viewClientDetails;
            window.closeClientDetailsModal = closeClientDetailsModal;
            window.editAppointment = editAppointment;
            window.closeEditAppointmentModal = closeEditAppointmentModal;
        }

        function handleDragOver(e) {
            e.preventDefault();
            e.currentTarget.classList.add('dragover');
        }

        function handleDragLeave(e) {
            e.currentTarget.classList.remove('dragover');
        }

        function handleDrop(e) {
            e.preventDefault();
            e.currentTarget.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                processFiles(files);
            }
        }

        function handleFileSelect(e) {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                processFiles(files);
            }
        }

        async function processFiles(files) {
            // Filter only image files
            const imageFiles = files.filter(file => file.type.startsWith('image/'));
            
            if (imageFiles.length === 0) {
                showError('Por favor selecciona al menos un archivo de imagen válido.');
                return;
            }

            // Show loading
            document.getElementById('loading').classList.add('active');
            document.getElementById('upload-area').style.display = 'none';

            try {
                // Process each image and add to uploadedImages array
                for (const file of imageFiles) {
                    const base64 = await fileToBase64(file);
                    const imageData = {
                        file: file,
                        base64: base64,
                        name: file.name
                    };
                    uploadedImages.push(imageData);
                }

                // Update preview section
                updateImagePreview();
                
                // Process all images with OCR
                const allExtractedData = await extractDataFromMultipleImages(uploadedImages);
                
                // Fill form with combined data
                fillForm(allExtractedData);
                
            } catch (error) {
                console.error('Error processing images:', error);
                showError('Error al procesar las imágenes. Inténtalo de nuevo.');
            } finally {
                document.getElementById('loading').classList.remove('active');
                document.getElementById('upload-area').style.display = 'flex';
            }
        }

        async function processFile(file) {
            // Maintain backward compatibility - convert to array and use processFiles
            await processFiles([file]);
        }

        function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
            });
        }

        function updateImagePreview() {
            // Preview section is hidden by design — no thumbnail display
        }

        function removeImage(index) {
            uploadedImages.splice(index, 1);
            updateImagePreview();
        }

        function clearAllImages() {
            uploadedImages = [];
            updateImagePreview();
            // Clear form data
            document.getElementById('appointment-form').reset();
            setTodayDate();
            _clearJobChips();
        }

        // Resize image to max 800px (same as chat) for fast API response
        async function _compressImage(base64, maxPx=800) {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => {
                    const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
                    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
                    const c = document.createElement('canvas');
                    c.width = w; c.height = h;
                    c.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
                };
                img.onerror = () => resolve(base64);
                img.src = `data:image/jpeg;base64,${base64}`;
            });
        }

        // [OCR MODULE] → extraído a js/modules/ocr.js

        function fillForm(data) {
            console.log('🔄 Filling form with data:', data);
            
            if (data.name) {
                const nameEl = document.getElementById('name');
                nameEl.value = data.name;
                nameEl.dispatchEvent(new Event('input', { bubbles: true }));
                // Force iOS WebKit repaint + fix color (text inputs need explicit inline style after programmatic fill)
                nameEl.style.color = 'rgba(255,255,255,0.95)';
                nameEl.style.webkitTextFillColor = 'rgba(255,255,255,0.95)';
                void nameEl.offsetWidth;
                console.log('✅ Set name:', data.name);
            }
            
            if (data.time) {
                // Convert time to 24h format if needed, using context to detect AM/PM
                const normalizedTime = normalizeTime(data.time, data.fullText || '');
                // Try to set the select option
                const timeSelect = document.getElementById('time');
                const timeOption = Array.from(timeSelect.options).find(option => option.value === normalizedTime);
                if (timeOption) {
                    timeSelect.value = normalizedTime;
                    console.log('✅ Set time from dropdown:', normalizedTime);
                } else {
                    console.log('⚠️ Time not found in dropdown options:', normalizedTime);
                }
            }
            
            if (data.city) {
                // Normalize city name and try to match with dropdown options
                const citySelect = document.getElementById('city');
                const normalizedCity = data.city.trim();

                // Try exact match first
                const exactMatch = Array.from(citySelect.options).find(
                    option => option.value.toLowerCase() === normalizedCity.toLowerCase()
                );

                if (exactMatch) {
                    citySelect.value = exactMatch.value;
                    console.log('✅ Set city:', exactMatch.value);
                } else {
                    // Try partial match if exact match fails
                    const partialMatch = Array.from(citySelect.options).find(
                        option => option.value.toLowerCase().includes(normalizedCity.toLowerCase()) ||
                                 normalizedCity.toLowerCase().includes(option.value.toLowerCase())
                    );

                    if (partialMatch) {
                        citySelect.value = partialMatch.value;
                        console.log('✅ Set city (partial match):', partialMatch.value);
                    } else {
                        console.warn('⚠️ City not found in dropdown options:', normalizedCity);
                    }
                }
            }
            
            if (data.address) {
                const addressEl = document.getElementById('address');
                addressEl.value = data.address;
                addressEl.dispatchEvent(new Event('input', { bubbles: true }));
                // Force iOS WebKit repaint + fix color
                addressEl.style.color = 'rgba(255,255,255,0.95)';
                addressEl.style.webkitTextFillColor = 'rgba(255,255,255,0.95)';
                void addressEl.offsetWidth;
                console.log('✅ Set address:', data.address);
            }
            
            if (data.job) {
                const picker = document.getElementById('job-picker');
                if (picker) {
                    _clearJobChips();
                    // Support comma-separated jobs from OCR
                    const parts = data.job.split(/[,\/]+/).map(s => s.trim()).filter(Boolean);
                    parts.forEach(jobText => {
                        const jt = jobText.toLowerCase();
                        const match = Array.from(picker.options).find(opt => {
                            if (!opt.value) return false;
                            const v = opt.value.toLowerCase(), t = opt.text.toLowerCase();
                            return jt.includes(v) || v.includes(jt) || jt.includes(t) || t.includes(jt) ||
                                   jt.split(/\s+/).some(w => w.length > 3 && (v.includes(w) || t.includes(w)));
                        });
                        if (match) {
                            picker.value = match.value;
                            addJobChip(picker);
                            console.log('✅ Set job chip:', match.text);
                        }
                    });
                }
            }
            
            if (data.price) {
                // Remove $ symbol and any non-numeric characters except decimal point
                const cleanPrice = data.price.toString().replace(/[^\d.]/g, '');
                const priceSelect = document.getElementById('price');
                
                // Try to find matching price option
                const priceOption = Array.from(priceSelect.options).find(option => option.value === cleanPrice);
                if (priceOption) {
                    priceSelect.value = cleanPrice;
                    console.log('✅ Set price from dropdown:', cleanPrice);
                } else {
                    console.log('⚠️ Price not found in dropdown options:', cleanPrice);
                }
            }
            
            // Calculate date based on day
            if (data.day) {
                const calculatedDate = getNextDayDate(data.day);
                if (calculatedDate) {
                    document.getElementById('date').value = calculatedDate;
                    console.log('✅ Set date:', calculatedDate);
                }
            }
            
            // Force browser re-render of all form fields after OCR fill
            document.querySelectorAll('.form-group input, .form-group select, .form-group textarea').forEach(el => {
                el.dispatchEvent(new Event('change', { bubbles: true }));
            });

            console.log('🏁 Form filling completed');
        }

        function normalizeTime(timeStr, contextText = '') {
            if (!timeStr) return '';

            console.log('🕐 Normalizing time:', timeStr);
            if (contextText) {
                console.log('📝 Context text available for AM/PM detection');
            }

            // Remove spaces and convert to lowercase
            let time = timeStr.trim().toLowerCase();
            const contextLower = contextText.toLowerCase();

            // Handle PM times (explicit in time string)
            if (time.includes('pm') || time.includes('p.m.')) {
                let hour = parseInt(time.match(/\d+/)[0]);
                let minute = time.match(/:(\d+)/) ? time.match(/:(\d+)/)[1] : '00';
                if (hour !== 12) hour += 12;
                console.log(`✅ Explicit PM detected: ${timeStr} → ${hour}:${minute}`);
                return `${hour.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
            }

            // Handle AM times (explicit in time string)
            if (time.includes('am') || time.includes('a.m.')) {
                let hour = parseInt(time.match(/\d+/)[0]);
                let minute = time.match(/:(\d+)/) ? time.match(/:(\d+)/)[1] : '00';
                if (hour === 12) hour = 0;
                console.log(`✅ Explicit AM detected: ${timeStr} → ${hour}:${minute}`);
                return `${hour.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
            }

            // Handle dot format (10.30 -> 10:30)
            if (time.includes('.')) {
                time = time.replace('.', ':');
            }

            // Add :00 if only hour is provided
            if (/^\d{1,2}$/.test(time)) {
                time = time + ':00';
            }

            // Parse time components
            const timeMatch = time.match(/(\d{1,2}):?(\d{0,2})/);
            if (!timeMatch) {
                return timeStr; // Return original if can't parse
            }

            let hour = parseInt(timeMatch[1]);
            const minute = (timeMatch[2] || '00').padStart(2, '0');

            // Detect AM/PM from context if not explicit in time string
            if (contextText && hour >= 1 && hour <= 12) {
                // Spanish context detection
                const isPM = contextLower.includes('tarde') || // afternoon
                             contextLower.includes('noche') || // night
                             contextLower.includes('afternoon') ||
                             contextLower.includes('evening') ||
                             contextLower.includes('night');

                const isAM = contextLower.includes('mañana') || // morning
                             contextLower.includes('madrugada') || // early morning
                             contextLower.includes('morning');

                if (isPM && hour !== 12) {
                    console.log(`🌙 Context indicates PM (found "tarde/noche"): ${hour}:${minute} → ${hour + 12}:${minute}`);
                    hour += 12;
                } else if (isAM && hour === 12) {
                    console.log(`🌅 Context indicates AM with 12: ${hour}:${minute} → 00:${minute}`);
                    hour = 0;
                } else if (isPM) {
                    console.log(`🌙 Context indicates PM but hour is 12, keeping as is: ${hour}:${minute}`);
                } else if (isAM) {
                    console.log(`🌅 Context indicates AM: ${hour}:${minute} (no change needed)`);
                } else {
                    console.log(`⚠️ No clear AM/PM context found, assuming as-is: ${hour}:${minute}`);
                }
            }

            // Ensure proper HH:MM format
            const normalizedTime = `${hour.toString().padStart(2, '0')}:${minute}`;
            console.log(`✅ Normalized time result: ${normalizedTime}`);
            return normalizedTime;
        }

        function parseSpecificDate(dateString) {
            if (!dateString) return null;

            console.log('🔍 Attempting to parse specific date:', dateString);

            // Mapa de meses en español e inglés
            const months = {
                'enero': 0, 'january': 0, 'jan': 0,
                'febrero': 1, 'february': 1, 'feb': 1,
                'marzo': 2, 'march': 2, 'mar': 2,
                'abril': 3, 'april': 3, 'apr': 3,
                'mayo': 4, 'may': 4,
                'junio': 5, 'june': 5, 'jun': 5,
                'julio': 6, 'july': 6, 'jul': 6,
                'agosto': 7, 'august': 7, 'aug': 7,
                'septiembre': 8, 'september': 8, 'sep': 8, 'sept': 8,
                'octubre': 9, 'october': 9, 'oct': 9,
                'noviembre': 10, 'november': 10, 'nov': 10,
                'diciembre': 11, 'december': 11, 'dec': 11
            };

            const cleanDate = dateString.toLowerCase().trim();

            // Formato: "March 15", "Mar 15", "December 20" (mes primero, en inglés)
            const monthFirstPattern = /([a-záéíóúñ]+)\s+(\d{1,2})(?:\s*,?\s*(\d{4}))?/i;
            const mfMatch = cleanDate.match(monthFirstPattern);
            if (mfMatch) {
                const monthName = mfMatch[1].toLowerCase();
                const day = parseInt(mfMatch[2]);
                const month = months[monthName];
                if (month !== undefined && day >= 1 && day <= 31) {
                    const today = new Date();
                    let year = mfMatch[3] ? parseInt(mfMatch[3]) : today.getFullYear();
                    const testDate = new Date(year, month, day);
                    if (testDate < today) year++;
                    const finalDate = new Date(year, month, day);
                    const r = `${finalDate.getFullYear()}-${(finalDate.getMonth()+1).toString().padStart(2,'0')}-${finalDate.getDate().toString().padStart(2,'0')}`;
                    console.log(`✅ Parsed month-first date: ${mfMatch[0]} → ${r}`);
                    return r;
                }
            }

            // Formato: "20 de diciembre", "20 diciembre"
            const monthDayPattern = /(\d{1,2})\s*(?:de\s+)?([a-záéíóúñ]+)/i;
            const match = cleanDate.match(monthDayPattern);

            if (match) {
                const day = parseInt(match[1]);
                const monthName = match[2].toLowerCase();
                const month = months[monthName];

                if (month !== undefined && day >= 1 && day <= 31) {
                    // Asumir año actual o siguiente si ya pasó
                    const today = new Date();
                    let year = today.getFullYear();

                    // Si la fecha ya pasó este año, usar el año siguiente
                    const testDate = new Date(year, month, day);
                    if (testDate < today) {
                        year++;
                    }

                    const finalDate = new Date(year, month, day);
                    const resultString = `${finalDate.getFullYear()}-${(finalDate.getMonth() + 1).toString().padStart(2, '0')}-${finalDate.getDate().toString().padStart(2, '0')}`;

                    console.log(`✅ Parsed date: ${day} de ${monthName} → ${resultString}`);
                    return resultString;
                }
            }

            // Formato: "12/20", "12/20/2025", "12-20", "12-20-2025"
            const numericPattern = /(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/;
            const numMatch = cleanDate.match(numericPattern);

            if (numMatch) {
                const month = parseInt(numMatch[1]) - 1; // Mes (0-11)
                const day = parseInt(numMatch[2]);
                let year = numMatch[3] ? parseInt(numMatch[3]) : new Date().getFullYear();

                // Si el año es de 2 dígitos, asumir 20xx
                if (year < 100) {
                    year += 2000;
                }

                if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
                    const finalDate = new Date(year, month, day);
                    const resultString = `${finalDate.getFullYear()}-${(finalDate.getMonth() + 1).toString().padStart(2, '0')}-${finalDate.getDate().toString().padStart(2, '0')}`;

                    console.log(`✅ Parsed numeric date: ${numMatch[0]} → ${resultString}`);
                    return resultString;
                }
            }

            console.log('❌ Could not parse as specific date');
            return null;
        }

        function getNextDayDate(dayName) {
            if (!dayName) return null;

            console.log('=== CALCULATING DATE ===');
            console.log('Input day name:', dayName);

            // Primero intentar parsear como fecha específica (ej: "20 de diciembre", "December 20", "12/20")
            const specificDate = parseSpecificDate(dayName);
            if (specificDate) {
                console.log('✅ Parsed as specific date:', specificDate);
                return specificDate;
            }

            const days = {
                'lunes': 1, 'monday': 1,
                'martes': 2, 'tuesday': 2,
                'miércoles': 3, 'miercoles': 3, 'wednesday': 3,
                'jueves': 4, 'thursday': 4,
                'viernes': 5, 'friday': 5,
                'sábado': 6, 'sabado': 6, 'saturday': 6,
                'domingo': 0, 'sunday': 0
            };

            const cleanDayName = dayName.toLowerCase().trim();
            console.log('Cleaned day name:', cleanDayName);

            const targetDay = days[cleanDayName];
            if (targetDay === undefined) {
                console.log('❌ Day not found in dictionary:', cleanDayName);
                return null;
            }
            
            // Usar fecha local sin problemas de zona horaria
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth();
            const currentDate = today.getDate();
            const currentDay = today.getDay();
            
            console.log('📅 Today is:', today.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
            console.log('🔢 Today is day number:', currentDay, '(0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab)');
            console.log('🎯 Target day number:', targetDay, '(0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab)');
            
            // Método más directo: buscar el próximo día específico
            let daysToAdd = 0;
            for (let i = 1; i <= 7; i++) {
                const testDate = new Date(currentYear, currentMonth, currentDate + i);
                const testDay = testDate.getDay();
                
                console.log(`🔍 Testing +${i} days: ${testDate.toLocaleDateString('es-ES', { weekday: 'long' })} (day ${testDay})`);
                
                if (testDay === targetDay) {
                    daysToAdd = i;
                    console.log(`✅ Found target day in ${i} days!`);
                    break;
                }
            }
            
            // Crear la fecha final
            const finalDate = new Date(currentYear, currentMonth, currentDate + daysToAdd);
            const resultString = `${finalDate.getFullYear()}-${(finalDate.getMonth() + 1).toString().padStart(2, '0')}-${finalDate.getDate().toString().padStart(2, '0')}`;
            
            console.log('📍 Final result:', resultString);
            console.log('📍 Final day:', finalDate.toLocaleDateString('es-ES', { weekday: 'long' }));
            console.log('📍 Final day number:', finalDate.getDay());
            console.log('=== END CALCULATION ===');
            
            return resultString;
        }

        async function handleFormSubmit(e) {
            console.log('🎯 ===== FORM SUBMIT HANDLER CALLED =====');
            e.preventDefault();
            console.log('🚀 Form submit started');

            const formData = new FormData(e.target);
            const selectedDate = formData.get('date');
            console.log('📅 Selected date for validation:', selectedDate);

            // Check if we're trying to schedule for today
            const today = new Date().toISOString().split('T')[0];

            console.log('📝 Form data collected');

            // Duplicate detection: same name + same date
            const allForDupCheck = await OfflineDB.getAppointments();
            const clientName = formData.get('name')?.trim().toLowerCase();
            const duplicate = allForDupCheck.find(apt =>
                apt.date === selectedDate &&
                apt.name?.trim().toLowerCase() === clientName
            );
            if (duplicate) {
                showError(`Ya existe una cita para "${formData.get('name')}" el ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES')} a las ${duplicate.time}.`);
                return;
            }

            // Get selected jobs from chips → hidden input
            _syncJobHiddenInput();
            const jobHidden = document.getElementById('job');
            const selectedJobs = jobHidden.value ? jobHidden.value.split(',').map(s => s.trim()).filter(Boolean) : [];
            console.log('💼 Selected jobs:', selectedJobs);

            if (selectedJobs.length === 0) {
                showError('Por favor selecciona al menos un tipo de trabajo.');
                return;
            }
            
            const now = new Date();
            const appointmentData = {
                name: formData.get('name'),
                time: formData.get('time'),
                city: formData.get('city'),
                address: formData.get('address'),
                job: selectedJobs.join(', '), // Join multiple selections
                price: formData.get('price'),
                date: formData.get('date'),
                notes: formData.get('notes') || '', // Add notes field
                timestamp: now.getTime(), // Use numeric timestamp for consistency
                created_at: now.toISOString(), // Add created_at for new appointments
                // Let Supabase auto-generate ID for better persistence
            };
            
            console.log('📊 Appointment data prepared:', appointmentData);
            console.log('📊 Date being saved:', appointmentData.date);
            console.log('📊 Date format check - should be YYYY-MM-DD:', /^\d{4}-\d{2}-\d{2}$/.test(appointmentData.date));

            // Save appointment
            console.log('💾 Calling saveAppointment...');

            // Disable submit button and show loading
            const submitBtn = document.getElementById('submit-btn');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;gap:8px;height:100%;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(16,163,127,0.9)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>Guardando...</span></div>';

            try {
                // ✅ CRÍTICO: Esperar a que se guarde antes de continuar
                await saveAppointment(appointmentData);

                // Show success ONLY after successful save
                showSuccess();

                // Reset form
                e.target.reset();
                setTodayDate();

                // Reset job checkboxes in custom dropdown
                document.querySelectorAll('#job-list input[type="checkbox"]').forEach(checkbox => {
                    checkbox.checked = false;
                });
                updateJobSelection(); // Update display and hidden select

                // Hide preview
                document.getElementById('preview-section').style.display = 'none';

                // Update counter
                updateAppointmentCounter();

                console.log('✅ Form submission completed successfully');

            } catch (error) {
                console.error('❌ Error during form submission:', error);
                showError(`Error al guardar la cita: ${error.message}. Inténtalo de nuevo.`);
            } finally {
                // Re-enable button
                submitBtn.disabled = false;
                restoreSubmitBtn();
            }
        }

        async function saveAppointment(data) {
            // Invalidar caché para que las secciones recarguen datos frescos
            window._cacheLoaded = {};
            console.log('✅ saveAppointment called with:', data);
            console.log('🌐 Online status:', navigator.onLine);
            console.log('🗄️ Supabase client available:', !!window.supabase);

            const now = Date.now();
            const appointmentData = {
                ...data,
                price: parseFloat(data.price),
                timestamp: data.timestamp || now,
                // Let Supabase auto-generate ID for better persistence
                id: data.id, // Only use existing ID if provided
                created_at: data.created_at || new Date(now).toISOString() // Add created_at for new appointments
            };

            try {
                // NEW LOGIC: Use OfflineDB which handles online/offline automatically
                console.log('💾 Attempting to save appointment...');
                await OfflineDB.saveAppointment(appointmentData);
                console.log('✅ Appointment saved successfully');

                // Also save to client registry
                console.log('📋 Now calling saveToClientRegistry...');
                saveToClientRegistry(data);
                console.log('📋 saveToClientRegistry call completed');

                // If registry view is currently visible, refresh it automatically
                const registryView = document.getElementById('history-view');
                if (registryView && registryView.style.display !== 'none') {
                    console.log('📊 Auto-refreshing registry view...');
                    loadClientRegistry();
                }

                // DEBUG: Force reload and detailed tracking
                console.log('🔍 DEBUGGING: About to reload appointments after save...');
                console.log('🔍 DEBUGGING: Current appointments count before reload:', appointmentsToday);

                await loadAppointments();

                console.log('🔍 DEBUGGING: Appointments count AFTER reload:', appointmentsToday);
                console.log('🔍 DEBUGGING: Current view:', currentView);

                // Refresh calendar if it's currently visible (with delay to ensure data is synced)
                if (currentView === 'calendar') {
                    console.log('📅 Refreshing calendar view...');
                    setTimeout(async () => {
                        console.log('📅 Delayed calendar refresh...');
                        // Force fresh data load
                        await OfflineDB.getAppointments();
                        await generateWeeklyCalendar();
                    }, 1000); // 1 second delay to ensure Supabase sync
                }

                console.log('🎉 All save operations completed successfully!');

            } catch (error) {
                console.error('💥 Error in saveAppointment:', error);
                console.error('💥 Error details:', error.message);
                console.error('💥 Error stack:', error.stack);
                showError(`Error al guardar la cita: ${error.message}. Inténtalo de nuevo.`);
            }
        }

        function saveToClientRegistry(data) {
            console.log('🔥 ===== saveToClientRegistry CALL =====');
            console.log('🔥 Call stack:', new Error().stack);
            console.log('🔥 ENTERED saveToClientRegistry with data:', data);
            
            // Simple save like appointments - just add to array
            let clients = JSON.parse(localStorage.getItem('clientRegistry') || '[]');
            console.log('🔥 Current clients array length BEFORE:', clients.length);
            console.log('🔥 Current clients array BEFORE:', clients);
            
            // Check if this exact entry already exists to prevent duplicates
            const existingEntry = clients.find(client => 
                client.timestamp === data.timestamp && 
                client.name === data.name
            );
            
            if (existingEntry) {
                console.log('🔥 ⚠️ DUPLICATE DETECTED - Entry already exists, skipping:', existingEntry);
                return;
            }
            
            // Create client entry with same data structure
            const clientEntry = {
                id: generateClientId(),
                name: data.name,
                city: data.city,
                address: data.address,
                job: data.job,
                price: data.price,
                date: data.date,
                time: data.time,
                timestamp: data.timestamp
            };
            
            console.log('🔥 Created client entry:', clientEntry);
            
            clients.push(clientEntry);
            console.log('🔥 After push, clients array length AFTER:', clients.length);
            console.log('🔥 After push, clients array AFTER:', clients);
            
            localStorage.setItem('clientRegistry', JSON.stringify(clients));
            console.log('🔥 Saved to localStorage');
            
            // Verify it was saved
            const verifyClients = JSON.parse(localStorage.getItem('clientRegistry') || '[]');
            console.log('🔥 VERIFICATION - clients in storage:', verifyClients.length);
            console.log('🔥 VERIFICATION - all clients:', verifyClients);
            
            // Force refresh registry if visible
            const currentView = document.querySelector('.view-content:not([style*="display: none"])');
            if (currentView && currentView.id === 'history-view') {
                console.log('🔥 FORCING registry refresh...');
                loadClientRegistry();
            }
            console.log('🔥 ===== END saveToClientRegistry =====');
        }

        function generateClientId() {
            return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        }

        // Gas Price and Distance Calculations
        // [GAS PRICE MODULE] → extraído a js/modules/gas-price.js
        
        // [TRAVEL MODULE] → extraído a js/modules/travel.js
        // [FINANCE MODULE] → extraído a js/modules/finance.js

        async function loadAppointments() {
            try {
                // OFFLINE-FIRST: Try to load from local database first
                let appointments = await OfflineDB.getAppointments();

                // Debug: Log loaded appointments
                console.log('📊 Loaded appointments from DB:', appointments);
                console.log('📊 Total appointments:', appointments?.length || 0);
                console.log('🔍 DEBUGGING FULL APPOINTMENTS DATA:', JSON.stringify(appointments, null, 2));

                // Keep using OfflineDB data - it's already synced through saveAppointment
                // No need to overwrite with Supabase data as OfflineDB handles sync
                console.log('📊 Using OfflineDB data (includes latest changes):', appointments?.length || 0);
                
                const today = new Date().toISOString().split('T')[0];
                appointmentsToday = appointments.filter(apt => apt.date === today).length;
                console.log(`📊 Appointments today (${today}): ${appointmentsToday}/${MAX_APPOINTMENTS_PER_DAY} ${navigator.onLine ? '🌐' : '📴'}`);
                updateAppointmentCounter();
            } catch (error) {
                console.error('💥 Error loading appointments:', error);
                // Fallback to empty if error
                appointmentsToday = 0;
                updateAppointmentCounter();
            }
        }

        function startBtnSlide(slidesId, minMs, maxMs) {
            let second = false;
            function next() {
                const el = document.getElementById(slidesId);
                if (!el) return;
                second = !second;
                el.classList.toggle('show-second', second);
                const delay = minMs + Math.random() * (maxMs - minMs);
                setTimeout(next, delay);
            }
            const initialDelay = 1500 + Math.random() * 2000;
            setTimeout(next, initialDelay);
        }

        function restoreSubmitBtn() {
            const btn = document.getElementById('submit-btn');
            if (!btn) return;
            btn.innerHTML = `<div class="submit-btn-slides" id="submit-btn-slides">
                <div class="submit-btn-slide">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(16,163,127,0.9)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>Agendar Cita</span>
                </div>
                <div class="submit-btn-slide">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(16,163,127,0.9)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <span>Confirmar</span>
                </div>
            </div>`;
            startBtnSlide('submit-btn-slides', 3200, 5000);
        }

        function updateAppointmentCounter() {
            const submitBtn = document.getElementById('submit-btn');
            submitBtn.disabled = false;
            restoreSubmitBtn();
        }

        // [ANALYTICS MODULE] → extraído a js/modules/analytics.js
        // [CLIENT-REGISTRY MODULE] → extraído a js/modules/client-registry.js
        // [CALENDAR MODULE] → extraído a js/modules/calendar.js

        // [RECEIPTS MODULE] → extraído a js/modules/receipts.js
        // Calendar Auto Slider
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
            initMessageSliders();
            loadBentoAnalytics();
            loadTodayTotal();
        }

        // ─── NOTIFICATIONS SYSTEM ────────────────────────────────────────

        let _swReg = null;

        // VAPID public key para push server-side
        const _VAPID_PUBLIC = 'BJlOfuYgIa6-mzl4MXIDMPOsBF1FGPKw0LxocOf7uWU3qzB0YW1wexZzpe987nSIkyoF_cDZqK0CDP9f8SS3t8E';

        async function initNotifications() {
            if (!('Notification' in window)) return;
            // Register SW
            if ('serviceWorker' in navigator) {
                try {
                    _swReg = await navigator.serviceWorker.register('./sw.js');
                } catch(e) { console.warn('SW register failed', e); }
            }
            // Request permission if not decided
            if (Notification.permission === 'default') {
                const perm = await Notification.requestPermission();
                localStorage.setItem('notif_permission', perm);
                updateNotifToggleUI();
            }
            if (Notification.permission !== 'granted') return;
            // Subscribe to server-side push (needed for background notifications)
            _subscribeToPush();
        }

        async function _subscribeToPush() {
            try {
                const reg = await navigator.serviceWorker.ready;
                if (!reg.pushManager) return;
                // Check if already subscribed
                let sub = await reg.pushManager.getSubscription();
                if (!sub) {
                    // Convert VAPID public key to Uint8Array
                    const raw = atob(_VAPID_PUBLIC.replace(/-/g,'+').replace(/_/g,'/'));
                    const key = new Uint8Array(raw.split('').map(c => c.charCodeAt(0)));
                    sub = await reg.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: key
                    });
                }
                // Save subscription to server
                await fetch('/api/push-subscribe', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sub.toJSON())
                });
            } catch(e) {
                console.warn('Push subscribe failed:', e);
            }
        }

        function updateNotifToggleUI() {
            const btn = document.getElementById('notif-toggle-btn');
            const status = document.getElementById('notif-status-text');
            if (!btn || !status) return;
            const granted = Notification.permission === 'granted';
            btn.textContent = granted ? 'Activadas ✓' : 'Activar notificaciones';
            btn.style.background = granted ? 'rgba(16,163,127,0.2)' : 'rgba(16,163,127,0.15)';
            btn.style.borderColor = granted ? 'rgba(16,163,127,0.7)' : 'rgba(16,163,127,0.4)';
            btn.style.color = granted ? '#10a37f' : 'rgba(16,163,127,0.9)';
            status.textContent = granted ? 'Recibirás el resumen de citas cada mañana a las 9 AM.' : 'Toca el botón para activar.';
        }

        async function requestNotifPermission() {
            if (!('Notification' in window)) { alert('Tu navegador no soporta notificaciones.'); return; }
            if (Notification.permission === 'denied') {
                alert('Las notificaciones están bloqueadas. Ve a Configuración del navegador → Notificaciones y actívalas para esta página.');
                return;
            }
            await initNotifications();
            updateNotifToggleUI();
        }

        // Init on load
        window.addEventListener('load', () => {
            if (localStorage.getItem('notif_permission') === 'granted' || Notification.permission === 'granted') {
                initNotifications();
            }
            updateNotifToggleUI();
        });

        // ── Bidirectional sync with chat PWA via cookies ───────────────────────
        function _lg_cookieRead(){
            try{
                const jar=Object.fromEntries(document.cookie.split('; ').filter(Boolean).map(c=>{const i=c.indexOf('=');return [c.slice(0,i),c.slice(i+1)];}));
                const n=parseInt(jar['lg_n']||'0');if(!n)return null;
                let s='';for(let i=0;i<n;i++)s+=decodeURIComponent(jar[`lg_d${i}`]||'');
                return s?JSON.parse(s):null;
            }catch{return null;}
        }
        function _lg_cookieWrite(data){
            try{
                const s=JSON.stringify({...data,_ts:Date.now()});
                const cs=3800,n=Math.ceil(s.length/cs);
                const exp='; max-age=86400; path=/; SameSite=Lax';
                for(let i=0;i<30;i++) document.cookie=`lg_d${i}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
                document.cookie=`lg_n=${n}${exp}`;
                for(let i=0;i<n;i++) document.cookie=`lg_d${i}=${encodeURIComponent(s.slice(i*cs,(i+1)*cs))}${exp}`;
            }catch(e){console.warn('lg_cookieWrite:',e);}
        }
        function _lg_mergeApts(a,b){
            const m=new Map();
            [...a,...b].forEach(x=>{const id=x.id||String(x.timestamp||'');if(!id)return;const ex=m.get(id);if(!ex||(x.timestamp||0)>=(ex.timestamp||0))m.set(id,x);});
            return Array.from(m.values()).sort((a,b)=>((a.date||'')+(a.time||''))<((b.date||'')+(b.time||''))?-1:1);
        }
        function _lg_mergeCli(a,b){
            const m=new Map();
            [...a,...b].forEach(c=>{const k=(c.name||'').toLowerCase().trim();if(!k)return;const ex=m.get(k);if(!ex||(c.createdAt||c.updatedAt||'')>=(ex.createdAt||ex.updatedAt||''))m.set(k,c);});
            return Array.from(m.values());
        }
        function _lg_fullSync(showFeedback=false){
            try{
                const remote=_lg_cookieRead();
                let lApts=[],lCli=[];
                try{lApts=JSON.parse(localStorage.getItem('appointments')||'[]');}catch{}
                try{lCli=JSON.parse(localStorage.getItem('clientRegistry')||'[]');}catch{}
                let apts=lApts,cli=lCli,svc,biz,events;
                if(remote){
                    apts=_lg_mergeApts(lApts,remote.appointments||[]);
                    cli=_lg_mergeCli(lCli,remote.clientRegistry||[]);
                    const rNewer=(remote._ts||0)>parseInt(localStorage.getItem('_lg_last_sync')||'0');
                    svc=rNewer?(remote.rize_services_config||JSON.parse(localStorage.getItem('rize_services_config')||'[]')):JSON.parse(localStorage.getItem('rize_services_config')||'[]');
                    biz=rNewer?(remote.rize_business_config||JSON.parse(localStorage.getItem('rize_business_config')||'{}')):JSON.parse(localStorage.getItem('rize_business_config')||'{}');
                    const lEv=JSON.parse(localStorage.getItem('dayEvents')||'{}');
                    events={...(remote.dayEvents||{}),...lEv};
                }else{
                    svc=JSON.parse(localStorage.getItem('rize_services_config')||'[]');
                    biz=JSON.parse(localStorage.getItem('rize_business_config')||'{}');
                    events=JSON.parse(localStorage.getItem('dayEvents')||'{}');
                }
                localStorage.setItem('appointments',JSON.stringify(apts));
                localStorage.setItem('clientRegistry',JSON.stringify(cli));
                localStorage.setItem('rize_services_config',JSON.stringify(svc));
                localStorage.setItem('rize_business_config',JSON.stringify(biz));
                localStorage.setItem('dayEvents',JSON.stringify(events));
                localStorage.setItem('_lg_last_sync',String(Date.now()));
                const now2=new Date();
                const _ld=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                const cut=_ld(new Date(now2.getTime()-90*86400000)),fut=_ld(new Date(now2.getTime()+365*86400000));
                _lg_cookieWrite({appointments:apts.filter(a=>{const d=a.date||a.fecha||'';return d>=cut&&d<=fut;}),clientRegistry:cli,rize_services_config:svc,rize_business_config:biz,dayEvents:events});
                if(showFeedback&&typeof showToast==='function') showToast(`Sincronizado ✓ — ${apts.length} citas, ${cli.length} clientes`);
                if(typeof loadAppointments==='function') loadAppointments();
                if(typeof loadClientRegistry==='function') loadClientRegistry();
            }catch(e){console.warn('lg_fullSync:',e);if(showFeedback&&typeof showToast==='function') showToast('Error al sincronizar');}
        }
        window.addEventListener('load', ()=>_lg_fullSync());
        document.addEventListener('visibilitychange', ()=>_lg_fullSync());

