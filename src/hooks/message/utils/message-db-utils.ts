
import { supabase } from "@/integrations/supabase/client";

// Function to ensure the messages table has all necessary columns for editing/deleting
export const ensureMessageColumnsExist = async () => {
  try {
    // Call the Supabase function to check and add columns
    await supabase.rpc('check_and_add_columns', {
      p_table_name: 'messages',
      column_names: ['is_edited', 'edited_at', 'is_deleted', 'deleted_at', 'group_id']
    });
    
    console.log('Ensured all columns exist');
    return true;
  } catch (error) {
    console.error('Error ensuring columns exist:', error);
    return false;
  }
};

/**
 * Shows a toast notification for media upload progress
 */
export const showUploadToast = (toast: any, status: 'uploading' | 'success' | 'error', message?: string) => {
  if (status === 'uploading') {
    return toast({
      title: "Laster opp fil...",
      description: "Vennligst vent mens filen lastes opp",
    }).id;
  } else if (status === 'success') {
    return toast({
      title: "Fil lastet opp",
      description: message || "Sender melding med vedlegg...",
    });
  } else {
    return toast({
      title: "Feil",
      description: message || "Kunne ikke laste opp fil",
      variant: "destructive",
    });
  }
};

/**
 * Uploads media file to Supabase storage
 */
export const uploadMediaFile = async (mediaFile: File) => {
  const fileExt = mediaFile.name.split('.').pop();
  const filePath = `${crypto.randomUUID()}.${fileExt}`;

  const { error } = await supabase.storage
    .from('chat-media')
    .upload(filePath, mediaFile);

  if (error) {
    throw error;
  }

  return {
    mediaUrl: filePath,
    mediaType: mediaFile.type
  };
};
