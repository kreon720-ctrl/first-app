// Chat types

export type MessageType = 'NORMAL' | 'WORK_PERFORMANCE';

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

// API 명세 GET /api/teams/:teamId/messages 쿼리 파라미터
export interface ChatQueryParams {
  date?: string; // YYYY-MM-DD (KST)
}
