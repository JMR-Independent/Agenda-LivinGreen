// ================================================================
// MODULE: travel.js
// Coordenadas de ciudades, cálculo de rutas y costo de gasolina
// Depende de: GAS_PRICE_UTAH, getGasPriceForDate (gas-price.js)
// ================================================================

        // City coordinates and real distances from Mapleton (in miles, round trip)
        const CITY_DATA = {
            'Alpine': { lat: 40.4541, lng: -111.7771, distanceFromMapleton: 54 },
            'American Fork': { lat: 40.3769, lng: -111.7957, distanceFromMapleton: 48 },
            'Bluffdale': { lat: 40.4897, lng: -111.9385, distanceFromMapleton: 74 },
            'Bountiful': { lat: 40.8894, lng: -111.8808, distanceFromMapleton: 110 },
            'Cedar Hills': { lat: 40.4119, lng: -111.7599, distanceFromMapleton: 50 },
            'Cottonwood Heights': { lat: 40.6197, lng: -111.8102, distanceFromMapleton: 82 },
            'Draper': { lat: 40.5249, lng: -111.8638, distanceFromMapleton: 70 },
            'Eagle Mountain': { lat: 40.3141, lng: -112.0071, distanceFromMapleton: 68 },
            'Elk Ridge': { lat: 40.0114, lng: -111.6756, distanceFromMapleton: 16 },
            'Herriman': { lat: 40.5141, lng: -112.0291, distanceFromMapleton: 84 },
            'Highland': { lat: 40.4294, lng: -111.7983, distanceFromMapleton: 52 },
            'Holladay': { lat: 40.6683, lng: -111.8155, distanceFromMapleton: 88 },
            'Kearns': { lat: 40.6597, lng: -112.0127, distanceFromMapleton: 92 },
            'Lehi': { lat: 40.3916, lng: -111.8508, distanceFromMapleton: 56 },
            'Lindon': { lat: 40.3430, lng: -111.7188, distanceFromMapleton: 38 },
            'Mapleton': { lat: 40.1302, lng: -111.5783, distanceFromMapleton: 0 },
            'Midvale': { lat: 40.6111, lng: -111.8999, distanceFromMapleton: 80 },
            'Millcreek': { lat: 40.6869, lng: -111.8155, distanceFromMapleton: 90 },
            'Murray': { lat: 40.6669, lng: -111.8880, distanceFromMapleton: 86 },
            'North Salt Lake': { lat: 40.8358, lng: -111.9063, distanceFromMapleton: 104 },
            'Orem': { lat: 40.2969, lng: -111.6946, distanceFromMapleton: 32 },
            'Payson': { lat: 40.0441, lng: -111.7321, distanceFromMapleton: 18 },
            'Pleasant Grove': { lat: 40.3641, lng: -111.7385, distanceFromMapleton: 44 },
            'Provo': { lat: 40.2338, lng: -111.6585, distanceFromMapleton: 20 },
            'Riverton': { lat: 40.5219, lng: -111.9391, distanceFromMapleton: 78 },
            'Salem': { lat: 40.0528, lng: -111.6736, distanceFromMapleton: 12 },
            'Salt Lake City': { lat: 40.7608, lng: -111.8910, distanceFromMapleton: 98 },
            'Sandy': { lat: 40.5936, lng: -111.8841, distanceFromMapleton: 76 },
            'Santaquin': { lat: 39.9744, lng: -111.7871, distanceFromMapleton: 24 },
            'Saratoga Springs': { lat: 40.3483, lng: -111.9043, distanceFromMapleton: 58 },
            'South Jordan': { lat: 40.5622, lng: -111.9296, distanceFromMapleton: 76 },
            'South Salt Lake': { lat: 40.7183, lng: -111.8884, distanceFromMapleton: 92 },
            'Spanish Fork': { lat: 40.1149, lng: -111.6549, distanceFromMapleton: 14 },
            'Springville': { lat: 40.1652, lng: -111.6107, distanceFromMapleton: 10 },
            'Taylorsville': { lat: 40.6677, lng: -111.9388, distanceFromMapleton: 88 },
            'West Jordan': { lat: 40.6097, lng: -111.9391, distanceFromMapleton: 82 },
            'West Valley City': { lat: 40.6916, lng: -112.0011, distanceFromMapleton: 94 },
            'Woodland Hills': { lat: 40.0128, lng: -111.6289, distanceFromMapleton: 8 },
            'Woods Cross': { lat: 40.8716, lng: -111.8927, distanceFromMapleton: 108 }
        };

        function calculateDistance(city1, city2) {
            const c1 = CITY_DATA[city1];
            const c2 = CITY_DATA[city2];
            
            if (!c1 || !c2) return 0;
            
            const R = 3959; // Radio de la tierra en millas
            const dLat = (c2.lat - c1.lat) * Math.PI / 180;
            const dLng = (c2.lng - c1.lng) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) *
                      Math.sin(dLng/2) * Math.sin(dLng/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        }

        function findOptimalRoute(cities) {
            if (!cities || cities.length === 0) return { route: [], totalDistance: 0 };
            if (cities.length === 1) {
                const distance = CITY_DATA[cities[0]]?.distanceFromMapleton || 0;
                return { route: ['Mapleton', cities[0], 'Mapleton'], totalDistance: distance };
            }

            // Para múltiples ciudades, usar el enfoque más simple y realista:
            // Ir a la ciudad más lejana de Mapleton y optimizar desde ahí
            let farthestCity = cities[0];
            let farthestDistance = CITY_DATA[farthestCity]?.distanceFromMapleton || 0;
            
            cities.forEach(city => {
                const distance = CITY_DATA[city]?.distanceFromMapleton || 0;
                if (distance > farthestDistance) {
                    farthestCity = city;
                    farthestDistance = distance;
                }
            });

            // Calcular distancia total: ir a la ciudad más lejana + pequeños ajustes entre ciudades cercanas
            let totalDistance = farthestDistance; // Solo ida a la ciudad más lejana
            
            // Si hay múltiples ciudades, agregar pequeños costos entre ciudades cercanas
            if (cities.length > 1) {
                const otherCities = cities.filter(city => city !== farthestCity);
                otherCities.forEach(city => {
                    const distanceBetweenCities = calculateDistance(farthestCity, city);
                    // Solo agregar si la distancia entre ciudades es significativa (más de 5 millas)
                    if (distanceBetweenCities > 5) {
                        totalDistance += distanceBetweenCities * 0.3; // Solo 30% del costo entre ciudades
                    }
                });
            }
            
            return { route: cities, totalDistance };
        }

        function calculateGasCost(cities, dateString = null) {
            if (!cities || cities.length === 0) return 0;

            const uniqueCities = [...new Set(cities)]; // Eliminar duplicados
            const optimalRoute = findOptimalRoute(uniqueCities);

            // Get gas price for the specific date (historical) or use current price
            let gasPrice = GAS_PRICE_UTAH; // Default to current price
            if (dateString) {
                gasPrice = getGasPriceForDate(dateString);
            }

            // Costo por milla para Kia Sedona 2008 (18 MPG combinado, más realista)
            const mpg = 18; // millas por galón para 2008 Kia Sedona
            const costPerMile = gasPrice / mpg;

            const totalCost = optimalRoute.totalDistance * costPerMile;

            // Mínimo de $2 para cualquier viaje (costo base)
            return Math.max(totalCost, 2.00);
        }
