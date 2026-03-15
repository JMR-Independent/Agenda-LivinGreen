// ================================================================
// MODULE: backup.js
// Sistema automático de backup de datos del negocio
// Depende de: OfflineDB, dbInstance, getBC() (definidos en app.js)
// Se carga antes de app.js — los métodos solo usan esas refs al ser llamados
// ================================================================

// ================================
// MODULE 3: AUTOMATIC BACKUP SYSTEM
// ================================
// FEATURE: Protect your business data with daily backups

const BackupSystem = {
    // Generate backup filename with timestamp
    generateBackupFilename(type = 'full') {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
        return `${getBC().name.replace(/\s+/g,'-')}-backup-${type}-${dateStr}-${timeStr}.json`;
    },

    // Create full backup of all business data
    async createFullBackup() {
        try {
            const appointments = await OfflineDB.getAppointments();
            const syncStatus = await OfflineDB.getSyncStatus();

            const backupData = {
                metadata: {
                    version: '1.0',
                    created: new Date().toISOString(),
                    type: 'full_backup',
                    app: getBC().name,
                    totalAppointments: appointments.length,
                    syncStatus: syncStatus
                },
                data: {
                    appointments: appointments,
                    settings: {
                        gasPrice: localStorage.getItem('gasPrice_current'),
                        lastGasUpdate: localStorage.getItem('gasPrice_lastUpdate'),
                        invoiceCounters: this.getInvoiceCounters()
                    },
                    // Include localStorage data for complete backup
                    localStorage: this.getLocalStorageData()
                }
            };

            return backupData;
        } catch (error) {
            console.error('❌ Error creating backup:', error);
            throw error;
        }
    },

    // Get all invoice counters
    getInvoiceCounters() {
        const counters = {};
        for (let key in localStorage) {
            if (key.startsWith('invoiceCounter_')) {
                counters[key] = localStorage.getItem(key);
            }
        }
        return counters;
    },

    // Get important localStorage data
    getLocalStorageData() {
        const important = {};
        const importantKeys = [
            'appointments',
            'lastSyncTime',
            'lastReminderCheck',
            'gasPrice_current',
            'gasPrice_lastUpdate'
        ];

        importantKeys.forEach(key => {
            if (localStorage.getItem(key)) {
                important[key] = localStorage.getItem(key);
            }
        });

        return important;
    },

    // Download backup file
    async downloadBackup(type = 'full') {
        try {
            console.log('📦 Creating backup...');
            const backupData = await this.createFullBackup();
            const jsonString = JSON.stringify(backupData, null, 2);

            // Create download link
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = this.generateBackupFilename(type);

            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            console.log('✅ Backup downloaded successfully');

            // Update last backup time
            localStorage.setItem('lastBackupTime', new Date().toISOString());

            return backupData;
        } catch (error) {
            console.error('❌ Backup failed:', error);
            alert('Error creating backup: ' + error.message);
        }
    },

    // Auto backup (daily)
    async checkAndCreateDailyBackup() {
        try {
            const lastBackup = localStorage.getItem('lastBackupTime');
            const now = new Date();
            const today = now.toDateString();

            if (!lastBackup || new Date(lastBackup).toDateString() !== today) {
                console.log('📅 Time for daily backup...');

                // Create backup data but don't download automatically
                const backupData = await this.createFullBackup();

                // Store backup in IndexedDB for safety
                if (dbInstance) {
                    await this.storeBackupLocally(backupData);
                }

                localStorage.setItem('lastBackupTime', now.toISOString());
                console.log('✅ Daily backup completed and stored locally');

                // Show subtle notification
                this.showBackupNotification('Daily backup completed successfully');

                return true;
            }

            return false; // No backup needed today
        } catch (error) {
            console.error('❌ Daily backup failed:', error);
            return false;
        }
    },

    // Store backup in IndexedDB
    async storeBackupLocally(backupData) {
        if (!dbInstance) return;

        try {
            const tx = dbInstance.transaction('settings', 'readwrite');
            const store = tx.objectStore('settings');

            await store.put({
                key: 'latest_backup',
                value: backupData,
                timestamp: new Date().toISOString()
            });

            console.log('💾 Backup stored in IndexedDB');
        } catch (error) {
            console.error('Error storing backup locally:', error);
        }
    },

    // Show backup notification
    showBackupNotification(message) {
        // Create temporary notification in the UI
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: var(--brand-primary);
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            font-size: 14px;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        notification.textContent = '📦 ' + message;

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.style.opacity = '1', 100);

        // Hide and remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    },

    // Restore from backup file
    async restoreFromBackup(backupFile) {
        try {
            const backupText = await backupFile.text();
            const backupData = JSON.parse(backupText);

            if (!backupData.metadata || !backupData.metadata.app) {
                throw new Error('Invalid backup file format');
            }

            console.log('📥 Restoring from backup created:', backupData.metadata.created);

            // Restore appointments
            if (backupData.data.appointments) {
                for (const appointment of backupData.data.appointments) {
                    await OfflineDB.saveAppointment(appointment);
                }
                console.log(`✅ Restored ${backupData.data.appointments.length} appointments`);
            }

            // Restore settings
            if (backupData.data.settings) {
                Object.entries(backupData.data.settings).forEach(([key, value]) => {
                    if (value !== null) {
                        localStorage.setItem(key, value);
                    }
                });
                console.log('✅ Settings restored');
            }

            // Restore localStorage data
            if (backupData.data.localStorage) {
                Object.entries(backupData.data.localStorage).forEach(([key, value]) => {
                    localStorage.setItem(key, value);
                });
                console.log('✅ LocalStorage data restored');
            }

            alert(`Backup restored successfully!\n\nRestored:\n- ${backupData.data.appointments.length} appointments\n- Settings and preferences\n\nPlease reload the page to see changes.`);

            return true;
        } catch (error) {
            console.error('❌ Restore failed:', error);
            alert('Error restoring backup: ' + error.message);
            return false;
        }
    },

    // Get backup status
    getBackupStatus() {
        const lastBackup = localStorage.getItem('lastBackupTime');
        if (!lastBackup) {
            return { status: 'Never backed up', color: '#dc2626' };
        }

        const backupDate = new Date(lastBackup);
        const now = new Date();
        const hoursSince = (now - backupDate) / (1000 * 60 * 60);

        if (hoursSince < 24) {
            return {
                status: `Last backup: ${Math.floor(hoursSince)}h ago`,
                color: '#059669'
            };
        } else {
            return {
                status: `Last backup: ${Math.floor(hoursSince / 24)}d ago`,
                color: '#f59e0b'
            };
        }
    }
};
