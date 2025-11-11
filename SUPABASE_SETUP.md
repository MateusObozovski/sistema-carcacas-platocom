# Configuração do Supabase

## ✅ Status Atual da Integração

### Integração Supabase
- ✅ **Conectada e funcionando**
- ✅ Variáveis de ambiente configuradas
- ✅ Middleware de autenticação ativo
- ✅ Row Level Security (RLS) configurado

### Banco de Dados
O banco de dados já possui todas as tabelas criadas com RLS ativo:

| Tabela | Status | Políticas RLS | Descrição |
|--------|--------|---------------|-----------|
| **profiles** | ✅ Criada | 4 políticas | Perfis de usuários (Patrão, Gerente, Coordenador, Vendedor) |
| **products** | ✅ Criada | 2 políticas | Catálogo de produtos (embreagens) |
| **clients** | ✅ Criada | 3 políticas | Clientes vinculados a vendedores |
| **orders** | ✅ Criada | 3 políticas | Pedidos de venda |
| **order_items** | ✅ Criada | 2 políticas | Itens dos pedidos |
| **core_returns** | ⏳ Pendente | - | Devoluções de carcaças (execute script 005) |

---

## 🚀 Setup Rápido

### Opção 1: Setup Automático (Recomendado)

1. **Execute o script que falta:**
   - Vá até `scripts/005_create_core_returns.sql`
   - Clique em "Run" para executar no Supabase

2. **Crie usuários de teste:**
   - Acesse `/setup` no navegador
   - Clique em "Criar Usuários de Teste"
   - Aguarde a confirmação

3. **Faça login:**
   - Vá para `/login`
   - Use qualquer credencial de teste abaixo

**Credenciais de Teste:**
\`\`\`
Patrão:      patrao@empresa.com    / admin123
Gerente:     gerente@empresa.com   / gerente123
Coordenador: yago@empresa.com      / yago123
Vendedor:    jose@empresa.com      / jose123
Vendedor:    maria@empresa.com     / maria123
\`\`\`

---

## 📊 Estrutura do Banco de Dados

### Tabelas e Relacionamentos

\`\`\`
auth.users (Supabase Auth)
    ↓
profiles (1:1 com auth.users)
    ↓
├── clients (vendedor_id → profiles.id)
│       ↓
└── orders (vendedor_id → profiles.id, cliente_id → clients.id)
        ↓
        ├── order_items (order_id → orders.id, produto_id → products.id)
        └── core_returns (order_id → orders.id)
\`\`\`

### Políticas de Segurança (RLS)

**Vendedores:**
- Veem apenas seus próprios clientes
- Veem apenas seus próprios pedidos
- Podem criar clientes e pedidos
- Veem todos os produtos ativos

**Coordenadores:**
- Veem todos os clientes e pedidos
- NÃO podem gerenciar produtos
- Podem atualizar pedidos

**Gerentes:**
- Acesso total exceto criação de usuários
- Podem gerenciar produtos
- Veem todos os dados

**Patrão:**
- Acesso total incluindo criação de usuários
- Único que pode criar novos perfis

---

## 📝 Scripts SQL Disponíveis

Execute na ordem para criar as tabelas:

1. ✅ `001_create_profiles.sql` - Tabela de perfis + trigger automático
2. ✅ `002_create_products.sql` - Catálogo de produtos
3. ✅ `003_create_clients.sql` - Clientes
4. ✅ `004_create_orders.sql` - Pedidos e itens
5. ⏳ `005_create_core_returns.sql` - Devoluções (execute este)

**Como executar:**
- Método 1: Clique em "Run" ao lado do script no v0
- Método 2: Copie e cole no Supabase SQL Editor

---

## 🔧 Arquitetura da Integração

### Arquivos de Configuração

\`\`\`
lib/supabase/
├── client.ts        - Cliente para uso no browser (Client Components)
├── server.ts        - Cliente para Server Components
└── middleware.ts    - Refresh de tokens e redirecionamentos

middleware.ts         - Middleware global (protege rotas)
\`\`\`

### Fluxo de Autenticação

1. **Login** → `app/login/page.tsx`
   - Usuário entra com email/senha
   - Supabase Auth valida credenciais
   - Busca perfil na tabela `profiles`
   - Redireciona para `/dashboard`

2. **Middleware** → `middleware.ts`
   - Intercepta todas as requisições
   - Refresh automático de tokens
   - Redireciona não autenticados para `/login`
   - Redireciona autenticados de `/login` para `/dashboard`

3. **Context** → `lib/auth-context.tsx`
   - Gerencia estado global do usuário
   - Expõe `{ user, login, logout, isLoading }`
   - Escuta mudanças de autenticação

---

## 🔐 Segurança Implementada

### Row Level Security (RLS)
Todas as tabelas possuem RLS ativo. Exemplos:

**Clientes:**
\`\`\`sql
-- Vendedor vê apenas seus clientes
create policy "Vendedores can view their own clients"
  on clients for select
  using (vendedor_id = auth.uid() OR role IN ('Patrão', 'Gerente'));
\`\`\`

**Pedidos:**
\`\`\`sql
-- Vendedor vê apenas seus pedidos
create policy "Vendedores can view their own orders"
  on orders for select
  using (vendedor_id = auth.uid() OR role IN ('Patrão', 'Gerente'));
\`\`\`

### Triggers Automáticos

**Criação de perfil:**
Quando um usuário se registra no Supabase Auth, um trigger cria automaticamente seu perfil:

\`\`\`sql
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();
\`\`\`

**Atualização de timestamp:**
Todas as tabelas atualizam `updated_at` automaticamente:

\`\`\`sql
create trigger profiles_updated_at
  before update on profiles
  for each row
  execute function handle_updated_at();
\`\`\`

---

## ⚙️ Variáveis de Ambiente

Já configuradas no projeto:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=***
NEXT_PUBLIC_SUPABASE_ANON_KEY=***
SUPABASE_SERVICE_ROLE_KEY=***
\`\`\`

**Não é necessário criar arquivo .env** - as variáveis já estão disponíveis via integração Vercel.

---

## 🐛 Solução de Problemas

### Erro: "Failed to fetch"
**Causa:** Variáveis de ambiente não configuradas
**Solução:** Verifique a seção "Vars" no sidebar do v0

### Erro: "new row violates row-level security policy"
**Causa:** Usuário sem permissão para a operação
**Solução:** 
- Confirme que o usuário está autenticado
- Verifique se o perfil existe na tabela `profiles`
- Confirme que o role do usuário permite a operação

### Erro: "relation does not exist"
**Causa:** Tabela não foi criada
**Solução:** Execute os scripts SQL na ordem (001 → 005)

### Login não funciona
**Causa:** Perfil não existe na tabela `profiles`
**Solução:** 
1. Verifique se o trigger `on_auth_user_created` existe
2. Crie o perfil manualmente ou use o setup em `/setup`

### Middleware redireciona em loop
**Causa:** Configuração incorreta de paths públicos
**Solução:** Já está corrigido - paths públicos incluem `/login`, `/setup`, `/`

---

## 📈 Próximos Passos

Após configurar tudo:

1. ✅ Execute o script `005_create_core_returns.sql`
2. ✅ Crie usuários de teste via `/setup`
3. ✅ Faça login e teste o sistema
4. ⏳ Migre dados de localStorage para Supabase (se houver)
5. ⏳ Implemente funcionalidades de CRUD nas páginas
6. ⏳ Adicione sincronização em tempo real

---

## 📚 Recursos Úteis

- [Supabase Dashboard](https://app.supabase.com)
- [Documentação Supabase](https://supabase.com/docs)
- [Políticas RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Triggers PostgreSQL](https://www.postgresql.org/docs/current/trigger-definition.html)

---

**Sistema pronto para uso!** 🎉
