// ================================================================
// MODULE: receipts.js
// Generación de recibos/facturas, PDF, compartir, contactos, SMS
// Depende de: getBC, selectedAppointment, receiptServices (app.js en runtime)
// ================================================================

        // Receipt Generation Functions
        function generateReceiptModal() {
            if (!selectedAppointment) return;

            const modal = document.getElementById('receipt-modal');
            const clientInfo = document.getElementById('receipt-client-info');

            // Show client information
            clientInfo.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; font-size: 14px;">
                    <div>
                        <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">Client</div>
                        <div style="color: #374151;">${selectedAppointment.name}</div>
                        <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">${selectedAppointment.phone || 'N/A'}</div>
                    </div>
                    <div>
                        <div style="font-weight: 600; color: #1f2937; margin-bottom: 4px;">Original Appointment Price</div>
                        <div style="color: #059669; font-size: 16px; font-weight: 600;">$${selectedAppointment.price}</div>
                        <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">${selectedAppointment.job || 'General service'}</div>
                    </div>
                </div>
            `;

            // AUTO-POPULATE receipt services from appointment data
            receiptServices = [];

            // Pre-populate with appointment job and price data
            if (selectedAppointment.job && selectedAppointment.price && selectedAppointment.price > 0) {
                // Try to match appointment job to known service types, or use as custom service
                let serviceType = selectedAppointment.job;
                let servicePrice = parseFloat(selectedAppointment.price);

                // Check if job matches any configured service
                const matchedSvc = servicesConfig.find(svc =>
                    serviceType.toLowerCase().includes(svc.id) ||
                    serviceType.toLowerCase().includes(svc.name.toLowerCase()) ||
                    svc.name.toLowerCase().includes(serviceType.toLowerCase())
                );
                if (matchedSvc) {
                    serviceType = matchedSvc.name;
                }

                receiptServices.push({
                    service: serviceType,
                    quantity: 1,
                    price: servicePrice,
                    total: servicePrice
                });

                console.log('✅ Auto-populated receipt with appointment data:', {
                    service: serviceType,
                    price: servicePrice,
                    originalJob: selectedAppointment.job
                });
            }

            updateReceiptPreview();

            // Auto-populate phone number from appointment if available
            const phoneInput = document.getElementById('phone-number');
            if (phoneInput && selectedAppointment.phone) {
                // Clean phone number for receipt format (remove non-digits except +)
                const cleanPhone = selectedAppointment.phone.replace(/[^\d+]/g, '');
                phoneInput.value = cleanPhone;
                console.log('✅ Auto-populated phone number:', cleanPhone);
            }

            modal.style.display = 'flex';
        }
        
        // Update service price based on selection
        function updateServicePrice() {
            const serviceId = document.getElementById('service-type').value;
            const priceInput = document.getElementById('service-price');
            const priceSuggestion = document.getElementById('price-suggestion');
            const svc = servicesConfig.find(s => s.id === serviceId);
            if (svc) {
                priceInput.value = svc.basePrice;
                priceSuggestion.textContent = `Precio sugerido: ${svc.priceRange}`;
                priceSuggestion.style.color = 'var(--brand-primary)';
            } else {
                priceInput.value = '';
                priceSuggestion.textContent = 'Ajustar precio según trabajo realizado';
                priceSuggestion.style.color = '#6b7280';
            }
        }
        
        // Add detailed service to receipt
        function addDetailedService() {
            const serviceType = document.getElementById('service-type').value;
            const quantity = parseInt(document.getElementById('service-quantity').value) || 1;
            const price = parseFloat(document.getElementById('service-price').value) || 0;
            
            if (!serviceType || price <= 0) {
                alert('Please complete all service fields');
                return;
            }
            
            receiptServices.push({
                service: serviceType,
                quantity: quantity,
                price: price,
                total: quantity * price
            });
            
            // Clear form
            document.getElementById('service-type').value = '';
            document.getElementById('service-quantity').value = '1';
            document.getElementById('service-price').value = '';
            document.getElementById('price-suggestion').textContent = 'Ajusta el precio según el trabajo realizado';
            document.getElementById('price-suggestion').style.color = '#6b7280';
            
            updateReceiptPreview();
        }
        
        let receiptServices = [];
        
        // Updated receipt preview function
        function updateReceiptPreview() {
            const servicesList = document.getElementById('services-list');
            
            if (receiptServices.length === 0) {
                servicesList.innerHTML = `
                    <div style="color: #6b7280; text-align: center; padding: 20px; font-style: italic;">
                        No services added yet
                    </div>
                `;
                return;
            }
            
            const totalAmount = receiptServices.reduce((sum, service) => sum + service.total, 0);
            
            servicesList.innerHTML = `
                <div style="space-y: 8px;">
                    ${receiptServices.map((service, index) => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: var(--bg-tertiary); border-radius: 4px; margin-bottom: 4px;">
                            <div>
                                <div style="font-weight: 500; color: #1f2937;">${service.service}</div>
                                <div style="color: #6b7280; font-size: 12px;">${service.quantity} × $${service.price.toFixed(2)}</div>
                            </div>
                            <div style="display: flex; align-items: center; gap: 12px;">
                                <span style="font-weight: 600; color: #059669;">$${service.total.toFixed(2)}</span>
                                <button onclick="removeDetailedService(${index})" style="background: #dc2626; color: white; border: none; border-radius: 4px; padding: 4px 8px; cursor: pointer; font-size: 11px;">✕</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="border-top: 1px solid #e5e5e5; margin-top: 12px; padding-top: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 16px;">
                        <span>Total:</span>
                        <span style="color: #059669;">$${totalAmount.toFixed(2)}</span>
                    </div>
                </div>
            `;
        }
        
        // Remove service function
        function removeDetailedService(index) {
            receiptServices.splice(index, 1);
            updateReceiptPreview();
        }
        
        // Close modal function
        function closeReceiptModal() {
            document.getElementById('receipt-modal').style.display = 'none';
            document.getElementById('phone-number').value = '';
            receiptServices = [];
            updateReceiptPreview();
        }
        
        // Generate Receipt Preview (New simplified workflow)
        async function generateReceiptOnly() {
            console.log('Generate Receipt Preview clicked');
            console.log('receiptServices:', receiptServices);
            console.log('selectedAppointment:', selectedAppointment);

            if (receiptServices.length === 0) {
                alert('Por favor agrega al menos un servicio');
                return;
            }

            if (!selectedAppointment) {
                alert('Por favor selecciona una cita primero');
                return;
            }

            // 1. Save phone number if provided
            const phoneInput = document.getElementById('phone-number');
            const inputPhoneNumber = phoneInput ? phoneInput.value.trim() : '';

            if (inputPhoneNumber && selectedAppointment.id) {
                try {
                    console.log('💾 Saving phone number to customer record...');
                    await updateCustomerPhone(selectedAppointment.id, inputPhoneNumber);
                    selectedAppointment.phone = inputPhoneNumber;
                    updateClientDisplayWithPhone(inputPhoneNumber);
                    console.log('✅ Phone number saved successfully:', inputPhoneNumber);
                } catch (error) {
                    console.error('❌ Error saving phone number:', error);
                }
            }

            // Generate receipt HTML and show preview
            showReceiptPreview();
        }

        // Show receipt preview modal with HTML content
        function showReceiptPreview() {
            const receiptNumber = generateRealisticInvoiceNumber();
            const currentDate = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
            const totalAmount = receiptServices.reduce((sum, service) => sum + service.total, 0);

            // Generate professional HTML receipt
            const receiptHTML = generateReceiptHTML(receiptNumber, currentDate, totalAmount);

            // Show in preview modal
            document.getElementById('receipt-preview-content').innerHTML = receiptHTML;

            // Store receipt data for later use (SMS/PDF)
            window.currentReceiptData = {
                receiptNumber,
                currentDate,
                totalAmount,
                services: [...receiptServices],
                appointment: {...selectedAppointment}
            };

            // Close the receipt generation modal and show preview
            closeReceiptModal();
            document.getElementById('receipt-preview-modal').style.display = 'flex';
        }

        // Get professional service description based on service type
        function getServiceDescription(serviceType) {
            const descriptions = {
                // Standard cleaning services
                'House Cleaning': 'Comprehensive residential cleaning service including dusting, vacuuming, and sanitizing',
                'Apartment Cleaning': 'Complete apartment maintenance cleaning with specialized equipment',
                'Deep Cleaning': 'Intensive deep-clean service with thorough attention to detail',
                'Move-in/Move-out Cleaning': 'Professional transition cleaning with detailed checklist',

                // Commercial services
                'Office Cleaning': 'Commercial office cleaning with certified technicians',
                'Commercial Cleaning': 'Professional cleaning services for commercial spaces',

                // Specialized services
                'Window Cleaning': 'Professional window cleaning with streak-free results',
                'Carpet Cleaning': 'Hot water extraction carpet restoration service',
                'Post-Construction Cleaning': 'Construction site cleanup and debris removal',

                // Default professional descriptions (rotating options)
                'default': [
                    'Professional cleaning service with quality assurance and satisfaction guarantee',
                    'Premium cleaning service featuring specialized equipment and industry-standard procedures',
                    'Professional-grade cleaning with surface protection application',
                    'Advanced cleaning methodology with time-efficient processes',
                    'Specialized cleaning service with trained technicians',
                    `Cleaning Services by ${getBC().name}`,
                    'Quality cleaning services with attention to detail',
                    'Professional cleaning solutions for your home or business'
                ]
            };

            // Check if we have a specific description for this service type
            if (descriptions[serviceType]) {
                return descriptions[serviceType];
            }

            // For unknown service types, rotate through default professional descriptions
            const defaultDescriptions = descriptions.default;
            const hash = serviceType.split('').reduce((a, b) => {
                a = ((a << 5) - a) + b.charCodeAt(0);
                return a & a;
            }, 0);
            const index = Math.abs(hash) % defaultDescriptions.length;
            return defaultDescriptions[index];
        }

        // Translate Spanish service names to English for the receipt
        const SERVICE_NAME_EN = {
            'alfombras':  'Carpet Cleaning',
            'sillones':   'Sofa / Upholstery',
            'escaleras':  'Stairs Cleaning',
            'cuartos':    'Room Cleaning',
            'sala':       'Living Room',
            'pasillo':    'Hallway',
            'sillas':     'Chair Cleaning',
            'colchon':    'Mattress Cleaning',
            'colchón':    'Mattress Cleaning',
            'auto':       'Auto Detailing',
        };
        function toEnglishService(name) {
            return SERVICE_NAME_EN[name.toLowerCase()] || name;
        }

        // Generate professional HTML receipt content
        function generateReceiptHTML(receiptNumber, currentDate, totalAmount) {
            // Generate QR code for LivinGreen website
            const qrData = getBC().websiteFull;
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qrData)}`;
            const bizLogo = getBC().logo || './images/livingreen-logo.png';

            return `
                <style>
                  .inv-total { font-size:48px !important; font-weight:800 !important; color:#10b981 !important; line-height:1 !important; letter-spacing:-1px !important; }
                  .inv-paid-wrap { display:flex !important; justify-content:center !important; }
                  .inv-paid { background:#10b981 !important; color:#fff !important; padding:10px 24px !important; border-radius:8px !important; display:inline-flex !important; align-items:center !important; gap:8px !important; font-size:15px !important; font-weight:700 !important; }
                  .inv-paid span { color:#fff !important; }
                  .inv-header { background:#ffffff !important; }
                  .inv-wrap { background:#ffffff !important; color:#111827 !important; }
                  .inv-title { color:#111827 !important; }
                  .inv-client { color:#374151 !important; }
                  .inv-addr { color:#9ca3af !important; }
                </style>
                <div class="mobile-invoice-container inv-wrap" style="max-width:400px !important; width:100% !important; box-sizing:border-box !important; margin:0 auto !important; border-radius:12px !important; overflow:hidden !important; box-shadow:0 2px 20px rgba(0,0,0,0.1) !important; position:relative !important;">

                    <!-- Mobile Invoice Header -->
                    <div class="inv-header" style="padding:20px 20px 24px 20px; border-bottom:1px solid #e9ecef; position:relative;">
                        <div style="position:absolute; top:20px; right:20px; text-align:right; font-size:13px; color:#9ca3af; font-weight:500;">${receiptNumber}</div>

                        <div style="text-align:center; margin-bottom:12px;">
                            <h1 class="inv-title" style="margin:0; font-size:22px; font-weight:700;">Invoice</h1>
                        </div>

                        <div style="text-align:center; margin-bottom:20px;">
                            <div class="inv-client" style="font-size:17px; font-weight:500;">${selectedAppointment.name}</div>
                            ${selectedAppointment.address ? `<div class="inv-addr" style="font-size:13px; margin-top:3px;">📍 ${selectedAppointment.address}${selectedAppointment.city ? ', ' + selectedAppointment.city : ''}</div>` : (selectedAppointment.city ? `<div class="inv-addr" style="font-size:13px; margin-top:3px;">📍 ${selectedAppointment.city}</div>` : '')}
                        </div>

                        <!-- Total Amount -->
                        <div style="text-align:center; margin-bottom:14px;">
                            <div style="font-size:38px !important; font-weight:700 !important; color:#10b981 !important; line-height:1 !important; letter-spacing:-0.5px !important; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif !important;">$${totalAmount.toFixed(0)}</div>
                        </div>

                        <!-- Paid Badge -->
                        <div style="text-align:center; margin-bottom:4px;">
                            <div style="display:inline-block !important; background:#10b981 !important; color:#ffffff !important; padding:7px 18px !important; border-radius:8px !important; font-size:13px !important; font-weight:600 !important; font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display','Helvetica Neue',sans-serif !important;">&#10003; Paid</div>
                        </div>
                    </div>

                    <!-- Invoice Details Section -->
                    <div style="padding: 20px;">
                        <!-- Items Count -->
                        <div style="margin-bottom: 16px; color: #6c757d; font-size: 14px;">
                            ${receiptServices.length} ${receiptServices.length === 1 ? 'item' : 'items'}
                        </div>

                        <!-- Services List -->
                        <div style="margin-bottom: 24px;">
                            ${receiptServices.map((service, index) => `
                                <div style="border-bottom: ${index === receiptServices.length - 1 ? 'none' : '1px solid #e9ecef'}; padding: 16px 0;">
                                    <!-- Service Name and Price -->
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                        <div style="font-size: 16px; font-weight: 500; color: #212529;">
                                            ${toEnglishService(service.service)}
                                        </div>
                                        <div style="font-size: 16px; font-weight: 600; color: #212529;">
                                            $${service.total.toFixed(2)}
                                        </div>
                                    </div>

                                    <!-- Quantity and Unit Price -->
                                    <div style="font-size: 14px; color: #6c757d;">
                                        ${service.quantity} × $${service.price.toFixed(2)} each
                                    </div>
                                </div>
                            `).join('')}
                        </div>

                        <!-- Summary Section -->
                        <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                            <!-- Subtotal -->
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-size: 14px; color: #6c757d;">Subtotal</span>
                                <span style="font-size: 14px; color: #212529;">$${totalAmount.toFixed(2)}</span>
                            </div>

                            <!-- Tax -->
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span style="font-size: 14px; color: #6c757d;">Tax</span>
                                <span style="font-size: 14px; color: #212529;">$0.00</span>
                            </div>

                            <!-- Total -->
                            <div style="display: flex; justify-content: space-between; padding-top: 8px; border-top: 1px solid #dee2e6;">
                                <span style="font-size: 16px; font-weight: 600; color: #212529;">Total</span>
                                <span style="font-size: 16px; font-weight: 600; color: #212529;">$${totalAmount.toFixed(2)}</span>
                            </div>

                            <!-- Paid Amount in Green -->
                            <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                                <span style="font-size: 14px; color: #10b981; font-weight: 500;">Paid</span>
                                <span style="font-size: 14px; color: #10b981; font-weight: 600;">$${totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        <!-- QR Code + Logo Section -->
                        <div style="text-align: center; padding: 12px 0 6px 0; border-top: 1px solid #e9ecef;">
                            <img src="${qrCodeUrl}" alt="QR Code" style="width: 70px; height: 70px; border: 1px solid #dee2e6; border-radius: 4px;">
                            <div style="font-size: 11px; color: #6c757d; margin-top: 4px;">Visit our website</div>
                        </div>

                        <!-- Business Logo -->
                        <div style="text-align: center; margin: 6px 0 6px 0;">
                            <img src="${bizLogo}" alt="${getBC().name} Logo" class="biz-logo-dynamic" style="width: 300px; height: auto; display: block; margin: 0 auto; object-fit: contain; max-height: 150px; object-position: center;">
                        </div>

                        <!-- Business Info -->
                        <div style="background: var(--bg-tertiary); padding: 16px; border-radius: 8px;">
                            <div style="font-size: 16px; font-weight: 600; color: #212529; margin-bottom: 8px; text-align: center;">${getBC().name}</div>
                            <div style="font-size: 12px; color: #6c757d; text-align: center; line-height: 1.4;">
                                <div>Web: ${getBC().website}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Close receipt preview and return to edit mode
        function closeReceiptPreview() {
            document.getElementById('receipt-preview-modal').style.display = 'none';
            document.getElementById('receipt-modal').style.display = 'flex';
        }

        // Download PDF from preview - PRESERVES EXACT MOBILE DESIGN
        async function downloadReceiptPDF() {
            if (!window.currentReceiptData) {
                alert('No receipt data available');
                return;
            }

            try {
                // Use simple browser print function - most reliable method
                await generateSimplePDF();
                console.log('PDF generation initiated successfully');
            } catch (error) {
                console.error('Error generating PDF:', error);
                alert('Error generando PDF: ' + error.message);
                // Fallback: use simple canvas method to avoid all jsPDF errors
                try {
                    await generateSimplePDF();
                } catch (fallbackError) {
                    console.error('Fallback PDF generation also failed:', fallbackError);
                    alert('No se pudo generar el PDF. Por favor intente nuevamente.');
                }
            }
        }

        // Simple PDF generation using browser print
        async function generateSimplePDF() {
            const { receiptNumber } = window.currentReceiptData;
            const clientName = selectedAppointment.name;

            // Create a new window for printing
            const printWindow = window.open('', '_blank');

            // Get the receipt content
            const receiptContent = document.getElementById('receipt-preview-content');

            if (!receiptContent) {
                alert('No se pudo encontrar el contenido del recibo');
                return;
            }

            // Create the print document
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Invoice_${receiptNumber}_${clientName.replace(/\s+/g, '_')}</title>
                    <style>
                        @page {
                            size: A4;
                            margin: 20mm;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            background: white;
                            font-family: 'Segoe UI', system-ui, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: flex-start;
                            min-height: 100vh;
                        }
                        .receipt-container {
                            width: 400px;
                            max-width: 400px;
                            margin: 0 auto;
                            padding: 0;
                            background: white;
                            border: none;
                            box-sizing: border-box;
                        }
                        * {
                            box-shadow: none !important;
                            border-radius: inherit !important;
                        }
                        /* Ensure receipt content has no extra borders */
                        .receipt-container > * {
                            border: none !important;
                            box-shadow: none !important;
                        }
                    </style>
                </head>
                <body>
                    <div class="receipt-container">
                        ${receiptContent.innerHTML}
                    </div>
                </body>
                </html>
            `);

            printWindow.document.close();

            // Wait for content to load then print
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 1000);
        }

        // NEW: Generate PDF from HTML that preserves EXACT mobile design
        async function generateMobilePDFFromHTML() {
            if (typeof html2pdf === 'undefined') {
                throw new Error('html2pdf library not loaded');
            }

            // Get the receipt content element
            const receiptContent = document.getElementById('receipt-preview-content');
            if (!receiptContent) {
                throw new Error('Receipt content not found');
            }

            // Clone the element to avoid modifying the original
            const clonedContent = receiptContent.cloneNode(true);

            // Create a temporary container with mobile-optimized styling
            const tempContainer = document.createElement('div');
            tempContainer.style.cssText = `
                position: fixed;
                top: -9999px;
                left: -9999px;
                width: 400px;
                background: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                z-index: -1;
            `;

            // Ensure the cloned content maintains mobile design
            clonedContent.style.cssText = `
                max-width: 400px !important;
                width: 400px !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                border-radius: 12px !important;
                overflow: hidden !important;
                box-shadow: none !important;
            `;

            tempContainer.appendChild(clonedContent);
            document.body.appendChild(tempContainer);

            // Configure html2pdf options for mobile invoice - PRESERVES EXACT DESIGN
            const opt = {
                margin: [5, 5, 5, 5], // Minimal margins to preserve mobile design
                filename: `Invoice_${window.currentReceiptData.receiptNumber}_${window.currentReceiptData.appointment.name.replace(/\s+/g, '_')}.pdf`,
                image: {
                    type: 'jpeg',
                    quality: 1.0 // Maximum quality
                },
                html2canvas: {
                    scale: 3, // Higher scale for crisp mobile design
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    width: 400, // Exact mobile width
                    height: 800, // Fixed height to prevent NaN errors
                    scrollX: 0,
                    scrollY: 0,
                    letterRendering: true,
                    logging: false,
                    foreignObjectRendering: true
                },
                jsPDF: {
                    unit: 'mm',
                    format: [110, 'auto'], // Optimal mobile format width
                    orientation: 'portrait',
                    compress: false, // Don't compress to preserve quality
                    precision: 16
                }
            };

            try {
                // Generate PDF from HTML
                await html2pdf().set(opt).from(clonedContent).save();

                // Clean up
                document.body.removeChild(tempContainer);

                console.log('Mobile PDF generated successfully from HTML');
            } catch (error) {
                // Clean up on error
                if (document.body.contains(tempContainer)) {
                    document.body.removeChild(tempContainer);
                }
                throw error;
            }
        }

        // Generate Mobile-style PDF that matches the HTML preview design (FALLBACK)
        async function generateMobilePDF() {
            if (typeof window.jspdf === 'undefined') {
                alert('PDF generator not loaded. Please refresh the page.');
                return;
            }

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');

            // Get current receipt data
            const { receiptNumber, currentDate, totalAmount, services } = window.currentReceiptData;
            const clientName = selectedAppointment.name; // Client name without "Client" prefix
            const clientPhone = selectedAppointment.phone || 'N/A';

            // Mobile invoice colors
            const backgroundColor = [248, 249, 250];
            const primaryText = [33, 37, 41];
            const secondaryText = [108, 117, 125];
            const successGreen = [40, 167, 69];
            const borderColor = [233, 236, 239];

            // Page setup - mobile-friendly layout
            const pageWidth = 210;
            const pageHeight = 297;
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);

            // Background
            pdf.setFillColor(...backgroundColor);
            pdf.rect(0, 0, pageWidth, pageHeight, 'F');

            // Mobile Invoice Header Section
            pdf.setFillColor(248, 249, 250);
            pdf.rect(margin, margin, contentWidth, 80, 'F');

            // Invoice Number (top right)
            pdf.setTextColor(...secondaryText);
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'normal');
            pdf.text(receiptNumber, pageWidth - margin, margin + 10, { align: 'right' });

            // Title - "Invoice"
            pdf.setTextColor(...primaryText);
            pdf.setFontSize(24);
            pdf.setFont(undefined, 'bold');
            pdf.text('Invoice', pageWidth / 2, margin + 25, { align: 'center' });

            // Client Name
            pdf.setTextColor(...primaryText);
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'normal');
            pdf.text(clientName, pageWidth / 2, margin + 40, { align: 'center' });

            // Total Amount (large, prominent)
            pdf.setTextColor(...successGreen);
            pdf.setFontSize(36);
            pdf.setFont(undefined, 'bold');
            pdf.text(`$${totalAmount.toFixed(0)}`, pageWidth / 2, margin + 60, { align: 'center' });

            // Paid Status with checkmark
            pdf.setFillColor(...successGreen);
            pdf.roundedRect(pageWidth / 2 - 20, margin + 70, 40, 12, 6, 6, 'F');
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
            pdf.text('✓ Paid', pageWidth / 2, margin + 78, { align: 'center' });

            // Invoice Details Section
            let yPos = margin + 110;

            // Items count
            pdf.setTextColor(...secondaryText);
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            const itemCount = services.length;
            pdf.text(`${itemCount} ${itemCount === 1 ? 'item' : 'items'}`, margin, yPos);
            yPos += 15;

            // Services List
            services.forEach((service, index) => {
                if (yPos > pageHeight - 50) {
                    pdf.addPage();
                    yPos = margin + 20;
                }

                // Service name
                pdf.setTextColor(...primaryText);
                pdf.setFontSize(12);
                pdf.setFont(undefined, 'bold');
                pdf.text(service.service, margin, yPos);
                yPos += 8;

                // Service description using the same function as HTML
                pdf.setTextColor(...secondaryText);
                pdf.setFontSize(9);
                pdf.setFont(undefined, 'normal');
                const description = getServiceDescription(service.service);
                const wrappedDescription = pdf.splitTextToSize(description, contentWidth - 20);
                pdf.text(wrappedDescription, margin, yPos);
                yPos += 5 * wrappedDescription.length;

                // Quantity and pricing
                pdf.setTextColor(...secondaryText);
                pdf.setFontSize(10);
                pdf.text(`${service.quantity} × $${service.price.toFixed(2)} each`, margin, yPos);

                pdf.setTextColor(...primaryText);
                pdf.setFontSize(12);
                pdf.setFont(undefined, 'bold');
                pdf.text(`$${service.total.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
                yPos += 15;

                // Border line (except for last item)
                if (index < services.length - 1) {
                    pdf.setDrawColor(...borderColor);
                    pdf.line(margin, yPos - 7, pageWidth - margin, yPos - 7);
                }
            });

            // Summary Section
            yPos += 10;
            pdf.setFillColor(...backgroundColor);
            pdf.rect(margin, yPos, contentWidth, 40, 'F');

            yPos += 12;

            // Subtotal
            pdf.setTextColor(...secondaryText);
            pdf.setFontSize(10);
            pdf.text('Subtotal', margin + 10, yPos);
            pdf.setTextColor(...primaryText);
            pdf.text(`$${totalAmount.toFixed(2)}`, pageWidth - margin - 10, yPos, { align: 'right' });
            yPos += 8;

            // Tax
            pdf.setTextColor(...secondaryText);
            pdf.text('Tax', margin + 10, yPos);
            pdf.setTextColor(...primaryText);
            pdf.text('$0.00', pageWidth - margin - 10, yPos, { align: 'right' });
            yPos += 8;

            // Total line
            pdf.setDrawColor(...borderColor);
            pdf.line(margin + 10, yPos, pageWidth - margin - 10, yPos);
            yPos += 8;

            // Total
            pdf.setTextColor(...primaryText);
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'bold');
            pdf.text('Total', margin + 10, yPos);
            pdf.text(`$${totalAmount.toFixed(2)}`, pageWidth - margin - 10, yPos, { align: 'right' });
            yPos += 8;

            // Paid amount in green
            pdf.setTextColor(...successGreen);
            pdf.setFont(undefined, 'bold');
            pdf.text('Paid', margin + 10, yPos);
            pdf.text(`$${totalAmount.toFixed(2)}`, pageWidth - margin - 10, yPos, { align: 'right' });

            // QR Code Section
            yPos += 25;

            // QR Code data and placeholder
            const qrData = getBC().websiteFull;
            pdf.setTextColor(...secondaryText);
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            pdf.text('Visit our website', pageWidth / 2, yPos, { align: 'center' });

            // Simple QR code placeholder box
            pdf.setDrawColor(...borderColor);
            const qrSize = 25;
            const qrX = (pageWidth - qrSize) / 2;
            pdf.rect(qrX, yPos + 5, qrSize, qrSize, 'D');

            // QR data text
            pdf.setFontSize(8);
            pdf.text(qrData, pageWidth / 2, yPos + 35, { align: 'center' });

            // Business Info
            yPos += 50;
            pdf.setFillColor(...backgroundColor);
            pdf.rect(margin, yPos, contentWidth, 20, 'F');

            yPos += 12;
            pdf.setTextColor(...primaryText);
            pdf.setFontSize(12);
            pdf.setFont(undefined, 'bold');
            pdf.text(getBC().name, pageWidth / 2, yPos, { align: 'center' });

            yPos += 8;
            pdf.setTextColor(...secondaryText);
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'normal');
            pdf.text('Web: ' + getBC().website, pageWidth / 2, yPos, { align: 'center' });

            // Download the PDF
            const fileName = `Invoice_${receiptNumber}_${clientName.replace(/\s+/g, '_')}.pdf`;
            pdf.save(fileName);
        }

        // Native Web Share API - Simple and universal
        async function shareReceipt() {
            if (!window.currentReceiptData) {
                alert('No receipt data available');
                return;
            }

            const { receiptNumber, totalAmount, appointment } = window.currentReceiptData;
            const firstName = appointment.name.split(' ')[0];

            // Create share content
            const shareTitle = `Factura ${receiptNumber} - ${getBC().name}`;
            const shareText = `Hola ${firstName}, su factura por $${totalAmount.toFixed(2)} está lista - ${getBC().name}`;
            const shareUrl = window.location.href; // Current page URL

            // Check if Web Share API is supported
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: shareTitle,
                        text: shareText,
                        url: shareUrl
                    });
                    console.log('✅ Receipt shared successfully');
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('❌ Error sharing:', error);
                        // Fallback to clipboard
                        fallbackToClipboard(shareText, shareUrl);
                    }
                }
            } else {
                // Fallback for browsers without Web Share API
                fallbackToClipboard(shareText, shareUrl);
            }
        }

        // Fallback: Copy to clipboard
        function fallbackToClipboard(text, url) {
            const fullText = `${text}\n${url}`;

            if (navigator.clipboard) {
                navigator.clipboard.writeText(fullText).then(() => {
                    alert('📋 Recibo copiado al portapapeles. Pégalo en WhatsApp, SMS, o donde quieras compartirlo.');
                }).catch(() => {
                    showManualCopy(fullText);
                });
            } else {
                showManualCopy(fullText);
            }
        }

        // Manual copy fallback
        function showManualCopy(text) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                alert('📋 Recibo copiado al portapapeles. Pégalo en WhatsApp, SMS, o donde quieras compartirlo.');
            } catch (err) {
                prompt('📋 Copia este texto y compártelo:', text);
            }
            document.body.removeChild(textarea);
        }

        // OLD SMS function - keeping for reference
        async function shareReceiptViaSMS() {
            if (!window.currentReceiptData) {
                alert('No receipt data available');
                return;
            }

            const { receiptNumber, totalAmount, appointment } = window.currentReceiptData;

            console.log('Appointment data for SMS:', appointment);
            console.log('Phone number:', appointment.phone);

            try {
                // Store receipt on server and get short URL
                const storedReceipt = await storeReceiptForSharing();

                if (storedReceipt && storedReceipt.shortUrl) {
                    // Create professional SMS message (optimized for SMS length)
                    const firstName = appointment.name.split(' ')[0];
                    const message = `Hola ${firstName}, su factura por $${totalAmount.toFixed(2)} está lista. Ver/Descargar: ${storedReceipt.shortUrl} - ${getBC().name}`;

                    // Open SMS app
                    openSMSApp(appointment.phone, message);
                } else {
                    throw new Error('Failed to create short URL');
                }
            } catch (error) {
                console.error('Error sharing receipt via SMS:', error);
                alert('Error al compartir recibo. Por favor intenta nuevamente.');
            }
        }

        // Store receipt on server and get short URL
        async function storeReceiptForSharing() {
            const { receiptNumber, totalAmount, services, appointment } = window.currentReceiptData;

            // Generate receipt text for storage
            const receiptText = generateReceiptTextForStorage(receiptNumber, totalAmount, services, appointment);

            // Debug: log the receipt text and data
            console.log('📝 Receipt text generated:', receiptText);
            console.log('📝 Receipt text length:', receiptText?.length);
            console.log('📝 Original receiptNumber:', receiptNumber);
            console.log('📝 Cleaned receiptNumber:', receiptNumber.replace(/[^a-zA-Z0-9]/g, ''));
            console.log('📝 Services data:', services);
            console.log('📝 Appointment data:', appointment);

            // Validate required data
            if (!receiptText || receiptText.length < 10) {
                console.error('❌ Invalid receipt data generated:', receiptText);
                throw new Error('Could not generate valid receipt data');
            }

            try {
                // Check if API is available (not running from file system)
                if (!API_BASE_URL) {
                    console.log('Running from file system, using fallback URL');
                    return createFallbackShortUrl();
                }

                // Prepare data for server
                const requestData = {
                    receiptData: receiptText,
                    receiptNumber: receiptNumber.replace(/[^a-zA-Z0-9]/g, ''),
                    clientName: appointment.name || 'Cliente',
                    appointmentData: {
                        appointmentDate: appointment.date || new Date().toISOString().split('T')[0],
                        serviceType: services.map(s => s.service).join(', '),
                        appointmentId: appointment.id ? `APPT_${appointment.id}_${Date.now().toString(16).toUpperCase()}` : undefined,
                        clientPhone: appointment.phone || '0000000000',
                        totalAmount: totalAmount
                    }
                };

                // Debug: log what we're sending
                console.log('🚀 Sending to server:', JSON.stringify(requestData, null, 2));

                // Store receipt on server
                const response = await fetch(`${API_BASE_URL}/receipt`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(requestData),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ Server error ${response.status}:`, errorText);
                    throw new Error(`Server error: ${response.status} - ${errorText}`);
                }

                const result = await response.json();
                console.log('✅ Receipt stored successfully:', result);
                return result;

            } catch (error) {
                console.error('❌ Error storing receipt:', error);
                console.log('🔄 Using fallback storage method...');
                // Fallback to local storage with direct netlify URL
                return createFallbackShortUrl();
            }
        }

        // Generate receipt text for server storage
        function generateReceiptTextForStorage(receiptNumber, totalAmount, services, appointment) {
            let receiptText = `${getBC().emoji} ${getBC().name}\n`;
            receiptText += `=====================================\n\n`;
            receiptText += `FACTURA #${receiptNumber}\n`;
            receiptText += `Fecha: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
            receiptText += `Total: $${totalAmount.toFixed(2)}\n\n`;

            receiptText += `FACTURAR A:\n`;
            receiptText += `${appointment.name}\n`;
            if (appointment.address) {
                receiptText += `${appointment.address}\n`;
            }
            if (appointment.city) {
                receiptText += `${appointment.city}\n`;
            }
            receiptText += `\n`;

            receiptText += `SERVICIOS:\n`;
            receiptText += `-------------------------------------\n`;

            services.forEach(service => {
                receiptText += `${service.service}\n`;
                receiptText += `Cantidad: ${service.quantity} x $${service.price.toFixed(2)} = $${service.total.toFixed(2)}\n\n`;
            });

            receiptText += `-------------------------------------\n`;
            receiptText += `TOTAL: $${totalAmount.toFixed(2)}\n\n`;
            receiptText += `Gracias por elegir ${getBC().name}!\n`;
            receiptText += `¡Su satisfacción es nuestra prioridad!`;

            return receiptText;
        }

        // Fallback short URL creation for local testing
        function createFallbackShortUrl() {
            const shortId = Math.random().toString(36).substr(2, 6).toUpperCase();
            const { receiptNumber, totalAmount, services, appointment } = window.currentReceiptData;

            // Store locally for fallback
            const receiptData = {
                id: shortId,
                receiptNumber,
                clientName: appointment.name,
                clientPhone: appointment.phone,
                services,
                totalAmount,
                date: new Date().toISOString(),
                address: appointment.address || '',
                city: appointment.city || '',
                appointmentDate: appointment.date || new Date().toISOString().split('T')[0],
                appointmentTime: appointment.time || ''
            };

            localStorage.setItem(`receipt_${shortId}`, JSON.stringify(receiptData));

            const shortUrl = `https://incandescent-sprinkles-d1c3df.netlify.app/r/${shortId}`;

            return {
                success: true,
                shortUrl: shortUrl,
                receiptId: shortId
            };
        }

        // Open SMS app with message
        function openSMSApp(phoneNumber, message) {
            // Clean phone number
            const cleanPhone = phoneNumber ? phoneNumber.replace(/[^\d+]/g, '') : '';

            if (!cleanPhone) {
                // If no phone number, just copy message to clipboard
                copyToClipboard(message);
                alert('Mensaje copiado al portapapeles. Puede enviarlo manualmente:\n\n' + message);
                return;
            }

            // Create SMS URL
            let smsUrl;
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                smsUrl = `sms:${cleanPhone}&body=${encodeURIComponent(message)}`;
            } else {
                smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
            }

            console.log('Opening SMS with URL:', smsUrl);
            console.log('Message:', message);

            try {
                // Try to open SMS app
                window.open(smsUrl, '_blank');

                // Show success message
                alert('SMS abierto! Revisa tu app de mensajes.');

                // Close the receipt preview modal
                closeReceiptPreview();

            } catch (error) {
                console.error('SMS open error:', error);
                // Fallback: copy to clipboard
                copyToClipboard(message);
                alert(`No se pudo abrir SMS automáticamente. Mensaje copiado al portapapeles:\n\n${message}\n\nEnvíelo a: ${cleanPhone}`);
            }
        }

        // Helper function to copy text to clipboard
        function copyToClipboard(text) {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).catch(err => {
                    console.error('Failed to copy to clipboard:', err);
                });
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
        }
        
        // Generate and send via WhatsApp
        async function generateAndSendWhatsApp() {
            const phoneNumber = document.getElementById('phone-number').value.trim();
            if (!phoneNumber) {
                alert('Please enter a phone number');
                return;
            }
            if (receiptServices.length === 0) {
                alert('Please add at least one service');
                return;
            }
            await generatePDF('whatsapp', phoneNumber);
        }
        
        // Send SMS directly with Netlify URL (no server needed)
        async function generateAndSendSMS() {
            console.log('SMS button clicked');
            
            const phoneNumber = document.getElementById('phone-number').value.trim();
            if (!phoneNumber) {
                alert('Please enter a phone number');
                return;
            }
            
            // Clean phone number - remove all non-digits except +
            const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
            console.log('Clean phone number:', cleanPhone);
            
            if (receiptServices.length === 0) {
                alert('Please add at least one service');
                return;
            }
            
            // Get appointment data
            if (!selectedAppointment) {
                alert('Please select an appointment first');
                return;
            }
            
            // Calculate total
            const totalAmount = receiptServices.reduce((sum, service) => sum + service.total, 0);
            const receiptNumber = generateRealisticInvoiceNumber();
            
            // Create receipt data identical to PDF generation
            const receiptData = {
                receiptNumber: receiptNumber,
                clientName: selectedAppointment.name,
                clientPhone: cleanPhone,
                services: receiptServices,
                totalAmount: totalAmount,
                date: new Date().toISOString(),
                address: selectedAppointment.address || '',
                city: selectedAppointment.city || '',
                appointmentDate: selectedAppointment.date || new Date().toISOString().split('T')[0],
                appointmentTime: selectedAppointment.time || ''
            };
            
            // Generate a unique receipt ID (UUID-like)
            const receiptId = 'R' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
            
            // Store receipt data with the unique ID (expert solution: use IndexedDB for cross-device persistence)
            const receiptForStorage = {
                id: receiptId,
                ...receiptData,
                autoGenerate: true, // Flag to auto-generate PDF when opened
                createdAt: Date.now()
            };
            
            // Store in localStorage as backup, but also try to store server-side
            localStorage.setItem(`receipt_${receiptId}`, JSON.stringify(receiptForStorage));
            
            // Server storage disabled for local testing (avoiding CORS errors)
            console.log('Using localStorage storage for local testing');
            
            // ULTRA-SHORT SOLUTION: 6-character ID with server storage
            const shortId = Math.random().toString(36).substr(2, 6).toUpperCase();
            
            // Store receipt data with ultra-short ID
            const receiptStorageData = {
                id: shortId,
                receiptNumber: receiptNumber,
                clientName: selectedAppointment.name,
                clientPhone: cleanPhone,
                services: receiptServices,
                totalAmount: totalAmount,
                date: new Date().toISOString(),
                address: selectedAppointment.address || '',
                city: selectedAppointment.city || '',
                appointmentDate: selectedAppointment.date || new Date().toISOString().split('T')[0],
                appointmentTime: selectedAppointment.time || ''
            };
            
            // Store both locally AND on server for maximum reliability
            localStorage.setItem(`receipt_${shortId}`, JSON.stringify(receiptStorageData));
            
            // Server storage disabled for local testing (avoiding CORS errors)
            console.log('Receipt stored locally with ID:', shortId);
            
            // Create SHORT URL: funciona inmediatamente sin configurar bit.ly
            const shortUrl = `https://incandescent-sprinkles-d1c3df.netlify.app/r/${shortId}`;
            console.log('ULTRA-SHORT URL created:', shortUrl, '(', shortUrl.length, 'characters)');
            
            console.log('=== SMS URL DEBUG ===');
            console.log('Receipt ID:', receiptId);
            console.log('Short URL:', shortUrl);
            console.log('URL Length:', shortUrl.length, 'characters');
            console.log('Receipt data stored with key:', `receipt_${receiptId}`);
            console.log('Receipt data:', receiptForStorage);
            console.log('==================');
            
            // Create complete professional SMS message (optimized for SMS length)
            const firstName = selectedAppointment.name.split(' ')[0]; // Solo primer nombre
            const message = `Hola ${firstName}, su factura por $${totalAmount.toFixed(2)} está lista. Ver/Descargar: ${shortUrl} - ${getBC().name}`;

            // Try different SMS formats for better compatibility
            let smsUrl;
            
            // Format 1: Standard SMS format
            if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
                // iOS format
                smsUrl = `sms:${cleanPhone}&body=${encodeURIComponent(message)}`;
            } else {
                // Android format
                smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
            }
            
            console.log('SMS URL:', smsUrl);
            console.log('Message:', message);
            console.log('Message length:', message.length);
            
            // Enhanced SMS opening with better compatibility
            try {
                console.log('Attempting to open SMS with URL:', smsUrl);
                console.log('Message length:', message.length, 'characters');

                // Method 1: Use the unified openSMSApp function for better compatibility
                openSMSApp(cleanPhone, message);

                // Show success message after a brief delay
                setTimeout(() => {
                    alert('SMS preparado! Revise su aplicación de mensajes y envíe cuando esté listo.');
                }, 500);
                
            } catch (error) {
                console.error('SMS open error:', error);
                // Fallback: Show the message to copy manually
                alert(`SMS no se pudo abrir automáticamente. Copie este mensaje:\n\n${message}\n\nY envíelo a: ${cleanPhone}`);
            }
        }
        
        // Function to shorten URL using Bitly
        async function shortenUrlWithBitly(longUrl) {
            try {
                // Using a free URL shortening service (tinyurl.com API)
                const response = await fetch('https://tinyurl.com/api-create.php?url=' + encodeURIComponent(longUrl));
                const shortUrl = await response.text();
                
                if (shortUrl && shortUrl.startsWith('https://tinyurl.com/')) {
                    console.log('URL shortened successfully:', shortUrl);
                    return shortUrl;
                }
                
                console.log('URL shortening failed, using original URL');
                return longUrl;
                
            } catch (error) {
                console.error('URL shortening error:', error);
                return longUrl; // Fallback to original URL
            }
        }

        // Generate PDF from receipt data using HTML-to-PDF (PRESERVES DESIGN)
        async function generatePDFFromDataHTML(data) {
            try {
                // First, create the receipt display
                displayReceiptPage(data);

                // Wait for the page to render
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Find the receipt container in the displayed page
                const receiptContainer = document.querySelector('.receipt-container') ||
                                       document.querySelector('[style*="max-width: 400px"]') ||
                                       document.body.children[0];

                if (!receiptContainer) {
                    throw new Error('Receipt container not found in the page');
                }

                // Ensure mobile design preservation
                const tempContainer = document.createElement('div');
                tempContainer.style.cssText = `
                    position: fixed;
                    top: -9999px;
                    left: -9999px;
                    width: 400px;
                    background: white;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    z-index: -1;
                `;

                const clonedReceipt = receiptContainer.cloneNode(true);
                clonedReceipt.style.cssText = `
                    max-width: 400px !important;
                    width: 400px !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    background: white !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                `;

                tempContainer.appendChild(clonedReceipt);
                document.body.appendChild(tempContainer);

                // Configure html2pdf options - PRESERVES EXACT MOBILE DESIGN
                const opt = {
                    margin: [5, 5, 5, 5], // Minimal margins to preserve mobile design
                    filename: `Invoice_${data.receiptNumber}_${data.clientName.replace(/\s+/g, '_')}.pdf`,
                    image: {
                        type: 'jpeg',
                        quality: 1.0 // Maximum quality
                    },
                    html2canvas: {
                        scale: 3, // Higher scale for crisp mobile design
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: '#ffffff',
                        width: 400, // Exact mobile width
                        height: 800, // Fixed height to prevent NaN errors
                        letterRendering: true,
                        logging: false,
                        foreignObjectRendering: true
                    },
                    jsPDF: {
                        unit: 'mm',
                        format: [110, 'auto'], // Optimal mobile format width
                        orientation: 'portrait',
                        compress: false, // Don't compress to preserve quality
                        precision: 16
                    }
                };

                // Generate PDF
                await html2pdf().set(opt).from(clonedReceipt).save();

                // Clean up
                document.body.removeChild(tempContainer);

                console.log('Mobile PDF generated successfully from receipt data');
            } catch (error) {
                console.error('HTML-to-PDF generation failed:', error);
                // Fallback to original method
                await generatePDFFromData(data);
            }
        }

        // Generate PDF from receipt data (expert solution) - FALLBACK
        async function generatePDFFromData(data) {
            try {
                if (typeof window.jspdf === 'undefined') {
                    alert('PDF generator not loaded. Please refresh the page.');
                    return;
                }
                
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF();
                
                // Use the same PDF generation logic as the main generatePDF function
                // but with the data from the URL
                
                const receiptNumber = data.receiptNumber;
                const totalAmount = data.totalAmount;
                const services = data.services || [];
                const clientName = data.clientName;
                const clientPhone = data.clientPhone;
                
                // Colors exactly matching the template
                const blueColor = [0, 191, 255];
                const darkGray = [68, 68, 68];
                const lightGray = [240, 240, 240];
                
                // Create diagonal effect with polygons (same as original)
                pdf.setFillColor(...darkGray);
                pdf.triangle(0, 0, 115, 0, 0, 80, 'F');
                pdf.triangle(115, 0, 135, 80, 0, 80, 'F');
                
                pdf.setFillColor(...blueColor);
                pdf.triangle(115, 0, 210, 0, 135, 80, 'F');
                pdf.triangle(210, 0, 210, 80, 135, 80, 'F');
                
                pdf.setFillColor(255, 255, 255);
                pdf.triangle(115, 0, 135, 0, 135, 80, 'F');
                pdf.triangle(115, 0, 115, 80, 135, 80, 'F');
                
                // Add content (simplified version of the original)
                pdf.setTextColor(0, 191, 255);
                pdf.setFontSize(14);
                pdf.setFont(undefined, 'bold');
                pdf.text(getBC().emoji + ' ' + getBC().name.toUpperCase(), 10, 25);

                pdf.setTextColor(68, 68, 68);
                pdf.setFontSize(32);
                pdf.text('INVOICE', 145, 35);

                pdf.setFontSize(9);
                pdf.text(`Invoice No   :  ${receiptNumber}`, 145, 48);
                pdf.text(`Issue Date   :  ${new Date(data.date).toLocaleDateString('es-ES')}`, 145, 54);
                
                // Client info
                pdf.setFontSize(12);
                pdf.setFont(undefined, 'bold');
                pdf.text('BILL TO', 15, 95);
                pdf.setFontSize(10);
                pdf.setFont(undefined, 'normal');
                pdf.text(clientName.toUpperCase(), 15, 105);
                pdf.text('📞 ' + clientPhone, 15, 112);
                
                // Services
                let yPos = 140;
                services.forEach((service, index) => {
                    pdf.text(service.service || service.n, 42, yPos + 6);
                    pdf.text(`$${(service.total || service.p).toFixed(2)}`, 175, yPos + 6);
                    yPos += 10;
                });
                
                // Total
                pdf.setFontSize(16);
                pdf.setFont(undefined, 'bold');
                pdf.text(`TOTAL: $${totalAmount.toFixed(2)}`, 15, yPos + 30);
                
                // Download the PDF
                pdf.save(`Recibo_${receiptNumber}_${clientName.replace(/\s+/g, '_')}.pdf`);
                
            } catch (error) {
                console.error('Error generating PDF:', error);
                alert('Error generando PDF: ' + error.message);
            }
        }

        // Generate realistic invoice numbers
        function generateRealisticInvoiceNumber() {
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1; // 0-based, so add 1
            
            // Get or initialize invoice counter for this year and month
            const storageKey = `invoiceCounter_${currentYear}_${currentMonth}`;
            let invoiceCounter = parseInt(localStorage.getItem(storageKey)) || 0;
            
            // Increment counter
            invoiceCounter++;
            localStorage.setItem(storageKey, invoiceCounter.toString());
            
            // Format: LVG-YYMM-XXX (e.g., LVG-2501-001, LVG-2501-002, etc.)
            const yearShort = currentYear.toString().slice(-2); // Last 2 digits of year
            const monthPadded = currentMonth.toString().padStart(2, '0');
            const counterPadded = invoiceCounter.toString().padStart(3, '0');

            return `LVG-${yearShort}${monthPadded}-${counterPadded}`;
        }

        // Save contact to phone and update customer record
        async function saveContactAndScheduleReminder(phoneNumber) {
            if (!phoneNumber || !selectedAppointment) return;
            
            try {
                console.log('📞 Saving contact and scheduling reminder for:', selectedAppointment.name);
                
                // 1. Save contact to phone using Web API (if supported)
                await saveContactToPhone(phoneNumber, selectedAppointment.name);
                
                // 2. Update customer record with phone number
                await updateCustomerPhone(selectedAppointment.id, phoneNumber);
                
                // 3. Schedule 6-month reminder
                await scheduleFollowUpReminder(phoneNumber, selectedAppointment.name);
                
                console.log('✅ Contact saved and reminder scheduled successfully');
                
            } catch (error) {
                console.error('❌ Error saving contact or scheduling reminder:', error);
            }
        }
        
        // Save contact to phone contacts (multiple methods)
        async function saveContactToPhone(phoneNumber, clientName) {
            try {
                console.log('📱 Saving contact for:', clientName);
                
                // Method 1: Direct SMS to yourself with contact info
                const contactSMS = `New ${getBC().name} Client Contact:\n\nName: ${clientName} (${getBC().name} Client)\nPhone: ${phoneNumber}\nService Date: ${new Date().toLocaleDateString()}\n\nSave this contact for 6-month follow-up! 📱`;
                const selfSMSUrl = `sms:?body=${encodeURIComponent(contactSMS)}`;
                
                // Method 2: Create easy-tap phone link
                const phoneLink = `tel:${phoneNumber}`;
                
                // Method 3: Still create vCard as backup
                const vCard = `BEGIN:VCARD
VERSION:3.0
FN:${clientName} (${getBC().name} Client)
TEL:${phoneNumber}
ORG:${getBC().name} Client
NOTE:Service client. Last service: ${new Date().toLocaleDateString()}
END:VCARD`;
                
                // Show options to user
                const userChoice = confirm(`💡 EASY CONTACT SAVING OPTIONS:\n\n✅ Option 1 (RECOMMENDED): Send yourself an SMS with contact info - just save from SMS\n❌ Option 2: Download vCard file (manual)\n\nChoose Option 1 (SMS)?`);
                
                if (userChoice) {
                    // Open SMS app with contact info
                    window.open(selfSMSUrl);
                    
                    setTimeout(() => {
                        alert(`📱 SMS opened with contact info!\n\nSteps:\n1. Send the SMS to yourself\n2. When you receive it, tap the phone number\n3. Choose "Add to Contacts"\n\nMuch easier! 🎉`);
                    }, 1000);
                    
                } else {
                    // Fallback to vCard download
                    const blob = new Blob([vCard], { type: 'text/vcard' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `${clientName.replace(/\s+/g, '_')}_${getBC().name.replace(/\s+/g,'_')}_Contact.vcf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    
                    alert('📱 vCard downloaded! Go to Downloads → tap .vcf file → Add Contact');
                }
                
                console.log('📱 Contact saving method executed for:', clientName);
                
            } catch (error) {
                console.error('❌ Error creating contact:', error);
            }
        }
        
        // Update customer record with phone number
        async function updateCustomerPhone(appointmentId, phoneNumber) {
            try {
                console.log('📞 updateCustomerPhone called with:', appointmentId, phoneNumber);

                // Save phone number using PhoneManager (always works)
                PhoneManager.save(appointmentId, phoneNumber);

                // Also try to update the appointment for Supabase sync
                const appointments = await OfflineDB.getAppointments();
                const appointmentToUpdate = appointments.find(apt => apt.id === appointmentId);

                if (appointmentToUpdate) {
                    appointmentToUpdate.phone = phoneNumber;
                    console.log('📞 Saving appointment with phone for sync:', appointmentToUpdate);
                    await OfflineDB.saveAppointment(appointmentToUpdate);
                }

                // Also update the current selectedAppointment object
                if (selectedAppointment && selectedAppointment.id === appointmentId) {
                    selectedAppointment.phone = phoneNumber;
                }

                console.log('📊 Customer phone updated:', phoneNumber);

                // Always refresh client registry after phone update to ensure data consistency
                console.log('🔄 Refreshing client registry with updated phone...');

                // Verify the save was successful
                console.log('📞 Starting verification - recentOfflineSave flag:', recentOfflineSave);
                const verifyAppointments = await OfflineDB.getAppointments();
                console.log('📞 Verification - all appointments:', verifyAppointments.map(a => ({id: a.id, name: a.name, phone: a.phone})));
                const verifyUpdated = verifyAppointments.find(apt => apt.id === appointmentId);
                console.log('📞 Verification - saved appointment phone:', verifyUpdated?.phone);

                // Small delay to ensure the save operation completes
                setTimeout(async () => {
                    console.log('📞 Refreshing client registry after phone update...');
                    await loadClientRegistry();
                }, 200);

            } catch (error) {
                console.error('❌ Error updating customer phone:', error);
            }
        }
        
        // Removed: reminder scheduling function
        
        // Removed: reminder checking and follow-up functions
        
        // TEST FUNCTIONS - Remove in production
        
        // Test contact saving (call from browser console)
        // [DIAGNOSTICS MODULE — testContactSaving] → extraído a js/modules/diagnostics.js

        // Generate receipt text for backend storage
        function generateReceiptText() {
            const receiptNumber = generateRealisticInvoiceNumber();
            const currentDate = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
            const totalAmount = receiptServices.reduce((sum, service) => sum + service.total, 0);

            let receiptText = `${getBC().emoji} ${getBC().name}\n`;
            receiptText += `=====================================\n\n`;
            receiptText += `FACTURA #${receiptNumber}\n`;
            receiptText += `Fecha: ${currentDate}\n`;
            receiptText += `Total: $${totalAmount.toFixed(2)}\n\n`;

            receiptText += `FACTURAR A:\n`;
            receiptText += `${selectedAppointment.name}\n`;
            if (selectedAppointment.address) {
                receiptText += `${selectedAppointment.address}\n`;
            }
            receiptText += `\n`;

            receiptText += `SERVICIOS:\n`;
            receiptText += `-------------------------------------\n`;

            receiptServices.forEach(service => {
                receiptText += `${service.service}\n`;
                receiptText += `Cantidad: ${service.quantity} x $${service.price.toFixed(2)} = $${service.total.toFixed(2)}\n\n`;
            });

            receiptText += `-------------------------------------\n`;
            receiptText += `TOTAL: $${totalAmount.toFixed(2)}\n\n`;
            receiptText += `Gracias por elegir ${getBC().name}!\n`;
            receiptText += `¡Su satisfacción es nuestra prioridad!`;

            return receiptText;
        }

        // Update client display with new phone number
        function updateClientDisplayWithPhone(phoneNumber) {
            // Update the receipt modal client info display
            const clientPhoneElements = document.querySelectorAll('[style*="color: #6b7280"][style*="font-size: 12px"]');
            clientPhoneElements.forEach(element => {
                if (element.textContent === 'N/A' || element.textContent.includes('N/A')) {
                    element.textContent = phoneNumber;
                }
            });

            // Update any appointment display that shows phone
            const appointmentCards = document.querySelectorAll('.appointment-card, [class*="appointment"]');
            appointmentCards.forEach(card => {
                const phoneSpan = card.querySelector('[data-field="phone"], .phone-display');
                if (phoneSpan) {
                    phoneSpan.textContent = phoneNumber;
                }
            });

            console.log('📱 UI updated with new phone number:', phoneNumber);
        }

        // Main PDF generation function
        async function generatePDF(sendMethod = null, phoneNumber = null) {
            try {
                // 1. Get phone number from input field
                const phoneInput = document.getElementById('phone-number');
                const inputPhoneNumber = phoneInput ? phoneInput.value.trim() : '';

                // 2. Save phone number to customer record if provided
                if (inputPhoneNumber && selectedAppointment && selectedAppointment.id) {
                    try {
                        console.log('💾 Saving phone number to customer record...');
                        await updateCustomerPhone(selectedAppointment.id, inputPhoneNumber);

                        // Update the selectedAppointment object immediately
                        selectedAppointment.phone = inputPhoneNumber;

                        console.log('✅ Phone number saved successfully:', inputPhoneNumber);

                        // 3. Update the UI to show the new phone number
                        updateClientDisplayWithPhone(inputPhoneNumber);

                    } catch (error) {
                        console.error('❌ Error saving phone number:', error);
                        // Continue with PDF generation even if phone save fails
                    }
                }

                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF();

                // Receipt data
                const receiptNumber = generateRealisticInvoiceNumber();
                const currentDate = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
                const totalAmount = receiptServices.reduce((sum, service) => sum + service.total, 0);
                
                // Colors exactly matching the template
                const blueColor = [0, 191, 255]; // Bright blue from template
                const darkGray = [68, 68, 68];   // Dark gray from template  
                const lightGray = [240, 240, 240]; // Light gray for rows
                
                // Create diagonal effect with polygons
                // Dark gray left section
                pdf.setFillColor(...darkGray);
                const leftPoints = [[0, 0], [115, 0], [135, 80], [0, 80]]; // Diagonal cut
                pdf.triangle(0, 0, 115, 0, 0, 80, 'F');
                pdf.triangle(115, 0, 135, 80, 0, 80, 'F');
                
                // Blue right section  
                pdf.setFillColor(...blueColor);
                const rightPoints = [[115, 0], [210, 0], [210, 80], [135, 80]]; // Diagonal cut
                pdf.triangle(115, 0, 210, 0, 135, 80, 'F');
                pdf.triangle(210, 0, 210, 80, 135, 80, 'F');
                
                // White diagonal stripe
                pdf.setFillColor(255, 255, 255);
                pdf.triangle(115, 0, 135, 0, 135, 80, 'F');
                pdf.triangle(115, 0, 115, 80, 135, 80, 'F');
                
                // Brand logo and company info in dark section
                pdf.setTextColor(0, 191, 255); // Blue text for logo
                pdf.setFontSize(14);
                pdf.setFont(undefined, 'bold');
                pdf.text(getBC().emoji + ' ' + getBC().name.toUpperCase(), 10, 25);

                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(9);
                pdf.setFont(undefined, 'normal');
                pdf.text('📞 ' + getBC().phone, 10, 45);
                pdf.text('✉️ ' + getBC().email, 10, 58);
                pdf.text('🌐 ' + getBC().website, 10, 64);

                // INVOICE title in blue section (large, dark text)
                pdf.setTextColor(68, 68, 68); // Dark gray text on blue background
                pdf.setFontSize(32);
                pdf.setFont(undefined, 'bold');
                pdf.text('INVOICE', 145, 35);

                // Invoice details in blue section
                pdf.setTextColor(68, 68, 68);
                pdf.setFontSize(9);
                pdf.setFont(undefined, 'normal');
                pdf.text(`Invoice No   :  ${receiptNumber}`, 145, 48);
                pdf.text(`Issue Date   :  ${new Date().toLocaleDateString('es-ES')}`, 145, 54);
                pdf.text(`Account No   :  ${getBC().name.slice(0,4).toUpperCase()}-${new Date().getFullYear()}`, 145, 60);
                
                // DUES amount box (dark background)
                pdf.setFillColor(...darkGray);
                pdf.rect(145, 65, 55, 12, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(11);
                pdf.setFont(undefined, 'bold');
                pdf.text('DUES :', 148, 73);
                pdf.text(`$${totalAmount.toFixed(2)}`, 175, 73);
                
                // BILL TO section
                pdf.setTextColor(0, 0, 0);
                pdf.setFontSize(12);
                pdf.setFont(undefined, 'bold');
                pdf.text('BILL TO', 15, 95);
                
                pdf.setFontSize(10);
                pdf.setFont(undefined, 'normal');
                pdf.text(selectedAppointment.name.toUpperCase(), 15, 105);
                pdf.text('📞 ' + (selectedAppointment.phone || phoneNumber || 'N/A'), 15, 112);
                if (selectedAppointment.address) {
                    pdf.text('📍 ' + selectedAppointment.address, 15, 119);
                }
                if (selectedAppointment.city) {
                    pdf.text(selectedAppointment.city, 15, 126);
                }

                // Add appointment date and time
                let appointmentYPos = 126;
                if (selectedAppointment.date && selectedAppointment.time) {
                    appointmentYPos += 7;
                    const appointmentDate = new Date(selectedAppointment.date).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    pdf.setTextColor(68, 68, 68);
                    pdf.text(`📅 Appointment: ${appointmentDate} at ${selectedAppointment.time}`, 15, appointmentYPos);
                }

                // Services table header (exactly like template)
                let yPos = 145;
                
                // Table header row with exact colors from template
                pdf.setFillColor(...lightGray);
                pdf.rect(15, yPos, 25, 10, 'F'); // No. - light gray
                
                pdf.setFillColor(...blueColor);
                pdf.rect(40, yPos, 70, 10, 'F'); // Item Description - blue
                
                pdf.setFillColor(...darkGray);
                pdf.rect(110, yPos, 30, 10, 'F'); // Unit Price - dark gray
                
                pdf.setFillColor(...lightGray);
                pdf.rect(140, yPos, 25, 10, 'F'); // Quantity - light gray
                
                pdf.setFillColor(...darkGray);
                pdf.rect(165, yPos, 30, 10, 'F'); // Value - dark gray
                
                // Table headers text with exact positioning
                pdf.setTextColor(68, 68, 68);
                pdf.setFontSize(9);
                pdf.setFont(undefined, 'bold');
                pdf.text('No.', 24, yPos + 6);
                
                pdf.setTextColor(255, 255, 255);
                pdf.text('Item Description', 58, yPos + 6);
                pdf.text('Unit Price', 118, yPos + 6);
                
                pdf.setTextColor(68, 68, 68);
                pdf.text('Quantity', 147, yPos + 6);
                
                pdf.setTextColor(255, 255, 255);
                pdf.text('Value', 175, yPos + 6);
                
                // Services rows with alternating colors (exactly like template)
                yPos += 10;
                pdf.setFont(undefined, 'normal');
                receiptServices.forEach((service, index) => {
                    const rowHeight = 10;
                    
                    // Alternating row background (white/light gray)
                    if (index % 2 === 1) {
                        pdf.setFillColor(248, 248, 248);
                        pdf.rect(15, yPos, 180, rowHeight, 'F');
                    }
                    
                    pdf.setTextColor(68, 68, 68);
                    pdf.text(String(index + 1).padStart(2, '0'), 24, yPos + 6);
                    pdf.text(service.service, 42, yPos + 6);
                    pdf.text(`$${service.total.toFixed(2)}`, 120, yPos + 6);
                    pdf.text('1', 150, yPos + 6);
                    pdf.text(`$${service.total.toFixed(2)}`, 175, yPos + 6);
                    yPos += rowHeight;
                });
                
                // Payment methods section (left side, like template)
                yPos += 15;
                pdf.setTextColor(...blueColor);
                pdf.setFontSize(10);
                pdf.setFont(undefined, 'bold');
                pdf.text('Payment Method We Accept', 15, yPos);
                
                pdf.setTextColor(68, 68, 68);
                pdf.setFontSize(8);
                pdf.setFont(undefined, 'normal');
                pdf.text('Cash, Check, Credit Card, Zelle', 15, yPos + 7);
                pdf.text('PayPal, Venmo, Apple Pay', 15, yPos + 14);
                
                yPos += 25;
                pdf.setTextColor(...blueColor);
                pdf.setFontSize(10);
                pdf.setFont(undefined, 'bold');
                pdf.text('Card Payment', 15, yPos);
                
                pdf.setTextColor(68, 68, 68);
                pdf.setFontSize(8);
                pdf.setFont(undefined, 'normal');
                pdf.text('We accept all major credit cards', 15, yPos + 7);
                pdf.text('Visa, MasterCard, American Express', 15, yPos + 14);
                
                yPos += 25;
                pdf.setTextColor(...blueColor);
                pdf.setFontSize(10);
                pdf.setFont(undefined, 'bold');
                pdf.text('Terms & Condition', 15, yPos);
                
                pdf.setTextColor(68, 68, 68);
                pdf.setFontSize(8);
                pdf.setFont(undefined, 'normal');
                pdf.text('Payment due within 30 days', 15, yPos + 7);
                pdf.text('Late fees may apply after due date', 15, yPos + 14);
                
                // Right side totals (exactly like template)
                let totalYPos = yPos - 65;
                
                pdf.setTextColor(68, 68, 68);
                pdf.setFontSize(10);
                pdf.setFont(undefined, 'normal');
                
                // SUB TOTAL
                pdf.text('SUB TOTAL', 120, totalYPos);
                pdf.text(`$${totalAmount.toFixed(2)}`, 165, totalYPos);
                totalYPos += 12;
                
                // TAX, VAT
                pdf.text('TAX, VAT', 120, totalYPos);
                pdf.text('$0.00', 165, totalYPos);
                totalYPos += 12;
                
                // DISCOUNT
                pdf.text('DISCOUNT', 120, totalYPos);
                pdf.text('$0.00', 165, totalYPos);
                totalYPos += 12;
                
                // GRAND TOTAL (dark background, like template)
                pdf.setFillColor(...darkGray);
                pdf.rect(115, totalYPos - 3, 80, 12, 'F');
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(11);
                pdf.setFont(undefined, 'bold');
                pdf.text('GRAND TOTAL', 120, totalYPos + 3);
                pdf.text(`$${totalAmount.toFixed(2)}`, 165, totalYPos + 3);
                
                // Signature section (exactly positioned like template)
                pdf.setTextColor(68, 68, 68);
                pdf.setFontSize(8);
                pdf.setFont(undefined, 'normal');
                pdf.text('...................................', 145, totalYPos + 20);
                pdf.text('Signature', 160, totalYPos + 25);
                
                // Footer with diagonal design (exactly like template)
                const footerY = 250;
                
                // Blue diagonal footer
                pdf.setFillColor(...blueColor);
                pdf.triangle(0, footerY, 170, footerY, 0, 297, 'F');
                pdf.triangle(170, footerY, 210, 297, 0, 297, 'F');
                
                // Dark gray diagonal footer
                pdf.setFillColor(...darkGray);
                pdf.triangle(170, footerY, 210, footerY, 210, 297, 'F');
                pdf.triangle(170, footerY, 210, 297, 170, footerY, 'F');
                
                // Footer text
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(16);
                pdf.setFont(undefined, 'bold');
                pdf.text('THANK YOU FOR YOUR BUSINESS', 15, footerY + 25);
                
                // Handle different send methods (same logic as before)
                if (sendMethod === 'whatsapp') {
                    const pdfBlob = pdf.output('blob');
                    const pdfUrl = URL.createObjectURL(pdfBlob);
                    
                    // Create shareable URL for WhatsApp
                    const receiptData = {
                        receiptNumber: receiptNumber,
                        clientName: selectedAppointment.name,
                        clientPhone: phoneNumber || 'N/A',
                        services: receiptServices,
                        totalAmount: totalAmount,
                        date: new Date().toISOString(),
                        address: selectedAppointment.address || '',
                        city: selectedAppointment.city || '',
                        appointmentDate: selectedAppointment.date || new Date().toISOString().split('T')[0],
                        appointmentTime: selectedAppointment.time || ''
                    };
                    
                    // Store the latest receipt data for the simple link approach
                    localStorage.setItem('latestReceipt', JSON.stringify(receiptData));
                    localStorage.setItem('latestReceiptTimestamp', Date.now().toString());
                    
                    // Use simple Bitly link - no parameters needed!
                    const shareableUrl = getBC().websiteFull;
                    console.log('Created simple receipt URL for WhatsApp:', shareableUrl);

                    const firstName = selectedAppointment.name.split(' ')[0];
                    const message = `Hola ${firstName}, su factura por $${totalAmount.toFixed(2)} está lista. Ver/Descargar: ${shareableUrl} - ${getBC().name}`;
                    const encodedMessage = encodeURIComponent(message);
                    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
                    
                    await createAndDownloadVCard(selectedAppointment, phoneNumber);
                    
                    // Open WhatsApp directly
                    try {
                        console.log('Opening WhatsApp with URL:', whatsappUrl);
                        window.open(whatsappUrl, '_blank');
                        alert('WhatsApp abierto! Si no se abrió automáticamente, copia este mensaje:\n\n' + message);
                    } catch (error) {
                        console.error('WhatsApp open error:', error);
                        alert(`WhatsApp no se pudo abrir automáticamente. Copie este mensaje:\n\n${message}\n\nY envíelo a: ${phoneNumber}`);
                    }
                    
                    const link = document.createElement('a');
                    link.href = pdfUrl;
                    link.download = `Receipt_${receiptNumber}_${selectedAppointment.name.replace(/\s+/g, '_')}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                } else if (sendMethod === 'sms') {
                    const receiptData = generateReceiptText();
                    
                    try {
                        const response = await fetch(`${API_BASE_URL}/api/receipt`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                receiptData: receiptData,
                                receiptNumber: receiptNumber,
                                clientName: selectedAppointment.name
                            })
                        });
                        
                        const result = await response.json();
                        
                        if (result.success) {
                            const shortUrl = result.shortUrl || result.fullUrl;
                            const firstName = selectedAppointment.name.split(' ')[0];
                            const message = `Hola ${firstName}, su factura por $${totalAmount.toFixed(2)} está lista. Ver/Descargar: ${shortUrl} - ${getBC().name}`;
                            const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
                            window.open(smsUrl);
                        } else {
                            throw new Error('Failed to save receipt');
                        }
                        
                    } catch (error) {
                        console.error('Error creating receipt link:', error);
                        const pdfBlob = pdf.output('blob');
                        const pdfUrl = URL.createObjectURL(pdfBlob);
                        
                        const link = document.createElement('a');
                        link.href = pdfUrl;
                        link.download = `Receipt_${receiptNumber}_${selectedAppointment.name.replace(/\s+/g, '_')}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        const firstName = selectedAppointment.name.split(' ')[0];
                        const message = `Hola ${firstName}, su factura por $${totalAmount.toFixed(2)} está lista. PDF descargado - adjunte a este mensaje. - ${getBC().name}`;
                        const smsUrl = `sms:${phoneNumber}?body=${encodeURIComponent(message)}`;
                        window.open(smsUrl);
                    }
                    
                } else {
                    // Generate shareable URL and download PDF
                    const receiptData = {
                        receiptNumber: receiptNumber,
                        clientName: selectedAppointment.name,
                        clientPhone: phoneNumber || 'N/A',
                        services: receiptServices,
                        totalAmount: totalAmount,
                        date: new Date().toISOString(),
                        address: selectedAppointment.address || '',
                        city: selectedAppointment.city || '',
                        appointmentDate: selectedAppointment.date || new Date().toISOString().split('T')[0],
                        appointmentTime: selectedAppointment.time || ''
                    };
                    
                    // Create shareable URL
                    const encodedData = btoa(JSON.stringify(receiptData));
                    const shareableUrl = `https://incandescent-sprinkles-d1c3df.netlify.app#receipt=${encodedData}`;
                    
                    // Show URL to user and download PDF
                    const pdfBlob = pdf.output('blob');
                    const pdfUrl = URL.createObjectURL(pdfBlob);
                    const link = document.createElement('a');
                    link.href = pdfUrl;
                    link.download = `Receipt_${receiptNumber}_${selectedAppointment.name.replace(/\s+/g, '_')}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Show the shareable URL
                    setTimeout(() => {
                        alert(`✅ PDF descargado!\n\n🔗 URL para compartir:\n${shareableUrl}\n\nEsta URL permite ver/descargar el recibo desde cualquier dispositivo.`);
                    }, 500);
                }
                
                closeReceiptModal();
                
            } catch (error) {
                console.error('Error generating receipt:', error);
                alert('Error generating receipt. Please try again.');
            }
        }

        // Schedule and appointment management functions
        function toggleCalendar() {
            if (currentView === 'calendar') {
                // Hide calendar and show schedule
                document.getElementById('calendar-view').style.display = 'none';
                document.getElementById('schedule-view').style.display = 'block';
                currentView = 'schedule';
                document.querySelector('[onclick="toggleCalendar()"]').textContent = 'Ver Calendario';
            } else {
                // Show calendar and hide schedule
                document.getElementById('schedule-view').style.display = 'none';
                document.getElementById('calendar-view').style.display = 'block';
                currentView = 'calendar';
                document.querySelector('[onclick="toggleCalendar()"]').textContent = 'Ver Agenda';
                generateWeeklyCalendar();
            }
        }

        // End of receipt system

        // PWA Install handling
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            console.log('📱 App can be installed');
        });

        window.addEventListener('appinstalled', (e) => {
            console.log('🎉 App was installed successfully');
        });

        // Prevent iOS Safari bounce and make it feel more native
        document.addEventListener('touchstart', {passive: true});
        document.addEventListener('touchmove', function(e) {
            if (e.scale !== 1) {
                e.preventDefault();
            }
        }, {passive: false});

        // Hide hexagonal loading animation after page loads
        window.addEventListener('load', function() {
            // Initialize app view immediately on load
            initializeAppView();
        });

        // Copy message to clipboard function
        function copyMessage(messageType) {
            let messageText = '';

            const msgEl = document.getElementById(messageType + '-message');
            if (msgEl) messageText = msgEl.textContent;

            // Copy to clipboard
            navigator.clipboard.writeText(messageText).then(() => {
                // Show notification
                const notification = document.getElementById('copy-notification');
                notification.style.display = 'flex';

                // Hide after 2 seconds
                setTimeout(() => {
                    notification.style.display = 'none';
                }, 2000);
            }).catch(err => {
                console.error('Error copying to clipboard:', err);
                alert('Error al copiar el mensaje');
            });
        }

        // Save quick message templates to localStorage so the chatbot can read them
        function _saveQuickMessagesToStorage() {
            try {
                const types = ['carpet','furniture','general','auto','carpet-en','furniture-en','general-en','auto-en'];
                const messages = {};
                types.forEach(t => {
                    const el = document.getElementById(t + '-message');
                    if (el && el.textContent.trim()) messages[t] = el.textContent.trim();
                });
                if (Object.keys(messages).length) {
                    localStorage.setItem('rize_quick_messages', JSON.stringify(messages));
                }
            } catch(e) {}
        }
        // Run once on load (templates are in the DOM from page load)
        setTimeout(_saveQuickMessagesToStorage, 1000);

