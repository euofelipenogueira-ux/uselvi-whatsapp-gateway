import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { BaileysService } from './services/BaileysService';
import { createLogger } from './utils/logger';
import {
  TextMessageRequest,
  ImageMessageRequest,
  DocumentMessageRequest,
  AudioMessageRequest,
  ReplyMessageRequest,
  ReactionRequest,
} from './types';

dotenv.config();

const app = express();
const logger = createLogger('Server');
const port = process.env.PORT || 3001;
const apiKey = process.env.GATEWAY_API_KEY;
const sessionsPath = process.env.SESSIONS_PATH || './sessions';

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });
const instances = new Map<string, BaileysService>();

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/health') {
    return next();
  }

  const token = req.headers['x-api-key'];
  if (token !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function getOrCreateInstance(workspaceId: string): Promise<BaileysService> {
  if (instances.has(workspaceId)) {
    return instances.get(workspaceId)!;
  }

  const authPath = `${sessionsPath}/${workspaceId}`;
  const instance = new BaileysService(workspaceId, authPath);
  await instance.initialize();
  instances.set(workspaceId, instance);

  return instance;
}

app.get('/instances/:workspaceId/qr', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const instance = await getOrCreateInstance(workspaceId);
    const qrCode = instance.getQRCode();

    if (!qrCode) {
      return res.status(202).json({ status: 'pending', message: 'QR code not ready yet' });
    }

    res.json({ qr_code: qrCode });
  } catch (error) {
    logger.error('Failed to get QR code', error);
    res.status(500).json({ error: 'Failed to get QR code' });
  }
});

app.get('/instances/:workspaceId/status', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const instance = await getOrCreateInstance(workspaceId);

    res.json({
      workspace_id: workspaceId,
      status: instance.getStatus(),
      phone_number: instance.getPhoneNumber(),
      connected: instance.isConnected(),
    });
  } catch (error) {
    logger.error('Failed to get instance status', error);
    res.status(500).json({ error: 'Failed to get instance status' });
  }
});

app.post('/instances/:workspaceId/logout', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const instance = instances.get(workspaceId);

    if (!instance) {
      return res.status(404).json({ error: 'Instance not found' });
    }

    await instance.disconnect();
    instances.delete(workspaceId);

    res.json({ status: 'disconnected' });
  } catch (error) {
    logger.error('Failed to logout', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

app.post('/messages/text', async (req: Request, res: Response) => {
  try {
    const { workspace_id, to, message }: TextMessageRequest = req.body;

    if (!workspace_id || !to || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const instance = await getOrCreateInstance(workspace_id);
    const messageId = await instance.sendTextMessage(`${to}@s.whatsapp.net`, message);

    if (!messageId) {
      return res.status(500).json({ error: 'Failed to send message' });
    }

    res.json({ message_id: messageId });
  } catch (error) {
    logger.error('Failed to send text message', error);
    res.status(500).json({ error: 'Failed to send text message' });
  }
});

app.post('/messages/image', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { workspace_id, to, caption }: ImageMessageRequest = req.body;

    if (!workspace_id || !to || !req.file) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const instance = await getOrCreateInstance(workspace_id);
    const messageId = await instance.sendImageMessage(
      `${to}@s.whatsapp.net`,
      req.file.buffer,
      caption
    );

    if (!messageId) {
      return res.status(500).json({ error: 'Failed to send image' });
    }

    res.json({ message_id: messageId });
  } catch (error) {
    logger.error('Failed to send image message', error);
    res.status(500).json({ error: 'Failed to send image message' });
  }
});

app.post('/messages/document', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { workspace_id, to }: DocumentMessageRequest = req.body;

    if (!workspace_id || !to || !req.file) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const instance = await getOrCreateInstance(workspace_id);
    const messageId = await instance.sendDocumentMessage(
      `${to}@s.whatsapp.net`,
      req.file.buffer,
      req.file.originalname || 'document'
    );

    if (!messageId) {
      return res.status(500).json({ error: 'Failed to send document' });
    }

    res.json({ message_id: messageId });
  } catch (error) {
    logger.error('Failed to send document message', error);
    res.status(500).json({ error: 'Failed to send document message' });
  }
});

app.post('/messages/audio', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { workspace_id, to }: AudioMessageRequest = req.body;

    if (!workspace_id || !to || !req.file) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const instance = await getOrCreateInstance(workspace_id);
    const messageId = await instance.sendAudioMessage(`${to}@s.whatsapp.net`, req.file.buffer);

    if (!messageId) {
      return res.status(500).json({ error: 'Failed to send audio' });
    }

    res.json({ message_id: messageId });
  } catch (error) {
    logger.error('Failed to send audio message', error);
    res.status(500).json({ error: 'Failed to send audio message' });
  }
});

app.post('/messages/reply', async (req: Request, res: Response) => {
  try {
    const { workspace_id, to, message, quoted_message_id }: ReplyMessageRequest = req.body;

    if (!workspace_id || !to || !message || !quoted_message_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const instance = await getOrCreateInstance(workspace_id);
    const messageId = await instance.sendReplyMessage(
      `${to}@s.whatsapp.net`,
      message,
      quoted_message_id
    );

    if (!messageId) {
      return res.status(500).json({ error: 'Failed to send reply' });
    }

    res.json({ message_id: messageId });
  } catch (error) {
    logger.error('Failed to send reply message', error);
    res.status(500).json({ error: 'Failed to send reply message' });
  }
});

app.post('/messages/reaction', async (req: Request, res: Response) => {
  try {
    const { workspace_id, to, message_id, emoji }: ReactionRequest = req.body;

    if (!workspace_id || !to || !message_id || !emoji) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const instance = await getOrCreateInstance(workspace_id);
    const success = await instance.sendReactionMessage(`${to}@s.whatsapp.net`, message_id, emoji);

    if (!success) {
      return res.status(500).json({ error: 'Failed to send reaction' });
    }

    res.json({ status: 'sent' });
  } catch (error) {
    logger.error('Failed to send reaction', error);
    res.status(500).json({ error: 'Failed to send reaction' });
  }
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  logger.info(`🚀 Server is running on port ${port}`);
});
