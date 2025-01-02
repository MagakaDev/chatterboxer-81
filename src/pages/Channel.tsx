import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MessageList } from "@/components/chat/MessageList";
import { MessageInput } from "@/components/chat/MessageInput";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user: {
    username: string;
    avatar_url: string;
  } | null;
}

export default function Channel() {
  const { id } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          setUserId(userData.id);
        } else {
          toast({
            title: "Erreur",
            description: "Votre profil utilisateur n'a pas été trouvé. Veuillez vous reconnecter.",
            variant: "destructive",
          });
        }
      }
    };

    getUserId();

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          created_at,
          user:users(username, avatar_url)
        `)
        .eq('channel_id', id)
        .order('created_at', { ascending: true });

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les messages",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setMessages(data);
      }
    };

    fetchMessages();

    const channel = supabase.channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${id}`,
        },
        async (payload) => {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('username, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          if (userError) {
            console.error('Error fetching user data:', userError);
            return;
          }

          const newMessage = {
            ...payload.new,
            user: userData
          } as Message;

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [id, toast]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          content: newMessage,
          channel_id: id,
          user_id: userId,
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50">
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} />
      </div>
      <MessageInput
        value={newMessage}
        onChange={setNewMessage}
        onSubmit={handleSendMessage}
        disabled={!userId}
      />
    </div>
  );
}