# Como Configurar Usuários via SQL e Dashboard

Como a página `/setup-clean` requer autenticação, você pode fazer a configuração diretamente no Supabase usando SQL e o Dashboard.

## Passo 1: Limpar Profiles via SQL

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Vá em **SQL Editor**
3. Execute o script `scripts/010_clean_and_setup_users.sql`

Este script irá:
- ✅ Remover todos os profiles exceto os 4 usuários padrão (se existirem)
- ✅ Atualizar os profiles dos 4 usuários padrão com os dados corretos

## Passo 2: Criar/Atualizar Usuários no Auth

### Opção A: Via Dashboard (Recomendado)

Para cada um dos 4 usuários:

1. Vá em **Authentication** → **Users**
2. Para cada email abaixo, faça:

#### admin@teste.com
- Se não existir: Clique em **Add User** → Preencha:
  - Email: `admin@teste.com`
  - Password: `admin123`
  - Auto Confirm User: ✅ (marcado)
- Se já existir: Clique no usuário → **Update User** → Altere a senha para `admin123`

#### gerente@teste.com
- Se não existir: Clique em **Add User** → Preencha:
  - Email: `gerente@teste.com`
  - Password: `gerente123`
  - Auto Confirm User: ✅ (marcado)
- Se já existir: Clique no usuário → **Update User** → Altere a senha para `gerente123`

#### coordenador@teste.com
- Se não existir: Clique em **Add User** → Preencha:
  - Email: `coordenador@teste.com`
  - Password: `coordenador123`
  - Auto Confirm User: ✅ (marcado)
- Se já existir: Clique no usuário → **Update User** → Altere a senha para `coordenador123`

#### vendedor@teste.com
- Se não existir: Clique em **Add User** → Preencha:
  - Email: `vendedor@teste.com`
  - Password: `vendedor123`
  - Auto Confirm User: ✅ (marcado)
- Se já existir: Clique no usuário → **Update User** → Altere a senha para `vendedor123`

### Opção B: Excluir Usuários Antigos (Opcional)

Se quiser excluir usuários antigos do Auth:

1. Vá em **Authentication** → **Users**
2. Para cada usuário que NÃO seja um dos 4 padrão:
   - Clique no usuário
   - Clique em **Delete User**
   - Confirme a exclusão

**⚠️ ATENÇÃO:** Excluir usuários do Auth também exclui automaticamente os profiles relacionados (devido ao `ON DELETE CASCADE`).

## Passo 3: Verificar Profiles

Após criar os usuários, execute no SQL Editor:

```sql
SELECT id, email, nome, role, ativo, created_at 
FROM public.profiles 
ORDER BY email;
```

Você deve ver apenas os 4 usuários:
- admin@teste.com (role: admin)
- gerente@teste.com (role: Gerente)
- coordenador@teste.com (role: Coordenador)
- vendedor@teste.com (role: Vendedor)

## Passo 4: Atualizar Profiles (se necessário)

Se os profiles não foram criados automaticamente pelo trigger, execute:

```sql
-- Verificar se os profiles existem
SELECT p.id, p.email, p.nome, p.role, u.email as auth_email
FROM public.profiles p
RIGHT JOIN auth.users u ON p.id = u.id
WHERE LOWER(u.email) IN (
  'admin@teste.com',
  'gerente@teste.com',
  'coordenador@teste.com',
  'vendedor@teste.com'
);

-- Se algum profile não existir, criar manualmente
-- (Substitua o UUID pelo ID real do usuário do Auth)

-- Para admin@teste.com (substitua UUID_ADMIN pelo ID real)
INSERT INTO public.profiles (id, email, nome, role)
SELECT id, 'admin@teste.com', 'Admin', 'admin'
FROM auth.users
WHERE LOWER(email) = 'admin@teste.com'
ON CONFLICT (id) DO UPDATE SET
  email = 'admin@teste.com',
  nome = 'Admin',
  role = 'admin';

-- Para gerente@teste.com
INSERT INTO public.profiles (id, email, nome, role)
SELECT id, 'gerente@teste.com', 'Gerente', 'Gerente'
FROM auth.users
WHERE LOWER(email) = 'gerente@teste.com'
ON CONFLICT (id) DO UPDATE SET
  email = 'gerente@teste.com',
  nome = 'Gerente',
  role = 'Gerente';

-- Para coordenador@teste.com
INSERT INTO public.profiles (id, email, nome, role)
SELECT id, 'coordenador@teste.com', 'Coordenador', 'Coordenador'
FROM auth.users
WHERE LOWER(email) = 'coordenador@teste.com'
ON CONFLICT (id) DO UPDATE SET
  email = 'coordenador@teste.com',
  nome = 'Coordenador',
  role = 'Coordenador';

-- Para vendedor@teste.com
INSERT INTO public.profiles (id, email, nome, role)
SELECT id, 'vendedor@teste.com', 'Vendedor', 'Vendedor'
FROM auth.users
WHERE LOWER(email) = 'vendedor@teste.com'
ON CONFLICT (id) DO UPDATE SET
  email = 'vendedor@teste.com',
  nome = 'Vendedor',
  role = 'Vendedor';
```

## Resumo dos Usuários

| Email | Senha | Role |
|-------|-------|------|
| admin@teste.com | admin123 | admin |
| gerente@teste.com | gerente123 | Gerente |
| coordenador@teste.com | coordenador123 | Coordenador |
| vendedor@teste.com | vendedor123 | Vendedor |

## Troubleshooting

### Profile não foi criado automaticamente
- O trigger `on_auth_user_created` deve criar o profile automaticamente
- Se não criou, execute os comandos INSERT do Passo 4

### Erro ao criar usuário no Dashboard
- Verifique se o email já existe
- Se existir, use "Update User" em vez de "Add User"

### Não consigo fazer login
- Verifique se o usuário foi criado corretamente
- Verifique se a senha está correta
- Verifique se o profile existe na tabela `profiles`

