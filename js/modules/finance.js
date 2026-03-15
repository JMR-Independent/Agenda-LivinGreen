// ================================================================
// MODULE: finance.js
// Cálculos financieros: ingresos semanales/mensuales, costos, historial
// Depende de: calculateGasCost (travel.js), ADVERTISING_COST_PER_WEEK (este módulo)
// ================================================================

        // Finance Functions
        const ADVERTISING_COST_PER_WEEK = 45; // $45 por semana

        // Helper function to parse dates correctly (avoid timezone issues)
        function parseLocalDate(dateString) {
            if (!dateString) return new Date();

            // If already a Date object, return it
            if (dateString instanceof Date) return dateString;

            // Parse YYYY-MM-DD format as local date (not UTC)
            const parts = dateString.split('-');
            if (parts.length === 3) {
                const year = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
                const day = parseInt(parts[2], 10);
                return new Date(year, month, day);
            }

            // Fallback to default Date parsing
            return new Date(dateString);
        }

        function loadFinanceData() {
            updateCurrentMonth();
            calculateWeeklyFinances();
            calculateMonthlyFinances();
            calculateHistoricalFinances();
        }

        function updateCurrentMonth() {
            const now = new Date();
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                              'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            const monthLabel = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
            document.getElementById('current-month-label').textContent = monthLabel;
        }

        function calculateWeeklyFinances() {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // Get ALL appointments (not just current month)
            const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');

            // Initialize weeklyData with ALL weeks in current month
            const weeklyData = {};

            // First, create entries for ALL weeks in the current month
            const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
            const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

            let currentWeekStart = getWeekStart(firstDayOfMonth);

            // Generate all weeks that overlap with this month
            while (currentWeekStart <= lastDayOfMonth) {
                const weekKey = currentWeekStart.toISOString().split('T')[0];
                const weekEnd = new Date(currentWeekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                // Count days in current month
                let daysInMonth = 0;
                for (let i = 0; i <= 6; i++) {
                    const day = new Date(currentWeekStart);
                    day.setDate(day.getDate() + i);
                    if (day.getMonth() === currentMonth && day.getFullYear() === currentYear) {
                        daysInMonth++;
                    }
                }

                // Only add weeks that have at least 4 days in current month
                if (daysInMonth >= 4 || (currentWeekStart.getMonth() === currentMonth && currentWeekStart.getFullYear() === currentYear)) {
                    weeklyData[weekKey] = {
                        weekStart: new Date(currentWeekStart),
                        appointments: [],
                        totalIncome: 0,
                        totalGasCost: 0,
                        cities: []
                    };
                }

                // Move to next week
                currentWeekStart.setDate(currentWeekStart.getDate() + 7);
            }

            // Now populate with actual appointment data
            appointments.forEach(apt => {
                const aptDate = parseLocalDate(apt.date);
                const weekStart = getWeekStart(aptDate);
                const weekKey = weekStart.toISOString().split('T')[0];

                // Only add to weeklyData if this week is in our list
                if (weeklyData[weekKey]) {
                    weeklyData[weekKey].appointments.push(apt);
                    weeklyData[weekKey].totalIncome += parseFloat(apt.price || 0);
                }
            });

            // Calculate gas costs for each week (sum of daily costs)
            Object.keys(weeklyData).forEach(weekKey => {
                const week = weeklyData[weekKey];

                // Group appointments by date
                const appointmentsByDate = {};
                week.appointments.forEach(apt => {
                    if (!appointmentsByDate[apt.date]) {
                        appointmentsByDate[apt.date] = [];
                    }
                    appointmentsByDate[apt.date].push(apt);
                });

                // Calculate gas cost per day and sum them (using historical prices)
                let totalWeekGasCost = 0;
                Object.keys(appointmentsByDate).forEach(date => {
                    const dailyAppointments = appointmentsByDate[date];
                    const dailyCities = dailyAppointments.map(apt => apt.city);
                    const dailyGasCost = calculateGasCost(dailyCities, date); // Pass date for historical price
                    totalWeekGasCost += dailyGasCost;
                });

                week.totalGasCost = totalWeekGasCost;
                week.netIncome = week.totalIncome - week.totalGasCost - ADVERTISING_COST_PER_WEEK;
            });

            displayWeeklyFinances(weeklyData);
        }

        function calculateMonthlyFinances() {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // Get all appointments for current month
            const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');
            const monthlyAppointments = appointments.filter(apt => {
                const aptDate = parseLocalDate(apt.date); // Use parseLocalDate instead of new Date
                return aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear;
            });

            // Calculate totals
            let totalIncome = 0;

            monthlyAppointments.forEach(apt => {
                totalIncome += parseFloat(apt.price || 0);
            });

            // Group appointments by date to calculate daily gas costs
            const appointmentsByDate = {};
            monthlyAppointments.forEach(apt => {
                if (!appointmentsByDate[apt.date]) {
                    appointmentsByDate[apt.date] = [];
                }
                appointmentsByDate[apt.date].push(apt);
            });

            // Calculate gas cost per day and sum them (using historical prices)
            let totalGasCost = 0;
            Object.keys(appointmentsByDate).forEach(date => {
                const dailyAppointments = appointmentsByDate[date];
                const dailyCities = dailyAppointments.map(apt => apt.city);
                const dailyGasCost = calculateGasCost(dailyCities, date); // Pass date for historical price
                totalGasCost += dailyGasCost;
            });
            
            // Calculate weeks in current month for advertising cost
            const weeksInMonth = getWeeksInCurrentMonth();
            const totalAdvertisingCost = weeksInMonth * ADVERTISING_COST_PER_WEEK;
            
            const netIncome = totalIncome - totalGasCost - totalAdvertisingCost;
            const tithe = Math.max(0, netIncome * 0.10); // 10% of net income, min 0

            // Debug log for verification
            console.log('📊 RESUMEN MENSUAL:');
            console.log(`   Total Citas: ${monthlyAppointments.length}`);
            console.log(`   Días con citas: ${Object.keys(appointmentsByDate).length}`);
            console.log(`   Ingresos Brutos: $${totalIncome.toFixed(2)}`);
            console.log(`   Gasolina (suma diaria): -$${totalGasCost.toFixed(2)}`);
            console.log(`   Publicidad (${weeksInMonth} semanas x $45): -$${totalAdvertisingCost.toFixed(2)}`);
            console.log(`   Ganancia Neta: $${netIncome.toFixed(2)}`);
            console.log(`   Diezmo (10%): $${tithe.toFixed(2)}`);

            // Update display
            document.getElementById('monthly-gross-income').textContent = `$${totalIncome.toFixed(2)}`;
            document.getElementById('monthly-gas-expense').textContent = `-$${totalGasCost.toFixed(2)}`;
            document.getElementById('monthly-advertising-expense').textContent = `-$${totalAdvertisingCost.toFixed(2)}`;
            document.getElementById('monthly-net-income').textContent = `$${netIncome.toFixed(2)}`;
            document.getElementById('monthly-tithe').textContent = `$${tithe.toFixed(2)}`;
        }

        function displayWeeklyFinances(weeklyData) {
            const grid = document.getElementById('weekly-grid');
            grid.innerHTML = '';

            // Sort weeks by date and number them correctly
            const sortedWeeks = Object.keys(weeklyData).sort();

            sortedWeeks.forEach((weekKey, index) => {
                const week = weeklyData[weekKey];
                const weekEnd = new Date(week.weekStart);
                weekEnd.setDate(weekEnd.getDate() + 6);

                const weekCard = document.createElement('div');
                weekCard.className = 'week-card-modern';

                // Number weeks starting from 1
                const weekNumber = index + 1;
                const dateRange = `${week.weekStart.getDate()} - ${weekEnd.getDate()} ${getMonthName(week.weekStart)}`;

                weekCard.innerHTML = `
                    <div class="week-card-header">
                        <div class="week-badge">S${weekNumber}</div>
                        <p class="week-date">${dateRange}</p>
                    </div>
                    <div class="week-stats-modern">
                        <div class="week-stat-row">
                            <div class="week-stat-content">
                                <span class="week-stat-label">Citas</span>
                                <span class="week-stat-value">${week.appointments.length}</span>
                            </div>
                        </div>
                        <div class="week-stat-row">
                            <div class="week-stat-content">
                                <span class="week-stat-label">Ingresos</span>
                                <span class="week-stat-value positive">$${week.totalIncome.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="week-stat-row">
                            <div class="week-stat-content">
                                <span class="week-stat-label">Gasolina</span>
                                <span class="week-stat-value negative">-$${week.totalGasCost.toFixed(2)}</span>
                            </div>
                        </div>
                        <div class="week-stat-row">
                            <div class="week-stat-content">
                                <span class="week-stat-label">Publicidad</span>
                                <span class="week-stat-value negative">-$${ADVERTISING_COST_PER_WEEK.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    <div class="week-net-income ${week.netIncome >= 0 ? 'positive' : 'negative'}">
                        <span class="week-net-label">Ganancia Neta</span>
                        <span class="week-net-value">$${week.netIncome.toFixed(2)}</span>
                    </div>
                `;

                grid.appendChild(weekCard);
            });
        }

        function calculateHistoricalFinances() {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();

            // Get all appointments
            const appointments = JSON.parse(localStorage.getItem('appointments') || '[]');

            // Group by month (including current month, excluding future months)
            const monthlyData = {};

            appointments.forEach(apt => {
                const aptDate = parseLocalDate(apt.date);
                const aptMonth = aptDate.getMonth();
                const aptYear = aptDate.getFullYear();

                // Skip future months
                if (aptYear > currentYear || (aptYear === currentYear && aptMonth > currentMonth)) {
                    return;
                }

                // Create month key (YYYY-MM)
                const monthKey = `${aptYear}-${String(aptMonth + 1).padStart(2, '0')}`;

                if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                        year: aptYear,
                        month: aptMonth,
                        appointments: [],
                        totalIncome: 0,
                        totalGasCost: 0
                    };
                }

                monthlyData[monthKey].appointments.push(apt);
                monthlyData[monthKey].totalIncome += parseFloat(apt.price || 0);
            });

            // Calculate gas costs and net income for each month
            let totalHistoricalNet = 0;

            Object.keys(monthlyData).forEach(monthKey => {
                const monthData = monthlyData[monthKey];

                // Group appointments by date to calculate daily gas costs
                const appointmentsByDate = {};
                monthData.appointments.forEach(apt => {
                    if (!appointmentsByDate[apt.date]) {
                        appointmentsByDate[apt.date] = [];
                    }
                    appointmentsByDate[apt.date].push(apt);
                });

                // Calculate gas cost per day and sum them (using historical prices)
                let monthGasCost = 0;
                Object.keys(appointmentsByDate).forEach(date => {
                    const dailyAppointments = appointmentsByDate[date];
                    const dailyCities = dailyAppointments.map(apt => apt.city);
                    const dailyGasCost = calculateGasCost(dailyCities, date); // Pass date for historical price
                    monthGasCost += dailyGasCost;
                });

                monthData.totalGasCost = monthGasCost;

                // Calculate weeks in that month for advertising cost
                const firstDay = new Date(monthData.year, monthData.month, 1);
                const lastDay = new Date(monthData.year, monthData.month + 1, 0);
                const weeksInMonth = Math.ceil((lastDay.getDate() - firstDay.getDate() + 1) / 7);
                const advertisingCost = weeksInMonth * ADVERTISING_COST_PER_WEEK;

                monthData.netIncome = monthData.totalIncome - monthData.totalGasCost - advertisingCost;
                totalHistoricalNet += monthData.netIncome;
            });

            // Display total
            document.getElementById('historical-net-income').textContent = `$${totalHistoricalNet.toFixed(2)}`;

            // Sort months by date (newest first)
            const sortedMonths = Object.keys(monthlyData).sort().reverse();

            // Display months count
            const monthsCount = sortedMonths.length;
            document.getElementById('historical-months-count').textContent =
                monthsCount === 0 ? 'Sin datos históricos' :
                monthsCount === 1 ? '1 mes' :
                `${monthsCount} meses`;

            // Display breakdown in carousel
            const carouselDiv = document.getElementById('historical-carousel');
            carouselDiv.innerHTML = '';

            if (sortedMonths.length === 0) {
                carouselDiv.innerHTML = '<p style="color: rgba(255, 255, 255, 0.6); text-align: center; padding: 40px; width: 100%;">No hay datos disponibles</p>';
                // Hide carousel controls
                const carouselHeader = document.querySelector('.carousel-header');
                if (carouselHeader) carouselHeader.style.display = 'none';
                return;
            }

            // Show carousel controls only if there are months
            const carouselHeader = document.querySelector('.carousel-header');
            if (carouselHeader) carouselHeader.style.display = 'flex';

            sortedMonths.forEach(monthKey => {
                const monthData = monthlyData[monthKey];
                const monthName = getMonthName(new Date(monthData.year, monthData.month, 1));
                const yearLabel = monthData.year !== currentYear ? ` ${monthData.year}` : '';

                const monthItem = document.createElement('div');
                monthItem.className = 'historical-month-item';
                monthItem.innerHTML = `
                    <div class="historical-month-name">${monthName}${yearLabel}</div>
                    <div class="historical-month-value ${monthData.netIncome >= 0 ? 'positive' : 'negative'}">
                        $${monthData.netIncome.toFixed(2)}
                    </div>
                `;
                carouselDiv.appendChild(monthItem);
            });

            console.log('📈 HISTÓRICO:');
            console.log(`   Total meses anteriores: ${sortedMonths.length}`);
            console.log(`   Ganancia neta total: $${totalHistoricalNet.toFixed(2)}`);
        }

        function scrollHistoricalCarousel(direction) {
            const carousel = document.getElementById('historical-carousel');
            const scrollAmount = 220; // Card width + gap
            carousel.scrollBy({
                left: direction * scrollAmount,
                behavior: 'smooth'
            });
        }

        function getWeekStart(date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0); // Set to start of day
            const day = d.getDay(); // 0 = Sunday, 1 = Monday, etc.

            // Calculate days to subtract to get to Monday
            const daysToSubtract = day === 0 ? 6 : day - 1; // Sunday: 6, Monday: 0, Tuesday: 1, etc.

            // Set to Monday of the week
            d.setDate(d.getDate() - daysToSubtract);
            d.setHours(0, 0, 0, 0); // Ensure clean start of day

            return d;
        }

        function getWeeksInCurrentMonth() {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            
            // Get first and last day of month
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            // Calculate weeks
            const firstWeekStart = getWeekStart(firstDay);
            const lastWeekStart = getWeekStart(lastDay);
            
            const weeks = Math.round((lastWeekStart - firstWeekStart) / (7 * 24 * 60 * 60 * 1000)) + 1;
            return weeks;
        }

        function getMonthName(date) {
            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                              'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            return monthNames[date.getMonth()];
        }

        // Function to clean invalid date entries
        window.cleanInvalidEntries = function() {
            let clients = JSON.parse(localStorage.getItem('clientRegistry') || '[]');
            console.log('🧹 Before cleaning:', clients.length, 'entries');
            
            const validClients = clients.filter(client => {
                const isValid = client.name && client.timestamp && 
                               !isNaN(new Date(client.timestamp).getTime()) &&
                               client.name !== '' && client.name !== 'undefined';
                
                if (!isValid) {
                    console.log('🧹 Removing invalid entry:', client);
                }
                return isValid;
            });
            
            localStorage.setItem('clientRegistry', JSON.stringify(validClients));
            console.log('🧹 After cleaning:', validClients.length, 'entries');
            console.log('🧹 Removed', clients.length - validClients.length, 'invalid entries');
            
            // Refresh registry view if visible
            const registryView = document.getElementById('history-view');
            if (registryView && registryView.style.display !== 'none') {
                loadClientRegistry();
            }
            
            return validClients;
        };

        function calculateTotalSpent(appointments) {
            return appointments.reduce((total, apt) => {
                return total + (parseFloat(apt.price) || 0);
            }, 0);
        }
