// ================================================================
// MODULE: offline-db.js
// Base de datos offline: IndexedDB, PhoneManager, OfflineDB
// Depende de: supabaseClient (supabase-init.js)
// IMPORTANTE: cargado antes de app.js — OfflineDB usado por backup.js también
// ================================================================

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
