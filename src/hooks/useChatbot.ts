import { useState, useEffect, useRef } from 'react';
import { useDocuments } from './useDocuments';
import { generateChatResponse, ChatMessage } from '../lib/openai';
import { analyzeSentiment, SentimentResult } from '../lib/sentimentAnalysis';
import { classifyQuestion } from '../lib/questionClassifier';
import { Chatbot } from '../lib/supabase';
import { supabase } from '../lib/supabase';
import { getTemplatePrompt } from '../lib/templatePrompts';
import { useNotificationContext } from '../contexts/NotificationContext';

export interface ChatbotMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  sources?: string[];
  conversationId?: string;
}

export interface UserInteractionData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  orderNumber?: string;
  product?: string;
  gradeLevel?: string;
  learningGoals?: string;
  preferredDate?: string;
  reasonForVisit?: string;
  [key: string]: string | undefined;
}

export const useChatbot = (chatbot: Chatbot | null) => {
  const [messages, setMessages] = useState<ChatbotMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sentimentHistory, setSentimentHistory] = useState<SentimentResult[]>([]);
  const [isEscalated, setIsEscalated] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [userInteractionData, setUserInteractionData] = useState<UserInteractionData>({});
  const [isCollectingData, setIsCollectingData] = useState<string | null>(null);
  const { fetchSimilarChunks } = useDocuments();
  const { addNotification } = useNotificationContext();

  // Helper function to get user's IP address and user agent
  const getUserInfo = () => {
    const userAgent = navigator.userAgent;
    // Note: Getting real IP requires a service call, for now we'll use a placeholder
    return {
      userAgent,
      ipAddress: null // Will be populated by server-side logic if needed
    };
  };

  // Check if a message contains trigger phrases for data collection
  const checkForDataCollectionTriggers = (message: string) => {
    if (!chatbot) return null;
    
    // Get template data collection fields
    const templateId = chatbot.configuration?.template;
    if (!templateId) return null;
    
    const template = getTemplatePrompt(templateId);
    if (!template || !template.dataCollectionFields) return null;
    
    // Check if message contains any trigger phrases
    const lowerMessage = message.toLowerCase();
    
    for (const field of template.dataCollectionFields) {
      // Skip if we already have this data
      if (userInteractionData[field.name]) continue;
      
      // Check if message contains any trigger phrases for this field
      const hasTrigger = field.triggerPhrases.some(phrase => 
        lowerMessage.includes(phrase.toLowerCase())
      );
      
      if (hasTrigger) {
        // Return the first field that needs data
        return field.name;
      }
    }
    
    return null;
  };

  // Get the next field that needs data collection
  const getNextDataCollectionField = () => {
    if (!chatbot) return null;
    
    // Get template data collection fields
    const templateId = chatbot.configuration?.template;
    if (!templateId) return null;
    
    const template = getTemplatePrompt(templateId);
    if (!template || !template.dataCollectionFields) return null;
    
    // Find the first required field that's missing
    for (const field of template.dataCollectionFields) {
      if (field.required && !userInteractionData[field.name]) {
        return field.name;
      }
    }
    
    return null;
  };

  // Get the label for a data collection field
  const getFieldLabel = (fieldName: string) => {
    if (!chatbot) return fieldName;
    
    // Get template data collection fields
    const templateId = chatbot.configuration?.template;
    if (!templateId) return fieldName;
    
    const template = getTemplatePrompt(templateId);
    if (!template || !template.dataCollectionFields) return fieldName;
    
    // Find the field
    const field = template.dataCollectionFields.find(f => f.name === fieldName);
    return field ? field.label : fieldName;
  };

  // Store user interaction data
  const storeUserInteractionData = async () => {
    if (!chatbot || !conversationId || Object.keys(userInteractionData).length === 0) return;
    
    try {
      // Determine sentiment based on conversation
      const sentiment = sentimentHistory.length > 0 
        ? sentimentHistory[sentimentHistory.length - 1].sentiment 
        : 'neutral';
      
      // Map sentiment to database values
      const sentimentValue = 
        sentiment === 'happy' ? 'positive' : 
        sentiment === 'unhappy' ? 'negative' : 
        'neutral';
      
      // Store in user_interactions table
      const { error } = await supabase
        .from('user_interactions')
        .insert([{
          chatbot_id: chatbot.id,
          email: userInteractionData.email,
          name: userInteractionData.name,
          phone: userInteractionData.phone,
          sentiment: sentimentValue,
          reaction: 'neutral', // Default reaction
          conversation_history: messages.map(m => m.text),
          conversation_id: conversationId,
          ip_address: null, // Would be set server-side
          ip_geolocation: null // Would be set server-side
        }]);
      
      if (error) {
        console.error('Failed to store user interaction data:', error);
      } else {
        console.log('✅ User interaction data stored successfully');
        
        // Add notification about new lead
        if (userInteractionData.email) {
          addNotification({
            title: 'New Lead Captured',
            message: `Lead information captured from ${userInteractionData.name || 'a user'} (${userInteractionData.email})`,
            type: 'chatbot'
          });
        }
      }
    } catch (err) {
      console.error('Error storing user interaction data:', err);
    }
  };

  const sendMessage = async (userMessage: string): Promise<void> => {
    if (!chatbot) return;

    // If we're collecting data, process the input as the requested data
    if (isCollectingData) {
      // Validate the input based on the field type
      let isValid = true;
      let validationMessage = '';
      
      if (isCollectingData === 'email') {
        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        isValid = emailRegex.test(userMessage);
        validationMessage = 'Please enter a valid email address.';
      } else if (isCollectingData === 'phone') {
        // Simple phone validation (at least 10 digits)
        const phoneRegex = /\d{10,}/;
        isValid = phoneRegex.test(userMessage.replace(/\D/g, ''));
        validationMessage = 'Please enter a valid phone number.';
      }
      
      // Add user message to UI
      const userChatMessage: ChatbotMessage = {
        id: `user-${Date.now()}`,
        text: userMessage,
        sender: 'user',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, userChatMessage]);
      
      if (!isValid) {
        // Add validation error message
        const validationErrorMessage: ChatbotMessage = {
          id: `bot-validation-${Date.now()}`,
          text: validationMessage,
          sender: 'bot',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, validationErrorMessage]);
        return;
      }
      
      // Store the collected data
      setUserInteractionData(prev => ({
        ...prev,
        [isCollectingData]: userMessage
      }));
      
      // Check if we need to collect more data
      const nextField = getNextDataCollectionField();
      
      if (nextField) {
        // Ask for the next field
        const nextFieldLabel = getFieldLabel(nextField);
        const nextFieldMessage: ChatbotMessage = {
          id: `bot-collect-${Date.now()}`,
          text: `Thank you. Could you also provide your ${nextFieldLabel}?`,
          sender: 'bot',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, nextFieldMessage]);
        setIsCollectingData(nextField);
      } else {
        // Thank the user for providing the information
        const thankYouMessage: ChatbotMessage = {
          id: `bot-thanks-${Date.now()}`,
          text: `Thank you for providing your information. I'll use this to better assist you. How else can I help you today?`,
          sender: 'bot',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, thankYouMessage]);
        setIsCollectingData(null);
        
        // Store the interaction data
        await storeUserInteractionData();
      }
      
      return;
    }

    // Add user message to UI immediately
    const userChatMessage: ChatbotMessage = {
      id: `user-${Date.now()}`,
      text: userMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userChatMessage]);
    setIsTyping(true);

    try {
      // Create session ID if it doesn't exist
      let sessionId = currentSessionId;
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        setCurrentSessionId(sessionId);
        console.log('🔄 Created new session:', sessionId);
      }

      // Store user message using session-based approach
      console.log('💾 Storing user message with session ID...');
      const { data: userMessageData, error: userMessageError } = await supabase
        .rpc('add_session_message', {
          chatbot_id_param: chatbot.id,
          session_id_param: sessionId,
          content_param: userMessage,
          role_param: 'user'
        });

      if (userMessageError) {
        console.error('❌ Failed to store user message:', userMessageError);
        throw new Error('Failed to store user message');
      }

      console.log('✅ User message stored successfully');

      // If this is the first message, get the conversation ID
      if (!conversationId) {
        // Try to get the conversation ID
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('id')
          .eq('chatbot_id', chatbot.id)
          .eq('session_id', sessionId)
          .single();
        
        if (!convError && convData) {
          setConversationId(convData.id);
          userChatMessage.conversationId = convData.id;
        }
      }

      // Check for data collection triggers
      const dataField = checkForDataCollectionTriggers(userMessage);
      
      if (dataField) {
        // Start collecting data
        const fieldLabel = getFieldLabel(dataField);
        
        // Add bot message asking for the data
        const dataRequestMessage: ChatbotMessage = {
          id: `bot-request-${Date.now()}`,
          text: `I'd be happy to help you with that. Could you please provide your ${fieldLabel}?`,
          sender: 'bot',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, dataRequestMessage]);
        setIsCollectingData(dataField);
        setIsTyping(false);
        return;
      }

      // Analyze sentiment of the last 5 messages (including current one) - only if not escalated
      const recentMessages = [...messages.slice(-4), userChatMessage]
        .filter(msg => msg.sender === 'user')
        .map(msg => msg.text);

      if (recentMessages.length > 0 && !isEscalated) {
        console.log('🔍 Analyzing sentiment...');
        const sentimentResult = await analyzeSentiment(recentMessages);
        setSentimentHistory(prev => [...prev.slice(-4), sentimentResult]);

        console.log('📊 Sentiment analysis result:', sentimentResult);

        // Check if escalation is needed
        if (sentimentResult.shouldEscalate) {
          console.log('🚨 User seems frustrated, but continuing with AI assistance...');
          setIsEscalated(true);
          
          // Add empathy message
          const empathyMessage: ChatbotMessage = {
            id: `empathy-${Date.now()}`,
            text: "I understand this might be frustrating. Let me do my best to help you with this issue.",
            sender: 'bot',
            timestamp: new Date(),
          };
          
          setMessages(prev => [...prev, empathyMessage]);
        }
      }

      // Classify the question to determine if knowledge base search is needed
      console.log('🔍 Classifying question...');
      const classification = await classifyQuestion(
        userMessage, 
        chatbot.description || chatbot.name
      );

      console.log('📊 Classification result:', classification);

      // Check if question is relevant to the chatbot
      if (!classification.isRelevant && classification.confidence > 0.7) {
        const irrelevantMessage: ChatbotMessage = {
          id: `bot-irrelevant-${Date.now()}`,
          text: "I'm designed to help with specific topics related to our services. Could you please ask a question that's more relevant to what I can assist you with?",
          sender: 'bot',
          timestamp: new Date(),
        };

        setMessages(prev => [...prev, irrelevantMessage]);

        // Store bot message
        await supabase.rpc('add_session_message', {
          chatbot_id_param: chatbot.id,
          session_id_param: sessionId,
          content_param: irrelevantMessage.text,
          role_param: 'assistant'
        });

        setIsTyping(false);
        return;
      }

      let context = '';
      let sources: string[] = [];

      // Only search knowledge base if classification indicates it's needed
      if (classification.needsKnowledgeBase && chatbot.knowledge_base_id) {
        console.log('🔍 Searching knowledge base for relevant content...');
        const similarChunks = await fetchSimilarChunks(userMessage, 5, chatbot.id);
        
        if (similarChunks.length > 0) {
          // Create comprehensive context from chunks
          context = similarChunks
            .map((chunk, index) => `[Source ${index + 1}]: ${chunk.chunk_text}`)
            .join('\n\n');
          
          sources = similarChunks.map((chunk, index) => `Knowledge Base - Chunk ${index + 1}`);
          console.log(`✅ Found ${similarChunks.length} relevant chunks, context length: ${context.length} characters`);
        } else {
          console.log('ℹ️ No relevant chunks found in knowledge base');
        }
      } else {
        console.log('ℹ️ Skipping knowledge base search - not needed for this question type');
      }

      // Prepare chat history for context
      const chatHistory: ChatMessage[] = messages
        .slice(-5) // Last 5 messages for context
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'assistant',
          content: msg.text
        }));

      // Add current user message
      chatHistory.push({
        role: 'user',
        content: userMessage
      });

      // Get system prompt from chatbot configuration
      const systemPrompt = chatbot.configuration?.systemPrompt;

      // Generate response using OpenAI with enhanced context handling and system prompt
      console.log('🤖 Generating AI response...');
      console.log('📊 Context available:', !!context);
      console.log('📊 Context length:', context.length);
      console.log('📊 System prompt available:', !!systemPrompt);
      console.log('📊 Knowledge base used:', classification.needsKnowledgeBase);
      
      const response = await generateChatResponse(
        chatHistory, 
        context, 
        chatbot.configuration?.personality,
        systemPrompt // Pass the system prompt
      );

      // Add bot response to UI
      const botMessage: ChatbotMessage = {
        id: `bot-${Date.now()}`,
        text: response.message,
        sender: 'bot',
        timestamp: new Date(),
        sources: response.sources || (sources.length > 0 ? sources : undefined),
      };

      setMessages(prev => [...prev, botMessage]);

      // Store bot message using session-based approach
      console.log('💾 Storing bot message with session ID...');
      const { data: botMessageData, error: botMessageError } = await supabase
        .rpc('add_session_message', {
          chatbot_id_param: chatbot.id,
          session_id_param: sessionId,
          content_param: response.message,
          role_param: 'assistant'
        });

      if (botMessageError) {
        console.error('❌ Failed to store bot message:', botMessageError);
        // Don't throw error here as the user already sees the response
      } else {
        console.log('✅ Bot response stored successfully');
      }

    } catch (error) {
      console.error('❌ Error generating bot response:', error);
      
      // Add error message
      const errorMessage: ChatbotMessage = {
        id: `bot-error-${Date.now()}`,
        text: "I apologize, but I'm experiencing some technical difficulties. Please try again later.",
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const initializeChat = () => {
    if (!chatbot) return;

    const welcomeMessage: ChatbotMessage = {
      id: 'welcome',
      text: chatbot.configuration?.welcomeMessage || "Hello! I'm your AI assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
    };

    setMessages([welcomeMessage]);
    setCurrentSessionId(null); // Reset session
    setConversationId(null); // Reset conversation ID
    setSentimentHistory([]);
    setIsEscalated(false);
    setUserInteractionData({});
    setIsCollectingData(null);
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentSessionId(null);
    setConversationId(null);
    setSentimentHistory([]);
    setIsEscalated(false);
    setUserInteractionData({});
    setIsCollectingData(null);
  };

  return {
    messages,
    isTyping,
    sentimentHistory,
    isEscalated,
    userInteractionData,
    isCollectingData,
    sendMessage,
    initializeChat,
    clearChat,
  };
};