
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { GithubIcon, ExternalLink, Database, RefreshCw } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

export interface ProjectProps {
  title: string;
  description: string;
  previewUrl: string;
  githubUrl?: string;
  category: 'chat' | 'business' | 'analytics' | 'infrastructure';
  hasSupabase?: boolean;
}

export const ProjectCard = ({ title, description, previewUrl, githubUrl, category, hasSupabase }: ProjectProps) => {
  const [refreshKey, setRefreshKey] = useState(0); // State to force image refresh
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'chat':
        return 'border-cyberblue-500';
      case 'business':
        return 'border-cybergold-500';
      case 'analytics':
        return 'border-green-500';
      case 'infrastructure':
        return 'border-purple-500';
      default:
        return 'border-gray-500';
    }
  };

  // Function to refresh the preview image
  const refreshPreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setRefreshKey(prev => prev + 1);
  };

  // Determine the thumbnail URL based on the previewUrl with a cache-busting parameter
  const thumbnailUrl = `${previewUrl.replace('https://preview--', 'https://thumbnail--')}/thumbnail.png?t=${refreshKey}`;

  return (
    <Card className={`h-full bg-cyberdark-900 border-2 ${getCategoryColor(category)} hover:shadow-neon-gold transition-all duration-300`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-cybergold-400 text-xl flex items-center justify-between">
          {title}
          {hasSupabase && (
            <Badge variant="outline" className="ml-2 bg-cyberblue-900 text-cyberblue-300 border-cyberblue-500 flex items-center gap-1 px-2">
              <Database size={14} />
              Supabase
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="text-gray-300 text-sm space-y-4">
        <div className="overflow-hidden rounded-md border border-cyberdark-800 bg-cyberdark-800 relative group">
          <AspectRatio ratio={16/9} className="bg-cyberdark-800">
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative group">
              <img 
                key={refreshKey} // Use key to force reload of image when refreshed
                src={thumbnailUrl} 
                alt={`Preview of ${title}`}
                className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
              <div className="absolute inset-0 bg-cyberdark-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                <span className="text-cyberblue-400 flex items-center">
                  <ExternalLink size={20} className="mr-2" />
                  Preview Site
                </span>
              </div>
            </a>
          </AspectRatio>
          <button 
            className="absolute top-2 right-2 bg-cyberdark-900/80 p-1 rounded-full text-cyberblue-400 hover:text-cyberblue-300 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onClick={refreshPreview}
            title="Refresh preview"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        
        <p>{description}</p>
      </CardContent>
      
      <CardFooter className="flex justify-between mt-auto pt-4">
        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-cyberblue-400 hover:text-cyberblue-300 text-sm transition-colors"
        >
          <ExternalLink size={16} className="mr-1" />
          Preview
        </a>
        
        {githubUrl ? (
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-cybergold-400 hover:text-cybergold-300 text-sm transition-colors"
          >
            <GithubIcon size={16} className="mr-1" />
            GitHub
          </a>
        ) : (
          <span className="text-gray-500 text-sm italic">Private Repo</span>
        )}
      </CardFooter>
    </Card>
  );
};
