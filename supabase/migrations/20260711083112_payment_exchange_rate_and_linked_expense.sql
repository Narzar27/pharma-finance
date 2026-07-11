-- supabase/migrations/20260711083112_payment_exchange_rate_and_linked_expense.sql
-- exchange_rate: set only when a payment's currency differs from its
-- invoice's currency (cross-currency payoff), used to compute how much of
-- the invoice it covers. payment_id on income_records links an
-- auto-generated expense entry back to the payment that created it, so
-- deleting the payment cascades to delete the linked expense record.

alter table public.payments
  add column if not exists exchange_rate numeric check (exchange_rate is null or exchange_rate > 0);

alter table public.income_records
  add column if not exists payment_id uuid references public.payments(id) on delete cascade;

create index if not exists income_records_payment_id_idx on public.income_records(payment_id);
