// ================================================================
// MODULE: calendar.js
// Calendario semanal, navegación de vistas, citas, confirmaciones
// Depende de: OfflineDB, showToast, showConfirm (propios), getBC (runtime)
// ================================================================

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
            const viewMapping = { schedule:0, calendar:1, history:2, datos:3, finance:4, messages:5, settings:6, leads:7 };
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
            const views = ['calendar', 'history', 'datos', 'pago', 'finance', 'messages', 'settings', 'leads'];
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
            } else if (viewName === 'leads') {
                if (window._leadsModule) window._leadsModule.loadLeads();
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
