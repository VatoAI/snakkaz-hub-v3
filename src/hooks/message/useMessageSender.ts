
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { encryptMessage, importEncryptionKey } from "@/utils/encryption";
import { GLOBAL_E2EE_KEY, GLOBAL_E2EE_IV } from "@/utils/encryption/global-e2ee";
import { ensureMessageColumnsExist } from "./utils/message-db-utils";
import { useMediaHandler } from "./useMessageSender/useMediaHandler";
import { useP2PDelivery } from "./useMessageSender/useP2PDelivery";
import { globalEncryptMessage } from "./useMessageSender/globalEncryption";
import { arrayBufferToBase64 } from "@/utils/encryption/data-conversion";

export const useMessageSender = (
  userId: string | null,
  newMessage: string,
  setNewMessage: (message: string) => void,
  ttl: number | null,
  setIsLoading: (loading: boolean) => void,
  toast: any
) => {
  const { handleMediaUpload } = useMediaHandler();
  const { handleP2PDelivery } = useP2PDelivery();

  const handleSendMessage = useCallback(async (
    webRTCManager: any,
    onlineUsers: Set<string>,
    mediaFile?: File,
    receiverId?: string,
    groupId?: string
  ) => {
    if ((!newMessage.trim() && !mediaFile) || !userId) {
      toast({
        title: "Feil",
        description: "Du må skrive en melding eller legge ved en fil før du kan sende.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    let toastId = null;
    try {
      await ensureMessageColumnsExist();
      const isGlobalRoom = !receiverId && !groupId;
      let globalE2eeKey: string | undefined;
      let globalE2eeIv: string | undefined;
      if (isGlobalRoom) {
        globalE2eeKey = GLOBAL_E2EE_KEY;
        // Convert ArrayBuffer to Base64 string
        if (GLOBAL_E2EE_IV instanceof ArrayBuffer) {
          globalE2eeIv = arrayBufferToBase64(GLOBAL_E2EE_IV);
        } else {
          globalE2eeIv = btoa(String.fromCharCode.apply(null, new Uint8Array(GLOBAL_E2EE_IV)));
        }
      }

      // Handle media file upload/encryption if provided
      let mediaUrl = null, mediaType = null, encryptionKey = null, iv = null, mediaMetadata = null;
      if (mediaFile) {
        const result = await handleMediaUpload(
          mediaFile,
          toast,
          globalE2eeKey && globalE2eeIv ? { encryptionKey: globalE2eeKey, iv: globalE2eeIv } : undefined
        );
        mediaUrl = result.mediaUrl;
        mediaType = result.mediaType;
        encryptionKey = result.encryptionKey;
        iv = result.iv;
        mediaMetadata = result.mediaMetadata;
        toastId = result.toastId;
      }

      // P2P delivery (if global room)
      let p2pDeliveryCount = 0;
      if (webRTCManager && isGlobalRoom) {
        p2pDeliveryCount = await handleP2PDelivery(webRTCManager, onlineUsers, userId, newMessage);
      }

      // Encrypt message text (override key/iv for global)
      let encryptedContent, key, messageIv;
      if (isGlobalRoom && globalE2eeKey && globalE2eeIv) {
        const encryptionResult = await globalEncryptMessage(globalE2eeKey, globalE2eeIv, newMessage.trim());
        encryptedContent = encryptionResult.encryptedContent;
        key = encryptionResult.key;
        messageIv = encryptionResult.messageIv;
      } else {
        const encRes = await encryptMessage(newMessage.trim());
        encryptedContent = encRes.encryptedContent;
        key = encRes.key;
        messageIv = encRes.iv;
      }

      const defaultTtl = 86400;
      const messageTtl = ttl || defaultTtl;

      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: userId,
          encrypted_content: encryptedContent,
          encryption_key: key,
          iv: messageIv,
          ephemeral_ttl: messageTtl,
          media_url: mediaUrl,
          media_type: mediaType,
          receiver_id: receiverId,
          group_id: groupId || null, // Now handling as string
          is_edited: false,
          is_deleted: false,
          media_encryption_key: encryptionKey,
          media_iv: iv,
          media_metadata: mediaMetadata ? JSON.stringify(mediaMetadata) : null
        });

      if (error) {
        toast({
          title: "Feil",
          description: "Kunne ikke sende melding: " + error.message,
          variant: "destructive",
        });
      } else {
        if (toastId) {
          toast({
            id: toastId,
            title: "Melding sendt",
            description: mediaFile ? "Melding med kryptert vedlegg ble sendt" : "Melding ble sendt",
          });
        }
        setNewMessage("");
      }
    } catch (error: any) {
      toast({
        title: "Feil",
        description: "Kunne ikke sende melding: " + (error instanceof Error ? error.message : 'Ukjent feil'),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [newMessage, userId, ttl, setNewMessage, setIsLoading, toast, handleMediaUpload, handleP2PDelivery]);

  return { handleSendMessage };
};
