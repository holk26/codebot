# GitHub AI Agent: Nanobot + OpenCode

Sistema de agentes de IA que utiliza **Nanobot** (HKUDS/nanobot-ai) como orquestador y **OpenCode** como ejecutor para reaccionar automáticamente a los issues de GitHub, analizarlos, generar código y crear Pull Requests.

> **SECURITY FIRST**: Esta arquitectura está diseñada para exposición segura a internet vía [Dokploy](https://dokploy.com). Incluye autenticación entre servicios, segmentación de red, rate limiting, hardening de contenedores y validación HMAC de webhooks. Ver [SECURITY.md](SECURITY.md) para detalles completos.

## Arquitectura Segura (Dokploy)

```
Internet
    |
    | HTTPS (TLS 1.3 via Dokploy)
    v
+------------------------+     +------------------------+
| Dokploy Reverse Proxy  |     | OpenCode Executor      |
| (maneja SSL/domain)    |     | - NO expuesto público  |
|                        |     | - API Key required     |
+-----------+------------+     | - Red interna únicam.  |
            |                  +------------------------+
            | HTTP                        ^
            v                             | API Key
+------------------------+                | (red interna)
| Nanobot Orchestrator   |----------------+
| - Webhook validation   |
| - nanobot-ai LLM       |
| - Telegram notific.    |
| - Audit logging        |
+-----------+------------+
            |
            | API GitHub
            v
      +-----------+
      |  GitHub   |
      |  Issues   |
      +-----------+
```

### Flujo de Trabajo

1. **GitHub Webhook** → Envía eventos de issues a través de Dokploy (SSL automático)
2. **Nanobot** → Valida firma HMAC, analiza el issue con LLM (nanobot-ai)
3. **Nanobot** → Si requiere código, delega a OpenCode con API key
4. **OpenCode** → Clona repo, planea cambios, modifica código, crea PR
5. **Nanobot** → Reporta resultado en el issue y envía notificación por Telegram

## Requisitos

- [Dokploy](https://dokploy.com) instalado en tu servidor (o Docker local para desarrollo)
- Token de GitHub PAT con scopes: `repo`, `write:discussion`
- API Key de LLM (OpenRouter recomendado)
- OpenSSL (para generación de secrets)
- **(Opcional)** Bot de Telegram (creado con [@BotFather](https://t.me/botfather))

## Configuración de Nanobot (LLM + Telegram)

### 1. Elegir Modelo y Proveedor

El sistema usa **nanobot-ai** como motor de análisis. Puedes configurar el modelo en `.env`:

```bash
# Proveedor: moonshot, openrouter, openai, anthropic, deepseek, google, mistral
NANOBOT_LLM_PROVIDER=moonshot

# Modelo (depende del proveedor)
# Moonshot ejemplos:
NANOBOT_LLM_MODEL=kimi-k2.6
# NANOBOT_LLM_MODEL=openai/gpt-4o
# NANOBOT_LLM_MODEL=deepseek/deepseek-chat
# NANOBOT_LLM_MODEL=google/gemini-2.5-pro

# API Key del proveedor
OPENROUTER_API_KEY=sk-or-v1-your_key_here
```

### 2. Configurar Telegram (Opcional pero recomendado)

Nanobot puede enviar notificaciones por Telegram cuando:
- Llega un nuevo issue
- Se crea un PR automáticamente
- Hay errores en el procesamiento

**Pasos para configurar:**

1. **Crear un bot con @BotFather**
   - Abre Telegram y busca `@BotFather`
   - Envía `/newbot`
   - Dale un nombre (ej: "GitHub Agent Bot")
   - Dale un username (ej: `tu_github_agent_bot`)
   - Copia el **token** que te da (ej: `123456789:ABCdef...`)

2. **Obtener tu Chat ID**
   - Inicia una conversación con tu bot
   - Visita: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Busca `"chat":{"id":12345678` → ese número es tu Chat ID

3. **Configurar en `.env`**
   ```bash
   TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

4. **(Opcional) Restringir acceso**
   - Para que solo ciertos usuarios puedan interactuar con el bot, edita `nanobot-orchestrator/config/nanobot.json`:
   ```json
   "telegram": {
     "enabled": true,
     "token": "${TELEGRAM_BOT_TOKEN}",
     "allowed_users": [12345678, 87654321]
   }
   ```

### 3. Configuración Completa de Nanobot

El archivo `nanobot-orchestrator/config/nanobot.json` es un **template** que se renderiza automáticamente con las variables de entorno al iniciar el contenedor. Puedes personalizarlo:

```json
{
  "providers": {
    "moonshot": { "apiKey": "${MOONSHOT_API_KEY}" },
    "openai": { "apiKey": "${OPENAI_API_KEY}" },
    "anthropic": { "apiKey": "${ANTHROPIC_API_KEY}" }
  },
  "agents": {
    "defaults": {
      "provider": "${NANOBOT_LLM_PROVIDER}",
      "model": "${NANOBOT_LLM_MODEL}",
      "temperature": 0.3,
      "max_tokens": 4096
    }
  },
  "channels": {
    "telegram": {
      "enabled": true,
      "token": "${TELEGRAM_BOT_TOKEN}",
      "notify_on_issue": true,
      "notify_on_pr": true
    }
  },
  "memory": {
    "enabled": true,
    "max_tokens": 8000
  },
  "skills": {
    "enabled": ["shell", "file", "git", "web_search", "github"]
  }
}
```

## Instalación Rápida (Dokploy)

### Paso 1: Setup Local
```bash
# 1. Clonar
git clone <repo-url>
cd github-ai-agent

# 2. Setup seguro (genera secrets criptográficamente fuertes)
./setup.sh

# 3. Editar configuración
nano .env

# Configuración mínima requerida:
# - INTERNAL_API_KEY (ya generado)
# - REDIS_PASSWORD (ya generado)
# - GITHUB_WEBHOOK_SECRET (ya generado)
# - GITHUB_TOKEN=ghp_...
# - GITHUB_REPO=owner/repo
# - NANOBOT_LLM_PROVIDER=moonshot
# - NANOBOT_LLM_MODEL=kimi-k2.6
# - OPENROUTER_API_KEY=sk-or-v1-...
# - OPENCODE_LLM_API_KEY=sk-or-v1-...
# - TELEGRAM_BOT_TOKEN=123456789:... (opcional)
```

### Paso 2: Desplegar en Dokploy

1. **Sube el código a Git** (GitHub, GitLab, etc.)
2. En **Dokploy Dashboard** → Create Service → Compose
3. Selecciona tu repositorio
4. En la pestaña **Environment**, copia todas las variables de tu `.env`
5. En la pestaña **Domains**, selecciona el servicio `nanobot-orchestrator` y añade tu dominio
6. **Deploy**

Dokploy automáticamente:
- Construye las imágenes Docker
- Obtiene certificado SSL vía Let's Encrypt
- Enruta tu dominio al servicio
- Expone solo el puerto necesario

### Paso 3: Configurar GitHub Webhook

1. Repositorio → Settings → Webhooks → Add webhook
2. **Payload URL**: `https://TU_DOMINIO/webhook/github`
3. **Content type**: `application/json`
4. **Secret**: El valor de `GITHUB_WEBHOOK_SECRET` de tu `.env`
5. **Events**: Issues, Issue comments
6. Activar ✅

> **Importante**: El webhook debe usar HTTPS. Dokploy maneja el SSL automáticamente.

## Estructura del Proyecto

```
.
├── docker-compose.yml              # Orquestación con 2 redes (Dokploy optimized)
├── .env.example                    # Template con todas las variables
├── .gitignore                      # Excluye secrets
├── SECURITY.md                     # Guía completa de seguridad
├── setup.sh                        # Setup seguro con generación de secrets
├── start.sh                        # Inicio local con validaciones
├── stop.sh                         # Detención local
├── shared/                         # Módulos de seguridad compartidos
│   ├── security.py                # Auth, rate limiting, HMAC verification
│   └── middleware.py              # FastAPI security headers + audit log
├── nanobot-orchestrator/           # Servicio orquestador (nanobot-ai)
│   ├── Dockerfile                  # Multi-stage, non-root, read-only
│   ├── entrypoint.sh              # Renderiza config de nanobot al inicio
│   ├── requirements.txt
│   ├── config/
│   │   └── nanobot.json           # Template de config para nanobot-ai
│   └── src/
│       ├── main.py                # FastAPI con middleware de seguridad
│       ├── config.py              # Configuración (incluye Telegram)
│       ├── webhook_server.py      # Webhook validado + rate limiting
│       ├── github_client.py       # Cliente GitHub API
│       ├── issue_analyzer.py      # Análisis de issues con nanobot-ai LLM
│       ├── opencode_client.py     # Cliente autenticado a OpenCode
│       ├── task_queue.py          # Cola de tareas Redis
│       └── worker.py              # Worker de procesamiento
└── opencode-executor/             # Servicio ejecutor (NO expuesto)
    ├── Dockerfile                  # Multi-stage, non-root, read-only
    ├── requirements.txt
    └── src/
        ├── main.py                # FastAPI con validación de API key
        ├── config.py              # Configuración
        ├── api.py                 # API routes (require API key)
        ├── executor.py            # Motor de ejecución
        ├── tools.py               # Herramientas sandboxeadas
        ├── git_utils.py           # Utilidades Git
        └── llm_client.py          # Cliente LLM
```

## Redes y Seguridad

| Red | Exposición | Servicios |
|-----|-----------|-----------|
| `public` | Internet vía Dokploy | Nanobot webhook |
| `internal` | NO (sin salida a internet) | Nanobot ↔ OpenCode ↔ Redis |

**OpenCode Executor nunca es accesible desde internet.** Solo Nanobot puede comunicarse con él a través de la red interna, y cada request requiere `X-Internal-API-Key`.

## Medidas de Seguridad Implementadas

- ✅ **SSL/TLS automático** vía Dokploy (Let's Encrypt)
- ✅ **HMAC-SHA256** en todos los webhooks (obligatorio, no bypass)
- ✅ **Rate limiting** (30 req/min por IP a nivel aplicación)
- ✅ **Network segmentation** (2 redes Docker aisladas)
- ✅ **Service-to-service auth** (API key compartida con `secrets.compare_digest`)
- ✅ **Non-root containers** con capabilities mínimas
- ✅ **Read-only root filesystem** + tmpfs
- ✅ **Security headers** (HSTS, CSP, X-Frame-Options, etc.)
- ✅ **Audit logging** de todas las requests
- ✅ **Multi-stage Docker builds**
- ✅ **No secrets en imágenes Docker**
- ✅ **Redis con password** y protected mode
- ✅ **FastAPI docs disabled** en producción

Para más detalles, ver [SECURITY.md](SECURITY.md).

## Desarrollo Local

```bash
# Iniciar localmente (sin Dokploy)
./start.sh

# Logs
docker compose logs -f nanobot-orchestrator
docker compose logs -f opencode-executor

# Estado
docker compose ps

# Restart de un servicio
docker compose restart nanobot-orchestrator

# Shell en contenedor (debug)
docker compose exec nanobot-orchestrator sh

# Ver config renderizado de nanobot
docker compose exec nanobot-orchestrator cat /home/appuser/.nanobot/config.json
```

## Testing

```bash
# Simular webhook (requiere secret correcto)
SECRET="tu_webhook_secret"
PAYLOAD='{"action":"opened","issue":{"number":1,"title":"Test","body":"Test body"},"repository":{"full_name":"owner/repo"}}'
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')"

curl -X POST https://TU_DOMINIO/webhook/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: issues" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$PAYLOAD"
```

## Troubleshooting

### Webhook "Invalid signature"
- Asegúrate que `GITHUB_WEBHOOK_SECRET` en `.env` coincide con el configurado en GitHub
- No hay espacios ni saltos de línea extra

### "Internal API key not configured"
- Ejecuta `./setup.sh` para generar secrets
- Verifica que las variables de entorno están configuradas en Dokploy

### OpenCode no responde
- Es normal que no responda desde internet - está en red interna
- Verifica logs: `docker compose logs opencode-executor`

### Telegram no envía notificaciones
- Verifica que `TELEGRAM_BOT_TOKEN` es correcto
- Asegúrate de haber iniciado una conversación con el bot
- Revisa los logs: `docker compose logs nanobot-orchestrator | grep -i telegram`

### Error "model not found" en nanobot
- Verifica que el modelo existe en tu proveedor
- Para Moonshot, lista modelos disponibles: https://platform.kimi.ai/playground
- Asegúrate de que la API key tiene crédito/saldo

### Dokploy no despliega
- Verifica que `docker-compose.yml` está en la raíz del repo
- Asegúrate que el Dockerfile de cada servicio es accesible desde el contexto de build
- Revisa los build logs en Dokploy UI

## Modelos Recomendados por Proveedor

| Proveedor | Modelo recomendado | Variable |
|-----------|-------------------|----------|
| **Moonshot** | `kimi-k2.6` | `NANOBOT_LLM_MODEL` |
| **Moonshot** | `kimi-latest` | `NANOBOT_LLM_MODEL` |
| OpenRouter | `anthropic/claude-sonnet-4` | `NANOBOT_LLM_MODEL` |
| OpenAI | `gpt-4o` | `NANOBOT_LLM_MODEL` |
| Anthropic | `claude-sonnet-4-20250514` | `NANOBOT_LLM_MODEL` |
| DeepSeek | `deepseek-chat` | `NANOBOT_LLM_MODEL` |
| Google | `gemini-2.5-pro` | `NANOBOT_LLM_MODEL` |

## Contribuir

1. Fork el repositorio
2. Crea una branch: `git checkout -b feature/nueva-funcionalidad`
3. Commitea tus cambios
4. Push a la branch
5. Abre un Pull Request

## Licencia

MIT

---

*Generado con OpenCode y Nanobot* 🤖
