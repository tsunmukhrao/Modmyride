-- Remove legacy vector-search data and schema objects.
-- This intentionally deletes stored embeddings and cannot be rolled back.

drop trigger if exists product_knowledge_reindex on public.products;
drop trigger if exists compatibility_knowledge_reindex on public.product_compatibility;
drop trigger if exists products_embedding_enqueue on public.products;
drop trigger if exists compatibility_embedding_enqueue on public.product_compatibility;
drop trigger if exists product_specs_embedding_enqueue on public.product_specs;
drop trigger if exists brand_embedding_enqueue on public.brands;
drop trigger if exists category_embedding_enqueue on public.categories;
drop trigger if exists review_embedding_enqueue on public.reviews;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'vector') then
    execute 'drop function if exists public.match_knowledge_documents(vector, integer, text)';
    execute 'drop function if exists public.match_vehicle_knowledge(vector, integer)';
    execute 'drop function if exists public.match_product_embeddings(vector, integer, uuid, uuid, numeric, numeric, boolean, text, text, integer)';
  end if;
end;
$$;

drop function if exists public.claim_product_embedding_jobs(integer);
drop function if exists public.enqueue_product_embedding();
drop function if exists public.enqueue_compatibility_product_embedding();
drop function if exists public.enqueue_product_specs_embedding();
drop function if exists public.enqueue_brand_embeddings();
drop function if exists public.enqueue_category_embeddings();
drop function if exists public.enqueue_review_embedding();
drop function if exists public.enqueue_product_embedding_for_id(uuid, text);
drop function if exists public.mark_product_knowledge_pending();
drop function if exists public.mark_compatibility_knowledge_pending();

drop table if exists
  public.query_embeddings,
  public.embedding_dead_letters,
  public.embedding_jobs,
  public.product_embeddings,
  public.knowledge_documents,
  public.vehicle_knowledge
  cascade;

drop extension if exists vector;
