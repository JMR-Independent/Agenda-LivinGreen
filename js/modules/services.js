// ================================================================
// MODULE: services.js
// Configuración dinámica de servicios y precios
// Depende de: _getAppCfg (supabase-init.js), showToast/showConfirm (app.js al llamarse)
// ================================================================

        // Service Pricing Configuration
        // ─── SERVICES CONFIG (dynamic, persisted in localStorage) ───────────────
        const SERVICES_STORAGE_KEY = 'rize_services_config';
        // Defaults vienen de agent_config en Supabase — sin hardcoding de servicios
        function _getDefaultServicesConfig() {
            const cfg = _getAppCfg();
            if (Array.isArray(cfg.default_services) && cfg.default_services.length) {
                return cfg.default_services.map((s,i) => ({
                    id: s.id || s.name?.toLowerCase().replace(/\s+/g,'_') || String(i),
                    name: s.name, basePrice: s.basePrice || s.price || 0, priceRange: s.priceRange || ''
                }));
            }
            // Fallback hardcodeado — siempre disponible aunque Supabase no cargue
            return [
                { id: 'alfombras',  name: 'Alfombras',       basePrice: 0, priceRange: '' },
                { id: 'sillones',   name: 'Sillones',         basePrice: 0, priceRange: '' },
                { id: 'colchon',    name: 'Colchón',          basePrice: 0, priceRange: '' },
                { id: 'cuartos',    name: 'Cuartos',          basePrice: 0, priceRange: '' },
                { id: 'sala',       name: 'Sala',             basePrice: 0, priceRange: '' },
                { id: 'escaleras',  name: 'Escaleras',        basePrice: 0, priceRange: '' },
                { id: 'pasillo',    name: 'Pasillo',          basePrice: 0, priceRange: '' },
                { id: 'sillas',     name: 'Sillas',           basePrice: 0, priceRange: '' },
                { id: 'auto',       name: 'Auto',             basePrice: 0, priceRange: '' },
                { id: 'limpieza',   name: 'Limpieza General', basePrice: 0, priceRange: '' },
            ];
        }
        let servicesConfig = [];

        function initServicesConfig() {
            try {
                const stored = localStorage.getItem(SERVICES_STORAGE_KEY);
                const parsed = stored ? JSON.parse(stored) : null;
                // Llama _getDefaultServicesConfig() aquí — cuando agent_config ya puede estar cargado
                servicesConfig = (Array.isArray(parsed) && parsed.length > 0) ? parsed : _getDefaultServicesConfig();
            } catch(e) {
                servicesConfig = _getDefaultServicesConfig();
            }
            renderJobDropdown();
            renderServiceTypeSelect();
            renderServicesSettings();
        }

        function saveServicesConfig() {
            localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(servicesConfig));
            renderJobDropdown();
            renderServiceTypeSelect();
            renderServicesSettings();
        }

        function renderJobDropdown() {
            const picker = document.getElementById('job-picker');
            if (picker) {
                picker.innerHTML = '<option value="">Seleccionar trabajo</option>' +
                    servicesConfig.map(svc =>
                        `<option value="${svc.id}">${svc.name}</option>`
                    ).join('');
            }
        }

        // ── Job chips (multi-select via native picker) ──────────────────────────
        function addJobChip(select) {
            const val = select.value;
            const label = select.options[select.selectedIndex]?.text;
            if (!val) return;

            // Don't add duplicates
            const existing = _getSelectedJobValues();
            if (existing.includes(val)) { select.value = ''; return; }

            // Create chip
            const chips = document.getElementById('job-chips');
            if (chips) {
                const chip = document.createElement('div');
                chip.dataset.value = val;
                chip.style.cssText = 'display:inline-flex;align-items:center;gap:5px;padding:5px 10px;background:rgba(16,163,127,0.25);border:1px solid rgba(16,163,127,0.5);border-radius:20px;font-size:13px;color:rgba(255,255,255,0.9);cursor:default;';
                chip.innerHTML = `<span>${label}</span><span onclick="removeJobChip(this.parentElement)" style="cursor:pointer;opacity:0.7;font-size:15px;line-height:1;">×</span>`;
                chips.appendChild(chip);
            }

            // Reset picker and sync hidden input
            select.value = '';
            _syncJobHiddenInput();
        }

        function removeJobChip(chip) {
            chip.remove();
            _syncJobHiddenInput();
        }

        function _getSelectedJobValues() {
            return Array.from(document.querySelectorAll('#job-chips [data-value]')).map(c => c.dataset.value);
        }

        function _syncJobHiddenInput() {
            const hidden = document.getElementById('job');
            if (hidden) hidden.value = _getSelectedJobValues().join(', ');
        }

        function _clearJobChips() {
            const chips = document.getElementById('job-chips');
            if (chips) chips.innerHTML = '';
            _syncJobHiddenInput();
        }

        function renderJobSheetItems() {
            const container = document.getElementById('job-sheet-list');
            if (!container) return;
            const selected = getSelectedJobIds();
            container.innerHTML = servicesConfig.map(svc => {
                const isSel = selected.includes(String(svc.id));
                return `<div class="job-sheet-item${isSel ? ' selected' : ''}" data-id="${svc.id}" onclick="toggleJobSheetItem(this)">
                    <div class="sheet-check">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <polyline points="1.5,6 4.5,9 10.5,3" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                    <span class="sheet-label">${svc.name}</span>
                </div>`;
            }).join('');
        }

        function getSelectedJobIds() {
            const jobSelect = document.getElementById('job');
            if (!jobSelect) return [];
            return Array.from(jobSelect.selectedOptions).map(o => String(o.value));
        }

        function toggleJobSheetItem(el) {
            const id = el.dataset.id;
            el.classList.toggle('selected');
            // Sync to hidden select
            const jobSelect = document.getElementById('job');
            if (jobSelect) {
                Array.from(jobSelect.options).forEach(opt => {
                    if (String(opt.value) === String(id)) opt.selected = el.classList.contains('selected');
                });
            }
            updateJobSelectionFromSheet();
            closeJobDropdown();
        }

        function updateJobSelectionFromSheet() {
            const selected = Array.from(document.querySelectorAll('#job-sheet-list .job-sheet-item.selected'));
            const labels = selected.map(el => el.querySelector('.sheet-label').textContent);
            const placeholder = document.getElementById('job-placeholder');
            if (placeholder) {
                placeholder.textContent = labels.length ? labels.join(', ') : 'Seleccionar trabajo';
            }
        }

        function renderServiceTypeSelect() {
            const select = document.getElementById('service-type');
            if (!select) return;
            select.innerHTML = '<option value="">Seleccionar servicio</option>' +
                servicesConfig.map(svc =>
                    `<option value="${svc.id}">${svc.name}</option>`
                ).join('');
        }

        function renderServicesSettings() {
            const container = document.getElementById('services-list-settings');
            if (!container) return;
            if (servicesConfig.length === 0) {
                container.innerHTML = '<p style="color:#666; text-align:center; padding:20px;">No hay servicios configurados.</p>';
                return;
            }
            container.innerHTML = servicesConfig.map((svc, idx) =>
                `<div style="display:flex; align-items:center; gap:12px; padding:14px 16px; background:#f9fafb; border-radius:8px; border:1px solid #e5e5e7;">
                    <div style="flex:1;">
                        <div style="font-weight:600; font-size:14px; color:#1a202c;">${svc.name}</div>
                        <div style="font-size:12px; color:#666; margin-top:3px;">Precio base: <strong>$${svc.basePrice}</strong>&nbsp;&nbsp;·&nbsp;&nbsp;${svc.priceRange}</div>
                    </div>
                    <button onclick="editService(${idx})" style="background:#f3f4f6; border:1px solid #d1d5db; padding:7px 13px; border-radius:6px; cursor:pointer; font-size:13px; color:#374151; white-space:nowrap;">✏️ Editar</button>
                    <button onclick="deleteService(${idx})" style="background:#fef2f2; border:1px solid #fecaca; padding:7px 11px; border-radius:6px; cursor:pointer; font-size:14px; color:#dc2626;">🗑️</button>
                </div>`
            ).join('');
        }

        let _editingServiceIdx = null;

        function openAddServiceModal() {
            _editingServiceIdx = null;
            document.getElementById('svc-name').value = '';
            document.getElementById('svc-price').value = '';
            document.getElementById('svc-price-range').value = '';
            document.getElementById('svc-modal-title').textContent = 'Agregar Servicio';
            document.getElementById('service-edit-modal').style.display = 'flex';
        }

        function editService(idx) {
            _editingServiceIdx = idx;
            const svc = servicesConfig[idx];
            document.getElementById('svc-name').value = svc.name;
            document.getElementById('svc-price').value = svc.basePrice;
            document.getElementById('svc-price-range').value = svc.priceRange;
            document.getElementById('svc-modal-title').textContent = 'Editar Servicio';
            document.getElementById('service-edit-modal').style.display = 'flex';
        }

        function closeServiceModal() {
            document.getElementById('service-edit-modal').style.display = 'none';
        }

        function saveServiceModal() {
            const name = document.getElementById('svc-name').value.trim();
            const basePrice = parseFloat(document.getElementById('svc-price').value) || 0;
            const priceRangeInput = document.getElementById('svc-price-range').value.trim();
            const priceRange = priceRangeInput || `$${basePrice}`;
            if (!name) { alert('El nombre del servicio es obligatorio'); return; }
            const id = (_editingServiceIdx !== null)
                ? servicesConfig[_editingServiceIdx].id
                : name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
            const newSvc = { id, name, basePrice, priceRange };
            if (_editingServiceIdx !== null) {
                servicesConfig[_editingServiceIdx] = newSvc;
            } else {
                servicesConfig.push(newSvc);
            }
            saveServicesConfig();
            closeServiceModal();
            showToast('✅ Servicio guardado');
        }

        function deleteService(idx) {
            const svc = servicesConfig[idx];
            showConfirm(`¿Eliminar el servicio "${svc.name}"?`, () => {
                servicesConfig.splice(idx, 1);
                saveServicesConfig();
                showToast('🗑️ Servicio eliminado');
            });
        }

        // Legacy alias kept for receipt modal — now reads from servicesConfig
        const SERVICE_PRICES = new Proxy({}, {
            get(_, key) {
                const svc = servicesConfig.find(s => s.id === key || s.name === key);
                return svc ? { basePrice: svc.basePrice, priceRange: svc.priceRange } : undefined;
            },
            has(_, key) {
                return servicesConfig.some(s => s.id === key || s.name === key);
            },
            ownKeys() { return servicesConfig.map(s => s.id); },
        });
