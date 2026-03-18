// ===== TYPES — DaSIboard TypeScript =====

// ── Temas ────────────────────────────────────────────────────────────────────
export interface Theme {
  key: string;
  label: string;
  dark: boolean;
}

// ── Eventos ──────────────────────────────────────────────────────────────────
export type EventType = 'prova' | 'entrega' | 'evento' | 'apresentacao' | 'deadline';

export interface DashboardEvent {
  id?: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  type: EventType;
  description?: string;
  entidade?: string;
  turmas?: string[];
  local?: string;
}

// ── Horários ─────────────────────────────────────────────────────────────────
export type DayName = 'Segunda' | 'Terça' | 'Quarta' | 'Quinta' | 'Sexta' | 'Sábado' | 'Domingo';
export type TipoDisicplina = 'especifica' | 'ciclobasico' | 'optativa' | 'default';

export interface CourseEntry {
  course: string;
  codigo?: string;
  day: DayName;
  time: string; // "HH:MM-HH:MM"
  inicio?: string;
  fim?: string;
  professor: string;
  room: string;
  tipo?: TipoDisicplina;
  code?: string;
  extra?: string[];
  semester?: string;
}

export interface SemesterInfo {
  id: string;
  label: string;
  turmas: string[];
}

export interface TurmaInfo {
  label: string;
  periodo?: string;
}

export interface ScheduleData {
  semesters: SemesterInfo[];
  turmas: Record<string, TurmaInfo>;
  schedule: Record<string, CourseEntry[]>;
}

// ── Newsletter ────────────────────────────────────────────────────────────────
export interface NewsletterItem {
  id: number;
  title: string;
  date: string;
  summary: string;
  content: string;
}

// ── Kanban ────────────────────────────────────────────────────────────────────
export type KanbanColumn = 'todo' | 'doing' | 'done';
export type KanbanTag = 'prova' | 'entrega' | 'leitura' | 'projeto' | 'pessoal';

export interface KanbanCard {
  id: string;
  title: string;
  desc: string;
  tag: KanbanTag | '';
  due: string;
  createdAt: string;
}

export interface KanbanData {
  todo: KanbanCard[];
  doing: KanbanCard[];
  done: KanbanCard[];
}

export interface TagStyle {
  bg: string;
  color: string;
  dot: string;
}

// ── GPA / Notas ───────────────────────────────────────────────────────────────
export interface Discipline {
  id: string;
  name: string;
  credits: number;
  grade: number | null;
}

export interface GPASemester {
  id: string;
  label: string;
  collapsed: boolean;
  disciplines: Discipline[];
}

export interface GPAData {
  semesters: GPASemester[];
}

// ── Entidades ─────────────────────────────────────────────────────────────────
export interface Entidade {
  id: string;
  nome: string;
  emoji: string;
  cor: string;
  descricao?: string;
  site?: string;
  instagram?: string;
}

// ── Docentes ──────────────────────────────────────────────────────────────────
export interface Docente {
  id?: string;
  name: string;
  areas: string;
  lattes?: string;
  email?: string;
  foto?: string;
}

// ── Quotes ────────────────────────────────────────────────────────────────────
export interface Quote {
  text: string;
  author: string;
  source?: string;
}

// ── Autenticação ──────────────────────────────────────────────────────────────
export interface AuthResult {
  success: boolean;
  user?: firebase.User;
  error?: string;
}

export interface UserProfile {
  email: string;
  displayName: string;
  photoURL: string | null;
  bio: string;
  universidade: string;
  curso: string;
  createdAt?: firebase.firestore.FieldValue;
}

export interface UpdateProfileData {
  displayName?: string;
  photoURL?: string;
  bio?: string;
  curso?: string;
}

// ── Estudos ───────────────────────────────────────────────────────────────────
export interface EstudoItem {
  id: string | number;
  title: string;
  url: string;
  category?: string;
  description?: string;
  tags?: string[];
}

// ── Faltas ────────────────────────────────────────────────────────────────────
export interface FaltasDiscipline {
  id: string;
  name: string;
  totalClasses: number;
  absences: number;
  creditHours: number;
}

// ── Time utils ────────────────────────────────────────────────────────────────
export interface TimeRange {
  start: number; // em minutos
  end: number;
}

// ── Search ────────────────────────────────────────────────────────────────────
export interface SearchHit {
  icon: string;
  title: string;
  sub: string;
  action: string;
}

// ── Page keys ────────────────────────────────────────────────────────────────
export type PageKey =
  | 'home' | 'calendar' | 'schedule' | 'kanban' | 'newsletter'
  | 'docentes' | 'estudos' | 'entidades' | 'notas-gpa'
  | 'faltas' | 'ferramentas' | 'leetcode';
