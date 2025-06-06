
import { useMessageState } from "./message/useMessageState";
import { useMessageFetch } from "./message/useMessageFetch";
import { useMessageRealtime } from "./message/useMessageRealtime";
import { useMessageSend } from "./message/useMessageSend";
import { useMessageP2P } from "./message/useMessageP2P";
import { useMessageExpiry } from "./message/useMessageExpiry";
import { useMessageActions } from "./message/useMessageActions";
import { DecryptedMessage } from "@/types/message";
import { useEffect, useState, useCallback } from 'react';

export const useMessages = (userId: string | null, receiverId?: string, groupId?: string) => {
  const {
    messages,
    setMessages,
    optimisticallyDeleteMessage,
    newMessage,
    setNewMessage,
    isLoading,
    setIsLoading,
    ttl,
    setTtl,
    toast
  } = useMessageState();
  
  // Add directMessages state
  const [directMessages, setDirectMessages] = useState<DecryptedMessage[]>([]);

  // Set default TTL to 24 hours (86400 seconds)
  useEffect(() => {
    if (ttl === null) {
      setTtl(86400);
    }
  }, [ttl, setTtl]);

  // Fetch messages from the server
  const { fetchMessages } = useMessageFetch(userId, setMessages, toast, receiverId, groupId);
  
  // Setup realtime subscription
  const { setupRealtimeSubscription } = useMessageRealtime(userId, setMessages, receiverId, groupId);
  
  // Message sending, editing, and deleting
  const { handleSendMessage: internalSendMessage, handleEditMessage, handleDeleteMessage: messageServiceDelete } = useMessageSend(
    userId, newMessage, setNewMessage, ttl, setIsLoading, toast
  );
  
  // P2P message handling
  const { addP2PMessage } = useMessageP2P(setMessages);
  
  // Message expiry handling
  const { handleMessageExpired } = useMessageExpiry(setMessages);
  
  // Message editing and deletion actions
  const { 
    editingMessage, 
    handleStartEditMessage, 
    handleCancelEditMessage,
    handleSubmitEditMessage,
    handleDeleteMessageById
  } = useMessageActions(userId, handleEditMessage, messageServiceDelete);

  // Handle message submission (new or edit)
  const handleSubmitMessage = async (content: string, options?: { ttl?: number, mediaFile?: File, webRTCManager?: any, onlineUsers?: Set<string> }) => {
    if (editingMessage) {
      await handleSubmitEditMessage(content);
    } else {
      // Extract options
      const messageTtl = options?.ttl !== undefined ? options.ttl : ttl;
      const mediaFile = options?.mediaFile;
      const webRTCManager = options?.webRTCManager;
      const onlineUsers = options?.onlineUsers || new Set<string>();
      
      await internalSendMessage(webRTCManager, onlineUsers, mediaFile, receiverId);
    }
  };

  // Enhanced delete message handler with optimistic updates
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      // Apply optimistic update first
      optimisticallyDeleteMessage(messageId);
      
      // Then perform actual deletion
      await handleDeleteMessageById(messageId);
      return Promise.resolve();
    } catch (error) {
      // If deletion fails, we should refresh the messages
      console.error("Error deleting message, refreshing data:", error);
      await fetchMessages();
      return Promise.reject(error);
    }
  }, [handleDeleteMessageById, optimisticallyDeleteMessage, fetchMessages]);

  return {
    // Message state
    messages,
    newMessage,
    setNewMessage,
    isLoading,
    ttl,
    setTtl,
    
    // Message operations
    fetchMessages,
    setupRealtimeSubscription,
    addP2PMessage,
    handleSendMessage: handleSubmitMessage,
    handleMessageExpired,
    
    // Editing and deletion
    editingMessage,
    handleStartEditMessage: (message: DecryptedMessage | { id: string; content: string }) => {
      setNewMessage(handleStartEditMessage(message));
    },
    handleCancelEditMessage,
    handleDeleteMessage,
    
    // Direct messages
    directMessages,
    setDirectMessages
  };
};
