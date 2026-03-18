// ===== ESTUDOS MODULE — DaSIboard TypeScript =====

import { fetchJSON, formatDateShort, el, escapeHTML } from './utils';

// ── Interfaces ────────────────────────────────────────────────────────────────
type EstudoTipo = 'documento' | 'link' | 'curso';

interface EstudoModulo {
  titulo: string;
  concluido: boolean;
  url?: string;
}

interface EstudoLink {
  label: string;
  url: string;
}

interface EstudoAnexo {
  nome: string;
  url: string;
  tipo: string;
}

interface Estudo {
  id: number;
  titulo: string;
  descricao?: string;
  area: string;
  tipo: EstudoTipo;
  tags?: string[];
  disciplina?: string;
  semestre?: number;
  criadoPor?: string;
  enviadoPor?: string;
  destaque?: boolean;
  dataEnvio?: string;
  modulos?: EstudoModulo[];
  links?: EstudoLink[];
  anexos?: EstudoAnexo[];
}

interface TipoInfo {
  label: string;
  icon: string;
}

// ── Estado do módulo ──────────────────────────────────────────────────────────
let estudosData: Estudo[] = [];
let estudosFiltrados: Estudo[] = [];
let estudosFiltroArea = 'todos';
let estudosFiltroTipo = 'todos';
let estudosBusca = '';

function els(selector: string): NodeListOf<HTMLElement> {
  return document.querySelectorAll<HTMLElement>(selector);
}

// ── Inicialização ─────────────────────────────────────────────────────────────
export async function initEstudos(): Promise<void> {
  const container = el<HTMLDivElement>('#estudos-grid');
  if (!container) return;
  container.innerHTML = `<div class="loading-spinner"><div class="spinner"></div>Carregando estudos...</div>`;

  const data = await fetchJSON<Estudo[]>('./data/estudos/estudos.json');
  estudosData = data ?? [];
  renderEstudosFiltros();
  aplicarFiltrosEstudos();
}

// ── Filtros ───────────────────────────────────────────────────────────────────
function renderEstudosFiltros(): void {
  const areas = [
    'todos',
    ...[...new Set(estudosData.map((e) => e.area))].sort((a, b) =>
      a.localeCompare(b),
    ),
  ];
  const tiposMap: Record<string, string> = {
    documento: 'Documento',
    link: 'Link',
    curso: 'Curso',
  };

  const areaContainer = el('#estudos-filter-area');
  if (areaContainer) {
    areaContainer.innerHTML = areas
      .map(
        (a) => `
      <button class="estudos-filter-btn ${a === estudosFiltroArea ? 'active' : ''}"
        data-area="${a}" onclick="setFiltroEstudoArea('${a}')">
        ${a === 'todos' ? 'Todas as áreas' : a}
      </button>`,
      )
      .join('');
  }

  const tipoContainer = el('#estudos-filter-tipo');
  if (tipoContainer) {
    tipoContainer.innerHTML = ['todos', 'documento', 'link', 'curso']
      .map(
        (t) => `
      <button class="estudos-filter-btn ${t === estudosFiltroTipo ? 'active' : ''}"
        data-tipo="${t}" onclick="setFiltroEstudoTipo('${t}')">
        ${t === 'todos' ? 'Todos os tipos' : tiposMap[t] ?? t}
      </button>`,
      )
      .join('');
  }
}

export function setFiltroEstudoArea(area: string): void {
  estudosFiltroArea = area;
  els('#estudos-filter-area .estudos-filter-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.area === area);
  });
  aplicarFiltrosEstudos();
}

export function setFiltroEstudoTipo(tipo: string): void {
  estudosFiltroTipo = tipo;
  els('#estudos-filter-tipo .estudos-filter-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.tipo === tipo);
  });
  aplicarFiltrosEstudos();
}

export function buscarEstudos(valor: string): void {
  estudosBusca = valor.toLowerCase().trim();
  aplicarFiltrosEstudos();
}

function aplicarFiltrosEstudos(): void {
  let resultado = [...estudosData];

  if (estudosFiltroArea !== 'todos') {
    resultado = resultado.filter((e) => e.area === estudosFiltroArea);
  }
  if (estudosFiltroTipo !== 'todos') {
    resultado = resultado.filter((e) => e.tipo === estudosFiltroTipo);
  }
  if (estudosBusca) {
    resultado = resultado.filter(
      (e) =>
        e.titulo.toLowerCase().includes(estudosBusca) ||
        (e.descricao ?? '').toLowerCase().includes(estudosBusca) ||
        (e.area ?? '').toLowerCase().includes(estudosBusca) ||
        (e.disciplina ?? '').toLowerCase().includes(estudosBusca) ||
        (e.criadoPor ?? '').toLowerCase().includes(estudosBusca) ||
        (e.tags ?? []).some((t) => t.toLowerCase().includes(estudosBusca)),
    );
  }

  // Destaques primeiro
  resultado.sort((a, b) => (b.destaque ? 1 : 0) - (a.destaque ? 1 : 0));

  estudosFiltrados = resultado;
  renderEstudosGrid();
  renderEstudosCount();
}

// ── Render grid ───────────────────────────────────────────────────────────────
function renderEstudosGrid(): void {
  const container = el('#estudos-grid');
  if (!container) return;

  if (!estudosFiltrados.length) {
    container.innerHTML = `
      <div class="estudos-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.3"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        <p>Nenhum conteúdo encontrado.</p>
      </div>`;
    return;
  }

  container.innerHTML = estudosFiltrados
    .map((estudo, i) => renderEstudoCard(estudo, i))
    .join('');
}

function renderEstudosCount(): void {
  const countEl = el('#estudos-count');
  if (countEl) {
    const n = estudosFiltrados.length;
    countEl.textContent = `${n} conteúdo${n !== 1 ? 's' : ''} encontrado${n !== 1 ? 's' : ''}`;
  }
}

function renderEstudoCard(estudo: Estudo, index: number): string {
  const tipoInfo = getTipoInfo(estudo.tipo);
  const destaqueMark = estudo.destaque
    ? `<span class="estudo-destaque-badge">⭐ Destaque</span>`
    : '';

  const totalModulos = estudo.modulos?.length ?? 0;
  const modulosConcluidos = estudo.modulos?.filter((m) => m.concluido).length ?? 0;
  const progressoPct = totalModulos > 0 ? Math.round((modulosConcluidos / totalModulos) * 100) : null;

  const tags = (estudo.tags ?? [])
    .slice(0, 3)
    .map((t) => `<span class="estudo-tag">${t}</span>`)
    .join('');

  const metaItems = [
    estudo.disciplina
      ? `<span class="estudo-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>${escapeHTML(estudo.disciplina)}</span>`
      : '',
    estudo.semestre
      ? `<span class="estudo-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>${estudo.semestre}º sem.</span>`
      : '',
    estudo.criadoPor
      ? `<span class="estudo-meta-item"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>${escapeHTML(estudo.criadoPor)}</span>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  const progressoHTML =
    progressoPct !== null
      ? `<div class="estudo-progresso">
          <div class="estudo-progresso-info">
            <span>${modulosConcluidos}/${totalModulos} módulos</span>
            <span>${progressoPct}%</span>
          </div>
          <div class="estudo-progresso-bar">
            <div class="estudo-progresso-fill" style="width:${progressoPct}%"></div>
          </div>
        </div>`
      : '';

  const countHTML =
    estudo.tipo === 'curso' && estudo.modulos
      ? `<span class="estudo-count-badge">${estudo.modulos.length} módulos</span>`
      : estudo.tipo === 'documento' && estudo.anexos?.length
      ? `<span class="estudo-count-badge">${estudo.anexos.length} anexo${estudo.anexos.length > 1 ? 's' : ''}</span>`
      : estudo.tipo === 'link' && estudo.links?.length
      ? `<span class="estudo-count-badge">${estudo.links.length} link${estudo.links.length > 1 ? 's' : ''}</span>`
      : '';

  return `
    <div class="estudo-card anim-fade-up" style="animation-delay:${index * 0.05}s"
      onclick="abrirEstudoModal(${estudo.id})">
      <div class="estudo-card-header">
        <div class="estudo-tipo-badge estudo-tipo-${estudo.tipo}">
          ${tipoInfo.icon} ${tipoInfo.label}
        </div>
        <div class="estudo-header-right">
          ${countHTML}
          ${destaqueMark}
        </div>
      </div>
      <div class="estudo-area">${escapeHTML(estudo.area)}</div>
      <h3 class="estudo-titulo">${escapeHTML(estudo.titulo)}</h3>
      <p class="estudo-descricao">${escapeHTML(estudo.descricao ?? '')}</p>
      ${progressoHTML}
      <div class="estudo-meta">${metaItems}</div>
      <div class="estudo-footer">
        <div class="estudo-tags">${tags}</div>
        <div class="estudo-data">${formatDateShort(estudo.dataEnvio)}</div>
      </div>
    </div>`;
}

function getTipoInfo(tipo: EstudoTipo): TipoInfo {
  const map: Record<EstudoTipo, TipoInfo> = {
    documento: {
      label: 'Documento',
      icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    },
    link: {
      label: 'Link',
      icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    },
    curso: {
      label: 'Curso',
      icon: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`,
    },
  };
  return map[tipo] ?? { label: tipo, icon: '' };
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function abrirEstudoModal(id: number): void {
  const estudo = estudosData.find((e) => e.id === id);
  if (!estudo) return;

  const tipoInfo = getTipoInfo(estudo.tipo);
  const overlay = el('#estudos-modal');
  const box = el('#estudos-modal-box');
  if (!overlay || !box) return;

  box.innerHTML = `
    <button class="modal-close" onclick="fecharEstudosModal()">&#215;</button>
    <div class="estudos-modal-header">
      <span class="estudo-tipo-badge estudo-tipo-${estudo.tipo}">${tipoInfo.icon} ${tipoInfo.label}</span>
      <span class="estudo-area" style="font-size:12px">${escapeHTML(estudo.area)}</span>
    </div>
    <h2 class="estudos-modal-titulo">${escapeHTML(estudo.titulo)}</h2>
    ${estudo.descricao ? `<p class="estudos-modal-desc">${escapeHTML(estudo.descricao)}</p>` : ''}
    ${renderModalProgresso(estudo)}
    ${renderModalModulos(estudo)}
    ${renderModalLinks(estudo.links ?? [])}
    ${renderModalAnexos(estudo.anexos ?? [])}
  `;

  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function renderModalProgresso(estudo: Estudo): string {
  if (!estudo.modulos || estudo.modulos.length === 0) return '';
  const total = estudo.modulos.length;
  const done = estudo.modulos.filter((m) => m.concluido).length;
  const pct = Math.round((done / total) * 100);
  return `
    <div class="estudo-progresso" style="margin:16px 0">
      <div class="estudo-progresso-info">
        <span>${done}/${total} módulos concluídos</span>
        <span style="font-weight:700;color:${pct === 100 ? 'var(--success)' : 'var(--primary)'}">${pct}%</span>
      </div>
      <div class="estudo-progresso-bar">
        <div class="estudo-progresso-fill" style="width:${pct}%"></div>
      </div>
    </div>`;
}

function renderModalModulos(estudo: Estudo): string {
  if (!estudo.modulos || estudo.modulos.length === 0) return '';
  return `
    <div class="estudos-modal-section">
      <div class="estudos-modal-section-title">Módulos</div>
      ${estudo.modulos
        .map(
          (m, i) => `
        <div class="estudo-modulo-item ${m.concluido ? 'concluido' : ''}"
          onclick="toggleModulo(${estudo.id}, ${i})">
          <span class="estudo-modulo-check">${m.concluido ? '✓' : '○'}</span>
          <span class="estudo-modulo-titulo">${escapeHTML(m.titulo)}</span>
          ${m.url ? `<a href="${m.url}" target="_blank" rel="noopener" class="estudo-modulo-link" onclick="event.stopPropagation()">↗</a>` : ''}
        </div>`,
        )
        .join('')}
    </div>`;
}

function renderModalLinks(links: EstudoLink[]): string {
  if (!links.length) return '';
  return `
    <div class="estudos-modal-section">
      <div class="estudos-modal-section-title">Links</div>
      ${links
        .map(
          (l) => `
        <a href="${l.url}" target="_blank" rel="noopener" class="estudo-link-item">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          ${escapeHTML(l.label)}
        </a>`,
        )
        .join('')}
    </div>`;
}

function renderModalAnexos(anexos: EstudoAnexo[]): string {
  if (!anexos.length) return '';
  return `
    <div class="estudos-modal-section">
      <div class="estudos-modal-section-title">Anexos</div>
      ${anexos
        .map(
          (a) => `
        <a href="${a.url}" target="_blank" rel="noopener" class="estudo-anexo-item">
          ${getAnexoIcon(a.tipo)}
          ${escapeHTML(a.nome)}
        </a>`,
        )
        .join('')}
    </div>`;
}

function getAnexoIcon(tipo: string): string {
  const icons: Record<string, string> = {
    pdf: '📄', doc: '📝', ppt: '📊', video: '🎬', zip: '📦',
  };
  return icons[tipo.toLowerCase()] ?? '📎';
}

export function fecharEstudosModal(): void {
  el('#estudos-modal')?.classList.add('hidden');
  document.body.style.overflow = '';
}

export function toggleModulo(estudoId: number, moduloIndex: number): void {
  const estudo = estudosData.find((e) => e.id === estudoId);
  if (!estudo?.modulos?.[moduloIndex]) return;
  estudo.modulos[moduloIndex].concluido = !estudo.modulos[moduloIndex].concluido;
  // Re-renderizar modal
  abrirEstudoModal(estudoId);
}

export function initEstudosModal(): void {
  const overlay = el('#estudos-modal');
  overlay?.addEventListener('click', (e) => {
    if (e.target === overlay) fecharEstudosModal();
  });
}
