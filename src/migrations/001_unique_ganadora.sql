CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uniq_pujas_ganadora_por_subasta
  ON pujas (id_subasta)
  WHERE estado = 'Ganadora';