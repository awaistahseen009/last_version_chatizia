import { openai } from './openai';

export interface ClassificationResult {
  needsKnowledgeBase: boolean;
  isRelevant: boolean;
  confidence: number;
  reasoning: string;
}

export const classifyQuestion = async (
  question: string,
  chatbotContext?: string
): Promise<ClassificationResult> => {
  if (!openai) {
    // Default to knowledge base search if OpenAI is not available
    return {
      needsKnowledgeBase: true,
      isRelevant: true,
      confidence: 0.5,
      reasoning: 'OpenAI not available, defaulting to knowledge base search'
    };
  }

  try {
    const systemPrompt = `You are a question classifier for a chatbot system. Your job is to determine:
1. Whether a question requires searching the knowledge base
2. Whether the question is relevant to the chatbot's purpose

Context about this chatbot: ${chatbotContext || 'General purpose chatbot'}

Respond with ONLY a JSON object in this exact format:
{
  "needsKnowledgeBase": boolean,
  "isRelevant": boolean,
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Guidelines:
- needsKnowledgeBase: true if the question asks about specific information, documentation, policies, procedures, or company-specific details
- needsKnowledgeBase: false for general questions, greetings, small talk, or common knowledge
- isRelevant: true if the question relates to the chatbot's purpose or domain
- isRelevant: false for completely off-topic questions
- confidence: how certain you are about the classification (0.0-1.0)

Examples:
- "What are your business hours?" → needsKnowledgeBase: true, isRelevant: true
- "How do I reset my password?" → needsKnowledgeBase: true, isRelevant: true  
- "Hello, how are you?" → needsKnowledgeBase: false, isRelevant: true
- "What's the weather like?" → needsKnowledgeBase: false, isRelevant: false
- "Tell me about your pricing plans" → needsKnowledgeBase: true, isRelevant: true
- "What's 2+2?" → needsKnowledgeBase: false, isRelevant: false`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      max_tokens: 200,
      temperature: 0.1,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from classifier');
    }

    try {
      const parsed = JSON.parse(result) as ClassificationResult;
      
      // Validate the response structure
      if (typeof parsed.needsKnowledgeBase !== 'boolean' ||
          typeof parsed.isRelevant !== 'boolean' ||
          typeof parsed.confidence !== 'number' ||
          typeof parsed.reasoning !== 'string') {
        throw new Error('Invalid classification response structure');
      }

      console.log('🔍 Question classification:', {
        question: question.substring(0, 50) + '...',
        needsKnowledgeBase: parsed.needsKnowledgeBase,
        isRelevant: parsed.isRelevant,
        confidence: parsed.confidence
      });

      return parsed;
    } catch (parseError) {
      console.error('Failed to parse classification result:', parseError);
      // Default to knowledge base search on parse error
      return {
        needsKnowledgeBase: true,
        isRelevant: true,
        confidence: 0.5,
        reasoning: 'Classification parsing failed, defaulting to knowledge base search'
      };
    }
  } catch (error) {
    console.error('Question classification failed:', error);
    // Default to knowledge base search on error
    return {
      needsKnowledgeBase: true,
      isRelevant: true,
      confidence: 0.5,
      reasoning: 'Classification failed, defaulting to knowledge base search'
    };
  }
};