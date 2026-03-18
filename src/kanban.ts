// ===== KANBAN — DaSIboard TypeScript =====

import type { KanbanData, KanbanCard, KanbanColumn, KanbanTag, TagStyle } from './types';
import { escapeHtml, showToast } from './utils';

const KANBAN_KEY = 'dasiboard_kanban_v2';

const TAG_COLORS: Record<KanbanTag, TagStyle> = {
  prova:   { bg: 'rgba(248,113,113,.15)', color: 'var(--danger)',    dot: '#f87171' },
  entrega: { bg: 'rgba(251,191,36,.15)',  color: 'var(--warning)',   dot: '#fbbf24' },
  leitura: { bg: 'rgba(96,165,250,.15)',  color: 'var(--info)',      dot: '#60a5fa' },
  projeto: { bg: 'rgba(167,139,250,.15)', color: 'var(--secondary)', dot: '#a78bfa' },
  pessoal: { bg: 'rgba(134,239,172,.15)', color: 'var(--success)',   dot: '#86efac' },
};

const TAG_LABELS: Record<KanbanTag, string> = {
  prova:   '🔴 Prova',
  entrega: '🟡 Entrega',
  leitura: '📘 Leitura',
  projeto: '🟣 Projeto',
  pessoal: '⚪ Pessoal',
};

// ── Estado do módulo ──────────────────────────────────────────────────────────
let kanbanData: KanbanData = { todo: [], doing: [], done: [] };
let kanbanDragId: string | null = null;
let kanbanEditId: string | null = null;

// ── Persistência ──────────────────────────────────────────────────────────────
export function kanbanLoad(): void {
  try {
    const saved = localStorage.getItem(KANBAN_KEY);
    if (saved) kanbanData = JSON.parse(saved) as KanbanData;
  } catch {
    kanbanData = { todo: [], doing: [], done: [] };
  }
  kanbanData.todo ??= [];
  kanbanData.doing ??= [];
  kanbanData.done ??= [];
}

export function kanbanSave(): void {
  try {
    localStorage.setItem(KANBAN_KEY, JSON.stringify(kanbanData));
  } catch {
    // storage cheia ou bloqueada
  }
}

// ── Render ────────────────────────────────────────────────────────────────────
export function kanbanRender(): void {
  const cols: KanbanColumn[] = ['todo', 'doing', 'done'];
  cols.forEach((col) => {
    const container = document.getElementById(`cards-${col}`);
    const countEl = document.getElementById(`count-${col}`);
    if (!container) return;

    const cards = kanbanData[col] ?? [];
    if (countEl) countEl.textContent = String(cards.length);

    if (cards.length === 0) {
      const labels: Record<KanbanColumn, string> = {
        todo: 'Nenhuma tarefa aqui',
        doing: 'Em andamento...',
        done: 'Nada concluído ainda',
      };
      container.innerHTML = `<div class="kanban-empty-col">${labels[col]}</div>`;
      return;
    }

    container.innerHTML = cards.map((card) => kanbanCardHTML(card)).join('');
  });

  updateHomeKanbanPeek();
  updateStatTasks();
}

function kanbanCardHTML(card: KanbanCard): string {
  const tag = card.tag ? TAG_COLORS[card.tag as KanbanTag] ?? null : null;
  const tagLabel = card.tag ? TAG_LABELS[card.tag as KanbanTag] ?? null : null;

  let dueHTML = '';
  if (card.due) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(`${card.due}T00:00:00`);
    const diff = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);
    let cls = '';
    let label = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    if (diff < 0) {
      cls = 'overdue';
      label = `Atrasado ${Math.abs(diff)}d`;
    } else if (diff <= 3) {
      cls = 'soon';
      label = diff === 0 ? 'Hoje' : `${diff}d`;
    }
    dueHTML = `<span class="kanban-due ${cls}">${label}</span>`;
  }

  return `
    <div class="kanban-card" draggable="true"
      ondragstart="kanbanDragStart(event,'${card.id}')"
      ondragend="kanbanDragEnd(event)"
      id="kcard-${card.id}">
      <div class="kanban-card-top">
        <div class="kanban-card-title">${escapeHtml(card.title)}</div>
        <div class="kanban-card-actions">
          <button class="kanban-action-btn" onclick="openKanbanEdit('${card.id}')" title="Editar">✏️</button>
          <button class="kanban-action-btn delete" onclick="kanbanDelete('${card.id}')" title="Excluir">🗑</button>
        </div>
      </div>
      ${card.desc ? `<div class="kanban-card-desc">${escapeHtml(card.desc)}</div>` : ''}
      <div class="kanban-card-footer">
        ${tag && tagLabel ? `<span class="kanban-tag" style="background:${tag.bg};color:${tag.color}"><span class="kanban-tag-dot" style="background:${tag.dot}"></span>${tagLabel.replace(/^[^\s]+\s/, '')}</span>` : ''}
        ${dueHTML}
      </div>
    </div>
  `;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
export function kanbanAddCard(): void {
  const input = document.getElementById('kanban-new-input') as HTMLInputElement | null;
  const colSel = document.getElementById('kanban-new-col') as HTMLSelectElement | null;
  const tagSel = document.getElementById('kanban-new-tag') as HTMLSelectElement | null;

  const title = input?.value?.trim();
  if (!title) {
    input?.focus();
    return;
  }

  const card: KanbanCard = {
    id: Date.now().toString(),
    title,
    desc: '',
    tag: (tagSel?.value as KanbanTag) || '',
    due: '',
    createdAt: new Date().toISOString(),
  };

  const col = (colSel?.value as KanbanColumn) || 'todo';
  kanbanData[col].unshift(card);
  kanbanSave();
  kanbanRender();

  if (input) {
    input.value = '';
    input.focus();
  }

  const colLabels: Record<KanbanColumn, string> = {
    todo: 'A fazer',
    doing: 'Em andamento',
    done: 'Concluído',
  };
  showToast(`Tarefa adicionada em "${colLabels[col]}"!`);
}

export function kanbanDelete(id: string): void {
  const cols: KanbanColumn[] = ['todo', 'doing', 'done'];
  cols.forEach((col) => {
    kanbanData[col] = kanbanData[col].filter((c) => c.id !== id);
  });
  kanbanSave();
  kanbanRender();
  showToast('Tarefa removida.');
}

// ── Drag & Drop ───────────────────────────────────────────────────────────────
export function kanbanDragStart(event: DragEvent, id: string): void {
  kanbanDragId = id;
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  setTimeout(() => {
    document.getElementById(`kcard-${id}`)?.classList.add('dragging');
  }, 0);
}

export function kanbanDragEnd(_event: DragEvent): void {
  document.querySelectorAll('.kanban-card.dragging').forEach((el) =>
    el.classList.remove('dragging'),
  );
  document.querySelectorAll('.kanban-col.drag-over').forEach((el) =>
    el.classList.remove('drag-over'),
  );
}

export function kanbanDrop(event: DragEvent, targetCol: KanbanColumn): void {
  event.preventDefault();
  if (!kanbanDragId) return;

  document
    .querySelectorAll('.kanban-col')
    .forEach((el) => el.classList.remove('drag-over'));

  let card: KanbanCard | null = null;
  const cols: KanbanColumn[] = ['todo', 'doing', 'done'];
  cols.forEach((col) => {
    const idx = kanbanData[col].findIndex((c) => c.id === kanbanDragId);
    if (idx !== -1) {
      card = kanbanData[col].splice(idx, 1)[0];
    }
  });

  if (card) {
    kanbanData[targetCol].unshift(card);
    kanbanSave();
    kanbanRender();
  }
  kanbanDragId = null;
}

// ── Modal de edição ───────────────────────────────────────────────────────────
export function openKanbanEdit(id: string): void {
  let card: KanbanCard | null = null;
  const cols: KanbanColumn[] = ['todo', 'doing', 'done'];
  cols.forEach((col) => {
    const found = kanbanData[col].find((c) => c.id === id);
    if (found) card = found;
  });
  if (!card) return;

  kanbanEditId = id;
  (document.getElementById('kanban-edit-text') as HTMLInputElement).value = card.title;
  (document.getElementById('kanban-edit-desc') as HTMLTextAreaElement).value = card.desc ?? '';
  (document.getElementById('kanban-edit-tag') as HTMLSelectElement).value = card.tag ?? '';
  (document.getElementById('kanban-edit-due') as HTMLInputElement).value = card.due ?? '';

  document.getElementById('kanban-modal')?.classList.remove('hidden');
  setTimeout(() => {
    (document.getElementById('kanban-edit-text') as HTMLInputElement)?.focus();
  }, 50);
}

export function saveKanbanEdit(): void {
  if (!kanbanEditId) return;
  const title = (
    document.getElementById('kanban-edit-text') as HTMLInputElement
  ).value.trim();
  if (!title) return;

  const cols: KanbanColumn[] = ['todo', 'doing', 'done'];
  cols.forEach((col) => {
    const card = kanbanData[col].find((c) => c.id === kanbanEditId);
    if (card) {
      card.title = title;
      card.desc = (
        document.getElementById('kanban-edit-desc') as HTMLTextAreaElement
      ).value.trim();
      card.tag = (document.getElementById('kanban-edit-tag') as HTMLSelectElement).value as KanbanTag | '';
      card.due = (document.getElementById('kanban-edit-due') as HTMLInputElement).value;
    }
  });

  kanbanSave();
  kanbanRender();
  closeKanbanModal();
  showToast('Tarefa atualizada!');
}

export function closeKanbanModal(): void {
  document.getElementById('kanban-modal')?.classList.add('hidden');
  kanbanEditId = null;
}

export function kanbanClearDone(): void {
  if (kanbanData.done.length === 0) {
    showToast('Nenhuma tarefa concluída para limpar.');
    return;
  }
  kanbanData.done = [];
  kanbanSave();
  kanbanRender();
  showToast('Tarefas concluídas removidas!');
}

// ── Preview na Home ───────────────────────────────────────────────────────────
export function updateHomeKanbanPeek(): void {
  const peek = document.getElementById('kanban-peek');
  if (!peek) return;

  const pending: KanbanCard[] = [...kanbanData.todo, ...kanbanData.doing];

  if (pending.length === 0) {
    peek.innerHTML = '<div class="no-events-msg">Nenhuma tarefa pendente 🎉</div>';
    return;
  }

  const shown = pending.slice(0, 4);
  peek.innerHTML = shown
    .map((card) => {
      const dot = card.tag
        ? TAG_COLORS[card.tag as KanbanTag]?.dot ?? 'var(--text-dim)'
        : 'var(--text-dim)';
      const dueStr = card.due
        ? `<span style="font-family:var(--font-mono);font-size:10.5px;color:var(--text-dim);flex-shrink:0">${new Date(`${card.due}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>`
        : '';
      return `
        <div class="kanban-peek-item" onclick="navigateTo('kanban')">
          <span class="kanban-peek-tag-dot" style="background:${dot}"></span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(card.title)}</span>
          ${dueStr}
        </div>
      `;
    })
    .join('');

  if (pending.length > 4) {
    peek.innerHTML += `<div class="no-events-msg" style="padding:8px 0">+${pending.length - 4} mais</div>`;
  }
}

export function updateStatTasks(): void {
  const statEl = document.getElementById('stat-tasks');
  if (!statEl) return;
  const total = (kanbanData.todo?.length ?? 0) + (kanbanData.doing?.length ?? 0);
  statEl.textContent = String(total);
}

// ── Inicialização ─────────────────────────────────────────────────────────────
export function initKanban(): void {
  kanbanLoad();
  kanbanRender();

  const modal = document.getElementById('kanban-modal');
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeKanbanModal();
  });

  document.querySelectorAll('.kanban-col').forEach((col) => {
    col.addEventListener('dragover', (e) => {
      (e as DragEvent).preventDefault();
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
  });
}
