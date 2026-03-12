import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ArrowUp, Paperclip, Mic, MicOff, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import ReactMarkdown from 'react-markdown';
import { getMascotSrc } from '@/lib/mascots';
import { toast } from 'sonner';

type Attachment = { file: File; preview?: string };
type Msg = { role: 'user' | 'assistant'; content: string; attachments?: string[] };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-chat`;
const SCRIBE_TOKEN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-scribe-token`;

const STARTER_SUGGESTIONS = [
  { emoji: '🧭', label: 'Explain my interest results' },
  { emoji: '⚖️', label: 'What do my work values mean?' },
  { emoji: '📄', label: 'Help improve my resume' },
  { emoji: '🎯', label: 'Suggest careers for me' },
  { emoji: '💡', label: 'Tips for job interviews' },
];

interface AgentChatProps {
  onboardingComplete?: boolean;
}

export default function AgentChat({ onboardingComplete = false }: AgentChatProps) {
  const { profile, user } = useAuth();
  const mascot = getMascotSrc((profile as any)?.mascot_choice);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [partialTranscript, setPartialTranscript] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const firstName = profile?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'there';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newAttachments: Attachment[] = files.map(file => {
      const isImage = file.type.startsWith('image/');
      return {
        file,
        preview: isImage ? URL.createObjectURL(file) : undefined,
      };
    });

    setAttachments(prev => [...prev, ...newAttachments].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const removed = prev[index];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadAttachments = async (): Promise<string[]> => {
    if (!user || attachments.length === 0) return [];
    const urls: string[] = [];
    for (const att of attachments) {
      const ext = att.file.name.split('.').pop() || 'bin';
      const path = `chat/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, att.file);
      if (error) {
        console.error('Upload error:', error);
        continue;
      }
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      urls.push(publicUrl);
    }
    return urls;
  };

  const sendMessage = async (text?: string) => {
    const trimmed = (text || input).trim();
    if ((!trimmed && attachments.length === 0) || isLoading) return;

    setIsLoading(true);

    // Upload any attachments
    let uploadedUrls: string[] = [];
    if (attachments.length > 0) {
      uploadedUrls = await uploadAttachments();
      // Clean up previews
      attachments.forEach(a => { if (a.preview) URL.revokeObjectURL(a.preview); });
      setAttachments([]);
    }

    const userContent = uploadedUrls.length > 0
      ? `${trimmed}\n\n[Attached ${uploadedUrls.length} file(s)]`
      : trimmed;

    const userMsg: Msg = { role: 'user', content: userContent, attachments: uploadedUrls.length > 0 ? uploadedUrls : undefined };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    let assistantSoFar = '';

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: userContent }] }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error(`Error: ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error('Chat error:', e);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble connecting. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Get scribe token
      const tokenRes = await fetch(SCRIBE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      
      if (!tokenRes.ok) {
        // Fallback: use basic MediaRecorder for speech
        toast.error('Voice service unavailable. Using basic recording.');
        const mediaRecorder = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
        mediaRecorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          // For now just notify - basic fallback
          toast.info('Recording saved. Voice transcription requires ElevenLabs setup.');
        };
        mediaRecorder.start();
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
        return;
      }
      
      const { token } = await tokenRes.json();
      
      // Connect to ElevenLabs Scribe WebSocket
      const ws = new WebSocket(`wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime&token=${token}&language_code=eng`);
      wsRef.current = ws;
      
      ws.onopen = () => {
        // Start sending audio via MediaRecorder
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
        mediaRecorderRef.current = mediaRecorder;
        
        mediaRecorder.ondataavailable = async (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            const buffer = await e.data.arrayBuffer();
            const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
            ws.send(JSON.stringify({ audio: base64 }));
          }
        };
        
        mediaRecorder.start(250); // Send chunks every 250ms
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'partial_transcript' && data.text) {
            setPartialTranscript(data.text);
          } else if (data.type === 'committed_transcript' && data.text) {
            setInput(prev => (prev ? prev + ' ' : '') + data.text);
            setPartialTranscript('');
          }
        } catch (err) {
          console.error('WS parse error:', err);
        }
      };
      
      ws.onerror = (err) => {
        console.error('WS error:', err);
        toast.error('Voice connection error');
        stopRecording();
      };
      
      ws.onclose = () => {
        stream.getTracks().forEach(t => t.stop());
      };
      
      setIsRecording(true);
    } catch (err) {
      console.error('Mic error:', err);
      toast.error('Could not access microphone. Please check permissions.');
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsRecording(false);
    setPartialTranscript('');
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="space-y-4 py-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-6">
              <p className="font-medium text-foreground">Hi {firstName}! I'm Agent360 🤖</p>
              <p className="mt-1 text-xs">Ask me about assessments, resumes, career paths & more.</p>

              {onboardingComplete && (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {STARTER_SUGGESTIONS.map((s) => (
                    <button
                      key={s.label}
                      onClick={() => sendMessage(s.label)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-foreground hover:bg-primary/10 hover:border-primary/30 transition-colors"
                    >
                      <span>{s.emoji}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <img src={mascot} alt="Agent360" className="w-7 h-7 rounded-full flex-shrink-0 mt-1 object-cover" />
              )}
              <div className={`max-w-[85%] space-y-2`}>
                {/* Show image attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.attachments.map((url, j) => (
                      <img key={j} src={url} alt="Attachment" className="max-w-[200px] max-h-[150px] rounded-xl object-cover border border-border" />
                    ))}
                  </div>
                )}
                <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none [&>p]:m-0">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-3 justify-start">
              <img src={mascot} alt="Agent360" className="w-7 h-7 rounded-full flex-shrink-0 object-cover" />
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {attachments.map((att, i) => (
            <div key={i} className="relative group">
              {att.preview ? (
                <img src={att.preview} alt={att.file.name} className="h-16 w-16 rounded-lg object-cover border border-border" />
              ) : (
                <div className="h-16 w-16 rounded-lg border border-border bg-muted flex items-center justify-center">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[8px] text-muted-foreground mt-0.5 truncate max-w-[50px]">{att.file.name.split('.').pop()}</span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(i)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Voice transcript indicator */}
      {isRecording && partialTranscript && (
        <div className="px-4 pb-1">
          <p className="text-xs text-muted-foreground italic animate-pulse">🎙️ {partialTranscript}</p>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t border-border">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRecording ? 'Listening...' : 'Ask a question...'}
            className="border-0 bg-transparent resize-none min-h-[48px] max-h-[120px] focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none text-sm px-4 pt-3 pb-1"
            disabled={isLoading}
          />
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt"
                multiple
                className="sr-only"
                onChange={handleFileSelect}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-8 w-8 transition-colors ${isRecording ? 'text-destructive bg-destructive/10 hover:text-destructive' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              size="icon"
              onClick={() => sendMessage()}
              disabled={(!input.trim() && attachments.length === 0) || isLoading}
              className="rounded-full h-8 w-8 bg-primary hover:bg-primary/90"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
