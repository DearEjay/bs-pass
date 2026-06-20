-- budgets: top-level financial plan per user, optionally linked to a project
CREATE TABLE IF NOT EXISTS public.budgets (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id      uuid        REFERENCES public.projects(id) ON DELETE SET NULL,
  title           text        NOT NULL,
  total_amount    numeric(12,2) NOT NULL DEFAULT 0,
  focus_areas     jsonb       NOT NULL DEFAULT '[]',
  ai_advice       text,
  status          text        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  currency        text        NOT NULL DEFAULT 'USD',
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

-- one budget per project (only one active budget per project_id)
CREATE UNIQUE INDEX IF NOT EXISTS budgets_project_id_unique
  ON public.budgets (project_id)
  WHERE project_id IS NOT NULL AND deleted_at IS NULL;

-- budget_line_items: rows in the spreadsheet, grouped by category
CREATE TABLE IF NOT EXISTS public.budget_line_items (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id       uuid        NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  category        text        NOT NULL,
  label           text        NOT NULL,
  budgeted        numeric(12,2) NOT NULL DEFAULT 0,
  actual          numeric(12,2) NOT NULL DEFAULT 0,
  formula         text,           -- raw formula string e.g. "=B3*0.15"
  notes           text,
  sort_order      int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- auto-update updated_at
CREATE TRIGGER set_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER set_budget_line_items_updated_at
  BEFORE UPDATE ON public.budget_line_items
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- RLS: users see only their own budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own budgets"
  ON public.budgets FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can insert their own budgets"
  ON public.budgets FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own budgets"
  ON public.budgets FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own budgets"
  ON public.budgets FOR DELETE
  USING (user_id = auth.uid());

-- RLS: line items accessible via budget ownership
ALTER TABLE public.budget_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view line items of their budgets"
  ON public.budget_line_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.budgets
    WHERE id = budget_line_items.budget_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert line items to their budgets"
  ON public.budget_line_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.budgets
    WHERE id = budget_line_items.budget_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update line items of their budgets"
  ON public.budget_line_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.budgets
    WHERE id = budget_line_items.budget_id AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete line items of their budgets"
  ON public.budget_line_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.budgets
    WHERE id = budget_line_items.budget_id AND user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.budget_line_items TO authenticated;
