-- Tabela de catálogo de exercícios
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  movement_pattern TEXT,
  force_vector TEXT,
  joint_type TEXT,
  joint_action TEXT,
  kinetic_chain TEXT,
  training_level TEXT NOT NULL,
  equipment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (catálogo é público)
CREATE POLICY "Exercises are viewable by everyone" 
ON public.exercises 
FOR SELECT 
USING (true);

-- Índices para performance
CREATE INDEX idx_exercises_muscle_group ON public.exercises(muscle_group);
CREATE INDEX idx_exercises_training_level ON public.exercises(training_level);
CREATE INDEX idx_exercises_equipment ON public.exercises(equipment);

-- Inserir exercícios do catálogo
INSERT INTO public.exercises (name, muscle_group, movement_pattern, force_vector, joint_type, joint_action, kinetic_chain, training_level, equipment) VALUES
-- PEITORAL
('Supino reto/Máquina/placas', 'Peitoral', 'Empurrar', 'Horizontal', 'Multiarticular', 'Flexão horizontal do ombro + extensão do cotovelo', 'Aberta', 'Iniciante', 'Máquina/Placas'),
('Supino reto/Máquina/Anilha', 'Peitoral', 'Empurrar', 'Horizontal', 'Multiarticular', 'Flexão horizontal do ombro + extensão do cotovelo', 'Aberta', 'Iniciante', 'Máquina/Anilha'),
('Supino reto/Smith', 'Peitoral', 'Empurrar', 'Horizontal', 'Multiarticular', 'Flexão horizontal do ombro + extensão do cotovelo', 'Aberta', 'Iniciante', 'Smith'),
('Supino reto/Barra', 'Peitoral', 'Empurrar', 'Horizontal', 'Multiarticular', 'Flexão horizontal do ombro + extensão do cotovelo', 'Aberta', 'Intermediário', 'Barra'),
('Supino reto/Halter', 'Peitoral', 'Empurrar', 'Horizontal', 'Multiarticular', 'Flexão horizontal do ombro + extensão do cotovelo', 'Aberta', 'Intermediário', 'Halter'),
('Supino reto/Cabos', 'Peitoral', 'Empurrar', 'Horizontal', 'Multiarticular', 'Flexão horizontal do ombro + extensão do cotovelo', 'Aberta', 'Intermediário', 'Cabos'),
('Supino 30º/Máquina/placas', 'Peitoral', 'Empurrar', 'Diagonal Ascendente', 'Multiarticular', 'Flexão diagonal ascendente do ombro + extensão do cotovelo', 'Aberta', 'Iniciante', 'Máquina/Placas'),
('Supino 30º/Máquina/Anilha', 'Peitoral', 'Empurrar', 'Diagonal Ascendente', 'Multiarticular', 'Flexão diagonal ascendente do ombro + extensão do cotovelo', 'Aberta', 'Iniciante', 'Máquina/Anilha'),
('Supino 30º Smith', 'Peitoral', 'Empurrar', 'Diagonal Ascendente', 'Multiarticular', 'Flexão diagonal ascendente do ombro + extensão do cotovelo', 'Aberta', 'Iniciante', 'Smith'),
('Supino 30º/Barra', 'Peitoral', 'Empurrar', 'Diagonal Ascendente', 'Multiarticular', 'Flexão diagonal ascendente do ombro + extensão do cotovelo', 'Aberta', 'Intermediário', 'Barra'),
('Supino 30º/Halter', 'Peitoral', 'Empurrar', 'Diagonal Ascendente', 'Multiarticular', 'Flexão diagonal ascendente do ombro + extensão do cotovelo', 'Aberta', 'Intermediário', 'Halter'),
('Supino 45º/Máquina/placas', 'Peitoral', 'Empurrar', 'Diagonal Ascendente', 'Multiarticular', 'Flexão diagonal ascendente do ombro + extensão do cotovelo', 'Aberta', 'Iniciante', 'Máquina/Placas'),
('Supino 45º/Barra', 'Peitoral', 'Empurrar', 'Diagonal Ascendente', 'Multiarticular', 'Flexão diagonal ascendente do ombro + extensão do cotovelo', 'Aberta', 'Intermediário', 'Barra'),
('Supino Declinado/Máquina/placas', 'Peitoral', 'Empurrar', 'Diagonal Descendente', 'Multiarticular', 'Flexão diagonal descendente do ombro + extensão do cotovelo', 'Aberta', 'Iniciante', 'Máquina/Placas'),
('Supino Declinado Smith', 'Peitoral', 'Empurrar', 'Diagonal Descendente', 'Multiarticular', 'Flexão diagonal descendente do ombro + extensão do cotovelo', 'Aberta', 'Iniciante', 'Smith'),
('Crucifixo reto com Halter', 'Peitoral', 'Isolamento', 'Horizontal', 'Uniarticular', 'Flexão horizontal do ombro', 'Aberta', 'Intermediário', 'Halter'),
('Crucifixo reto Máquina/placas', 'Peitoral', 'Isolamento', 'Horizontal', 'Uniarticular', 'Flexão horizontal do ombro', 'Aberta', 'Iniciante', 'Máquina/Placas'),
('Crucifixo reto Cabos/Em pé', 'Peitoral', 'Isolamento', 'Horizontal', 'Uniarticular', 'Flexão horizontal do ombro', 'Aberta', 'Intermediário', 'Cabos'),
('Voador', 'Peitoral', 'Isolamento', 'Horizontal', 'Uniarticular', 'Flexão horizontal do ombro', 'Aberta', 'Iniciante', 'Máquina'),
('Mergulho na paralela alta/Máquina/placas', 'Peitoral', 'Empurrar', 'Horizontal', 'Multiarticular', 'Flexão horizontal do ombro + extensão do cotovelo', 'Aberta', 'Iniciante', 'Máquina/Placas'),
('Mergulho na paralela alta/Livre', 'Peitoral', 'Empurrar', 'Horizontal', 'Multiarticular', 'Flexão horizontal do ombro + extensão do cotovelo', 'Fechada', 'Intermediário', 'Peso Corporal'),
('Flexão de Braço aberta', 'Peitoral', 'Empurrar', 'Horizontal', 'Multiarticular', 'Flexão horizontal do ombro + extensão do cotovelo', 'Fechada', 'Intermediário', 'Peso Corporal'),

-- OMBRO
('Desenv. Sentado pegada aberta/Máquina/Placas', 'Ombro', 'Empurrar', 'Vertical', 'Multiarticular', 'Flexão vertical com abdução do ombro + extensão do cotovelo', 'Aberta', 'Iniciante', 'Máquina/Placas'),
('Desenv. Sentado pegada aberta/Máquina/Anilha', 'Ombro', 'Empurrar', 'Vertical', 'Multiarticular', 'Flexão vertical com abdução do ombro + extensão do cotovelo', 'Aberta', 'Iniciante', 'Máquina/Anilha'),
('Desenv. Sentado pegada aberta/Halter', 'Ombro', 'Empurrar', 'Vertical', 'Multiarticular', 'Flexão vertical com abdução do ombro + extensão do cotovelo', 'Aberta', 'Intermediário', 'Halter'),
('Desenv. Sentado pegada aberta/Barra', 'Ombro', 'Empurrar', 'Vertical', 'Multiarticular', 'Flexão vertical com abdução do ombro + extensão do cotovelo', 'Aberta', 'Intermediário', 'Barra'),
('Abdução dos ombros a 90 graus/Halter em pé', 'Ombro', 'Isolamento', 'Vertical', 'Uniarticular', 'Abdução a 90° do ombro', 'Aberta', 'Intermediário', 'Halter'),
('Abdução dos ombros a 90 graus/Máquina/Placas', 'Ombro', 'Isolamento', 'Vertical', 'Uniarticular', 'Abdução a 90° do ombro', 'Aberta', 'Iniciante', 'Máquina/Placas'),
('Flexão dos ombros a 90 graus/Halter/em pé', 'Ombro', 'Isolamento', 'Vertical', 'Uniarticular', 'Flexão a 90° do ombro', 'Aberta', 'Intermediário', 'Halter'),
('Flexão dos ombros a 90 graus/Cabos/em pé', 'Ombro', 'Isolamento', 'Vertical', 'Uniarticular', 'Flexão a 90° do ombro', 'Aberta', 'Intermediário', 'Cabos'),

-- TRAPÉZIO
('Elevação dos ombros/Máquina/Placas/Sentado', 'Trapézio Superior', 'Isolamento', 'Vertical', 'Uniarticular', 'Elevação de escápulas', 'Aberta', 'Iniciante', 'Máquina/Placas'),
('Elevação dos ombros/Halter/em pé', 'Trapézio Superior', 'Isolamento', 'Vertical', 'Uniarticular', 'Elevação de escápulas', 'Aberta', 'Intermediário', 'Halter'),
('Elevação dos ombros p/frente/Smith em pé', 'Trapézio Superior', 'Isolamento', 'Vertical', 'Uniarticular', 'Elevação de escápulas com inclinação anterior', 'Aberta', 'Iniciante', 'Smith'),

-- GRANDE DORSAL
('Puxada pela frente Puxador Alto/Pegada aberta Romana', 'Grande Dorsal', 'Puxar', 'Vertical', 'Multiarticular', 'Adução do ombro + flexão do cotovelo', 'Aberta', 'Intermediário', 'Puxador Alto'),
('Puxada pela frente Puxador Alto/Pegada Fechada Supinada', 'Grande Dorsal', 'Puxar', 'Vertical', 'Multiarticular', 'Extensão do ombro + flexão do cotovelo', 'Aberta', 'Intermediário', 'Puxador Alto'),
('Puxada Pela Frente/pegada aberta e pronada/Máquina Assistida', 'Grande Dorsal', 'Puxar', 'Vertical', 'Multiarticular', 'Adução do ombro + flexão do cotovelo', 'Aberta', 'Iniciante', 'Máquina Assistida'),
('Puxada pegada aberta/Máquina/Placas', 'Grande Dorsal', 'Puxar', 'Vertical', 'Multiarticular', 'Adução do ombro + flexão do cotovelo', 'Aberta', 'Iniciante', 'Máquina/Placas'),
('Puxada pegada aberta/Máquina/Cabos', 'Grande Dorsal', 'Puxar', 'Vertical', 'Multiarticular', 'Adução do ombro + flexão do cotovelo', 'Aberta', 'Iniciante', 'Cabos'),
('Puxada p/frente/peg. aberta/Barra Fixa', 'Grande Dorsal', 'Puxar', 'Vertical', 'Multiarticular', 'Adução do ombro + flexão do cotovelo', 'Fechada', 'Avançado', 'Barra Fixa'),
('Remada sentado peg. Fechada e romana/Máquina/Placas', 'Grande Dorsal', 'Puxar', 'Horizontal', 'Multiarticular', 'Extensão + leve adução do ombro + flexão do cotovelo', 'Aberta', 'Iniciante', 'Máquina/Placas'),
('Remada sentado peg. Fechada e romana/Puxador baixo', 'Grande Dorsal', 'Puxar', 'Horizontal', 'Multiarticular', 'Extensão + leve adução do ombro + flexão do cotovelo', 'Aberta', 'Iniciante', 'Puxador Baixo'),
('Remada uni-lat 3 apoios banco/Halter', 'Grande Dorsal', 'Puxar', 'Horizontal', 'Multiarticular', 'Extensão + leve adução do ombro + flexão do cotovelo', 'Aberta', 'Intermediário', 'Halter'),
('Pull over Máquina', 'Grande Dorsal', 'Isolamento', 'Diagonal Descendente', 'Uniarticular', 'Extensão do ombro', 'Aberta', 'Iniciante', 'Máquina'),
('Pull over reto com halter', 'Grande Dorsal', 'Isolamento', 'Diagonal Descendente', 'Uniarticular', 'Extensão do ombro', 'Aberta', 'Intermediário', 'Halter'),

-- CINTURA ESCAPULAR
('Remada sentado peg. aberta/Maquina/Placas', 'Cintura Escapular', 'Puxar', 'Horizontal', 'Multiarticular', 'Extensão horizontal do ombro + flexão do cotovelo', 'Aberta', 'Iniciante', 'Máquina/Placas'),
('Remada sentado peg. aberta/Maquina/Cabo', 'Cintura Escapular', 'Puxar', 'Horizontal', 'Multiarticular', 'Extensão horizontal do ombro + flexão do cotovelo', 'Aberta', 'Iniciante', 'Cabos'),
('Remada peg. aberta/Bco Alto/Barra', 'Cintura Escapular', 'Puxar', 'Horizontal', 'Multiarticular', 'Extensão horizontal do ombro + flexão do cotovelo', 'Aberta', 'Intermediário', 'Barra'),
('Crucifixo inverso peg. Romana/Maquina/Placa', 'Cintura Escapular', 'Isolamento', 'Horizontal', 'Uniarticular', 'Extensão horizontal do ombro', 'Aberta', 'Iniciante', 'Máquina/Placas'),
('Crucifixo inverso peg pronada/em pé/Cabo', 'Cintura Escapular', 'Isolamento', 'Horizontal', 'Uniarticular', 'Extensão horizontal do ombro', 'Aberta', 'Intermediário', 'Cabos'),

-- TRÍCEPS
('Tríceps sentado Francesa/Máquina/Placa', 'Tríceps', 'Isolamento', 'Horizontal', 'Uniarticular', 'Extensão do cotovelo', 'Aberta', 'Iniciante', 'Máquina/Placas'),
('Triceps francesa/Halter em pé', 'Tríceps', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Extensão do cotovelo', 'Aberta', 'Intermediário', 'Halter'),
('Triceps francesa c/corda/Pux. Alto/em pé', 'Tríceps', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Extensão do cotovelo', 'Aberta', 'Intermediário', 'Puxador Alto'),
('Triceps francesa/Barra H/em pé', 'Tríceps', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Extensão do cotovelo', 'Aberta', 'Intermediário', 'Barra H'),

-- BÍCEPS
('Biceps sentado na Maquina', 'Bíceps', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Flexão do cotovelo', 'Aberta', 'Iniciante', 'Máquina'),
('Biceps sentado na Maquina Scott', 'Bíceps', 'Isolamento', 'Diagonal', 'Uniarticular', 'Flexão do cotovelo', 'Aberta', 'Iniciante', 'Máquina Scott'),
('Biceps direta/Barra/Em pé', 'Bíceps', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Flexão do cotovelo', 'Aberta', 'Intermediário', 'Barra'),
('Biceps direta/Halter/Em pé', 'Bíceps', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Flexão do cotovelo', 'Aberta', 'Intermediário', 'Halter'),
('Biceps alternada/Halter/Em pé', 'Bíceps', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Flexão do cotovelo', 'Aberta', 'Intermediário', 'Halter'),
('Biceps Halter/Banco 80 graus', 'Bíceps', 'Isolamento', 'Diagonal', 'Uniarticular', 'Flexão do cotovelo', 'Aberta', 'Intermediário', 'Halter'),
('Biceps concentrada/Halter/Uni-lat./sentado', 'Bíceps', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Flexão do cotovelo', 'Aberta', 'Intermediário', 'Halter'),

-- ANTEBRAÇO
('Rosca punho direta/Barra/sentado/Banco Bxo', 'Antebraço', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Flexão de punho', 'Aberta', 'Iniciante', 'Barra'),
('Rosca punho inversa/Barra/sentado/Banco Bxo', 'Antebraço', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Extensão de punho', 'Aberta', 'Iniciante', 'Barra'),

-- ABDÔMEN
('Abd. parcial sentado na máquina', 'Abdômen', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Flexão de coluna', 'Aberta', 'Iniciante', 'Máquina'),
('Abd. parcial na máquina/deitado', 'Abdômen', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Flexão de coluna', 'Aberta', 'Iniciante', 'Máquina'),
('Abd. parcial/braços cruzados no tronco', 'Abdômen', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Flexão de coluna', 'Aberta', 'Iniciante', 'Peso Corporal'),
('Abd. parcial/mãos na nuca', 'Abdômen', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Flexão de coluna', 'Aberta', 'Iniciante', 'Peso Corporal'),
('Abd. inversa/joelhos flex./solo', 'Abdômen', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Retroversão de pelve + flexão de quadril', 'Aberta', 'Iniciante', 'Peso Corporal'),
('Abd. c/rotação de tronco alternada', 'Abdômen', 'Isolamento', 'Diagonal', 'Uniarticular', 'Flexão + rotação de coluna', 'Aberta', 'Intermediário', 'Peso Corporal'),
('Abd. parcial/banco inclinado', 'Abdômen', 'Isolamento', 'Diagonal', 'Uniarticular', 'Flexão de coluna', 'Aberta', 'Intermediário', 'Banco Inclinado'),
('Abd. inversa/barra fixa c/joelhos e quadril a 90°', 'Abdômen', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Retroversão de pelve + flexão de quadril', 'Aberta', 'Avançado', 'Barra'),

-- QUADRÍCEPS
('Cadeira extensora simultânea/Máquina/Placas', 'Quadríceps', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Extensão de joelhos', 'Aberta', 'Iniciante', 'Máquina'),
('Cadeira extensora unilateral/Máquina/Placas', 'Quadríceps', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Extensão de joelhos', 'Aberta', 'Iniciante', 'Máquina'),
('Agachamento com fitball apoio na parede', 'Quadríceps', 'Dominância de Joelho', 'Vertical Ascendente', 'Multiarticular', 'Extensão de joelhos e quadril', 'Fechada', 'Iniciante', 'Fitball'),
('Agachamento pés paralelos smith', 'Quadríceps', 'Dominância de Joelho', 'Vertical Ascendente', 'Multiarticular', 'Extensão de joelhos e quadril', 'Fechada', 'Intermediário', 'Smith'),
('Agachamento pés paralelos barra', 'Quadríceps', 'Dominância de Joelho', 'Vertical Ascendente', 'Multiarticular', 'Extensão de joelhos e quadril', 'Fechada', 'Intermediário', 'Barra'),
('Agachamento hack machine', 'Quadríceps', 'Dominância de Joelho', 'Vertical Ascendente', 'Multiarticular', 'Extensão de joelhos e quadril', 'Fechada', 'Intermediário', 'Hack Machine'),
('Agachamento sumô smith', 'Quadríceps', 'Dominância de Joelho', 'Vertical Ascendente', 'Multiarticular', 'Extensão de joelhos e quadril', 'Fechada', 'Intermediário', 'Smith'),
('Leg press sentado', 'Quadríceps', 'Dominância de Joelho', 'Vertical Ascendente', 'Multiarticular', 'Extensão de joelhos e quadril', 'Fechada', 'Iniciante', 'Leg Press Sentado'),
('Leg press horizontal', 'Quadríceps', 'Dominância de Joelho', 'Vertical Ascendente', 'Multiarticular', 'Extensão de joelhos e quadril', 'Fechada', 'Iniciante', 'Leg Press Horizontal'),
('Leg press inclinado', 'Quadríceps', 'Dominância de Joelho', 'Vertical Ascendente', 'Multiarticular', 'Extensão de joelhos e quadril', 'Fechada', 'Intermediário', 'Leg Press Inclinado'),
('Agachamento taça', 'Quadríceps', 'Dominância de Joelho', 'Vertical Ascendente', 'Multiarticular', 'Extensão de joelhos e quadril', 'Fechada', 'Iniciante', 'Halter'),
('Afundo', 'Quadríceps', 'Dominância de Joelho', 'Vertical Ascendente', 'Multiarticular', 'Extensão de joelhos e quadril', 'Fechada', 'Intermediário', 'Peso Corporal'),
('Lunge reverso', 'Quadríceps', 'Dominância de Joelho', 'Vertical Ascendente', 'Multiarticular', 'Extensão de joelhos e quadril', 'Fechada', 'Intermediário', 'Peso Corporal'),
('Step up', 'Quadríceps', 'Dominância de Joelho', 'Vertical Ascendente', 'Multiarticular', 'Extensão de joelhos e quadril', 'Fechada', 'Intermediário', 'Banco'),
('Air squat', 'Quadríceps', 'Dominância de Joelho', 'Vertical Ascendente', 'Multiarticular', 'Extensão de joelhos e quadril', 'Fechada', 'Iniciante', 'Peso Corporal'),
('Agachamento búlgaro', 'Quadríceps', 'Dominância de Joelho', 'Vertical Ascendente', 'Multiarticular', 'Extensão de joelhos e quadril', 'Fechada', 'Avançado', 'Halter'),

-- POSTERIORES DE COXA
('Mesa flexora', 'Posteriores de Coxa', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Flexão de joelhos', 'Aberta', 'Iniciante', 'Máquina'),
('Mesa flexora unilateral', 'Posteriores de Coxa', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Flexão de joelhos', 'Aberta', 'Intermediário', 'Máquina'),
('Cadeira flexora simultânea', 'Posteriores de Coxa', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Flexão de joelhos', 'Aberta', 'Iniciante', 'Máquina'),
('Cadeira flexora unilateral', 'Posteriores de Coxa', 'Isolamento', 'Vertical Ascendente', 'Uniarticular', 'Flexão de joelhos', 'Aberta', 'Intermediário', 'Máquina'),
('Stiff com barra', 'Posteriores de Coxa', 'Dominância de Quadril', 'Vertical Ascendente', 'Multiarticular', 'Extensão de quadril', 'Fechada', 'Intermediário', 'Barra'),
('Stiff com halter', 'Posteriores de Coxa', 'Dominância de Quadril', 'Vertical Ascendente', 'Multiarticular', 'Extensão de quadril', 'Fechada', 'Intermediário', 'Halter'),
('Romanian Deadlift com barra', 'Posteriores de Coxa', 'Dominância de Quadril', 'Vertical Ascendente', 'Multiarticular', 'Extensão de quadril', 'Fechada', 'Intermediário', 'Barra'),
('Bom dia com barra', 'Posteriores de Coxa', 'Dominância de Quadril', 'Vertical Ascendente', 'Multiarticular', 'Extensão de quadril', 'Fechada', 'Intermediário', 'Barra'),
('Flexão dos joelhos na bola', 'Posteriores de Coxa', 'Dominância de Quadril', 'Horizontal', 'Multiarticular', 'Flexão de joelhos com extensão de quadril', 'Fechada', 'Intermediário', 'Fitball'),
('Flexão nórdica', 'Posteriores de Coxa', 'Dominância de Quadril', 'Vertical Ascendente', 'Multiarticular', 'Extensão de quadril e joelhos', 'Fechada', 'Avançado', 'Peso Corporal'),

-- ADUTORES
('Cadeira Adutora', 'Adutores', 'Dominância de Quadril', 'Horizontal', 'Uniarticular', 'Adução do Quadril', 'Aberta', 'Iniciante', 'Máquina'),
('Adução do quadril/tornoz./DL', 'Adutores', 'Dominância de Quadril', 'Vertical Ascendente', 'Uniarticular', 'Adução do Quadril', 'Aberta', 'Intermediário', 'Tornozeleira'),

-- GLÚTEOS
('Cadeira Abdutora/Quadril a 90 graus', 'Glúteos', 'Dominância de Quadril', 'Horizontal', 'Uniarticular', 'Abdução do Quadril', 'Aberta', 'Iniciante', 'Máquina'),
('Cadeira Abdutora/Quadril a 135 graus', 'Glúteos', 'Dominância de Quadril', 'Horizontal', 'Uniarticular', 'Abdução do Quadril', 'Aberta', 'Intermediário', 'Máquina'),
('Elevação pelvica com barra longa no solo', 'Glúteos', 'Dominância de Quadril', 'Vertical Ascendente', 'Multiarticular', 'Extensão do Quadril', 'Fechada', 'Iniciante', 'Barra'),
('Elevação pelvica com barra longa apoio das costas no banco baixo', 'Glúteos', 'Dominância de Quadril', 'Vertical Ascendente', 'Multiarticular', 'Extensão do Quadril', 'Fechada', 'Intermediário', 'Barra'),
('Elevação pelvica na máquina', 'Glúteos', 'Dominância de Quadril', 'Vertical Ascendente', 'Multiarticular', 'Extensão do Quadril', 'Fechada', 'Intermediário', 'Máquina'),
('Mesa Gluteo na Maquina/4 apoios/Placa', 'Glúteos', 'Dominância de Quadril', 'Vertical Ascendente', 'Multiarticular', 'Extensão do Quadril', 'Aberta', 'Intermediário', 'Máquina'),
('Gluteo em pe/Máquina/Placa', 'Glúteos', 'Dominância de Quadril', 'Vertical Ascendente', 'Uniarticular', 'Extensão do Quadril', 'Aberta', 'Intermediário', 'Máquina'),
('Ext. do quadril/tornoz./joelho flexionada/solo', 'Glúteos', 'Dominância de Quadril', 'Vertical Ascendente', 'Uniarticular', 'Extensão do Quadril', 'Aberta', 'Iniciante', 'Tornozeleira'),
('Ext. do quadril/Joelho estendido/Puxador Baixo', 'Glúteos', 'Dominância de Quadril', 'Vertical Ascendente', 'Uniarticular', 'Extensão do Quadril', 'Aberta', 'Intermediário', 'Cabos'),

-- PANTURRILHA
('Flex. Plantar no Leg Press', 'Gastrocnêmios', 'Dominância de Tornozelo', 'Vertical Ascendente', 'Uniarticular', 'Flexão Plantar', 'Aberta', 'Iniciante', 'Leg Press'),
('Flex. Plantar/Smith', 'Gastrocnêmios', 'Dominância de Tornozelo', 'Vertical Ascendente', 'Uniarticular', 'Flexão Plantar', 'Aberta', 'Intermediário', 'Smith'),
('Flex. Plantar/Em Pé/Panturrilheira/Máquina', 'Gastrocnêmios', 'Dominância de Tornozelo', 'Vertical Ascendente', 'Uniarticular', 'Flexão Plantar', 'Aberta', 'Iniciante', 'Máquina'),
('Flex. Plantar simultanea/calco', 'Gastrocnêmios', 'Dominância de Tornozelo', 'Vertical Ascendente', 'Uniarticular', 'Flexão Plantar', 'Aberta', 'Iniciante', 'Calço'),
('Flex. Plantar/joelho Flex/Máquina/Anilha', 'Solear', 'Dominância de Tornozelo', 'Vertical Ascendente', 'Uniarticular', 'Flexão Plantar', 'Aberta', 'Intermediário', 'Máquina'),

-- CORE/ESTABILIDADE
('Prancha frontal', 'Core', 'Estabilização', 'Horizontal', 'Isométrico', 'Estabilização de tronco', 'Fechada', 'Iniciante', 'Peso Corporal'),
('Prancha lateral', 'Core', 'Estabilização', 'Horizontal', 'Isométrico', 'Estabilização lateral de tronco', 'Fechada', 'Intermediário', 'Peso Corporal'),
('Bird dog', 'Core', 'Estabilização', 'Horizontal', 'Multiarticular', 'Estabilização anti-rotacional', 'Fechada', 'Iniciante', 'Peso Corporal'),
('Dead bug', 'Core', 'Estabilização', 'Horizontal', 'Multiarticular', 'Estabilização anti-extensão', 'Aberta', 'Iniciante', 'Peso Corporal'),
('Ponte de glúteo', 'Core', 'Dominância de Quadril', 'Vertical Ascendente', 'Multiarticular', 'Extensão do Quadril', 'Fechada', 'Iniciante', 'Peso Corporal'),
('Ponte unilateral', 'Core', 'Dominância de Quadril', 'Vertical Ascendente', 'Multiarticular', 'Extensão do Quadril', 'Fechada', 'Intermediário', 'Peso Corporal'),

-- CARDIO
('Esteira - Caminhada', 'Cardio', 'LISS', 'Horizontal', 'Multiarticular', 'Locomoção', 'Fechada', 'Iniciante', 'Esteira'),
('Esteira - Corrida', 'Cardio', 'MICT', 'Horizontal', 'Multiarticular', 'Locomoção', 'Fechada', 'Intermediário', 'Esteira'),
('Bicicleta ergométrica', 'Cardio', 'LISS', 'Vertical', 'Multiarticular', 'Locomoção', 'Fechada', 'Iniciante', 'Bicicleta'),
('Elíptico', 'Cardio', 'MICT', 'Vertical', 'Multiarticular', 'Locomoção', 'Fechada', 'Iniciante', 'Elíptico'),
('Remo ergométrico', 'Cardio', 'MICT', 'Horizontal', 'Multiarticular', 'Puxar + Empurrar', 'Fechada', 'Intermediário', 'Remo'),
('Transport', 'Cardio', 'LISS', 'Vertical', 'Multiarticular', 'Locomoção', 'Fechada', 'Iniciante', 'Transport');
