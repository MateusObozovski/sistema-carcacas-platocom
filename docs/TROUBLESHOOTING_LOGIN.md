# Troubleshooting - Problemas de Login

## Problema: Não consigo fazer login mesmo com a senha correta

### Verificações Necessárias

#### 1. Verificar se o Profile foi criado

Execute no SQL Editor do Supabase:

```sql
SELECT 
  u.id,
  u.email as auth_email,
  u.email_confirmed_at,
  p.id as profile_id,
  p.email as profile_email,
  p.nome,
  p.role,
  p.ativo
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE LOWER(u.email) = 'admin@teste.com';
```

**Se `profile_id` for NULL:**
- O profile não foi criado
- Execute o script `scripts/011_fix_user_profiles.sql`

#### 2. Verificar se o Email está Confirmado

No Supabase Dashboard:
1. Vá em **Authentication** → **Users**
2. Clique no usuário
3. Verifique se **Email Confirmed** está marcado
4. Se não estiver, clique em **Confirm Email** ou marque **Auto Confirm User** ao criar

**Via SQL:**
```sql
SELECT 
  email,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN 'NÃO CONFIRMADO'
    ELSE 'Confirmado'
  END as status
FROM auth.users
WHERE LOWER(email) = 'admin@teste.com';
```

#### 3. Verificar se o Profile está Ativo

```sql
SELECT email, nome, role, ativo
FROM public.profiles
WHERE LOWER(email) = 'admin@teste.com';
```

**Se `ativo = false`:**
```sql
UPDATE public.profiles
SET ativo = true
WHERE LOWER(email) = 'admin@teste.com';
```

#### 4. Verificar se a Senha está Correta

**No Dashboard:**
1. Vá em **Authentication** → **Users**
2. Clique no usuário
3. Clique em **Reset Password** ou **Update User**
4. Defina uma nova senha
5. Certifique-se de salvar

**Importante:** A senha no Supabase Auth é diferente da senha no profile. A autenticação usa a senha do Auth.

#### 5. Verificar Formato do Email

O email pode estar com maiúsculas/minúsculas diferentes. Verifique:

```sql
SELECT email FROM auth.users WHERE LOWER(email) = 'admin@teste.com';
SELECT email FROM public.profiles WHERE LOWER(email) = 'admin@teste.com';
```

Ambos devem retornar o mesmo email (preferencialmente em minúsculas).

#### 6. Limpar Cache do Navegador

1. Abra o DevTools (F12)
2. Vá em **Application** → **Storage**
3. Clique em **Clear site data**
4. Ou use modo anônimo/privado

#### 7. Verificar Console do Navegador

Abra o Console (F12) e tente fazer login. Procure por erros como:
- "Invalid login credentials"
- "Email not confirmed"
- "User not found"

## Solução Rápida: Script Completo

Execute o script `scripts/011_fix_user_profiles.sql` que irá:

1. ✅ Verificar quais usuários têm profile
2. ✅ Criar profiles faltantes
3. ✅ Atualizar profiles existentes
4. ✅ Verificar status de confirmação de email
5. ✅ Mostrar relatório final

## Passos para Corrigir Manualmente

### Passo 1: Confirmar Email no Dashboard

1. Acesse **Authentication** → **Users**
2. Para cada usuário:
   - Clique no usuário
   - Se **Email Confirmed** não estiver marcado:
     - Clique em **Confirm Email** ou
     - Marque **Auto Confirm User** e salve

### Passo 2: Resetar Senha

1. No Dashboard, para cada usuário:
   - Clique no usuário
   - Clique em **Update User**
   - Defina a senha: `123456`
   - Salve

### Passo 3: Verificar/Criar Profile

Execute no SQL Editor:

```sql
-- Verificar se profile existe
SELECT * FROM public.profiles WHERE LOWER(email) = 'admin@teste.com';

-- Se não existir, criar (substitua UUID pelo ID do usuário do Auth)
INSERT INTO public.profiles (id, email, nome, role, ativo)
SELECT id, 'admin@teste.com', 'Admin', 'admin', true
FROM auth.users
WHERE LOWER(email) = 'admin@teste.com';
```

### Passo 4: Testar Login

1. Limpe o cache do navegador
2. Acesse a tela de login
3. Use:
   - Email: `admin@teste.com`
   - Senha: `123456`

## Erros Comuns

### "Invalid login credentials"
- ✅ Verifique se a senha está correta no Dashboard
- ✅ Verifique se o email está correto (case-sensitive)
- ✅ Tente resetar a senha no Dashboard

### "Email not confirmed"
- ✅ Confirme o email no Dashboard
- ✅ Ou marque "Auto Confirm User"

### "User not found"
- ✅ Verifique se o usuário existe no Auth
- ✅ Verifique se o email está correto

### Login funciona mas redireciona para /login
- ✅ Verifique se o profile foi criado
- ✅ Verifique se o profile está ativo
- ✅ Verifique os logs no console do navegador

## Checklist Final

Antes de tentar fazer login, verifique:

- [ ] Usuário existe em `auth.users`
- [ ] Email está confirmado (`email_confirmed_at IS NOT NULL`)
- [ ] Profile existe em `public.profiles`
- [ ] Profile está ativo (`ativo = true`)
- [ ] Role está correta no profile
- [ ] Senha está correta no Auth (não no profile)
- [ ] Cache do navegador foi limpo
- [ ] Console do navegador não mostra erros

## Comandos SQL Úteis

```sql
-- Ver todos os usuários e seus profiles
SELECT 
  u.email as auth_email,
  u.email_confirmed_at,
  p.email as profile_email,
  p.nome,
  p.role,
  p.ativo
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
ORDER BY u.email;

-- Resetar senha via SQL (NÃO FUNCIONA - precisa ser via Dashboard ou API)
-- A senha precisa ser resetada via Dashboard ou API route /api/reset-password

-- Ativar todos os profiles
UPDATE public.profiles SET ativo = true;

-- Confirmar emails (se tiver permissão)
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;
```

