
import { useRef, useEffect, useCallback } from "react";
import { DecryptedMessage } from "@/types/message";
import { MessageMedia } from "./MessageMedia";
import { MessageTimer } from "./MessageTimer";
import { useScreenshotPrevention } from "@/utils/security/screenshot-prevention";

interface MessageContentProps {
  message: DecryptedMessage;
  onMessageExpired: (messageId: string) => void;
}

export const MessageContent = ({ message, onMessageExpired }: MessageContentProps) => {
  const contentRef = useRef<HTMLParagraphElement>(null);

  // Callbacks bridge for media expiry to expire the message
  const handleMediaExpired = useCallback(() => {
    onMessageExpired(message.id);
  }, [onMessageExpired, message.id]);

  // Apply screenshot prevention
  useScreenshotPrevention({
    showToast: true,
    toastTitle: "Skjermdump deaktivert",
    toastMessage: "Av sikkerhetsgrunner er skjermdump deaktivert"
  });

  if (message.is_deleted) {
    return (
      <p className="text-cyberdark-400 italic text-xs sm:text-sm">
        Denne meldingen ble slettet
      </p>
    );
  }

  return (
    <>
      <p ref={contentRef} className="text-cyberblue-100 text-xs sm:text-sm break-words">
        {message.content}
        {message.is_edited && (
          <span className="text-[10px] text-cyberdark-400 ml-1">(redigert)</span>
        )}
      </p>
      {message.media_url && (
        <MessageMedia message={message} onMediaExpired={handleMediaExpired} />
      )}
      <div className="flex items-center gap-2 mt-1">
        <p className="text-[10px] sm:text-xs text-cyberdark-400 group-hover:text-cyberdark-300">
          {new Date(message.created_at).toLocaleString()}
        </p>
        <MessageTimer 
          message={message} 
          onExpired={() => onMessageExpired(message.id)} 
        />
      </div>
    </>
  );
};
