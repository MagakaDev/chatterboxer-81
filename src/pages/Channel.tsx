import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  id: string;
  content: string;
  created_at: string;
  user: {
    username: string;
    avatar_url: string;
  } | null;
}

interface GroupedMessage {
  userId: string;
  username: string;
  avatar_url: string;
  messages: {
    id: string;
    content: string;
    created_at: string;
  }[];
}

export default function Channel() {
  const { id } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const { toast } = useToast();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Verify the user exists in the users table
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
    // Fetch initial messages
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

    // Subscribe to new messages
    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id, toast]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !userId) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        content: newMessage,
        channel_id: id,
        user_id: userId,
      });

    if (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message",
        variant: "destructive",
      });
      return;
    }

    setNewMessage("");
  };

  // Group messages by user
  const groupedMessages = messages.reduce<GroupedMessage[]>((acc, message) => {
    if (!message.user) return acc;

    const lastGroup = acc[acc.length - 1];
    
    if (lastGroup && lastGroup.username === message.user.username) {
      lastGroup.messages.push({
        id: message.id,
        content: message.content,
        created_at: message.created_at,
      });
    } else {
      acc.push({
        userId: message.user.username,
        username: message.user.username,
        avatar_url: message.user.avatar_url,
        messages: [{
          id: message.id,
          content: message.content,
          created_at: message.created_at,
        }]
      });
    }
    
    return acc;
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4 h-[600px] overflow-y-auto">
        {groupedMessages.map((group) => (
          <div key={`${group.userId}-${group.messages[0].id}`} className="mb-6">
            <div className="flex items-start gap-3">
              <Avatar className="mt-1">
                <AvatarImage 
                  src={group.avatar_url || '/placeholder.svg'} 
                  alt={group.username} 
                />
                <AvatarFallback>
                  {group.username[0]?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-sm text-gray-900">{group.username}</p>
                <div className="space-y-1">
                  {group.messages.map((message) => (
                    <div key={message.id} className="group">
                      <p className="text-gray-700">{message.content}</p>
                      <p className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Écrivez votre message..."
          className="flex-1"
        />
        <Button type="submit">Envoyer</Button>
      </form>
    </div>
  );
}