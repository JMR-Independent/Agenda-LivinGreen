// ================================================================
// MODULE: diagnostics.js
// Herramientas de debug y diagnóstico — solo para consola del browser
// Se carga DESPUÉS de app.js (referencias a OfflineDB, BackupSystem, etc.)
// ================================================================

// ================================
// DATA RECOVERY DIAGNOSTIC TOOL
// ================================

// Función de recuperación de emergencia
window.recoverData = function() {
    console.log('🚑 ===== DATA RECOVERY MODE =====');

    const localAppointments = localStorage.getItem('appointments');
    const localRegistry = localStorage.getItem('clientRegistry');

    if (!localAppointments && !localRegistry) {
        console.log('❌ No hay datos para recuperar en localStorage');
        return;
    }

    if (localAppointments) {
        const appts = JSON.parse(localAppointments);
        console.log(`✅ Recuperados ${appts.length} appointments de localStorage`);
        console.table(appts);
    }

    if (localRegistry) {
        const registry = JSON.parse(localRegistry);
        console.log(`✅ Recuperados ${registry.length} clientes del registro`);
        console.table(registry);
    }

    console.log('✅ Datos recuperados. Recarga la página (F5) para verlos.');
};

// Run this from browser console: await checkAllData()
window.checkAllData = async function() {
    console.log('🔍 ========== DATA DIAGNOSTIC REPORT ==========');

    // 1. Check Supabase
    console.log('\n📊 1. CHECKING SUPABASE DATABASE...');
    try {
        const { data: appointments, error } = await supabaseClient
            .from('appointments')
            .select('*')
            .order('date', { ascending: true });

        if (error) {
            console.error('❌ Supabase Error:', error);
        } else {
            console.log(`✅ Supabase appointments found: ${appointments?.length || 0}`);
            if (appointments && appointments.length > 0) {
                console.table(appointments);
            }
        }
    } catch (e) {
        console.error('❌ Supabase connection failed:', e);
    }

    // 2. Check localStorage
    console.log('\n💾 2. CHECKING LOCALSTORAGE...');
    const localAppointments = localStorage.getItem('appointments');
    const localRegistry = localStorage.getItem('clientRegistry');

    if (localAppointments) {
        const appts = JSON.parse(localAppointments);
        console.log(`✅ localStorage appointments: ${appts.length}`);
        console.table(appts);
    } else {
        console.log('❌ No appointments in localStorage');
    }

    if (localRegistry) {
        const registry = JSON.parse(localRegistry);
        console.log(`✅ localStorage client registry: ${registry.length}`);
        console.table(registry);
    } else {
        console.log('❌ No client registry in localStorage');
    }

    // 3. Check IndexedDB
    console.log('\n🗄️  3. CHECKING INDEXEDDB...');
    try {
        const request = indexedDB.open('AppointmentDB', 2);
        request.onsuccess = function(event) {
            const db = event.target.result;
            const tx = db.transaction('appointments', 'readonly');
            const store = tx.objectStore('appointments');
            const getAllRequest = store.getAll();

            getAllRequest.onsuccess = function() {
                const idbAppointments = getAllRequest.result;
                console.log(`✅ IndexedDB appointments: ${idbAppointments.length}`);
                if (idbAppointments.length > 0) {
                    console.table(idbAppointments);
                }
            };
        };
        request.onerror = function() {
            console.log('❌ Cannot access IndexedDB');
        };
    } catch (e) {
        console.error('❌ IndexedDB error:', e);
    }

    console.log('\n🔍 ========== END OF REPORT ==========');
    console.log('💡 To restore data, we can sync from Supabase if data exists there');
};

// ================================
// OFFLINE-FIRST TESTING FUNCTIONS
// ================================

// Initialize
// Test functions for debugging
window.testMobileMenu = function() {
    console.log('🧪 Testing mobile menu...');
    toggleMobileMenu();
};

window.testJobDropdown = function() {
    console.log('🧪 Testing job dropdown...');
    toggleJobDropdown();
};

window.testOfflineMode = async function() {
    console.log('🧪 Testing offline functionality...');
    const syncStatus = await OfflineDB.getSyncStatus();
    console.log('📊 Current sync status:', syncStatus);

    // Create a test appointment
    const testAppointment = {
        id: 'test_' + Date.now(),
        name: 'Test Client',
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        job: 'Alfombras',
        address: 'Test Address',
        price: 100
    };

    console.log('📝 Creating test appointment...');
    await OfflineDB.saveAppointment(testAppointment);

    const appointments = await OfflineDB.getAppointments();
    console.log('📋 All appointments:', appointments.length);

    await updateSyncStatusUI();
    console.log('✅ Offline test completed!');
};

window.testSync = async function() {
    console.log('🔄 Testing sync functionality...');
    await OfflineDB.syncWithSupabase();
    const status = await OfflineDB.getSyncStatus();
    console.log('📊 Sync status after sync:', status);
    await updateSyncStatusUI();
    console.log('✅ Sync test completed!');
};

window.debugAllAppointments = async function() {
    console.log('🔍 ===== DEBUGGING ALL APPOINTMENTS =====');
    const appointments = await OfflineDB.getAppointments();
    console.log('📊 Total appointments in database:', appointments.length);

    // Group by date
    const byDate = {};
    appointments.forEach(apt => {
        const date = apt.date;
        if (!byDate[date]) byDate[date] = [];
        byDate[date].push(apt);
    });

    // Show sorted by date
    const sortedDates = Object.keys(byDate).sort();
    console.log('📅 Appointments by date:');
    sortedDates.forEach(date => {
        console.log(`\n📅 ${date}: ${byDate[date].length} citas`);
        byDate[date].forEach((apt, i) => {
            console.log(`  ${i+1}. ${apt.name} - ${apt.city || 'N/A'} - $${apt.price || 0} - ${apt.job || 'N/A'}`);
        });
    });

    // Group by month
    const byMonth = {};
    appointments.forEach(apt => {
        const date = new Date(apt.date + 'T00:00:00');
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth[monthKey]) byMonth[monthKey] = [];
        byMonth[monthKey].push(apt);
    });

    console.log('\n📊 Appointments by month:');
    Object.keys(byMonth).sort().forEach(month => {
        console.log(`  ${month}: ${byMonth[month].length} citas`);
    });

    console.log('\n✅ Debug completed! Check the logs above.');
    return appointments;
};

window.deleteAppointmentsBefore = async function(dateString) {
    console.log(`🗑️ Deleting all appointments before ${dateString}...`);
    const appointments = await OfflineDB.getAppointments();
    console.log('📊 Total appointments before deletion:', appointments.length);

    const targetDate = new Date(dateString + 'T00:00:00');
    const toKeep = appointments.filter(apt => {
        const aptDate = new Date(apt.date + 'T00:00:00');
        return aptDate >= targetDate;
    });
    const toDelete = appointments.filter(apt => {
        const aptDate = new Date(apt.date + 'T00:00:00');
        return aptDate < targetDate;
    });

    console.log(`📊 Appointments to keep (>= ${dateString}):`, toKeep.length);
    console.log(`🗑️ Appointments to delete (< ${dateString}):`, toDelete.length);

    if (toDelete.length === 0) {
        console.log('✅ No appointments to delete!');
        return;
    }

    console.log('🗑️ Appointments being deleted:');
    toDelete.forEach(apt => {
        console.log(`  - ${apt.date}: ${apt.name} - ${apt.city}`);
    });

    if (confirm(`⚠️ This will delete ${toDelete.length} appointments before ${dateString}. Continue?`)) {
        // Save only the appointments to keep
        localStorage.setItem('appointments', JSON.stringify(toKeep));

        // Also delete from Supabase if online
        if (navigator.onLine && toDelete.length > 0) {
            console.log('🌐 Deleting from Supabase...');
            for (const apt of toDelete) {
                try {
                    if (apt.timestamp) {
                        await supabaseClient
                            .from('appointments')
                            .delete()
                            .eq('timestamp', apt.timestamp);
                    }
                } catch (error) {
                    console.error('❌ Error deleting from Supabase:', error);
                }
            }
        }

        console.log(`✅ Deleted ${toDelete.length} appointments!`);
        console.log(`📊 Remaining appointments: ${toKeep.length}`);

        // Reload the page to refresh all data
        alert(`✅ Eliminadas ${toDelete.length} citas. La página se recargará.`);
        location.reload();
    } else {
        console.log('❌ Deletion cancelled');
    }
};

window.clearOfflineData = async function() {
    if (confirm('🚨 This will clear all offline data. Are you sure?')) {
        localStorage.clear();
        if (dbInstance) {
            await dbInstance.clear('appointments');
            await dbInstance.clear('syncQueue');
            await dbInstance.clear('settings');
        }
        console.log('🧹 Offline data cleared!');
        await updateSyncStatusUI();
    }
};

// ================================
// BACKUP SYSTEM TESTING FUNCTIONS
// ================================

window.testBackup = async function() {
    console.log('📦 Testing backup system...');
    const backupData = await BackupSystem.createFullBackup();
    console.log('✅ Backup created:', {
        totalAppointments: backupData.metadata.totalAppointments,
        created: backupData.metadata.created,
        size: JSON.stringify(backupData).length + ' characters'
    });
    return backupData;
};

window.downloadBackupNow = async function() {
    console.log('💾 Downloading backup...');
    await BackupSystem.downloadBackup();
};

window.forceBackupCheck = async function() {
    console.log('🔄 Forcing daily backup check...');
    // Clear last backup time to force new backup
    localStorage.removeItem('lastBackupTime');
    const created = await BackupSystem.checkAndCreateDailyBackup();
    console.log(created ? '✅ Backup created' : '❌ No backup needed');
    updateBackupStatusUI();
};

window.showBackupStatus = function() {
    const status = BackupSystem.getBackupStatus();
    console.log('📊 Backup Status:', status);
    const lastBackup = localStorage.getItem('lastBackupTime');
    if (lastBackup) {
        console.log('📅 Last backup:', new Date(lastBackup).toLocaleString());
    }
};

// ================================
// CLIENT & APPOINTMENT HELPERS
// ================================

window.testSaveClient = function() {
    console.log('🧪 TESTING client save...');
    const testData = {
        name: 'Test Client',
        city: 'Test City',
        address: 'Test Address',
        job: 'alfombras',
        price: '100',
        date: '2024-01-15',
        time: '10:00 AM',
        timestamp: new Date().toISOString()
    };

    saveToClientRegistry(testData);
    console.log('🧪 Test completed - check storage and registry view');
};

// Function to check localStorage from console
window.checkClients = function() {
    const clients = JSON.parse(localStorage.getItem('clientRegistry') || '[]');
    console.log('📊 Current clients in storage:', clients);
    return clients;
};

// Function to clear all client data - call from console
window.clearAllClients = function() {
    localStorage.removeItem('clientRegistry');
    console.log('🗑️ All client data cleared');
    loadClientRegistry(); // Refresh the view
};

// Function to clear all appointments - call from console
window.clearAllAppointments = function() {
    localStorage.removeItem('appointments');
    console.log('🗑️ All appointment data cleared');
};

window.testContactSaving = function() {
    if (!selectedAppointment) {
        alert('Please select an appointment first by clicking on a calendar appointment');
        return;
    }

    const testPhone = prompt('Enter a test phone number (e.g., 8015551234):');
    if (testPhone) {
        saveContactToPhone(testPhone, selectedAppointment.name);
        alert('✅ Contact vCard file should have been downloaded! Check your Downloads folder and tap the .vcf file to add to contacts.');
    }
};
