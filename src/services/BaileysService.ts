import { default as makeWASocket, useMultiFileAuthState, WASocket, DisconnectReason, proto } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import { createLogger } from '../utils/logger';
import { ConnectionStatus, MessageType } from '../types';
import { sendWebhook } from '../utils/webhookClient';
import { formatTimestamp } from '../utils/helpers';
import { ensureDirectoryExists } from '../utils/fileManager';

const logger = createLogger('BaileysService');

export class BaileysService {
  private workspaceId: string;
  private authPath: string;
  private socket: WASocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private phoneNumber: string | null = null;
  private qrCode: string | null = null;
  private connectionAttempts = 0;
  private maxRetries = 5;

  constructor(workspaceId: string, authPath: string) {
    this.workspaceId = workspaceId;
    this.authPath = authPath;
  }

  async initialize(): Promise<void> {
    try {
      ensureDirectoryExists(this.authPath);
      await this.connect();
    } catch (error) {
      logger.error(`Failed to initialize BaileysService`, error);
      throw error;
    }
  }

  private async connect(): Promise<void> {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);

      this.socket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: false,
      });

      this.socket.ev.on('connection.update', (update) => this.handleConnectionUpdate(update));
      this.socket.ev.on('creds.update', saveCreds);
      this.socket.ev.on('messages.upsert', (m) => this.handleMessageUpsert(m));

      logger.info(`BaileysService initialized for workspace: ${this.workspaceId}`);
    } catch (error) {
      logger.error(`Failed to connect`, error);
      throw error;
    }
  }

  private async handleConnectionUpdate(update: any): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      this.status = 'qr_required';
      try {
        this.qrCode = await QRCode.toDataURL(qr);
        logger.info(`QR Code generated`);
        await sendWebhook({
          workspace_id: this.workspaceId,
          event: 'connection.update',
          status: this.status,
          phone_number: null,
        });
      } catch (error) {
        logger.error(`Failed to generate QR code`, error);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect && this.connectionAttempts < this.maxRetries) {
        this.connectionAttempts++;
        this.status = 'connecting';
        setTimeout(() => this.connect(), 3000 * this.connectionAttempts);
      } else {
        this.status = 'disconnected';
        this.phoneNumber = null;
      }
    }

    if (connection === 'open') {
      this.status = 'connected';
      this.connectionAttempts = 0;
      this.phoneNumber = this.socket?.user?.id?.split(':')[0] || null;
      logger.info(`WhatsApp connected`);
      await sendWebhook({
        workspace_id: this.workspaceId,
        event: 'connection.update',
        status: this.status,
        phone_number: this.phoneNumber,
      });
    }
  }

  private async handleMessageUpsert(m: any): Promise<void> {
    if (!m.messages || m.messages.length === 0) return;
    for (const message of m.messages) {
      if (message.key.fromMe || message.messageStubType) continue;
      try {
        const from = message.key.remoteJid;
        const pushName = message.pushName || 'Unknown';
        const timestamp = formatTimestamp(message.messageTimestamp);
        const type = this.getMessageType(message);
        const text = this.extractMessageText(message);

        logger.info(`Message received from ${from}`);
        await sendWebhook({
          workspace_id: this.workspaceId,
          event: 'message.received',
          message: { id: message.key.id, from, push_name: pushName, timestamp, type, text: text || undefined, raw: message },
        });
      } catch (error) {
        logger.error(`Failed to handle incoming message`, error);
      }
    }
  }

  private getMessageType(message: proto.IWebMessageInfo): MessageType {
    if (message.message?.conversation || message.message?.extendedTextMessage?.text) return 'text';
    if (message.message?.imageMessage) return 'image';
    if (message.message?.audioMessage) return 'audio';
    if (message.message?.documentMessage) return 'document';
    if (message.message?.videoMessage) return 'video';
    if (message.message?.stickerMessage) return 'sticker';
    return 'text';
  }

  private extractMessageText(message: proto.IWebMessageInfo): string | null {
    if (message.message?.conversation) return message.message.conversation;
    if (message.message?.extendedTextMessage?.text) return message.message.extendedTextMessage.text;
    return null;
  }

  async sendTextMessage(to: string, message: string): Promise<string | null> {
    if (!this.socket || this.status !== 'connected') return null;
    try {
      const result = await this.socket.sendMessage(to, { text: message });
      return result.key.id || null;
    } catch (error) {
      logger.error(`Failed to send text message`, error);
      return null;
    }
  }

  async sendImageMessage(to: string, buffer: Buffer, caption?: string): Promise<string | null> {
    if (!this.socket || this.status !== 'connected') return null;
    try {
      const result = await this.socket.sendMessage(to, { image: buffer, caption: caption || undefined });
      return result.key.id || null;
    } catch (error) {
      logger.error(`Failed to send image message`, error);
      return null;
    }
  }

  async sendDocumentMessage(to: string, buffer: Buffer, filename: string): Promise<string | null> {
    if (!this.socket || this.status !== 'connected') return null;
    try {
      const result = await this.socket.sendMessage(to, { document: buffer, fileName: filename });
      return result.key.id || null;
    } catch (error) {
      logger.error(`Failed to send document message`, error);
      return null;
    }
  }

  async sendAudioMessage(to: string, buffer: Buffer): Promise<string | null> {
    if (!this.socket || this.status !== 'connected') return null;
    try {
      const result = await this.socket.sendMessage(to, { audio: buffer, mimetype: 'audio/mpeg', ptt: true });
      return result.key.id || null;
    } catch (error) {
      logger.error(`Failed to send audio message`, error);
      return null;
    }
  }

  async sendReplyMessage(to: string, message: string, quotedMessageId: string): Promise<string | null> {
    if (!this.socket || this.status !== 'connected') return null;
    try {
      const result = await this.socket.sendMessage(to, { text: message, quoted: { key: { id: quotedMessageId } } as any });
      return result.key.id || null;
    } catch (error) {
      logger.error(`Failed to send reply message`, error);
      return null;
    }
  }

  async sendReactionMessage(to: string, messageId: string, emoji: string): Promise<boolean> {
    if (!this.socket || this.status !== 'connected') return false;
    try {
      await this.socket.sendMessage(to, { react: { text: emoji, key: { id: messageId } as any } });
      return true;
    } catch (error) {
      logger.error(`Failed to send reaction`, error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      try {
        this.socket.end(undefined as any);
        this.socket = null;
        this.status = 'disconnected';
        this.phoneNumber = null;
      } catch (error) {
        logger.error(`Error disconnecting`, error);
      }
    }
  }

  getStatus(): ConnectionStatus { return this.status; }
  getPhoneNumber(): string | null { return this.phoneNumber; }
  getQRCode(): string | null { return this.qrCode; }
  isConnected(): boolean { return this.status === 'connected'; }
}
