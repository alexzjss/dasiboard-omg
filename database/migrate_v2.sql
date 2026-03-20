-- Migration v2: add missing columns and tables for existing deployments

-- Add class_code to events if missing
ALTER TABLE events ADD COLUMN IF NOT EXISTS class_code VARCHAR(20);
ALTER TABLE events ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS members_only BOOLEAN NOT NULL DEFAULT FALSE;

-- Add attendance to subjects if missing
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS total_classes INTEGER NOT NULL DEFAULT 0;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS attended INTEGER NOT NULL DEFAULT 0;

-- Update event_type check to include 'entity'
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;
ALTER TABLE events ADD CONSTRAINT events_event_type_check
    CHECK (event_type IN ('academic', 'personal', 'deadline', 'exam', 'entity'));

-- Create global_events if missing
CREATE TABLE IF NOT EXISTS global_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(20) NOT NULL DEFAULT 'academic'
        CHECK (event_type IN ('academic', 'personal', 'deadline', 'exam', 'entity')),
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    all_day BOOLEAN NOT NULL DEFAULT FALSE,
    color VARCHAR(7) NOT NULL DEFAULT '#4d67f5',
    location VARCHAR(255),
    class_code VARCHAR(20),
    entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
    members_only BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create entities tables if missing
CREATE TABLE IF NOT EXISTS entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'academic',
    color VARCHAR(7) NOT NULL DEFAULT '#7c3aed',
    icon_emoji VARCHAR(10) NOT NULL DEFAULT '🎓',
    website_url VARCHAR(512),
    instagram_url VARCHAR(512),
    email VARCHAR(255),
    member_key VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entity_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(entity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_members_entity ON entity_members (entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_members_user   ON entity_members (user_id);
CREATE INDEX IF NOT EXISTS idx_events_entity         ON events (entity_id);

-- Seed entities (idempotent)
INSERT INTO entities (slug, name, short_name, description, category, color, icon_emoji, instagram_url, email) VALUES
('dasi',         'Diretório Acadêmico de Sistemas de Informação', 'DASI',       'O DASI é o diretório acadêmico do curso de Sistemas de Informação da EACH-USP. Representa os estudantes, organiza eventos, promove a integração do curso e defende os direitos e interesses dos alunos.', 'academic',  '#7c3aed', '🎓', 'https://instagram.com/dasi.each', 'dasi@usp.br'),
('each-in-shell','EACH in the Shell',                             'EITS',  'Grupo dedicado à segurança da informação, hacking ético e CTF. Realiza workshops, treinamentos e competições de cybersegurança.', 'tech',      '#ef4444', '💻', 'https://instagram.com/eachintheshell', NULL),
('hype',         'HypE — Hub de Pesquisa',                        'HypE',       'Centro de estudos em Ciência de Dados, IA e Machine Learning. Desenvolve pesquisas aplicadas e hackathons.', 'research',  '#f59e0b', '🤖', 'https://instagram.com/hype.each', NULL),
('conway',       'Conway Game Studio',                            'Conway',     'Grupo de desenvolvimento de jogos e computação gráfica. Cria jogos, realiza game jams e estuda Unity/Godot.', 'tech',      '#22c55e', '🎮', 'https://instagram.com/conway.each', NULL),
('codelab',      'CodeLab Leste',                                 'CodeLab',    'Hub de inovação tecnológica e webdev da EACH. Desenvolve produtos digitais e fomenta o empreendedorismo.', 'tech',      '#06b6d4', '⚙️', 'https://instagram.com/codelableste', NULL),
('sintese',      'Síntese Jr.',                                   'Síntese Jr.','Empresa júnior de SI, formada e gerida por alunos. Presta serviços de TI para clientes reais.', 'empresa',   '#ec4899', '💼', 'https://instagram.com/sintesejr', 'contato@sintesejr.com.br'),
('semana-si',    'Semana de SI',                                  'SemanaSI',   'Evento anual de SI da EACH-USP com palestras, workshops e networking com o mercado.', 'event',     '#a855f7', '🎪', 'https://instagram.com/semana.si', NULL),
('lab-minas',    'Lab das Minas',                                 'LabMinas',   'Grupo de pesquisa focado na inserção de mulheres na ciência e tecnologia. Mentorias e rede de apoio.', 'diversity', '#f472b6', '🔬', 'https://instagram.com/labdasminas', NULL),
('pet-si',       'PET-SI — Programa de Educação Tutorial',        'PET-SI',     'Programa de Educação Tutorial de SI, financiado pelo MEC. Pesquisa, ensino e extensão de excelência.', 'research',  '#4d67f5', '📚', 'https://instagram.com/pet.si.each', 'pet-si@usp.br'),
('grace',        'GrACE — Garotas em Computação',                 'GrACE',      'Grupo de garotas em computação e empreendedorismo. Promove diversidade e empodera mulheres na TI.', 'diversity', '#e879f9', '🌸', 'https://instagram.com/grace.each', NULL)
ON CONFLICT (slug) DO NOTHING;
