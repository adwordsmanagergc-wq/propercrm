-- ===========================================================================
-- Proper CRM — demo data
--
-- One company, three cleaners, forty customers and a fortnight of jobs either
-- side of today, so the app is explorable the moment it boots.
--
-- Sign in with any of these (password: password123):
--   owner@propercrm.test    — Owner
--   nina@propercrm.test     — Manager
--   dave@propercrm.test     — Cleaner
--   sam@propercrm.test      — Cleaner
--   ellie@propercrm.test    — Cleaner
-- ===========================================================================

do $$
declare
  v_company   uuid := '11111111-1111-4111-8111-111111111111';
  v_owner     uuid := '22222222-2222-4222-8222-222222222221';
  v_manager   uuid := '22222222-2222-4222-8222-222222222222';
  v_dave      uuid := '22222222-2222-4222-8222-222222222223';
  v_sam       uuid := '22222222-2222-4222-8222-222222222224';
  v_ellie     uuid := '22222222-2222-4222-8222-222222222225';
  v_cleaners  uuid[];
  v_people    jsonb;
  v_person    jsonb;
  v_customer  uuid;
  v_template  uuid;
  v_freq      public.frequency;
  v_today     date := current_date;
  i           integer;
  v_first     text[] := array['John','Margaret','Paul','Susan','David','Helen','Peter','Linda','Andrew','Carol',
                              'Robert','Janet','Michael','Sheila','Colin','Pauline','Keith','Diane','Graham','Angela',
                              'Alan','Wendy','Brian','Christine','Derek','Maureen','Trevor','Barbara','Nigel','Jean',
                              'Roy','Sandra','Malcolm','Gillian','Terry','Kathleen','Stuart','Denise','Barry','Elaine'];
  v_last      text[] := array['Whitfield','Barnes','Cartwright','Hollis','Pemberton','Rowley','Shackleton','Naylor',
                              'Bramley','Fairhurst','Ogden','Tindall','Wainwright','Crossley','Ellery','Hobbs',
                              'Mottram','Rushworth','Stanbury','Verity'];
  v_street    text[] := array['Cavendish Road','Elm Grove','Priory Avenue','Kendrick Road','Bath Road','Wokingham Road',
                              'Northcourt Avenue','Erleigh Road','Christchurch Road','Milman Road','Addington Road',
                              'Hemdean Road','Peppard Road','Prospect Street','Grovelands Road','Basingstoke Road',
                              'Tilehurst Road','Oxford Road','Shinfield Road','Kings Road'];
  v_access    text[] := array['Locked side gate, key in the shed','Ring the bell, back door usually open',
                              'Outside tap is by the garage','Park on the drive, not the road',
                              'Gate code on the keypad','Leave the ladder off the flower bed please',
                              'Conservatory roof too','Elderly — knock loudly', null, null];
begin
  -- ---------------------------------------------------------------- company
  insert into public.companies (
    id, name, slug, phone, email, timezone, plan, trial_ends_at,
    start_postcode, start_lat, start_lng, working_days,
    invoice_prefix, next_invoice_number, payment_terms_days,
    bank_name, bank_account_name, bank_sort_code, bank_account_number, invoice_footer
  ) values (
    v_company, 'Crystal Clear Windows', 'crystal-clear-windows', '0118 496 0142',
    'office@crystalclear.test', 'Europe/London', 'pro', now() + interval '300 days',
    'RG1 5AA', 51.4485, -0.9735, '{1,2,3,4,5}',
    'CCW', 1042, 14,
    'Lloyds', 'Crystal Clear Windows Ltd', '30-96-26', '11223344',
    'Thank you — payment within 14 days please.'
  ) on conflict (id) do nothing;

  -- ------------------------------------------------------------------ users
  v_people := jsonb_build_array(
    jsonb_build_object('id', v_owner,   'email', 'owner@propercrm.test', 'name', 'Ray Bennett',   'role', 'owner',   'phone', '07700 900101'),
    jsonb_build_object('id', v_manager, 'email', 'nina@propercrm.test',  'name', 'Nina Okafor',   'role', 'manager', 'phone', '07700 900102'),
    jsonb_build_object('id', v_dave,    'email', 'dave@propercrm.test',  'name', 'Dave Whitton',  'role', 'cleaner', 'phone', '07700 900103'),
    jsonb_build_object('id', v_sam,     'email', 'sam@propercrm.test',   'name', 'Sam Reilly',    'role', 'cleaner', 'phone', '07700 900104'),
    jsonb_build_object('id', v_ellie,   'email', 'ellie@propercrm.test', 'name', 'Ellie Marsden', 'role', 'cleaner', 'phone', '07700 900105')
  );

  for v_person in select * from jsonb_array_elements(v_people) loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      (v_person ->> 'id')::uuid, 'authenticated', 'authenticated',
      v_person ->> 'email', crypt('password123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', v_person ->> 'name'),
      now(), now(), '', '', '', ''
    ) on conflict (id) do nothing;

    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      (v_person ->> 'id'), (v_person ->> 'id')::uuid,
      jsonb_build_object('sub', v_person ->> 'id', 'email', v_person ->> 'email', 'email_verified', true),
      'email', now(), now(), now()
    ) on conflict do nothing;

    insert into public.profiles (id, company_id, role, full_name, phone)
    values ((v_person ->> 'id')::uuid, v_company, (v_person ->> 'role')::public.user_role,
            v_person ->> 'name', v_person ->> 'phone')
    on conflict (id) do nothing;
  end loop;

  v_cleaners := array[v_dave, v_sam, v_ellie];

  -- -------------------------------------------------------------- customers
  for i in 1..40 loop
    v_customer := ('33333333-3333-4333-8333-' || lpad(i::text, 12, '0'))::uuid;

    insert into public.customers (
      id, company_id, name, phone, email, address_line1, city, postcode,
      lat, lng, access_notes, gate_code, dog_on_site, preferred_contact, is_active
    ) values (
      v_customer, v_company,
      v_first[i] || ' ' || v_last[1 + (i % 20)],
      '07700 9' || lpad((10000 + i * 7)::text, 5, '0'),
      lower(v_first[i]) || '.' || lower(v_last[1 + (i % 20)]) || '@example.test',
      ((i * 7) % 120 + 1)::text || ' ' || v_street[1 + (i % 20)],
      'Reading',
      'RG' || (1 + (i % 6))::text || ' ' || (1 + (i % 9))::text || chr(65 + (i % 20)) || chr(65 + ((i * 3) % 20)),
      51.4400 + ((i % 13) - 6) * 0.0062 + ((i % 5) * 0.0011),
      -0.9900 + ((i % 11) - 5) * 0.0075 + ((i % 7) * 0.0013),
      v_access[1 + (i % 10)],
      case when i % 9 = 0 then lpad((1000 + i)::text, 4, '0') else null end,
      (i % 11 = 0),
      (array['phone','sms','email','phone'])[1 + (i % 4)]::public.contact_pref,
      true
    ) on conflict (id) do nothing;

    -- A second property for a handful of customers.
    if i % 13 = 0 then
      insert into public.properties (
        company_id, customer_id, label, address_line1, city, postcode, lat, lng,
        window_count, storeys, has_conservatory, price
      ) values (
        v_company, v_customer, 'Shop front',
        (100 + i)::text || ' ' || v_street[1 + ((i + 5) % 20)], 'Reading',
        'RG1 ' || (1 + (i % 9))::text || 'BX',
        51.4520 + (i % 5) * 0.001, -0.9750 - (i % 5) * 0.001,
        8 + (i % 10), 2, false, 22.00 + (i % 4) * 4
      );
    end if;

    -- --------------------------------------------------------------- rounds
    v_freq := (array['weekly','fortnightly','4weekly','4weekly','8weekly'])[1 + (i % 5)]::public.frequency;
    v_template := ('44444444-4444-4444-8444-' || lpad(i::text, 12, '0'))::uuid;

    insert into public.job_templates (
      id, company_id, customer_id, price, duration_mins, frequency,
      anchor_date, assigned_cleaner, is_active, instructions
    ) values (
      v_template, v_company, v_customer,
      12.00 + ((i % 8) * 2.5),
      20 + (i % 4) * 10,
      v_freq,
      -- Anchors spread across the previous fortnight so today's list is full.
      public.snap_to_working_day(v_today - 14 + (i % 14), '{1,2,3,4,5}'::smallint[]),
      v_cleaners[1 + (i % 3)],
      true,
      case when i % 7 = 0 then 'Conservatory roof every other visit' else null end
    ) on conflict (id) do nothing;

    perform public.generate_jobs_for_template(v_template, v_today + 21);
  end loop;

  -- Close off the jobs in the past so there is real history to look at.
  update public.jobs j
  set status = 'completed',
      started_at = (j.scheduled_date + time '09:00') + (j.sequence * interval '35 minutes'),
      completed_at = (j.scheduled_date + time '09:00') + (j.sequence * interval '35 minutes') + interval '28 minutes',
      start_lat = c.lat, start_lng = c.lng,
      complete_lat = c.lat, complete_lng = c.lng
  from public.customers c
  where c.id = j.customer_id
    and j.company_id = v_company
    and j.scheduled_date < v_today
    and j.status = 'scheduled'
    and (extract(day from j.scheduled_date)::integer + j.sequence) % 9 <> 0;

  update public.jobs
  set status = 'skipped',
      skip_reason = (array['no_access','dog_on_site','customer_cancelled','weather'])[1 + (sequence % 4)]::public.skip_reason,
      completed_at = scheduled_date + time '11:30'
  where company_id = v_company and scheduled_date < v_today and status = 'scheduled';

  -- A couple of jobs already under way today, so "Today" shows live movement.
  update public.jobs
  set status = 'in_progress', started_at = now() - interval '18 minutes'
  where id in (
    select id from public.jobs
    where company_id = v_company and scheduled_date = v_today and status = 'scheduled'
    order by sequence limit 2
  );
end;
$$;

-- --------------------------------------------------------------------------
-- A few invoices across the aged-debt buckets.
-- --------------------------------------------------------------------------
do $$
declare
  v_company uuid := '11111111-1111-4111-8111-111111111111';
  r         record;
  v_invoice uuid;
  v_number  text;
  v_n       integer := 0;
  v_days    integer;
  v_status  public.invoice_status;
begin
  for r in
    select j.customer_id, array_agg(j.id order by j.scheduled_date) as job_ids, sum(j.price) as total
    from public.jobs j
    where j.company_id = v_company and j.status = 'completed' and not j.invoiced
    group by j.customer_id
    having count(*) >= 1
    order by j.customer_id
    limit 18
  loop
    v_n := v_n + 1;
    v_number := 'CCW-' || lpad((1000 + v_n)::text, 4, '0');
    v_days := (array[75, 45, 20, 5, -3])[1 + (v_n % 5)];

    v_status := (case
      when v_n % 5 = 3 then 'paid'
      when v_days > 0 then 'overdue'
      else 'sent'
    end)::public.invoice_status;

    insert into public.invoices (
      company_id, customer_id, number, issue_date, due_date, status, paid_at, payment_method
    ) values (
      v_company, r.customer_id, v_number,
      current_date - v_days - 14, current_date - v_days, v_status,
      case when v_status = 'paid' then (current_date - v_days + 2)::timestamptz end,
      case when v_status = 'paid' then 'bank'::public.payment_method end
    ) returning id into v_invoice;

    insert into public.invoice_lines (company_id, invoice_id, job_id, description, quantity, unit_price, position)
    select v_company, v_invoice, j.id,
           'Window clean — ' || to_char(j.scheduled_date, 'DD Mon YYYY'),
           1, j.price, row_number() over (order by j.scheduled_date)
    from public.jobs j
    where j.id = any (r.job_ids);

    update public.jobs set invoiced = true where id = any (r.job_ids);
  end loop;

  update public.companies set next_invoice_number = 1000 + v_n + 1 where id = v_company;
end;
$$;
