export interface ChunkPayload {
  articleId: string;
  articleTitle: string;
  categoryId?: string;
  tags?: string[];
  status: string;
  chunkIndex: number;
  articleUpdatedAt: number;
  content: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface RagSearchResult {
  articleId: string;
  articleTitle: string;
  chunk: string;
  similarity: number;
}
