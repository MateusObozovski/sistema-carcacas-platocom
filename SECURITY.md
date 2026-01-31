# Segurança do Projeto

## Melhorias Implementadas

### ✅ 1. Proteção CSRF Customizada

**Arquivo:** `lib/csrf-protection.ts`

Implementada validação de origem (Origin/Referer vs Host) para prevenir ataques CSRF.

**Como usar:**
```typescript
import { withCSRFProtection } from "@/lib/csrf-protection"

async function myHandler(request: NextRequest) {
  // Lógica da API
}

export const POST = withCSRFProtection(myHandler)
```

**Proteção:**
- Valida header `Origin` vs `Host` em requisições POST/PUT/DELETE/PATCH
- Bloqueia requisições cross-origin não autorizadas
- Permite requisições GET/HEAD/OPTIONS sem validação

### ✅ 2. Sistema de Logging Seguro

**Arquivo:** `lib/logger.ts`

Logger que só exibe informações sensíveis em desenvolvimento.

**Como usar:**
```typescript
import { logger } from "@/lib/logger"

// Log informativo (apenas dev)
logger.log("[api-name] Processing request", data)

// Log de erro (mensagem genérica em produção)
logger.error("[api-name] Error message", error)

// Log crítico (sempre exibido, não sensível)
logger.info("[api-name] Public info")
```

**Benefícios:**
- Previne vazamento de informações em produção
- Facilita debugging em desenvolvimento
- Sanitiza dados sensíveis automaticamente

### ✅ 3. Respostas de API Padronizadas

**Arquivo:** `lib/api-response.ts`

Helpers para respostas padronizadas com tratamento seguro de erros.

**Como usar:**
```typescript
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  rateLimitResponse,
} from "@/lib/api-response"

// Erro genérico (detalhes apenas em dev)
return errorResponse(error, 500, "Erro ao processar")

// Sucesso
return successResponse({ data: result })

// Validação
return validationErrorResponse(zodError)

// Não autorizado
return unauthorizedResponse()

// Rate limit
return rateLimitResponse(60)
```

## APIs Refatoradas

### ✅ /api/reset-password

- ✅ Proteção CSRF implementada
- ✅ Logging seguro implementado
- ✅ Respostas padronizadas
- ✅ Detalhes de erro protegidos

## Aplicar Melhorias em Outras APIs

Para aplicar as melhorias de segurança nas outras APIs, siga este template:

### Passo 1: Adicionar Imports

```typescript
import { logger } from "@/lib/logger"
import { withCSRFProtection } from "@/lib/csrf-protection"
import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  rateLimitResponse,
} from "@/lib/api-response"
```

### Passo 2: Substituir console.log

**Antes:**
```typescript
console.log("[v0] Creating user:", email)
console.error("[v0] Error:", error)
```

**Depois:**
```typescript
logger.log("[create-user] Creating user:", email)
logger.error("[create-user] Error", error)
```

### Passo 3: Padronizar Respostas de Erro

**Antes:**
```typescript
return NextResponse.json(
  { error: "Dados inválidos", details: error.errors || error.message },
  { status: 400 }
)
```

**Depois:**
```typescript
return validationErrorResponse(error)
```

### Passo 4: Adicionar Proteção CSRF

**Antes:**
```typescript
export async function POST(request: NextRequest) {
  // Lógica
}
```

**Depois:**
```typescript
async function handler(request: NextRequest) {
  // Lógica
}

export const POST = withCSRFProtection(handler)
```

## APIs Pendentes de Refatoração

- [ ] /api/create-user
- [ ] /api/update-user
- [ ] /api/create-profile
- [ ] /api/create-client-user
- [ ] /api/update-roles

## Configurações Adicionais Recomendadas

### Rate Limiting (Produção)

Para produção, migrar de memória para Redis:

```bash
npm install @upstash/redis
```

```typescript
// lib/rate-limit.ts
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
})
```

### Timeout de Sessão no Supabase

Configure no Dashboard do Supabase:
- Auth Settings → Time-box user sessions: 8 horas
- Auth Settings → Inactivity timeout: 30 minutos

### Monitoramento de Erros

Integrar com serviço de monitoramento:

```bash
npm install @sentry/nextjs
```

```typescript
// lib/logger.ts
import * as Sentry from "@sentry/nextjs"

export const logger = {
  error: (message: string, error?: unknown) => {
    if (process.env.NODE_ENV !== "development") {
      Sentry.captureException(error, { extra: { message } })
    } else {
      console.error(message, error)
    }
  },
}
```

## Checklist de Segurança

### Antes de Deploy

- [ ] Todas as APIs usam `withCSRFProtection`
- [ ] Todos os console.log substituídos por `logger`
- [ ] Todas as respostas de erro padronizadas
- [ ] Rate limiting configurado (Redis em produção)
- [ ] Variáveis de ambiente configuradas
- [ ] Timeout de sessão configurado no Supabase
- [ ] Headers de segurança verificados no middleware
- [ ] Build passa sem erros

### Monitoramento Contínuo

- [ ] Logs de erro monitorados (Sentry/LogRocket)
- [ ] Rate limit triggers monitorados
- [ ] Tentativas de CSRF bloqueadas monitoradas
- [ ] Falhas de autenticação monitoradas

## Referências

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/blog/security-nextjs-server-components-actions)
- [Supabase Auth](https://supabase.com/docs/guides/auth/sessions)
