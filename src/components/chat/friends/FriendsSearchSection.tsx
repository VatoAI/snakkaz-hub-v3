
import { useState } from "react";
import { FriendSearch } from "./FriendSearch";
import { UserProfile } from "./types";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FriendsSearchSectionProps {
  currentUserId: string;
  onSendFriendRequest: (userId: string) => void;
}

export const FriendsSearchSection = ({ 
  currentUserId, 
  onSendFriendRequest 
}: FriendsSearchSectionProps) => {
  const [searchUsername, setSearchUsername] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchUsername.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .ilike('username', `%${searchUsername}%`)
        .limit(5);

      if (error) throw error;

      const filteredResults = data?.filter(profile => profile.id !== currentUserId) || [];
      setSearchResults(filteredResults);
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: "Søkefeil",
        description: "Kunne ikke søke etter brukere",
        variant: "destructive",
      });
    }
  };

  return (
    <FriendSearch 
      searchUsername={searchUsername}
      setSearchUsername={setSearchUsername}
      onSearch={handleSearch}
      searchResults={searchResults}
      onSendFriendRequest={onSendFriendRequest}
    />
  );
};
