# GitHub AI Agent: Nanobot + OpenCode

Sistema de agentes de IA que utiliza **Nanobot** como orquestador y **OpenCode** como ejecutor para reaccionar automáticamente a los issues de GitHub, analizarlos, generar código y crear Pull Requests.

## Arquitectura

```
GitHub Webhook
      |
      v
+-------------------+     HTTP API      +-------------------+
|  Nanobot          | --------------->  |  OpenCode         |
|  Orchestrator     |                   |  Executor         |
|  (Python/FastAPI) |                   |  (Python/FastAPI) |
+-------------------+                   +-------------------+
        |                                       |
        | GitHub API                            | Git + GitHub API
        v                                       v
   +---------+                            +----------+
   | GitHub  |                            |  Repo    |
   | Issues  |                            |  Code    |
   +---------+                            +----------+
```

### Flujo de Trabajo

1. **GitHub Webhook** → Envía eventos de issues a Nanobot Orchestrator
2. **Nanobot** → Analiza el issue con LLM, determina si requiere cambios de código
3. **Nanobot** → Si se requieren cambios, delega la ejecución a OpenCode Executor vía API HTTP
4. **OpenCode** → Clona el repo, analiza el código, aplica cambios usando herramientas (bash/read/write/edit)
5. **OpenCode** → Commitea, pushea a una nueva branch y crea un Pull Request
6. **Nanobot** → Comenta en el issue con el resultado y link al PR

## Estructura del Proyecto

```
.
├── docker-compose.yml              # Orquestación de contenedores
├── .env.example                    # Template de variables de entorno
├── setup.sh                        # Script de instalación
├── start.sh                        # Script de inicio
├── stop.sh                         # Script de detención
├── nanobot-orchestrator/           # Servicio orquestador
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── config/
│   │   └── nanobot.json           # Configuración de nanobot
│   └── src/
│       ├── main.py                # Entry point FastAPI
│       ├── config.py              # Configuración
│       ├── webhook_server.py      # Receptor de webhooks GitHub
│       ├── github_client.py       # Cliente GitHub API
│       ├── issue_analyzer.py      # Análisis de issues con LLM
│       ├── opencode_client.py     # Cliente para OpenCode executor
│       ├── task_queue.py          # Cola de tareas Redis
│       └── worker.py              # Worker de procesamiento
└── opencode-executor/             # Servicio ejecutor
    ├── Dockerfile
    ├── requirements.txt
    └── src/
        ├── main.py                # Entry point FastAPI
        ├── config.py              # Configuración
        ├── api.py                 # API routes
        ├── executor.py            # Motor de ejecución
        ├── tools.py               # Herramientas (bash, read, write, edit)
        ├── git_utils.py           # Utilidades Git
        └── llm_client.py          # Cliente LLM
```

## Requisitos

- Docker 24.0+
- docker-compose 2.20+
- Token de GitHub Personal Access Token con permisos: `repo`, `issues`, `pull_requests`
- API Key de LLM (OpenRouter recomendado, o OpenAI/Anthropic)

## Instalación Rápida

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd github-ai-agent

# 2. Ejecutar setup
./setup.sh

# 3. Editar configuración
nano .env

# 4. Iniciar servicios
./start.sh
```

## Configuración

Copia `.env.example` a `.env` y configura:

```bash
# GitHub
GITHUB_TOKEN=ghp_your_token_here
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_REPO=owner/repository

# LLM (OpenRouter recomendado)
LLM_PROVIDER=openrouter
LLM_API_KEY=sk-or-v1-your_key
LLM_MODEL=anthropic/claude-opus-4

# OpenCode puede usar mismo o diferente modelo
OPENCODE_LLM_PROVIDER=openrouter
OPENCODE_LLM_API_KEY=sk-or-v1-your_key
OPENCODE_LLM_MODEL=anthropic/claude-opus-4
```

## Configuración del Webhook en GitHub

1. Ve a tu repositorio en GitHub → Settings → Webhooks → Add webhook
2. **Payload URL**: `http://your-server:8000/webhook/github`
3. **Content type**: `application/json`
4. **Secret**: El mismo valor que `GITHUB_WEBHOOK_SECRET`
5. **Events**: Selecciona "Issues" y "Issue comments"
6. Activa el webhook

> **Nota**: Para desarrollo local, puedes usar [ngrok](https://ngrok.com/) o [smee.io](https://smee.io/) para exponer tu localhost.

## Uso

### Iniciar servicios
```bash
docker-compose up -d
```

### Ver logs
```bash
docker-compose logs -f nanobot-orchestrator
docker-compose logs -f opencode-executor
```

### Detener servicios
```bash
./stop.sh
```

### Probar manualmente
```bash
# Health checks
curl http://localhost:8000/health
curl http://localhost:8001/health

# Simular un webhook (para pruebas)
curl -X POST http://localhost:8000/webhook/github \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: issues" \
  -d '{
    "action": "opened",
    "issue": {"number": 1, "title": "Test", "body": "Test body"},
    "repository": {"full_name": "owner/repo"}
  }'
```

## Cómo Funciona

### 1. Análisis del Issue (Nanobot)
Cuando llega un webhook de un issue nuevo, Nanobot:
- Verifica la firma del webhook
- Consulta el issue completo vía GitHub API
- Usa un LLM para analizar el tipo de issue (bug, feature, docs, etc.)
- Decide si requiere cambios de código
- Si NO requiere código: solo etiqueta el issue
- Si requiere código: delega a OpenCode

### 2. Ejecución de Código (OpenCode)
OpenCode Executor recibe la tarea y:
- Clona/actualiza el repositorio en `/workspace`
- Genera un plan de cambios usando LLM
- Lee archivos relevantes del proyecto
- Genera/modifica código usando herramientas seguras
- Ejecuta comandos de verificación (tests, lint, etc.)
- Crea una branch, commitea y pushea
- Crea un Pull Request vía GitHub API

### 3. Seguridad
- Los comandos bash están sandboxeados al directorio `/workspace`
- Se bloquean comandos peligrosos (`rm -rf /`, etc.)
- Se limita el número de llamadas a herramientas (default: 50)
- Timeout de ejecución (default: 10 minutos)

## Personalización

### Ajustar análisis de issues
Edita `nanobot-orchestrator/src/issue_analyzer.py`:
- Modifica el prompt del sistema para cambiar criterios de análisis
- Ajusta labels sugeridas
- Modifica reglas de auto-cierre

### Añadir nuevas herramientas
Edita `opencode-executor/src/tools.py`:
- Implementa nuevas funciones en `ToolManager`
- Registra las herramientas en `executor.py`

### Cambiar modelo LLM
Edita `.env`:
```bash
LLM_MODEL=openai/gpt-4o
OPENCODE_LLM_MODEL=anthropic/claude-3-5-sonnet
```

## Troubleshooting

### Los servicios no inician
```bash
docker-compose build --no-cache
docker-compose up
```

### El webhook no llega
- Verifica que el servidor sea accesible desde internet
- Comprueba el secret del webhook
- Revisa logs: `docker-compose logs nanobot-orchestrator`

### OpenCode no puede crear PRs
- Verifica que `GITHUB_TOKEN` tenga permisos `repo` y `pull_requests`
- Comprueba que el token no haya expirado
- Revisa logs: `docker-compose logs opencode-executor`

### Errores de LLM
- Verifica que la API key sea válida
- Comprueba que el modelo esté disponible en tu proveedor
- Revisa los límites de rate limit

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
