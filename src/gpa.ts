// ===== NOTAS & GPA — DaSIboard TypeScript =====

import type { GPAData, GPASemester, Discipline } from './types';
import { fetchJSON } from './utils';

// ── Chave de armazenamento ────────────────────────────────────────────────────
const GPA_KEY = 'dasiboard_gpa_v2';

// ── Semestres padrão (fallback) ───────────────────────────────────────────────
const DEFAULT_SEMESTERS: GPASemester[] = [
  {
    id: 's1', label: '1º Semestre', collapsed: false,
    disciplines: [
      { id: 'd1_1', name: 'Tratamento e Análise de Dados e Informações', credits: 4, grade: null },
      { id: 'd1_2', name: 'Resolução de Problemas I', credits: 4, grade: null },
      { id: 'd1_3', name: 'Introdução à Programação', credits: 4, grade: null },
      { id: 'd1_4', name: 'Cálculo I', credits: 4, grade: null },
      { id: 'd1_5', name: 'Fundamentos de Sistemas de Informação', credits: 4, grade: null },
    ],
  },
  {
    id: 's2', label: '2º Semestre', collapsed: true,
    disciplines: [
      { id: 'd2_1', name: 'Introdução à Análise de Algoritmos', credits: 4, grade: null },
      { id: 'd2_2', name: 'Cálculo II', credits: 4, grade: null },
      { id: 'd2_3', name: 'Matemática Discreta I', credits: 4, grade: null },
      { id: 'd2_4', name: 'Algoritmos e Estruturas de Dados I', credits: 4, grade: null },
      { id: 'd2_5', name: 'Matrizes, Vetores e Geometria Analítica', credits: 4, grade: null },
    ],
  },
  {
    id: 's3', label: '3º Semestre', collapsed: true,
    disciplines: [
      { id: 'd3_1', name: 'Computação Orientada a Objetos', credits: 4, grade: null },
      { id: 'd3_2', name: 'Algoritmos e Estruturas de Dados II', credits: 4, grade: null },
      { id: 'd3_3', name: 'Organização e Arquitetura de Computadores I', credits: 4, grade: null },
      { id: 'd3_4', name: 'Introdução à Estatística', credits: 4, grade: null },
      { id: 'd3_5', name: 'Introdução à Administração e Economia para Computação', credits: 4, grade: null },
    ],
  },
];

// ── Estado do módulo ──────────────────────────────────────────────────────────
let gpaData: GPAData | null = null;

// ── Carregar padrões do JSON ──────────────────────────────────────────────────
async function gpaLoadDefaults(): Promise<GPASemester[]> {
  try {
    const data = await fetchJSON<{ semesters: GPASemester[] }>('./data/gpa_defaults.json');
    if (data?.semesters) return data.semesters;
  } catch {
    // fallback
  }
  return JSON.parse(JSON.stringify(DEFAULT_SEMESTERS)) as GPASemester[];
}

// ── Persistência ──────────────────────────────────────────────────────────────
export function gpaLoad(): void {
  try {
    const saved = localStorage.getItem(GPA_KEY);
    gpaData = saved
      ? (JSON.parse(saved) as GPAData)
      : { semesters: JSON.parse(JSON.stringify(DEFAULT_SEMESTERS)) };
  } catch {
    gpaData = { semesters: JSON.parse(JSON.stringify(DEFAULT_SEMESTERS)) };
  }
  if (!gpaData!.semesters) {
    gpaData!.semesters = JSON.parse(JSON.stringify(DEFAULT_SEMESTERS));
  }
}

export function gpaSave(): void {
  try {
    localStorage.setItem(GPA_KEY, JSON.stringify(gpaData));
  } catch {
    // storage cheia
  }
}

// ── Cálculos ──────────────────────────────────────────────────────────────────
export function calcSemAvg(sem: GPASemester): number | null {
  const graded = sem.disciplines.filter(
    (d) => d.grade !== null && d.grade !== undefined && !isNaN(Number(d.grade)),
  );
  if (!graded.length) return null;
  const totalWeight = graded.reduce((s, d) => s + (d.credits || 1), 0);
  return graded.reduce((s, d) => s + Number(d.grade) * (d.credits || 1), 0) / totalWeight;
}

export function calcGlobalGPA(): number | null {
  if (!gpaData) return null;
  let totalWeight = 0;
  let weightedSum = 0;
  gpaData.semesters.forEach((sem) => {
    sem.disciplines.forEach((d) => {
      if (d.grade !== null && d.grade !== undefined && !isNaN(Number(d.grade))) {
        totalWeight += d.credits || 1;
        weightedSum += Number(d.grade) * (d.credits || 1);
      }
    });
  });
  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

// ── Render ────────────────────────────────────────────────────────────────────
export function renderGPA(): void {
  if (!gpaData) return;

  const container = document.getElementById('gpa-semesters');
  if (!container) return;

  const globalGpa = calcGlobalGPA();
  const globalEl = document.getElementById('global-gpa');
  if (globalEl) {
    globalEl.textContent = globalGpa !== null ? globalGpa.toFixed(2) : '—';
  }

  container.innerHTML = gpaData.semesters
    .map((sem) => renderSemesterSection(sem))
    .join('');
}

function renderSemesterSection(sem: GPASemester): string {
  const avg = calcSemAvg(sem);
  const avgStr = avg !== null ? avg.toFixed(2) : '—';
  const avgColor = avg !== null
    ? avg >= 5 ? 'var(--success)' : 'var(--danger)'
    : 'var(--text-muted)';

  return `
    <div class="gpa-semester" id="gpa-sem-${sem.id}">
      <div class="gpa-sem-header" onclick="gpaToggleSem('${sem.id}')">
        <span class="gpa-sem-label">${sem.label}</span>
        <span class="gpa-sem-avg" style="color:${avgColor}">Média: ${avgStr}</span>
        <span class="gpa-sem-toggle">${sem.collapsed ? '▶' : '▼'}</span>
      </div>
      ${!sem.collapsed ? `
        <div class="gpa-disciplines">
          ${sem.disciplines.map((d) => renderDisciplineRow(sem.id, d)).join('')}
        </div>` : ''}
    </div>`;
}

function renderDisciplineRow(semId: string, d: Discipline): string {
  const gradeNum = d.grade !== null && !isNaN(Number(d.grade)) ? Number(d.grade) : null;
  const gradeColor = gradeNum !== null
    ? gradeNum >= 5 ? 'var(--success)' : 'var(--danger)'
    : 'var(--text-dim)';

  return `
    <div class="gpa-discipline-row">
      <span class="gpa-disc-name">${d.name}</span>
      <span class="gpa-disc-credits">${d.credits}cr</span>
      <input
        class="gpa-grade-input"
        type="number" min="0" max="10" step="0.1"
        placeholder="Nota"
        value="${d.grade ?? ''}"
        style="color:${gradeColor}"
        oninput="gpaSetGrade('${semId}','${d.id}',this.value)"
      />
    </div>`;
}

// ── Ações ─────────────────────────────────────────────────────────────────────
export function gpaToggleSem(semId: string): void {
  if (!gpaData) return;
  const sem = gpaData.semesters.find((s) => s.id === semId);
  if (sem) {
    sem.collapsed = !sem.collapsed;
    gpaSave();
    renderGPA();
  }
}

export function gpaSetGrade(semId: string, discId: string, value: string): void {
  if (!gpaData) return;
  const sem = gpaData.semesters.find((s) => s.id === semId);
  const disc = sem?.disciplines.find((d) => d.id === discId);
  if (disc) {
    disc.grade = value.trim() === '' ? null : parseFloat(value);
    gpaSave();
    // Re-renderiza só os averages sem resetar inputs
    updateGPADisplayOnly();
  }
}

function updateGPADisplayOnly(): void {
  if (!gpaData) return;
  const globalGpa = calcGlobalGPA();
  const globalEl = document.getElementById('global-gpa');
  if (globalEl) {
    globalEl.textContent = globalGpa !== null ? globalGpa.toFixed(2) : '—';
  }
  gpaData.semesters.forEach((sem) => {
    const avgEl = document.querySelector(`#gpa-sem-${sem.id} .gpa-sem-avg`);
    if (avgEl) {
      const avg = calcSemAvg(sem);
      const avgStr = avg !== null ? avg.toFixed(2) : '—';
      const avgColor = avg !== null
        ? avg >= 5 ? 'var(--success)' : 'var(--danger)'
        : 'var(--text-muted)';
      (avgEl as HTMLElement).textContent = `Média: ${avgStr}`;
      (avgEl as HTMLElement).style.color = avgColor;
    }
  });
}

export function gpaReset(): void {
  if (!confirm('Tem certeza? Todas as notas serão apagadas.')) return;
  gpaData = { semesters: JSON.parse(JSON.stringify(DEFAULT_SEMESTERS)) };
  gpaSave();
  renderGPA();
}

// ── Inicialização ─────────────────────────────────────────────────────────────
export async function initGPA(): Promise<void> {
  gpaLoad();
  if (!gpaData || gpaData.semesters.length === 0) {
    const defaults = await gpaLoadDefaults();
    gpaData = { semesters: defaults };
    gpaSave();
  }
  renderGPA();
}
