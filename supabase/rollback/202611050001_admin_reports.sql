revoke all on function public.admin_sales_report(date,date) from public, anon, authenticated;
revoke all on function public.admin_feedback_report(date,date) from public, anon, authenticated;
drop function if exists public.admin_sales_report(date,date);
drop function if exists public.admin_feedback_report(date,date);
