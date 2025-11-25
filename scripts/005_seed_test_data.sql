-- Seed some test products
insert into public.products (nome, marca, tipo, categoria, aplicacao, preco_base, desconto_maximo_bt, ativo)
values
  ('Embreagem Sachs 180mm', 'Sachs', 'Embreagem', 'Linha Leve', 'VW Gol 1.0', 450.00, 15.00, true),
  ('Embreagem Sachs 200mm', 'Sachs', 'Embreagem', 'Linha Leve', 'Fiat Palio 1.4', 520.00, 15.00, true),
  ('Embreagem LUK 215mm', 'LUK', 'Embreagem', 'Linha Média', 'Ford Focus 1.6', 680.00, 12.00, true),
  ('Embreagem LUK 228mm', 'LUK', 'Embreagem', 'Linha Média', 'Chevrolet Cruze 1.8', 750.00, 12.00, true),
  ('Embreagem Valeo 240mm', 'Valeo', 'Embreagem', 'Linha Pesada', 'Toyota Hilux 2.8', 920.00, 10.00, true)
on conflict do nothing;
