import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  Loader2, 
  Play, 
  Pause, 
  Trash2, 
  Clock, 
  User, 
  Briefcase,
  Music,
  Calendar
} from 'lucide-react';

interface SavedPodcast {
  id: string;
  title: string;
  audio_url: string;
  transcript: string | null;
  duration_seconds: number | null;
  occupation_code: string | null;
  occupation_title: string | null;
  created_at: string;
}

interface SavedPodcastsProps {
  onPlayPodcast: (podcast: SavedPodcast) => void;
  onDeletePodcast?: (podcastId: string) => void;
}

export default function SavedPodcasts({ onPlayPodcast, onDeletePodcast }: SavedPodcastsProps) {
  const { user } = useAuth();
  const [podcasts, setPodcasts] = useState<SavedPodcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (user) {
      fetchPodcasts();
    }
  }, [user]);

  const fetchPodcasts = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('podcasts')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPodcasts(data || []);
    } catch (error) {
      console.error('Failed to fetch podcasts:', error);
      toast.error('Failed to load your podcasts');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPlay = (podcast: SavedPodcast) => {
    if (playingId === podcast.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(podcast.audio_url);
      audio.onended = () => setPlayingId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingId(podcast.id);
    }
  };

  const handleDelete = async (podcastId: string) => {
    if (!user) return;
    
    setDeletingId(podcastId);
    try {
      const podcast = podcasts.find(p => p.id === podcastId);
      if (!podcast) return;

      // Stop playback if this podcast is playing
      if (playingId === podcastId) {
        audioRef.current?.pause();
        setPlayingId(null);
      }

      const fileName = `${user.id}/${podcastId}.mp3`;
      await supabase.storage.from('podcasts').remove([fileName]);

      const { error } = await supabase
        .from('podcasts')
        .delete()
        .eq('id', podcastId);

      if (error) throw error;

      setPodcasts(prev => prev.filter(p => p.id !== podcastId));
      onDeletePodcast?.(podcastId);
      toast.success('Podcast deleted');
    } catch (error) {
      console.error('Failed to delete podcast:', error);
      toast.error('Failed to delete podcast');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (podcasts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Music className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="font-medium text-lg mb-2">No saved podcasts yet</h3>
          <p className="text-sm text-muted-foreground">
            Generate a podcast from the tabs above to see it here
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {podcasts.map((podcast) => (
        <Card key={podcast.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full shrink-0"
                onClick={() => handleQuickPlay(podcast)}
              >
                {playingId === podcast.id ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5 ml-0.5" />
                )}
              </Button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {podcast.occupation_code ? (
                    <Briefcase className="h-4 w-4 text-accent shrink-0" />
                  ) : (
                    <User className="h-4 w-4 text-primary shrink-0" />
                  )}
                  <h4 className="font-medium truncate">{podcast.title}</h4>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(podcast.duration_seconds)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(podcast.created_at)}
                  </span>
                  {podcast.occupation_title && (
                    <Badge variant="secondary" className="text-xs">
                      {podcast.occupation_title}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => onPlayPodcast(podcast)}
                >
                  Open Player
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={deletingId === podcast.id}
                    >
                      {deletingId === podcast.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete podcast?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{podcast.title}". This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(podcast.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
