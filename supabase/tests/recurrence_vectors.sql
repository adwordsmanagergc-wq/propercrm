-- Dumps every next_occurrence() result the database produces across a wide
-- spread of inputs, so tests/rls.test.ts can prove the TypeScript copy in
-- src/lib/recurrence.ts agrees with it date for date.
--
--   psql -v out=/tmp/vectors.csv -f recurrence_vectors.sql
\o :out
copy (
  select
    f.d::text                                              as from_date,
    q.freq::text                                           as frequency,
    a.d::text                                              as anchor,
    array_to_string(w.days, ' ')                           as working_days,
    coalesce(public.next_occurrence(f.d, q.freq, a.d, w.days)::text, '') as next_date
  from (select generate_series('2024-01-01'::date, '2024-03-31'::date, '1 day')::date as d) f
  cross join (select unnest(enum_range(null::public.frequency)) as freq) q
  cross join (values ('2024-01-03'::date), ('2024-06-08'::date), ('2024-02-29'::date)) as a(d)
  cross join (values
    ('{1,2,3,4,5}'::smallint[]),
    ('{1,3,5}'::smallint[]),
    ('{1,2,3,4,5,6,7}'::smallint[]),
    ('{6,7}'::smallint[])
  ) as w(days)
  order by 1, 2, 3, 4
) to stdout csv header;
\o
