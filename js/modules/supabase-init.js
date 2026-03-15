// ================================================================
// MODULE: supabase-init.js
// Configuración de Supabase y carga de agent config
// Debe cargarse DESPUÉS del CDN de supabase (@supabase/supabase-js)
// y ANTES de app.js
// ================================================================

// Supabase Configuration
const SUPABASE_URL = 'https://stodvmbmvtxljfsdzghc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0b2R2bWJtdnR4bGpmc2R6Z2hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcyODMyMTYsImV4cCI6MjA3Mjg1OTIxNn0.7y3RPDV_xYFzXSTUM7oCt_WgSSRLm2HoGsCq5-5Jm5M';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Exponemos también en window para compatibilidad con referencias explícitas
window.supabaseClient = supabaseClient;

// ── Agent config desde Supabase (personalidad, contexto negocio, servicios) ──
let _appAgentCfg = null;
let _appAgentCfgPromise = null;
async function _loadAppAgentConfig() {
  if (_appAgentCfg) return _appAgentCfg;
  if (_appAgentCfgPromise) return _appAgentCfgPromise;
  _appAgentCfgPromise = (async () => {
    try {
      const { data, error } = await supabaseClient
        .from('agent_config').select('*').eq('business_id','default').single();
      if (!error && data) { _appAgentCfg = data; return data; }
    } catch {}
    return null;
  })();
  return _appAgentCfgPromise;
}
function _getAppCfg() { return _appAgentCfg || {}; }

// ── Supabase CRUD Functions ──────────────────────────────────────────────────

async function saveAppointmentToSupabase(appointmentData) {
    try {
        // Only send columns that exist in the Supabase schema
        const supabaseData = {
            name:       appointmentData.name || appointmentData.clientName || appointmentData.cliente || '',
            date:       appointmentData.date || appointmentData.fecha || '',
            time:       appointmentData.time || appointmentData.hora || '',
            job:        appointmentData.job  || appointmentData.service || appointmentData.servicio || '',
            price:      parseFloat(appointmentData.price || appointmentData.precio) || 0,
            city:       appointmentData.city  || '',
            address:    appointmentData.address || '',
            timestamp:  appointmentData.timestamp || Date.now(),
            created_at: appointmentData.created_at || new Date().toISOString(),
        };

        // Remove id if null/undefined/temporary so Supabase auto-generates a UUID
        if (appointmentData.id && !String(appointmentData.id).startsWith('ai_')) {
            supabaseData.id = appointmentData.id;
        }

        const { data, error } = await supabaseClient
            .from('appointments')
            .insert([supabaseData])
            .select();

        if (error) throw error;
        console.log('✅ Appointment saved to Supabase:', data);
        return data?.[0];
    } catch (error) {
        console.error('❌ Error saving appointment:', error);
        throw error;
    }
}

async function getAppointmentsFromSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from('appointments')
            .select('*')
            .order('date', { ascending: true });

        if (error) throw error;
        console.log('✅ Appointments loaded from Supabase:', data?.length || 0);
        return data || [];
    } catch (error) {
        console.error('❌ Error loading appointments:', error);
        // ⚠️ IMPORTANTE: Lanzar el error para que el fallback a localStorage funcione
        throw error;
    }
}

async function deleteAppointmentFromSupabase(timestamp) {
    try {
        const { data, error } = await supabaseClient
            .from('appointments')
            .delete()
            .eq('timestamp', timestamp);

        if (error) throw error;
        console.log('✅ Appointment deleted from Supabase');
        return data;
    } catch (error) {
        console.error('❌ Error deleting appointment:', error);
        throw error;
    }
}

async function updateAppointmentInSupabase(timestamp, updates) {
    try {
        // Filter out phone, notes, and originalTimestamp since they don't exist in Supabase schema
        const { phone, notes, originalTimestamp, ...supabaseUpdates } = updates;

        const { data, error } = await supabaseClient
            .from('appointments')
            .update(supabaseUpdates)
            .eq('timestamp', timestamp);

        if (error) throw error;
        console.log('✅ Appointment updated in Supabase');
        return data;
    } catch (error) {
        console.error('❌ Error updating appointment:', error);
        throw error;
    }
}

async function saveDayEventToSupabase(date, eventType) {
    try {
        const { data, error } = await supabaseClient
            .from('day_events')
            .upsert([{ date, event_type: eventType }]);

        if (error) throw error;
        console.log('✅ Day event saved to Supabase');
        return data;
    } catch (error) {
        console.error('❌ Error saving day event:', error);
        throw error;
    }
}

async function getDayEventsFromSupabase() {
    try {
        const { data, error } = await supabaseClient
            .from('day_events')
            .select('*');

        if (error) throw error;
        console.log('✅ Day events loaded from Supabase:', data?.length || 0);
        return data || [];
    } catch (error) {
        console.error('❌ Error loading day events:', error);
        return [];
    }
}

async function deleteDayEventFromSupabase(date) {
    try {
        const { data, error } = await supabaseClient
            .from('day_events')
            .delete()
            .eq('date', date);

        if (error) throw error;
        console.log('✅ Day event deleted from Supabase');
        return data;
    } catch (error) {
        console.error('❌ Error deleting day event:', error);
        throw error;
    }
}

// Migration function to move localStorage data to Supabase
async function migrateLocalStorageToSupabase() {
    try {
        console.log('🔄 Starting migration from localStorage to Supabase...');

        // Migrate appointments
        const localAppointments = JSON.parse(localStorage.getItem('appointments') || '[]');
        if (localAppointments.length > 0) {
            console.log(`📅 Migrating ${localAppointments.length} appointments...`);
            for (const apt of localAppointments) {
                await saveAppointmentToSupabase({
                    ...apt,
                    price: parseFloat(apt.price) || 0,
                    timestamp: apt.timestamp || Date.now()
                });
            }
            console.log('✅ Appointments migrated successfully');
        }

        // Migrate day events
        const localDayEvents = JSON.parse(localStorage.getItem('dayEvents') || '{}');
        const dayEventEntries = Object.entries(localDayEvents);
        if (dayEventEntries.length > 0) {
            console.log(`📅 Migrating ${dayEventEntries.length} day events...`);
            for (const [date, eventType] of dayEventEntries) {
                await saveDayEventToSupabase(date, eventType);
            }
            console.log('✅ Day events migrated successfully');
        }

        console.log('🎉 Migration completed successfully!');
        return true;
    } catch (error) {
        console.error('💥 Error during migration:', error);
        return false;
    }
}
