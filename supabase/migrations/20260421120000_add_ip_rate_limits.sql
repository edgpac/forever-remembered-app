CREATE TABLE IF NOT EXISTS public.ip_rate_limits (
  ip           TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INT         NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, window_start)
);

CREATE INDEX IF NOT EXISTS ip_rate_limits_window_idx ON public.ip_rate_limits (window_start);

-- Atomically increment count for (ip, window_start); return true if under limit.
CREATE OR REPLACE FUNCTION public.upsert_ip_rate_limit(
  p_ip          TEXT,
  p_window_start TIMESTAMPTZ,
  p_max         INT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INT;
BEGIN
  INSERT INTO public.ip_rate_limits (ip, window_start, count)
  VALUES (p_ip, p_window_start, 1)
  ON CONFLICT (ip, window_start)
  DO UPDATE SET count = ip_rate_limits.count + 1
  RETURNING count INTO v_count;

  -- Prune rows older than 2 hours to keep the table small.
  DELETE FROM public.ip_rate_limits
  WHERE window_start < NOW() - INTERVAL '2 hours';

  RETURN v_count <= p_max;
END;
$$;
