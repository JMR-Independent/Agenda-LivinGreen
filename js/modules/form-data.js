// ================================================================
// MODULE: form-data.js
// Formulario de citas: fillForm, parseo de fechas/horas, submit, guardado
// Depende de: OfflineDB, saveToClientRegistry, PhoneManager (runtime)
// ================================================================

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
        
