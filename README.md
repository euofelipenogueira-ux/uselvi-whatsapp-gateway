# 🚀 U-Selvi WhatsApp Gateway

API própria para WhatsApp via QR Code usando Baileys, para substituir gradualmente a dependência da Whapi.Cloud no sistema U-Selvi.

## 📋 Visão Geral

Este gateway funciona como uma **camada intermediária** entre o Base44/U-Selvi e o WhatsApp Web.

- ✅ Conexão via QR Code
- ✅ Múltiplas sessões por workspace
- ✅ Envio de mensagens (texto, imagem, documento, áudio)
- ✅ Respostas e reações
- ✅ Webhooks em tempo real
- ✅ Fila com retry automático
- ✅ Segurança com API Key

## 🚀 Início Rápido

### 1. Instalação
```bash
npm install
```

### 2. Configurar .env
```bash
cp .env.example .env
```

### 3. Rodar
```bash
npm run dev
```

## 🔗 Endpoints Principais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/health` | Health check |
| `GET` | `/instances/:workspaceId/qr` | Obter QR Code |
| `GET` | `/instances/:workspaceId/status` | Status da instância |
| `POST` | `/instances/:workspaceId/logout` | Desconectar |
| `POST` | `/messages/text` | Enviar texto |
| `POST` | `/messages/image` | Enviar imagem |
| `POST` | `/messages/document` | Enviar documento |
| `POST` | `/messages/audio` | Enviar áudio |
| `POST` | `/messages/reply` | Responder mensagem |
| `POST` | `/messages/reaction` | Reagir |

## 🔐 Autenticação

Todas as requisições (exceto `/health`) requerem:
```
x-api-key: <seu GATEWAY_API_KEY>
```

## 📨 Exemplo de Uso

```bash
# Enviar mensagem
curl -X POST http://localhost:3001/messages/text \
  -H "Content-Type: application/json" \
  -H "x-api-key: sua_chave_aqui" \
  -d '{
    "workspace_id": "workspace_1",
    "to": "5547999999999",
    "message": "Olá!"
  }'
```

## 📄 Licença

MIT
