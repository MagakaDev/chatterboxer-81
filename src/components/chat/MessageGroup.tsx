import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Message {
  id: string;
  content: string;
  created_at: string;
}

interface MessageGroupProps {
  username: string;
  avatar_url: string;
  messages: Message[];
}

export const MessageGroup = ({ username, avatar_url, messages }: MessageGroupProps) => {
  return (
    <div className="flex items-start gap-3 mb-6 group/message animate-fade-in">
      <Avatar className="mt-1 w-8 h-8">
        <AvatarImage src={avatar_url || '/placeholder.svg'} alt={username} />
        <AvatarFallback>{username[0]?.toUpperCase() || '?'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 mb-1">{username}</p>
        <div className="space-y-1">
          {messages.map((message) => (
            <div key={message.id} className="group">
              <p className="text-gray-700 break-words">{message.content}</p>
              <p className="text-xs text-gray-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {format(new Date(message.created_at), "d MMMM à HH:mm", { locale: fr })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};