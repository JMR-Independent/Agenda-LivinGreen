// ================================================================
// MODULE: client-registry.js
// Registro de clientes: carga, visualización, búsqueda, detalles
// Depende de: OfflineDB, PhoneManager, getBC, showToast (runtime)
// ================================================================

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

