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
    <div className="flex items-start gap-3 group/message animate-fade-in">
      <div className="w-8 h-8 flex-shrink-0 mt-4">
        <Avatar>
          <AvatarImage src={avatar_url || '/placeholder.svg'} alt={username} />
          <AvatarFallback>{username[0]?.toUpperCase() || '?'}</AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-semibold text-sm text-gray-900">{username}</p>
        <div className="space-y-1">
          {messages.map((message, index) => (
            <div 
              key={message.id} 
              className={`group relative rounded-2xl px-3 py-2 hover:bg-gray-100 transition-colors
                ${index === 0 ? 'rounded-tl-2xl' : 'rounded-tl-lg'}
                ${index === messages.length - 1 ? 'rounded-bl-2xl' : 'rounded-bl-lg'}
                bg-gray-200`}
            >
              <p className="text-gray-700 break-words">{message.content}</p>
              <span className="absolute -bottom-5 left-0 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {format(new Date(message.created_at), "HH:mm", { locale: fr })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};