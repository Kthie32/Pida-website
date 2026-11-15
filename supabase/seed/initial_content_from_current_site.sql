-- =====================================================================
-- OPTIONAL: copy the website's CURRENT content into the database
-- =====================================================================
-- This is NOT sample data. It is the content already shown on the approved public website
-- (the six programme cards and the contact details from pidauganda.org), copied in so
-- that administrators can edit it from the dashboard.
-- Run once, after the four migrations. Safe to run again (existing rows are left unchanged).

insert into public.programmes (slug, title, points, icon, color, sort_order, status) values
  ('health-srhr-and-protection', 'Health, SRHR & Protection', array['Community health information', 'Adolescent sexual and reproductive health, and menstrual health', 'Support for survivors of gender-based violence'], 'steth', '#D31F2A', 10, 'published'),
  ('education-and-skills', 'Education & Skills', array['Learning materials and education support', 'Practical vocational training for girls and young people', 'Books and reading materials supplied to primary schools'], 'book', '#111111', 20, 'published'),
  ('livelihoods-and-enterprise', 'Livelihoods & Enterprise', array['Enterprise coaching and financial literacy', 'Support for women-led businesses and single mothers', 'Mentoring that strengthens household income'], 'briefcase', '#E0457B', 30, 'published'),
  ('food-security-and-agriculture', 'Food Security & Agriculture', array['Knowledge and inputs for household food security', 'Practical agricultural support for rural households', 'Sustainable rural livelihoods'], 'sprout', '#A8151F', 40, 'published'),
  ('water-sanitation-and-hygiene', 'Water, Sanitation & Hygiene', array['Community-led water improvements', 'Safer water closer to underserved households', 'Spring wells improved for safer community water'], 'droplet', '#C2185B', 50, 'published'),
  ('environment-and-clean-energy', 'Environment & Clean Energy', array['Energy-saving practices at household level', 'Environmental stewardship in the face of the wood-fuel and climate crisis', 'Support for cleaner, more efficient energy use'], 'leaf', '#333333', 60, 'published')
on conflict (slug) do nothing;

insert into public.site_settings (key, value, is_public) values
  ('organisation', jsonb_build_object('name', 'Pearl Integrated Development Agency', 'short_name', 'PIDA'), true),
  ('contact', jsonb_build_object(
      'phone',   '+256 752 698589',
      'email',   'info@pidauganda.org',
      'address', 'Milo 8 Trading Centre along Busia–Majanji–Musita Highway, P.O. Box 496, Busia, Uganda'), true)
on conflict (key) do nothing;
