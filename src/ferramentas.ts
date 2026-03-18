// ===== FERRAMENTAS — DaSIboard TypeScript =====

import { escapeHTML, showToast } from './utils';

// ── Tipos ─────────────────────────────────────────────────────────────────────
type ToolName =
  | 'pomodoro' | 'notas' | 'checklist' | 'sorteio'
  | 'calculadora' | 'stopwatch' | 'conversor' | 'citacoes'
  | 'plagio' | 'flashcard';

type PomodoroState = 'idle' | 'focus' | 'break' | 'longbreak';

interface PomodoroConfig {
  focus: number;
  shortBreak: number;
  longBreak: number;
  cycles: number;
}

interface ChecklistItem {
  text: string;
  done: boolean;
}

interface CalcNota {
  label: string;
  nota: string;
  peso: string;
}

interface CalcDisciplina {
  nome: string;
  notas: CalcNota[];
}

interface Flashcard {
  front: string;
  back: string;
}

interface FlashcardSession {
  correct: number;
  wrong: number;
  skipped: number;
}

interface ConvCat {
  label: string;
  units?: Record<string, number>;
  special?: boolean;
}

// ── Estado global das ferramentas ─────────────────────────────────────────────
let currentTool: ToolName | null = null;

// Pomodoro
let pomodoroTimer: ReturnType<typeof setInterval> | null = null;
let pomodoroState: PomodoroState = 'idle';
let pomodoroSecondsLeft = 0;
let pomodoroCyclesDone = 0;
const pomodoroConfig: PomodoroConfig = { focus: 25, shortBreak: 5, longBreak: 15, cycles: 4 };

// Stopwatch
let stopwatchTimer: ReturnType<typeof setInterval> | null = null;
let stopwatchMs = 0;
let stopwatchLaps: number[] = [];
let stopwatchRunning = false;

// Checklist
let checklistItems: ChecklistItem[] = JSON.parse(
  localStorage.getItem('dasi-checklist') ?? '[]',
);

// Calculadora
let calcDisciplinas: CalcDisciplina[] = JSON.parse(
  localStorage.getItem('dasi-calc') ?? '[]',
);

// Flashcards
let fcCards: Flashcard[] = [];
let fcIndex = 0;
let fcFlipped = false;
let fcSession: FlashcardSession = { correct: 0, wrong: 0, skipped: 0 };

// Conversor
const _convCats: Record<string, ConvCat> = {
  comprimento: { label: 'Comprimento', units: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.34, ft: 0.3048, in: 0.0254 } },
  massa:       { label: 'Massa',       units: { kg: 1, g: 0.001, mg: 0.000001, lb: 0.453592, oz: 0.0283495, t: 1000 } },
  temperatura: { label: 'Temperatura', special: true },
  dados:       { label: 'Dados',       units: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 } },
  velocidade:  { label: 'Velocidade',  units: { 'm/s': 1, 'km/h': 0.277778, 'mph': 0.44704, 'knot': 0.514444 } },
  tempo:       { label: 'Tempo',       units: { s: 1, min: 60, h: 3600, d: 86400, semana: 604800 } },
  area:        { label: 'Área',        units: { 'm²': 1, 'km²': 1e6, 'cm²': 0.0001, ha: 10000, 'ft²': 0.092903 } },
};
let _convCat = '';

// ── Abertura e fechamento de ferramentas ──────────────────────────────────────
export function openTool(name: ToolName): void {
  currentTool = name;
  const grid = document.getElementById('tools-selector-grid');
  const panel = document.getElementById('tool-panel');
  const title = document.getElementById('tool-panel-title');
  const content = document.getElementById('tool-panel-content');

  document.querySelectorAll('.tool-card').forEach((c) => c.classList.remove('active'));
  document.querySelector(`[data-tool="${name}"]`)?.classList.add('active');

  if (grid) grid.style.display = 'none';
  panel?.classList.remove('hidden');

  const toolMeta: Record<ToolName, string> = {
    pomodoro:    '🍅 Pomodoro',
    notas:       '📝 Notas Rápidas',
    checklist:   '✅ Checklist',
    sorteio:     '🎲 Sorteio',
    calculadora: '🧮 Média de Notas',
    stopwatch:   '⏱️ Cronômetro',
    conversor:   '🔄 Conversor de Unidades',
    citacoes:    '📖 Gerador de Citação ABNT',
    plagio:      '🔍 Checklist Anti-Plágio',
    flashcard:   '🃏 Flashcards',
  };
  if (title) title.textContent = toolMeta[name] ?? name;

  const renderers: Record<ToolName, (c: HTMLElement) => void> = {
    pomodoro:    renderPomodoro,
    notas:       renderNotas,
    checklist:   renderChecklist,
    sorteio:     renderSorteio,
    calculadora: renderCalculadora,
    stopwatch:   renderStopwatch,
    conversor:   renderConversor,
    citacoes:    renderCitacoes,
    plagio:      renderPlagio,
    flashcard:   renderFlashcard,
  };

  if (content) {
    content.innerHTML = '';
    renderers[name]?.(content);
  }
}

export function closeTool(): void {
  stopAllTimers();
  currentTool = null;
  const grid = document.getElementById('tools-selector-grid');
  if (grid) grid.style.display = '';
  document.getElementById('tool-panel')?.classList.add('hidden');
  document.querySelectorAll('.tool-card').forEach((c) => c.classList.remove('active'));
}

function stopAllTimers(): void {
  if (pomodoroTimer) { clearInterval(pomodoroTimer); pomodoroTimer = null; }
  if (stopwatchTimer) { clearInterval(stopwatchTimer); stopwatchTimer = null; }
  stopwatchRunning = false;
}

// ============================================================
// 🍅 POMODORO
// ============================================================
function renderPomodoro(container: HTMLElement): void {
  pomodoroState = 'idle';
  pomodoroCyclesDone = 0;
  pomodoroSecondsLeft = pomodoroConfig.focus * 60;

  container.innerHTML = `
    <div class="pomo-wrap">
      <div class="pomo-config card">
        <div class="card-title">Configuração</div>
        <div class="pomo-config-grid">
          <label class="pomo-label">Foco (min)<input type="number" id="pomo-focus" class="pomo-input" value="${pomodoroConfig.focus}" min="1" max="90" onchange="pomoCfgChange()"></label>
          <label class="pomo-label">Pausa curta (min)<input type="number" id="pomo-short" class="pomo-input" value="${pomodoroConfig.shortBreak}" min="1" max="30" onchange="pomoCfgChange()"></label>
          <label class="pomo-label">Pausa longa (min)<input type="number" id="pomo-long" class="pomo-input" value="${pomodoroConfig.longBreak}" min="1" max="60" onchange="pomoCfgChange()"></label>
          <label class="pomo-label">Ciclos até pausa longa<input type="number" id="pomo-cycles" class="pomo-input" value="${pomodoroConfig.cycles}" min="1" max="10" onchange="pomoCfgChange()"></label>
        </div>
      </div>
      <div class="pomo-timer-wrap">
        <div class="pomo-ring-wrap">
          <svg class="pomo-ring" viewBox="0 0 200 200">
            <circle class="pomo-ring-bg" cx="100" cy="100" r="88"/>
            <circle class="pomo-ring-fill" id="pomo-ring-fill" cx="100" cy="100" r="88" stroke-dasharray="553" stroke-dashoffset="0"/>
          </svg>
          <div class="pomo-timer-inner">
            <div class="pomo-state-label" id="pomo-state">Foco</div>
            <div class="pomo-time" id="pomo-time">${formatPomoTime(pomodoroSecondsLeft)}</div>
            <div class="pomo-cycles" id="pomo-cycles-display"></div>
          </div>
        </div>
        <div class="pomo-controls">
          <button class="btn btn-ghost pomo-btn" onclick="pomodoroReset()">↺ Reset</button>
          <button class="btn btn-primary pomo-btn" id="pomo-start-btn" onclick="pomodoroToggle()">▶ Iniciar</button>
          <button class="btn btn-ghost pomo-btn" onclick="pomodoroSkip()">⏭ Pular</button>
        </div>
        <div class="pomo-dots" id="pomo-dots"></div>
      </div>
    </div>`;
  updatePomoDisplay();
  updatePomoDots();
}

export function pomoCfgChange(): void {
  pomodoroConfig.focus = parseInt((document.getElementById('pomo-focus') as HTMLInputElement)?.value) || 25;
  pomodoroConfig.shortBreak = parseInt((document.getElementById('pomo-short') as HTMLInputElement)?.value) || 5;
  pomodoroConfig.longBreak = parseInt((document.getElementById('pomo-long') as HTMLInputElement)?.value) || 15;
  pomodoroConfig.cycles = parseInt((document.getElementById('pomo-cycles') as HTMLInputElement)?.value) || 4;
  if (pomodoroState === 'idle') pomodoroSecondsLeft = pomodoroConfig.focus * 60;
  updatePomoDisplay();
}

export function pomodoroToggle(): void {
  const btn = document.getElementById('pomo-start-btn');
  if (pomodoroTimer) {
    clearInterval(pomodoroTimer);
    pomodoroTimer = null;
    if (btn) btn.textContent = '▶ Retomar';
  } else {
    if (pomodoroState === 'idle') pomodoroState = 'focus';
    pomodoroTimer = setInterval(pomodoroTick, 1000);
    if (btn) btn.textContent = '⏸ Pausar';
  }
}

function pomodoroTick(): void {
  pomodoroSecondsLeft--;
  if (pomodoroSecondsLeft <= 0) {
    clearInterval(pomodoroTimer!);
    pomodoroTimer = null;
    playBeep();
    if (pomodoroState === 'focus') {
      pomodoroCyclesDone++;
      if (pomodoroCyclesDone % pomodoroConfig.cycles === 0) {
        pomodoroState = 'longbreak';
        pomodoroSecondsLeft = pomodoroConfig.longBreak * 60;
        showToast('🎉 Pausa longa! Descanse.');
      } else {
        pomodoroState = 'break';
        pomodoroSecondsLeft = pomodoroConfig.shortBreak * 60;
        showToast('☕ Pausa curta!');
      }
    } else {
      pomodoroState = 'focus';
      pomodoroSecondsLeft = pomodoroConfig.focus * 60;
      showToast('🍅 Hora de focar!');
    }
    pomodoroTimer = setInterval(pomodoroTick, 1000);
  }
  updatePomoDisplay();
  updatePomoDots();
}

export function pomodoroReset(): void {
  if (pomodoroTimer) { clearInterval(pomodoroTimer); pomodoroTimer = null; }
  pomodoroState = 'idle';
  pomodoroSecondsLeft = pomodoroConfig.focus * 60;
  pomodoroCyclesDone = 0;
  const btn = document.getElementById('pomo-start-btn');
  if (btn) btn.textContent = '▶ Iniciar';
  updatePomoDisplay();
  updatePomoDots();
}

export function pomodoroSkip(): void {
  pomodoroSecondsLeft = 1;
  pomodoroTick();
}

function updatePomoDisplay(): void {
  const timeEl = document.getElementById('pomo-time');
  const stateEl = document.getElementById('pomo-state');
  const ring = document.getElementById('pomo-ring-fill') as SVGCircleElement | null;
  if (timeEl) timeEl.textContent = formatPomoTime(pomodoroSecondsLeft);
  const stateLabels: Record<PomodoroState, string> = {
    idle: 'Foco', focus: 'Foco 🍅', break: 'Pausa ☕', longbreak: 'Pausa Longa 🌴',
  };
  if (stateEl) stateEl.textContent = stateLabels[pomodoroState];
  if (ring) {
    const total = pomodoroState === 'longbreak'
      ? pomodoroConfig.longBreak * 60
      : pomodoroState === 'break'
      ? pomodoroConfig.shortBreak * 60
      : pomodoroConfig.focus * 60;
    const pct = pomodoroSecondsLeft / total;
    ring.style.strokeDashoffset = String(553 * (1 - pct));
  }
}

function updatePomoDots(): void {
  const dots = document.getElementById('pomo-dots');
  if (!dots) return;
  dots.innerHTML = Array.from({ length: pomodoroConfig.cycles }, (_, i) =>
    `<span class="pomo-dot ${i < pomodoroCyclesDone % pomodoroConfig.cycles ? 'done' : ''}"></span>`,
  ).join('');
}

function formatPomoTime(s: number): string {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function playBeep(): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch { /* áudio bloqueado */ }
}

// ============================================================
// 📝 NOTAS RÁPIDAS
// ============================================================
function renderNotas(container: HTMLElement): void {
  const saved = localStorage.getItem('dasi-notas') ?? '';
  container.innerHTML = `
    <div class="notas-wrap">
      <div class="notas-toolbar">
        <span class="notas-count" id="notas-count">${saved.length} caracteres</span>
        <div style="display:flex;gap:8px">
          <button class="btn btn-ghost" onclick="notasClear()">🗑 Limpar</button>
          <button class="btn btn-primary" onclick="notasCopy()">📋 Copiar</button>
        </div>
      </div>
      <textarea class="notas-textarea" id="notas-textarea"
        placeholder="Digite suas anotações aqui... Salvo automaticamente."
        oninput="notasSave(this)">${saved}</textarea>
    </div>`;
}

export function notasSave(el: HTMLTextAreaElement): void {
  localStorage.setItem('dasi-notas', el.value);
  const c = document.getElementById('notas-count');
  if (c) c.textContent = `${el.value.length} caracteres`;
}

export function notasClear(): void {
  if (!confirm('Limpar todas as notas?')) return;
  localStorage.removeItem('dasi-notas');
  const ta = document.getElementById('notas-textarea') as HTMLTextAreaElement | null;
  if (ta) { ta.value = ''; notasSave(ta); }
}

export function notasCopy(): void {
  const ta = document.getElementById('notas-textarea') as HTMLTextAreaElement | null;
  if (!ta) return;
  navigator.clipboard.writeText(ta.value).then(() => showToast('Notas copiadas!'));
}

// ============================================================
// ✅ CHECKLIST
// ============================================================
function renderChecklist(container: HTMLElement): void {
  container.innerHTML = `
    <div class="checklist-wrap">
      <div class="checklist-add">
        <input type="text" id="checklist-input" class="pomo-input" placeholder="Nova tarefa... (Enter para adicionar)"
          onkeydown="if(event.key==='Enter') checklistAdd()" style="flex:1">
        <button class="btn btn-primary" onclick="checklistAdd()">+ Adicionar</button>
      </div>
      <div class="checklist-progress-bar-wrap"><div class="checklist-progress-bar" id="checklist-progress"></div></div>
      <div class="checklist-stats" id="checklist-stats"></div>
      <div class="checklist-list" id="checklist-list"></div>
      <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">
        <button class="btn btn-ghost" onclick="checklistClearDone()">Remover concluídas</button>
        <button class="btn btn-ghost" onclick="checklistClearAll()">Limpar tudo</button>
      </div>
    </div>`;
  renderChecklistItems();
}

function renderChecklistItems(): void {
  const list = document.getElementById('checklist-list');
  const progress = document.getElementById('checklist-progress') as HTMLElement | null;
  const stats = document.getElementById('checklist-stats');
  if (!list) return;

  const done = checklistItems.filter((i) => i.done).length;
  const total = checklistItems.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  if (progress) progress.style.width = `${pct}%`;
  if (stats) {
    stats.textContent = total
      ? `${done} de ${total} concluída${done !== 1 ? 's' : ''} (${pct}%)`
      : 'Nenhuma tarefa adicionada';
  }

  if (!total) { list.innerHTML = '<div class="no-events-msg">Nenhuma tarefa ainda.</div>'; return; }

  list.innerHTML = checklistItems
    .map(
      (item, i) => `
      <div class="checklist-item ${item.done ? 'done' : ''}" id="cli-${i}">
        <button class="checklist-check" onclick="checklistToggle(${i})">
          ${item.done ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </button>
        <span class="checklist-text">${escapeHTML(item.text)}</span>
        <button class="checklist-del" onclick="checklistRemove(${i})" title="Remover">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>`,
    )
    .join('');
}

export function checklistAdd(): void {
  const inp = document.getElementById('checklist-input') as HTMLInputElement | null;
  const text = inp?.value.trim();
  if (!text) return;
  checklistItems.push({ text, done: false });
  checklistSave();
  if (inp) inp.value = '';
  renderChecklistItems();
}

export function checklistToggle(i: number): void {
  checklistItems[i].done = !checklistItems[i].done;
  checklistSave();
  renderChecklistItems();
}

export function checklistRemove(i: number): void {
  checklistItems.splice(i, 1);
  checklistSave();
  renderChecklistItems();
}

export function checklistClearDone(): void {
  checklistItems = checklistItems.filter((i) => !i.done);
  checklistSave();
  renderChecklistItems();
}

export function checklistClearAll(): void {
  if (!confirm('Limpar toda a checklist?')) return;
  checklistItems = [];
  checklistSave();
  renderChecklistItems();
}

function checklistSave(): void {
  localStorage.setItem('dasi-checklist', JSON.stringify(checklistItems));
}

// ============================================================
// 🎲 SORTEIO
// ============================================================
function renderSorteio(container: HTMLElement): void {
  container.innerHTML = `
    <div class="sorteio-wrap">
      <div class="card" style="margin-bottom:20px">
        <div class="card-title">Lista de participantes</div>
        <p style="font-size:13px;color:var(--text-muted);margin-bottom:12px">Um por linha.</p>
        <textarea class="notas-textarea" id="sorteio-lista" placeholder="Ana&#10;Bruno&#10;Carlos" style="height:140px"></textarea>
      </div>
      <div class="card" style="margin-bottom:20px">
        <div class="card-title">Opções</div>
        <div class="pomo-config-grid">
          <label class="pomo-label">Quantidade a sortear<input type="number" id="sorteio-qtd" class="pomo-input" value="1" min="1"></label>
          <label class="pomo-label">Modo
            <select id="sorteio-modo" class="pomo-input">
              <option value="individual">Nomes individuais</option>
              <option value="grupos">Dividir em grupos</option>
            </select>
          </label>
        </div>
        <button class="btn btn-primary" style="margin-top:16px;width:100%" onclick="executarSorteio()">🎲 Sortear!</button>
      </div>
      <div id="sorteio-resultado" class="sorteio-resultado hidden"></div>
    </div>`;
}

export function executarSorteio(): void {
  const listaRaw = (document.getElementById('sorteio-lista') as HTMLTextAreaElement)?.value ?? '';
  const lista = listaRaw.split('\n').map((s) => s.trim()).filter(Boolean);
  const qtd = parseInt((document.getElementById('sorteio-qtd') as HTMLInputElement)?.value) || 1;
  const modo = (document.getElementById('sorteio-modo') as HTMLSelectElement)?.value;
  const res = document.getElementById('sorteio-resultado');

  if (!lista.length) { showToast('Adicione itens na lista!'); return; }
  if (!res) return;

  res.classList.remove('hidden');
  res.style.animation = 'none';
  void res.offsetWidth;
  res.style.animation = '';

  if (modo === 'grupos') {
    const shuffled = [...lista].sort(() => Math.random() - 0.5);
    const size = Math.ceil(shuffled.length / qtd);
    const grupos = Array.from({ length: qtd }, (_, i) =>
      shuffled.slice(i * size, (i + 1) * size),
    );
    res.innerHTML =
      `<div class="card-title" style="margin-bottom:16px">🎯 Grupos formados</div>` +
      `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px">` +
      grupos
        .map(
          (g, i) =>
            `<div class="sorteio-grupo-card"><div class="sorteio-grupo-label">Grupo ${i + 1}</div>` +
            g.map((n) => `<div class="sorteio-nome">${escapeHTML(n)}</div>`).join('') +
            `</div>`,
        )
        .join('') +
      `</div>`;
  } else {
    const real = Math.min(qtd, lista.length);
    const sorteados = [...lista].sort(() => Math.random() - 0.5).slice(0, real);
    res.innerHTML =
      `<div class="card-title" style="margin-bottom:16px">🎯 ${real === 1 ? 'Sorteado' : 'Sorteados'}</div>` +
      `<div class="sorteio-nomes">` +
      sorteados
        .map((n, i) => `<div class="sorteio-nome-big" style="animation-delay:${i * 0.08}s">${escapeHTML(n)}</div>`)
        .join('') +
      `</div>`;
  }
}

// ============================================================
// 🧮 CALCULADORA DE MÉDIAS
// ============================================================
function renderCalculadora(container: HTMLElement): void {
  container.innerHTML = `
    <div class="calc-wrap">
      <div style="display:flex;gap:10px;margin-bottom:16px;align-items:center;flex-wrap:wrap">
        <input type="text" id="calc-nome" class="pomo-input" placeholder="Nome da disciplina" style="flex:1;min-width:140px">
        <button class="btn btn-primary" onclick="calcAdd()">+ Adicionar</button>
        <button class="btn btn-ghost" onclick="calcClear()">Limpar</button>
      </div>
      <div id="calc-list"></div>
      <div id="calc-summary"></div>
    </div>`;
  renderCalcList();
}

function renderCalcList(): void {
  const list = document.getElementById('calc-list');
  const summary = document.getElementById('calc-summary');
  if (!list) return;

  if (!calcDisciplinas.length) {
    list.innerHTML = '<div class="no-events-msg">Nenhuma disciplina adicionada.</div>';
    if (summary) summary.innerHTML = '';
    return;
  }

  list.innerHTML = calcDisciplinas
    .map(
      (d, i) => {
        const media = calcGetMedia(d);
        return `
          <div class="calc-item card" style="margin-bottom:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <div style="font-weight:600;font-size:15px">${escapeHTML(d.nome)}</div>
              <button class="checklist-del" onclick="calcRemove(${i})">✕</button>
            </div>
            <div class="calc-notas-grid">
              ${d.notas
                .map(
                  (n, j) => `
                <div class="calc-nota-row">
                  <input type="text" class="pomo-input" placeholder="Avaliação ${j + 1}" value="${escapeHTML(n.label)}" style="flex:1" oninput="calcUpdateLabel(${i},${j},this.value)">
                  <input type="number" class="pomo-input calc-nota-input" placeholder="Nota" value="${n.nota}" min="0" max="10" step="0.1" oninput="calcUpdateNota(${i},${j},this.value)">
                  <input type="number" class="pomo-input calc-peso-input" placeholder="Peso" value="${n.peso}" min="0" step="0.1" oninput="calcUpdatePeso(${i},${j},this.value)">
                  <button class="checklist-del" onclick="calcRemoveNota(${i},${j})">✕</button>
                </div>`,
                )
                .join('')}
            </div>
            <button class="btn btn-ghost" style="margin-top:10px;font-size:12px" onclick="calcAddNota(${i})">+ Adicionar nota</button>
            <div class="calc-media ${media >= 5 ? 'aprovado' : media < 0 ? '' : 'reprovado'}" id="calc-media-${i}">
              ${media >= 0 ? `Média: <strong>${media.toFixed(2)}</strong> — ${media >= 5 ? '✅ Aprovado' : '❌ Reprovado'}` : 'Insira notas e pesos'}
            </div>
          </div>`;
      },
    )
    .join('');

  const mediasValidas = calcDisciplinas.map((d) => calcGetMedia(d)).filter((m) => m >= 0);
  if (mediasValidas.length && summary) {
    const avg = mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length;
    summary.innerHTML = `
      <div class="card" style="text-align:center;padding:20px">
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Média Geral</div>
        <div style="font-family:var(--font-display);font-size:42px;font-weight:800;color:${avg >= 5 ? 'var(--success)' : 'var(--danger)'}">${avg.toFixed(2)}</div>
      </div>`;
  } else if (summary) summary.innerHTML = '';
}

function calcGetMedia(d: CalcDisciplina): number {
  const valid = d.notas.filter((n) => n.nota !== '' && n.peso !== '');
  if (!valid.length) return -1;
  const totalPeso = valid.reduce((a, n) => a + parseFloat(n.peso), 0);
  if (!totalPeso) return -1;
  return valid.reduce((a, n) => a + parseFloat(n.nota) * parseFloat(n.peso), 0) / totalPeso;
}

export function calcAdd(): void {
  const nome = (document.getElementById('calc-nome') as HTMLInputElement)?.value.trim();
  if (!nome) return;
  calcDisciplinas.push({ nome, notas: [{ label: 'P1', nota: '', peso: '1' }, { label: 'P2', nota: '', peso: '1' }] });
  calcSave();
  (document.getElementById('calc-nome') as HTMLInputElement).value = '';
  renderCalcList();
}

export const calcRemove = (i: number) => { calcDisciplinas.splice(i, 1); calcSave(); renderCalcList(); };
export const calcAddNota = (i: number) => { calcDisciplinas[i].notas.push({ label: `Av ${calcDisciplinas[i].notas.length + 1}`, nota: '', peso: '1' }); calcSave(); renderCalcList(); };
export const calcRemoveNota = (i: number, j: number) => { calcDisciplinas[i].notas.splice(j, 1); calcSave(); renderCalcList(); };
export const calcUpdateLabel = (i: number, j: number, v: string) => { calcDisciplinas[i].notas[j].label = v; calcSave(); };
export const calcUpdateNota = (i: number, j: number, v: string) => { calcDisciplinas[i].notas[j].nota = v; calcSave(); renderCalcList(); };
export const calcUpdatePeso = (i: number, j: number, v: string) => { calcDisciplinas[i].notas[j].peso = v; calcSave(); renderCalcList(); };
export const calcClear = () => { if (!confirm('Limpar tudo?')) return; calcDisciplinas = []; calcSave(); renderCalcList(); };
function calcSave(): void { localStorage.setItem('dasi-calc', JSON.stringify(calcDisciplinas)); }

// ============================================================
// ⏱️ CRONÔMETRO
// ============================================================
function renderStopwatch(container: HTMLElement): void {
  stopwatchMs = 0; stopwatchLaps = []; stopwatchRunning = false;
  if (stopwatchTimer) clearInterval(stopwatchTimer);

  container.innerHTML = `
    <div class="stopwatch-wrap">
      <div class="stopwatch-display" id="sw-display">00:00.000</div>
      <div class="pomo-controls">
        <button class="btn btn-primary pomo-btn" id="sw-start-btn" onclick="swToggle()">▶ Iniciar</button>
        <button class="btn btn-ghost pomo-btn" onclick="swLap()">⏱ Volta</button>
        <button class="btn btn-ghost pomo-btn" onclick="swReset()">↺ Zerar</button>
      </div>
      <div class="sw-laps" id="sw-laps"></div>
    </div>`;
}

export function swToggle(): void {
  const btn = document.getElementById('sw-start-btn');
  if (stopwatchRunning) {
    clearInterval(stopwatchTimer!);
    stopwatchTimer = null;
    stopwatchRunning = false;
    if (btn) btn.textContent = '▶ Retomar';
  } else {
    const start = Date.now() - stopwatchMs;
    stopwatchTimer = setInterval(() => {
      stopwatchMs = Date.now() - start;
      const d = document.getElementById('sw-display');
      if (d) d.textContent = formatSw(stopwatchMs);
    }, 30);
    stopwatchRunning = true;
    if (btn) btn.textContent = '⏸ Pausar';
  }
}

export function swLap(): void {
  if (!stopwatchRunning && stopwatchMs === 0) return;
  stopwatchLaps.push(stopwatchMs);
  const laps = document.getElementById('sw-laps');
  if (laps) {
    laps.innerHTML = stopwatchLaps
      .map((l, i) => {
        const prev = i > 0 ? stopwatchLaps[i - 1] : 0;
        return `<div class="sw-lap-item"><span class="sw-lap-num">Volta ${i + 1}</span><span class="sw-lap-delta">+${formatSw(l - prev)}</span><span>${formatSw(l)}</span></div>`;
      })
      .reverse()
      .join('');
  }
}

export function swReset(): void {
  if (stopwatchTimer) clearInterval(stopwatchTimer);
  stopwatchRunning = false; stopwatchMs = 0; stopwatchLaps = [];
  const d = document.getElementById('sw-display');
  if (d) d.textContent = '00:00.000';
  const laps = document.getElementById('sw-laps');
  if (laps) laps.innerHTML = '';
  const btn = document.getElementById('sw-start-btn');
  if (btn) btn.textContent = '▶ Iniciar';
}

function formatSw(ms: number): string {
  const m = Math.floor(ms / 60000).toString().padStart(2, '0');
  const s = Math.floor((ms % 60000) / 1000).toString().padStart(2, '0');
  const ms3 = (ms % 1000).toString().padStart(3, '0');
  return `${m}:${s}.${ms3}`;
}

// ============================================================
// 🔄 CONVERSOR DE UNIDADES
// ============================================================
function renderConversor(container: HTMLElement): void {
  container.innerHTML = `
    <div class="tool-section">
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px">
        ${Object.entries(_convCats)
          .map(([k, v]) => `<button class="btn btn-ghost btn-sm conv-cat-btn" data-cat="${k}" onclick="convSelectCat('${k}')">${v.label}</button>`)
          .join('')}
      </div>
      <div id="conv-body"><div class="no-events-msg">Selecione uma categoria acima</div></div>
    </div>`;
}

export function convSelectCat(cat: string): void {
  document.querySelectorAll<HTMLElement>('.conv-cat-btn').forEach((b) => {
    b.classList.toggle('btn-primary', b.dataset.cat === cat);
    b.classList.toggle('btn-ghost', b.dataset.cat !== cat);
  });
  const body = document.getElementById('conv-body');
  const data = _convCats[cat];
  if (!body || !data) return;

  if (data.special && cat === 'temperatura') {
    body.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div><label class="add-event-label">Celsius (°C)</label><input type="number" id="conv-C" class="kanban-input" style="width:100%" placeholder="0" oninput="convTemp('C')"></div>
      <div><label class="add-event-label">Fahrenheit (°F)</label><input type="number" id="conv-F" class="kanban-input" style="width:100%" placeholder="32" oninput="convTemp('F')"></div>
      <div><label class="add-event-label">Kelvin (K)</label><input type="number" id="conv-K" class="kanban-input" style="width:100%" placeholder="273.15" oninput="convTemp('K')"></div>
      <div><label class="add-event-label">Rankine (°R)</label><input type="number" id="conv-R" class="kanban-input" style="width:100%" placeholder="491.67" oninput="convTemp('R')"></div>
    </div>`;
    return;
  }

  _convCat = cat;
  const units = Object.keys(data.units ?? {});
  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:12px">
      <div><label class="add-event-label">Valor</label><input type="number" id="conv-val" class="kanban-input" style="width:100%" placeholder="0" oninput="convCalc()"></div>
      <div><label class="add-event-label">De</label><select id="conv-from" class="kanban-select" onchange="convCalc()">${units.map((u) => `<option>${u}</option>`).join('')}</select></div>
      <div><label class="add-event-label">Para</label><select id="conv-to" class="kanban-select" onchange="convCalc()">${units.map((u, i) => `<option ${i === 1 ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
    </div>
    <div id="conv-result" style="font-family:var(--font-display);font-size:26px;font-weight:800;color:var(--primary);text-align:center;padding:18px;background:var(--glass-tint);border:1px solid var(--glass-border);border-radius:12px;margin-top:14px;min-height:64px;display:flex;align-items:center;justify-content:center">—</div>`;
}

export function convCalc(): void {
  const val = parseFloat((document.getElementById('conv-val') as HTMLInputElement)?.value);
  const from = (document.getElementById('conv-from') as HTMLSelectElement)?.value;
  const to = (document.getElementById('conv-to') as HTMLSelectElement)?.value;
  const res = document.getElementById('conv-result');
  if (!res) return;
  if (isNaN(val)) { res.textContent = '—'; return; }
  const units = _convCats[_convCat]?.units;
  if (!units) return;
  const result = (val * (units[from] ?? 1)) / (units[to] ?? 1);
  const fmt = Math.abs(result) < 0.001 || Math.abs(result) > 1e9
    ? result.toExponential(4)
    : parseFloat(result.toPrecision(8)).toString();
  res.innerHTML = `<span style="font-size:13px;color:var(--text-muted);margin-right:6px">${val} ${from} =</span><strong>${fmt} ${to}</strong>`;
}

export function convTemp(src: 'C' | 'F' | 'K' | 'R'): void {
  const v = parseFloat((document.getElementById(`conv-${src}`) as HTMLInputElement)?.value);
  if (isNaN(v)) return;
  const C = src === 'C' ? v : src === 'F' ? (v - 32) * 5 / 9 : src === 'K' ? v - 273.15 : (v - 491.67) * 5 / 9;
  const conversions: Record<string, number> = { C, F: C * 9 / 5 + 32, K: C + 273.15, R: (C + 273.15) * 9 / 5 };
  Object.entries(conversions).forEach(([k, val]) => {
    if (k !== src) {
      const el = document.getElementById(`conv-${k}`) as HTMLInputElement | null;
      if (el) el.value = parseFloat(val.toFixed(4)).toString();
    }
  });
}

// ============================================================
// 📖 GERADOR DE CITAÇÃO ABNT
// ============================================================
function renderCitacoes(container: HTMLElement): void {
  container.innerHTML = `
    <div class="tool-section">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">
        ${(['livro', 'artigo', 'site', 'tcc'] as const)
          .map((t) => {
            const labels: Record<string, string> = { livro: '📚 Livro', artigo: '📄 Artigo', site: '🌐 Site', tcc: '🎓 TCC' };
            return `<button class="btn btn-ghost btn-sm abnt-type-btn" data-t="${t}" onclick="abntSelect('${t}')">${labels[t]}</button>`;
          })
          .join('')}
      </div>
      <div id="abnt-fields"><div class="no-events-msg">Selecione o tipo de fonte acima</div></div>
      <div id="abnt-result" style="display:none;margin-top:18px;padding:16px;background:var(--glass-tint);border:1px solid var(--glass-border);border-radius:12px">
        <div style="font-family:var(--font-mono);font-size:10px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Referência ABNT NBR 6023</div>
        <div id="abnt-output" style="font-size:13.5px;line-height:1.8;color:var(--text)"></div>
        <button class="btn btn-ghost btn-sm" style="margin-top:10px" onclick="abntCopy()">📋 Copiar</button>
      </div>
    </div>`;
}

export function abntSelect(type: 'livro' | 'artigo' | 'site' | 'tcc'): void {
  document.querySelectorAll<HTMLElement>('.abnt-type-btn').forEach((b) => {
    b.classList.toggle('btn-primary', b.dataset.t === type);
    b.classList.toggle('btn-ghost', b.dataset.t !== type);
  });
  (window as any)._abntType = type;

  type SchemaField = { id: string; label: string; ph: string };
  const schemas: Record<string, SchemaField[]> = {
    livro:   [{ id: 'autor', label: 'Autor(es)', ph: 'SOBRENOME, Nome' }, { id: 'titulo', label: 'Título', ph: 'Título do Livro' }, { id: 'edicao', label: 'Edição', ph: '3. ed.' }, { id: 'local', label: 'Cidade', ph: 'São Paulo' }, { id: 'editora', label: 'Editora', ph: 'Atlas' }, { id: 'ano', label: 'Ano', ph: '2023' }],
    artigo:  [{ id: 'autor', label: 'Autor(es)', ph: 'SOBRENOME, Nome' }, { id: 'titulo', label: 'Título do artigo', ph: 'Título' }, { id: 'revista', label: 'Periódico', ph: 'Revista de SI' }, { id: 'local', label: 'Cidade', ph: 'São Paulo' }, { id: 'vol', label: 'Volume', ph: 'v. 10' }, { id: 'num', label: 'Número', ph: 'n. 2' }, { id: 'pag', label: 'Páginas', ph: 'p. 15-30' }, { id: 'ano', label: 'Ano', ph: '2024' }],
    site:    [{ id: 'autor', label: 'Autor/Organização', ph: 'SILVA, João' }, { id: 'titulo', label: 'Título da página', ph: 'Nome da página' }, { id: 'site', label: 'Nome do site', ph: 'USP Online' }, { id: 'url', label: 'URL', ph: 'https://...' }, { id: 'acesso', label: 'Data de acesso', ph: '10 mar. 2025' }],
    tcc:     [{ id: 'autor', label: 'Autor', ph: 'SOBRENOME, Nome' }, { id: 'titulo', label: 'Título', ph: 'Título do trabalho' }, { id: 'tipo', label: 'Tipo', ph: 'TCC' }, { id: 'grau', label: 'Grau', ph: 'Bacharel em SI' }, { id: 'inst', label: 'Instituição', ph: 'Universidade de São Paulo' }, { id: 'local', label: 'Cidade', ph: 'São Paulo' }, { id: 'ano', label: 'Ano', ph: '2025' }],
  };

  const schema = schemas[type] ?? [];
  document.getElementById('abnt-fields')!.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${schema.map((f) => `<div class="add-event-field" style="${f.id === 'titulo' || f.id === 'url' ? 'grid-column:1/-1' : ''}"><label class="add-event-label">${f.label}</label><input type="text" id="abnt-${f.id}" class="kanban-input" style="width:100%" placeholder="${f.ph}" oninput="abntGenerate()"></div>`).join('')}
    </div>
    <button class="btn btn-primary" onclick="abntGenerate()" style="width:100%;justify-content:center;margin-top:10px">Gerar referência</button>`;
}

export function abntGenerate(): void {
  const g = (id: string) => (document.getElementById(`abnt-${id}`) as HTMLInputElement)?.value?.trim() ?? '';
  const type = (window as any)._abntType as string;
  let ref = '';

  if (type === 'livro') {
    const ed = g('edicao') ? ` ${g('edicao')}.` : '';
    ref = `${g('autor') || 'AUTOR'}. <strong>${g('titulo') || 'TÍTULO'}</strong>.${ed} ${g('local') || 'LOCAL'}: ${g('editora') || 'EDITORA'}, ${g('ano') || 'ANO'}.`;
  } else if (type === 'artigo') {
    ref = `${g('autor') || 'AUTOR'}. ${g('titulo') || 'TÍTULO'}. <strong>${g('revista') || 'PERIÓDICO'}</strong>, ${g('local')}, ${g('vol')}, ${g('num')}, ${g('pag')}, ${g('ano') || 'ANO'}.`;
  } else if (type === 'site') {
    ref = `${g('autor') || 'AUTOR'}. <strong>${g('titulo') || 'TÍTULO'}</strong>. ${g('site') ? g('site') + ', ' : ''}Disponível em: ${g('url') || 'URL'}. Acesso em: ${g('acesso') || 'DATA'}.`;
  } else if (type === 'tcc') {
    ref = `${g('autor') || 'AUTOR'}. <strong>${g('titulo') || 'TÍTULO'}</strong>. ${g('ano') || 'ANO'}. ${g('tipo') || 'TCC'} (${g('grau') || 'Graduação'}) — ${g('inst') || 'INSTITUIÇÃO'}, ${g('local')}, ${g('ano') || 'ANO'}.`;
  }
  if (!ref) return;

  const res = document.getElementById('abnt-result');
  const out = document.getElementById('abnt-output');
  if (res) res.style.display = '';
  if (out) out.innerHTML = ref;
}

export function abntCopy(): void {
  const out = document.getElementById('abnt-output');
  if (!out) return;
  navigator.clipboard.writeText(out.innerText).then(() => showToast('Referência copiada!'));
}

// ============================================================
// 🔍 CHECKLIST ANTI-PLÁGIO
// ============================================================
function renderPlagio(container: HTMLElement): void {
  const cats = [
    { cat: 'Citações', checks: ['Toda citação direta está entre aspas e com (AUTOR, ANO, p. XX)', 'Citações longas (>3 linhas) estão em bloco recuado sem aspas', 'Citações indiretas (paráfrases) têm autor e ano indicados', 'Nenhum trecho copiado sem atribuição de fonte'] },
    { cat: 'Referências', checks: ['Todas as fontes citadas estão na lista de referências', 'Todas as referências seguem ABNT NBR 6023', 'Sites têm URL e data de acesso', 'Não há fontes nas referências não citadas no texto'] },
    { cat: 'Imagens & Tabelas', checks: ['Imagens têm fonte indicada abaixo', 'Tabelas têm título acima e fonte abaixo', 'Gráficos adaptados indicam "Adaptado de: ..."'] },
    { cat: 'Integridade', checks: ['O trabalho foi escrito com suas próprias palavras', 'Ideias de outros foram parafrasadas corretamente', 'Não houve reutilização de trabalhos anteriores sem permissão', 'Uso de IA (se houver) foi declarado conforme exigência da instituição', 'O arquivo foi verificado em ferramenta anti-plágio (Turnitin etc.)'] },
  ];
  const total = cats.reduce((a, c) => a + c.checks.length, 0);

  let html = '<div style="display:flex;flex-direction:column;gap:18px">';
  cats.forEach((cat, ci) => {
    html += `<div><div style="font-family:var(--font-mono);font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--primary);margin-bottom:10px">${cat.cat}</div><div style="display:flex;flex-direction:column;gap:7px">`;
    cat.checks.forEach((c, i) => {
      html += `<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 12px;border-radius:10px;border:1px solid var(--glass-border);background:var(--glass-tint)"><input type="checkbox" id="plag-${ci}-${i}" style="margin-top:2px;accent-color:var(--primary);flex-shrink:0;width:15px;height:15px" onchange="plagProgress(${total})"><span style="font-size:13px;line-height:1.5;color:var(--text)">${c}</span></label>`;
    });
    html += '</div></div>';
  });
  html += `</div>
    <div style="margin-top:20px;padding:14px 18px;border-radius:12px;background:var(--glass-tint);border:1px solid var(--glass-border)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">Progresso</span>
        <span id="plag-count" style="font-family:var(--font-mono);font-size:11px;font-weight:700;color:var(--primary)">0/${total}</span>
      </div>
      <div style="height:8px;border-radius:100px;background:var(--glass-border);overflow:hidden"><div id="plag-bar" style="height:100%;border-radius:100px;background:linear-gradient(90deg,var(--primary),var(--secondary));width:0%;transition:.4s"></div></div>
      <div id="plag-msg" style="font-size:12px;color:var(--text-muted);margin-top:8px">Marque cada item conforme você revisa o trabalho.</div>
    </div>`;
  container.innerHTML = html;
}

export function plagProgress(total: number): void {
  const checked = document.querySelectorAll('[id^="plag-"]:checked').length;
  const pct = Math.round((checked / total) * 100);
  const bar = document.getElementById('plag-bar');
  const count = document.getElementById('plag-count');
  const msg = document.getElementById('plag-msg');
  if (bar) bar.style.width = `${pct}%`;
  if (count) count.textContent = `${checked}/${total}`;
  if (msg) {
    if (pct === 100) { msg.textContent = '✅ Seu trabalho está em conformidade com as boas práticas acadêmicas!'; msg.style.color = 'var(--success)'; }
    else if (pct >= 70) { msg.textContent = `${pct}% completo — quase lá!`; msg.style.color = 'var(--warning)'; }
    else { msg.textContent = `${pct}% completo — continue revisando.`; msg.style.color = 'var(--text-muted)'; }
  }
}

// ============================================================
// 🃏 FLASHCARDS
// ============================================================
function renderFlashcard(container: HTMLElement): void {
  fcCards = JSON.parse(localStorage.getItem('dasiboard_fc') ?? '[]');
  fcIndex = 0; fcFlipped = false; fcSession = { correct: 0, wrong: 0, skipped: 0 };

  container.innerHTML = `
    <div class="tool-section" style="display:flex;flex-direction:column;gap:16px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="add-event-field"><label class="add-event-label">Frente (pergunta)</label><textarea id="fc-front" class="kanban-input" rows="2" style="width:100%;resize:none" placeholder="O que é um Sistema de Informação?"></textarea></div>
        <div class="add-event-field"><label class="add-event-label">Verso (resposta)</label><textarea id="fc-back" class="kanban-input" rows="2" style="width:100%;resize:none" placeholder="Sistema que coleta, processa e dissemina informação..."></textarea></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" onclick="fcAddCard()" style="flex:1;justify-content:center">+ Adicionar card</button>
        <button class="btn btn-ghost btn-sm" onclick="fcClearAll()" title="Apagar todos">🗑</button>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--glass-tint);border:1px solid var(--glass-border);border-radius:10px">
        <span id="fc-deck-count" style="font-family:var(--font-mono);font-size:12px;color:var(--text-muted)">${fcCards.length} cards</span>
        <button class="btn btn-primary btn-sm" onclick="fcStartSession()" id="fc-start-btn" ${fcCards.length === 0 ? 'disabled' : ''}>▶ Estudar</button>
      </div>
      <div id="fc-study-area" style="display:none;flex-direction:column;align-items:center;gap:14px">
        <div id="fc-card" onclick="fcFlip()" style="width:100%;min-height:160px;border-radius:16px;background:var(--bg-card);border:1.5px solid var(--glass-border);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:28px 24px;text-align:center;font-size:16px;line-height:1.6;color:var(--text);position:relative;overflow:hidden;transition:transform .2s">
          <div style="position:absolute;top:10px;left:14px;font-family:var(--font-mono);font-size:9.5px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px" id="fc-side-label">Frente — clique para revelar</div>
          <span id="fc-card-text"></span>
        </div>
        <div style="font-family:var(--font-mono);font-size:11px;color:var(--text-dim)" id="fc-progress-label"></div>
        <div style="display:flex;gap:8px;width:100%">
          <button class="btn btn-ghost" style="flex:1;justify-content:center" onclick="fcAnswer('wrong')">✗ Errei</button>
          <button class="btn btn-ghost" style="flex:1;justify-content:center" onclick="fcAnswer('skip')">⟳ Pular</button>
          <button class="btn btn-primary" style="flex:1;justify-content:center" onclick="fcAnswer('correct')">✓ Acertei</button>
        </div>
        <div style="display:flex;gap:16px;font-family:var(--font-mono);font-size:11px">
          <span style="color:var(--success)">✓ <span id="fc-correct">0</span></span>
          <span style="color:var(--danger)">✗ <span id="fc-wrong">0</span></span>
          <span style="color:var(--text-dim)">⟳ <span id="fc-skipped">0</span></span>
        </div>
      </div>
    </div>`;
}

export function fcAddCard(): void {
  const front = (document.getElementById('fc-front') as HTMLTextAreaElement)?.value.trim();
  const back = (document.getElementById('fc-back') as HTMLTextAreaElement)?.value.trim();
  if (!front || !back) { showToast('Preencha frente e verso'); return; }
  fcCards.push({ front, back });
  localStorage.setItem('dasiboard_fc', JSON.stringify(fcCards));
  (document.getElementById('fc-front') as HTMLTextAreaElement).value = '';
  (document.getElementById('fc-back') as HTMLTextAreaElement).value = '';
  const countEl = document.getElementById('fc-deck-count');
  if (countEl) countEl.textContent = `${fcCards.length} cards`;
  const btn = document.getElementById('fc-start-btn') as HTMLButtonElement | null;
  if (btn) btn.disabled = false;
  showToast('Card adicionado!');
}

export function fcStartSession(): void {
  if (!fcCards.length) return;
  fcIndex = 0; fcFlipped = false; fcSession = { correct: 0, wrong: 0, skipped: 0 };
  for (let i = fcCards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [fcCards[i], fcCards[j]] = [fcCards[j], fcCards[i]];
  }
  const area = document.getElementById('fc-study-area');
  if (area) area.style.display = 'flex';
  fcShowCard();
}

function fcShowCard(): void {
  if (fcIndex >= fcCards.length) { fcEndSession(); return; }
  const card = fcCards[fcIndex]; fcFlipped = false;
  const textEl = document.getElementById('fc-card-text');
  const lblEl = document.getElementById('fc-side-label');
  const progEl = document.getElementById('fc-progress-label');
  const cardEl = document.getElementById('fc-card') as HTMLElement | null;
  if (textEl) textEl.textContent = card.front;
  if (lblEl) { lblEl.textContent = 'Frente — clique para revelar'; lblEl.style.color = 'var(--primary)'; }
  if (progEl) progEl.textContent = `Card ${fcIndex + 1} de ${fcCards.length}`;
  if (cardEl) cardEl.style.borderColor = 'var(--glass-border)';
}

export function fcFlip(): void {
  if (fcIndex >= fcCards.length) return;
  const card = fcCards[fcIndex]; fcFlipped = !fcFlipped;
  const textEl = document.getElementById('fc-card-text');
  const lblEl = document.getElementById('fc-side-label');
  const cardEl = document.getElementById('fc-card') as HTMLElement | null;
  if (fcFlipped) {
    if (textEl) textEl.textContent = card.back;
    if (lblEl) { lblEl.textContent = 'Verso (resposta)'; lblEl.style.color = 'var(--success)'; }
    if (cardEl) { cardEl.style.transform = 'scale(1.02)'; cardEl.style.borderColor = 'var(--success)'; setTimeout(() => { if (cardEl) cardEl.style.transform = ''; }, 200); }
  } else {
    if (textEl) textEl.textContent = card.front;
    if (lblEl) { lblEl.textContent = 'Frente — clique para revelar'; lblEl.style.color = 'var(--primary)'; }
    if (cardEl) cardEl.style.borderColor = 'var(--glass-border)';
  }
}

export function fcAnswer(type: 'correct' | 'wrong' | 'skip'): void {
  if (type === 'correct') fcSession.correct++;
  else if (type === 'wrong') fcSession.wrong++;
  else fcSession.skipped++;
  fcIndex++;
  const c = document.getElementById('fc-correct');
  const w = document.getElementById('fc-wrong');
  const s = document.getElementById('fc-skipped');
  if (c) c.textContent = String(fcSession.correct);
  if (w) w.textContent = String(fcSession.wrong);
  if (s) s.textContent = String(fcSession.skipped);
  fcShowCard();
}

function fcEndSession(): void {
  const { correct, wrong, skipped } = fcSession;
  const total = correct + wrong + skipped;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const cardEl = document.getElementById('fc-card');
  if (cardEl) {
    cardEl.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
        <div style="font-size:40px">${pct >= 80 ? '🏆' : pct >= 50 ? '👍' : '💪'}</div>
        <div style="font-family:var(--font-display);font-size:22px;font-weight:800;color:var(--primary)">${pct}% de acertos</div>
        <div style="font-size:13px;color:var(--text-muted)">${correct} acertos · ${wrong} erros · ${skipped} pulados</div>
        <button class="btn btn-primary" onclick="fcStartSession()" style="margin-top:8px">Repetir baralho</button>
      </div>`;
  }
}

export function fcClearAll(): void {
  if (!confirm('Apagar todos os flashcards?')) return;
  fcCards = []; localStorage.removeItem('dasiboard_fc');
  const content = document.getElementById('tool-panel-content');
  if (content) renderFlashcard(content);
  showToast('Flashcards apagados.');
}
