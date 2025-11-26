# Como Resetar Senhas de Usuários no Supabase

Existem três formas de resetar senhas de usuários no Supabase:

## 1. Pelo Dashboard do Supabase (Interface Web)

### Passos:
1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto
3. Vá em **Authentication** → **Users**
4. Encontre o usuário na lista
5. Clique no usuário para abrir os detalhes
6. Clique em **Reset Password** ou **Update User**
7. Digite a nova senha e confirme

**Vantagens:**
- Interface visual e fácil de usar
- Não requer código
- Acesso direto ao banco de dados

**Desvantagens:**
- Precisa acessar o dashboard
- Não integrado com a aplicação

---

## 2. Pela Aplicação (Recomendado)

A aplicação agora possui uma funcionalidade integrada para resetar senhas:

### Como usar:
1. Faça login como **admin**
2. Vá em **Gestão de Usuários**
3. Clique no ícone de **cadeado** (🔒) ao lado do usuário
4. Digite a nova senha no modal
5. Clique em **Resetar Senha**

**Vantagens:**
- Integrado com a aplicação
- Interface amigável
- Validação de senha
- Logs de auditoria
- Rate limiting para segurança

**Requisitos:**
- Usuário logado deve ter role **admin**
- Variável `SUPABASE_SERVICE_ROLE_KEY` configurada

---

## 3. Via API Diretamente (Para Desenvolvedores)

### Usando a API Route da aplicação:

```typescript
const response = await fetch("/api/reset-password", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    userId: "uuid-do-usuario",
    newPassword: "nova-senha-minimo-6-caracteres",
  }),
})

const data = await response.json()
```

### Usando Supabase Admin API diretamente:

```typescript
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
  password: "nova-senha",
})
```

**Vantagens:**
- Controle total
- Pode ser automatizado
- Útil para scripts e migrações

**Desvantagens:**
- Requer conhecimento técnico
- Precisa de service role key
- Mais propenso a erros

---

## Segurança

### Boas Práticas:
- ✅ Use senhas fortes (mínimo 6 caracteres, recomendado 12+)
- ✅ Não compartilhe a `SUPABASE_SERVICE_ROLE_KEY`
- ✅ Use rate limiting para prevenir abusos
- ✅ Registre logs de alterações de senha
- ✅ Notifique o usuário quando a senha for alterada

### Rate Limiting:
A API de reset de senha possui rate limiting configurado para prevenir abusos:
- Limite: 10 requisições por 10 segundos (padrão)
- Pode ser ajustado em `lib/rate-limit.ts`

---

## Troubleshooting

### Erro: "Acesso negado"
- Verifique se o usuário logado tem role **admin**
- Verifique se está autenticado

### Erro: "SUPABASE_SERVICE_ROLE_KEY não configurado"
- Adicione a variável no arquivo `.env.local`
- Reinicie o servidor após adicionar

### Erro: "Usuário não encontrado"
- Verifique se o `userId` está correto
- Verifique se o usuário existe no Supabase

### Senha não funciona após reset
- Aguarde alguns segundos (pode haver delay de sincronização)
- Verifique se a senha atende aos requisitos mínimos
- Tente fazer logout e login novamente

---

## Arquivos Relacionados

- `app/api/reset-password/route.ts` - API route para resetar senhas
- `app/usuarios/page.tsx` - Interface de gestão de usuários
- `lib/rate-limit.ts` - Configuração de rate limiting

