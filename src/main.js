/* ========================================
   MAIN — GeneratorPlant Advanced
   ======================================== */
import './styles/main.css';
import state from './state/AppState.js';
import Sidebar from './components/Sidebar.js';
import FloorPlanEngine from './canvas/FloorPlanEngine.js';

let engine;

function init() {
  const sidebar = new Sidebar();
  engine = new FloorPlanEngine('canvasContainer');

  // Zoom controls
  document.getElementById('zoomIn').addEventListener('click', () => state.zoomIn());
  document.getElementById('zoomOut').addEventListener('click', () => state.zoomOut());
  document.getElementById('resetView').addEventListener('click', () => state.resetZoom());

  // Export
  document.getElementById('exportPng').addEventListener('click', () => engine.exportPNG());
  document.getElementById('exportSvg').addEventListener('click', () => engine.exportSVG());
  document.getElementById('exportPdf').addEventListener('click', () => engine.exportPDF());

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    // Undo/Redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); state.undo(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'Z' || e.key === 'y')) { e.preventDefault(); state.redo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); state.saveToLocalStorage(); return; }

    // Measure tool: M
    if (e.key === 'm' || e.key === 'M') { state.setTool(state.activeTool === 'measure' ? 'select' : 'measure'); return; }

    // Zone movement
    const zone = state.getSelectedZone();
    if (zone) {
      switch (e.key) {
        case 'ArrowUp': e.preventDefault(); state.moveZone(0, -0.5); break;
        case 'ArrowDown': e.preventDefault(); state.moveZone(0, 0.5); break;
        case 'ArrowLeft': e.preventDefault(); state.moveZone(-0.5, 0); break;
        case 'ArrowRight': e.preventDefault(); state.moveZone(0.5, 0); break;
        case 'Delete': case 'Backspace': e.preventDefault(); state.removeZone(state.selectedId); break;
        case 'Escape': state.selectZone(null); break;
      }
      return;
    }

    // Furniture
    if (state.selectedFurnitureId) {
      switch (e.key) {
        case 'Delete': case 'Backspace': e.preventDefault(); state.removeFurniture(state.selectedFurnitureId); break;
        case 'r': case 'R': e.preventDefault(); state.rotateFurniture(state.selectedFurnitureId); break;
        case 'Escape': state.selectedFurnitureId = null; state.emit('selection-change'); state.emit('render'); break;
      }
    }
  });

  // Selection pulse animation
  const style = document.createElement('style');
  style.textContent = `@keyframes selectionPulse { 0%, 100% { stroke-opacity: 1; } 50% { stroke-opacity: 0.4; } }`;
  document.head.appendChild(style);

  // Auto-load saved project
  state.loadFromLocalStorage();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
