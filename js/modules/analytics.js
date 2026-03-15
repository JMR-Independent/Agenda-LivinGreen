// ================================================================
// MODULE: analytics.js
// Dashboard analytics: gráficos de ciudades, trabajos, ingresos, tendencias
// Depende de: OfflineDB, calculateGasCost, parseLocalDate (runtime)
// ================================================================

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

