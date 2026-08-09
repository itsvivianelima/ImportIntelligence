INSERT INTO `app_users` (`email`, `display_name`, `password_hash`, `password_salt`, `role`)
SELECT
  'itsvivianelima@icloud.com',
  'Viviane Lima',
  'a2bc72f953d021fe49631e0b2d362a4eaa0772e1f7326f25f1bfa4f32ad94d38',
  '2d03c3fe07797921bdc90036a8ac2e2f',
  'ADMIN'
WHERE NOT EXISTS (SELECT 1 FROM `app_users`);
