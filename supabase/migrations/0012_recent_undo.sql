-- 0012 — Deshacer un registro reciente (misclick).
-- El historial sigue siendo inmutable: solo quien REGISTRÓ el dato puede
-- BORRARLO dentro de una ventana corta (10 minutos). Nada más antiguo, y de
-- nadie más, se puede borrar. Un borrado dentro de la ventana devuelve la
-- toma a "pendiente" (el índice anti-doble-dosis la libera).

create policy medication_logs_undo on public.medication_logs
  for delete using (
    recorded_by = auth.uid()
    and created_at > now() - interval '10 minutes'
  );

create policy task_logs_undo on public.task_logs
  for delete using (
    recorded_by = auth.uid()
    and created_at > now() - interval '10 minutes'
  );

create policy observations_undo on public.observations
  for delete using (
    recorded_by = auth.uid()
    and created_at > now() - interval '10 minutes'
  );
