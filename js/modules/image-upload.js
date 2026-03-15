// ================================================================
// MODULE: image-upload.js
// Manejo de imágenes: drag&drop, compresión, preview
// Depende de: uploadedImages, extractDataWithEnhancedOCR (ocr.js, runtime)
// ================================================================

        function handleDragOver(e) {
            e.preventDefault();
            e.currentTarget.classList.add('dragover');
        }

        function handleDragLeave(e) {
            e.currentTarget.classList.remove('dragover');
        }

        function handleDrop(e) {
            e.preventDefault();
            e.currentTarget.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                processFiles(files);
            }
        }

        function handleFileSelect(e) {
            const files = Array.from(e.target.files);
            if (files.length > 0) {
                processFiles(files);
            }
        }

        async function processFiles(files) {
            // Filter only image files
            const imageFiles = files.filter(file => file.type.startsWith('image/'));
            
            if (imageFiles.length === 0) {
                showError('Por favor selecciona al menos un archivo de imagen válido.');
                return;
            }

            // Show loading
            document.getElementById('loading').classList.add('active');
            document.getElementById('upload-area').style.display = 'none';

            try {
                // Process each image and add to uploadedImages array
                for (const file of imageFiles) {
                    const base64 = await fileToBase64(file);
                    const imageData = {
                        file: file,
                        base64: base64,
                        name: file.name
                    };
                    uploadedImages.push(imageData);
                }

                // Update preview section
                updateImagePreview();
                
                // Process all images with OCR
                const allExtractedData = await extractDataFromMultipleImages(uploadedImages);
                
                // Fill form with combined data
                fillForm(allExtractedData);
                
            } catch (error) {
                console.error('Error processing images:', error);
                showError('Error al procesar las imágenes. Inténtalo de nuevo.');
            } finally {
                document.getElementById('loading').classList.remove('active');
                document.getElementById('upload-area').style.display = 'flex';
            }
        }

        async function processFile(file) {
            // Maintain backward compatibility - convert to array and use processFiles
            await processFiles([file]);
        }

        function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
            });
        }

        function updateImagePreview() {
            // Preview section is hidden by design — no thumbnail display
        }

        function removeImage(index) {
            uploadedImages.splice(index, 1);
            updateImagePreview();
        }

        function clearAllImages() {
            uploadedImages = [];
            updateImagePreview();
            // Clear form data
            document.getElementById('appointment-form').reset();
            setTodayDate();
            _clearJobChips();
        }

        // Resize image to max 800px (same as chat) for fast API response
        async function _compressImage(base64, maxPx=800) {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = () => {
                    const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
                    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
                    const c = document.createElement('canvas');
                    c.width = w; c.height = h;
                    c.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(c.toDataURL('image/jpeg', 0.82).split(',')[1]);
                };
                img.onerror = () => resolve(base64);
                img.src = `data:image/jpeg;base64,${base64}`;
            });
        }
