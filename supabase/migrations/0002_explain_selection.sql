-- 0002: lời gọi explain-selection (D-82, 03 Mục 3)
-- ai_cache.kind thêm 'SELECTION_EXPLAIN'; ai_usage.call_kind thêm 'EXPLAIN'.
-- Ràng buộc ở 0001 không đặt tên ⇒ Postgres tự đặt <bảng>_<cột>_check.

alter table ai_cache drop constraint if exists ai_cache_kind_check;
alter table ai_cache add constraint ai_cache_kind_check
  check (kind in ('NODE_ANALYSIS','REPO_OVERVIEW','SELECTION_EXPLAIN'));

alter table ai_usage drop constraint if exists ai_usage_call_kind_check;
alter table ai_usage add constraint ai_usage_call_kind_check
  check (call_kind in ('ANALYZE','OVERVIEW','QUESTIONS','GRADE','EXPLAIN'));
