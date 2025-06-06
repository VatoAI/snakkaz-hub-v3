import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Group, GroupMember } from "@/types/group";
import { SecurityLevel } from "@/types/security";
import { useToast } from "@/components/ui/use-toast";

export function useGroupFetching(currentUserId: string) {
  const { toast } = useToast();

  const fetchGroups = useCallback(async (): Promise<Group[]> => {
    try {
      // First fetch groups where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          role,
          groups (
            id,
            name,
            created_at,
            creator_id,
            security_level,
            password,
            avatar_url
          )
        `)
        .eq('user_id', currentUserId);

      if (memberError) {
        console.error("Error fetching group memberships:", memberError);
        throw memberError;
      }

      if (!memberData?.length) return [];

      // Format the groups data
      const groups = memberData
        .filter(membership => membership.groups) // Filter out any null groups
        .map(membership => {
          const group = membership.groups as any;
          return {
            ...group,
            security_level: group.security_level as SecurityLevel
          };
        });

      // Process each group to get its members with profiles
      const groupsWithMembers: Group[] = [];
      
      for (const group of groups) {
        const { data: membersData, error: membersError } = await supabase
          .from('group_members')
          .select(`
            id,
            user_id,
            role,
            joined_at,
            group_id,
            profiles:user_id (
              id,
              username,
              avatar_url,
              full_name
            )
          `)
          .eq('group_id', group.id);

        if (membersError) {
          console.error("Error fetching group members:", membersError);
          throw membersError;
        }
        
        if (!membersData) continue;
        
        // Create properly typed GroupMember objects
        const membersWithProfiles: GroupMember[] = membersData.map(member => {
          const profileExists = member.profiles !== null && member.profiles !== undefined;
          const isProfileObject = profileExists && typeof member.profiles === 'object';
          const isProfileError = isProfileObject && 'error' in member.profiles;
          
          // Create a typed profile object
          const profile = {
            id: member.user_id,
            username: (isProfileObject && !isProfileError && 
              'username' in member.profiles && member.profiles.username !== null) ? 
              String(member.profiles.username) : "",
            avatar_url: (isProfileObject && !isProfileError && 
              'avatar_url' in member.profiles && member.profiles.avatar_url !== null) ? 
              String(member.profiles.avatar_url) : "",
            full_name: (isProfileObject && !isProfileError && 
              'full_name' in member.profiles && member.profiles.full_name !== null) ? 
              String(member.profiles.full_name) : ""
          };
            
          return {
            id: member.id,
            user_id: member.user_id,
            group_id: member.group_id,
            role: member.role as 'admin' | 'member',
            joined_at: member.joined_at,
            profile: profile
          };
        });
        
        groupsWithMembers.push({
          ...group,
          members: membersWithProfiles
        });
      }

      return groupsWithMembers;
    } catch (error) {
      console.error("Error fetching groups:", error);
      toast({
        title: "Kunne ikke hente grupper",
        description: "En feil oppstod. Prøv igjen senere.",
        variant: "destructive"
      });
      return [];
    }
  }, [currentUserId, toast]);

  return { fetchGroups };
}
