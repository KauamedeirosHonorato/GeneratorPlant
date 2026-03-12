/* ========================================
   SVG FLOOR PLAN ENGINE — Premium Edition
   Auto-Scale, Clean Grid, Professional Look
   ======================================== */
import state, { ZONE_PRESETS } from '../state/AppState.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

export default class FloorPlanEngine {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.margin = 90;

    // Drag / Resize / Pan state
    this._dragging = null;
    this._resizing = null;
    this._panning = false;
    this._panStart = { x: 0, y: 0, panX: 0, panY: 0 };
    this._spaceDown = false;
    this._guides = [];

    this._createSVG();
    this._bindEvents();

    state.on('render', () => this.render());
    state.on('zoom-change', () => this._applyZoom());
    state.on('pan-change', () => this._applyPan());

    // Observe container size for auto-scale
    this._resizeObserver = new ResizeObserver(() => this.render());
    this._resizeObserver.observe(this.container);

    this.render();
  }

  // ── Auto-scale: px per meter ──
  get scale() {
    const cw = this.container.clientWidth || 900;
    const ch = this.container.clientHeight || 600;
    const availW = cw - this.margin * 2 - 40;
    const availH = ch - this.margin * 2 - 180; // extra for legend + selo
    const scaleW = availW / state.lotWidth;
    const scaleH = availH / state.lotDepth;
    return Math.max(12, Math.min(50, Math.min(scaleW, scaleH)));
  }

  _createSVG() {
    this.svg = this._el('svg', {
      xmlns: SVG_NS,
      class: 'floor-plan-svg',
      style: 'background: #0f172a; cursor: default;',
    });

    const defs = this._el('defs');

    // Subtle grid pattern
    const pat = this._el('pattern', { id: 'grid-bg', width: 40, height: 40, patternUnits: 'userSpaceOnUse' });
    pat.appendChild(this._el('path', { d: 'M 40 0 L 0 0 0 40', fill: 'none', stroke: '#1e293b', 'stroke-width': '0.5' }));
    defs.appendChild(pat);

    // Zone shadow
    const f1 = this._el('filter', { id: 'zone-shadow', x: '-5%', y: '-5%', width: '110%', height: '110%' });
    f1.appendChild(this._el('feDropShadow', { dx: '0', dy: '3', stdDeviation: '4', 'flood-color': '#000', 'flood-opacity': '0.25' }));
    defs.appendChild(f1);

    // Glow for selected
    const f2 = this._el('filter', { id: 'select-glow', x: '-10%', y: '-10%', width: '120%', height: '120%' });
    f2.appendChild(this._el('feDropShadow', { dx: '0', dy: '0', stdDeviation: '6', 'flood-color': '#3b82f6', 'flood-opacity': '0.5' }));
    defs.appendChild(f2);

    // Furniture glow
    const f3 = this._el('filter', { id: 'furn-glow', x: '-20%', y: '-20%', width: '140%', height: '140%' });
    f3.appendChild(this._el('feDropShadow', { dx: '0', dy: '0', stdDeviation: '4', 'flood-color': '#3b82f6', 'flood-opacity': '0.6' }));
    defs.appendChild(f3);

    // Zone gradient overlays
    const lg = this._el('linearGradient', { id: 'zone-shine', x1: '0', y1: '0', x2: '0', y2: '1' });
    lg.appendChild(this._el('stop', { offset: '0%', 'stop-color': '#fff', 'stop-opacity': '0.08' }));
    lg.appendChild(this._el('stop', { offset: '100%', 'stop-color': '#000', 'stop-opacity': '0.05' }));
    defs.appendChild(lg);

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

  // ═══════════════════════════════════
  //  EVENTS
  // ═══════════════════════════════════
  _bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.target.closest('input,textarea,select')) {
        e.preventDefault();
        this._spaceDown = true;
        this.svg.style.cursor = 'grab';
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') { this._spaceDown = false; if (!this._panning) this.svg.style.cursor = 'default'; }
    });

    this.svg.addEventListener('mousedown', (e) => {
      if (this._spaceDown || e.button === 1) {
        e.preventDefault();
        this._panning = true;
        this._panStart = { x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY };
        this.svg.style.cursor = 'grabbing';
        return;
      }
      if (state.activeTool === 'measure') {
        const pos = this._svgToMeters(e);
        state.addMeasurePoint(pos.meters.x, pos.meters.y);
      }
    });

    this.svg.addEventListener('mousemove', (e) => {
      if (this._panning) {
        const dx = (e.clientX - this._panStart.x) / state.zoomLevel;
        const dy = (e.clientY - this._panStart.y) / state.zoomLevel;
        state.panX = this._panStart.panX + dx;
        state.panY = this._panStart.panY + dy;
        this._applyPan();
        return;
      }

      const pos = this._svgToMeters(e);
      const el = document.getElementById('statusCoords');
      if (el) el.textContent = `X: ${pos.mx}m  Y: ${pos.my}m`;

      if (this._dragging) { e.preventDefault(); this._handleDrag(e); }
      if (this._resizing) { e.preventDefault(); this._handleResize(e); }
    });

    window.addEventListener('mouseup', () => {
      if (this._panning) { this._panning = false; this.svg.style.cursor = this._spaceDown ? 'grab' : 'default'; }
      if (this._dragging) { state.endBatch(); this._dragging = null; this._guides = []; this.guidesLayer.innerHTML = ''; this.svg.style.cursor = 'default'; }
      if (this._resizing) { state.endBatch(); this._resizing = null; this.svg.style.cursor = 'default'; }
    });

    this.svg.addEventListener('click', (e) => {
      if (e.target === this.svg || e.target.closest('#bg-layer') || e.target.closest('#lot-layer') || e.target.closest('#grid-layer')) {
        state.selectZone(null); state.selectedFurnitureId = null;
        state.emit('selection-change'); state.emit('render');
      }
    });

    this.container.addEventListener('wheel', (e) => {
      e.preventDefault();
      state.setZoom(state.zoomLevel + (e.deltaY > 0 ? -0.05 : 0.05));
    }, { passive: false });
  }

  _svgToMeters(e) {
    const rect = this.svg.getBoundingClientRect();
    const s = this.scale;
    const svgX = (e.clientX - rect.left) / state.zoomLevel - this.margin - state.panX;
    const svgY = (e.clientY - rect.top) / state.zoomLevel - this.margin - state.panY;
    return { px: svgX, py: svgY, mx: (svgX / s).toFixed(1), my: (svgY / s).toFixed(1), meters: { x: svgX / s, y: svgY / s } };
  }

  _handleDrag(e) {
    const pos = this._svgToMeters(e);
    const d = this._dragging;
    const s = this.scale;
    if (d.type === 'zone') {
      const modPx = state.gridModule * s;
      state.moveZoneAbsolute(d.id, (pos.px - d.offsetX) / modPx, (pos.py - d.offsetY) / modPx);
      const zone = state.zones.find(z => z.id === d.id);
      if (zone) { this._guides = state.getAlignmentGuides(d.id, zone.x, zone.y); this._renderGuides(); }
    } else if (d.type === 'furniture') {
      state.moveFurnitureAbsolute(d.id, pos.meters.x - d.offsetX, pos.meters.y - d.offsetY);
    }
  }

  _handleResize(e) {
    const pos = this._svgToMeters(e);
    const r = this._resizing;
    const s = this.scale;
    const modPx = state.gridModule * s;
    const zone = state.zones.find(z => z.id === r.id);
    if (!zone) return;
    if (r.handle === 'e' || r.handle === 'se') {
      const newW = (pos.px - zone.x * modPx) / modPx;
      state.resizeZoneAbsolute(r.id, newW, r.handle === 'se' ? (pos.py - zone.y * modPx) / modPx : zone.h);
    } else if (r.handle === 's') {
      state.resizeZoneAbsolute(r.id, zone.w, (pos.py - zone.y * modPx) / modPx);
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
    e.stopPropagation(); e.preventDefault();
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
    const s = this.scale;
    const wPx = state.lotWidth * s;
    const hPx = state.lotDepth * s;
    const seloH = 65;
    const legendH = 55;
    const bottomExtra = legendH + seloH + 35;
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

    const sz = document.getElementById('statusZones');
    if (sz) sz.textContent = `Zonas: ${state.zones.length} | Mob: ${state.furniture.length}`;
    const ss = document.getElementById('statusScale');
    if (ss) ss.textContent = `Módulo: ${state.gridModule.toFixed(1)}m | ${s.toFixed(0)}px/m`;
  }

  // ── Background ──
  _renderBackground(w, h) {
    this.bgLayer.innerHTML = '';
    // Deep dark base
    this.bgLayer.appendChild(this._el('rect', { width: w, height: h, fill: '#0a0f1a' }));
    // Subtle grid
    this.bgLayer.appendChild(this._el('rect', { width: w, height: h, fill: 'url(#grid-bg)', opacity: '0.5' }));
  }

  // ── Streets ──
  _renderStreetLabels(wPx, hPx) {
    this.streetLayer.innerHTML = '';
    const s = state.streets, m = this.margin;
    const fontAttr = { 'text-anchor': 'middle', fill: '#94a3b8', 'font-size': '12', 'font-weight': '600', 'font-family': 'Inter, sans-serif', 'letter-spacing': '1' };

    if (s.top) {
      this.streetLayer.appendChild(this._el('rect', { x: m, y: 8, width: wPx, height: m - 25, fill: '#0f172a', rx: 6, 'fill-opacity': 0.8 }));
      const t = this._el('text', { x: m + wPx / 2, y: m / 2, ...fontAttr });
      t.textContent = `${s.top.toUpperCase()} (${state.lotWidth.toFixed(2)}m)`;
      this.streetLayer.appendChild(t);
    }
    if (s.bottom) {
      const yP = m + hPx + 18;
      this.streetLayer.appendChild(this._el('rect', { x: m, y: yP, width: wPx, height: m - 25, fill: '#0f172a', rx: 6, 'fill-opacity': 0.8 }));
      const t = this._el('text', { x: m + wPx / 2, y: yP + (m - 25) / 2 + 4, ...fontAttr });
      t.textContent = `${s.bottom.toUpperCase()} (${state.lotWidth.toFixed(2)}m)`;
      this.streetLayer.appendChild(t);
    }
    if (s.left) {
      this.streetLayer.appendChild(this._el('rect', { x: 8, y: m, width: m - 25, height: hPx, fill: '#0f172a', rx: 6, 'fill-opacity': 0.8 }));
      const t = this._el('text', { x: 0, y: 0, ...fontAttr, transform: `translate(${m / 2}, ${m + hPx / 2}) rotate(-90)` });
      t.textContent = `${s.left.toUpperCase()} (${state.lotDepth.toFixed(2)}m)`;
      this.streetLayer.appendChild(t);
    }
    if (s.right) {
      const xP = m + wPx + 18;
      this.streetLayer.appendChild(this._el('rect', { x: xP, y: m, width: m - 25, height: hPx, fill: '#0f172a', rx: 6, 'fill-opacity': 0.8 }));
      const t = this._el('text', { x: 0, y: 0, ...fontAttr, transform: `translate(${xP + (m - 25) / 2}, ${m + hPx / 2}) rotate(90)` });
      t.textContent = `${s.right.toUpperCase()} (${state.lotDepth.toFixed(2)}m)`;
      this.streetLayer.appendChild(t);
    }
  }

  // ── Lot ──
  _renderLot(wPx, hPx) {
    this.lotLayer.innerHTML = '';
    // Lot background — subtle darker area
    this.lotLayer.appendChild(this._el('rect', { x: 0, y: 0, width: wPx, height: hPx, fill: '#111827', stroke: 'none' }));
    // Lot boundary
    this.lotLayer.appendChild(this._el('rect', { x: 0, y: 0, width: wPx, height: hPx, fill: 'none', stroke: '#ef4444', 'stroke-width': 2.5, 'stroke-dasharray': '12,6' }));
  }

  // ── Grid (smart density) ──
  _renderGrid(wPx, hPx) {
    this.gridLayer.innerHTML = '';
    const mod = state.gridModule;
    const s = this.scale;
    const modPx = mod * s;

    // Only show sub-grid when modules are large enough
    const showSubGrid = modPx > 40;

    // Major grid lines
    for (let x = 0; x <= state.lotWidth + 0.001; x += mod) {
      this.gridLayer.appendChild(this._el('line', {
        x1: x * s, y1: 0, x2: x * s, y2: hPx,
        stroke: '#334155', 'stroke-width': 1, 'stroke-dasharray': '8,6', opacity: '0.6',
      }));
    }
    for (let y = 0; y <= state.lotDepth + 0.001; y += mod) {
      this.gridLayer.appendChild(this._el('line', {
        x1: 0, y1: y * s, x2: wPx, y2: y * s,
        stroke: '#334155', 'stroke-width': 1, 'stroke-dasharray': '8,6', opacity: '0.6',
      }));
    }

    // Sub-grid (half-module) — only if modules are big
    if (showSubGrid) {
      for (let x = mod / 2; x < state.lotWidth; x += mod) {
        this.gridLayer.appendChild(this._el('line', { x1: x * s, y1: 0, x2: x * s, y2: hPx, stroke: '#1e293b', 'stroke-width': 0.5, 'stroke-dasharray': '4,8' }));
      }
      for (let y = mod / 2; y < state.lotDepth; y += mod) {
        this.gridLayer.appendChild(this._el('line', { x1: 0, y1: y * s, x2: wPx, y2: y * s, stroke: '#1e293b', 'stroke-width': 0.5, 'stroke-dasharray': '4,8' }));
      }
    }

    // Intersection nodes — only at major grid
    for (let x = 0; x <= state.lotWidth + 0.001; x += mod) {
      for (let y = 0; y <= state.lotDepth + 0.001; y += mod) {
        this.gridLayer.appendChild(this._el('circle', { cx: x * s, cy: y * s, r: 2.5, fill: '#475569' }));
      }
    }
  }

  // ── Axis Labels (smart skip when dense) ──
  _renderAxisLabels(wPx, hPx) {
    this.axisLayer.innerHTML = '';
    const mod = state.gridModule;
    const s = this.scale;
    const modPx = mod * s;

    // Skip labels if too dense (< 28px between them)
    const skipFactor = modPx < 28 ? Math.ceil(28 / modPx) : 1;
    const circR = Math.min(13, modPx * 0.35);

    // ── Horizontal axis (A, B, C...) ──
    let idx = 0;
    for (let x = 0; x <= state.lotWidth + 0.001; x += mod) {
      if (idx % skipFactor === 0) {
        const label = this._axisLabel(idx);
        const cx = x * s;

        // Top
        this._drawAxisCircle(cx, -30, circR, label);
        // Bottom
        this._drawAxisCircle(cx, hPx + 30, circR, label);
      }
      idx++;
    }

    // ── Vertical axis (1, 2, 3...) ──
    idx = 1;
    for (let y = 0; y <= state.lotDepth + 0.001; y += mod) {
      if ((idx - 1) % skipFactor === 0) {
        const cy = y * s;
        this._drawAxisCircle(-30, cy, circR, String(idx));
        this._drawAxisCircle(wPx + 30, cy, circR, String(idx));
      }
      idx++;
    }
  }

  _drawAxisCircle(cx, cy, r, label) {
    this.axisLayer.appendChild(this._el('circle', {
      cx, cy, r, fill: '#0f172a', stroke: '#3b82f6', 'stroke-width': 1.5,
    }));
    const t = this._el('text', {
      x: cx, y: cy + (r > 10 ? 4 : 3.5), 'text-anchor': 'middle', fill: '#60a5fa',
      'font-size': Math.min(11, r * 1.1), 'font-weight': 'bold', 'font-family': 'Inter, sans-serif',
    });
    t.textContent = label;
    this.axisLayer.appendChild(t);
  }

  _axisLabel(idx) {
    if (idx < 26) return String.fromCharCode(65 + idx);
    const first = String.fromCharCode(65 + Math.floor(idx / 26) - 1);
    const second = String.fromCharCode(65 + (idx % 26));
    return first + second;
  }

  // ── Zones ──
  _renderZones(wPx, hPx) {
    this.zonesLayer.innerHTML = '';
    const s = this.scale;
    const modPx = state.gridModule * s;

    state.zones.forEach(zone => {
      const isSel = state.selectedId === zone.id;
      const isMulti = state.multiSelectedIds.includes(zone.id);
      const xPx = zone.x * modPx;
      const yPx = zone.y * modPx;
      const w = zone.w * modPx;
      const h = zone.h * modPx;
      const area = state.getZoneArea(zone);

      const g = this._el('g', { transform: `translate(${xPx}, ${yPx})`, style: 'cursor:grab;', 'data-zone-id': zone.id });

      // Multi-select ring
      if (isMulti) {
        g.appendChild(this._el('rect', { x: -3, y: -3, width: w + 6, height: h + 6, fill: 'none', stroke: '#f59e0b', 'stroke-width': 2, 'stroke-dasharray': '5,3', rx: 3 }));
      }

      // Selection ring with glow
      if (isSel) {
        const sel = this._el('rect', { x: -4, y: -4, width: w + 8, height: h + 8, fill: 'none', stroke: '#3b82f6', 'stroke-width': 2.5, 'stroke-dasharray': '8,4', rx: 3, filter: 'url(#select-glow)' });
        sel.style.animation = 'selectionPulse 1.5s ease-in-out infinite';
        g.appendChild(sel);
      }

      // Zone body with rounded corners
      g.appendChild(this._el('rect', { x: 0, y: 0, width: w, height: h, fill: zone.cor, 'fill-opacity': isSel ? 0.92 : 0.78, stroke: zone.textCor, 'stroke-width': isSel ? 2.5 : 1.5, rx: 4, filter: 'url(#zone-shadow)' }));

      // Gradient shine overlay
      g.appendChild(this._el('rect', { x: 0, y: 0, width: w, height: h, fill: 'url(#zone-shine)', rx: 4 }));

      // Top accent bar
      g.appendChild(this._el('rect', { x: 2, y: 2, width: w - 4, height: 3, fill: zone.textCor, 'fill-opacity': 0.3, rx: 1.5 }));

      // Name
      const maxFontName = Math.min(14, w / Math.max(zone.nome.length * 0.55, 1));
      const nameT = this._el('text', {
        x: w / 2, y: h / 2 - (h > 50 ? 6 : 2),
        'text-anchor': 'middle', fill: zone.textCor,
        'font-size': Math.max(8, maxFontName), 'font-weight': '700',
        'font-family': 'Inter, sans-serif', style: 'pointer-events:none;',
      });
      nameT.textContent = zone.nome;
      g.appendChild(nameT);

      // Area (only if zone is big enough)
      if (h > 35) {
        const areaT = this._el('text', {
          x: w / 2, y: h / 2 + (h > 50 ? 14 : 10),
          'text-anchor': 'middle', fill: zone.textCor, 'fill-opacity': 0.7,
          'font-size': Math.max(8, Math.min(11, w / 8)), 'font-weight': '500',
          'font-family': "'JetBrains Mono', monospace", style: 'pointer-events:none;',
        });
        areaT.textContent = `${area.toFixed(1)} m²`;
        g.appendChild(areaT);
      }

      // ── Resize Handles ──
      if (isSel) {
        const hs = 8;
        // East
        const eH = this._el('rect', { x: w - hs / 2, y: h / 2 - hs / 2, width: hs, height: hs, fill: '#3b82f6', stroke: '#fff', 'stroke-width': 1, rx: 2, style: 'cursor:ew-resize;' });
        eH.addEventListener('mousedown', (e) => this._startResize(e, zone, 'e'));
        g.appendChild(eH);
        // South
        const sH = this._el('rect', { x: w / 2 - hs / 2, y: h - hs / 2, width: hs, height: hs, fill: '#3b82f6', stroke: '#fff', 'stroke-width': 1, rx: 2, style: 'cursor:ns-resize;' });
        sH.addEventListener('mousedown', (e) => this._startResize(e, zone, 's'));
        g.appendChild(sH);
        // Corner
        const cH = this._el('rect', { x: w - hs / 2, y: h - hs / 2, width: hs, height: hs, fill: '#f59e0b', stroke: '#fff', 'stroke-width': 1, rx: 2, style: 'cursor:nwse-resize;' });
        cH.addEventListener('mousedown', (e) => this._startResize(e, zone, 'se'));
        g.appendChild(cH);
      }

      // Events
      g.addEventListener('mousedown', (e) => {
        if (e.target.style.cursor?.includes('resize')) return;
        e.preventDefault();
        if (e.shiftKey) { state.toggleMultiSelect(zone.id); return; }
        state.selectZone(zone.id);
        this._startZoneDrag(e, zone);
      });

      this.zonesLayer.appendChild(g);
    });
  }

  // ── Furniture ──
  _renderFurniture() {
    this.furnitureLayer.innerHTML = '';
    const s = this.scale;
    state.furniture.forEach(item => {
      const isSel = state.selectedFurnitureId === item.id;
      const xPx = item.x * s, yPx = item.y * s, wPx = item.w * s, hPx = item.h * s;

      const g = this._el('g', { transform: `translate(${xPx}, ${yPx})`, style: 'cursor:grab;' });
      if (isSel) g.appendChild(this._el('rect', { x: -2, y: -2, width: wPx + 4, height: hPx + 4, fill: 'none', stroke: '#3b82f6', 'stroke-width': 2, rx: 3, filter: 'url(#furn-glow)' }));
      g.appendChild(this._el('rect', { x: 0, y: 0, width: wPx, height: hPx, fill: isSel ? '#475569' : '#1e293b', stroke: '#64748b', 'stroke-width': 1, rx: 3, 'fill-opacity': 0.95 }));

      const ic = this._el('text', { x: wPx / 2, y: hPx / 2 + 1, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': Math.min(wPx, hPx) * 0.45, style: 'pointer-events:none;' });
      ic.textContent = item.icon;
      g.appendChild(ic);

      g.addEventListener('mousedown', (e) => { e.preventDefault(); this._startFurnitureDrag(e, item); });
      g.addEventListener('dblclick', (e) => { e.stopPropagation(); state.rotateFurniture(item.id); });
      this.furnitureLayer.appendChild(g);
    });
  }

  // ── Guides ──
  _renderGuides() {
    this.guidesLayer.innerHTML = '';
    const s = this.scale;
    const wPx = state.lotWidth * s, hPx = state.lotDepth * s;
    this._guides.forEach(g => {
      const pos = g.pos * s;
      if (g.type === 'v') this.guidesLayer.appendChild(this._el('line', { x1: pos, y1: 0, x2: pos, y2: hPx, stroke: '#f59e0b', 'stroke-width': 1, 'stroke-dasharray': '4,4', opacity: 0.8 }));
      else this.guidesLayer.appendChild(this._el('line', { x1: 0, y1: pos, x2: wPx, y2: pos, stroke: '#f59e0b', 'stroke-width': 1, 'stroke-dasharray': '4,4', opacity: 0.8 }));
    });
  }

  // ── Internal Dims ──
  _renderInternalDimensions() {
    this.internalDimLayer.innerHTML = '';
    const sel = state.getSelectedZone();
    if (!sel) return;
    const s = this.scale;
    const modPx = state.gridModule * s;
    const sx = sel.x * modPx, sy = sel.y * modPx, sw = sel.w * modPx, sh = sel.h * modPx;
    const wM = (sel.w * state.gridModule).toFixed(1), hM = (sel.h * state.gridModule).toFixed(1);

    // Bottom
    const dy = sy + sh + 10;
    this._drawDimLine(sx, dy, sx + sw, dy, `${wM}m`, 'h');
    // Right
    const dx = sx + sw + 10;
    this._drawDimLine(dx, sy, dx, sy + sh, `${hM}m`, 'v');
  }

  _drawDimLine(x1, y1, x2, y2, label, orientation) {
    const g = this.internalDimLayer;
    g.appendChild(this._el('line', { x1, y1, x2, y2, stroke: '#22d3ee', 'stroke-width': 1.2 }));
    g.appendChild(this._el('line', { x1, y1: y1 - 4, x2: x1, y2: y1 + 4, stroke: '#22d3ee', 'stroke-width': 1.2 }));
    g.appendChild(this._el('line', { x1: x2, y1: y2 - 4, x2, y2: y2 + 4, stroke: '#22d3ee', 'stroke-width': 1.2 }));

    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
    const t = this._el('text', {
      x: orientation === 'h' ? midX : 0, y: orientation === 'h' ? midY + 14 : 0,
      'text-anchor': 'middle', fill: '#22d3ee', 'font-size': '10', 'font-weight': '600',
      'font-family': "'JetBrains Mono', monospace",
      ...(orientation === 'v' ? { transform: `translate(${midX + 14}, ${midY}) rotate(90)` } : {}),
    });
    t.textContent = label;
    g.appendChild(t);
  }

  // ── Measurements ──
  _renderMeasurements() {
    this.measureLayer.innerHTML = '';
    const s = this.scale;
    state.measurements.forEach(m => {
      const x1 = m.p1.x * s, y1 = m.p1.y * s, x2 = m.p2.x * s, y2 = m.p2.y * s;
      this.measureLayer.appendChild(this._el('circle', { cx: x1, cy: y1, r: 4, fill: '#f97316', stroke: '#fff', 'stroke-width': 1.5 }));
      this.measureLayer.appendChild(this._el('circle', { cx: x2, cy: y2, r: 4, fill: '#f97316', stroke: '#fff', 'stroke-width': 1.5 }));
      this.measureLayer.appendChild(this._el('line', { x1, y1, x2, y2, stroke: '#f97316', 'stroke-width': 2, 'stroke-dasharray': '6,3' }));
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      this.measureLayer.appendChild(this._el('rect', { x: mx - 28, y: my - 10, width: 56, height: 18, fill: '#0f172a', rx: 4, 'fill-opacity': 0.95, stroke: '#f97316', 'stroke-width': 0.5 }));
      const t = this._el('text', { x: mx, y: my + 3, 'text-anchor': 'middle', fill: '#f97316', 'font-size': '11', 'font-weight': 'bold', 'font-family': "'JetBrains Mono', monospace" });
      t.textContent = `${m.dist.toFixed(2)}m`;
      this.measureLayer.appendChild(t);
    });
    if (state.measurePoints.length === 1) {
      const p = state.measurePoints[0];
      this.measureLayer.appendChild(this._el('circle', { cx: p.x * s, cy: p.y * s, r: 6, fill: 'none', stroke: '#f97316', 'stroke-width': 2 }));
      this.measureLayer.appendChild(this._el('circle', { cx: p.x * s, cy: p.y * s, r: 2, fill: '#f97316' }));
    }
  }

  // ── External Dimensions ──
  _renderDimensions(wPx, hPx) {
    this.dimensionLayer.innerHTML = '';
    const mono = "'JetBrains Mono', monospace";
    const dimOffset = -45;

    // Top dimension
    this.dimensionLayer.appendChild(this._el('line', { x1: 0, y1: dimOffset, x2: wPx, y2: dimOffset, stroke: '#ef4444', 'stroke-width': 1.5 }));
    this.dimensionLayer.appendChild(this._el('line', { x1: 0, y1: dimOffset - 5, x2: 0, y2: dimOffset + 5, stroke: '#ef4444', 'stroke-width': 1.5 }));
    this.dimensionLayer.appendChild(this._el('line', { x1: wPx, y1: dimOffset - 5, x2: wPx, y2: dimOffset + 5, stroke: '#ef4444', 'stroke-width': 1.5 }));
    // Arrows
    this.dimensionLayer.appendChild(this._el('polygon', { points: `8,${dimOffset} 0,${dimOffset - 3} 0,${dimOffset + 3}`, fill: '#ef4444' }));
    this.dimensionLayer.appendChild(this._el('polygon', { points: `${wPx - 8},${dimOffset} ${wPx},${dimOffset - 3} ${wPx},${dimOffset + 3}`, fill: '#ef4444' }));
    // Label background
    const topLabelW = 80;
    this.dimensionLayer.appendChild(this._el('rect', { x: wPx / 2 - topLabelW / 2, y: dimOffset - 12, width: topLabelW, height: 14, fill: '#0a0f1a', rx: 3 }));
    const topT = this._el('text', { x: wPx / 2, y: dimOffset - 1, 'text-anchor': 'middle', fill: '#ef4444', 'font-size': '11', 'font-weight': '600', 'font-family': mono });
    topT.textContent = `${state.lotWidth.toFixed(2)} m`;
    this.dimensionLayer.appendChild(topT);

    // Right dimension
    const rOff = wPx + 45;
    this.dimensionLayer.appendChild(this._el('line', { x1: rOff, y1: 0, x2: rOff, y2: hPx, stroke: '#ef4444', 'stroke-width': 1.5 }));
    this.dimensionLayer.appendChild(this._el('line', { x1: rOff - 5, y1: 0, x2: rOff + 5, y2: 0, stroke: '#ef4444', 'stroke-width': 1.5 }));
    this.dimensionLayer.appendChild(this._el('line', { x1: rOff - 5, y1: hPx, x2: rOff + 5, y2: hPx, stroke: '#ef4444', 'stroke-width': 1.5 }));
    this.dimensionLayer.appendChild(this._el('polygon', { points: `${rOff},8 ${rOff - 3},0 ${rOff + 3},0`, fill: '#ef4444' }));
    this.dimensionLayer.appendChild(this._el('polygon', { points: `${rOff},${hPx - 8} ${rOff - 3},${hPx} ${rOff + 3},${hPx}`, fill: '#ef4444' }));
    const rLabelH = 14;
    this.dimensionLayer.appendChild(this._el('rect', { x: rOff - 40, y: hPx / 2 - rLabelH / 2, width: 80, height: rLabelH, fill: '#0a0f1a', rx: 3, transform: `rotate(90, ${rOff}, ${hPx / 2})` }));
    const rT = this._el('text', { x: 0, y: 0, 'text-anchor': 'middle', fill: '#ef4444', 'font-size': '11', 'font-weight': '600', 'font-family': mono, transform: `translate(${rOff + 4}, ${hPx / 2}) rotate(90)` });
    rT.textContent = `${state.lotDepth.toFixed(2)} m`;
    this.dimensionLayer.appendChild(rT);
  }

  // ── Legend ──
  _renderLegend(wPx, hPx) {
    this.legendLayer.innerHTML = '';
    const ly = hPx + 20;

    // Background
    this.legendLayer.appendChild(this._el('rect', { x: 0, y: ly, width: wPx, height: 48, fill: '#0f172a', rx: 6, stroke: '#1e293b', 'stroke-width': 1 }));

    // North arrow
    const nx = wPx - 28, ny = ly + 15;
    const nG = this._el('g', { transform: `translate(${nx}, ${ny})` });
    nG.appendChild(this._el('circle', { cx: 0, cy: 0, r: 14, fill: 'none', stroke: '#334155', 'stroke-width': 1 }));
    nG.appendChild(this._el('polygon', { points: '0,-10 -4,4 0,-1 4,4', fill: '#ef4444', stroke: 'none' }));
    const nT = this._el('text', { x: 0, y: -16, 'text-anchor': 'middle', fill: '#ef4444', 'font-size': '9', 'font-weight': 'bold', 'font-family': 'Inter, sans-serif' });
    nT.textContent = 'N';
    nG.appendChild(nT);
    this.legendLayer.appendChild(nG);

    // Scale bar
    const sbX = 10, sbY = ly + 36;
    const sbMeters = Math.max(1, Math.round(wPx / this.scale / 8));
    const sbW = sbMeters * this.scale;
    this.legendLayer.appendChild(this._el('rect', { x: sbX, y: sbY - 2, width: sbW / 2, height: 4, fill: '#94a3b8' }));
    this.legendLayer.appendChild(this._el('rect', { x: sbX + sbW / 2, y: sbY - 2, width: sbW / 2, height: 4, fill: '#475569' }));
    this.legendLayer.appendChild(this._el('line', { x1: sbX, y1: sbY - 5, x2: sbX, y2: sbY + 5, stroke: '#94a3b8', 'stroke-width': 1.5 }));
    this.legendLayer.appendChild(this._el('line', { x1: sbX + sbW, y1: sbY - 5, x2: sbX + sbW, y2: sbY + 5, stroke: '#94a3b8', 'stroke-width': 1.5 }));
    const sbT = this._el('text', { x: sbX + sbW / 2, y: sbY - 8, 'text-anchor': 'middle', fill: '#94a3b8', 'font-size': '9', 'font-weight': '500', 'font-family': "'JetBrains Mono', monospace" });
    sbT.textContent = `${sbMeters}m`;
    this.legendLayer.appendChild(sbT);

    // Zone type swatches
    const types = {};
    state.zones.forEach(z => { types[z.tipo] = { cor: z.cor, textCor: z.textCor }; });
    let lx = sbW + 40;
    const lly = ly + 15;
    Object.entries(types).forEach(([tipo, c]) => {
      const label = ZONE_PRESETS[tipo]?.label || tipo;
      this.legendLayer.appendChild(this._el('rect', { x: lx, y: lly - 5, width: 12, height: 12, fill: c.cor, rx: 2, stroke: c.textCor, 'stroke-width': 0.8 }));
      const t = this._el('text', { x: lx + 16, y: lly + 4, fill: '#94a3b8', 'font-size': '9', 'font-family': 'Inter, sans-serif' });
      t.textContent = label;
      this.legendLayer.appendChild(t);
      lx += 16 + label.length * 5.5 + 14;
    });
  }

  // ── Selo Técnico ──
  _renderSelo(wPx, hPx, legendH) {
    this.seloLayer.innerHTML = '';
    const s = state.selo;
    const sy = hPx + legendH + 36;
    const seloW = wPx;
    const seloH = 50;

    // Main frame with gradient
    this.seloLayer.appendChild(this._el('rect', { x: 0, y: sy, width: seloW, height: seloH, fill: '#0f172a', stroke: '#1e3a5f', 'stroke-width': 1.5, rx: 4 }));
    // Top accent line
    this.seloLayer.appendChild(this._el('line', { x1: 0, y1: sy + 1, x2: seloW, y2: sy + 1, stroke: '#3b82f6', 'stroke-width': 2 }));

    // 5 columns
    const cols = [seloW * 0.30, seloW * 0.50, seloW * 0.65, seloW * 0.80];
    cols.forEach(cx => this.seloLayer.appendChild(this._el('line', { x1: cx, y1: sy + 3, x2: cx, y2: sy + seloH, stroke: '#1e293b', 'stroke-width': 1 })));
    this.seloLayer.appendChild(this._el('line', { x1: 2, y1: sy + 18, x2: seloW - 2, y2: sy + 18, stroke: '#1e293b', 'stroke-width': 1 }));

    const hF = { fill: '#64748b', 'font-size': '8', 'font-family': 'Inter, sans-serif', 'text-anchor': 'middle', 'letter-spacing': '0.5' };
    const vF = { fill: '#e2e8f0', 'font-size': '11', 'font-weight': '700', 'font-family': 'Inter, sans-serif', 'text-anchor': 'middle' };
    const headers = ['PROJETO', 'AUTOR', 'ESCALA', 'DATA', 'REVISÃO'];
    const positions = [cols[0] / 2, (cols[0] + cols[1]) / 2, (cols[1] + cols[2]) / 2, (cols[2] + cols[3]) / 2, (cols[3] + seloW) / 2];
    const values = [s.projeto, s.autor, s.escala, s.data, s.revisao];

    headers.forEach((h, i) => {
      const ht = this._el('text', { x: positions[i], y: sy + 13, ...hF }); ht.textContent = h; this.seloLayer.appendChild(ht);
      const vt = this._el('text', { x: positions[i], y: sy + 36, ...vF }); vt.textContent = values[i]; this.seloLayer.appendChild(vt);
    });

    const brand = this._el('text', { x: seloW - 4, y: sy + seloH - 3, 'text-anchor': 'end', fill: '#1e293b', 'font-size': '7', 'font-family': 'Inter, sans-serif' });
    brand.textContent = 'GeneratorPlant v3.0';
    this.seloLayer.appendChild(brand);
  }

  // ── Helper ──
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
    const a = document.createElement('a'); a.href = u; a.download = `GeneratorPlant.svg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
  }

  async exportPNG() {
    const d = await this.toDataURL('image/png');
    const a = document.createElement('a'); a.href = d; a.download = `GeneratorPlant.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  async exportPDF() {
    const svgData = new XMLSerializer().serializeToString(this.svg);
    const pw = window.open('', '_blank');
    pw.document.write(`<!DOCTYPE html><html><head><title>GeneratorPlant — ${state.selo.projeto}</title>
      <style>@page{size:A3 landscape;margin:10mm}body{margin:0;display:flex;align-items:center;justify-content:center;background:#fff}svg{max-width:100%;max-height:100vh}</style>
    </head><body>${svgData}</body></html>`);
    pw.document.close();
    setTimeout(() => pw.print(), 500);
  }
}
