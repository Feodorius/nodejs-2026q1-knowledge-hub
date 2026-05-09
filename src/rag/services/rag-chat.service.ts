import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { GeminiService } from '../../ai/gemini.service';
import { RagSearchService } from './rag-search.service';
import { RagChatRequestDto } from '../dto/rag-chat-request.dto';
import { RagChatResponseDto } from '../dto/rag-chat-response.dto';
import { ConversationMessage } from '../rag.types';
import { NotFoundError } from '../../common/errors';

const CONTEXT_CHUNKS = 5;

@Injectable()
export class RagChatService {
  private readonly logger = new Logger(RagChatService.name);
  private readonly conversations = new Map<string, ConversationMessage[]>();
  private readonly maxMessages: number;

  constructor(
    private readonly search: RagSearchService,
    private readonly gemini: GeminiService,
  ) {
    this.maxMessages = parseInt(
      process.env.RAG_CONVERSATION_MAX_MESSAGES ?? '20',
      10,
    );
  }

  async chat(req: RagChatRequestDto): Promise<RagChatResponseDto> {
    const conversationId = req.conversationId ?? uuidv4();
    const history = this.conversations.get(conversationId) ?? [];

    const chunks = await this.search.searchForContext(
      req.question,
      CONTEXT_CHUNKS,
    );

    const contextBlock = chunks
      .map((c, i) => `[${i + 1}] Source: "${c.articleTitle}"\n${c.chunk}`)
      .join('\n\n---\n\n');

    const geminiHistory = history.slice(-this.maxMessages).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      text: m.content,
    }));

    const prompt =
      `You are a helpful Knowledge Hub assistant. Answer using ONLY the provided context.\n` +
      `If the context is insufficient, say so clearly and do not invent information.\n\n` +
      `Context from Knowledge Hub articles:\n${contextBlock}\n\n` +
      `Question: ${req.question}`;

    const result = await this.gemini.generateContent(
      prompt,
      geminiHistory as any,
    );

    const updatedHistory: ConversationMessage[] = [
      ...history,
      { role: 'user' as const, content: req.question, timestamp: Date.now() },
      {
        role: 'assistant' as const,
        content: result.text,
        timestamp: Date.now(),
      },
    ].slice(-this.maxMessages);

    this.conversations.set(conversationId, updatedHistory);

    return {
      answer: result.text,
      sources: chunks.map((c) => ({
        articleId: c.articleId,
        articleTitle: c.articleTitle,
        relevantChunk: c.chunk,
      })),
      conversationId,
    };
  }

  getHistory(conversationId: string): {
    conversationId: string;
    messages: ConversationMessage[];
  } {
    const messages = this.conversations.get(conversationId);
    if (!messages) {
      throw new NotFoundError(`Conversation ${conversationId} not found`);
    }
    return { conversationId, messages };
  }
}
