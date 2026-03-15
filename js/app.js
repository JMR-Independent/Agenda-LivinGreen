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

        // ================================
        // MODULE 2: OFFLINE-FIRST DATABASE
        // ================================
        // FEATURE: IndexedDB for reliable offline storage
        // Replaces localStorage for critical business data
        
        let dbInstance = null;
        
        // Initialize IndexedDB
        async function initDB() {
            try {
                if (!window.idb) {
                    console.warn('⚠️  IndexedDB library not loaded, falling back to localStorage');
                    return null;
                }
                
                dbInstance = await window.idb.openDB('RizeCleaningDB', 1, {
                    upgrade(db) {
                        // Appointments store
                        if (!db.objectStoreNames.contains('appointments')) {
                            const appointmentStore = db.createObjectStore('appointments', {
                                keyPath: 'id'
                            });
                            appointmentStore.createIndex('date', 'date');
                            appointmentStore.createIndex('status', 'status');
                            console.log('✅ Created appointments store');
                        }
                        
                        // Settings store
                        if (!db.objectStoreNames.contains('settings')) {
                            db.createObjectStore('settings', {
                                keyPath: 'key'
                            });
                            console.log('✅ Created settings store');
                        }
                        
                        // Sync queue for when back online
                        if (!db.objectStoreNames.contains('syncQueue')) {
                            const syncStore = db.createObjectStore('syncQueue', {
                                keyPath: 'id',
                                autoIncrement: true
                            });
                            syncStore.createIndex('timestamp', 'timestamp');
                            syncStore.createIndex('action', 'action');
                            console.log('✅ Created sync queue store');
                        }
                    }
                });
                
                console.log('✅ IndexedDB initialized successfully');
                return dbInstance;
            } catch (error) {
                console.error('❌ IndexedDB initialization failed:', error);
                return null;
            }
        }
        
        // Track recent offline saves to prioritize local data
        let recentOfflineSave = false;

        // Phone number management system
        const PhoneManager = {
            save(appointmentId, phoneNumber) {
                const phones = this.getAll();
                phones[appointmentId] = phoneNumber;
                localStorage.setItem('client_phones', JSON.stringify(phones));
                console.log('📞 Saved phone to PhoneManager:', appointmentId, phoneNumber);
            },

            get(appointmentId) {
                const phones = this.getAll();
                return phones[appointmentId] || null;
            },

            getAll() {
                const stored = localStorage.getItem('client_phones');
                return stored ? JSON.parse(stored) : {};
            },

            applyToAppointments(appointments) {
                const phones = this.getAll();
                return appointments.map(apt => ({
                    ...apt,
                    phone: phones[apt.id] || apt.phone
                }));
            }
        };

        // Offline-first data operations
        const OfflineDB = {
            // Get all appointments - FIXED LOGIC
            async getAppointments() {
                console.log('📊 getAppointments called - recentOfflineSave flag:', recentOfflineSave);
                console.log('🔍 DEBUGGING: navigator.onLine status:', navigator.onLine);

                // If we recently saved offline, prioritize local data
                if (recentOfflineSave) {
                    console.log('🔄 Using local data due to recent offline save');
                    console.log('🔍 DEBUGGING: Taking recentOfflineSave path');
                    if (dbInstance) {
                        try {
                            const tx = dbInstance.transaction('appointments', 'readonly');
                            const store = tx.objectStore('appointments');
                            const appointments = await store.getAll();
                            return PhoneManager.applyToAppointments(appointments);
                        } catch (error) {
                            console.error('Error getting appointments from IndexedDB:', error);
                        }
                    }

                    // Fallback to localStorage
                    const stored = localStorage.getItem('appointments');
                    return stored ? JSON.parse(stored) : [];
                }

                // ONLINE: Use Supabase as primary source, but merge with local-only fields
                if (navigator.onLine) {
                    console.log('🔍 DEBUGGING: Taking online/Supabase path');
                    try {
                        const supabaseAppointments = await getAppointmentsFromSupabase();
                        if (supabaseAppointments && supabaseAppointments.length >= 0) {
                            // Get local data to preserve notes and other local-only fields
                            const localData = localStorage.getItem('appointments');
                            const localAppointments = localData ? JSON.parse(localData) : [];

                            // Create a map of local appointments for quick lookup
                            const localMap = new Map();
                            localAppointments.forEach(apt => {
                                if (apt.id) localMap.set(apt.id, apt);
                                else if (apt.timestamp) localMap.set(apt.timestamp, apt);
                            });

                            // Merge Supabase data with local-only fields (notes, phone)
                            console.log('🔄 Merging Supabase data with local fields (notes, phones)');
                            const mergedAppointments = supabaseAppointments.map(supabaseApt => {
                                const localApt = localMap.get(supabaseApt.id) || localMap.get(supabaseApt.timestamp);
                                return {
                                    ...supabaseApt,
                                    notes: localApt?.notes || '', // Preserve local notes!
                                    phone: localApt?.phone || PhoneManager.get(supabaseApt.id) || ''
                                };
                            });

                            // Update local cache with merged data
                            if (dbInstance) {
                                const tx = dbInstance.transaction('appointments', 'readwrite');
                                const store = tx.objectStore('appointments');
                                await store.clear();
                                for (const apt of mergedAppointments) {
                                    await store.put(apt);
                                }
                            }
                            localStorage.setItem('appointments', JSON.stringify(mergedAppointments));

                            // Apply phone numbers before returning (in case PhoneManager has updates)
                            return PhoneManager.applyToAppointments(mergedAppointments);
                        }
                    } catch (error) {
                        console.warn('⚠️  Supabase failed, falling back to offline data:', error.message);
                    }
                }
                
                // OFFLINE: Use local data
                // Intentar IndexedDB primero (si está disponible)
                if (dbInstance) {
                    try {
                        const tx = dbInstance.transaction('appointments', 'readonly');
                        const store = tx.objectStore('appointments');
                        const idbAppointments = await store.getAll();
                        console.log('✅ Loaded from IndexedDB:', idbAppointments.length);
                        return PhoneManager.applyToAppointments(idbAppointments);
                    } catch (error) {
                        console.warn('⚠️  IndexedDB failed, using localStorage:', error.message);
                        // Continuar a localStorage si IndexedDB falla
                    }
                }

                // FALLBACK PRINCIPAL: localStorage (SIEMPRE debe funcionar)
                console.log('💾 Loading from localStorage...');
                const stored = localStorage.getItem('appointments');
                const appointments = stored ? JSON.parse(stored) : [];
                console.log('✅ Loaded from localStorage:', appointments.length, 'appointments');
                if (appointments.length > 0) {
                    console.table(appointments);
                }

                // Always apply phone numbers before returning
                return PhoneManager.applyToAppointments(appointments);
            },
            
            // Save appointment - FIXED LOGIC
            async saveAppointment(appointment) {
                console.log('💾 ===== SAVE APPOINTMENT CALLED =====');
                console.log('💾 Appointment data:', appointment);

                // PASO 1: SIEMPRE guardar en localStorage PRIMERO (fuente de verdad)
                console.log('💾 Step 1: Saving to localStorage (primary storage)...');
                const currentAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
                const existingIndex = currentAppointments.findIndex(apt =>
                    apt.timestamp === appointment.timestamp || apt.id === appointment.id
                );
                if (existingIndex >= 0) {
                    currentAppointments[existingIndex] = appointment;
                    console.log('✅ Updated existing appointment in localStorage');
                } else {
                    currentAppointments.push(appointment);
                    console.log('✅ Added new appointment to localStorage');
                }
                localStorage.setItem('appointments', JSON.stringify(currentAppointments));
                console.log('✅ localStorage saved successfully:', currentAppointments.length, 'appointments');
                console.table(currentAppointments);

                // PASO 2: Intentar guardar en Supabase (opcional, mejor esfuerzo)
                if (navigator.onLine) {
                    try {
                        console.log('🌐 Step 2: Attempting Supabase backup...');
                        // ai_ ids are temporary local IDs — always INSERT, never UPDATE
                        const isNewRecord = !appointment.id || String(appointment.id).startsWith('ai_');
                        if (!isNewRecord && (appointment.originalTimestamp || appointment.id)) {
                            const originalTimestamp = appointment.originalTimestamp || appointment.timestamp;
                            await updateAppointmentInSupabase(originalTimestamp, appointment);
                            console.log('✅ Appointment updated in Supabase');
                        } else {
                            const savedData = await saveAppointmentToSupabase(appointment);
                            if (savedData?.id) {
                                appointment.id = savedData.id;
                                // Actualizar localStorage con el ID de Supabase
                                const idx = currentAppointments.findIndex(apt => apt.timestamp === appointment.timestamp);
                                if (idx >= 0) {
                                    currentAppointments[idx].id = savedData.id;
                                    localStorage.setItem('appointments', JSON.stringify(currentAppointments));
                                }
                            }
                            console.log('✅ Appointment saved to Supabase with ID:', appointment.id);
                        }
                    } catch (error) {
                        console.warn('⚠️  Supabase save failed (data is safe in localStorage):', error.message);
                    }
                }

                // PASO 3: Intentar guardar en IndexedDB (opcional)
                if (dbInstance) {
                    try {
                        const tx = dbInstance.transaction('appointments', 'readwrite');
                        const store = tx.objectStore('appointments');
                        await store.put(appointment);
                        console.log('✅ Also saved to IndexedDB');
                    } catch (err) {
                        console.warn('⚠️  IndexedDB save failed (data is safe in localStorage):', err.message);
                    }
                }

                // Mark that we saved offline recently
                recentOfflineSave = true;
                console.log('🏁 SET recentOfflineSave flag to TRUE');

                // Reset after 5 seconds
                setTimeout(() => {
                    recentOfflineSave = false;
                    console.log('🔄 Reset offline save flag');
                }, 5000);

                console.log('✅ ===== SAVE COMPLETED SUCCESSFULLY =====');
                return appointment;
            },
            
            // Delete appointment
            async deleteAppointment(appointmentId) {
                // ONLINE: Delete from Supabase first
                if (navigator.onLine) {
                    try {
                        // Find the appointment to get its timestamp for Supabase deletion
                        const appointments = await this.getAppointments();
                        const appointmentToDelete = appointments.find(apt => apt.id === appointmentId);
                        
                        if (appointmentToDelete) {
                            await deleteAppointmentFromSupabase(appointmentToDelete.timestamp);
                            console.log('✅ Appointment deleted from Supabase');
                        }
                    } catch (error) {
                        console.warn('⚠️  Supabase delete failed, deleting offline:', error.message);
                    }
                }
                
                // Delete from localStorage
                const appointments = await this.getAppointments();
                const filtered = appointments.filter(apt => apt.id !== appointmentId);
                localStorage.setItem('appointments', JSON.stringify(filtered));
                
                // Delete from IndexedDB
                if (dbInstance) {
                    try {
                        const tx = dbInstance.transaction('appointments', 'readwrite');
                        const store = tx.objectStore('appointments');
                        await store.delete(appointmentId);
                        console.log('✅ Appointment deleted from IndexedDB');
                        
                        // If offline, queue for sync when back online
                        if (!navigator.onLine) {
                            await this.queueForSync('delete', 'appointments', { id: appointmentId });
                        }
                    } catch (error) {
                        console.error('Error deleting from IndexedDB:', error);
                    }
                }
                
                console.log('✅ Appointment deleted successfully');
            },
            
            // Queue operation for sync when back online
            async queueForSync(action, table, data) {
                if (!dbInstance) return;
                
                try {
                    const tx = dbInstance.transaction('syncQueue', 'readwrite');
                    const store = tx.objectStore('syncQueue');
                    await store.add({
                        action,
                        table,
                        data,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`📥 Queued ${action} for sync:`, data);
                } catch (error) {
                    console.error('Error queuing for sync:', error);
                }
            },
            
            // Sync with Supabase when back online
            async syncWithSupabase() {
                if (!dbInstance || !navigator.onLine) return;
                
                try {
                    const tx = dbInstance.transaction('syncQueue', 'readwrite');
                    const store = tx.objectStore('syncQueue');
                    const queuedItems = await store.getAll();
                    
                    for (const item of queuedItems) {
                        try {
                            if (item.table === 'appointments') {
                                if (item.action === 'update') {
                                    await supabaseClient
                                        .from('appointments')
                                        .upsert(item.data);
                                } else if (item.action === 'delete') {
                                    await supabaseClient
                                        .from('appointments')
                                        .delete()
                                        .eq('id', item.data.id);
                                }
                            }
                            
                            // Remove from queue after successful sync
                            await store.delete(item.id);
                            console.log(`✅ Synced ${item.action} for ${item.table}`);
                        } catch (syncError) {
                            console.error('Sync error for item:', item, syncError);
                        }
                    }
                } catch (error) {
                    console.error('Error during sync:', error);
                }
            },
            
            // Check if we're working offline
            isOffline() {
                return !navigator.onLine;
            },
            
            // Get sync status
            async getSyncStatus() {
                if (!dbInstance) return { queued: 0, lastSync: null };
                
                try {
                    const tx = dbInstance.transaction('syncQueue', 'readonly');
                    const store = tx.objectStore('syncQueue');
                    const queuedItems = await store.getAll();
                    
                    return {
                        queued: queuedItems.length,
                        lastSync: localStorage.getItem('lastSyncTime'),
                        isOnline: navigator.onLine
                    };
                } catch (error) {
                    return { queued: 0, lastSync: null };
                }
            }
        };

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

        // Groq Vision OCR — fastest, same as chat
        async function _extractWithGroq(imagesData) {
            const groqKey = localStorage.getItem('rize_groq_key');
            if (!groqKey) return null;
            const models = ['meta-llama/llama-4-scout-17b-16e-instruct','llama-3.2-90b-vision-preview','llama-3.2-11b-vision-preview'];
            const prompt = _ocrPrompt;

            const compressed = await Promise.all(imagesData.map(img => _compressImage(img.base64, 800)));
            const results = await Promise.all(compressed.map(async b64 => {
                for (const model of models) {
                    try {
                        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
                            body: JSON.stringify({ model, messages: [{ role: 'user', content: [
                                { type: 'text', text: prompt },
                                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } }
                            ]}], max_tokens: 300, temperature: 0 })
                        });
                        if (res.status === 404 || res.status === 400) continue;
                        if (!res.ok) return null;
                        const data = await res.json();
                        const text = data.choices?.[0]?.message?.content || '';
                        const match = text.replace(/```json\s*/g,'').replace(/```\s*/g,'').match(/\{[\s\S]*\}/);
                        if (!match) return null;
                        try { return JSON.parse(match[0]); } catch { return null; }
                    } catch { continue; }
                }
                return null;
            }));
            const valid = results.filter(Boolean);
            if (!valid.length) return null;
            return combineExtractedData(valid);
        }

        async function extractDataWithGeminiVision(imagesData) {
            try {
                const key = localStorage.getItem('rize_gemini_key');
                if (!key) return null;

                // Use cached model or pick fastest available
                let model = localStorage.getItem('rize_gemini_model');
                if (!model) {
                    for (const m of ['gemini-2.0-flash','gemini-1.5-flash','gemini-2.0-flash-exp']) {
                        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}?key=${encodeURIComponent(key)}`);
                        if (r.ok) { model = m; localStorage.setItem('rize_gemini_model', m); break; }
                    }
                }
                if (!model) return null;

                const prompt = _ocrPrompt;

                // Compress all images in parallel, then send all in parallel
                const compressed = await Promise.all(imagesData.map(img => _compressImage(img.base64)));

                const results = await Promise.all(compressed.map(async (b64, i) => {
                    const body = {
                        contents: [{ role: 'user', parts: [
                            { inlineData: { mimeType: 'image/jpeg', data: b64 } },
                            { text: prompt }
                        ]}],
                        generationConfig: { maxOutputTokens: 300, temperature: 0 }
                    };
                    const res = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
                        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
                    );
                    if (!res.ok) return null;
                    const data = await res.json();
                    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
                    const match = text.replace(/```json\s*/g,'').replace(/```\s*/g,'').match(/\{[\s\S]*\}/);
                    if (!match) return null;
                    try { return JSON.parse(match[0]); } catch { return null; }
                }));

                const valid = results.filter(Boolean);
                if (!valid.length) return null;
                return combineExtractedData(valid);
            } catch (e) {
                console.error('❌ Gemini Vision failed:', e);
                return null;
            }
        }

        async function extractDataFromMultipleImages(imagesData) {
            try {
                // 1. Groq Vision — más rápido (igual que el chat)
                const groqResult = await _extractWithGroq(imagesData);
                if (groqResult && Object.values(groqResult).some(v => v && String(v).trim())) {
                    return groqResult;
                }

                // 2. Gemini Vision — fallback
                const geminiResult = await extractDataWithGeminiVision(imagesData);
                if (geminiResult && Object.values(geminiResult).some(v => v && String(v).trim())) {
                    return geminiResult;
                }

                // 3. Google Cloud Vision — último recurso
                const visionResult = await extractDataWithGoogleVision(imagesData);
                if (visionResult && Object.values(visionResult).some(v => v && String(v).trim())) {
                    return visionResult;
                }

                // Final fallback to manual extraction
                return await extractDataManuallyFromImages(imagesData);

            } catch (error) {
                console.error('❌ All extraction methods failed:', error);
                return await extractDataManuallyFromImages(imagesData);
            }
        }

        // Preprocess image for better OCR accuracy
        async function preprocessImageForOCR(base64Data) {
            return new Promise((resolve, reject) => {
                try {
                    console.log('🎨 Preprocessing image for better OCR...');

                    const img = new Image();
                    img.onload = function() {
                        // Create canvas
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        // Scale up small images for better recognition
                        const scale = Math.max(1, 2000 / Math.max(img.width, img.height));
                        canvas.width = img.width * scale;
                        canvas.height = img.height * scale;

                        // Draw image
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                        // Get image data
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const data = imageData.data;

                        // Calculate average brightness to detect dark mode
                        let totalBrightness = 0;
                        for (let i = 0; i < data.length; i += 4) {
                            totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
                        }
                        const avgBrightness = totalBrightness / (data.length / 4);
                        const isDarkMode = avgBrightness < 100;

                        console.log(`📊 Image brightness: ${avgBrightness.toFixed(1)} (${isDarkMode ? 'Dark mode detected' : 'Light mode'})`);

                        // Process each pixel
                        for (let i = 0; i < data.length; i += 4) {
                            let r = data[i];
                            let g = data[i + 1];
                            let b = data[i + 2];

                            // Convert to grayscale
                            let gray = 0.299 * r + 0.587 * g + 0.114 * b;

                            // If dark mode, invert colors (white text on black -> black text on white)
                            if (isDarkMode) {
                                gray = 255 - gray;
                            }

                            // Increase contrast
                            gray = ((gray - 128) * 1.5) + 128;

                            // Clamp values
                            gray = Math.max(0, Math.min(255, gray));

                            // Apply threshold for sharper text
                            gray = gray > 140 ? 255 : 0;

                            // Set RGB to same grayscale value
                            data[i] = gray;
                            data[i + 1] = gray;
                            data[i + 2] = gray;
                        }

                        // Put processed image data back
                        ctx.putImageData(imageData, 0, 0);

                        // Convert to base64
                        const processedBase64 = canvas.toDataURL('image/png').split(',')[1];

                        console.log('✅ Image preprocessed successfully');
                        resolve(processedBase64);
                    };

                    img.onerror = function(error) {
                        console.error('❌ Error loading image for preprocessing:', error);
                        reject(error);
                    };

                    img.src = `data:image/jpeg;base64,${base64Data}`;

                } catch (error) {
                    console.error('❌ Preprocessing error:', error);
                    reject(error);
                }
            });
        }

        // Tesseract.js - Free OCR that runs in the browser
        async function extractDataWithTesseract(imagesData) {
            try {
                console.log('📝 Starting Tesseract.js OCR (free, browser-based)...');

                // Combine text from all images
                let allText = '';

                for (let i = 0; i < imagesData.length; i++) {
                    const imageData = imagesData[i];
                    console.log(`📷 Processing image ${i + 1}/${imagesData.length} with Tesseract...`);

                    try {
                        // Show progress to user
                        const loadingEl = document.getElementById('loading');
                        if (loadingEl) {
                            const progressText = loadingEl.querySelector('p');
                            if (progressText) {
                                progressText.textContent = `Procesando imagen ${i + 1}/${imagesData.length} con OCR...`;
                            }
                        }

                        // Preprocess image for better OCR accuracy
                        const base64Data = imageData.base64;
                        const processedBase64 = await preprocessImageForOCR(base64Data);
                        const imageUrl = `data:image/png;base64,${processedBase64}`;

                        // Run Tesseract OCR with progress tracking
                        const result = await Tesseract.recognize(
                            imageUrl,
                            'eng+spa', // English and Spanish
                            {
                                logger: info => {
                                    if (info.status === 'recognizing text') {
                                        const percent = Math.round(info.progress * 100);
                                        console.log(`📊 OCR Progress: ${percent}%`);
                                        const loadingEl = document.getElementById('loading');
                                        if (loadingEl) {
                                            const progressText = loadingEl.querySelector('p');
                                            if (progressText) {
                                                progressText.textContent = `Extrayendo texto ${i + 1}/${imagesData.length}: ${percent}%`;
                                            }
                                        }
                                    }
                                }
                            }
                        );

                        const text = result.data.text;

                        if (text && text.trim()) {
                            allText += text + '\n\n';
                            console.log(`✅ Image ${i + 1} processed successfully`);
                            console.log(`📝 Extracted text from image ${i + 1}:`, text.substring(0, 200) + '...');
                        } else {
                            console.warn(`⚠️ No text extracted from image ${i + 1}`);
                        }

                    } catch (imageError) {
                        console.error(`❌ Error processing image ${i + 1} with Tesseract:`, imageError);
                        // Continue with next image
                        continue;
                    }
                }

                // Reset loading text
                const loadingEl = document.getElementById('loading');
                if (loadingEl) {
                    const progressText = loadingEl.querySelector('p');
                    if (progressText) {
                        progressText.textContent = 'Procesando...';
                    }
                }

                if (!allText.trim()) {
                    console.warn('⚠️ No text extracted from any image with Tesseract');
                    return null;
                }

                console.log('📋 Combined text from all images:', allText);

                // Parse the extracted text to find the required fields
                const extractedData = parseExtractedText(allText);

                console.log('✅ Parsed data from Tesseract:', extractedData);
                return extractedData;

            } catch (error) {
                console.error('❌ Tesseract extraction failed:', error);
                return null;
            }
        }

        // Google Cloud Vision API - Best OCR accuracy
        async function extractDataWithGoogleVision(imagesData) {
            try {
                console.log('📸 Starting Google Cloud Vision OCR...');

                // Google Vision API Key (fallback for direct API calls)
                const GOOGLE_VISION_API_KEY = 'AIzaSyCwvICuNacBN9Z2HOGPlYbyXc-cyHQAtmA';

                // Combine text from all images
                let allText = '';

                // Check if we have API_BASE_URL (deployed or local server)
                const useBackend = API_BASE_URL && !isFileProtocol;

                console.log(`🔧 Using ${useBackend ? 'Backend Proxy' : 'Direct API'} for Google Vision`);

                for (let i = 0; i < imagesData.length; i++) {
                    const imageData = imagesData[i];
                    console.log(`📷 Processing image ${i + 1}/${imagesData.length} with Google Vision...`);

                    // Show progress to user
                    const loadingEl = document.getElementById('loading');
                    if (loadingEl) {
                        const progressText = loadingEl.querySelector('p');
                        if (progressText) {
                            progressText.textContent = `Procesando imagen ${i + 1}/${imagesData.length} con Google Vision OCR...`;
                        }
                    }

                    let response;

                    if (useBackend) {
                        // Use backend proxy (secure, no CORS issues)
                        console.log('🔐 Using secure backend proxy for Google Vision');
                        response = await fetch(`${API_BASE_URL}/vision`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                image: imageData.base64.replace(/^data:image\/\w+;base64,/, ''),
                                features: [
                                    {
                                        type: 'TEXT_DETECTION',
                                        maxResults: 1
                                    }
                                ]
                            })
                        });
                    } else {
                        // Call Google Vision API directly (may have CORS issues in some browsers)
                        console.log('🌐 Using direct API call to Google Vision');
                        response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                requests: [
                                    {
                                        image: {
                                            content: imageData.base64.replace(/^data:image\/\w+;base64,/, '')
                                        },
                                        features: [
                                            {
                                                type: 'TEXT_DETECTION',
                                                maxResults: 1
                                            }
                                        ]
                                    }
                                ]
                            })
                        });
                    }

                    if (!response.ok) {
                        let errorData;
                        try {
                            errorData = await response.json();
                        } catch (e) {
                            errorData = { message: await response.text() };
                        }

                        console.error(`❌ Google Vision API Error (image ${i + 1}):`, errorData);

                        // Mostrar error más específico al usuario
                        if (response.status === 403 || response.status === 401) {
                            console.error('🔑 API Key Error: La API key no es válida o no tiene permisos.');
                            console.error('📖 Solución: Verifica la configuración en Vercel → Settings → Environment Variables');
                            console.error('🔗 Más info: https://console.cloud.google.com/apis/api/vision.googleapis.com');
                        } else if (response.status === 500) {
                            console.error('⚠️ Server Error: La variable GOOGLE_VISION_API_KEY puede no estar configurada en Vercel');
                            console.error('📖 Solución: Ve a tu proyecto en Vercel → Settings → Environment Variables');
                        }

                        // Mostrar alerta al usuario en el primer error
                        if (i === 0) {
                            const errorMsg = errorData.userMessage || errorData.message || 'Error al procesar la imagen';
                            showError(`Google Vision Error: ${errorMsg}. La app intentará otros métodos de extracción.`);
                        }

                        // Retornar null para que intente con los métodos de fallback
                        return null;
                    }

                    const data = await response.json();
                    console.log(`✅ Image ${i + 1} processed successfully`);

                    // Extract full text annotation
                    if (data.responses && data.responses[0] && data.responses[0].fullTextAnnotation) {
                        const text = data.responses[0].fullTextAnnotation.text;
                        allText += text + '\n\n';
                        console.log(`📝 Extracted text from image ${i + 1}:`, text.substring(0, 200) + '...');
                    }
                }

                if (!allText.trim()) {
                    console.warn('⚠️ No text extracted from any image');
                    return null;
                }

                console.log('📋 Combined text from all images:', allText);

                // Parse the extracted text to find the required fields
                const extractedData = parseExtractedText(allText);

                console.log('✅ Parsed data:', extractedData);
                return extractedData;

            } catch (error) {
                console.error('❌ Google Vision extraction failed:', error);
                console.error('Error details:', error.message);

                // Check if it's a CORS error
                if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                    console.error('🚫 CORS Error: Google Vision API bloqueada por el navegador');
                    console.error('💡 Solución: Necesitas usar un proxy/backend para llamar a Google Vision');
                }

                // Return null to try fallback methods
                return null;
            }
        }

        // Parse extracted text to find appointment data
        function parseExtractedText(text) {
            const data = {
                name: '',
                time: '',
                city: '',
                address: '',
                job: '',
                price: '',
                day: '',
                fullText: text  // Store full text for context-based time detection
            };

            console.log('🔍 Parsing extracted text:', text);

            // Normalize text
            const normalizedText = text.toLowerCase();
            const lines = text.split('\n').map(line => line.trim()).filter(line => line);

            console.log('📋 Extracted lines:', lines);

            // Helper function: Check if a string looks like a name
            function looksLikeName(str) {
                if (!str || str.length < 2 || str.length > 50) return false;

                // Not a name if it contains numbers (except at end for "Jr", "III", etc)
                if (/^\d/.test(str) || /\d{2,}/.test(str)) return false;

                // Not a name if it looks like a time (3:30, 11am, etc)
                if (/\d+[:\.]\d+/.test(str) || /\d+\s*(am|pm)/i.test(str)) return false;

                // Not a name if it starts with common greeting words
                const blacklist = ['hola', 'buenas', 'gracias', 'perfecto', 'bien', 'estoy', 'tengo', 'para', 'tarde', 'disponible', 'noches', 'disculpa', 'buenos', 'dias'];
                if (blacklist.some(word => str.toLowerCase().startsWith(word))) return false;

                // Should have at least one uppercase letter (proper name)
                if (!/[A-ZÁÉÍÓÚÑ]/.test(str)) return false;

                // Should be mostly letters (allow spaces and basic punctuation)
                if (!/^[A-ZÁÉÍÓÚÑa-záéíóúñ\s\.\-\']+$/.test(str)) return false;

                return true;
            }

            // Extract name - BUSCAR EN PRIMERAS 5 LÍNEAS
            // El nombre puede estar en la 1ra, 2da o 3ra línea (después de hora, fecha, etc)
            console.log('🔍 Searching for name in first 5 lines...');
            for (let i = 0; i < Math.min(5, lines.length); i++) {
                const line = lines[i].trim();
                console.log(`  Line ${i + 1}: "${line}" - looks like name? ${looksLikeName(line)}`);

                if (looksLikeName(line)) {
                    data.name = line;
                    console.log(`✅ Found name in line ${i + 1}:`, data.name);
                    break;
                }

                // Si la línea completa no es válida, intentar extraer un nombre de ella
                // Ej: "< (>. Alexa x v" → extraer "Alexa"
                if (!data.name) {
                    const nameMatch = line.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)\b/);
                    if (nameMatch && nameMatch[1]) {
                        const extractedName = nameMatch[1].trim();
                        // Validar que el nombre extraído sea válido
                        const blacklist = ['Hola', 'Buenas', 'Gracias', 'Perfecto', 'Bien', 'Estoy', 'Tengo', 'Para', 'Tarde', 'Disponible', 'Noches', 'Disculpa', 'Buenos', 'Dias', 'Estamos', 'Contacto'];
                        if (!blacklist.includes(extractedName) && extractedName.length >= 3) {
                            data.name = extractedName;
                            console.log(`✅ Found name extracted from line ${i + 1}:`, data.name);
                            break;
                        }
                    }
                }
            }

            // Si no encontramos nombre en primeras líneas, buscar con patterns en todo el texto
            if (!data.name) {
                console.log('⚠️ Name not found in first lines, trying patterns...');
                const namePatterns = [
                    /(?:nombre|name|cliente):\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\n|$)/i,
                    // Look for capitalized names in their own line
                    /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)$/m,
                ];
                for (const pattern of namePatterns) {
                    const match = text.match(pattern);
                    if (match && match[1]) {
                        const potentialName = match[1].trim();
                        if (looksLikeName(potentialName)) {
                            data.name = potentialName;
                            console.log('✅ Found name with pattern:', data.name);
                            break;
                        }
                    }
                }
            }

            if (!data.name) {
                console.log('❌ Name not found');
            }

            // Extract time - improved for natural language and formats like 3:30 or 3.30
            console.log('🔍 Searching for time...');
            const timePatterns = [
                { name: 'hora: X', pattern: /(?:hora|time):\s*(\d{1,2}[:.]?\d{2}\s*(?:am|pm|a\.m\.|p\.m\.)?)/i },
                { name: 'X:XX am/pm', pattern: /\b(\d{1,2}:\d{2}\s*(?:am|pm|a\.m\.|p\.m\.))\b/i },
                { name: 'X am/pm', pattern: /\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b/i },
                { name: 'a las X:XX', pattern: /(?:a\s+las|como\s+a\s+las)\s+(\d{1,2}[:\.]\d{2})/i },
                { name: 'mañana X:XX', pattern: /(?:ma[ñn]ana|morning).*?(\d{1,2}[:\.]\d{2})/i },
                { name: 'standalone X:XX', pattern: /\b(\d{1,2}[:\.]\d{2})\b/ },
                { name: 'mañana X am', pattern: /(?:ma[ñn]ana|morning).*?(\d{1,2})\s*(am|pm)?/i }
            ];

            for (const { name: patternName, pattern } of timePatterns) {
                const match = text.match(pattern);
                console.log(`  Trying pattern "${patternName}":`, match ? `Found "${match[0]}"` : 'No match');

                if (match) {
                    let timeCandidate = '';

                    if (match[2] && match[1]) {
                        // Has hours and am/pm separately (e.g., "11" and "am")
                        const hours = parseInt(match[1]);

                        // Validate: hours for 12h format should be 1-12
                        if (hours >= 1 && hours <= 12) {
                            timeCandidate = `${match[1]} ${match[2]}`;
                        } else {
                            console.log(`  ⚠️ Invalid hour: ${hours} (must be 1-12 for 12h format)`);
                        }
                    } else if (match[1]) {
                        // Normalize time format (convert . to :)
                        let time = match[1].trim().replace('.', ':');

                        // If it's a valid time format
                        if (/^\d{1,2}[:\.]\d{2}$/.test(match[1])) {
                            // Validate hours and minutes
                            const parts = time.split(':');
                            const hours = parseInt(parts[0]);
                            const minutes = parseInt(parts[1]);

                            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                                timeCandidate = time;
                            } else {
                                console.log(`  ⚠️ Invalid time: ${hours}:${minutes}`);
                            }
                        }
                    }

                    if (timeCandidate) {
                        data.time = timeCandidate;
                        console.log('✅ Found time:', data.time, `(using pattern: ${patternName})`);
                        break;
                    }
                }
            }

            if (!data.time) {
                console.log('❌ Time not found');
            }

            // Extract day of week
            const dayPatterns = [
                /\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i,
                /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
            ];
            for (const pattern of dayPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    data.day = match[1].trim();
                    break;
                }
            }

            // Extract city
            const cityPatterns = [
                /(?:ciudad|city):\s*(.+)/i,
                /\b(Alpine|American Fork|Bluffdale|Bountiful|Cedar Hills|Cottonwood Heights|Draper|Eagle Mountain|Elk Ridge|Herriman|Highland|Holladay|Kearns|Lehi|Lindon|Mapleton|Midvale|Millcreek|Murray|North Salt Lake|Orem|Payson|Pleasant Grove|Provo|Riverton|Salem|Salt Lake City|Sandy|Santaquin|Saratoga Springs|South Jordan|South Salt Lake|Spanish Fork|Springville|Taylorsville|West Jordan|West Valley City|Woodland Hills|Woods Cross)\b/i
            ];
            for (const pattern of cityPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    data.city = match[1].trim();
                    break;
                }
            }

            // Extract address - improved for Utah addresses (multiple formats)
            console.log('🔍 Searching for address...');
            const addressPatterns = [
                { name: 'dirección:', pattern: /(?:direcci[oó]n|address):\s*(.+)/i },
                { name: 'Utah N/S/E/W digits', pattern: /\b(\d+\s+[NSEWnsew](?:orth|outh|ast|est)?\s+\d+\s+[NSEWnsew](?:orth|outh|ast|est)?(?:\s+(?:Apt|Unit|#|Ste)\.?\s*\w+)?)\b/i },
                { name: 'Utah short N S E W', pattern: /\b(\d+\s+[NSEW]\s+\d+\s+[NSEW])\b/i },
                { name: 'Standard street', pattern: /\b(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Lane|Ln|Way|Cir|Ct|Court|Pl|Place)\.?(?:\s*(?:Apt|Unit|#|Ste)\.?\s*\w+)?)\b/i },
                { name: 'En/Estoy en', pattern: /(?:en|estoy\s+en|vivo\s+en|mi\s+direcci[oó]n(?:\s+es)?)\s+(\d+[^\n]{5,60})/i }
            ];
            for (const { name: patternName, pattern } of addressPatterns) {
                const match = text.match(pattern);
                console.log(`  Trying pattern "${patternName}":`, match ? `Found "${match[0]}"` : 'No match');
                if (match && match[1]) {
                    data.address = match[1].trim();
                    console.log('✅ Found address:', data.address, `(using pattern: ${patternName})`);
                    break;
                }
            }
            if (!data.address) {
                console.log('❌ Address not found');
            }

            // Extract job/service - expanded patterns
            console.log('🔍 Searching for job/service...');
            const jobPatterns = [
                { name: 'trabajo/job:', pattern: /(?:trabajo|job|servicio|service|tipo):\s*(.+)/i },
                { name: 'move in/out', pattern: /\b(move[\s\-]?(?:in|out)|movein|moveout)\b/i },
                { name: 'airbnb', pattern: /\b(airbnb|air\s*bnb|vacation\s*rental)\b/i },
                { name: 'deep clean', pattern: /\b(deep\s+clean(?:ing)?)\b/i },
                { name: 'standard/regular clean', pattern: /\b(standard\s+clean(?:ing)?|regular\s+clean(?:ing)?|recurring\s+clean(?:ing)?)\b/i },
                { name: 'office clean', pattern: /\b(office\s+clean(?:ing)?|commercial\s+clean(?:ing)?)\b/i },
                { name: 'carpet', pattern: /\b(carpet\s+clean(?:ing)?|carpet\s+shampo(?:o|ing))\b/i },
                { name: 'limpiar cuartos', pattern: /(limpiar\s+\d+\s+cuartos?)/i },
                { name: 'limpieza tipo', pattern: /\b(limpieza\s+(?:profunda|regular|de\s+\w+))\b/i },
                { name: 'limpieza/cleaning', pattern: /\b(limpieza|cleaning|clean)\b/i }
            ];
            for (const { name: patternName, pattern } of jobPatterns) {
                const match = text.match(pattern);
                console.log(`  Trying pattern "${patternName}":`, match ? `Found "${match[0]}"` : 'No match');
                if (match && match[1]) {
                    data.job = match[1].trim();
                    console.log('✅ Found job:', data.job, `(using pattern: ${patternName})`);
                    break;
                }
            }
            if (!data.job) {
                console.log('❌ Job not found');
            }

            // Extract price
            const pricePatterns = [
                /(?:precio|price|costo|cost):\s*\$?\s*(\d+(?:[.,]\d{2})?)/i,
                /\$\s*(\d+(?:[.,]\d{2})?)/,
                /\b(\d+)\s*(?:d[oó]lares|dollars|usd)\b/i
            ];
            for (const pattern of pricePatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    data.price = match[1].replace(',', '.');
                    break;
                }
            }

            // Log final summary
            console.log('📊 Extraction Summary:');
            console.log('  Name:', data.name || '❌ Not found');
            console.log('  Time:', data.time || '❌ Not found');
            console.log('  Day:', data.day || '❌ Not found');
            console.log('  Address:', data.address || '❌ Not found');
            console.log('  City:', data.city || '❌ Not found');
            console.log('  Job:', data.job || '❌ Not found');
            console.log('  Price:', data.price || '❌ Not found');

            return data;
        }

        async function extractDataWithMCP(imagesData) {
            try {
                // Convert images to a format that can be processed
                const imagePromises = imagesData.map(async (imageData) => {
                    // Create a temporary image element to get image data
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx.drawImage(img, 0, 0);

                            // Try OCR using Web APIs if available
                            resolve({
                                width: img.width,
                                height: img.height,
                                base64: imageData.base64,
                                processed: true
                            });
                        };
                        img.src = `data:image/jpeg;base64,${imageData.base64}`;
                    });
                });

                const processedImages = await Promise.all(imagePromises);
                console.log('📷 Processed images for MCP analysis:', processedImages.length);

                // Enhanced manual extraction with better pattern recognition
                return await extractDataWithEnhancedOCR(imagesData);

            } catch (error) {
                console.error('❌ MCP extraction failed:', error);
                return null;
            }
        }

        async function extractDataWithOpenAI(imagesData) {
            try {
                // Create content array with all images
            const content = [
                {
                    type: "text",
                    text: `Analiza estas ${imagesData.length} imágenes y extrae los siguientes datos combinando la información de todas ellas: nombre completo, hora (formato HH:MM de 24h), ciudad, dirección completa, trabajo/profesión, precio, y día de la semana.

IMPORTANTE:
- Busca CUIDADOSAMENTE la HORA en cualquier formato ('10:30', '2:00 PM', '14:00', '10.30', '2 PM', '3 de la tarde', etc.) en CUALQUIERA de las imágenes
- Busca el DÍA DE LA SEMANA ('lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo') en CUALQUIERA de las imágenes
- Combina la información de todas las imágenes para completar los datos
- Si encuentras información parcial en una imagen y más información en otra, combínalas
- Responde SOLO en formato JSON con las claves: name, time, city, address, job, price, day
- Si no encuentras algún dato en ninguna imagen, usa cadena vacía
- Revisa TODO el texto de TODAS las imágenes para encontrar cada campo`
                }
            ];

            // Add all images to the content
            imagesData.forEach((imageData, index) => {
                content.push({
                    type: "image_url",
                    image_url: {
                        url: `data:image/jpeg;base64,${imageData.base64}`
                    }
                });
            });

            // Process multiple images by sending them one by one directly to OpenAI
            const extractedDataArray = [];

            for (let i = 0; i < imagesData.length; i++) {
                const imageData = imagesData[i];
                console.log(`📷 Processing image ${i + 1}/${imagesData.length} with OpenAI...`);

                // Create prompt for single image - optimized for WhatsApp/Messenger screenshots
                const prompt = `Eres un asistente experto en leer pantallazos de WhatsApp y Messenger. Analiza esta imagen de conversación y extrae TODOS los datos relevantes de la cita/trabajo.

CAMPOS A EXTRAER:
1. NOMBRE COMPLETO del cliente (nombre y apellido si está disponible)
2. HORA de la cita en formato 24h (ej: "14:30", "09:00")
3. DÍA DE LA SEMANA (lunes, martes, miércoles, jueves, viernes, sábado, domingo)
4. CIUDAD donde se realizará el trabajo
5. DIRECCIÓN COMPLETA (número, calle, ciudad, código postal si está)
6. TRABAJO/SERVICIO a realizar (limpieza, deep clean, carpet cleaning, office cleaning, etc.)
7. PRECIO en dólares (solo el número, sin símbolo)

INSTRUCCIONES CRÍTICAS PARA EL NOMBRE:
- El NOMBRE puede estar en varios lugares. Busca en TODOS estos sitios:
  * Nombre del contacto en la parte superior de WhatsApp/Messenger
  * Firma al final de los mensajes (ej: "Gracias, Juan")
  * Presentación en el mensaje (ej: "Hola, soy María", "Mi nombre es Pedro")
  * Cualquier parte del texto donde se mencione un nombre propio
- Si ves un nombre de contacto arriba (ej: "Juan Pérez", "Maria Garcia"), úsalo como el nombre
- Si solo ves un nombre (ej: "Juan"), usa ese nombre
- El nombre NUNCA debe estar vacío si hay un nombre de contacto visible

INSTRUCCIONES PARA LA FECHA:
- Si encuentras una fecha específica (ej: "20 de diciembre", "December 20", "12/20"), devuélvela TAL CUAL sin convertir
- Si solo dice un día de la semana (ej: "el viernes", "el martes"), devuelve ese día directamente
- NO conviertas fechas específicas a días de la semana, déjalas como están

OTRAS INSTRUCCIONES:
- Lee TODO el texto visible en la conversación, incluyendo mensajes del cliente y respuestas
- La HORA puede estar en cualquier formato: "10:30", "2:00 PM", "14:00", "10.30", "2 PM", "3 de la tarde", "mañana a las 11", etc. Conviértela SIEMPRE a formato 24h (HH:MM)
- La dirección puede estar en formato Utah (ej: "123 N 456 W") o formato estándar (ej: "123 Main Street")
- El precio puede aparecer como "$150", "150 dólares", "ciento cincuenta", etc.
- Si un dato NO está visible después de buscar exhaustivamente, deja ese campo con cadena vacía ""
- NO inventes información que no esté en la imagen

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional:
{
  "name": "nombre completo del cliente",
  "time": "HH:MM en formato 24h",
  "day": "día de la semana en español (lunes, martes, etc.)",
  "city": "ciudad",
  "address": "dirección completa",
  "job": "descripción del trabajo/servicio",
  "price": "precio en número"
}`;

                // Call backend OpenAI API proxy (secure)
                const response = await fetch(`${API_BASE_URL}/openai`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        images: [imageData.base64],
                        prompt: prompt
                    })
                });

                console.log(`Image ${i + 1} Response status:`, response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Image ${i + 1} API Error:`, errorText);
                    continue; // Skip this image and try the next one
                }

                const data = await response.json();
                console.log(`Image ${i + 1} API Response:`, data);

                // Process backend response format
                if (data.success && data.data) {
                    // Backend successfully parsed the data
                    console.log(`✅ Parsed data from image ${i + 1}:`, data.data);
                    extractedDataArray.push(data.data);
                } else if (data.content) {
                    // Backend returned raw content, try to parse manually
                    console.log(`Image ${i + 1} Raw content:`, data.content);

                    // Clean and parse the content
                    let cleanContent = data.content.trim();
                    if (cleanContent.startsWith('```json')) {
                        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                    } else if (cleanContent.startsWith('```')) {
                        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    }

                    try {
                        const parsedData = JSON.parse(cleanContent);
                        console.log(`✅ Manual parse successful for image ${i + 1}:`, parsedData);
                        extractedDataArray.push(parsedData);
                    } catch (e) {
                        console.error(`❌ Failed to parse JSON from image ${i + 1}:`, e);
                        // Try manual extraction as fallback
                        const manualData = extractDataManually(data.content);
                        if (manualData && (manualData.name || manualData.time || manualData.city)) {
                            extractedDataArray.push(manualData);
                        }
                    }
                }
            }

            // Combine data from all images
            const combinedData = combineExtractedData(extractedDataArray);
            return combinedData;
            } catch (error) {
                console.error('Multi-image processing error:', error);
                return null;
            }
        }

        async function extractDataFromImage(base64Image) {
            try {
                // Call backend OpenAI API proxy (secure)
                const response = await fetch(`${API_BASE_URL}/openai`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        images: [base64Image],
                        prompt: `Eres un asistente experto en leer pantallazos de WhatsApp y Messenger. Analiza esta imagen de conversación y extrae TODOS los datos relevantes de la cita/trabajo.

CAMPOS A EXTRAER:
1. NOMBRE COMPLETO del cliente (nombre y apellido si está disponible)
2. HORA de la cita en formato 24h (ej: "14:30", "09:00")
3. DÍA DE LA SEMANA (lunes, martes, miércoles, jueves, viernes, sábado, domingo)
4. CIUDAD donde se realizará el trabajo
5. DIRECCIÓN COMPLETA (número, calle, ciudad, código postal si está)
6. TRABAJO/SERVICIO a realizar (limpieza, deep clean, carpet cleaning, office cleaning, etc.)
7. PRECIO en dólares (solo el número, sin símbolo)

INSTRUCCIONES CRÍTICAS PARA EL NOMBRE:
- El NOMBRE puede estar en varios lugares. Busca en TODOS estos sitios:
  * Nombre del contacto en la parte superior de WhatsApp/Messenger
  * Firma al final de los mensajes (ej: "Gracias, Juan")
  * Presentación en el mensaje (ej: "Hola, soy María", "Mi nombre es Pedro")
  * Cualquier parte del texto donde se mencione un nombre propio
- Si ves un nombre de contacto arriba (ej: "Juan Pérez", "Maria Garcia"), úsalo como el nombre
- Si solo ves un nombre (ej: "Juan"), usa ese nombre
- El nombre NUNCA debe estar vacío si hay un nombre de contacto visible

INSTRUCCIONES PARA LA FECHA:
- Si encuentras una fecha específica (ej: "20 de diciembre", "December 20", "12/20"), devuélvela TAL CUAL sin convertir
- Si solo dice un día de la semana (ej: "el viernes", "el martes"), devuelve ese día directamente
- NO conviertas fechas específicas a días de la semana, déjalas como están

OTRAS INSTRUCCIONES:
- Lee TODO el texto visible en la conversación, incluyendo mensajes del cliente y respuestas
- La HORA puede estar en cualquier formato: "10:30", "2:00 PM", "14:00", "10.30", "2 PM", "3 de la tarde", "mañana a las 11", etc. Conviértela SIEMPRE a formato 24h (HH:MM)
- La dirección puede estar en formato Utah (ej: "123 N 456 W") o formato estándar (ej: "123 Main Street")
- El precio puede aparecer como "$150", "150 dólares", "ciento cincuenta", etc.
- Si un dato NO está visible después de buscar exhaustivamente, deja ese campo con cadena vacía ""
- NO inventes información que no esté en la imagen

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional:
{
  "name": "nombre completo del cliente",
  "time": "HH:MM en formato 24h",
  "day": "día de la semana en español (lunes, martes, etc.)",
  "city": "ciudad",
  "address": "dirección completa",
  "job": "descripción del trabajo/servicio",
  "price": "precio en número"
}`
                    })
                });

                console.log('Response status:', response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API Error:', errorText);
                    throw new Error(`API Error ${response.status}: ${errorText}`);
                }

                const data = await response.json();
                console.log('API Response:', data);

                // Process backend response format
                if (data.success && data.data) {
                    // Backend successfully parsed the data
                    console.log('✅ Successfully parsed JSON:', data.data);
                    return data.data;
                }

                // Backend returned raw content, try to parse manually
                const content = data.content || (data.raw && data.raw.choices && data.raw.choices[0] && data.raw.choices[0].message && data.raw.choices[0].message.content);
                if (!content) {
                    throw new Error('No content in response');
                }

                console.log('Raw content:', content);

                // Clean the content - remove markdown code blocks
                let cleanContent = content.trim();
                if (cleanContent.startsWith('```json')) {
                    cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                } else if (cleanContent.startsWith('```')) {
                    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }
                
                console.log('Cleaned content:', cleanContent);
                
                try {
                    const parsedData = JSON.parse(cleanContent);
                    console.log('✅ Successfully parsed JSON:', parsedData);
                    
                    // Verificar que todos los campos están presentes
                    const requiredFields = ['name', 'time', 'city', 'address', 'job', 'price', 'day'];
                    const missingFields = [];
                    
                    requiredFields.forEach(field => {
                        if (!parsedData[field] || parsedData[field].trim() === '') {
                            missingFields.push(field);
                        }
                    });
                    
                    if (missingFields.length > 0) {
                        console.log('⚠️ Missing or empty fields:', missingFields);
                    }
                    
                    console.log('📊 Extracted data summary:');
                    console.log('  - Name:', parsedData.name || '(empty)');
                    console.log('  - Time:', parsedData.time || '(empty)');
                    console.log('  - City:', parsedData.city || '(empty)');
                    console.log('  - Address:', parsedData.address || '(empty)');
                    console.log('  - Job:', parsedData.job || '(empty)');
                    console.log('  - Price:', parsedData.price || '(empty)');
                    console.log('  - Day:', parsedData.day || '(empty)');
                    
                    return parsedData;
                } catch (e) {
                    console.error('JSON Parse Error:', e);
                    console.log('Failed to parse:', cleanContent);
                    
                    // Try to extract data manually using regex
                    const manualData = extractDataManually(content);
                    if (manualData) {
                        console.log('📊 Manual extraction summary:');
                        console.log('  - Name:', manualData.name || '(empty)');
                        console.log('  - Time:', manualData.time || '(empty)');
                        console.log('  - City:', manualData.city || '(empty)');
                        console.log('  - Address:', manualData.address || '(empty)');
                        console.log('  - Job:', manualData.job || '(empty)');
                        console.log('  - Price:', manualData.price || '(empty)');
                        console.log('  - Day:', manualData.day || '(empty)');
                        return manualData;
                    }
                    
                    // If all fails, return empty data
                    return {
                        name: '',
                        time: '',
                        city: '',
                        address: '',
                        job: '',
                        price: '',
                        day: ''
                    };
                }
            } catch (error) {
                console.error('Full error details:', error);
                
                // Fallback: return empty data so user can fill manually
                showError(`Error de API: ${error.message}. Puedes llenar los datos manualmente.`);
                return {
                    name: '',
                    time: '',
                    city: '',
                    address: '',
                    job: '',
                    price: '',
                    day: ''
                };
            }
        }

        function combineExtractedData(extractedDataArray) {
            console.log('🔗 Combining data from', extractedDataArray.length, 'images');

            // Initialize with empty data
            const combinedData = {
                name: '',
                time: '',
                city: '',
                address: '',
                job: '',
                price: '',
                day: ''
            };

            // Combine data from all extractions, prioritizing non-empty values
            extractedDataArray.forEach((data, index) => {
                console.log(`📋 Data from image ${index + 1}:`, data);

                Object.keys(combinedData).forEach(key => {
                    if (!combinedData[key] && data[key]) {
                        combinedData[key] = data[key];
                        console.log(`✅ Found ${key}: "${data[key]}" from image ${index + 1}`);
                    }
                });
            });

            console.log('🎯 Final combined data:', combinedData);
            return combinedData;
        }

        async function extractDataWithEnhancedOCR(imagesData) {
            console.log('🔍 Using enhanced OCR extraction...');

            try {
                // Combine text from all images using canvas-based text detection
                let combinedText = '';

                for (let i = 0; i < imagesData.length; i++) {
                    const imageData = imagesData[i];
                    console.log(`📷 Processing image ${i + 1}/${imagesData.length}`);

                    // Try to extract text using canvas and image analysis
                    const extractedText = await extractTextFromImage(imageData.base64);
                    combinedText += ` ${extractedText}`;
                }

                console.log('📝 Combined text from all images:', combinedText);

                // Apply enhanced pattern matching to combined text
                const extractedData = extractDataManually(combinedText);

                if (extractedData && (extractedData.name || extractedData.time || extractedData.city)) {
                    console.log('✅ Enhanced OCR extraction successful');
                    return extractedData;
                }

                return null;

            } catch (error) {
                console.error('❌ Enhanced OCR failed:', error);
                return null;
            }
        }

        async function extractTextFromImage(base64Image) {
            return new Promise((resolve) => {
                try {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);

                        // Get image data for analysis
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                        // Simple text detection simulation
                        // In a real implementation, this would use OCR libraries
                        // For now, we'll return the base64 for manual processing
                        resolve(base64Image.substring(0, 100)); // Simulated text extraction
                    };
                    img.onerror = () => resolve('');
                    img.src = `data:image/jpeg;base64,${base64Image}`;
                } catch (error) {
                    console.error('Error in text extraction:', error);
                    resolve('');
                }
            });
        }

        async function extractDataManuallyFromImages(imagesData) {
            console.log('🔧 Using manual fallback extraction...');

            // Return empty structure so user can fill manually
            const emptyData = {
                name: '',
                time: '',
                city: '',
                address: '',
                job: '',
                price: '',
                day: ''
            };

            // Show helpful message to user
            showError('No se pudo extraer datos automáticamente. Por favor llena los campos manualmente.');

            return emptyData;
        }

        function extractDataManually(text) {
            // Fallback manual extraction using regex patterns
            const data = {
                name: '',
                time: '',
                city: '',
                address: '',
                job: '',
                price: '',
                day: ''
            };

            try {
                // First try JSON patterns
                const nameMatch = text.match(/["']?name["']?\s*:\s*["']([^"']+)["']/i);
                const timeMatch = text.match(/["']?time["']?\s*:\s*["']([^"']+)["']/i);
                const cityMatch = text.match(/["']?city["']?\s*:\s*["']([^"']+)["']/i);
                const addressMatch = text.match(/["']?address["']?\s*:\s*["']([^"']+)["']/i);
                const jobMatch = text.match(/["']?job["']?\s*:\s*["']([^"']+)["']/i);
                const priceMatch = text.match(/["']?price["']?\s*:\s*["']?([^"',}]+)["']?/i);
                const dayMatch = text.match(/["']?day["']?\s*:\s*["']([^"']+)["']/i);

                if (nameMatch) data.name = nameMatch[1].trim();
                if (timeMatch) data.time = timeMatch[1].trim();
                if (cityMatch) data.city = cityMatch[1].trim();
                if (addressMatch) data.address = addressMatch[1].trim();
                if (jobMatch) data.job = jobMatch[1].trim();
                if (priceMatch) data.price = priceMatch[1].trim();
                if (dayMatch) data.day = dayMatch[1].trim();

                // If day not found in JSON, try to find it in free text
                if (!data.day) {
                    const dayPattern = /\b(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
                    const dayInText = text.match(dayPattern);
                    if (dayInText) {
                        data.day = dayInText[1].trim();
                        console.log('Found day in free text:', data.day);
                    }
                }

                // If time not found in JSON, try to find it in free text
                if (!data.time) {
                    // Look for various time patterns
                    const timePatterns = [
                        /\b(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)\b/i,
                        /\b(\d{1,2})\.(\d{2})\s*(am|pm|a\.m\.|p\.m\.)\b/i,
                        /\b(\d{1,2}):(\d{2})\b/,
                        /\b(\d{1,2})\.(\d{2})\b/,
                        /\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b/i,
                        /\b(\d{1,2})\s+de\s+la\s+(mañana|tarde|noche)\b/i
                    ];
                    
                    for (const pattern of timePatterns) {
                        const timeInText = text.match(pattern);
                        if (timeInText) {
                            data.time = timeInText[0].trim();
                            console.log('Found time in free text:', data.time);
                            break;
                        }
                    }
                }

                // If price not found in JSON, try to find it in free text
                if (!data.price) {
                    const pricePatterns = [
                        /\$\s*(\d+(?:\.\d{2})?)/,  // $90, $90.00
                        /(\d+(?:\.\d{2})?)\s*\$/,  // 90$, 90.00$
                        /precio\s*:?\s*\$?(\d+(?:\.\d{2})?)/i,  // precio: $90
                        /cost\s*:?\s*\$?(\d+(?:\.\d{2})?)/i,    // cost: $90
                        /\b(\d+(?:\.\d{2})?)\s*dolar/i,        // 90 dolares
                        /\b(\d+(?:\.\d{2})?)\s*usd/i           // 90 USD
                    ];
                    
                    for (const pattern of pricePatterns) {
                        const priceInText = text.match(pattern);
                        if (priceInText) {
                            data.price = priceInText[1].trim();
                            console.log('Found price in free text:', data.price);
                            break;
                        }
                    }
                }

                // If job not found in JSON, try to find it in free text
                if (!data.job) {
                    const jobPatterns = [
                        /trabajo\s*:?\s*([^,\n]+)/i,
                        /profesion\s*:?\s*([^,\n]+)/i,
                        /ocupacion\s*:?\s*([^,\n]+)/i,
                        /job\s*:?\s*([^,\n]+)/i,
                        /profession\s*:?\s*([^,\n]+)/i
                    ];
                    
                    for (const pattern of jobPatterns) {
                        const jobInText = text.match(pattern);
                        if (jobInText) {
                            data.job = jobInText[1].trim();
                            console.log('Found job in free text:', data.job);
                            break;
                        }
                    }
                }

                console.log('Manually extracted data:', data);
                return data;
            } catch (e) {
                console.error('Manual extraction failed:', e);
                return null;
            }
        }

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

        // Dashboard Analytics Functions
        async function loadDatosAnalytics() {
            console.log('🔄 Loading dashboard analytics...');
            try {
                // EXACT SAME LOGIC AS loadClientRegistry - no filters, no cleanup
                let appointments = await OfflineDB.getAppointments();

                // If online, get from Supabase (same as loadClientRegistry does)
                if (navigator.onLine) {
                    try {
                        const supabaseAppointments = await getAppointmentsFromSupabase();
                        if (supabaseAppointments && supabaseAppointments.length > 0) {
                            appointments = supabaseAppointments;
                        }
                    } catch (error) {
                        console.log('⚠️ Using offline data for analytics');
                    }
                }

                console.log('📊 RAW appointments from database:', appointments.length);
                console.log('📊 All appointments with dates:', appointments.map(apt => ({
                    name: apt.name,
                    date: apt.date,
                    city: apt.city,
                    price: apt.price
                })));

                // Filter: Only count appointments with valid client names (ONLY filter, no date filtering)
                const validAppointments = appointments.filter(apt => apt.name && apt.name.trim());
                console.log('📊 Valid appointments (with names):', validAppointments.length);

                // Calculate main metrics
                // Count unique clients by NAME (same as Registro section does)
                const uniqueClients = new Set();
                validAppointments.forEach(apt => {
                    const clientKey = apt.name.toLowerCase().trim();
                    uniqueClients.add(clientKey);
                });
                const totalClients = uniqueClients.size;
                const totalAppointments = validAppointments.length;
                const totalRevenue = validAppointments.reduce((sum, apt) => sum + (parseFloat(apt.price) || 0), 0);
                const averageTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

                console.log('📈 Dashboard metrics:', {
                    totalClients,
                    totalAppointments,
                    totalRevenue,
                    averageTicket
                });

                // Update metric cards
                document.getElementById('total-clients-count').textContent = totalClients.toLocaleString();
                document.getElementById('average-ticket-amount').textContent = `$${averageTicket.toFixed(0)}`;
                document.getElementById('total-appointments').textContent = totalAppointments.toLocaleString();
                document.getElementById('total-revenue').textContent = `$${totalRevenue.toLocaleString()}`;

                // Generate charts and analytics (use validAppointments only)
                generateCitiesChart(validAppointments);
                generateJobsChart(validAppointments);
                generateRevenueByCity(validAppointments);
                // Generate monthly trend using CALENDAR data source
                console.log('🚀 CALLING generateMonthlyTrendFromCalendar...');
                await generateMonthlyTrendFromCalendar();
                console.log('✅ generateMonthlyTrendFromCalendar COMPLETED');

                console.log('✅ Dashboard analytics loaded successfully');
                
            } catch (error) {
                console.error('💥 Error loading dashboard analytics:', error);
                // Set default values on error
                document.getElementById('total-clients-count').textContent = '0';
                document.getElementById('average-ticket-amount').textContent = '$0';
                document.getElementById('total-appointments').textContent = '0';
                document.getElementById('total-revenue').textContent = '$0';
                
                // Show error message in charts
                showErrorInCharts();
            }
        }

        function showErrorInCharts() {
            const canvases = ['cities-chart', 'jobs-chart', 'monthly-trend-chart'];
            canvases.forEach(canvasId => {
                const canvas = document.getElementById(canvasId);
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#ef4444';
                ctx.font = '14px Inter';
                ctx.textAlign = 'center';
                ctx.fillText('Error cargando datos', canvas.width / 2, canvas.height / 2);
            });
            
            document.getElementById('revenue-by-city').innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px;">Error cargando datos</div>';
            document.getElementById('recent-activity').innerHTML = '<div style="color: #ef4444; text-align: center; padding: 20px;">Error cargando datos</div>';
        }

        function generateCitiesChart(appointments) {
            const container = document.getElementById('cities-chart').parentElement;

            // Calculate city data
            const cityCount = {};
            appointments.forEach(apt => {
                if (apt.city) {
                    cityCount[apt.city] = (cityCount[apt.city] || 0) + 1;
                }
            });

            const sortedCities = Object.entries(cityCount)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8); // Top 8 cities for fuller grid

            if (sortedCities.length === 0) {
                container.innerHTML = `
                    <div style="color: rgba(255, 255, 255, 0.6); text-align: center; padding: 40px; font-size: 14px;">
                        No hay datos disponibles
                    </div>
                `;
                return;
            }

            const maxValue = Math.max(...sortedCities.map(([,count]) => count));

            // Color variations for different slides
            const colorPairs = [
                { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.4)' },  // Blue
                { bg: 'rgba(147, 51, 234, 0.2)', border: 'rgba(147, 51, 234, 0.4)' },  // Purple
                { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.4)' },  // Green
                { bg: 'rgba(249, 115, 22, 0.2)', border: 'rgba(249, 115, 22, 0.4)' },  // Orange
                { bg: 'rgba(236, 72, 153, 0.2)', border: 'rgba(236, 72, 153, 0.4)' },  // Pink
                { bg: 'rgba(20, 184, 166, 0.2)', border: 'rgba(20, 184, 166, 0.4)' },  // Teal
                { bg: 'rgba(251, 146, 60, 0.2)', border: 'rgba(251, 146, 60, 0.4)' },  // Amber
                { bg: 'rgba(139, 92, 246, 0.2)', border: 'rgba(139, 92, 246, 0.4)' }   // Violet
            ];

            // Create bento grid with varying sizes and slides
            const cityCards = sortedCities.map(([city, count], index) => {
                const intensity = (count / maxValue);

                // Explicit grid positioning for clean layout
                let gridPosition, fontSize, countSize;
                if (index === 0) {
                    gridPosition = 'grid-column: 1 / 3; grid-row: 1 / 3;';
                    fontSize = '18px';
                    countSize = '36px';
                } else if (index === 1) {
                    gridPosition = 'grid-column: 3 / 4; grid-row: 1 / 2;';
                    fontSize = '14px';
                    countSize = '28px';
                } else if (index === 2) {
                    gridPosition = 'grid-column: 4 / 5; grid-row: 1 / 2;';
                    fontSize = '14px';
                    countSize = '28px';
                } else if (index === 3) {
                    gridPosition = 'grid-column: 3 / 4; grid-row: 2 / 3;';
                    fontSize = '13px';
                    countSize = '24px';
                } else if (index === 4) {
                    gridPosition = 'grid-column: 4 / 5; grid-row: 2 / 3;';
                    fontSize = '13px';
                    countSize = '24px';
                } else if (index === 5) {
                    gridPosition = 'grid-column: 1 / 2; grid-row: 3 / 4;';
                    fontSize = '13px';
                    countSize = '24px';
                } else if (index === 6) {
                    gridPosition = 'grid-column: 2 / 3; grid-row: 3 / 4;';
                    fontSize = '13px';
                    countSize = '24px';
                } else {
                    gridPosition = 'grid-column: 3 / 5; grid-row: 3 / 4;';
                    fontSize = '14px';
                    countSize = '26px';
                }

                const color1 = colorPairs[index % colorPairs.length];
                const color2 = colorPairs[(index + 1) % colorPairs.length];

                return `
                    <div class="city-slider-item" style="${gridPosition} overflow: hidden; border-radius: 12px;">
                        <div class="city-slides city-slides-${index}">
                            <!-- Slide 1: City Name -->
                            <div class="city-slide" style="
                                background: ${color1.bg};
                                backdrop-filter: blur(12px);
                                -webkit-backdrop-filter: blur(12px);
                                border: 1px solid ${color1.border};
                                padding: ${index === 0 ? '24px' : '16px'};
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                height: 100%;
                                position: relative;
                            ">
                                <div style="text-align: center; z-index: 1; position: relative;">
                                    <div style="
                                        color: rgba(255, 255, 255, 0.95);
                                        font-size: ${fontSize};
                                        font-weight: 700;
                                        line-height: 1.2;
                                    ">${city}</div>
                                    <div style="
                                        color: rgba(255, 255, 255, 0.5);
                                        font-size: ${index === 0 ? '12px' : '10px'};
                                        margin-top: 8px;
                                        text-transform: uppercase;
                                        letter-spacing: 1px;
                                    ">Ciudad</div>
                                </div>
                            </div>
                            <!-- Slide 2: Count -->
                            <div class="city-slide" style="
                                background: ${color2.bg};
                                backdrop-filter: blur(12px);
                                -webkit-backdrop-filter: blur(12px);
                                border: 1px solid ${color2.border};
                                padding: ${index === 0 ? '24px' : '16px'};
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                height: 100%;
                                position: relative;
                            ">
                                <div style="text-align: center; z-index: 1; position: relative;">
                                    <div style="
                                        color: rgba(255, 255, 255, 0.95);
                                        font-size: ${countSize};
                                        font-weight: 700;
                                        line-height: 1;
                                    ">${count}</div>
                                    <div style="
                                        color: rgba(255, 255, 255, 0.6);
                                        font-size: ${index === 0 ? '14px' : '11px'};
                                        margin-top: 8px;
                                        font-weight: 500;
                                    ">citas</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div style="
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    grid-template-rows: repeat(3, 1fr);
                    gap: 10px;
                    height: 100%;
                    width: 100%;
                ">
                    ${cityCards}
                </div>
            `;

            // Initialize sliders for each city card with random intervals
            sortedCities.forEach((_, index) => {
                initCitySlider(index);
            });
        }

        // Initialize individual city slider with random timing
        function initCitySlider(index) {
            const slidesContainer = document.querySelector(`.city-slides-${index}`);
            if (!slidesContainer) return;

            let isSecondSlide = false;

            function getRandomInterval() {
                // Different random ranges for each card
                const min = 2500 + (index * 200);
                const max = 4500 + (index * 300);
                return Math.floor(Math.random() * (max - min + 1)) + min;
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

            // Start with different initial delays for randomness
            const initialDelay = Math.floor(Math.random() * 3000) + (index * 400);
            setTimeout(toggleSlide, initialDelay);
        }

        function generateJobsChart(appointments) {
            const container = document.getElementById('jobs-chart').parentElement;

            // Calculate job data from apt.job (singular, string)
            const jobCount = {};
            appointments.forEach(apt => {
                if (apt.job && apt.job.trim()) {
                    // Split by comma in case there are multiple jobs in one string
                    const jobs = apt.job.split(',').map(j => j.trim());
                    jobs.forEach(job => {
                        if (job) {
                            jobCount[job] = (jobCount[job] || 0) + 1;
                        }
                    });
                }
            });

            const sortedJobs = Object.entries(jobCount)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8); // Top 8 jobs

            if (sortedJobs.length === 0) {
                container.innerHTML = `
                    <div style="color: rgba(255, 255, 255, 0.6); text-align: center; padding: 40px; font-size: 14px;">
                        No hay datos disponibles
                    </div>
                `;
                return;
            }

            const maxValue = Math.max(...sortedJobs.map(([,count]) => count));

            // Color variations - modern palette
            const colors = [
                { main: 'rgba(236, 72, 153, 0.25)', accent: 'rgba(236, 72, 153, 0.6)', border: 'rgba(236, 72, 153, 0.4)' },  // Pink
                { main: 'rgba(139, 92, 246, 0.25)', accent: 'rgba(139, 92, 246, 0.6)', border: 'rgba(139, 92, 246, 0.4)' },  // Violet
                { main: 'rgba(59, 130, 246, 0.25)', accent: 'rgba(59, 130, 246, 0.6)', border: 'rgba(59, 130, 246, 0.4)' },  // Blue
                { main: 'rgba(16, 185, 129, 0.25)', accent: 'rgba(16, 185, 129, 0.6)', border: 'rgba(16, 185, 129, 0.4)' },  // Green
                { main: 'rgba(251, 146, 60, 0.25)', accent: 'rgba(251, 146, 60, 0.6)', border: 'rgba(251, 146, 60, 0.4)' },  // Amber
                { main: 'rgba(20, 184, 166, 0.25)', accent: 'rgba(20, 184, 166, 0.6)', border: 'rgba(20, 184, 166, 0.4)' },  // Teal
                { main: 'rgba(244, 63, 94, 0.25)', accent: 'rgba(244, 63, 94, 0.6)', border: 'rgba(244, 63, 94, 0.4)' },     // Rose
                { main: 'rgba(168, 85, 247, 0.25)', accent: 'rgba(168, 85, 247, 0.6)', border: 'rgba(168, 85, 247, 0.4)' }   // Purple
            ];

            // Create horizontal stacked cards
            const jobCards = sortedJobs.map(([job, count], index) => {
                const percentage = (count / maxValue) * 100;
                const color = colors[index % colors.length];

                return `
                    <div style="
                        background: ${color.main};
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        border: 1px solid ${color.border};
                        border-radius: 12px;
                        padding: 16px 20px;
                        margin-bottom: 10px;
                        position: relative;
                        overflow: hidden;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        cursor: default;
                    "
                    onmouseover="this.style.transform='translateX(4px)'; this.style.borderColor='${color.accent}'"
                    onmouseout="this.style.transform='translateX(0)'; this.style.borderColor='${color.border}'">
                        <!-- Progress bar background -->
                        <div style="
                            position: absolute;
                            left: 0;
                            top: 0;
                            height: 100%;
                            width: ${percentage}%;
                            background: ${color.accent};
                            opacity: 0.15;
                            transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
                        "></div>

                        <!-- Content -->
                        <div style="
                            position: relative;
                            z-index: 1;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            gap: 16px;
                        ">
                            <div style="flex: 1; min-width: 0;">
                                <div style="
                                    color: rgba(255, 255, 255, 0.95);
                                    font-size: ${index === 0 ? '15px' : '14px'};
                                    font-weight: ${index === 0 ? '700' : '600'};
                                    line-height: 1.3;
                                    white-space: nowrap;
                                    overflow: hidden;
                                    text-overflow: ellipsis;
                                ">${job}</div>
                            </div>

                            <div style="
                                display: flex;
                                align-items: center;
                                gap: 12px;
                            ">
                                <!-- Count badge -->
                                <div style="
                                    background: ${color.accent};
                                    padding: 6px 14px;
                                    border-radius: 20px;
                                    display: flex;
                                    align-items: center;
                                    gap: 6px;
                                ">
                                    <div style="
                                        color: rgba(255, 255, 255, 0.95);
                                        font-size: ${index === 0 ? '16px' : '14px'};
                                        font-weight: 700;
                                    ">${count}</div>
                                    <div style="
                                        color: rgba(255, 255, 255, 0.7);
                                        font-size: 11px;
                                        font-weight: 500;
                                    ">veces</div>
                                </div>

                                <!-- Percentage -->
                                <div style="
                                    color: rgba(255, 255, 255, 0.6);
                                    font-size: 12px;
                                    font-weight: 600;
                                    min-width: 45px;
                                    text-align: right;
                                ">${percentage.toFixed(0)}%</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div style="
                    display: flex;
                    flex-direction: column;
                    height: 100%;
                    width: 100%;
                    padding: 8px 0;
                ">
                    ${jobCards}
                </div>
            `;
        }

        function generateRevenueByCity(appointments) {
            const cityRevenue = {};
            const cityCount = {};

            // Calculate revenue and count per city
            appointments.forEach(apt => {
                if (apt.city && apt.price) {
                    const price = parseFloat(apt.price);
                    if (!isNaN(price)) {
                        cityRevenue[apt.city] = (cityRevenue[apt.city] || 0) + price;
                        cityCount[apt.city] = (cityCount[apt.city] || 0) + 1;
                    }
                }
            });

            const cityAverages = Object.entries(cityRevenue)
                .map(([city, revenue]) => ({
                    city,
                    revenue,
                    avgTicket: revenue / cityCount[city],
                    visits: cityCount[city]
                }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 6); // Top 6 cities

            const container = document.getElementById('revenue-by-city');

            if (cityAverages.length === 0) {
                container.innerHTML = '<div style="color: rgba(255, 255, 255, 0.6); text-align: center; padding: 40px; font-size: 14px;">No hay datos disponibles</div>';
                return;
            }

            const maxRevenue = Math.max(...cityAverages.map(c => c.revenue));

            // Color variations for revenue cards
            const colorPairs = [
                { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.4)' },  // Green
                { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.4)' },  // Blue
                { bg: 'rgba(251, 146, 60, 0.2)', border: 'rgba(251, 146, 60, 0.4)' },  // Amber
                { bg: 'rgba(139, 92, 246, 0.2)', border: 'rgba(139, 92, 246, 0.4)' },  // Violet
                { bg: 'rgba(236, 72, 153, 0.2)', border: 'rgba(236, 72, 153, 0.4)' },  // Pink
                { bg: 'rgba(20, 184, 166, 0.2)', border: 'rgba(20, 184, 166, 0.4)' }   // Teal
            ];

            // Create revenue cards with slides
            const revenueCards = cityAverages.map(({city, revenue, visits, avgTicket}, index) => {
                const intensity = (revenue / maxRevenue);

                // Grid positioning
                let gridPosition, fontSize, revenueSize;
                if (index === 0) {
                    gridPosition = 'grid-column: 1 / 3; grid-row: 1 / 3;';
                    fontSize = '17px';
                    revenueSize = '32px';
                } else if (index === 1) {
                    gridPosition = 'grid-column: 3 / 4; grid-row: 1 / 2;';
                    fontSize = '14px';
                    revenueSize = '24px';
                } else if (index === 2) {
                    gridPosition = 'grid-column: 4 / 5; grid-row: 1 / 2;';
                    fontSize = '14px';
                    revenueSize = '24px';
                } else if (index === 3) {
                    gridPosition = 'grid-column: 3 / 4; grid-row: 2 / 3;';
                    fontSize = '13px';
                    revenueSize = '22px';
                } else if (index === 4) {
                    gridPosition = 'grid-column: 4 / 5; grid-row: 2 / 3;';
                    fontSize = '13px';
                    revenueSize = '22px';
                } else {
                    gridPosition = 'grid-column: 1 / 5; grid-row: 3 / 4;';
                    fontSize = '14px';
                    revenueSize = '24px';
                }

                const color1 = colorPairs[index % colorPairs.length];
                const color2 = colorPairs[(index + 1) % colorPairs.length];

                return `
                    <div class="revenue-slider-item" style="${gridPosition} overflow: hidden; border-radius: 12px;">
                        <div class="revenue-slides revenue-slides-${index}">
                            <!-- Slide 1: City + Total Revenue -->
                            <div class="revenue-slide" style="
                                background: ${color1.bg};
                                backdrop-filter: blur(12px);
                                -webkit-backdrop-filter: blur(12px);
                                border: 1px solid ${color1.border};
                                padding: ${index === 0 ? '24px' : '16px'};
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                height: 100%;
                                position: relative;
                            ">
                                <div style="text-align: center; z-index: 1;">
                                    <div style="
                                        color: rgba(255, 255, 255, 0.95);
                                        font-size: ${fontSize};
                                        font-weight: 700;
                                        margin-bottom: 8px;
                                        line-height: 1.2;
                                    ">${city}</div>
                                    <div style="
                                        color: rgba(255, 255, 255, 0.95);
                                        font-size: ${revenueSize};
                                        font-weight: 700;
                                        line-height: 1;
                                    ">$${revenue.toLocaleString()}</div>
                                    <div style="
                                        color: rgba(255, 255, 255, 0.6);
                                        font-size: ${index === 0 ? '12px' : '10px'};
                                        margin-top: 4px;
                                        font-weight: 500;
                                    ">ingresos totales</div>
                                </div>
                            </div>
                            <!-- Slide 2: Visits + Avg Ticket -->
                            <div class="revenue-slide" style="
                                background: ${color2.bg};
                                backdrop-filter: blur(12px);
                                -webkit-backdrop-filter: blur(12px);
                                border: 1px solid ${color2.border};
                                padding: ${index === 0 ? '24px' : '16px'};
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                height: 100%;
                                position: relative;
                            ">
                                <div style="text-align: center; z-index: 1;">
                                    <div style="
                                        color: rgba(255, 255, 255, 0.7);
                                        font-size: ${index === 0 ? '12px' : '10px'};
                                        margin-bottom: 6px;
                                        text-transform: uppercase;
                                        letter-spacing: 1px;
                                    ">${city}</div>
                                    <div style="
                                        color: rgba(255, 255, 255, 0.95);
                                        font-size: ${index === 0 ? '26px' : '20px'};
                                        font-weight: 700;
                                        line-height: 1;
                                        margin-bottom: 8px;
                                    ">${visits}</div>
                                    <div style="
                                        color: rgba(255, 255, 255, 0.6);
                                        font-size: ${index === 0 ? '11px' : '9px'};
                                        margin-bottom: 10px;
                                    ">visitas</div>
                                    <div style="
                                        color: rgba(255, 255, 255, 0.95);
                                        font-size: ${index === 0 ? '18px' : '15px'};
                                        font-weight: 600;
                                    ">$${Math.round(avgTicket)}</div>
                                    <div style="
                                        color: rgba(255, 255, 255, 0.6);
                                        font-size: ${index === 0 ? '10px' : '9px'};
                                    ">promedio</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div style="
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    grid-template-rows: repeat(3, 1fr);
                    gap: 10px;
                    height: 100%;
                    width: 100%;
                    min-height: 240px;
                ">
                    ${revenueCards}
                </div>
            `;

            // Initialize sliders for each revenue card
            cityAverages.forEach((_, index) => {
                initRevenueSlider(index);
            });
        }

        // Initialize individual revenue slider with random timing
        function initRevenueSlider(index) {
            const slidesContainer = document.querySelector(`.revenue-slides-${index}`);
            if (!slidesContainer) return;

            let isSecondSlide = false;

            function getRandomInterval() {
                const min = 3000 + (index * 220);
                const max = 5200 + (index * 380);
                return Math.floor(Math.random() * (max - min + 1)) + min;
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

            const initialDelay = Math.floor(Math.random() * 3800) + (index * 500);
            setTimeout(toggleSlide, initialDelay);
        }

        function generateMonthlyTrend(appointments) {
            const container = document.getElementById('monthly-trend-chart').parentElement;

            console.log('🔍 ===== MONTHLY TREND DEBUG =====');
            console.log('📊 Total appointments received (already filtered):', appointments.length);
            console.log('📊 First 5 appointments:', appointments.slice(0, 5).map(apt => ({
                name: apt.name,
                date: apt.date,
                price: apt.price
            })));

            // Group appointments by month WITH DETAILED LOGGING
            const monthlyData = {};
            const monthDetails = {};

            appointments.forEach(apt => {
                const date = parseLocalDate(apt.date);
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;

                // Store details for debugging
                if (!monthDetails[monthKey]) {
                    monthDetails[monthKey] = [];
                }
                monthDetails[monthKey].push({
                    name: apt.name,
                    date: apt.date,
                    parsedDate: date.toISOString().split('T')[0]
                });
            });

            console.log('📊 Monthly counts:', monthlyData);
            console.log('📊 Detailed breakdown by month:');
            Object.keys(monthlyData).sort().forEach(month => {
                console.log(`  ${month}: ${monthlyData[month]} citas`);
                console.log('    Sample appointments:', monthDetails[month].slice(0, 3));
            });

            const sortedMonths = Object.keys(monthlyData).sort().slice(-6); // Last 6 months

            if (sortedMonths.length === 0) {
                container.innerHTML = `
                    <div style="color: rgba(255, 255, 255, 0.6); text-align: center; padding: 40px; font-size: 14px;">
                        No hay datos disponibles
                    </div>
                `;
                return;
            }

            const maxCount = Math.max(...sortedMonths.map(month => monthlyData[month]));

            // Create month cards
            const monthCards = sortedMonths.map((month, index) => {
                const count = monthlyData[month];
                const prevMonth = index > 0 ? monthlyData[sortedMonths[index - 1]] : count;
                const change = prevMonth > 0 ? ((count - prevMonth) / prevMonth) * 100 : 0;
                const isGrowth = change > 0;
                const isFlat = Math.abs(change) < 5;

                const monthDate = new Date(month + '-01');
                const monthName = monthDate.toLocaleDateString('es-ES', { month: 'short' });
                const year = monthDate.getFullYear();

                // Color based on performance
                let color;
                if (isFlat) {
                    color = { main: 'rgba(59, 130, 246, 0.2)', accent: 'rgba(59, 130, 246, 0.6)', border: 'rgba(59, 130, 246, 0.4)' }; // Blue
                } else if (isGrowth) {
                    color = { main: 'rgba(16, 185, 129, 0.2)', accent: 'rgba(16, 185, 129, 0.6)', border: 'rgba(16, 185, 129, 0.4)' }; // Green
                } else {
                    color = { main: 'rgba(251, 146, 60, 0.2)', accent: 'rgba(251, 146, 60, 0.6)', border: 'rgba(251, 146, 60, 0.4)' }; // Amber
                }

                // Trend icon
                const trendIcon = isFlat ? '→' : (isGrowth ? '↗' : '↘');
                const trendText = isFlat ? 'estable' : (isGrowth ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`);

                // Bar height relative to max
                const barHeight = (count / maxCount) * 100;

                return `
                    <div style="
                        flex: 1;
                        min-width: 110px;
                        background: ${color.main};
                        backdrop-filter: blur(12px);
                        -webkit-backdrop-filter: blur(12px);
                        border: 1px solid ${color.border};
                        border-radius: 12px;
                        padding: 18px 16px 20px 16px;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        position: relative;
                        overflow: visible;
                    "
                    onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='${color.accent}'"
                    onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='${color.border}'">
                        <!-- Header -->
                        <div style="
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            position: relative;
                            z-index: 2;
                        ">
                            <div>
                                <div style="
                                    color: rgba(255, 255, 255, 0.95);
                                    font-size: 13px;
                                    font-weight: 700;
                                    text-transform: capitalize;
                                ">${monthName}</div>
                                <div style="
                                    color: rgba(255, 255, 255, 0.5);
                                    font-size: 10px;
                                    font-weight: 500;
                                ">${year}</div>
                            </div>

                            <!-- Trend badge -->
                            <div style="
                                background: ${color.accent};
                                padding: 4px 8px;
                                border-radius: 12px;
                                font-size: 11px;
                                font-weight: 600;
                                color: rgba(255, 255, 255, 0.95);
                            ">
                                ${trendIcon} ${index === 0 ? '' : trendText}
                            </div>
                        </div>

                        <!-- Count -->
                        <div style="
                            color: rgba(255, 255, 255, 0.95);
                            font-size: 32px;
                            font-weight: 700;
                            line-height: 1.1;
                            position: relative;
                            z-index: 2;
                            margin-top: 4px;
                        ">${count}</div>

                        <div style="
                            color: rgba(255, 255, 255, 0.6);
                            font-size: 11px;
                            font-weight: 500;
                            position: relative;
                            z-index: 2;
                        ">citas</div>

                        <!-- Visual bar -->
                        <div style="
                            position: absolute;
                            bottom: 0;
                            left: 0;
                            right: 0;
                            height: ${barHeight}%;
                            background: ${color.accent};
                            opacity: 0.1;
                            transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                            z-index: 1;
                            border-radius: 0 0 12px 12px;
                        "></div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div style="
                    display: flex;
                    gap: 12px;
                    width: 100%;
                    height: 100%;
                    padding: 12px 0;
                    overflow-x: auto;
                    overflow-y: visible;
                ">
                    ${monthCards}
                </div>
            `;
        }

        function getTimeAgo(date) {
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) return 'Hace un momento';
            if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
            if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
            if (diffInSeconds < 2592000) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
            return date.toLocaleDateString('es-ES');
        }

        // Monthly Trend using CALENDAR data source
        async function generateMonthlyTrendFromCalendar() {
            console.log('🔍 ==================== MONTHLY TREND DEBUG START ====================');

            const container = document.getElementById('monthly-trend-chart')?.parentElement;
            if (!container) {
                console.error('❌ Container not found!');
                return;
            }
            console.log('✅ Container found:', container);

            try {
                // Use EXACT same data source as calendar
                console.log('📡 Fetching appointments from OfflineDB...');
                const allAppointments = await OfflineDB.getAppointments();
                console.log('📊 Total appointments received:', allAppointments.length);

                // Log first 5 appointments to see the data structure
                console.log('📋 First 5 appointments:', allAppointments.slice(0, 5).map(apt => ({
                    name: apt.name,
                    date: apt.date,
                    price: apt.price,
                    city: apt.city
                })));

                // Group by month
                console.log('📁 Starting to group appointments by month...');
                const monthlyData = {};
                let skippedNoDate = 0;
                let skippedNoName = 0;
                let processed = 0;

                allAppointments.forEach((apt, index) => {
                    if (!apt.date) {
                        skippedNoDate++;
                        return;
                    }
                    if (!apt.name || !apt.name.trim()) {
                        skippedNoName++;
                        return;
                    }

                    const dateParts = apt.date.split('-'); // YYYY-MM-DD
                    if (dateParts.length !== 3) {
                        console.warn(`⚠️ Invalid date format at index ${index}:`, apt.date);
                        return;
                    }

                    const monthKey = `${dateParts[0]}-${dateParts[1]}`; // YYYY-MM

                    if (!monthlyData[monthKey]) {
                        monthlyData[monthKey] = [];
                        console.log(`📅 New month found: ${monthKey}`);
                    }
                    monthlyData[monthKey].push(apt);
                    processed++;
                });

                console.log(`📊 Processing summary:
                    - Total appointments: ${allAppointments.length}
                    - Processed: ${processed}
                    - Skipped (no date): ${skippedNoDate}
                    - Skipped (no name): ${skippedNoName}`);

                console.log('📊 FINAL MONTHLY DATA:', Object.keys(monthlyData).sort().map(month => ({
                    month,
                    count: monthlyData[month].length,
                    samples: monthlyData[month].slice(0, 2).map(apt => `${apt.name} (${apt.date})`)
                })));

                const sortedMonths = Object.keys(monthlyData).sort();

                if (sortedMonths.length === 0) {
                    container.innerHTML = `
                        <div style="color: rgba(255, 255, 255, 0.6); text-align: center; padding: 40px; font-size: 14px;">
                            No hay datos disponibles
                        </div>
                    `;
                    return;
                }

                const maxCount = Math.max(...sortedMonths.map(month => monthlyData[month].length));

                // Create month cards
                const monthCards = sortedMonths.map((month, index) => {
                    const count = monthlyData[month].length;
                    const prevMonth = index > 0 ? monthlyData[sortedMonths[index - 1]].length : count;
                    const change = prevMonth > 0 ? ((count - prevMonth) / prevMonth) * 100 : 0;
                    const isGrowth = change > 0;
                    const isFlat = Math.abs(change) < 5;

                    // FIX: Parse month correctly to avoid off-by-one errors
                    const [yearStr, monthStr] = month.split('-');
                    const year = parseInt(yearStr);
                    const monthNum = parseInt(monthStr); // 1-12 (not 0-indexed)

                    // Create date using 0-indexed month for JavaScript
                    const monthDate = new Date(year, monthNum - 1, 1);
                    const monthName = monthDate.toLocaleDateString('es-ES', { month: 'short' });

                    console.log(`🔍 Month ${month} -> Display name: ${monthName} ${year}`);

                    // Color based on performance
                    let color;
                    if (isFlat) {
                        color = { main: 'rgba(59, 130, 246, 0.2)', accent: 'rgba(59, 130, 246, 0.6)', border: 'rgba(59, 130, 246, 0.4)' };
                    } else if (isGrowth) {
                        color = { main: 'rgba(16, 185, 129, 0.2)', accent: 'rgba(16, 185, 129, 0.6)', border: 'rgba(16, 185, 129, 0.4)' };
                    } else {
                        color = { main: 'rgba(251, 146, 60, 0.2)', accent: 'rgba(251, 146, 60, 0.6)', border: 'rgba(251, 146, 60, 0.4)' };
                    }

                    const trendIcon = isFlat ? '→' : (isGrowth ? '↗' : '↘');
                    const trendText = isFlat ? 'estable' : (isGrowth ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`);
                    const barHeight = (count / maxCount) * 100;

                    return `
                        <div style="
                            flex: 1;
                            min-width: 110px;
                            background: ${color.main};
                            backdrop-filter: blur(12px);
                            -webkit-backdrop-filter: blur(12px);
                            border: 1px solid ${color.border};
                            border-radius: 12px;
                            padding: 18px 16px 20px 16px;
                            display: flex;
                            flex-direction: column;
                            gap: 10px;
                            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                            position: relative;
                            overflow: visible;
                        "
                        onmouseover="this.style.transform='translateY(-4px)'; this.style.borderColor='${color.accent}'"
                        onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='${color.border}'">
                            <div style="
                                display: flex;
                                justify-content: space-between;
                                align-items: flex-start;
                                position: relative;
                                z-index: 2;
                            ">
                                <div>
                                    <div style="
                                        color: rgba(255, 255, 255, 0.95);
                                        font-size: 13px;
                                        font-weight: 700;
                                        text-transform: capitalize;
                                    ">${monthName}</div>
                                    <div style="
                                        color: rgba(255, 255, 255, 0.5);
                                        font-size: 10px;
                                        font-weight: 500;
                                    ">${year}</div>
                                </div>
                                <div style="
                                    background: ${color.accent};
                                    padding: 4px 8px;
                                    border-radius: 12px;
                                    font-size: 11px;
                                    font-weight: 600;
                                    color: rgba(255, 255, 255, 0.95);
                                ">
                                    ${trendIcon} ${index === 0 ? '' : trendText}
                                </div>
                            </div>
                            <div style="
                                color: rgba(255, 255, 255, 0.95);
                                font-size: 32px;
                                font-weight: 700;
                                line-height: 1.1;
                                position: relative;
                                z-index: 2;
                                margin-top: 4px;
                            ">${count}</div>
                            <div style="
                                color: rgba(255, 255, 255, 0.6);
                                font-size: 11px;
                                font-weight: 500;
                                position: relative;
                                z-index: 2;
                            ">citas</div>
                            <div style="
                                position: absolute;
                                bottom: 0;
                                left: 0;
                                right: 0;
                                height: ${barHeight}%;
                                background: ${color.accent};
                                opacity: 0.1;
                                transition: height 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                                z-index: 1;
                                border-radius: 0 0 12px 12px;
                            "></div>
                        </div>
                    `;
                }).join('');

                console.log('🎨 Rendering chart with', sortedMonths.length, 'months');
                console.log('📊 Months being displayed:', sortedMonths.map(m => {
                    const [y, mon] = m.split('-');
                    const date = new Date(parseInt(y), parseInt(mon) - 1, 1);
                    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }) + ' (' + monthlyData[m].length + ' citas)';
                }));

                container.innerHTML = `
                    <div style="
                        display: flex;
                        gap: 12px;
                        width: 100%;
                        height: 100%;
                        padding: 12px 0;
                        overflow-x: auto;
                        overflow-y: visible;
                    ">
                        ${monthCards}
                    </div>
                `;

                console.log('✅ Chart rendered successfully!');
                console.log('🔍 ==================== MONTHLY TREND DEBUG END ====================');
            } catch (error) {
                console.error('❌ ERROR in generateMonthlyTrendFromCalendar:', error);
                console.error('❌ Error stack:', error.stack);
                container.innerHTML = `
                    <div style="color: rgba(255, 255, 255, 0.6); text-align: center; padding: 40px; font-size: 14px;">
                        Error cargando datos: ${error.message}
                    </div>
                `;
            }
        }

        // Client Registry Functions
        async function loadClientRegistry() {
            try {
                // Get appointments from the same source as the calendar
                let appointments = await OfflineDB.getAppointments();

                // If online, try to get from Supabase, but merge with local data for phone numbers AND notes
                if (navigator.onLine) {
                    try {
                        const supabaseAppointments = await getAppointmentsFromSupabase();
                        if (supabaseAppointments && supabaseAppointments.length > 0) {
                            // Create a map of local appointments for quick lookup
                            const localMap = new Map();
                            appointments.forEach(apt => {
                                if (apt.id) localMap.set(apt.id, apt);
                                else if (apt.timestamp) localMap.set(apt.timestamp, apt);
                            });

                            // Merge Supabase data with local-only fields (phone, notes)
                            console.log('🔄 Merging Supabase appointments with local data (phones + notes)');
                            appointments = supabaseAppointments.map(supabaseApt => {
                                const localApt = localMap.get(supabaseApt.id) || localMap.get(supabaseApt.timestamp);
                                return {
                                    ...supabaseApt,
                                    phone: localApt?.phone || PhoneManager.get(supabaseApt.id) || '',
                                    notes: localApt?.notes || '' // Preserve local notes!
                                };
                            });
                            console.log('✅ Loaded client registry with merged data (Supabase + local phones + notes):', appointments.length);
                        }
                    } catch (error) {
                        console.log('⚠️ Supabase unavailable, using offline data for registry');
                    }
                }

                // Convert appointments to client records
                const clientMap = new Map();

                appointments.forEach(apt => {
                    if (apt.name && apt.name.trim()) {
                        const clientKey = apt.name.toLowerCase().trim();
                        const existingClient = clientMap.get(clientKey);

                        if (!existingClient || parseLocalDate(apt.date) > parseLocalDate(existingClient.timestamp)) {
                            clientMap.set(clientKey, {
                                id: clientKey, // Use client name as ID for easier lookup
                                name: apt.name,
                                phone: apt.phone || 'N/A',
                                city: apt.city || apt.address || 'N/A',
                                address: apt.address || '',
                                timestamp: apt.date || new Date().toISOString(),
                                totalSpent: parseFloat(apt.price) || 0,
                                appointmentCount: 1,
                                lastService: apt.time || 'N/A'
                            });
                        } else {
                            // Update existing client data
                            existingClient.totalSpent += parseFloat(apt.price) || 0;
                            existingClient.appointmentCount += 1;
                            if (apt.phone && apt.phone !== 'N/A') {
                                existingClient.phone = apt.phone;
                            }
                        }
                    }
                });

                const clients = Array.from(clientMap.values());
                console.log('📊 Client registry loaded:', clients.length, 'unique clients');
                console.log('📊 Clients with phone data:', clients.map(c => ({name: c.name, phone: c.phone})));

                displayClients(clients);
                updateRegistryStats(clients);
                populateCityFilter(clients);

            } catch (error) {
                console.error('❌ Error loading client registry:', error);
                displayClients([]);
            }
        }

        function migrateExistingAppointments() {
            // Migration disabled - using simple structure now
            console.log('⚠️ Migration function disabled');
            return;
        }

        function displayClients(clients) {
            const grid = document.getElementById('clients-grid');
            
            if (clients.length === 0) {
                grid.innerHTML = `
                    <div class="no-clients">
                        <svg class="no-clients-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <h3>No hay clientes registrados</h3>
                        <p>Los clientes se agregarán automáticamente cuando agendes citas</p>
                    </div>
                `;
                return;
            }

            // Sort clients by timestamp (most recent first)
            clients.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            grid.innerHTML = clients.map(client => {
                const appointmentDate = new Date(client.timestamp);
                const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                });

                return `
                    <div class="client-card" onclick="viewClientDetails('${client.id}')">
                        <div style="display: flex; align-items: center; justify-content: space-between;">
                            <div style="flex: 1; min-width: 0;">
                                <h3 style="font-size: 15px; font-weight: 600; color: #2d333a; margin: 0 0 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${client.name}</h3>
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                                    <svg style="width: 14px; height: 14px; color: #6b7280; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                        <circle cx="12" cy="10" r="3"></circle>
                                    </svg>
                                    <span style="color: #6b7280; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${client.city}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <svg style="width: 14px; height: 14px; color: #6b7280; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                                    </svg>
                                    <span style="color: #6b7280; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${client.phone}</span>
                                </div>
                            </div>
                            <span style="background: #10a37f; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; flex-shrink: 0;">${client.lastService}</span>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function updateRegistryStats(clients) {
            const totalClients = clients.length;
            const totalSpent = clients.reduce((sum, client) => sum + parseFloat(client.price || 0), 0);
            const avgPrice = totalClients > 0 ? totalSpent / totalClients : 0;

            const totalClientsEl = document.getElementById('total-clients');
            const avgPriceEl = document.getElementById('avg-price');
            
            if (totalClientsEl) totalClientsEl.textContent = totalClients;
            if (avgPriceEl) avgPriceEl.textContent = `$${avgPrice.toFixed(0)}`;
        }

        function populateCityFilter(clients) {
            const cities = [...new Set(clients.map(client => client.city))].sort();
            const citySelect = document.getElementById('search-city');
            
            // Clear existing options (except "All cities")
            citySelect.innerHTML = '<option value="">Todas las ciudades</option>';
            
            cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                citySelect.appendChild(option);
            });
        }

        function searchClients() {
            const clients = JSON.parse(localStorage.getItem('clientRegistry') || '[]');
            const nameQuery = document.getElementById('search-name').value.toLowerCase().trim();
            const cityFilter = document.getElementById('search-city').value;
            const jobFilter = document.getElementById('search-job').value;

            const filteredClients = clients.filter(client => {
                const matchesName = !nameQuery || client.name.toLowerCase().includes(nameQuery);
                const matchesCity = !cityFilter || client.city === cityFilter;
                const matchesJob = !jobFilter || client.appointments.some(apt => 
                    apt.job.toLowerCase().includes(jobFilter)
                );

                return matchesName && matchesCity && matchesJob;
            });

            displayClients(filteredClients);
        }

        async function viewClientDetails(clientId) {
            console.log('🔍 viewClientDetails called with clientId:', clientId);
            try {
                // Get appointments with phone numbers applied by PhoneManager
                let appointments = await OfflineDB.getAppointments();
                console.log('📋 Got appointments with phones applied:', appointments.length);
                console.log('📋 Appointments phone data:', appointments.map(a => ({id: a.id, name: a.name, phone: a.phone})));

                console.log('🔍 Looking for client with name key:', clientId);

                // The clientId is now the client name (lowercase and trimmed)
                // Find all appointments for this client
                const clientAppointments = appointments.filter(apt =>
                    apt.name && apt.name.toLowerCase().trim() === clientId
                );

                console.log('📋 Found', clientAppointments.length, 'appointments for client:', clientId);

                if (clientAppointments.length === 0) {
                    console.error('❌ No appointments found for client:', clientId);
                    alert('No se pudo encontrar la información del cliente');
                    return;
                }

                // Get the most recent appointment for main client data
                const mainAppointment = clientAppointments
                    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

                // Calculate totals
                const totalSpent = clientAppointments.reduce((sum, apt) => sum + (parseFloat(apt.price) || 0), 0);
                const appointmentCount = clientAppointments.length;

                // Sort appointments by date (most recent first) for display
                const sortedAppointments = clientAppointments
                    .sort((a, b) => new Date(b.date) - new Date(a.date));

                // Use the most recent appointment as the main appointment
                const recentAppointment = mainAppointment;

                // Build the modal content
                const modalContent = document.getElementById('client-details-content');
                modalContent.innerHTML = `
                    <div style="margin-bottom: 24px;">
                        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                            <div style="width: 50px; height: 50px; background: var(--brand-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 18px;">
                                ${recentAppointment.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 style="margin: 0; color: var(--text-primary); font-size: 20px;">${recentAppointment.name}</h3>
                                <p style="margin: 0; color: var(--text-secondary); font-size: 14px;">${appointmentCount} cita${appointmentCount !== 1 ? 's' : ''} realizadas</p>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <svg width="16" height="16" fill="var(--text-secondary)" viewBox="0 0 24 24">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                                    </svg>
                                    <span style="color: var(--text-secondary); font-size: 12px; font-weight: 500;">TELÉFONO</span>
                                </div>
                                <p style="margin: 0; color: var(--text-primary); font-weight: 500;">${recentAppointment.phone || 'No registrado'}</p>
                            </div>

                            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <svg width="16" height="16" fill="var(--text-secondary)" viewBox="0 0 24 24">
                                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                                        <circle cx="12" cy="10" r="3"/>
                                    </svg>
                                    <span style="color: var(--text-secondary); font-size: 12px; font-weight: 500;">CIUDAD</span>
                                </div>
                                <p style="margin: 0; color: var(--text-primary); font-weight: 500;">${recentAppointment.city || recentAppointment.address || 'No registrada'}</p>
                            </div>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <svg width="16" height="16" fill="var(--text-secondary)" viewBox="0 0 24 24">
                                        <line x1="12" y1="1" x2="12" y2="23"/>
                                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                    </svg>
                                    <span style="color: var(--text-secondary); font-size: 12px; font-weight: 500;">TOTAL GASTADO</span>
                                </div>
                                <p style="margin: 0; color: var(--brand-primary); font-weight: bold; font-size: 18px;">$${totalSpent.toFixed(2)}</p>
                            </div>

                            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                    <svg width="16" height="16" fill="var(--text-secondary)" viewBox="0 0 24 24">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                                        <line x1="16" y1="2" x2="16" y2="6"/>
                                        <line x1="8" y1="2" x2="8" y2="6"/>
                                        <line x1="3" y1="10" x2="21" y2="10"/>
                                    </svg>
                                    <span style="color: var(--text-secondary); font-size: 12px; font-weight: 500;">ÚLTIMA CITA</span>
                                </div>
                                <p style="margin: 0; color: var(--text-primary); font-weight: 500;">${new Date(recentAppointment.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            </div>
                        </div>
                    </div>

                    <div style="border-top: 1px solid var(--bg-border); padding-top: 20px;">
                        <h4 style="margin: 0 0 16px 0; color: var(--text-primary); font-size: 16px; font-weight: 600;">Historial de Citas</h4>
                        <div style="max-height: 300px; overflow-y: auto;">
                            ${sortedAppointments.map(apt => {
                                const appointmentDate = parseLocalDate(apt.date);
                                const formattedDate = appointmentDate.toLocaleDateString('es-ES', {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                });

                                return `
                                    <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 12px;">
                                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                            <div>
                                                <p style="margin: 0; color: var(--text-primary); font-weight: 500; font-size: 14px;">${apt.job || 'Servicio de limpieza'}</p>
                                                <p style="margin: 0; color: var(--text-secondary); font-size: 12px;">${formattedDate} • ${apt.time}</p>
                                            </div>
                                            <span style="color: var(--brand-primary); font-weight: bold; font-size: 14px;">$${parseFloat(apt.price || 0).toFixed(2)}</span>
                                        </div>
                                        ${apt.address ? `<p style="margin: 0; color: var(--text-secondary); font-size: 12px;"><svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" style="margin-right: 4px; vertical-align: middle;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${apt.address}</p>` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;

                // Show the modal
                document.getElementById('client-details-modal').style.display = 'flex';
            } catch (error) {
                console.error('Error showing client details:', error);
                alert('Error al cargar los detalles del cliente');
            }
        }

        function closeClientDetailsModal() {
            document.getElementById('client-details-modal').style.display = 'none';
        }

        // Functions will be made globally available after DOMContentLoaded


        function showSuccess() {
            const successMsg = document.getElementById('success-message');
            successMsg.style.display = 'block';
            setTimeout(() => {
                successMsg.style.display = 'none';
            }, 3000);
            
            // Update appointments counter
            updateAppointmentCounter();
        }

        function showError(message) {
            const errorMsg = document.getElementById('error-message');
            errorMsg.textContent = message;
            errorMsg.style.display = 'block';
            setTimeout(() => {
                errorMsg.style.display = 'none';
            }, 5000);
        }

        // Navigation functions
        function setupNavigation() {
            const menuItems = document.querySelectorAll('.menu-item');
            menuItems.forEach((item, index) => {
                item.addEventListener('click', () => {
                    // Remove active class from all items
                    menuItems.forEach(menuItem => menuItem.classList.remove('active'));
                    // Add active class to clicked item
                    item.classList.add('active');
                    
                    // Show corresponding view
                    switch(index) {
                        case 0: // Agendar Citas
                            showView('schedule');
                            break;
                        case 1: // Ver Calendario
                            showView('calendar');
                            break;
                        case 2: // Registro
                            showView('history');
                            loadClientRegistry();
                            break;
                        case 3: // Datos
                            showView('datos');
                            loadDatosAnalytics();
                            break;
                        case 4: // Finanzas
                            showView('finance');
                            loadFinanceData();
                            break;
                        case 5: // Mensajes
                            showView('messages');
                            break;
                        case 6: // Configuración
                            showView('settings');
                            break;
                    }
                });
            });
        }

        // Return to Bento Grid from any view
        function returnToBentoGrid() {
            // Close mobile menu if it's open
            closeMobileMenu();

            // Hide and ensure mobile overlay is completely removed
            const overlay = document.querySelector('.mobile-overlay');
            if (overlay) {
                overlay.classList.remove('active');
                overlay.style.display = 'none';
            }

            // Hide main container
            const container = document.querySelector('.container');
            if (container) {
                container.classList.remove('view-enter');
                container.style.display = 'none';
            }

            // Hide back button
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            if (mobileMenuBtn) {
                mobileMenuBtn.style.display = 'none';
            }

            // Hide header when returning to Bento Grid
            const header = document.querySelector('.header');
            if (header) {
                header.style.display = 'none';
            }

            // Show landing page with entrance animation
            const landingView = document.getElementById('landing-view');
            if (landingView) {
                landingView.classList.remove('landing-exit');
                landingView.classList.add('landing-enter');
                landingView.style.display = 'flex';

                // Remove animation class after it completes
                setTimeout(() => {
                    landingView.classList.remove('landing-enter');
                }, 400);
            }

            // Remove any body classes that might affect display
            document.body.classList.remove('mobile-menu-open');

            // Show AI bar on home
            _showAIBar();
        }

        // Navigate from Bento Grid to specific view
        function navigateToView(viewName) {
            const landingView = document.getElementById('landing-view');
            const container = document.querySelector('.container');

            // Close mobile sidebar
            const sidebar = document.getElementById('mobile-sidebar');
            if (sidebar) sidebar.classList.remove('open');
            const overlay = document.querySelector('.mobile-overlay');
            if (overlay) { overlay.classList.remove('active'); overlay.style.display = 'none'; }
            document.body.classList.remove('mobile-menu-open');

            if (!landingView) return;

            // --- STEP 1: Setup container off-screen (right side) IMMEDIATELY ---
            if (container) {
                container.style.transition = 'none';
                container.style.transform = 'translateX(100%)';
                container.style.opacity = '0';
                container.style.display = 'flex';
            }

            // --- STEP 2: Activate menu and render view content while off-screen ---
            _hideAIBar();
            const menuItems = document.querySelectorAll('.menu-item');
            const viewMapping = { schedule:0, calendar:1, history:2, datos:3, finance:4, messages:5, settings:6 };
            const menuIndex = viewMapping[viewName];
            if (menuIndex !== undefined && menuItems[menuIndex]) {
                menuItems.forEach(i => i.classList.remove('active'));
                menuItems[menuIndex].classList.add('active');
            }
            const header = document.querySelector('.header');
            if (header) header.style.display = 'flex';
            const mobileMenuBtn = document.getElementById('mobile-menu-btn');
            if (mobileMenuBtn) mobileMenuBtn.style.display = 'block';

            // Render view content now (data loads while animation plays)
            showView(viewName);

            if (viewName === 'history' && !window._cacheLoaded?.history) {
                loadClientRegistry();
                (window._cacheLoaded = window._cacheLoaded || {}).history = true;
            } else if (viewName === 'datos' && !window._cacheLoaded?.datos) {
                loadDatosAnalytics();
                (window._cacheLoaded = window._cacheLoaded || {}).datos = true;
            } else if (viewName === 'finance' && !window._cacheLoaded?.finance) {
                loadFinanceData();
                (window._cacheLoaded = window._cacheLoaded || {}).finance = true;
            }

            // --- STEP 3: Force reflow then start SIMULTANEOUS slide animation ---
            if (container) void container.offsetWidth;

            const DUR = '0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            // Landing exits to the RIGHT
            landingView.style.transition = `transform ${DUR}, opacity ${DUR}`;
            landingView.style.transform = 'translateX(100%)';
            landingView.style.opacity = '0';
            landingView.style.pointerEvents = 'none';
            // Container slides in from the RIGHT simultaneously
            if (container) {
                container.style.transition = `transform ${DUR}, opacity ${DUR}`;
                container.style.transform = 'translateX(0)';
                container.style.opacity = '1';
            }

            // --- STEP 4: Cleanup after animation ---
            setTimeout(() => {
                landingView.style.display = 'none';
                landingView.style.transform = '';
                landingView.style.opacity = '';
                landingView.style.transition = '';
                landingView.style.pointerEvents = '';
                if (container) {
                    container.style.transform = '';
                    container.style.transition = '';
                }

                // Animate schedule form section on entry
                if (viewName === 'schedule') {
                    const formSec = document.querySelector('#schedule-content-area .form-section');
                    if (formSec) {
                        formSec.style.animation = 'none';
                        void formSec.offsetWidth;
                        formSec.style.animation = 'fadeInScale 0.35s ease-out both';
                    }
                    const uploadArea = document.getElementById('upload-area');
                    if (uploadArea) {
                        uploadArea.style.animation = 'none';
                        void uploadArea.offsetWidth;
                        uploadArea.style.animation = 'fadeIn 0.25s ease-out both';
                    }
                }
            }, 300);
        }

        async function showView(viewName) {
            // Hide all views
            const views = ['calendar', 'history', 'datos', 'pago', 'finance', 'messages', 'settings'];
            views.forEach(view => {
                const element = document.getElementById(view + '-view');
                if (element) {
                    element.style.display = 'none';
                }
            });

            // Handle main content area (schedule view)
            const mainContent = document.querySelector('.content-area:not([id$="-view"])');
            if (viewName === 'schedule') {
                if (mainContent) mainContent.style.display = 'block';
            } else {
                if (mainContent) mainContent.style.display = 'none';
            }

            // Show selected view
            const targetView = document.getElementById(viewName + '-view');
            if (targetView) {
                targetView.style.display = 'block';
            }

            currentView = viewName;

            // Initialize view-specific content
            if (viewName === 'schedule') {
                loadAppointments(); // Update counter when showing schedule
            } else if (viewName === 'calendar') {
                updateToCurrentDay(); // Always ensure we start from current day
                await generateWeeklyCalendar();
            } else if (viewName === 'history') {
                loadClientRegistry();
            } else if (viewName === 'finance') {
                loadFinanceData();
            } else if (viewName === 'settings') {
                const geminiEl = document.getElementById('gemini-api-key');
                if (geminiEl) geminiEl.value = localStorage.getItem('rize_gemini_key') || '';
                const groqEl = document.getElementById('groq-api-key');
                if (groqEl) groqEl.value = localStorage.getItem('rize_groq_key') || '';
            }
        }

        // Weekly Calendar functions
        async function generateWeeklyCalendar() {
            const grid = document.getElementById('weekly-calendar-grid');
            const weekRange = document.getElementById('current-week-range');
            
            // Always show 7 consecutive days starting from currentWeekStart
            const weekEnd = new Date(currentWeekStart);
            weekEnd.setDate(currentWeekStart.getDate() + 6);
            
            // Set the date range display
            const startStr = currentWeekStart.toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'short' 
            });
            const endStr = weekEnd.toLocaleDateString('es-ES', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
            });
            weekRange.textContent = `${startStr} – ${endStr}`;
            
            // Clear grid
            grid.innerHTML = '';
            
            // Check if we're on mobile
            const isMobile = window.innerWidth <= 768;
            
            if (isMobile) {
                await generateMobileCalendar(grid);
            } else {
                await generateDesktopCalendar(grid);
            }
        }

        async function generateMobileCalendar(grid) {
            const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']; // 0=Sunday, 1=Monday, etc.
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Get all appointments first (using unified OfflineDB)
            const allAppointments = await OfflineDB.getAppointments();
            console.log('📅 Calendar loading appointments:', allAppointments.length);
            console.log('📅 Sample appointment data:', allAppointments[0]);
            console.log('🔍 DEBUGGING ALL APPOINTMENT DATES:');
            allAppointments.forEach((apt, index) => {
                console.log(`🔍 Appointment ${index + 1}: date="${apt.date}", name="${apt.name}"`);
            });

            // Generate 7 consecutive days starting from currentWeekStart
            const mobileDays = [];
            for (let i = 0; i < 7; i++) {
                const currentDay = new Date(currentWeekStart);
                currentDay.setDate(currentWeekStart.getDate() + i);
                const dateStr = currentDay.toISOString().split('T')[0];
                const isToday = currentDay.getTime() === today.getTime();
                const dayAppointments = allAppointments.filter(apt => apt.date === dateStr);
                console.log(`📅 Day ${dateStr}: Found ${dayAppointments.length} appointments`);
                if (dayAppointments.length > 0) {
                    console.log(`📅 Appointments for ${dateStr}:`, dayAppointments);
                }
                
                
                mobileDays.push({
                    date: currentDay,
                    dateStr,
                    dayIndex: i,
                    isToday,
                    appointments: dayAppointments,
                    dayName: dayNames[currentDay.getDay()]
                });
            }
            
            mobileDays.forEach(dayData => {
                // Create day section
                const daySection = document.createElement('div');
                daySection.className = 'mobile-day-section';
                daySection.style.cssText = `
                    margin-bottom: 24px;
                    border-radius: 12px;
                    padding: 16px;
                `;
                
                // Day header
                const dayHeader = document.createElement('div');
                dayHeader.className = 'mobile-day-header';
                dayHeader.style.cssText = `
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                    padding-bottom: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
                `;
                
                const dayTitle = document.createElement('div');
                dayTitle.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 12px;
                `;
                
                const dayName = document.createElement('span');
                dayName.textContent = dayData.dayName;
                dayName.style.cssText = `
                    font-size: 18px;
                    font-weight: 700;
                    color: ${dayData.isToday ? '#86efac' : 'rgba(255, 255, 255, 0.95)'};
                `;

                const dayNumber = document.createElement('span');
                dayNumber.textContent = dayData.date.getDate();
                dayNumber.style.cssText = `
                    background: ${dayData.isToday ? '#10a37f' : 'rgba(255, 255, 255, 0.15)'};
                    color: white;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 14px;
                `;
                
                dayTitle.appendChild(dayName);
                dayTitle.appendChild(dayNumber);
                dayHeader.appendChild(dayTitle);
                
                // Gas cost (only if there are appointments)
                if (dayData.appointments.length > 0) {
                    const cities = dayData.appointments.map(apt => apt.city);
                    const dateString = dayData.date.toISOString().split('T')[0]; // YYYY-MM-DD format
                    const gasCost = calculateGasCost(cities, dateString);
                    
                    const gasCostElement = document.createElement('div');
                    gasCostElement.style.cssText = `
                        background: rgba(59, 130, 246, 0.25);
                        backdrop-filter: blur(8px);
                        -webkit-backdrop-filter: blur(8px);
                        color: rgba(147, 197, 253, 0.95);
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: 600;
                        border: 1px solid rgba(59, 130, 246, 0.35);
                        box-shadow: 0 2px 6px rgba(59, 130, 246, 0.15);
                    `;
                    gasCostElement.textContent = `$${gasCost.toFixed(2)}`;
                    dayHeader.appendChild(gasCostElement);
                }
                
                daySection.appendChild(dayHeader);
                
                // Check for day events (vacaciones, libre, etc.)
                const dayEvent = getDayEvent(dayData.dateStr);
                
                // Appointments as client cards OR empty state OR day event
                if (dayData.appointments.length > 0) {
                    dayData.appointments.forEach(appointment => {
                        const clientCard = document.createElement('div');
                        clientCard.className = 'mobile-client-card';
                        clientCard.style.cssText = `
                            border-radius: 8px;
                            padding: 12px;
                            margin-bottom: 8px;
                            cursor: pointer;
                            transition: all 0.2s;
                        `;
                        
                        clientCard.innerHTML = `
                            <div style="display: flex; align-items: center; justify-content: space-between;">
                                <div style="flex: 1; min-width: 0;">
                                    <h3 style="font-size: 15px; font-weight: 600; color: rgba(255, 255, 255, 0.95); margin: 0 0 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${appointment.name}</h3>
                                    <div style="display: flex; align-items: center; gap: 6px;">
                                        <svg style="width: 14px; height: 14px; color: rgba(255, 255, 255, 0.7); flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                            <circle cx="12" cy="10" r="3"></circle>
                                        </svg>
                                        <span style="color: rgba(255, 255, 255, 0.7); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${appointment.city}</span>
                                    </div>
                                    ${appointment.notes ? `<div style="margin-top: 6px; padding: 6px 8px; background: rgba(255, 255, 255, 0.1); border-radius: 6px; border-left: 2px solid rgba(59, 130, 246, 0.5);"><span style="color: rgba(255, 255, 255, 0.6); font-size: 12px; font-style: italic;">${appointment.notes}</span></div>` : ''}
                                </div>
                                <span style="background: rgba(59, 130, 246, 0.3); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: white; border: 1px solid rgba(59, 130, 246, 0.4); padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; flex-shrink: 0; box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);">${appointment.time}</span>
                            </div>
                        `;
                        
                        clientCard.addEventListener('click', () => showAppointmentDetails(appointment));
                        daySection.appendChild(clientCard);
                    });
                    
                    // Add "Agendar Cita" button if there's still room for more appointments
                    const availableSlots = MAX_APPOINTMENTS_PER_DAY - dayData.appointments.length;
                    if (availableSlots > 0) {
                        const addAppointmentBtn = document.createElement('button');
                        addAppointmentBtn.style.cssText = `
                            width: 100%;
                            background: rgba(59, 130, 246, 0.25);
                            backdrop-filter: blur(12px);
                            -webkit-backdrop-filter: blur(12px);
                            color: rgba(255, 255, 255, 0.95);
                            border: 1px solid rgba(59, 130, 246, 0.3);
                            border-radius: 8px;
                            padding: 12px 16px;
                            font-size: 14px;
                            font-weight: 600;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            margin-top: 8px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 8px;
                            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
                        `;
                        addAppointmentBtn.innerHTML = `
                            <svg style="width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                <path d="m9 14 2 2 4-4"></path>
                            </svg>
                            Agendar Cita
                        `;
                        
                        addAppointmentBtn.addEventListener('click', () => {
                            showView('schedule');
                        });
                        
                        addAppointmentBtn.addEventListener('mouseover', () => {
                            addAppointmentBtn.style.background = 'rgba(59, 130, 246, 0.35)';
                            addAppointmentBtn.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                            addAppointmentBtn.style.transform = 'translateY(-2px)';
                            addAppointmentBtn.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.25)';
                        });

                        addAppointmentBtn.addEventListener('mouseout', () => {
                            addAppointmentBtn.style.background = 'rgba(59, 130, 246, 0.25)';
                            addAppointmentBtn.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                            addAppointmentBtn.style.transform = 'translateY(0)';
                            addAppointmentBtn.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
                        });
                        
                        daySection.appendChild(addAppointmentBtn);
                    }
                } else if (dayEvent) {
                    // Show day event
                    const eventCard = document.createElement('div');
                    eventCard.className = 'mobile-client-card';
                    eventCard.style.cssText = `
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                    `;
                    
                    const eventConfig = {
                        'vacaciones': {
                            color: '#fca5a5',
                            icon: 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z',
                            text: 'Vacaciones'
                        },
                        'libre': {
                            color: '#86efac',
                            icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
                            text: 'Día Libre'
                        },
                        'compromiso': {
                            color: '#fcd34d',
                            icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.5 6L12 10.5 8.5 8 12 5.5 15.5 8z',
                            text: 'Compromiso'
                        },
                        'salida': {
                            color: '#c4b5fd',
                            icon: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
                            text: 'Salida'
                        },
                        'sin-pega': {
                            color: '#d1d5db',
                            icon: 'M18 6L6 18M6 6l12 12',
                            text: 'Sin Pega'
                        }
                    };

                    const config = eventConfig[dayEvent];
                    eventCard.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <svg style="width: 20px; height: 20px; color: ${config.color}; flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="${config.icon}"></path>
                            </svg>
                            <p style="margin: 0; color: ${config.color}; font-weight: 600; font-size: 14px; flex: 1;">${config.text}</p>
                            <span style="color: ${config.color}; font-size: 12px; opacity: 0.7;">Todo el día</span>
                        </div>
                    `;
                    
                    // Add click to remove event
                    eventCard.style.cursor = 'pointer';
                    eventCard.addEventListener('click', () => {
                        if (confirm('¿Quieres eliminar este evento?')) {
                            removeEventFromDay(dayData.dateStr);
                        }
                    });
                    
                    daySection.appendChild(eventCard);
                } else {
                    // Empty state for days without appointments
                    const emptyState = document.createElement('div');
                    emptyState.className = 'empty-state mobile-client-card';
                    emptyState.style.cssText = `
                        border: 1px dashed rgba(255, 255, 255, 0.3);
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 8px;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    `;
                    
                    emptyState.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                            <svg style="width: 16px; height: 16px; color: rgba(255, 255, 255, 0.7); flex-shrink: 0;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span style="color: rgba(255, 255, 255, 0.7); font-size: 14px; flex: 1; font-style: italic;">Sin citas programadas</span>
                        </div>
                        <button style="background: rgba(59, 130, 246, 0.3); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); color: white; border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 6px; padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer; flex-shrink: 0; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);">
                            + Evento
                        </button>
                    `;
                    
                    emptyState.addEventListener('click', () => showEventOptions(dayData.dateStr));
                    emptyState.addEventListener('mouseover', () => {
                        emptyState.style.borderColor = 'rgba(59, 130, 246, 0.5)';
                    });
                    emptyState.addEventListener('mouseout', () => {
                        emptyState.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    });
                    
                    daySection.appendChild(emptyState);
                }
                
                grid.appendChild(daySection);
            });
        }

        async function generateDesktopCalendar(grid) {
            const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']; // 0=Sunday, 1=Monday, etc.
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Get all appointments first (using unified OfflineDB)
            const allAppointments = await OfflineDB.getAppointments();
            console.log('🖥️ Desktop Calendar loading appointments:', allAppointments.length);

            // Generate 7 consecutive days starting from currentWeekStart
            for (let i = 0; i < 7; i++) {
                const currentDay = new Date(currentWeekStart);
                currentDay.setDate(currentWeekStart.getDate() + i);
                const dateStr = currentDay.toISOString().split('T')[0];
                
                
                // Check if this is today
                const isToday = currentDay.getTime() === today.getTime();
                
                // Get appointments for this day
                const dayAppointments = allAppointments.filter(apt => apt.date === dateStr);
                let availableSlots = MAX_APPOINTMENTS_PER_DAY - dayAppointments.length;
                
                // Create day column 
                const dayColumn = document.createElement('div');
                dayColumn.className = isToday ? 'day-column today' : 'day-column';
                
                // Day header (clean, without gas cost)
                const dayHeader = document.createElement('div');
                dayHeader.className = 'day-header';
                
                const dayName = document.createElement('div');
                dayName.className = 'day-name';
                dayName.textContent = dayNames[currentDay.getDay()]; // Use actual day name based on date
                dayHeader.appendChild(dayName);
                
                const dayNumber = document.createElement('div');
                dayNumber.className = isToday ? 'day-number today' : 'day-number';
                dayNumber.textContent = currentDay.getDate();
                dayHeader.appendChild(dayNumber);
                dayColumn.appendChild(dayHeader);
                
                // Create wrapper for gas cost and day column
                const dayWrapper = document.createElement('div');
                dayWrapper.className = 'day-wrapper';
                
                // Add gas cost OUTSIDE and ABOVE the day column if there are appointments
                if (dayAppointments.length > 0) {
                    const cities = dayAppointments.map(apt => apt.city);
                    const gasCost = calculateGasCost(cities, dateStr); // Use historical price for this date
                    
                    const gasCostElement = document.createElement('div');
                    gasCostElement.className = 'gas-cost-outside';
                    gasCostElement.style.cssText = `
                        background: rgba(59, 130, 246, 0.3);
                        backdrop-filter: blur(10px);
                        -webkit-backdrop-filter: blur(10px);
                        color: rgba(255, 255, 255, 0.95);
                        border: 1px solid rgba(59, 130, 246, 0.4);
                        padding: 4px 8px;
                        margin-bottom: 4px;
                        border-radius: 6px;
                        text-align: center;
                        font-weight: 600;
                        font-size: 11px;
                        line-height: 1.2;
                        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
                    `;
                    gasCostElement.textContent = `$${gasCost.toFixed(2)}`;
                    dayWrapper.appendChild(gasCostElement);
                }
                
                // Always add the dayColumn to the wrapper
                dayWrapper.appendChild(dayColumn);
                
                // Check for day events (vacaciones, libre, etc.)
                const dayEvent = getDayEvent(dateStr);
                
                if (dayEvent) {
                    // Show day event in desktop
                    const eventSlot = document.createElement('div');
                    eventSlot.className = 'appointment-slot event-slot';
                    
                    const eventConfig = {
                        'vacaciones': { color: '#dc2626', bg: '#fee2e2', text: '🔴 Vacaciones' },
                        'libre': { color: '#059669', bg: '#dcfce7', text: '🟢 Día Libre' },
                        'compromiso': { color: '#d97706', bg: '#fef3c7', text: '🟠 Compromiso' },
                        'salida': { color: '#7c3aed', bg: '#ede9fe', text: '🟣 Salida' },
                        'sin-pega': { color: '#6b7280', bg: '#f3f4f6', text: '⚫ Sin Pega' }
                    };
                    
                    const config = eventConfig[dayEvent];
                    eventSlot.style.cssText = `
                        background: ${config.bg};
                        color: ${config.color};
                        border: 1px solid ${config.color}40;
                        text-align: center;
                        font-weight: 600;
                        cursor: pointer;
                    `;
                    
                    eventSlot.innerHTML = `
                        <div class="slot-time">${config.text}</div>
                        <div class="slot-info">Click para eliminar</div>
                    `;
                    
                    eventSlot.addEventListener('click', () => {
                        if (confirm('¿Quieres eliminar este evento?')) {
                            removeEventFromDay(dateStr);
                        }
                    });
                    
                    dayColumn.appendChild(eventSlot);
                    
                    // Add fewer available slots since event takes one slot
                    for (let j = 0; j < (availableSlots - 1); j++) {
                        const emptySlot = document.createElement('div');
                        emptySlot.className = 'appointment-slot available';
                        emptySlot.innerHTML = `
                            <div class="slot-time">Disponible</div>
                            <div class="slot-info">Espacio libre</div>
                        `;
                        dayColumn.appendChild(emptySlot);
                    }
                } else {
                    // Add existing appointments
                    dayAppointments.forEach(appointment => {
                        const appointmentSlot = document.createElement('div');
                        appointmentSlot.className = 'appointment-slot booked';
                        appointmentSlot.innerHTML = `
                            <div class="slot-time">${appointment.time}</div>
                            <div class="slot-info">${appointment.name}</div>
                        `;
                        appointmentSlot.addEventListener('click', () => showAppointmentDetails(appointment));
                        dayColumn.appendChild(appointmentSlot);
                    });
                    
                    // Add "Agendar Cita" button if there are appointments and still room for more
                    if (dayAppointments.length > 0 && availableSlots > 0) {
                        const addAppointmentSlot = document.createElement('div');
                        addAppointmentSlot.className = 'appointment-slot';
                        addAppointmentSlot.style.cssText = `
                            background: var(--brand-primary);
                            color: white;
                            border: 2px solid #10a37f;
                            cursor: pointer;
                            transition: all 0.2s;
                            text-align: center;
                            font-weight: 600;
                        `;
                        addAppointmentSlot.innerHTML = `
                            <div class="slot-time">+ Agendar</div>
                            <div class="slot-info"></div>
                        `;
                        
                        addAppointmentSlot.addEventListener('click', () => {
                            showView('schedule');
                        });
                        
                        addAppointmentSlot.addEventListener('mouseover', () => {
                            addAppointmentSlot.style.background = '#059669';
                            addAppointmentSlot.style.borderColor = '#059669';
                            addAppointmentSlot.style.transform = 'translateY(-1px)';
                        });
                        
                        addAppointmentSlot.addEventListener('mouseout', () => {
                            addAppointmentSlot.style.background = '#10a37f';
                            addAppointmentSlot.style.borderColor = '#10a37f';
                            addAppointmentSlot.style.transform = 'translateY(0)';
                        });
                        
                        dayColumn.appendChild(addAppointmentSlot);
                        
                        // Reduce available slots by 1 since we added the button
                        availableSlots--;
                    }
                    
                    // Add available slots
                    for (let j = 0; j < availableSlots; j++) {
                        const emptySlot = document.createElement('div');
                        emptySlot.className = 'appointment-slot available';
                        emptySlot.innerHTML = `
                            <div class="slot-time">Disponible</div>
                            <div class="slot-info">Espacio libre</div>
                        `;
                        dayColumn.appendChild(emptySlot);
                    }
                }
                
                
                grid.appendChild(dayWrapper);
            }
        }

        function changeWeek(direction) {
            currentWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
            generateWeeklyCalendar();
        }

        async function getAppointmentsForDate(dateStr) {
            try {
                const appointments = await OfflineDB.getAppointments();
                return appointments.filter(apt => apt.date === dateStr);
            } catch (error) {
                console.error('💥 Error getting appointments for date:', error);
                return [];
            }
        }

        // Modal functions
        function showAppointmentDetails(appointment) {
            selectedAppointment = appointment;
            const modal = document.getElementById('appointment-modal');
            const content = document.getElementById('appointment-details-content');
            
            content.innerHTML = `
                <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                        <h4 style="margin: 0; color: #2d333a;">${appointment.name}</h4>
                        <span style="background: #10a37f; color: white; padding: 6px 12px; border-radius: 6px; font-weight: 600;">${appointment.time}</span>
                    </div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 8px;">
                        📅 ${parseLocalDate(appointment.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
                
                <div style="display: grid; gap: 12px;">
                    <div>
                        <strong style="color: #374151;">Dirección:</strong>
                        <p style="margin: 4px 0;">
                            <a href="#" onclick="openGoogleMaps('${appointment.address}', '${appointment.city}'); return false;" 
                               style="color: var(--brand-primary); text-decoration: none; cursor: pointer; transition: color 0.2s;" 
                               onmouseover="this.style.color='var(--brand-hover)'" 
                               onmouseout="this.style.color='var(--brand-primary)'">
                                ${appointment.address}
                            </a>
                        </p>
                    </div>
                    <div>
                        <strong style="color: #374151;">Ciudad:</strong>
                        <p style="margin: 4px 0; color: #666;">${appointment.city}</p>
                    </div>
                    ${appointment.job ? `
                        <div>
                            <strong style="color: #374151;">Trabajo:</strong>
                            <p style="margin: 4px 0; color: #666;">${appointment.job}</p>
                        </div>
                    ` : ''}
                    <div>
                        <strong style="color: #374151;">Precio:</strong>
                        <p style="margin: 4px 0; color: #666; font-size: 18px; font-weight: 600;">$${appointment.price}</p>
                    </div>
                    ${appointment.notes ? `
                        <div>
                            <strong style="color: #374151;">Notas:</strong>
                            <p style="margin: 4px 0; padding: 12px; background: rgba(59, 130, 246, 0.1); border-left: 3px solid rgba(59, 130, 246, 0.5); border-radius: 6px; color: #666; font-style: italic; white-space: pre-wrap;">${appointment.notes}</p>
                        </div>
                    ` : ''}
                </div>

                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e5e5;">
                    <button onclick="copyCalendarLink()" style="width:100%;padding:12px;background:linear-gradient(135deg,#16a34a,#15803d);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;">
                        📅 Copy Calendar Link for Client
                    </button>
                </div>
                <div style="margin-top: 12px; font-size: 12px; color: #999;">
                    Creado: ${new Date(appointment.timestamp).toLocaleString('es-ES')}
                </div>
            `;

            modal.style.display = 'flex';
        }

        function closeAppointmentModal() {
            document.getElementById('appointment-modal').style.display = 'none';
            selectedAppointment = null;
        }

        function copyCalendarLink() {
            if (!selectedAppointment) return;
            const apt = selectedAppointment;
            const base = 'https://livingreen.life/calendar';
            const params = new URLSearchParams();
            if (apt.name || apt.clientName)   params.set('name',     apt.name || apt.clientName);
            if (apt.date)                      params.set('date',     apt.date);
            if (apt.time || apt.hora)          params.set('time',     apt.time || apt.hora);
            if (apt.job || apt.service)        params.set('service',  apt.job  || apt.service);
            const loc = [apt.address, apt.city].filter(Boolean).join(', ');
            if (loc)                           params.set('location', loc);
            params.set('duration', '120');
            params.set('v', '2');
            const link = `${base}?${params.toString()}`;

            function _feedback() {
                const btn = document.querySelector('#appointment-modal button[onclick="copyCalendarLink()"]');
                if (!btn) return;
                const orig = btn.innerHTML;
                btn.innerHTML = '✅ Link copiado — pégalo en Messenger';
                btn.style.background = '#15803d';
                setTimeout(() => { btn.innerHTML = orig; btn.style.background = 'linear-gradient(135deg,#16a34a,#15803d)'; }, 3000);
            }

            navigator.clipboard.writeText(link).then(_feedback).catch(() => {
                const ta = document.createElement('textarea');
                ta.value = link; ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.focus(); ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                _feedback();
            });
        }

        // [SERVICES MODULE] → extraído a js/modules/services.js
        // [BUSINESS CONFIG MODULE] → extraído a js/modules/business-config.js

        // Styled confirm modal (replaces browser confirm())
        let _confirmCallback = null;
        function showConfirm(message, onConfirm, { icon = '⚠️', okLabel = 'Eliminar', okColor = '#ef4444' } = {}) {
            _confirmCallback = onConfirm;
            document.getElementById('confirm-message').textContent = message;
            document.getElementById('confirm-icon').textContent = icon;
            const okBtn = document.getElementById('confirm-ok-btn');
            okBtn.textContent = okLabel;
            okBtn.style.background = okColor;
            okBtn.onclick = () => { const cb = _confirmCallback; closeConfirmModal(); if (cb) cb(); };
            document.getElementById('confirm-modal').style.display = 'flex';
        }
        function closeConfirmModal() {
            document.getElementById('confirm-modal').style.display = 'none';
            _confirmCallback = null;
        }

        // Generic toast notification helper
        function showToast(msg, duration = 2200) {
            const el = document.getElementById('copy-notification');
            if (!el) return;
            const span = el.querySelector('span:last-child');
            if (span) span.textContent = msg;
            el.style.display = 'flex';
            clearTimeout(el._toastTimer);
            el._toastTimer = setTimeout(() => { el.style.display = 'none'; }, duration);
        }

        // Appointment Management Functions
        async function deleteAppointment() {
            if (!selectedAppointment) return;
            showConfirm(
                `¿Eliminar la cita de ${selectedAppointment.name}?`,
                async () => {
                    try {
                        await OfflineDB.deleteAppointment(selectedAppointment.id || selectedAppointment.timestamp);
                        closeAppointmentModal();
                        window._cacheLoaded = {};
                        if (currentView === 'calendar') await generateWeeklyCalendar();
                        else await loadAppointments();
                        showToast('🗑️ Cita eliminada');
                    } catch (error) {
                        console.error('❌ Error deleting appointment:', error);
                        showError('Error al eliminar la cita. Inténtalo de nuevo.');
                    }
                }
            );
        }
        
        // Store appointment data for rescheduling
        let appointmentToReschedule = null;
        
        function rescheduleAppointment() {
            if (!selectedAppointment) {
                alert('No appointment selected');
                return;
            }
            
            // Save appointment data before closing the modal
            appointmentToReschedule = { ...selectedAppointment };
            
            // Close the appointment details modal
            const modal = document.getElementById('appointment-modal');
            if (modal) {
                modal.style.display = 'none';
            }
            
            // Set today's date as default in the reschedule form
            const today = new Date();
            const todayString = today.toISOString().split('T')[0];
            document.getElementById('reschedule-date').value = todayString;
            document.getElementById('reschedule-time').value = '';
            
            // Show the reschedule modal
            document.getElementById('reschedule-modal').style.display = 'flex';
        }
        
        function closeRescheduleModal() {
            document.getElementById('reschedule-modal').style.display = 'none';
            appointmentToReschedule = null; // Clear the stored data
        }

        // Edit appointment functions
        function editAppointment() {
            if (!selectedAppointment) {
                alert('No appointment selected');
                return;
            }

            // Get the phone number from PhoneManager
            const phone = PhoneManager.get(selectedAppointment.id) || selectedAppointment.phone || '';

            // Populate the edit form with current appointment data
            document.getElementById('edit-client-name').value = selectedAppointment.name || '';
            document.getElementById('edit-client-phone').value = phone;
            document.getElementById('edit-client-city').value = selectedAppointment.city || '';
            document.getElementById('edit-client-address').value = selectedAppointment.address || '';
            document.getElementById('edit-appointment-date').value = selectedAppointment.date || '';
            document.getElementById('edit-appointment-time').value = selectedAppointment.time || '';
            document.getElementById('edit-appointment-job').value = selectedAppointment.job || '';
            document.getElementById('edit-appointment-price').value = selectedAppointment.price || '';
            document.getElementById('edit-appointment-notes').value = selectedAppointment.notes || '';

            // Show the edit modal
            document.getElementById('edit-appointment-modal').style.display = 'flex';
        }

        function closeEditAppointmentModal() {
            document.getElementById('edit-appointment-modal').style.display = 'none';
        }

        async function handleEditFormSubmit(e) {
            e.preventDefault();

            if (!selectedAppointment) {
                alert('No appointment selected');
                return;
            }

            try {
                // Get form data
                const formData = {
                    id: selectedAppointment.id,
                    name: document.getElementById('edit-client-name').value.trim(),
                    phone: document.getElementById('edit-client-phone').value.trim(),
                    city: document.getElementById('edit-client-city').value.trim(),
                    address: document.getElementById('edit-client-address').value.trim(),
                    date: document.getElementById('edit-appointment-date').value,
                    time: document.getElementById('edit-appointment-time').value,
                    job: document.getElementById('edit-appointment-job').value.trim(),
                    price: parseFloat(document.getElementById('edit-appointment-price').value) || 0,
                    notes: document.getElementById('edit-appointment-notes').value.trim() || '', // Add notes field
                    timestamp: selectedAppointment.timestamp, // Keep original timestamp
                    created_at: selectedAppointment.created_at // Keep original creation time
                };

                // Validate required fields
                if (!formData.name || !formData.city || !formData.address ||
                    !formData.date || !formData.time || !formData.job) {
                    alert('Por favor completa todos los campos requeridos');
                    return;
                }

                console.log('✏️ Updating appointment:', formData);

                // Save phone number to PhoneManager if provided
                if (formData.phone) {
                    PhoneManager.save(formData.id, formData.phone);
                }

                // Update the appointment
                await OfflineDB.saveAppointment(formData);

                // Update selectedAppointment object
                selectedAppointment = formData;

                console.log('✅ Appointment updated successfully');

                // Close modals
                closeEditAppointmentModal();
                closeAppointmentModal();

                // Refresh the calendar view
                if (currentView === 'calendar') {
                    await generateWeeklyCalendar();
                }

                // Refresh client registry if it's currently visible or if we have clients loaded
                console.log('🔄 Refreshing client registry after edit...');
                setTimeout(async () => {
                    await loadClientRegistry();
                }, 100);

                // Show success message
                showToast('✅ Cita actualizada');

            } catch (error) {
                console.error('❌ Error updating appointment:', error);
                showError('Error al actualizar la cita: ' + (error.message || 'Inténtalo de nuevo'));
            }
        }
        
        async function confirmReschedule() {
            const newDate = document.getElementById('reschedule-date').value;
            const newTime = document.getElementById('reschedule-time').value;
            
            if (!newDate || !newTime) {
                alert('Por favor selecciona una nueva fecha y hora');
                return;
            }
            
            if (!appointmentToReschedule) {
                alert('Error: No se pudo encontrar la cita original');
                closeRescheduleModal();
                return;
            }
            
            try {
                // Create proper timestamp
                const appointmentDateTime = new Date(`${newDate}T${newTime}:00`);
                const newTimestamp = appointmentDateTime.getTime();

                console.log('📅 Original appointment:', appointmentToReschedule);
                console.log('📅 New date:', newDate, 'New time:', newTime);
                console.log('📅 New timestamp:', newTimestamp);

                // BETTER APPROACH: Just update the existing appointment instead of delete + create
                const updatedAppointment = {
                    ...appointmentToReschedule,
                    date: newDate,
                    time: newTime,
                    timestamp: newTimestamp,
                    // Preserve original timestamp for Supabase update
                    originalTimestamp: appointmentToReschedule.timestamp,
                    // Ensure created_at exists so system knows this is an update
                    created_at: appointmentToReschedule.created_at || new Date().toISOString()
                };

                console.log('📅 Updating appointment with new data:', updatedAppointment);
                await OfflineDB.saveAppointment(updatedAppointment);
                console.log('✅ Appointment rescheduled successfully');
                
                // Close modal and refresh calendar
                closeRescheduleModal();
                
                if (currentView === 'calendar') {
                    await generateWeeklyCalendar();
                }
                
                alert(`✅ Cita reagendada exitosamente para ${newDate} a las ${newTime}`);
                
            } catch (error) {
                console.error('❌ Error rescheduling appointment:', error);
                alert('Error al reagendar la cita. Por favor intenta nuevamente.');
            }
        }

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

