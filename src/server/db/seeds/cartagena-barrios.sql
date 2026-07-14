BEGIN;

-- Reconcile earlier seed to the official list: drop "Centro Histórico" (→ "Centro")
-- and "La Matuna" (not in the official division). Both have 0 businesses.
DELETE FROM zones
WHERE city_id = 12 AND name IN ('Centro Histórico', 'La Matuna')
  AND NOT EXISTS (SELECT 1 FROM businesses b WHERE b.zone_id = zones.id);

-- Full official barrio list of Cartagena (128), flat under the city.
INSERT INTO zones (country, city_id, name, display_name, planned)
SELECT 'Colombia', 12, b, b || ', Cartagena, Colombia', true
FROM (VALUES
  ('Centro'),('San Diego'),('Getsemaní'),('El Cabrero'),('Marbella'),('Crespo'),
  ('La Boquilla'),('El Laguito'),('Bocagrande'),('Castillogrande'),('Manga'),
  ('Pie de la Popa'),('Torices'),('Daniel Lemaitre'),('Canapote'),('Santa María'),
  ('San Francisco'),('7 de Agosto'),('Paseo Bolívar'),('República del Caribe'),
  ('Loma Fresca'),('Pablo VI'),('Nariño'),('Lo Amador'),('Bruselas'),('España'),
  ('Paraíso'),('Palestina'),('Santa Rita'),
  ('Olaya Herrera'),('Fredonia'),('La María'),('La Esperanza'),('Boston'),
  ('Zaragocilla'),('Escallón Villa'),('Los Ángeles'),('Los Ejecutivos'),('El Country'),
  ('Los Alpes'),('El Recreo'),('El Bosque'),('Nuevo Bosque'),('Alto Bosque'),('Armenia'),
  ('Chapacuá'),('Chipre'),('El Campestre'),('El Socorro'),('Blas de Lezo'),
  ('Los Caracoles'),('Los Corales'),('Villa Sandra'),('Santa Mónica'),('La Campiña'),
  ('Villa Estrella'),('El Pozón'),('Villas de Aranjuez'),('Flor del Campo'),
  ('Ciudad Bicentenario'),('Colombiatón'),('San José de los Campanos'),('San Fernando'),
  ('Villa Rosita'),('Nelson Mandela'),
  ('Almirante Colón'),('Amberes'),('Barrio Chino'),('Bellavista'),('Buenos Aires'),
  ('Camagüey'),('Ceballos'),('Cerros de Albornoz'),('El Carmelo'),('El Educador'),
  ('El Libertador'),('El Milagro'),('El Progreso'),('El Refugio'),('Henequén'),
  ('La Consolata'),('La Concepción'),('La Princesa'),('La Quinta'),('La Victoria'),
  ('Las Delicias'),('Los Cerros'),('Los Comuneros'),('Los Jardines'),('Los Santanderes'),
  ('María Cano'),('Nueva Delhi'),('Nuevo Paraíso'),('Nuevo Porvenir'),('Paraguay'),
  ('Pasacaballos'),('Policarpa'),('Providencia'),('San Isidro'),('San José Obrero'),
  ('San Pedro Mártir'),('Santa Clara'),('Santa Lucía'),('Ternera'),('Vista Hermosa'),
  ('Vista Hermosa II'),('Veinte de Julio'),('Villa Barraza'),('Villa Hermosa'),
  ('Villa Fanny'),('Villa Zuldany'),('Anita'),('Arroz Barato'),('Membrillal'),
  ('Puerta de Hierro'),('Ricaurte'),
  ('Barú'),('Bocachica'),('Caño del Oro'),('Isla Fuerte'),('Isla Tierra Bomba'),
  ('Punta Arena'),('Santa Ana'),('Arroyo de Piedra'),('Bayunca'),('Pontezuela'),
  ('Manzanillo del Mar'),('Arroyo Grande')
) AS t(b)
ON CONFLICT (city_id, name) DO NOTHING;

COMMIT;
