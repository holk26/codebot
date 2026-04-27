# GitHub AI Agent: Nanobot + OpenCode

Sistema de agentes de IA que utiliza **Nanobot** como orquestador y **OpenCode** como ejecutor para reaccionar automáticamente a los issues de GitHub, analizarlos, generar código y crear Pull Requests.

> **SECURITY FIRST**: Esta arquitectura está diseñada para exposición segura a internet vía [Dokploy](https://dokploy.com). Incluye autenticación entre servicios, segmentación de red, rate limiting, hardening de contenedores y validación HMAC de webhooks. Ver [SECURITY.md](SECURITY.md) para detalles completos.

## Arquitectura Segura (Dokploy)

```
Internet
    |
    | HTTPS (TLS 1.3 via Dokploy/Traefik)
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
| - LLM analysis         |
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
2. **Nanobot** → Valida firma HMAC, analiza el issue con LLM
3. **Nanobot** → Si requiere código, delega a OpenCode con API key
4. **OpenCode** → Clona repo, planea cambios, modifica código, crea PR
5. **Nanobot** → Reporta resultado en el issue con link al PR

## Requisitos

- [Dokploy](https://dokploy.com) instalado en tu servidor (o Docker local para desarrollo)
- Token de GitHub PAT con scopes: `repo`, `write:discussion`
- API Key de LLM (OpenRouter recomendado)
- OpenSSL (para generación de secrets)

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
# - GITHUB_TOKEN=ghp_...
# - GITHUB_REPO=owner/repo
# - LLM_API_KEY=sk-or-v1-...
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
├── .env.example                    # Template de variables de entorno
├── .gitignore                      # Excluye secrets
├── SECURITY.md                     # Guía completa de seguridad
├── setup.sh                        # Setup seguro con generación de secrets
├── start.sh                        # Inicio local con validaciones
├── stop.sh                         # Detención local
├── shared/                         # Módulos de seguridad compartidos
│   ├── security.py                # Auth, rate limiting, HMAC verification
│   └── middleware.py              # FastAPI security headers + audit log
├── nanobot-orchestrator/           # Servicio orquestador
│   ├── Dockerfile                  # Multi-stage, non-root, read-only
│   ├── requirements.txt
│   ├── config/
│   │   └── nanobot.json
│   └── src/
│       ├── main.py                # FastAPI con middleware de seguridad
│       ├── config.py              # Configuración
│       ├── webhook_server.py      # Webhook validado + rate limiting
│       ├── github_client.py       # Cliente GitHub API
│       ├── issue_analyzer.py      # Análisis de issues con LLM
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

### Dokploy no despliega
- Verifica que `docker-compose.yml` está en la raíz del repo
- Asegúrate que el Dockerfile de cada servicio es accesible desde el contexto de build
- Revisa los build logs en Dokploy UI

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
