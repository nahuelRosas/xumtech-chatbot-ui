export interface ChatMessage {
  role: "user" | "system";
  content: string;
}

export interface CreateChatDto {
  message: string;
  conversationId: string;
}

export interface CreateChatResponse {
  answer: string;
}
