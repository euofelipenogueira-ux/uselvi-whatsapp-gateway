export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'qr_required';

export type MessageType = 'text' | 'image' | 'audio' | 'document' | 'video' | 'sticker';

export interface WebhookPayload {
  workspace_id: string;
  event: string;
  status?: ConnectionStatus;
  phone_number?: string | null;
  message?: {
    id: string;
    from: string;
    push_name: string;
    timestamp: string;
    type: MessageType;
    text?: string;
    raw?: any;
  };
}

export interface TextMessageRequest {
  workspace_id: string;
  to: string;
  message: string;
}

export interface ImageMessageRequest {
  workspace_id: string;
  to: string;
  caption?: string;
}

export interface DocumentMessageRequest {
  workspace_id: string;
  to: string;
}

export interface AudioMessageRequest {
  workspace_id: string;
  to: string;
}

export interface ReplyMessageRequest {
  workspace_id: string;
  to: string;
  message: string;
  quoted_message_id: string;
}

export interface ReactionRequest {
  workspace_id: string;
  to: string;
  message_id: string;
  emoji: string;
}
