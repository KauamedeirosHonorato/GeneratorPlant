/* ========================================
   APP STATE — Pub/Sub State Management
   Advanced Edition: Multi-Select, Measurement, Selo
   ======================================== */

// Zone color palette
const ZONE_PRESETS = {
  publico:   { cor: '#dcfce7', textCor: '#166534', label: 'Público / Lazer' },
  comercial: { cor: '#fef08a', textCor: '#854d0e', label: 'Comercial' },
  servico:   { cor: '#e2e8f0', textCor: '#475569', label: 'Serviços / Apoio' },
  cultura:   { cor: '#bae6fd', textCor: '#0369a1', label: 'Cultura / Ensino' },
  intimo:    { cor: '#fce7f3', textCor: '#9d174d', label: 'Íntimo / Privativo' },
};

const ZONE_COLORS = [
  { cor: '#dcfce7', textCor: '#166534' },
  { cor: '#fef08a', textCor: '#854d0e' },
  { cor: '#fed7aa', textCor: '#c2410c' },
  { cor: '#e2e8f0', textCor: '#475569' },
  { cor: '#bae6fd', textCor: '#0369a1' },
  { cor: '#fce7f3', textCor: '#9d174d' },
  { cor: '#cbd5e1', textCor: '#334155' },
  { cor: '#c4b5fd', textCor: '#5b21b6' },
  { cor: '#fecaca', textCor: '#991b1b' },
  { cor: '#a7f3d0', textCor: '#065f46' },
  { cor: '#fde68a', textCor: '#92400e' },
  { cor: '#ddd6fe', textCor: '#4c1d95' },
];

// Furniture Library
const FURNITURE_LIBRARY = {
  escritorio: {
    label: 'Escritório',
    items: [
      { id: 'desk', nome: 'Mesa de Trabalho', icon: '🖥️', w: 1.4, h: 0.7 },
      { id: 'chair', nome: 'Cadeira', icon: '🪑', w: 0.5, h: 0.5 },
      { id: 'meeting-table', nome: 'Mesa de Reunião', icon: '🪵', w: 2.4, h: 1.2 },
      { id: 'bookshelf', nome: 'Estante', icon: '📚', w: 1.2, h: 0.4 },
      { id: 'filing-cabinet', nome: 'Arquivo', icon: '🗄️', w: 0.5, h: 0.6 },
      { id: 'sofa', nome: 'Sofá', icon: '🛋️', w: 2.0, h: 0.8 },
    ]
  },
  sanitario: {
    label: 'Sanitário',
    items: [
      { id: 'toilet', nome: 'Vaso Sanitário', icon: '🚽', w: 0.4, h: 0.7 },
      { id: 'sink', nome: 'Pia', icon: '🚰', w: 0.5, h: 0.4 },
      { id: 'shower', nome: 'Box/Chuveiro', icon: '🚿', w: 0.9, h: 0.9 },
    ]
  },
  seguranca: {
    label: 'Segurança',
    items: [
      { id: 'extinguisher', nome: 'Extintor', icon: '🧯', w: 0.3, h: 0.3 },
      { id: 'exit', nome: 'Saída Emergência', icon: '🚪', w: 1.0, h: 0.15 },
    ]
  },
  infraestrutura: {
    label: 'Infra',
    items: [
      { id: 'elevator', nome: 'Elevador', icon: '🛗', w: 2.0, h: 2.0 },
      { id: 'stairs', nome: 'Escada', icon: '🪜', w: 3.0, h: 1.5 },
      { id: 'pillar', nome: 'Pilar Circular', icon: '⊙', w: 0.4, h: 0.4 },
    ]
  },
};

// Enterprise Templates
const TEMPLATES = {
  empty: { label: '🗋 Terreno Vazio', lotWidth: 30, lotDepth: 20, gridModule: 6, zones: [], furniture: [] },
  office: {
    label: '🏢 Escritório Corporativo', lotWidth: 36, lotDepth: 24, gridModule: 6,
    zones: [
      { id: 't_recepcao', nome: 'Recepção', cor: '#fef08a', textCor: '#854d0e', x: 0, y: 0, w: 2, h: 1, tipo: 'comercial' },
      { id: 't_openspace', nome: 'Open Space', cor: '#bae6fd', textCor: '#0369a1', x: 2, y: 0, w: 3, h: 2, tipo: 'comercial' },
      { id: 't_reuniao', nome: 'Sala de Reunião', cor: '#dcfce7', textCor: '#166534', x: 0, y: 1, w: 2, h: 1.5, tipo: 'servico' },
      { id: 't_copa', nome: 'Copa / Cozinha', cor: '#fed7aa', textCor: '#c2410c', x: 5, y: 0, w: 1, h: 1, tipo: 'servico' },
      { id: 't_sanit', nome: 'Sanitários', cor: '#cbd5e1', textCor: '#334155', x: 5, y: 1, w: 1, h: 1, tipo: 'servico' },
      { id: 't_diretoria', nome: 'Diretoria', cor: '#fce7f3', textCor: '#9d174d', x: 0, y: 2.5, w: 2, h: 1.5, tipo: 'intimo' },
      { id: 't_server', nome: 'Sala Técnica', cor: '#e2e8f0', textCor: '#475569', x: 5, y: 2, w: 1, h: 2, tipo: 'servico' },
    ], furniture: [],
  },
  clinic: {
    label: '🏥 Clínica / Consultório', lotWidth: 30, lotDepth: 18, gridModule: 6,
    zones: [
      { id: 't_espera', nome: 'Sala de Espera', cor: '#dcfce7', textCor: '#166534', x: 0, y: 0, w: 2, h: 1.5, tipo: 'publico' },
      { id: 't_recepcao', nome: 'Recepção', cor: '#fef08a', textCor: '#854d0e', x: 2, y: 0, w: 1, h: 1, tipo: 'comercial' },
      { id: 't_consul1', nome: 'Consultório 1', cor: '#bae6fd', textCor: '#0369a1', x: 3, y: 0, w: 1, h: 1.5, tipo: 'servico' },
      { id: 't_consul2', nome: 'Consultório 2', cor: '#bae6fd', textCor: '#0369a1', x: 4, y: 0, w: 1, h: 1.5, tipo: 'servico' },
      { id: 't_sanit', nome: 'Sanitários', cor: '#cbd5e1', textCor: '#334155', x: 2, y: 1, w: 1, h: 1, tipo: 'servico' },
      { id: 't_farmacia', nome: 'Farmácia', cor: '#c4b5fd', textCor: '#5b21b6', x: 0, y: 1.5, w: 2, h: 1.5, tipo: 'servico' },
    ], furniture: [],
  },
  restaurant: {
    label: '🍽️ Restaurante', lotWidth: 24, lotDepth: 18, gridModule: 6,
    zones: [
      { id: 't_salao', nome: 'Salão Principal', cor: '#fef08a', textCor: '#854d0e', x: 0, y: 0, w: 3, h: 2, tipo: 'comercial' },
      { id: 't_cozinha', nome: 'Cozinha', cor: '#e2e8f0', textCor: '#475569', x: 3, y: 0, w: 1, h: 2, tipo: 'servico' },
      { id: 't_bar', nome: 'Bar / Balcão', cor: '#fed7aa', textCor: '#c2410c', x: 0, y: 2, w: 2, h: 1, tipo: 'comercial' },
      { id: 't_sanit', nome: 'Sanitários', cor: '#cbd5e1', textCor: '#334155', x: 2, y: 2, w: 1, h: 1, tipo: 'servico' },
      { id: 't_estoque', nome: 'Estoque', cor: '#cbd5e1', textCor: '#334155', x: 3, y: 2, w: 1, h: 1, tipo: 'servico' },
    ], furniture: [],
  },
  retail: {
    label: '🛍️ Loja de Varejo', lotWidth: 24, lotDepth: 15, gridModule: 5,
    zones: [
      { id: 't_vitrine', nome: 'Vitrine', cor: '#fef08a', textCor: '#854d0e', x: 0, y: 0, w: 3, h: 0.5, tipo: 'comercial' },
      { id: 't_vendas', nome: 'Área de Vendas', cor: '#dcfce7', textCor: '#166534', x: 0, y: 0.5, w: 3, h: 1.5, tipo: 'comercial' },
      { id: 't_caixa', nome: 'Caixa', cor: '#fed7aa', textCor: '#c2410c', x: 3, y: 0, w: 1, h: 1, tipo: 'servico' },
      { id: 't_estoque', nome: 'Estoque', cor: '#e2e8f0', textCor: '#475569', x: 3, y: 1, w: 1, h: 1, tipo: 'servico' },
      { id: 't_admin', nome: 'Escritório', cor: '#cbd5e1', textCor: '#334155', x: 0, y: 2, w: 2, h: 1, tipo: 'servico' },
    ], furniture: [],
  },
};

class AppState {
  constructor() {
    this._listeners = {};
    this._history = [];
    this._historyIndex = -1;
    this._maxHistory = 50;
    this._batchingHistory = false;

    // Lot
    this.lotWidth = 39.00;
    this.lotDepth = 27.00;

    // Grid
    this.gridModule = 6.0;

    // Streets
    this.streets = { top: 'Rua Néo Alves Martins', bottom: '', left: 'Av. Getúlio Vargas', right: '' };

    // Zones
    this.zones = [
      { id: 'praca', nome: 'Praça de Convívio', cor: '#dcfce7', textCor: '#166534', x: 4.5, y: 0, w: 2, h: 2, tipo: 'publico' },
      { id: 'cafe', nome: 'Café', cor: '#fef08a', textCor: '#854d0e', x: 2.5, y: 0, w: 2, h: 1, tipo: 'comercial' },
      { id: 'livraria', nome: 'Livraria', cor: '#fed7aa', textCor: '#c2410c', x: 0, y: 0, w: 2.5, h: 2, tipo: 'comercial' },
      { id: 'recepcao', nome: 'Recepção / Admin', cor: '#e2e8f0', textCor: '#475569', x: 2.5, y: 1, w: 2, h: 1, tipo: 'servico' },
      { id: 'auditorio', nome: 'Auditório (150p)', cor: '#bae6fd', textCor: '#0369a1', x: 0, y: 2, w: 3, h: 2.5, tipo: 'cultura' },
      { id: 'sanitarios', nome: 'Sanitários / DML', cor: '#cbd5e1', textCor: '#334155', x: 3, y: 2, w: 2, h: 1.5, tipo: 'servico' },
    ];

    // Furniture
    this.furniture = [];

    // Selection
    this.selectedId = null;
    this.selectedFurnitureId = null;
    this.multiSelectedIds = []; // Multi-select

    // Zoom + Pan
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;

    // Tools
    this.activeTool = 'select'; // 'select' | 'measure'
    this.measurePoints = []; // [{x,y}, {x,y}]
    this.measurements = []; // Saved measurements

    // Title Block / Selo
    this.selo = {
      projeto: 'Projeto Comercial',
      autor: 'Arquiteto',
      escala: '1:100',
      data: new Date().toLocaleDateString('pt-BR'),
      revisao: 'R0',
    };

    this._saveHistory();
  }

  // ═══════ PUB/SUB ═══════
  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
    return () => { this._listeners[event] = this._listeners[event].filter(c => c !== cb); };
  }
  emit(event, data) { (this._listeners[event] || []).forEach(cb => cb(data)); }

  // ═══════ UNDO / REDO ═══════
  _getSnapshot() {
    return JSON.stringify({
      lotWidth: this.lotWidth, lotDepth: this.lotDepth, gridModule: this.gridModule,
      streets: { ...this.streets },
      zones: this.zones.map(z => ({ ...z })),
      furniture: this.furniture.map(f => ({ ...f })),
      measurements: this.measurements.map(m => ({ ...m })),
    });
  }

  _saveHistory() {
    if (this._batchingHistory) return;
    const snapshot = this._getSnapshot();
    if (this._history[this._historyIndex] === snapshot) return;
    this._history = this._history.slice(0, this._historyIndex + 1);
    this._history.push(snapshot);
    if (this._history.length > this._maxHistory) this._history.shift();
    this._historyIndex = this._history.length - 1;
    this.emit('history-change');
  }

  _restoreSnapshot(s) {
    const d = JSON.parse(s);
    this.lotWidth = d.lotWidth; this.lotDepth = d.lotDepth; this.gridModule = d.gridModule;
    this.streets = d.streets; this.zones = d.zones; this.furniture = d.furniture || [];
    this.measurements = d.measurements || [];
    this.selectedId = null; this.selectedFurnitureId = null; this.multiSelectedIds = [];
    this.emit('lot-change'); this.emit('grid-change'); this.emit('zones-change');
    this.emit('selection-change'); this.emit('render');
  }

  undo() { if (this._historyIndex <= 0) return; this._historyIndex--; this._restoreSnapshot(this._history[this._historyIndex]); this.emit('history-change'); }
  redo() { if (this._historyIndex >= this._history.length - 1) return; this._historyIndex++; this._restoreSnapshot(this._history[this._historyIndex]); this.emit('history-change'); }
  canUndo() { return this._historyIndex > 0; }
  canRedo() { return this._historyIndex < this._history.length - 1; }
  beginBatch() { this._batchingHistory = true; }
  endBatch() { this._batchingHistory = false; this._saveHistory(); }

  // ═══════ LOT ═══════
  setLotWidth(v) { this.lotWidth = Math.max(5, Math.min(200, Number(v) || 5)); this.emit('lot-change'); this.emit('render'); this._saveHistory(); }
  setLotDepth(v) { this.lotDepth = Math.max(5, Math.min(200, Number(v) || 5)); this.emit('lot-change'); this.emit('render'); this._saveHistory(); }
  getLotArea() { return this.lotWidth * this.lotDepth; }

  // ═══════ GRID ═══════
  setGridModule(v) {
    const oldMod = this.gridModule;
    const newMod = Math.max(1, Math.min(12, Number(v) || 6));
    if (newMod === oldMod) return;

    // Rescale all zones proportionally: convert module-units to meters, then back
    const ratio = oldMod / newMod;
    this.zones.forEach(z => {
      z.x = z.x * ratio;
      z.y = z.y * ratio;
      z.w = Math.max(0.5, z.w * ratio);
      z.h = Math.max(0.5, z.h * ratio);
    });

    // Rescale furniture (already in meters, no change needed)

    this.gridModule = newMod;
    this.emit('grid-change');
    this.emit('zones-change');
    this.emit('render');
    this._saveHistory();
  }

  // ═══════ STREETS ═══════
  setStreet(side, name) { this.streets[side] = name; this.emit('render'); }

  // ═══════ ZONES ═══════
  addZone(nome, tipo) {
    const preset = ZONE_PRESETS[tipo] || ZONE_PRESETS.comercial;
    const id = `zone_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.zones.push({ id, nome, cor: preset.cor, textCor: preset.textCor, x: 0, y: 0, w: 2, h: 2, tipo });
    this.selectedId = id; this.selectedFurnitureId = null; this.multiSelectedIds = [];
    this.emit('zones-change'); this.emit('selection-change'); this.emit('render');
    this._saveHistory(); return id;
  }

  removeZone(id) {
    this.zones = this.zones.filter(z => z.id !== id);
    if (this.selectedId === id) { this.selectedId = null; this.emit('selection-change'); }
    this.multiSelectedIds = this.multiSelectedIds.filter(i => i !== id);
    this.emit('zones-change'); this.emit('render'); this._saveHistory();
  }

  selectZone(id) {
    this.selectedId = id; this.selectedFurnitureId = null; this.multiSelectedIds = [];
    this.emit('selection-change'); this.emit('render');
  }

  toggleMultiSelect(id) {
    if (this.multiSelectedIds.includes(id)) {
      this.multiSelectedIds = this.multiSelectedIds.filter(i => i !== id);
    } else {
      this.multiSelectedIds.push(id);
      if (!this.multiSelectedIds.includes(this.selectedId) && this.selectedId) {
        this.multiSelectedIds.push(this.selectedId);
      }
    }
    this.selectedId = id; this.selectedFurnitureId = null;
    this.emit('selection-change'); this.emit('render');
  }

  getSelectedZone() { return this.zones.find(z => z.id === this.selectedId) || null; }

  updateZone(id, updates) {
    const zone = this.zones.find(z => z.id === id);
    if (zone) { Object.assign(zone, updates); this.emit('zones-change'); this.emit('render'); }
  }

  moveZone(dx, dy) {
    const zone = this.getSelectedZone();
    if (!zone) return;
    const maxX = this.lotWidth / this.gridModule - zone.w;
    const maxY = this.lotDepth / this.gridModule - zone.h;
    zone.x = Math.max(0, Math.min(maxX, zone.x + dx));
    zone.y = Math.max(0, Math.min(maxY, zone.y + dy));
    this.emit('zones-change'); this.emit('render'); this._saveHistory();
  }

  moveZoneAbsolute(id, x, y) {
    const zone = this.zones.find(z => z.id === id);
    if (!zone) return;
    const maxX = this.lotWidth / this.gridModule - zone.w;
    const maxY = this.lotDepth / this.gridModule - zone.h;
    zone.x = Math.max(0, Math.min(maxX, Math.round(x * 2) / 2));
    zone.y = Math.max(0, Math.min(maxY, Math.round(y * 2) / 2));
    this.emit('zones-change'); this.emit('render');
  }

  resizeZone(dw, dh) {
    const zone = this.getSelectedZone();
    if (!zone) return;
    zone.w = Math.max(0.5, zone.w + dw);
    zone.h = Math.max(0.5, zone.h + dh);
    this.emit('zones-change'); this.emit('render'); this._saveHistory();
  }

  resizeZoneAbsolute(id, w, h) {
    const zone = this.zones.find(z => z.id === id);
    if (!zone) return;
    zone.w = Math.max(0.5, Math.round(w * 2) / 2);
    zone.h = Math.max(0.5, Math.round(h * 2) / 2);
    this.emit('zones-change'); this.emit('render');
  }

  // ═══════ MULTI-SELECT ALIGNMENT ═══════
  getMultiSelectedZones() {
    if (this.multiSelectedIds.length > 0) return this.zones.filter(z => this.multiSelectedIds.includes(z.id));
    return this.selectedId ? [this.getSelectedZone()].filter(Boolean) : [];
  }

  alignZones(alignment) {
    const zones = this.getMultiSelectedZones();
    if (zones.length < 2) return;
    const mod = this.gridModule;

    if (alignment === 'left') {
      const minX = Math.min(...zones.map(z => z.x));
      zones.forEach(z => z.x = minX);
    } else if (alignment === 'right') {
      const maxR = Math.max(...zones.map(z => z.x + z.w));
      zones.forEach(z => z.x = maxR - z.w);
    } else if (alignment === 'top') {
      const minY = Math.min(...zones.map(z => z.y));
      zones.forEach(z => z.y = minY);
    } else if (alignment === 'bottom') {
      const maxB = Math.max(...zones.map(z => z.y + z.h));
      zones.forEach(z => z.y = maxB - z.h);
    } else if (alignment === 'center-h') {
      const avgX = zones.reduce((s, z) => s + z.x + z.w / 2, 0) / zones.length;
      zones.forEach(z => z.x = Math.max(0, Math.round((avgX - z.w / 2) * 2) / 2));
    } else if (alignment === 'center-v') {
      const avgY = zones.reduce((s, z) => s + z.y + z.h / 2, 0) / zones.length;
      zones.forEach(z => z.y = Math.max(0, Math.round((avgY - z.h / 2) * 2) / 2));
    } else if (alignment === 'distribute-h') {
      zones.sort((a, b) => a.x - b.x);
      const minX = zones[0].x;
      const maxR = zones[zones.length - 1].x + zones[zones.length - 1].w;
      const totalW = zones.reduce((s, z) => s + z.w, 0);
      const gap = (maxR - minX - totalW) / (zones.length - 1);
      let cx = minX;
      zones.forEach(z => { z.x = Math.round(cx * 2) / 2; cx += z.w + gap; });
    }
    this.emit('zones-change'); this.emit('render'); this._saveHistory();
  }

  // ═══════ FURNITURE ═══════
  addFurniture(templateId) {
    let template = null;
    for (const cat of Object.values(FURNITURE_LIBRARY)) {
      template = cat.items.find(i => i.id === templateId);
      if (template) break;
    }
    if (!template) return null;
    const id = `furn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    this.furniture.push({ id, templateId: template.id, nome: template.nome, icon: template.icon, x: 1, y: 1, w: template.w, h: template.h, rotation: 0 });
    this.selectedFurnitureId = id; this.selectedId = null; this.multiSelectedIds = [];
    this.emit('furniture-change'); this.emit('selection-change'); this.emit('render');
    this._saveHistory(); return id;
  }

  removeFurniture(id) {
    this.furniture = this.furniture.filter(f => f.id !== id);
    if (this.selectedFurnitureId === id) { this.selectedFurnitureId = null; this.emit('selection-change'); }
    this.emit('furniture-change'); this.emit('render'); this._saveHistory();
  }

  selectFurniture(id) {
    this.selectedFurnitureId = id; this.selectedId = null; this.multiSelectedIds = [];
    this.emit('selection-change'); this.emit('render');
  }

  moveFurnitureAbsolute(id, x, y) {
    const item = this.furniture.find(f => f.id === id);
    if (!item) return;
    item.x = Math.max(0, Math.round(x * 10) / 10);
    item.y = Math.max(0, Math.round(y * 10) / 10);
    this.emit('furniture-change'); this.emit('render');
  }

  rotateFurniture(id) {
    const item = this.furniture.find(f => f.id === id);
    if (!item) return;
    item.rotation = (item.rotation + 90) % 360;
    const tmp = item.w; item.w = item.h; item.h = tmp;
    this.emit('furniture-change'); this.emit('render'); this._saveHistory();
  }

  // ═══════ MEASUREMENTS ═══════
  setTool(tool) { this.activeTool = tool; this.measurePoints = []; this.emit('tool-change'); }

  addMeasurePoint(x, y) {
    this.measurePoints.push({ x, y });
    if (this.measurePoints.length === 2) {
      const [a, b] = this.measurePoints;
      const dist = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
      this.measurements.push({ p1: { ...a }, p2: { ...b }, dist });
      this.measurePoints = [];
      this.emit('render');
      this._saveHistory();
    }
    this.emit('render');
  }

  clearMeasurements() { this.measurements = []; this.emit('render'); this._saveHistory(); }

  // ═══════ SELO ═══════
  updateSelo(field, value) { this.selo[field] = value; this.emit('render'); }

  // ═══════ CALCULATIONS ═══════
  getAreaUtil() { return this.zones.reduce((acc, z) => acc + (z.w * this.gridModule) * (z.h * this.gridModule), 0); }
  getAreaComCirculacao() { return this.getAreaUtil() * 1.40; }
  getTaxaOcupacao() { return (this.getAreaComCirculacao() / this.getLotArea()) * 100; }
  getZoneArea(zone) { return (zone.w * this.gridModule) * (zone.h * this.gridModule); }

  // ═══════ ZOOM / PAN ═══════
  setZoom(level) { this.zoomLevel = Math.max(0.3, Math.min(3.0, level)); this.emit('zoom-change'); this.emit('render'); }
  zoomIn() { this.setZoom(this.zoomLevel + 0.1); }
  zoomOut() { this.setZoom(this.zoomLevel - 0.1); }
  resetZoom() { this.setZoom(1.0); this.panX = 0; this.panY = 0; this.emit('pan-change'); this.emit('render'); }
  setPan(x, y) { this.panX = x; this.panY = y; this.emit('pan-change'); }

  // ═══════ ALIGNMENT GUIDES ═══════
  getAlignmentGuides(draggingZoneId, dragX, dragY) {
    const guides = [];
    const mod = this.gridModule;
    const zone = this.zones.find(z => z.id === draggingZoneId);
    if (!zone) return guides;

    const SNAP = 0.3; // modules tolerance
    const dx = dragX, dy = dragY;
    const dw = zone.w, dh = zone.h;

    this.zones.forEach(other => {
      if (other.id === draggingZoneId) return;

      // Left-left
      if (Math.abs(dx - other.x) < SNAP) guides.push({ type: 'v', pos: other.x * mod });
      // Right-right
      if (Math.abs(dx + dw - other.x - other.w) < SNAP) guides.push({ type: 'v', pos: (other.x + other.w) * mod });
      // Left-right
      if (Math.abs(dx - other.x - other.w) < SNAP) guides.push({ type: 'v', pos: (other.x + other.w) * mod });
      // Right-left
      if (Math.abs(dx + dw - other.x) < SNAP) guides.push({ type: 'v', pos: other.x * mod });
      // Top-top
      if (Math.abs(dy - other.y) < SNAP) guides.push({ type: 'h', pos: other.y * mod });
      // Bottom-bottom
      if (Math.abs(dy + dh - other.y - other.h) < SNAP) guides.push({ type: 'h', pos: (other.y + other.h) * mod });
      // Top-bottom
      if (Math.abs(dy - other.y - other.h) < SNAP) guides.push({ type: 'h', pos: (other.y + other.h) * mod });
      // Bottom-top
      if (Math.abs(dy + dh - other.y) < SNAP) guides.push({ type: 'h', pos: other.y * mod });
    });

    return guides;
  }

  // ═══════ SAVE / LOAD ═══════
  toJSON() {
    return {
      version: 3, lotWidth: this.lotWidth, lotDepth: this.lotDepth, gridModule: this.gridModule,
      streets: { ...this.streets }, zones: this.zones.map(z => ({ ...z })),
      furniture: this.furniture.map(f => ({ ...f })), measurements: this.measurements.map(m => ({ ...m })),
      selo: { ...this.selo }, savedAt: new Date().toISOString(),
    };
  }

  loadFromJSON(data) {
    if (!data || !data.zones) return false;
    this.lotWidth = data.lotWidth || 30; this.lotDepth = data.lotDepth || 20;
    this.gridModule = data.gridModule || 6;
    this.streets = data.streets || { top: '', bottom: '', left: '', right: '' };
    this.zones = data.zones.map(z => ({ ...z }));
    this.furniture = (data.furniture || []).map(f => ({ ...f }));
    this.measurements = (data.measurements || []).map(m => ({ ...m }));
    if (data.selo) this.selo = { ...this.selo, ...data.selo };
    this.selectedId = null; this.selectedFurnitureId = null; this.multiSelectedIds = [];
    this.emit('lot-change'); this.emit('grid-change'); this.emit('zones-change');
    this.emit('furniture-change'); this.emit('selection-change'); this.emit('render');
    this._saveHistory(); return true;
  }

  saveToLocalStorage() { try { localStorage.setItem('generatorplant_project', JSON.stringify(this.toJSON())); return true; } catch(e) { return false; } }
  loadFromLocalStorage() { try { const d = localStorage.getItem('generatorplant_project'); if (d) return this.loadFromJSON(JSON.parse(d)); } catch(e) {} return false; }

  downloadJSON() {
    const blob = new Blob([JSON.stringify(this.toJSON(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `GeneratorPlant_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  uploadJSON() {
    return new Promise(resolve => {
      const input = document.createElement('input'); input.type = 'file'; input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0]; if (!file) { resolve(false); return; }
        const reader = new FileReader();
        reader.onload = (ev) => { try { resolve(this.loadFromJSON(JSON.parse(ev.target.result))); } catch(err) { resolve(false); } };
        reader.readAsText(file);
      };
      input.click();
    });
  }

  loadTemplate(id) {
    const tpl = TEMPLATES[id]; if (!tpl) return false;
    return this.loadFromJSON({ lotWidth: tpl.lotWidth, lotDepth: tpl.lotDepth, gridModule: tpl.gridModule, streets: { top: '', bottom: '', left: '', right: '' }, zones: tpl.zones, furniture: tpl.furniture || [] });
  }
}

const state = new AppState();
export default state;
export { ZONE_PRESETS, ZONE_COLORS, FURNITURE_LIBRARY, TEMPLATES };
