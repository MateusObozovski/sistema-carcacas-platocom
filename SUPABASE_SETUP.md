# Configuração do Supabase

## ✅ Método Recomendado: Setup Automático

### Passo 1: Executar Scripts SQL

Execute os scripts na ordem no Supabase SQL Editor:

1. `scripts/001_create_profiles.sql` - Cria tabela de perfis
2. `scripts/002_create_products.sql` - Cria tabela de produtos
3. `scripts/003_create_clients.sql` - Cria tabela de clientes
4. `scripts/004_create_orders.sql` - Cria tabela de pedidos
5. `scripts/005_create_core_returns.sql` - Cria tabela de devoluções

### Passo 2: Criar Usuários Automaticamente

Acesse a página de setup: **`/setup`**

Esta página usa a API Admin do Supabase para criar todos os usuários automaticamente com um clique.

**Usuários que serão criados:**
- Patrão Admin (patrao@empresa.com) - senha: admin123
- Gerente Silva (gerente@empresa.com) - senha: gerente123
- Yago Vendedor (yago@empresa.com) - senha: yago123
- José Vendedor (jose@empresa.com) - senha: jose123
- Maria Coordenadora (maria@empresa.com) - senha: maria123

### Passo 3: Fazer Login

Após o setup, você pode fazer login em `/login` com qualquer um dos usuários criados!

---

## 🔧 Método Manual (Alternativo)

Se preferir criar usuários manualmente:

### 1. Criar Usuários no Supabase Dashboard

Vá para: **Supabase Dashboard > Authentication > Users > Add User**

Para cada usuário, preencha:
- Email
- Password
- User Metadata (JSON):
  \`\`\`json
  {
    "nome": "Nome do Usuário",
    "role": "Patrão|Gerente|Coordenador|Vendedor"
  }
  \`\`\`

### 2. O Trigger Criará os Perfis Automaticamente

O trigger `on_auth_user_created` criará automaticamente o perfil na tabela `profiles` usando os metadados.

---

## 📊 Estrutura do Banco de Dados

### Tabelas Criadas:
- `profiles` - Perfis de usuários com roles
- `products` - Catálogo de produtos (marca, tipo, categoria)
- `clients` - Clientes vinculados a vendedores
- `orders` - Pedidos com número único
- `order_items` - Itens dos pedidos (múltiplos por pedido)
- `core_returns` - Histórico de devoluções de carcaças

### Row Level Security (RLS):
Todas as tabelas têm RLS habilitado com políticas que:
- **Vendedores**: Só veem seus próprios clientes e pedidos
- **Coordenadores**: Veem dados da sua região
- **Gerentes e Patrão**: Acesso completo a todos os dados

---

## 🚀 Próximos Passos

Após configurar a autenticação, o sistema está pronto para uso!

As próximas melhorias incluem:
- [ ] Migrar dados de localStorage para Supabase (produtos, clientes, pedidos)
- [ ] Implementar sincronização em tempo real
- [ ] Adicionar notificações push
- [ ] Integração com WhatsApp para lembretes

---

## ❗ Troubleshooting

### Erro: "User already exists"
- Os usuários já foram criados. Você pode fazer login diretamente.

### Erro: "Invalid credentials"
- Verifique se os usuários foram criados corretamente no Supabase Auth
- Confirme que o email está verificado (email_confirmed_at não é null)

### Erro: "profiles_role_check constraint"
- Certifique-se de usar exatamente: 'Patrão', 'Gerente', 'Coordenador', 'Vendedor'
- Com acentos e capitalização correta

### Erro: "foreign key constraint"
- O usuário precisa existir em auth.users antes de criar o profile
- Use o método automático via `/setup` para evitar este erro
