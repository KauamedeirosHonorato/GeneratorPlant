/* ========================================
   SVG FLOOR PLAN ENGINE — Advanced Edition
   Resize Handles, Pan, Axis Labels, Alignment Guides,
   Measurement Tool, Title Block, Multi-Select
   ======================================== */
import state, { ZONE_PRESETS } from '../state/AppState.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export default class FloorPlanEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scale = 20;
    this.margin = 80;

    // Drag state
    this._dragging = null;
    this._resizing = null; // { id, handle, startW, startH, startX, startY }
    this._panning = false;
    this._panStart = { x: 0, y: 0, panX: 0, panY: 0 };
    this._spaceDown = false;

    // Alignment guides cache
    this._guides = [];

    this._createSVG();
    this._bindEvents();

    state.on('render', () => this.render());
    state.on('zoom-change', () => this._applyZoom());
    state.on('pan-change', () => this._applyPan());

    this.render();
  }

  _createSVG() {
    this.svg = this._el('svg', {
      xmlns: SVG_NS,
      class: 'floor-plan-svg',
      style: 'background: #1e293b; cursor: crosshair; transition: transform 0.15s ease;',
    });

    const defs = this._el('defs');
    const pattern = this._el('pattern', { id: 'grid-bg', width: 20, height: 20, patternUnits: 'userSpaceOnUse' });
    pattern.appendChild(this._el('path', { d: 'M 20 0 L 0 0 0 20', fill: 'none', stroke: '#334155', 'stroke-width': '0.5', opacity: '0.3' }));
    defs.appendChild(pattern);

    const filter = this._el('filter', { id: 'zone-shadow', x: '-5%', y: '-5%', width: '110%', height: '110%' });
    filter.appendChild(this._el('feDropShadow', { dx: '0', dy: '2', stdDeviation: '3', 'flood-opacity': '0.15' }));
    defs.appendChild(filter);

    const glow = this._el('filter', { id: 'furn-glow', x: '-20%', y: '-20%', width: '140%', height: '140%' });
    glow.appendChild(this._el('feDropShadow', { dx: '0', dy: '0', stdDeviation: '4', 'flood-color': '#3b82f6', 'flood-opacity': '0.6' }));
    defs.appendChild(glow);

    this.svg.appendChild(defs);

    this.bgLayer = this._el('g', { id: 'bg-layer' });
    this.streetLayer = this._el('g', { id: 'street-layer' });
    this.mainGroup = this._el('g', { id: 'main-group' });
    this.svg.appendChild(this.bgLayer);
    this.svg.appendChild(this.streetLayer);
    this.svg.appendChild(this.mainGroup);

    this.lotLayer = this._el('g', { id: 'lot-layer' });
    this.gridLayer = this._el('g', { id: 'grid-layer' });
    this.axisLayer = this._el('g', { id: 'axis-layer' });
    this.zonesLayer = this._el('g', { id: 'zones-layer' });
    this.furnitureLayer = this._el('g', { id: 'furniture-layer' });
    this.guidesLayer = this._el('g', { id: 'guides-layer' });
    this.internalDimLayer = this._el('g', { id: 'internal-dim-layer' });
    this.measureLayer = this._el('g', { id: 'measure-layer' });
    this.dimensionLayer = this._el('g', { id: 'dimension-layer' });
    this.legendLayer = this._el('g', { id: 'legend-layer' });
    this.seloLayer = this._el('g', { id: 'selo-layer' });

    [this.lotLayer, this.gridLayer, this.axisLayer, this.zonesLayer, this.furnitureLayer,
     this.guidesLayer, this.internalDimLayer, this.measureLayer, this.dimensionLayer,
     this.legendLayer, this.seloLayer].forEach(l => this.mainGroup.appendChild(l));

    this.wrapper = document.createElement('div');
    this.wrapper.style.cssText = 'display:flex;align-items:center;justify-content:center;width:100%;height:100%;overflow:auto;position:relative;';
    this.wrapper.appendChild(this.svg);
    this.container.appendChild(this.wrapper);
  }

  _bindEvents() {
    // Space key for pan mode
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.target.closest('input,textarea,select')) {
        e.preventDefault();
        this._spaceDown = true;
        this.svg.style.cursor = 'grab';
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this._spaceDown = false;
        if (!this._panning) this.svg.style.cursor = state.activeTool === 'measure' ? 'crosshair' : 'default';
      }
    });

    this.svg.addEventListener('mousedown', (e) => {
      // Pan mode
      if (this._spaceDown || e.button === 1) {
        e.preventDefault();
        this._panning = true;
        this._panStart = { x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY };
        this.svg.style.cursor = 'grabbing';
        return;
      }

      // Measure tool
      if (state.activeTool === 'measure') {
        const pos = this._svgToMeters(e);
        state.addMeasurePoint(pos.meters.x, pos.meters.y);
        return;
      }
    });

    this.svg.addEventListener('mousemove', (e) => {
      // Pan
      if (this._panning) {
        const dx = (e.clientX - this._panStart.x) / state.zoomLevel;
        const dy = (e.clientY - this._panStart.y) / state.zoomLevel;
        state.panX = this._panStart.panX + dx;
        state.panY = this._panStart.panY + dy;
        this._applyPan();
        return;
      }

      // Status coords
      const pos = this._svgToMeters(e);
      const el = document.getElementById('statusCoords');
      if (el) el.textContent = `X: ${pos.mx}m  Y: ${pos.my}m`;

      // Drag
      if (this._dragging) {
        e.preventDefault();
        this._handleDrag(e);
      }

      // Resize
      if (this._resizing) {
        e.preventDefault();
        this._handleResize(e);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this._panning) {
        this._panning = false;
        this.svg.style.cursor = this._spaceDown ? 'grab' : 'default';
      }
      if (this._dragging) {
        state.endBatch();
        this._dragging = null;
        this._guides = [];
        this.guidesLayer.innerHTML = '';
        this.svg.style.cursor = 'default';
      }
      if (this._resizing) {
        state.endBatch();
        this._resizing = null;
        this.svg.style.cursor = 'default';
      }
    });

    // Click background
    this.svg.addEventListener('click', (e) => {
      if (e.target === this.svg || e.target.closest('#bg-layer') || e.target.closest('#lot-layer') || e.target.closest('#grid-layer')) {
        state.selectZone(null);
        state.selectedFurnitureId = null;
        state.emit('selection-change');
        state.emit('render');
      }
    });

    // Zoom
    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      state.setZoom(state.zoomLevel + (e.deltaY > 0 ? -0.05 : 0.05));
    }, { passive: false });
  }

  _svgToMeters(e) {
    const rect = this.svg.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) / state.zoomLevel - this.margin - state.panX;
    const svgY = (e.clientY - rect.top) / state.zoomLevel - this.margin - state.panY;
    return { px: svgX, py: svgY, mx: (svgX / this.scale).toFixed(1), my: (svgY / this.scale).toFixed(1), meters: { x: svgX / this.scale, y: svgY / this.scale } };
  }

  _handleDrag(e) {
    const pos = this._svgToMeters(e);
    const d = this._dragging;
    if (d.type === 'zone') {
      const modPx = state.gridModule * this.scale;
      const newModX = (pos.px - d.offsetX) / modPx;
      const newModY = (pos.py - d.offsetY) / modPx;
      state.moveZoneAbsolute(d.id, newModX, newModY);
      // Show alignment guides
      const zone = state.zones.find(z => z.id === d.id);
      if (zone) {
        this._guides = state.getAlignmentGuides(d.id, zone.x, zone.y);
        this._renderGuides();
      }
    } else if (d.type === 'furniture') {
      state.moveFurnitureAbsolute(d.id, pos.meters.x - d.offsetX, pos.meters.y - d.offsetY);
    }
  }

  _handleResize(e) {
    const pos = this._svgToMeters(e);
    const r = this._resizing;
    const modPx = state.gridModule * this.scale;
    const zone = state.zones.find(z => z.id === r.id);
    if (!zone) return;

    if (r.handle === 'e') {
      const newW = (pos.px - zone.x * modPx) / modPx;
      state.resizeZoneAbsolute(r.id, newW, zone.h);
    } else if (r.handle === 's') {
      const newH = (pos.py - zone.y * modPx) / modPx;
      state.resizeZoneAbsolute(r.id, zone.w, newH);
    } else if (r.handle === 'se') {
      const newW = (pos.px - zone.x * modPx) / modPx;
      const newH = (pos.py - zone.y * modPx) / modPx;
      state.resizeZoneAbsolute(r.id, newW, newH);
    }
  }

  _startZoneDrag(e, zone) {
    e.stopPropagation();
    const pos = this._svgToMeters(e);
    const modPx = state.gridModule * this.scale;
    this._dragging = { type: 'zone', id: zone.id, offsetX: pos.px - zone.x * modPx, offsetY: pos.py - zone.y * modPx };
    this.svg.style.cursor = 'grabbing';
    state.beginBatch();
  }

  _startFurnitureDrag(e, item) {
    e.stopPropagation();
    state.selectFurniture(item.id);
    const pos = this._svgToMeters(e);
    this._dragging = { type: 'furniture', id: item.id, offsetX: pos.meters.x - item.x, offsetY: pos.meters.y - item.y };
    this.svg.style.cursor = 'grabbing';
    state.beginBatch();
  }

  _startResize(e, zone, handle) {
    e.stopPropagation();
    e.preventDefault();
    state.selectZone(zone.id);
    this._resizing = { id: zone.id, handle };
    this.svg.style.cursor = handle === 'se' ? 'nwse-resize' : handle === 'e' ? 'ew-resize' : 'ns-resize';
    state.beginBatch();
  }

  _applyZoom() {
    this.svg.style.transform = `scale(${state.zoomLevel})`;
    this.svg.style.transformOrigin = 'center center';
    const el = document.getElementById('zoomLevel');
    if (el) el.textContent = `${Math.round(state.zoomLevel * 100)}%`;
  }

  _applyPan() {
    this.mainGroup.setAttribute('transform', `translate(${this.margin + state.panX}, ${this.margin + state.panY})`);
    this.streetLayer.setAttribute('transform', `translate(${state.panX}, ${state.panY})`);
  }

  // ═══════════════════════════════════
  //  MAIN RENDER
  // ═══════════════════════════════════
  render() {
    const wPx = state.lotWidth * this.scale;
    const hPx = state.lotDepth * this.scale;
    const seloH = 70;
    const legendH = 60;
    const bottomExtra = legendH + seloH + 30;
    const totalW = wPx + this.margin * 2;
    const totalH = hPx + this.margin * 2 + bottomExtra;

    this.svg.setAttribute('width', totalW);
    this.svg.setAttribute('height', totalH);
    this.svg.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);

    this._renderBackground(totalW, totalH);
    this._renderStreetLabels(wPx, hPx);
    this.mainGroup.setAttribute('transform', `translate(${this.margin + state.panX}, ${this.margin + state.panY})`);
    this._renderLot(wPx, hPx);
    this._renderGrid(wPx, hPx);
    this._renderAxisLabels(wPx, hPx);
    this._renderZones(wPx, hPx);
    this._renderFurniture();
    this._renderInternalDimensions();
    this._renderMeasurements();
    this._renderDimensions(wPx, hPx);
    this._renderLegend(wPx, hPx);
    this._renderSelo(wPx, hPx, legendH);

    // Status
    const sz = document.getElementById('statusZones');
    if (sz) sz.textContent = `Zonas: ${state.zones.length} | Mob: ${state.furniture.length}`;
    const ss = document.getElementById('statusScale');
    if (ss) ss.textContent = `Módulo: ${state.gridModule.toFixed(1)}m | Escala: 1px = ${(1/this.scale).toFixed(2)}m`;
  }

  _renderBackground(w, h) {
    this.bgLayer.innerHTML = '';
    this.bgLayer.appendChild(this._el('rect', { width: w, height: h, fill: '#1e293b' }));
    this.bgLayer.appendChild(this._el('rect', { width: w, height: h, fill: 'url(#grid-bg)' }));
  }

  _renderStreetLabels(wPx, hPx) {
    this.streetLayer.innerHTML = '';
    const s = state.streets, m = this.margin;
    const font = { 'text-anchor': 'middle', fill: '#64748b', 'font-size': '13', 'font-weight': 'bold', 'font-family': 'Inter, sans-serif' };

    if (s.top) {
      this.streetLayer.appendChild(this._el('rect', { x: m, y: 5, width: wPx, height: m - 20, fill: '#0f172a', rx: 4 }));
      const t = this._el('text', { x: m + wPx / 2, y: m / 2 - 5, ...font }); t.textContent = `${s.top.toUpperCase()} (${state.lotWidth.toFixed(2)}m)`;
      this.streetLayer.appendChild(t);
    }
    if (s.bottom) {
      const yP = m + hPx + 15;
      this.streetLayer.appendChild(this._el('rect', { x: m, y: yP, width: wPx, height: m - 20, fill: '#0f172a', rx: 4 }));
      const t = this._el('text', { x: m + wPx / 2, y: yP + (m - 20) / 2 + 5, ...font }); t.textContent = `${s.bottom.toUpperCase()} (${state.lotWidth.toFixed(2)}m)`;
      this.streetLayer.appendChild(t);
    }
    if (s.left) {
      this.streetLayer.appendChild(this._el('rect', { x: 5, y: m, width: m - 20, height: hPx, fill: '#0f172a', rx: 4 }));
      const t = this._el('text', { x: 0, y: 0, ...font, transform: `translate(${m / 2 - 5}, ${m + hPx / 2}) rotate(-90)` }); t.textContent = `${s.left.toUpperCase()} (${state.lotDepth.toFixed(2)}m)`;
      this.streetLayer.appendChild(t);
    }
    if (s.right) {
      const xP = m + wPx + 15;
      this.streetLayer.appendChild(this._el('rect', { x: xP, y: m, width: m - 20, height: hPx, fill: '#0f172a', rx: 4 }));
      const t = this._el('text', { x: 0, y: 0, ...font, transform: `translate(${xP + (m - 20) / 2}, ${m + hPx / 2}) rotate(90)` }); t.textContent = `${s.right.toUpperCase()} (${state.lotDepth.toFixed(2)}m)`;
      this.streetLayer.appendChild(t);
    }
  }

  _renderLot(wPx, hPx) {
    this.lotLayer.innerHTML = '';
    this.lotLayer.appendChild(this._el('rect', { x: 0, y: 0, width: wPx, height: hPx, fill: '#1e293b', stroke: '#ef4444', 'stroke-width': 2, 'stroke-dasharray': '10,5' }));
  }

  _renderGrid(wPx, hPx) {
    this.gridLayer.innerHTML = '';
    const mod = state.gridModule;
    for (let x = 0; x <= state.lotWidth; x += mod)
      this.gridLayer.appendChild(this._el('line', { x1: x * this.scale, y1: 0, x2: x * this.scale, y2: hPx, stroke: '#94a3b8', 'stroke-width': 1.5, 'stroke-dasharray': '8,4' }));
    for (let y = 0; y <= state.lotDepth; y += mod)
      this.gridLayer.appendChild(this._el('line', { x1: 0, y1: y * this.scale, x2: wPx, y2: y * this.scale, stroke: '#94a3b8', 'stroke-width': 1.5, 'stroke-dasharray': '8,4' }));
    for (let x = 0; x <= state.lotWidth; x += mod)
      for (let y = 0; y <= state.lotDepth; y += mod) {
        const g = this._el('g', { transform: `translate(${x * this.scale}, ${y * this.scale})` });
        g.appendChild(this._el('rect', { x: -4, y: -4, width: 8, height: 8, fill: '#334155', stroke: '#0f172a', 'stroke-width': 1 }));
        g.appendChild(this._el('circle', { cx: 0, cy: 0, r: 1.5, fill: '#94a3b8' }));
        this.gridLayer.appendChild(g);
      }
  }

  // ── Axis Labels (A, B, C / 1, 2, 3) ──
  _renderAxisLabels(wPx, hPx) {
    this.axisLayer.innerHTML = '';
    const mod = state.gridModule;
    let idx = 0;

    // Top axis: A, B, C...
    for (let x = 0; x <= state.lotWidth; x += mod) {
      const label = String.fromCharCode(65 + idx);
      const cx = x * this.scale;
      const cy = -25;
      const circle = this._el('circle', { cx, cy, r: 12, fill: '#0f172a', stroke: '#3b82f6', 'stroke-width': 1.5 });
      const text = this._el('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', fill: '#3b82f6', 'font-size': '11', 'font-weight': 'bold', 'font-family': 'Inter, sans-serif' });
      text.textContent = label;
      this.axisLayer.appendChild(circle);
      this.axisLayer.appendChild(text);

      // Bottom mirror
      const by = hPx + 25;
      this.axisLayer.appendChild(this._el('circle', { cx, cy: by, r: 12, fill: '#0f172a', stroke: '#3b82f6', 'stroke-width': 1.5 }));
      const bt = this._el('text', { x: cx, y: by + 4, 'text-anchor': 'middle', fill: '#3b82f6', 'font-size': '11', 'font-weight': 'bold', 'font-family': 'Inter, sans-serif' });
      bt.textContent = label;
      this.axisLayer.appendChild(bt);
      idx++;
    }

    // Left axis: 1, 2, 3...
    idx = 1;
    for (let y = 0; y <= state.lotDepth; y += mod) {
      const cx = -25;
      const cy = y * this.scale;
      this.axisLayer.appendChild(this._el('circle', { cx, cy, r: 12, fill: '#0f172a', stroke: '#3b82f6', 'stroke-width': 1.5 }));
      const t = this._el('text', { x: cx, y: cy + 4, 'text-anchor': 'middle', fill: '#3b82f6', 'font-size': '11', 'font-weight': 'bold', 'font-family': 'Inter, sans-serif' });
      t.textContent = idx;
      this.axisLayer.appendChild(t);

      // Right mirror
      const rx = wPx + 25;
      this.axisLayer.appendChild(this._el('circle', { cx: rx, cy, r: 12, fill: '#0f172a', stroke: '#3b82f6', 'stroke-width': 1.5 }));
      const rt = this._el('text', { x: rx, y: cy + 4, 'text-anchor': 'middle', fill: '#3b82f6', 'font-size': '11', 'font-weight': 'bold', 'font-family': 'Inter, sans-serif' });
      rt.textContent = idx;
      this.axisLayer.appendChild(rt);
      idx++;
    }
  }

  // ── Zones with Drag + Resize Handles ──
  _renderZones(wPx, hPx) {
    this.zonesLayer.innerHTML = '';
    const modPx = state.gridModule * this.scale;

    state.zones.forEach(zone => {
      const isSelected = state.selectedId === zone.id;
      const isMulti = state.multiSelectedIds.includes(zone.id);
      const xPx = zone.x * modPx;
      const yPx = zone.y * modPx;
      const widthPx = zone.w * modPx;
      const heightPx = zone.h * modPx;
      const area = state.getZoneArea(zone);

      const g = this._el('g', { transform: `translate(${xPx}, ${yPx})`, style: 'cursor: grab;', 'data-zone-id': zone.id });

      // Multi-select highlight
      if (isMulti) {
        g.appendChild(this._el('rect', { x: -3, y: -3, width: widthPx + 6, height: heightPx + 6, fill: 'none', stroke: '#f59e0b', 'stroke-width': 2, 'stroke-dasharray': '4,4', rx: 2 }));
      }

      // Selection indicator
      if (isSelected) {
        const sel = this._el('rect', { x: -4, y: -4, width: widthPx + 8, height: heightPx + 8, fill: 'none', stroke: '#3b82f6', 'stroke-width': 3, 'stroke-dasharray': '6,4' });
        sel.style.animation = 'selectionPulse 1.5s ease-in-out infinite';
        g.appendChild(sel);
      }

      // Zone rect
      g.appendChild(this._el('rect', { x: 0, y: 0, width: widthPx, height: heightPx, fill: zone.cor, 'fill-opacity': isSelected ? 0.9 : 0.75, stroke: zone.textCor, 'stroke-width': 2, filter: 'url(#zone-shadow)' }));

      // Name
      const fs = Math.min(13, widthPx / Math.max(zone.nome.length, 1) * 1.3);
      const nt = this._el('text', { x: widthPx / 2, y: heightPx / 2 - 5, 'text-anchor': 'middle', fill: zone.textCor, 'font-size': fs, 'font-weight': 'bold', 'font-family': 'Inter, sans-serif', style: 'pointer-events:none;' });
      nt.textContent = zone.nome;
      g.appendChild(nt);

      // Area
      const at = this._el('text', { x: widthPx / 2, y: heightPx / 2 + 14, 'text-anchor': 'middle', fill: zone.textCor, 'font-size': '11', 'font-family': "'JetBrains Mono', monospace", style: 'pointer-events:none;' });
      at.textContent = `${area.toFixed(2)} m²`;
      g.appendChild(at);

      // ── Resize Handles (only when selected) ──
      if (isSelected) {
        const hSize = 8;
        // East (right edge)
        const eHandle = this._el('rect', { x: widthPx - hSize / 2, y: heightPx / 2 - hSize / 2, width: hSize, height: hSize, fill: '#3b82f6', stroke: '#1e293b', 'stroke-width': 1, rx: 2, style: 'cursor: ew-resize;' });
        eHandle.addEventListener('mousedown', (e) => this._startResize(e, zone, 'e'));
        g.appendChild(eHandle);

        // South (bottom edge)
        const sHandle = this._el('rect', { x: widthPx / 2 - hSize / 2, y: heightPx - hSize / 2, width: hSize, height: hSize, fill: '#3b82f6', stroke: '#1e293b', 'stroke-width': 1, rx: 2, style: 'cursor: ns-resize;' });
        sHandle.addEventListener('mousedown', (e) => this._startResize(e, zone, 's'));
        g.appendChild(sHandle);

        // Southeast (corner)
        const seHandle = this._el('rect', { x: widthPx - hSize / 2, y: heightPx - hSize / 2, width: hSize, height: hSize, fill: '#f59e0b', stroke: '#1e293b', 'stroke-width': 1, rx: 2, style: 'cursor: nwse-resize;' });
        seHandle.addEventListener('mousedown', (e) => this._startResize(e, zone, 'se'));
        g.appendChild(seHandle);
      }

      // Drag handler
      g.addEventListener('mousedown', (e) => {
        if (e.target.style.cursor && e.target.style.cursor.includes('resize')) return;
        e.preventDefault();
        // Multi-select
        if (e.shiftKey) {
          state.toggleMultiSelect(zone.id);
          return;
        }
        state.selectZone(zone.id);
        this._startZoneDrag(e, zone);
      });

      this.zonesLayer.appendChild(g);
    });
  }

  // ── Furniture ──
  _renderFurniture() {
    this.furnitureLayer.innerHTML = '';
    state.furniture.forEach(item => {
      const isSel = state.selectedFurnitureId === item.id;
      const xPx = item.x * this.scale, yPx = item.y * this.scale;
      const wPx = item.w * this.scale, hPx = item.h * this.scale;

      const g = this._el('g', { transform: `translate(${xPx}, ${yPx})`, style: 'cursor: grab;' });
      if (isSel) g.appendChild(this._el('rect', { x: -2, y: -2, width: wPx + 4, height: hPx + 4, fill: 'none', stroke: '#3b82f6', 'stroke-width': 2, rx: 2, filter: 'url(#furn-glow)' }));
      g.appendChild(this._el('rect', { x: 0, y: 0, width: wPx, height: hPx, fill: isSel ? '#475569' : '#334155', stroke: '#94a3b8', 'stroke-width': 1, rx: 2, 'fill-opacity': 0.9 }));

      const icon = this._el('text', { x: wPx / 2, y: hPx / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': Math.min(wPx, hPx) * 0.5, style: 'pointer-events:none;' });
      icon.textContent = item.icon;
      g.appendChild(icon);

      g.addEventListener('mousedown', (e) => { e.preventDefault(); this._startFurnitureDrag(e, item); });
      g.addEventListener('dblclick', (e) => { e.stopPropagation(); state.rotateFurniture(item.id); });
      this.furnitureLayer.appendChild(g);
    });
  }

  // ── Alignment Guides ──
  _renderGuides() {
    this.guidesLayer.innerHTML = '';
    const wPx = state.lotWidth * this.scale;
    const hPx = state.lotDepth * this.scale;

    this._guides.forEach(g => {
      if (g.type === 'v') {
        const px = g.pos * this.scale / state.gridModule;
        this.guidesLayer.appendChild(this._el('line', { x1: g.pos * this.scale, y1: 0, x2: g.pos * this.scale, y2: hPx, stroke: '#f59e0b', 'stroke-width': 1, 'stroke-dasharray': '4,4', opacity: 0.8 }));
      } else {
        this.guidesLayer.appendChild(this._el('line', { x1: 0, y1: g.pos * this.scale, x2: wPx, y2: g.pos * this.scale, stroke: '#f59e0b', 'stroke-width': 1, 'stroke-dasharray': '4,4', opacity: 0.8 }));
      }
    });
  }

  // ── Internal Dimensions ──
  _renderInternalDimensions() {
    this.internalDimLayer.innerHTML = '';
    const sel = state.getSelectedZone();
    if (!sel) return;

    const modPx = state.gridModule * this.scale;
    const sx = sel.x * modPx, sy = sel.y * modPx, sw = sel.w * modPx, sh = sel.h * modPx;
    const wM = (sel.w * state.gridModule).toFixed(1), hM = (sel.h * state.gridModule).toFixed(1);

    // Bottom
    const dimY = sy + sh + 8;
    this.internalDimLayer.appendChild(this._el('line', { x1: sx, y1: dimY, x2: sx + sw, y2: dimY, stroke: '#22d3ee', 'stroke-width': 1 }));
    this.internalDimLayer.appendChild(this._el('line', { x1: sx, y1: dimY - 4, x2: sx, y2: dimY + 4, stroke: '#22d3ee', 'stroke-width': 1 }));
    this.internalDimLayer.appendChild(this._el('line', { x1: sx + sw, y1: dimY - 4, x2: sx + sw, y2: dimY + 4, stroke: '#22d3ee', 'stroke-width': 1 }));
    const wL = this._el('text', { x: sx + sw / 2, y: dimY + 14, 'text-anchor': 'middle', fill: '#22d3ee', 'font-size': '10', 'font-family': "'JetBrains Mono', monospace" });
    wL.textContent = `${wM}m`;
    this.internalDimLayer.appendChild(wL);

    // Right
    const dimX = sx + sw + 8;
    this.internalDimLayer.appendChild(this._el('line', { x1: dimX, y1: sy, x2: dimX, y2: sy + sh, stroke: '#22d3ee', 'stroke-width': 1 }));
    this.internalDimLayer.appendChild(this._el('line', { x1: dimX - 4, y1: sy, x2: dimX + 4, y2: sy, stroke: '#22d3ee', 'stroke-width': 1 }));
    this.internalDimLayer.appendChild(this._el('line', { x1: dimX - 4, y1: sy + sh, x2: dimX + 4, y2: sy + sh, stroke: '#22d3ee', 'stroke-width': 1 }));
    const hL = this._el('text', { x: 0, y: 0, 'text-anchor': 'middle', fill: '#22d3ee', 'font-size': '10', 'font-family': "'JetBrains Mono', monospace", transform: `translate(${dimX + 14}, ${sy + sh / 2}) rotate(90)` });
    hL.textContent = `${hM}m`;
    this.internalDimLayer.appendChild(hL);
  }

  // ── Measurement Lines ──
  _renderMeasurements() {
    this.measureLayer.innerHTML = '';

    // Saved measurements
    state.measurements.forEach((m, i) => {
      const x1 = m.p1.x * this.scale, y1 = m.p1.y * this.scale;
      const x2 = m.p2.x * this.scale, y2 = m.p2.y * this.scale;

      this.measureLayer.appendChild(this._el('circle', { cx: x1, cy: y1, r: 4, fill: '#f97316', stroke: '#fff', 'stroke-width': 1 }));
      this.measureLayer.appendChild(this._el('circle', { cx: x2, cy: y2, r: 4, fill: '#f97316', stroke: '#fff', 'stroke-width': 1 }));
      this.measureLayer.appendChild(this._el('line', { x1, y1, x2, y2, stroke: '#f97316', 'stroke-width': 2, 'stroke-dasharray': '6,3' }));

      const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
      // Background for text
      const dist = m.dist.toFixed(2);
      const bg = this._el('rect', { x: midX - 25, y: midY - 10, width: 50, height: 16, fill: '#0f172a', rx: 3, 'fill-opacity': 0.9 });
      this.measureLayer.appendChild(bg);
      const t = this._el('text', { x: midX, y: midY + 3, 'text-anchor': 'middle', fill: '#f97316', 'font-size': '11', 'font-weight': 'bold', 'font-family': "'JetBrains Mono', monospace" });
      t.textContent = `${dist}m`;
      this.measureLayer.appendChild(t);
    });

    // Pending measurement point
    if (state.measurePoints.length === 1) {
      const p = state.measurePoints[0];
      this.measureLayer.appendChild(this._el('circle', { cx: p.x * this.scale, cy: p.y * this.scale, r: 5, fill: '#f97316', stroke: '#fff', 'stroke-width': 2 }));
    }
  }

  // ── External Dimensions ──
  _renderDimensions(wPx, hPx) {
    this.dimensionLayer.innerHTML = '';
    const mono = "'JetBrains Mono', monospace";

    // Top
    const tG = this._el('g', { stroke: '#ef4444', 'stroke-width': 1, fill: '#ef4444', 'font-size': 12, 'font-family': mono });
    tG.appendChild(this._el('line', { x1: 0, y1: -10, x2: wPx, y2: -10 }));
    tG.appendChild(this._el('line', { x1: 0, y1: -15, x2: 0, y2: -5 }));
    tG.appendChild(this._el('line', { x1: wPx, y1: -15, x2: wPx, y2: -5 }));
    tG.appendChild(this._el('polygon', { points: `5,-10 0,-7 0,-13`, fill: '#ef4444', stroke: 'none' }));
    tG.appendChild(this._el('polygon', { points: `${wPx - 5},-10 ${wPx},-7 ${wPx},-13`, fill: '#ef4444', stroke: 'none' }));
    const tT = this._el('text', { x: wPx / 2, y: -18, 'text-anchor': 'middle', stroke: 'none', fill: '#ef4444' });
    tT.textContent = `${state.lotWidth.toFixed(2)} m`;
    tG.appendChild(tT);
    this.dimensionLayer.appendChild(tG);

    // Right
    const rG = this._el('g', { stroke: '#ef4444', 'stroke-width': 1, fill: '#ef4444', 'font-size': 12, 'font-family': mono });
    rG.appendChild(this._el('line', { x1: wPx + 10, y1: 0, x2: wPx + 10, y2: hPx }));
    rG.appendChild(this._el('line', { x1: wPx + 5, y1: 0, x2: wPx + 15, y2: 0 }));
    rG.appendChild(this._el('line', { x1: wPx + 5, y1: hPx, x2: wPx + 15, y2: hPx }));
    rG.appendChild(this._el('polygon', { points: `${wPx + 10},5 ${wPx + 7},0 ${wPx + 13},0`, fill: '#ef4444', stroke: 'none' }));
    rG.appendChild(this._el('polygon', { points: `${wPx + 10},${hPx - 5} ${wPx + 7},${hPx} ${wPx + 13},${hPx}`, fill: '#ef4444', stroke: 'none' }));
    const rT = this._el('text', { x: 0, y: 0, 'text-anchor': 'middle', stroke: 'none', fill: '#ef4444', transform: `translate(${wPx + 25}, ${hPx / 2}) rotate(90)` });
    rT.textContent = `${state.lotDepth.toFixed(2)} m`;
    rG.appendChild(rT);
    this.dimensionLayer.appendChild(rG);
  }

  // ── Legend + North + Scale ──
  _renderLegend(wPx, hPx) {
    this.legendLayer.innerHTML = '';
    const ly = hPx + 20;

    this.legendLayer.appendChild(this._el('rect', { x: 0, y: ly, width: wPx, height: 50, fill: '#0f172a', rx: 6, 'fill-opacity': 0.8, stroke: '#1e293b', 'stroke-width': 1 }));

    // North
    const nx = wPx - 30, ny = ly + 12;
    const nG = this._el('g', { transform: `translate(${nx}, ${ny})` });
    nG.appendChild(this._el('polygon', { points: '0,-10 -5,5 0,0 5,5', fill: '#ef4444', stroke: '#ef4444', 'stroke-width': 1 }));
    const nT = this._el('text', { x: 0, y: -14, 'text-anchor': 'middle', fill: '#ef4444', 'font-size': '10', 'font-weight': 'bold', 'font-family': 'Inter, sans-serif' });
    nT.textContent = 'N';
    nG.appendChild(nT);
    this.legendLayer.appendChild(nG);

    // Scale Bar
    const sbX = 10, sbY = ly + 38, sbM = 10, sbW = sbM * this.scale;
    this.legendLayer.appendChild(this._el('line', { x1: sbX, y1: sbY, x2: sbX + sbW, y2: sbY, stroke: '#94a3b8', 'stroke-width': 2 }));
    this.legendLayer.appendChild(this._el('line', { x1: sbX, y1: sbY - 4, x2: sbX, y2: sbY + 4, stroke: '#94a3b8', 'stroke-width': 2 }));
    this.legendLayer.appendChild(this._el('line', { x1: sbX + sbW, y1: sbY - 4, x2: sbX + sbW, y2: sbY + 4, stroke: '#94a3b8', 'stroke-width': 2 }));
    this.legendLayer.appendChild(this._el('line', { x1: sbX + sbW / 2, y1: sbY - 2, x2: sbX + sbW / 2, y2: sbY + 2, stroke: '#94a3b8', 'stroke-width': 1 }));
    const sbT = this._el('text', { x: sbX + sbW / 2, y: sbY - 8, 'text-anchor': 'middle', fill: '#94a3b8', 'font-size': '9', 'font-family': "'JetBrains Mono', monospace" });
    sbT.textContent = `${sbM}m`;
    this.legendLayer.appendChild(sbT);

    // Zone swatches
    const usedTypes = {};
    state.zones.forEach(z => { usedTypes[z.tipo] = { cor: z.cor, textCor: z.textCor }; });
    let lx = 10;
    const lly = ly + 14;
    Object.entries(usedTypes).forEach(([tipo, c]) => {
      const label = ZONE_PRESETS[tipo]?.label || tipo;
      this.legendLayer.appendChild(this._el('rect', { x: lx, y: lly - 5, width: 10, height: 10, fill: c.cor, rx: 2, stroke: c.textCor, 'stroke-width': 0.5 }));
      const t = this._el('text', { x: lx + 14, y: lly + 3, fill: '#94a3b8', 'font-size': '9', 'font-family': 'Inter, sans-serif' });
      t.textContent = label;
      this.legendLayer.appendChild(t);
      lx += 14 + label.length * 5.5 + 12;
    });
  }

  // ── Selo Técnico / Title Block ──
  _renderSelo(wPx, hPx, legendH) {
    this.seloLayer.innerHTML = '';
    const s = state.selo;
    const sy = hPx + legendH + 40;
    const seloW = wPx;
    const seloH = 55;

    // Main frame
    this.seloLayer.appendChild(this._el('rect', { x: 0, y: sy, width: seloW, height: seloH, fill: '#0f172a', stroke: '#3b82f6', 'stroke-width': 1.5, rx: 4 }));

    // Dividers — 5 columns
    const cols = [seloW * 0.3, seloW * 0.5, seloW * 0.65, seloW * 0.8];
    cols.forEach(cx => {
      this.seloLayer.appendChild(this._el('line', { x1: cx, y1: sy, x2: cx, y2: sy + seloH, stroke: '#1e3a5f', 'stroke-width': 1 }));
    });

    // Horizontal divider
    this.seloLayer.appendChild(this._el('line', { x1: 0, y1: sy + 18, x2: seloW, y2: sy + 18, stroke: '#1e3a5f', 'stroke-width': 1 }));

    const headerFont = { fill: '#64748b', 'font-size': '8', 'font-family': 'Inter, sans-serif', 'text-anchor': 'middle' };
    const valueFont = { fill: '#e2e8f0', 'font-size': '10', 'font-weight': 'bold', 'font-family': 'Inter, sans-serif', 'text-anchor': 'middle' };

    // Headers
    const headers = ['PROJETO', 'AUTOR', 'ESCALA', 'DATA', 'REVISÃO'];
    const positions = [cols[0] / 2, (cols[0] + cols[1]) / 2, (cols[1] + cols[2]) / 2, (cols[2] + cols[3]) / 2, (cols[3] + seloW) / 2];

    headers.forEach((h, i) => {
      const ht = this._el('text', { x: positions[i], y: sy + 12, ...headerFont });
      ht.textContent = h;
      this.seloLayer.appendChild(ht);
    });

    // Values
    const values = [s.projeto, s.autor, s.escala, s.data, s.revisao];
    values.forEach((v, i) => {
      const vt = this._el('text', { x: positions[i], y: sy + 38, ...valueFont });
      vt.textContent = v;
      this.seloLayer.appendChild(vt);
    });

    // GeneratorPlant branding
    const brand = this._el('text', { x: seloW - 5, y: sy + seloH - 4, 'text-anchor': 'end', fill: '#334155', 'font-size': '7', 'font-family': 'Inter, sans-serif' });
    brand.textContent = 'GeneratorPlant v2.0';
    this.seloLayer.appendChild(brand);
  }

  // Helper
  _el(tag, attrs = {}) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  // ═══════ EXPORT ═══════
  toDataURL(t = 'image/png') {
    return new Promise(resolve => {
      const svg = new XMLSerializer().serializeToString(this.svg);
      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      if (t === 'image/svg+xml') { resolve(url); return; }
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = this.svg.getAttribute('width') * 2;
        c.height = this.svg.getAttribute('height') * 2;
        const ctx = c.getContext('2d');
        ctx.scale(2, 2); ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/png'));
      };
      img.src = url;
    });
  }

  exportSVG() {
    const d = new XMLSerializer().serializeToString(this.svg);
    const b = new Blob([d], { type: 'image/svg+xml;charset=utf-8' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u; a.download = `GeneratorPlant_${state.gridModule}x${state.gridModule}m.svg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
  }

  async exportPNG() {
    const d = await this.toDataURL('image/png');
    const a = document.createElement('a'); a.href = d; a.download = `GeneratorPlant_${state.gridModule}x${state.gridModule}m.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // ── PDF Export ──
  async exportPDF() {
    // Generate SVG data URL and create printable page
    const svgData = new XMLSerializer().serializeToString(this.svg);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>GeneratorPlant — ${state.selo.projeto}</title>
      <style>
        @page { size: A3 landscape; margin: 10mm; }
        body { margin: 0; display: flex; align-items: center; justify-content: center; background: #fff; }
        svg { max-width: 100%; max-height: 100vh; }
      </style></head>
      <body>${svgData}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
}
