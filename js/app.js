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
        // [DAY-EVENTS MODULE] → extraído a js/modules/day-events.js

        // Handle window resize for mobile/desktop view switching
        window.addEventListener('resize', function() {
            if (currentView === 'calendar') {
                generateWeeklyCalendar();
            }
        });

        // [DIAGNOSTICS MODULE — offline/backup testing] → extraído a js/modules/diagnostics.js

        // Function to check if URL contains receipt data and display it
        // [RECEIPT-URL MODULE] → extraído a js/modules/receipt-url.js

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

        // [IMAGE-UPLOAD MODULE] → extraído a js/modules/image-upload.js

        // [OCR MODULE] → extraído a js/modules/ocr.js

        // [FORM-DATA MODULE] → extraído a js/modules/form-data.js
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
        // [BENTO-UI MODULE] → extraído a js/modules/bento-ui.js
        // [NOTIFICATIONS+SYNC MODULE] → extraído a js/modules/notifications.js
