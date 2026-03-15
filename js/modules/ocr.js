// ================================================================
// MODULE: ocr.js
// OCR: Groq Vision, Gemini Vision, Tesseract, Google Vision, OpenAI
// Depende de: API_BASE_URL, backendAvailable, _ocrPrompt (app.js en runtime)
// ================================================================

        // Groq Vision OCR — fastest, same as chat
        async function _extractWithGroq(imagesData) {
            const groqKey = localStorage.getItem('rize_groq_key');
            if (!groqKey) return null;
            const models = ['meta-llama/llama-4-scout-17b-16e-instruct','llama-3.2-90b-vision-preview','llama-3.2-11b-vision-preview'];
            const prompt = _ocrPrompt;

            const compressed = await Promise.all(imagesData.map(img => _compressImage(img.base64, 800)));
            const results = await Promise.all(compressed.map(async b64 => {
                for (const model of models) {
                    try {
                        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
                            body: JSON.stringify({ model, messages: [{ role: 'user', content: [
                                { type: 'text', text: prompt },
                                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } }
                            ]}], max_tokens: 300, temperature: 0 })
                        });
                        if (res.status === 404 || res.status === 400) continue;
                        if (!res.ok) return null;
                        const data = await res.json();
                        const text = data.choices?.[0]?.message?.content || '';
                        const match = text.replace(/```json\s*/g,'').replace(/```\s*/g,'').match(/\{[\s\S]*\}/);
                        if (!match) return null;
                        try { return JSON.parse(match[0]); } catch { return null; }
                    } catch { continue; }
                }
                return null;
            }));
            const valid = results.filter(Boolean);
            if (!valid.length) return null;
            return combineExtractedData(valid);
        }

        async function extractDataWithGeminiVision(imagesData) {
            try {
                const key = localStorage.getItem('rize_gemini_key');
                if (!key) return null;

                // Use cached model or pick fastest available
                let model = localStorage.getItem('rize_gemini_model');
                if (!model) {
                    for (const m of ['gemini-2.0-flash','gemini-1.5-flash','gemini-2.0-flash-exp']) {
                        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}?key=${encodeURIComponent(key)}`);
                        if (r.ok) { model = m; localStorage.setItem('rize_gemini_model', m); break; }
                    }
                }
                if (!model) return null;

                const prompt = _ocrPrompt;

                // Compress all images in parallel, then send all in parallel
                const compressed = await Promise.all(imagesData.map(img => _compressImage(img.base64)));

                const results = await Promise.all(compressed.map(async (b64, i) => {
                    const body = {
                        contents: [{ role: 'user', parts: [
                            { inlineData: { mimeType: 'image/jpeg', data: b64 } },
                            { text: prompt }
                        ]}],
                        generationConfig: { maxOutputTokens: 300, temperature: 0 }
                    };
                    const res = await fetch(
                        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
                        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
                    );
                    if (!res.ok) return null;
                    const data = await res.json();
                    const text = data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
                    const match = text.replace(/```json\s*/g,'').replace(/```\s*/g,'').match(/\{[\s\S]*\}/);
                    if (!match) return null;
                    try { return JSON.parse(match[0]); } catch { return null; }
                }));

                const valid = results.filter(Boolean);
                if (!valid.length) return null;
                return combineExtractedData(valid);
            } catch (e) {
                console.error('❌ Gemini Vision failed:', e);
                return null;
            }
        }

        async function extractDataFromMultipleImages(imagesData) {
            try {
                // 1. Groq Vision — más rápido (igual que el chat)
                const groqResult = await _extractWithGroq(imagesData);
                if (groqResult && Object.values(groqResult).some(v => v && String(v).trim())) {
                    return groqResult;
                }

                // 2. Gemini Vision — fallback
                const geminiResult = await extractDataWithGeminiVision(imagesData);
                if (geminiResult && Object.values(geminiResult).some(v => v && String(v).trim())) {
                    return geminiResult;
                }

                // 3. Google Cloud Vision — último recurso
                const visionResult = await extractDataWithGoogleVision(imagesData);
                if (visionResult && Object.values(visionResult).some(v => v && String(v).trim())) {
                    return visionResult;
                }

                // Final fallback to manual extraction
                return await extractDataManuallyFromImages(imagesData);

            } catch (error) {
                console.error('❌ All extraction methods failed:', error);
                return await extractDataManuallyFromImages(imagesData);
            }
        }

        // Preprocess image for better OCR accuracy
        async function preprocessImageForOCR(base64Data) {
            return new Promise((resolve, reject) => {
                try {
                    console.log('🎨 Preprocessing image for better OCR...');

                    const img = new Image();
                    img.onload = function() {
                        // Create canvas
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');

                        // Scale up small images for better recognition
                        const scale = Math.max(1, 2000 / Math.max(img.width, img.height));
                        canvas.width = img.width * scale;
                        canvas.height = img.height * scale;

                        // Draw image
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                        // Get image data
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                        const data = imageData.data;

                        // Calculate average brightness to detect dark mode
                        let totalBrightness = 0;
                        for (let i = 0; i < data.length; i += 4) {
                            totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
                        }
                        const avgBrightness = totalBrightness / (data.length / 4);
                        const isDarkMode = avgBrightness < 100;

                        console.log(`📊 Image brightness: ${avgBrightness.toFixed(1)} (${isDarkMode ? 'Dark mode detected' : 'Light mode'})`);

                        // Process each pixel
                        for (let i = 0; i < data.length; i += 4) {
                            let r = data[i];
                            let g = data[i + 1];
                            let b = data[i + 2];

                            // Convert to grayscale
                            let gray = 0.299 * r + 0.587 * g + 0.114 * b;

                            // If dark mode, invert colors (white text on black -> black text on white)
                            if (isDarkMode) {
                                gray = 255 - gray;
                            }

                            // Increase contrast
                            gray = ((gray - 128) * 1.5) + 128;

                            // Clamp values
                            gray = Math.max(0, Math.min(255, gray));

                            // Apply threshold for sharper text
                            gray = gray > 140 ? 255 : 0;

                            // Set RGB to same grayscale value
                            data[i] = gray;
                            data[i + 1] = gray;
                            data[i + 2] = gray;
                        }

                        // Put processed image data back
                        ctx.putImageData(imageData, 0, 0);

                        // Convert to base64
                        const processedBase64 = canvas.toDataURL('image/png').split(',')[1];

                        console.log('✅ Image preprocessed successfully');
                        resolve(processedBase64);
                    };

                    img.onerror = function(error) {
                        console.error('❌ Error loading image for preprocessing:', error);
                        reject(error);
                    };

                    img.src = `data:image/jpeg;base64,${base64Data}`;

                } catch (error) {
                    console.error('❌ Preprocessing error:', error);
                    reject(error);
                }
            });
        }

        // Tesseract.js - Free OCR that runs in the browser
        async function extractDataWithTesseract(imagesData) {
            try {
                console.log('📝 Starting Tesseract.js OCR (free, browser-based)...');

                // Combine text from all images
                let allText = '';

                for (let i = 0; i < imagesData.length; i++) {
                    const imageData = imagesData[i];
                    console.log(`📷 Processing image ${i + 1}/${imagesData.length} with Tesseract...`);

                    try {
                        // Show progress to user
                        const loadingEl = document.getElementById('loading');
                        if (loadingEl) {
                            const progressText = loadingEl.querySelector('p');
                            if (progressText) {
                                progressText.textContent = `Procesando imagen ${i + 1}/${imagesData.length} con OCR...`;
                            }
                        }

                        // Preprocess image for better OCR accuracy
                        const base64Data = imageData.base64;
                        const processedBase64 = await preprocessImageForOCR(base64Data);
                        const imageUrl = `data:image/png;base64,${processedBase64}`;

                        // Run Tesseract OCR with progress tracking
                        const result = await Tesseract.recognize(
                            imageUrl,
                            'eng+spa', // English and Spanish
                            {
                                logger: info => {
                                    if (info.status === 'recognizing text') {
                                        const percent = Math.round(info.progress * 100);
                                        console.log(`📊 OCR Progress: ${percent}%`);
                                        const loadingEl = document.getElementById('loading');
                                        if (loadingEl) {
                                            const progressText = loadingEl.querySelector('p');
                                            if (progressText) {
                                                progressText.textContent = `Extrayendo texto ${i + 1}/${imagesData.length}: ${percent}%`;
                                            }
                                        }
                                    }
                                }
                            }
                        );

                        const text = result.data.text;

                        if (text && text.trim()) {
                            allText += text + '\n\n';
                            console.log(`✅ Image ${i + 1} processed successfully`);
                            console.log(`📝 Extracted text from image ${i + 1}:`, text.substring(0, 200) + '...');
                        } else {
                            console.warn(`⚠️ No text extracted from image ${i + 1}`);
                        }

                    } catch (imageError) {
                        console.error(`❌ Error processing image ${i + 1} with Tesseract:`, imageError);
                        // Continue with next image
                        continue;
                    }
                }

                // Reset loading text
                const loadingEl = document.getElementById('loading');
                if (loadingEl) {
                    const progressText = loadingEl.querySelector('p');
                    if (progressText) {
                        progressText.textContent = 'Procesando...';
                    }
                }

                if (!allText.trim()) {
                    console.warn('⚠️ No text extracted from any image with Tesseract');
                    return null;
                }

                console.log('📋 Combined text from all images:', allText);

                // Parse the extracted text to find the required fields
                const extractedData = parseExtractedText(allText);

                console.log('✅ Parsed data from Tesseract:', extractedData);
                return extractedData;

            } catch (error) {
                console.error('❌ Tesseract extraction failed:', error);
                return null;
            }
        }

        // Google Cloud Vision API - Best OCR accuracy
        async function extractDataWithGoogleVision(imagesData) {
            try {
                console.log('📸 Starting Google Cloud Vision OCR...');

                // Google Vision API Key (fallback for direct API calls)
                const GOOGLE_VISION_API_KEY = 'AIzaSyCwvICuNacBN9Z2HOGPlYbyXc-cyHQAtmA';

                // Combine text from all images
                let allText = '';

                // Check if we have API_BASE_URL (deployed or local server)
                const useBackend = API_BASE_URL && !isFileProtocol;

                console.log(`🔧 Using ${useBackend ? 'Backend Proxy' : 'Direct API'} for Google Vision`);

                for (let i = 0; i < imagesData.length; i++) {
                    const imageData = imagesData[i];
                    console.log(`📷 Processing image ${i + 1}/${imagesData.length} with Google Vision...`);

                    // Show progress to user
                    const loadingEl = document.getElementById('loading');
                    if (loadingEl) {
                        const progressText = loadingEl.querySelector('p');
                        if (progressText) {
                            progressText.textContent = `Procesando imagen ${i + 1}/${imagesData.length} con Google Vision OCR...`;
                        }
                    }

                    let response;

                    if (useBackend) {
                        // Use backend proxy (secure, no CORS issues)
                        console.log('🔐 Using secure backend proxy for Google Vision');
                        response = await fetch(`${API_BASE_URL}/vision`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                image: imageData.base64.replace(/^data:image\/\w+;base64,/, ''),
                                features: [
                                    {
                                        type: 'TEXT_DETECTION',
                                        maxResults: 1
                                    }
                                ]
                            })
                        });
                    } else {
                        // Call Google Vision API directly (may have CORS issues in some browsers)
                        console.log('🌐 Using direct API call to Google Vision');
                        response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_VISION_API_KEY}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                requests: [
                                    {
                                        image: {
                                            content: imageData.base64.replace(/^data:image\/\w+;base64,/, '')
                                        },
                                        features: [
                                            {
                                                type: 'TEXT_DETECTION',
                                                maxResults: 1
                                            }
                                        ]
                                    }
                                ]
                            })
                        });
                    }

                    if (!response.ok) {
                        let errorData;
                        try {
                            errorData = await response.json();
                        } catch (e) {
                            errorData = { message: await response.text() };
                        }

                        console.error(`❌ Google Vision API Error (image ${i + 1}):`, errorData);

                        // Mostrar error más específico al usuario
                        if (response.status === 403 || response.status === 401) {
                            console.error('🔑 API Key Error: La API key no es válida o no tiene permisos.');
                            console.error('📖 Solución: Verifica la configuración en Vercel → Settings → Environment Variables');
                            console.error('🔗 Más info: https://console.cloud.google.com/apis/api/vision.googleapis.com');
                        } else if (response.status === 500) {
                            console.error('⚠️ Server Error: La variable GOOGLE_VISION_API_KEY puede no estar configurada en Vercel');
                            console.error('📖 Solución: Ve a tu proyecto en Vercel → Settings → Environment Variables');
                        }

                        // Mostrar alerta al usuario en el primer error
                        if (i === 0) {
                            const errorMsg = errorData.userMessage || errorData.message || 'Error al procesar la imagen';
                            showError(`Google Vision Error: ${errorMsg}. La app intentará otros métodos de extracción.`);
                        }

                        // Retornar null para que intente con los métodos de fallback
                        return null;
                    }

                    const data = await response.json();
                    console.log(`✅ Image ${i + 1} processed successfully`);

                    // Extract full text annotation
                    if (data.responses && data.responses[0] && data.responses[0].fullTextAnnotation) {
                        const text = data.responses[0].fullTextAnnotation.text;
                        allText += text + '\n\n';
                        console.log(`📝 Extracted text from image ${i + 1}:`, text.substring(0, 200) + '...');
                    }
                }

                if (!allText.trim()) {
                    console.warn('⚠️ No text extracted from any image');
                    return null;
                }

                console.log('📋 Combined text from all images:', allText);

                // Parse the extracted text to find the required fields
                const extractedData = parseExtractedText(allText);

                console.log('✅ Parsed data:', extractedData);
                return extractedData;

            } catch (error) {
                console.error('❌ Google Vision extraction failed:', error);
                console.error('Error details:', error.message);

                // Check if it's a CORS error
                if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
                    console.error('🚫 CORS Error: Google Vision API bloqueada por el navegador');
                    console.error('💡 Solución: Necesitas usar un proxy/backend para llamar a Google Vision');
                }

                // Return null to try fallback methods
                return null;
            }
        }

        // Parse extracted text to find appointment data
        function parseExtractedText(text) {
            const data = {
                name: '',
                time: '',
                city: '',
                address: '',
                job: '',
                price: '',
                day: '',
                fullText: text  // Store full text for context-based time detection
            };

            console.log('🔍 Parsing extracted text:', text);

            // Normalize text
            const normalizedText = text.toLowerCase();
            const lines = text.split('\n').map(line => line.trim()).filter(line => line);

            console.log('📋 Extracted lines:', lines);

            // Helper function: Check if a string looks like a name
            function looksLikeName(str) {
                if (!str || str.length < 2 || str.length > 50) return false;

                // Not a name if it contains numbers (except at end for "Jr", "III", etc)
                if (/^\d/.test(str) || /\d{2,}/.test(str)) return false;

                // Not a name if it looks like a time (3:30, 11am, etc)
                if (/\d+[:\.]\d+/.test(str) || /\d+\s*(am|pm)/i.test(str)) return false;

                // Not a name if it starts with common greeting words
                const blacklist = ['hola', 'buenas', 'gracias', 'perfecto', 'bien', 'estoy', 'tengo', 'para', 'tarde', 'disponible', 'noches', 'disculpa', 'buenos', 'dias'];
                if (blacklist.some(word => str.toLowerCase().startsWith(word))) return false;

                // Should have at least one uppercase letter (proper name)
                if (!/[A-ZÁÉÍÓÚÑ]/.test(str)) return false;

                // Should be mostly letters (allow spaces and basic punctuation)
                if (!/^[A-ZÁÉÍÓÚÑa-záéíóúñ\s\.\-\']+$/.test(str)) return false;

                return true;
            }

            // Extract name - BUSCAR EN PRIMERAS 5 LÍNEAS
            // El nombre puede estar en la 1ra, 2da o 3ra línea (después de hora, fecha, etc)
            console.log('🔍 Searching for name in first 5 lines...');
            for (let i = 0; i < Math.min(5, lines.length); i++) {
                const line = lines[i].trim();
                console.log(`  Line ${i + 1}: "${line}" - looks like name? ${looksLikeName(line)}`);

                if (looksLikeName(line)) {
                    data.name = line;
                    console.log(`✅ Found name in line ${i + 1}:`, data.name);
                    break;
                }

                // Si la línea completa no es válida, intentar extraer un nombre de ella
                // Ej: "< (>. Alexa x v" → extraer "Alexa"
                if (!data.name) {
                    const nameMatch = line.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)?)\b/);
                    if (nameMatch && nameMatch[1]) {
                        const extractedName = nameMatch[1].trim();
                        // Validar que el nombre extraído sea válido
                        const blacklist = ['Hola', 'Buenas', 'Gracias', 'Perfecto', 'Bien', 'Estoy', 'Tengo', 'Para', 'Tarde', 'Disponible', 'Noches', 'Disculpa', 'Buenos', 'Dias', 'Estamos', 'Contacto'];
                        if (!blacklist.includes(extractedName) && extractedName.length >= 3) {
                            data.name = extractedName;
                            console.log(`✅ Found name extracted from line ${i + 1}:`, data.name);
                            break;
                        }
                    }
                }
            }

            // Si no encontramos nombre en primeras líneas, buscar con patterns en todo el texto
            if (!data.name) {
                console.log('⚠️ Name not found in first lines, trying patterns...');
                const namePatterns = [
                    /(?:nombre|name|cliente):\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\n|$)/i,
                    // Look for capitalized names in their own line
                    /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)$/m,
                ];
                for (const pattern of namePatterns) {
                    const match = text.match(pattern);
                    if (match && match[1]) {
                        const potentialName = match[1].trim();
                        if (looksLikeName(potentialName)) {
                            data.name = potentialName;
                            console.log('✅ Found name with pattern:', data.name);
                            break;
                        }
                    }
                }
            }

            if (!data.name) {
                console.log('❌ Name not found');
            }

            // Extract time - improved for natural language and formats like 3:30 or 3.30
            console.log('🔍 Searching for time...');
            const timePatterns = [
                { name: 'hora: X', pattern: /(?:hora|time):\s*(\d{1,2}[:.]?\d{2}\s*(?:am|pm|a\.m\.|p\.m\.)?)/i },
                { name: 'X:XX am/pm', pattern: /\b(\d{1,2}:\d{2}\s*(?:am|pm|a\.m\.|p\.m\.))\b/i },
                { name: 'X am/pm', pattern: /\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b/i },
                { name: 'a las X:XX', pattern: /(?:a\s+las|como\s+a\s+las)\s+(\d{1,2}[:\.]\d{2})/i },
                { name: 'mañana X:XX', pattern: /(?:ma[ñn]ana|morning).*?(\d{1,2}[:\.]\d{2})/i },
                { name: 'standalone X:XX', pattern: /\b(\d{1,2}[:\.]\d{2})\b/ },
                { name: 'mañana X am', pattern: /(?:ma[ñn]ana|morning).*?(\d{1,2})\s*(am|pm)?/i }
            ];

            for (const { name: patternName, pattern } of timePatterns) {
                const match = text.match(pattern);
                console.log(`  Trying pattern "${patternName}":`, match ? `Found "${match[0]}"` : 'No match');

                if (match) {
                    let timeCandidate = '';

                    if (match[2] && match[1]) {
                        // Has hours and am/pm separately (e.g., "11" and "am")
                        const hours = parseInt(match[1]);

                        // Validate: hours for 12h format should be 1-12
                        if (hours >= 1 && hours <= 12) {
                            timeCandidate = `${match[1]} ${match[2]}`;
                        } else {
                            console.log(`  ⚠️ Invalid hour: ${hours} (must be 1-12 for 12h format)`);
                        }
                    } else if (match[1]) {
                        // Normalize time format (convert . to :)
                        let time = match[1].trim().replace('.', ':');

                        // If it's a valid time format
                        if (/^\d{1,2}[:\.]\d{2}$/.test(match[1])) {
                            // Validate hours and minutes
                            const parts = time.split(':');
                            const hours = parseInt(parts[0]);
                            const minutes = parseInt(parts[1]);

                            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
                                timeCandidate = time;
                            } else {
                                console.log(`  ⚠️ Invalid time: ${hours}:${minutes}`);
                            }
                        }
                    }

                    if (timeCandidate) {
                        data.time = timeCandidate;
                        console.log('✅ Found time:', data.time, `(using pattern: ${patternName})`);
                        break;
                    }
                }
            }

            if (!data.time) {
                console.log('❌ Time not found');
            }

            // Extract day of week
            const dayPatterns = [
                /\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/i,
                /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
            ];
            for (const pattern of dayPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    data.day = match[1].trim();
                    break;
                }
            }

            // Extract city
            const cityPatterns = [
                /(?:ciudad|city):\s*(.+)/i,
                /\b(Alpine|American Fork|Bluffdale|Bountiful|Cedar Hills|Cottonwood Heights|Draper|Eagle Mountain|Elk Ridge|Herriman|Highland|Holladay|Kearns|Lehi|Lindon|Mapleton|Midvale|Millcreek|Murray|North Salt Lake|Orem|Payson|Pleasant Grove|Provo|Riverton|Salem|Salt Lake City|Sandy|Santaquin|Saratoga Springs|South Jordan|South Salt Lake|Spanish Fork|Springville|Taylorsville|West Jordan|West Valley City|Woodland Hills|Woods Cross)\b/i
            ];
            for (const pattern of cityPatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    data.city = match[1].trim();
                    break;
                }
            }

            // Extract address - improved for Utah addresses (multiple formats)
            console.log('🔍 Searching for address...');
            const addressPatterns = [
                { name: 'dirección:', pattern: /(?:direcci[oó]n|address):\s*(.+)/i },
                { name: 'Utah N/S/E/W digits', pattern: /\b(\d+\s+[NSEWnsew](?:orth|outh|ast|est)?\s+\d+\s+[NSEWnsew](?:orth|outh|ast|est)?(?:\s+(?:Apt|Unit|#|Ste)\.?\s*\w+)?)\b/i },
                { name: 'Utah short N S E W', pattern: /\b(\d+\s+[NSEW]\s+\d+\s+[NSEW])\b/i },
                { name: 'Standard street', pattern: /\b(\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Blvd|Boulevard|Lane|Ln|Way|Cir|Ct|Court|Pl|Place)\.?(?:\s*(?:Apt|Unit|#|Ste)\.?\s*\w+)?)\b/i },
                { name: 'En/Estoy en', pattern: /(?:en|estoy\s+en|vivo\s+en|mi\s+direcci[oó]n(?:\s+es)?)\s+(\d+[^\n]{5,60})/i }
            ];
            for (const { name: patternName, pattern } of addressPatterns) {
                const match = text.match(pattern);
                console.log(`  Trying pattern "${patternName}":`, match ? `Found "${match[0]}"` : 'No match');
                if (match && match[1]) {
                    data.address = match[1].trim();
                    console.log('✅ Found address:', data.address, `(using pattern: ${patternName})`);
                    break;
                }
            }
            if (!data.address) {
                console.log('❌ Address not found');
            }

            // Extract job/service - expanded patterns
            console.log('🔍 Searching for job/service...');
            const jobPatterns = [
                { name: 'trabajo/job:', pattern: /(?:trabajo|job|servicio|service|tipo):\s*(.+)/i },
                { name: 'move in/out', pattern: /\b(move[\s\-]?(?:in|out)|movein|moveout)\b/i },
                { name: 'airbnb', pattern: /\b(airbnb|air\s*bnb|vacation\s*rental)\b/i },
                { name: 'deep clean', pattern: /\b(deep\s+clean(?:ing)?)\b/i },
                { name: 'standard/regular clean', pattern: /\b(standard\s+clean(?:ing)?|regular\s+clean(?:ing)?|recurring\s+clean(?:ing)?)\b/i },
                { name: 'office clean', pattern: /\b(office\s+clean(?:ing)?|commercial\s+clean(?:ing)?)\b/i },
                { name: 'carpet', pattern: /\b(carpet\s+clean(?:ing)?|carpet\s+shampo(?:o|ing))\b/i },
                { name: 'limpiar cuartos', pattern: /(limpiar\s+\d+\s+cuartos?)/i },
                { name: 'limpieza tipo', pattern: /\b(limpieza\s+(?:profunda|regular|de\s+\w+))\b/i },
                { name: 'limpieza/cleaning', pattern: /\b(limpieza|cleaning|clean)\b/i }
            ];
            for (const { name: patternName, pattern } of jobPatterns) {
                const match = text.match(pattern);
                console.log(`  Trying pattern "${patternName}":`, match ? `Found "${match[0]}"` : 'No match');
                if (match && match[1]) {
                    data.job = match[1].trim();
                    console.log('✅ Found job:', data.job, `(using pattern: ${patternName})`);
                    break;
                }
            }
            if (!data.job) {
                console.log('❌ Job not found');
            }

            // Extract price
            const pricePatterns = [
                /(?:precio|price|costo|cost):\s*\$?\s*(\d+(?:[.,]\d{2})?)/i,
                /\$\s*(\d+(?:[.,]\d{2})?)/,
                /\b(\d+)\s*(?:d[oó]lares|dollars|usd)\b/i
            ];
            for (const pattern of pricePatterns) {
                const match = text.match(pattern);
                if (match && match[1]) {
                    data.price = match[1].replace(',', '.');
                    break;
                }
            }

            // Log final summary
            console.log('📊 Extraction Summary:');
            console.log('  Name:', data.name || '❌ Not found');
            console.log('  Time:', data.time || '❌ Not found');
            console.log('  Day:', data.day || '❌ Not found');
            console.log('  Address:', data.address || '❌ Not found');
            console.log('  City:', data.city || '❌ Not found');
            console.log('  Job:', data.job || '❌ Not found');
            console.log('  Price:', data.price || '❌ Not found');

            return data;
        }

        async function extractDataWithMCP(imagesData) {
            try {
                // Convert images to a format that can be processed
                const imagePromises = imagesData.map(async (imageData) => {
                    // Create a temporary image element to get image data
                    return new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx.drawImage(img, 0, 0);

                            // Try OCR using Web APIs if available
                            resolve({
                                width: img.width,
                                height: img.height,
                                base64: imageData.base64,
                                processed: true
                            });
                        };
                        img.src = `data:image/jpeg;base64,${imageData.base64}`;
                    });
                });

                const processedImages = await Promise.all(imagePromises);
                console.log('📷 Processed images for MCP analysis:', processedImages.length);

                // Enhanced manual extraction with better pattern recognition
                return await extractDataWithEnhancedOCR(imagesData);

            } catch (error) {
                console.error('❌ MCP extraction failed:', error);
                return null;
            }
        }

        async function extractDataWithOpenAI(imagesData) {
            try {
                // Create content array with all images
            const content = [
                {
                    type: "text",
                    text: `Analiza estas ${imagesData.length} imágenes y extrae los siguientes datos combinando la información de todas ellas: nombre completo, hora (formato HH:MM de 24h), ciudad, dirección completa, trabajo/profesión, precio, y día de la semana.

IMPORTANTE:
- Busca CUIDADOSAMENTE la HORA en cualquier formato ('10:30', '2:00 PM', '14:00', '10.30', '2 PM', '3 de la tarde', etc.) en CUALQUIERA de las imágenes
- Busca el DÍA DE LA SEMANA ('lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo') en CUALQUIERA de las imágenes
- Combina la información de todas las imágenes para completar los datos
- Si encuentras información parcial en una imagen y más información en otra, combínalas
- Responde SOLO en formato JSON con las claves: name, time, city, address, job, price, day
- Si no encuentras algún dato en ninguna imagen, usa cadena vacía
- Revisa TODO el texto de TODAS las imágenes para encontrar cada campo`
                }
            ];

            // Add all images to the content
            imagesData.forEach((imageData, index) => {
                content.push({
                    type: "image_url",
                    image_url: {
                        url: `data:image/jpeg;base64,${imageData.base64}`
                    }
                });
            });

            // Process multiple images by sending them one by one directly to OpenAI
            const extractedDataArray = [];

            for (let i = 0; i < imagesData.length; i++) {
                const imageData = imagesData[i];
                console.log(`📷 Processing image ${i + 1}/${imagesData.length} with OpenAI...`);

                // Create prompt for single image - optimized for WhatsApp/Messenger screenshots
                const prompt = `Eres un asistente experto en leer pantallazos de WhatsApp y Messenger. Analiza esta imagen de conversación y extrae TODOS los datos relevantes de la cita/trabajo.

CAMPOS A EXTRAER:
1. NOMBRE COMPLETO del cliente (nombre y apellido si está disponible)
2. HORA de la cita en formato 24h (ej: "14:30", "09:00")
3. DÍA DE LA SEMANA (lunes, martes, miércoles, jueves, viernes, sábado, domingo)
4. CIUDAD donde se realizará el trabajo
5. DIRECCIÓN COMPLETA (número, calle, ciudad, código postal si está)
6. TRABAJO/SERVICIO a realizar (limpieza, deep clean, carpet cleaning, office cleaning, etc.)
7. PRECIO en dólares (solo el número, sin símbolo)

INSTRUCCIONES CRÍTICAS PARA EL NOMBRE:
- El NOMBRE puede estar en varios lugares. Busca en TODOS estos sitios:
  * Nombre del contacto en la parte superior de WhatsApp/Messenger
  * Firma al final de los mensajes (ej: "Gracias, Juan")
  * Presentación en el mensaje (ej: "Hola, soy María", "Mi nombre es Pedro")
  * Cualquier parte del texto donde se mencione un nombre propio
- Si ves un nombre de contacto arriba (ej: "Juan Pérez", "Maria Garcia"), úsalo como el nombre
- Si solo ves un nombre (ej: "Juan"), usa ese nombre
- El nombre NUNCA debe estar vacío si hay un nombre de contacto visible

INSTRUCCIONES PARA LA FECHA:
- Si encuentras una fecha específica (ej: "20 de diciembre", "December 20", "12/20"), devuélvela TAL CUAL sin convertir
- Si solo dice un día de la semana (ej: "el viernes", "el martes"), devuelve ese día directamente
- NO conviertas fechas específicas a días de la semana, déjalas como están

OTRAS INSTRUCCIONES:
- Lee TODO el texto visible en la conversación, incluyendo mensajes del cliente y respuestas
- La HORA puede estar en cualquier formato: "10:30", "2:00 PM", "14:00", "10.30", "2 PM", "3 de la tarde", "mañana a las 11", etc. Conviértela SIEMPRE a formato 24h (HH:MM)
- La dirección puede estar en formato Utah (ej: "123 N 456 W") o formato estándar (ej: "123 Main Street")
- El precio puede aparecer como "$150", "150 dólares", "ciento cincuenta", etc.
- Si un dato NO está visible después de buscar exhaustivamente, deja ese campo con cadena vacía ""
- NO inventes información que no esté en la imagen

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional:
{
  "name": "nombre completo del cliente",
  "time": "HH:MM en formato 24h",
  "day": "día de la semana en español (lunes, martes, etc.)",
  "city": "ciudad",
  "address": "dirección completa",
  "job": "descripción del trabajo/servicio",
  "price": "precio en número"
}`;

                // Call backend OpenAI API proxy (secure)
                const response = await fetch(`${API_BASE_URL}/openai`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        images: [imageData.base64],
                        prompt: prompt
                    })
                });

                console.log(`Image ${i + 1} Response status:`, response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Image ${i + 1} API Error:`, errorText);
                    continue; // Skip this image and try the next one
                }

                const data = await response.json();
                console.log(`Image ${i + 1} API Response:`, data);

                // Process backend response format
                if (data.success && data.data) {
                    // Backend successfully parsed the data
                    console.log(`✅ Parsed data from image ${i + 1}:`, data.data);
                    extractedDataArray.push(data.data);
                } else if (data.content) {
                    // Backend returned raw content, try to parse manually
                    console.log(`Image ${i + 1} Raw content:`, data.content);

                    // Clean and parse the content
                    let cleanContent = data.content.trim();
                    if (cleanContent.startsWith('```json')) {
                        cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                    } else if (cleanContent.startsWith('```')) {
                        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    }

                    try {
                        const parsedData = JSON.parse(cleanContent);
                        console.log(`✅ Manual parse successful for image ${i + 1}:`, parsedData);
                        extractedDataArray.push(parsedData);
                    } catch (e) {
                        console.error(`❌ Failed to parse JSON from image ${i + 1}:`, e);
                        // Try manual extraction as fallback
                        const manualData = extractDataManually(data.content);
                        if (manualData && (manualData.name || manualData.time || manualData.city)) {
                            extractedDataArray.push(manualData);
                        }
                    }
                }
            }

            // Combine data from all images
            const combinedData = combineExtractedData(extractedDataArray);
            return combinedData;
            } catch (error) {
                console.error('Multi-image processing error:', error);
                return null;
            }
        }

        async function extractDataFromImage(base64Image) {
            try {
                // Call backend OpenAI API proxy (secure)
                const response = await fetch(`${API_BASE_URL}/openai`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        images: [base64Image],
                        prompt: `Eres un asistente experto en leer pantallazos de WhatsApp y Messenger. Analiza esta imagen de conversación y extrae TODOS los datos relevantes de la cita/trabajo.

CAMPOS A EXTRAER:
1. NOMBRE COMPLETO del cliente (nombre y apellido si está disponible)
2. HORA de la cita en formato 24h (ej: "14:30", "09:00")
3. DÍA DE LA SEMANA (lunes, martes, miércoles, jueves, viernes, sábado, domingo)
4. CIUDAD donde se realizará el trabajo
5. DIRECCIÓN COMPLETA (número, calle, ciudad, código postal si está)
6. TRABAJO/SERVICIO a realizar (limpieza, deep clean, carpet cleaning, office cleaning, etc.)
7. PRECIO en dólares (solo el número, sin símbolo)

INSTRUCCIONES CRÍTICAS PARA EL NOMBRE:
- El NOMBRE puede estar en varios lugares. Busca en TODOS estos sitios:
  * Nombre del contacto en la parte superior de WhatsApp/Messenger
  * Firma al final de los mensajes (ej: "Gracias, Juan")
  * Presentación en el mensaje (ej: "Hola, soy María", "Mi nombre es Pedro")
  * Cualquier parte del texto donde se mencione un nombre propio
- Si ves un nombre de contacto arriba (ej: "Juan Pérez", "Maria Garcia"), úsalo como el nombre
- Si solo ves un nombre (ej: "Juan"), usa ese nombre
- El nombre NUNCA debe estar vacío si hay un nombre de contacto visible

INSTRUCCIONES PARA LA FECHA:
- Si encuentras una fecha específica (ej: "20 de diciembre", "December 20", "12/20"), devuélvela TAL CUAL sin convertir
- Si solo dice un día de la semana (ej: "el viernes", "el martes"), devuelve ese día directamente
- NO conviertas fechas específicas a días de la semana, déjalas como están

OTRAS INSTRUCCIONES:
- Lee TODO el texto visible en la conversación, incluyendo mensajes del cliente y respuestas
- La HORA puede estar en cualquier formato: "10:30", "2:00 PM", "14:00", "10.30", "2 PM", "3 de la tarde", "mañana a las 11", etc. Conviértela SIEMPRE a formato 24h (HH:MM)
- La dirección puede estar en formato Utah (ej: "123 N 456 W") o formato estándar (ej: "123 Main Street")
- El precio puede aparecer como "$150", "150 dólares", "ciento cincuenta", etc.
- Si un dato NO está visible después de buscar exhaustivamente, deja ese campo con cadena vacía ""
- NO inventes información que no esté en la imagen

FORMATO DE RESPUESTA:
Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional:
{
  "name": "nombre completo del cliente",
  "time": "HH:MM en formato 24h",
  "day": "día de la semana en español (lunes, martes, etc.)",
  "city": "ciudad",
  "address": "dirección completa",
  "job": "descripción del trabajo/servicio",
  "price": "precio en número"
}`
                    })
                });

                console.log('Response status:', response.status);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('API Error:', errorText);
                    throw new Error(`API Error ${response.status}: ${errorText}`);
                }

                const data = await response.json();
                console.log('API Response:', data);

                // Process backend response format
                if (data.success && data.data) {
                    // Backend successfully parsed the data
                    console.log('✅ Successfully parsed JSON:', data.data);
                    return data.data;
                }

                // Backend returned raw content, try to parse manually
                const content = data.content || (data.raw && data.raw.choices && data.raw.choices[0] && data.raw.choices[0].message && data.raw.choices[0].message.content);
                if (!content) {
                    throw new Error('No content in response');
                }

                console.log('Raw content:', content);

                // Clean the content - remove markdown code blocks
                let cleanContent = content.trim();
                if (cleanContent.startsWith('```json')) {
                    cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                } else if (cleanContent.startsWith('```')) {
                    cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }
                
                console.log('Cleaned content:', cleanContent);
                
                try {
                    const parsedData = JSON.parse(cleanContent);
                    console.log('✅ Successfully parsed JSON:', parsedData);
                    
                    // Verificar que todos los campos están presentes
                    const requiredFields = ['name', 'time', 'city', 'address', 'job', 'price', 'day'];
                    const missingFields = [];
                    
                    requiredFields.forEach(field => {
                        if (!parsedData[field] || parsedData[field].trim() === '') {
                            missingFields.push(field);
                        }
                    });
                    
                    if (missingFields.length > 0) {
                        console.log('⚠️ Missing or empty fields:', missingFields);
                    }
                    
                    console.log('📊 Extracted data summary:');
                    console.log('  - Name:', parsedData.name || '(empty)');
                    console.log('  - Time:', parsedData.time || '(empty)');
                    console.log('  - City:', parsedData.city || '(empty)');
                    console.log('  - Address:', parsedData.address || '(empty)');
                    console.log('  - Job:', parsedData.job || '(empty)');
                    console.log('  - Price:', parsedData.price || '(empty)');
                    console.log('  - Day:', parsedData.day || '(empty)');
                    
                    return parsedData;
                } catch (e) {
                    console.error('JSON Parse Error:', e);
                    console.log('Failed to parse:', cleanContent);
                    
                    // Try to extract data manually using regex
                    const manualData = extractDataManually(content);
                    if (manualData) {
                        console.log('📊 Manual extraction summary:');
                        console.log('  - Name:', manualData.name || '(empty)');
                        console.log('  - Time:', manualData.time || '(empty)');
                        console.log('  - City:', manualData.city || '(empty)');
                        console.log('  - Address:', manualData.address || '(empty)');
                        console.log('  - Job:', manualData.job || '(empty)');
                        console.log('  - Price:', manualData.price || '(empty)');
                        console.log('  - Day:', manualData.day || '(empty)');
                        return manualData;
                    }
                    
                    // If all fails, return empty data
                    return {
                        name: '',
                        time: '',
                        city: '',
                        address: '',
                        job: '',
                        price: '',
                        day: ''
                    };
                }
            } catch (error) {
                console.error('Full error details:', error);
                
                // Fallback: return empty data so user can fill manually
                showError(`Error de API: ${error.message}. Puedes llenar los datos manualmente.`);
                return {
                    name: '',
                    time: '',
                    city: '',
                    address: '',
                    job: '',
                    price: '',
                    day: ''
                };
            }
        }

        function combineExtractedData(extractedDataArray) {
            console.log('🔗 Combining data from', extractedDataArray.length, 'images');

            // Initialize with empty data
            const combinedData = {
                name: '',
                time: '',
                city: '',
                address: '',
                job: '',
                price: '',
                day: ''
            };

            // Combine data from all extractions, prioritizing non-empty values
            extractedDataArray.forEach((data, index) => {
                console.log(`📋 Data from image ${index + 1}:`, data);

                Object.keys(combinedData).forEach(key => {
                    if (!combinedData[key] && data[key]) {
                        combinedData[key] = data[key];
                        console.log(`✅ Found ${key}: "${data[key]}" from image ${index + 1}`);
                    }
                });
            });

            console.log('🎯 Final combined data:', combinedData);
            return combinedData;
        }

        async function extractDataWithEnhancedOCR(imagesData) {
            console.log('🔍 Using enhanced OCR extraction...');

            try {
                // Combine text from all images using canvas-based text detection
                let combinedText = '';

                for (let i = 0; i < imagesData.length; i++) {
                    const imageData = imagesData[i];
                    console.log(`📷 Processing image ${i + 1}/${imagesData.length}`);

                    // Try to extract text using canvas and image analysis
                    const extractedText = await extractTextFromImage(imageData.base64);
                    combinedText += ` ${extractedText}`;
                }

                console.log('📝 Combined text from all images:', combinedText);

                // Apply enhanced pattern matching to combined text
                const extractedData = extractDataManually(combinedText);

                if (extractedData && (extractedData.name || extractedData.time || extractedData.city)) {
                    console.log('✅ Enhanced OCR extraction successful');
                    return extractedData;
                }

                return null;

            } catch (error) {
                console.error('❌ Enhanced OCR failed:', error);
                return null;
            }
        }

        async function extractTextFromImage(base64Image) {
            return new Promise((resolve) => {
                try {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);

                        // Get image data for analysis
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                        // Simple text detection simulation
                        // In a real implementation, this would use OCR libraries
                        // For now, we'll return the base64 for manual processing
                        resolve(base64Image.substring(0, 100)); // Simulated text extraction
                    };
                    img.onerror = () => resolve('');
                    img.src = `data:image/jpeg;base64,${base64Image}`;
                } catch (error) {
                    console.error('Error in text extraction:', error);
                    resolve('');
                }
            });
        }

        async function extractDataManuallyFromImages(imagesData) {
            console.log('🔧 Using manual fallback extraction...');

            // Return empty structure so user can fill manually
            const emptyData = {
                name: '',
                time: '',
                city: '',
                address: '',
                job: '',
                price: '',
                day: ''
            };

            // Show helpful message to user
            showError('No se pudo extraer datos automáticamente. Por favor llena los campos manualmente.');

            return emptyData;
        }

        function extractDataManually(text) {
            // Fallback manual extraction using regex patterns
            const data = {
                name: '',
                time: '',
                city: '',
                address: '',
                job: '',
                price: '',
                day: ''
            };

            try {
                // First try JSON patterns
                const nameMatch = text.match(/["']?name["']?\s*:\s*["']([^"']+)["']/i);
                const timeMatch = text.match(/["']?time["']?\s*:\s*["']([^"']+)["']/i);
                const cityMatch = text.match(/["']?city["']?\s*:\s*["']([^"']+)["']/i);
                const addressMatch = text.match(/["']?address["']?\s*:\s*["']([^"']+)["']/i);
                const jobMatch = text.match(/["']?job["']?\s*:\s*["']([^"']+)["']/i);
                const priceMatch = text.match(/["']?price["']?\s*:\s*["']?([^"',}]+)["']?/i);
                const dayMatch = text.match(/["']?day["']?\s*:\s*["']([^"']+)["']/i);

                if (nameMatch) data.name = nameMatch[1].trim();
                if (timeMatch) data.time = timeMatch[1].trim();
                if (cityMatch) data.city = cityMatch[1].trim();
                if (addressMatch) data.address = addressMatch[1].trim();
                if (jobMatch) data.job = jobMatch[1].trim();
                if (priceMatch) data.price = priceMatch[1].trim();
                if (dayMatch) data.day = dayMatch[1].trim();

                // If day not found in JSON, try to find it in free text
                if (!data.day) {
                    const dayPattern = /\b(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
                    const dayInText = text.match(dayPattern);
                    if (dayInText) {
                        data.day = dayInText[1].trim();
                        console.log('Found day in free text:', data.day);
                    }
                }

                // If time not found in JSON, try to find it in free text
                if (!data.time) {
                    // Look for various time patterns
                    const timePatterns = [
                        /\b(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)\b/i,
                        /\b(\d{1,2})\.(\d{2})\s*(am|pm|a\.m\.|p\.m\.)\b/i,
                        /\b(\d{1,2}):(\d{2})\b/,
                        /\b(\d{1,2})\.(\d{2})\b/,
                        /\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b/i,
                        /\b(\d{1,2})\s+de\s+la\s+(mañana|tarde|noche)\b/i
                    ];
                    
                    for (const pattern of timePatterns) {
                        const timeInText = text.match(pattern);
                        if (timeInText) {
                            data.time = timeInText[0].trim();
                            console.log('Found time in free text:', data.time);
                            break;
                        }
                    }
                }

                // If price not found in JSON, try to find it in free text
                if (!data.price) {
                    const pricePatterns = [
                        /\$\s*(\d+(?:\.\d{2})?)/,  // $90, $90.00
                        /(\d+(?:\.\d{2})?)\s*\$/,  // 90$, 90.00$
                        /precio\s*:?\s*\$?(\d+(?:\.\d{2})?)/i,  // precio: $90
                        /cost\s*:?\s*\$?(\d+(?:\.\d{2})?)/i,    // cost: $90
                        /\b(\d+(?:\.\d{2})?)\s*dolar/i,        // 90 dolares
                        /\b(\d+(?:\.\d{2})?)\s*usd/i           // 90 USD
                    ];
                    
                    for (const pattern of pricePatterns) {
                        const priceInText = text.match(pattern);
                        if (priceInText) {
                            data.price = priceInText[1].trim();
                            console.log('Found price in free text:', data.price);
                            break;
                        }
                    }
                }

                // If job not found in JSON, try to find it in free text
                if (!data.job) {
                    const jobPatterns = [
                        /trabajo\s*:?\s*([^,\n]+)/i,
                        /profesion\s*:?\s*([^,\n]+)/i,
                        /ocupacion\s*:?\s*([^,\n]+)/i,
                        /job\s*:?\s*([^,\n]+)/i,
                        /profession\s*:?\s*([^,\n]+)/i
                    ];
                    
                    for (const pattern of jobPatterns) {
                        const jobInText = text.match(pattern);
                        if (jobInText) {
                            data.job = jobInText[1].trim();
                            console.log('Found job in free text:', data.job);
                            break;
                        }
                    }
                }

                console.log('Manually extracted data:', data);
                return data;
            } catch (e) {
                console.error('Manual extraction failed:', e);
                return null;
            }
        }
