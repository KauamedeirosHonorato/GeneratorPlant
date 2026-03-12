/* ========================================
   SIDEBAR — Advanced UI Control Panel
   Alignment Tools, Measurement, Selo Config
   ======================================== */
import state, { ZONE_PRESETS, FURNITURE_LIBRARY, TEMPLATES } from '../state/AppState.js';

export default class Sidebar {
  constructor() {
    this._bindLotControls();
    this._bindGridControls();
    this._bindStreetControls();
    this._bindZoneControls();
    this._bindFurniturePalette();
    this._bindActionButtons();
    this._bindTemplates();
    this._bindToolButtons();

    state.on('lot-change', () => this._updateLotDisplay());
    state.on('grid-change', () => this._updateGridDisplay());
    state.on('zones-change', () => this._renderZoneList());
    state.on('selection-change', () => this._renderZoneList());
    state.on('history-change', () => this._updateUndoRedoButtons());
    state.on('furniture-change', () => this._updateAreaReport());
    state.on('tool-change', () => this._updateToolButtons());

    this._updateLotDisplay();
    this._updateGridDisplay();
    this._renderZoneList();
    this._updateUndoRedoButtons();
  }

  // ═══════ LOT ═══════
  _bindLotControls() {
    document.getElementById('lotWidth').addEventListener('input', (e) => state.setLotWidth(e.target.value));
    document.getElementById('lotDepth').addEventListener('input', (e) => state.setLotDepth(e.target.value));
  }

  _updateLotDisplay() {
    const w = state.lotWidth, d = state.lotDepth, area = state.getLotArea();
    document.getElementById('lotDimensionsLabel').textContent = `${w}m x ${d}m`;
    document.getElementById('lotAreaLabel').textContent = `${area.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²`;
    document.getElementById('lotWidth').value = w;
    document.getElementById('lotDepth').value = d;
    const parts = [state.streets.left, state.streets.top].filter(Boolean);
    document.getElementById('headerAddress').textContent = parts.length > 0 ? parts.join(' x ') : 'Projeto Personalizado';
  }

  // ═══════ GRID ═══════
  _bindGridControls() {
    document.getElementById('gridModule').addEventListener('input', (e) => state.setGridModule(parseFloat(e.target.value)));
  }

  _updateGridDisplay() {
    const v = state.gridModule.toFixed(1);
    document.getElementById('gridModuleValue').textContent = `${v} x ${v}`;
    document.getElementById('gridModule').value = state.gridModule;
  }

  // ═══════ STREETS ═══════
  _bindStreetControls() {
    ['Top', 'Bottom', 'Left', 'Right'].forEach(side => {
      document.getElementById(`street${side}`).addEventListener('input', (e) => {
        state.setStreet(side.toLowerCase(), e.target.value);
        this._updateLotDisplay();
      });
    });
  }

  // ═══════ ZONES ═══════
  _bindZoneControls() {
    document.getElementById('addZoneBtn').addEventListener('click', () => this._showAddZoneModal());
  }

  _renderZoneList() {
    const container = document.getElementById('zoneList');
    container.innerHTML = '';

    state.zones.forEach(zone => {
      const isSelected = state.selectedId === zone.id;
      const isMulti = state.multiSelectedIds.includes(zone.id);
      const area = state.getZoneArea(zone);

      const item = document.createElement('div');
      item.className = `zone-item${isSelected ? ' active' : ''}${isMulti ? ' multi' : ''}`;
      item.innerHTML = `
        <div class="zone-color-swatch" style="background:${zone.cor}"></div>
        <div class="zone-item-info">
          <div class="zone-item-name">${zone.nome}</div>
          <div class="zone-item-area">${area.toFixed(2)} m²</div>
        </div>
        <button class="zone-item-delete" title="Remover" data-id="${zone.id}">✕</button>
      `;

      item.addEventListener('click', (e) => {
        if (e.target.closest('.zone-item-delete')) { e.stopPropagation(); state.removeZone(zone.id); return; }
        if (e.shiftKey) { state.toggleMultiSelect(zone.id); } else { state.selectZone(zone.id); }
      });

      container.appendChild(item);
    });

    this._renderInspector();
    this._renderAlignmentTools();
    this._updateAreaReport();
  }

  _renderInspector() {
    const existing = document.getElementById('zoneInspector');
    if (existing) existing.remove();
    const zone = state.getSelectedZone();
    if (!zone) return;

    const area = state.getZoneArea(zone);
    const section = document.getElementById('addZoneBtn').parentElement;
    const inspector = document.createElement('div');
    inspector.id = 'zoneInspector';
    inspector.className = 'zone-inspector';
    inspector.innerHTML = `
      <div class="inspector-header">
        <div>
          <h3 class="inspector-zone-name">${zone.nome}</h3>
          <p class="inspector-zone-meta">${area.toFixed(2)} m² — ${(ZONE_PRESETS[zone.tipo]?.label || zone.tipo)}</p>
        </div>
        <button class="btn btn-icon inspector-delete" title="Remover">🗑️</button>
      </div>
      <div class="inspector-controls-grid">
        <div class="inspector-control-box">
          <p class="inspector-label">Mover</p>
          <div class="move-pad">
            <div></div><button class="btn btn-icon move-btn" data-dx="0" data-dy="-0.5">↑</button><div></div>
            <button class="btn btn-icon move-btn" data-dx="-0.5" data-dy="0">←</button><div class="move-center">P</div><button class="btn btn-icon move-btn" data-dx="0.5" data-dy="0">→</button>
            <div></div><button class="btn btn-icon move-btn" data-dx="0" data-dy="0.5">↓</button>
          </div>
        </div>
        <div class="inspector-control-box">
          <p class="inspector-label">Tamanho (L × P)</p>
          <div class="resize-controls">
            <div class="resize-row">
              <button class="btn btn-icon resize-btn" data-dw="-0.5" data-dh="0">−</button>
              <span class="resize-value">${zone.w} mód</span>
              <button class="btn btn-icon resize-btn" data-dw="0.5" data-dh="0">+</button>
            </div>
            <div class="resize-row">
              <button class="btn btn-icon resize-btn" data-dw="0" data-dh="-0.5">−</button>
              <span class="resize-value">${zone.h} mód</span>
              <button class="btn btn-icon resize-btn" data-dw="0" data-dh="0.5">+</button>
            </div>
          </div>
        </div>
      </div>
      <p class="inspector-drag-hint">💡 Arraste a zona / use as alças de redimensionamento no canvas</p>
    `;

    inspector.querySelector('.inspector-delete').addEventListener('click', () => state.removeZone(zone.id));
    inspector.querySelectorAll('.move-btn').forEach(b => b.addEventListener('click', () => state.moveZone(parseFloat(b.dataset.dx), parseFloat(b.dataset.dy))));
    inspector.querySelectorAll('.resize-btn').forEach(b => b.addEventListener('click', () => state.resizeZone(parseFloat(b.dataset.dw), parseFloat(b.dataset.dh))));

    section.after(inspector);
  }

  // ═══════ ALIGNMENT TOOLS ═══════
  _renderAlignmentTools() {
    const existing = document.getElementById('alignmentTools');
    if (existing) existing.remove();

    if (state.multiSelectedIds.length < 2) return;

    const inspector = document.getElementById('zoneInspector');
    const target = inspector || document.getElementById('addZoneBtn').parentElement;

    const tools = document.createElement('div');
    tools.id = 'alignmentTools';
    tools.className = 'alignment-tools';
    tools.innerHTML = `
      <h3 class="section-title"><span class="section-icon">📐</span> Alinhamento (${state.multiSelectedIds.length} zonas)</h3>
      <div class="align-buttons">
        <button class="btn btn-icon align-btn" data-align="left" title="Alinhar Esquerda">⫷</button>
        <button class="btn btn-icon align-btn" data-align="center-h" title="Centralizar H">⫿</button>
        <button class="btn btn-icon align-btn" data-align="right" title="Alinhar Direita">⫸</button>
        <button class="btn btn-icon align-btn" data-align="top" title="Alinhar Topo">⊤</button>
        <button class="btn btn-icon align-btn" data-align="center-v" title="Centralizar V">⊺</button>
        <button class="btn btn-icon align-btn" data-align="bottom" title="Alinhar Base">⊥</button>
        <button class="btn btn-icon align-btn" data-align="distribute-h" title="Distribuir H">≡</button>
      </div>
    `;

    tools.querySelectorAll('.align-btn').forEach(b => {
      b.addEventListener('click', () => state.alignZones(b.dataset.align));
    });

    target.after(tools);
  }

  // ═══════ ADD ZONE MODAL ═══════
  _showAddZoneModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Adicionar Zona / Cômodo</h3>
        <div class="input-group">
          <label>Nome do Ambiente</label>
          <input type="text" id="modalZoneName" placeholder="Ex: Sala de Reuniões" autofocus />
        </div>
        <div class="input-group">
          <label>Tipo</label>
          <select id="modalZoneType" style="width:100%;padding:8px 12px;background:var(--bg-input);border:1px solid var(--border-primary);border-radius:var(--radius-sm);color:var(--text-primary);font-family:var(--font-primary);font-size:var(--fs-md);outline:none;cursor:pointer;">
            ${Object.entries(ZONE_PRESETS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
          </select>
        </div>
        <div class="modal-actions">
          <button class="btn" id="modalCancel">Cancelar</button>
          <button class="btn btn-primary" id="modalConfirm">Criar Zona</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#modalZoneName');
    setTimeout(() => input.focus(), 100);

    const confirm = () => {
      const name = input.value.trim();
      if (!name) { input.style.borderColor = 'var(--accent-red)'; input.focus(); return; }
      state.addZone(name, overlay.querySelector('#modalZoneType').value);
      overlay.remove();
    };

    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') confirm(); });
    overlay.querySelector('#modalConfirm').addEventListener('click', confirm);
    overlay.querySelector('#modalCancel').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  // ═══════ FURNITURE ═══════
  _bindFurniturePalette() {
    const palette = document.getElementById('furniturePalette');
    Object.entries(FURNITURE_LIBRARY).forEach(([catKey, cat]) => {
      const label = document.createElement('div');
      label.className = 'furniture-category-label';
      label.textContent = cat.label;
      palette.appendChild(label);

      const grid = document.createElement('div');
      grid.className = 'furniture-grid';
      cat.items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'furniture-item-btn';
        btn.title = `${item.nome} (${item.w}×${item.h}m)`;
        btn.innerHTML = `<span class="furn-icon">${item.icon}</span><span class="furn-label">${item.nome}</span>`;
        btn.addEventListener('click', () => state.addFurniture(item.id));
        grid.appendChild(btn);
      });
      palette.appendChild(grid);
    });
  }

  // ═══════ ACTION BUTTONS ═══════
  _bindActionButtons() {
    document.getElementById('undoBtn').addEventListener('click', () => state.undo());
    document.getElementById('redoBtn').addEventListener('click', () => state.redo());
    document.getElementById('saveBtn').addEventListener('click', () => { state.saveToLocalStorage(); this._showToast('💾 Projeto salvo!'); });
    document.getElementById('loadBtn').addEventListener('click', async () => {
      const ok = await state.uploadJSON();
      this._showToast(ok ? '📂 Projeto carregado!' : '❌ Erro ao carregar', !ok);
    });
    document.getElementById('downloadBtn').addEventListener('click', () => { state.downloadJSON(); this._showToast('⬇️ JSON baixado!'); });
  }

  _updateUndoRedoButtons() {
    document.getElementById('undoBtn').disabled = !state.canUndo();
    document.getElementById('redoBtn').disabled = !state.canRedo();
  }

  // ═══════ TOOLS ═══════
  _bindToolButtons() {
    const measureBtn = document.getElementById('measureBtn');
    const clearMeasureBtn = document.getElementById('clearMeasureBtn');
    if (measureBtn) {
      measureBtn.addEventListener('click', () => {
        state.setTool(state.activeTool === 'measure' ? 'select' : 'measure');
      });
    }
    if (clearMeasureBtn) {
      clearMeasureBtn.addEventListener('click', () => state.clearMeasurements());
    }
  }

  _updateToolButtons() {
    const btn = document.getElementById('measureBtn');
    if (btn) {
      btn.classList.toggle('active', state.activeTool === 'measure');
      btn.textContent = state.activeTool === 'measure' ? '📏 Medindo...' : '📏 Medir';
    }
  }

  // ═══════ TEMPLATES ═══════
  _bindTemplates() {
    const select = document.getElementById('templateSelect');
    Object.entries(TEMPLATES).forEach(([k, t]) => {
      const opt = document.createElement('option');
      opt.value = k; opt.textContent = t.label;
      select.appendChild(opt);
    });
    select.addEventListener('change', (e) => {
      if (e.target.value) {
        state.loadTemplate(e.target.value);
        this._showToast(`📋 Template carregado!`);
        e.target.value = '';
      }
    });
  }

  // ═══════ AREA REPORT ═══════
  _updateAreaReport() {
    let report = document.getElementById('areaReport');
    if (!report) {
      report = document.createElement('section');
      report.id = 'areaReport';
      report.className = 'sidebar-section area-report';
      document.querySelector('.sidebar-scroll').appendChild(report);
    }

    const aU = state.getAreaUtil(), circ = aU * 0.40, aT = state.getAreaComCirculacao();
    const taxa = state.getTaxaOcupacao(), lotA = state.getLotArea();

    report.innerHTML = `
      <h2 class="section-title"><span class="section-icon">📊</span> Quadro de Áreas</h2>
      <div class="area-report-content">
        <div class="area-row"><span>Área Útil:</span><strong>${aU.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²</strong></div>
        <div class="area-row area-row-highlight"><span>✓ +40% Circulação:</span><strong class="text-emerald">${circ.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²</strong></div>
        <div class="area-row area-row-total"><span>Área Construída:</span><strong class="text-emerald">${aT.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m²</strong></div>
        <div class="area-row area-row-meta"><span>Taxa de Ocupação:</span><span>${taxa.toFixed(1)}% (Lote: ${lotA.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}m²)</span></div>
        <div class="area-row area-row-meta"><span>Mobiliário:</span><span>${state.furniture.length} peça(s) | Medições: ${state.measurements.length}</span></div>
      </div>
    `;
  }

  // ═══════ TOAST ═══════
  _showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast-notification${isError ? ' toast-error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('toast-visible'), 10);
    setTimeout(() => { toast.classList.remove('toast-visible'); setTimeout(() => toast.remove(), 300); }, 2500);
  }
}
