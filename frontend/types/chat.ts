// Chat types

export type MessageType = 'NORMAL' | 'SCHEDULE_REQUEST';

export interface ChatMessage {
  id: string;
  teamId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: MessageType;
  sentAt: string;
}

export interface ChatMessageInput {
  content: string;
  type?: MessageType;
}

export interface ChatMessageListResponse {
  messages: ChatMessage[];
  date: string;
}

export interface ChatQueryParams {
  date?: string; // YYYY-MM-DD (KST)
  limit?: number;
  offset?: number;
}
