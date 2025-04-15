
import { useState, useEffect } from "react";
import { Github, GitCommit, GitBranch, GitPullRequest, Clock, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CommitInfo {
  id: string;
  message: string;
  author: string;
  date: string;
  branch: string;
}

export const GitHubStatus = () => {
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Simulate loading recent commits
  useEffect(() => {
    const simulateCommits = () => {
      setLoading(true);
      
      // Simulate network delay
      setTimeout(() => {
        const mockCommits: CommitInfo[] = [
          {
            id: "8d7f3c2",
            message: "Fix responsive design issues in project grid",
            author: "johndoe",
            date: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
            branch: "main"
          },
          {
            id: "3f5e2a1",
            message: "Update API endpoints for domain health checks",
            author: "janedoe",
            date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
            branch: "feature/domain-monitoring"
          },
          {
            id: "9c8b7a6",
            message: "Implement real-time Supabase sync status indicators",
            author: "johndoe",
            date: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
            branch: "feature/sync-status"
          },
          {
            id: "5d4c3b2",
            message: "Merge pull request #42: Enhanced cyberpunk theme",
            author: "system",
            date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
            branch: "main"
          }
        ];
        
        setCommits(mockCommits);
        setLoading(false);
      }, 1500);
    };
    
    simulateCommits();
    
    // Set up a webhook listener on Supabase for GitHub events
    const setupGitHubWebhookListener = async () => {
      try {
        // Check if the github_events table exists
        const { error } = await supabase
          .from('github_events')
          .select('count')
          .limit(1)
          .single();
        
        // If the table exists, subscribe to changes
        if (!error) {
          const channel = supabase.channel('github-events')
            .on('postgres_changes', 
              { event: 'INSERT', schema: 'public', table: 'github_events' }, 
              (payload) => {
                const gitEvent = payload.new as any;
                
                // Handle new commit events
                if (gitEvent && gitEvent.type === 'push') {
                  const newCommit: CommitInfo = {
                    id: gitEvent.commit_id || "unknown",
                    message: gitEvent.commit_message || "No message",
                    author: gitEvent.author || "unknown",
                    date: gitEvent.created_at || new Date().toISOString(),
                    branch: gitEvent.branch || "main"
                  };
                  
                  setCommits(prev => [newCommit, ...prev.slice(0, 3)]);
                }
              }
            )
            .subscribe();
            
          return () => {
            supabase.removeChannel(channel);
          };
        }
      } catch (err) {
        console.error("Error setting up GitHub webhook listener:", err);
      }
    };
    
    setupGitHubWebhookListener();
    
    // Refresh commits periodically
    const interval = setInterval(simulateCommits, 5 * 60 * 1000); // Refresh every 5 minutes
    
    return () => clearInterval(interval);
  }, []);
  
  if (loading) {
    return (
      <div className="cyber-bg p-4 rounded-lg border border-gray-800 animate-pulse">
        <div className="flex items-center mb-4">
          <div className="bg-cyberdark-800 p-2 rounded-md">
            <Github size={20} className="text-cyberblue-400" />
          </div>
          <div className="h-6 bg-cyberdark-800 rounded w-40 ml-2"></div>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="mb-3 p-3 rounded-lg border border-gray-700 bg-cyberdark-900/80">
            <div className="h-5 bg-cyberdark-800 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-cyberdark-800 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="cyber-bg p-4 rounded-lg border border-gray-800">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <Github size={20} className="mr-2 text-white" />
        <span className="cyber-text">Recent GitHub Activity</span>
      </h2>
      
      <div className="space-y-3">
        {commits.map((commit) => (
          <div 
            key={commit.id} 
            className="p-3 rounded-lg border border-gray-700 bg-cyberdark-900/80 hover:border-cyberblue-700 transition-all duration-300"
          >
            <div className="flex items-start">
              <div className="mr-2 mt-1">
                <GitCommit size={16} className="text-cyberblue-400" />
              </div>
              <div>
                <p className="text-white font-medium">{commit.message}</p>
                <div className="flex flex-wrap items-center mt-2 text-xs text-gray-400 gap-x-4 gap-y-1">
                  <span className="flex items-center">
                    <User size={12} className="mr-1" /> 
                    {commit.author}
                  </span>
                  <span className="flex items-center">
                    <GitBranch size={12} className="mr-1" /> 
                    {commit.branch}
                  </span>
                  <span className="flex items-center">
                    <Clock size={12} className="mr-1" /> 
                    {new Date(commit.date).toLocaleString()}
                  </span>
                  <span className="text-cyberblue-300 font-mono">
                    {commit.id}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
