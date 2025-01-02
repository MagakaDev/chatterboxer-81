import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageGroup } from "./MessageGroup";
import { useEffect, useRef } from "react";

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

interface MessageListProps {
  messages: Message[];
}

export const MessageList = ({ messages }: MessageListProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const groupedMessages = messages.reduce<GroupedMessage[]>((acc, message) => {
    if (!message.user) return acc;

    const lastGroup = acc[acc.length - 1];
    const timeDiff = lastGroup 
      ? new Date(message.created_at).getTime() - new Date(lastGroup.messages[lastGroup.messages.length - 1].created_at).getTime()
      : Infinity;
    
    // Group messages if they're from the same user and within 5 minutes of each other
    if (lastGroup && 
        lastGroup.username === message.user.username && 
        timeDiff < 5 * 60 * 1000) {
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
    <ScrollArea ref={scrollRef} className="flex-1 p-4">
      <div className="space-y-8">
        {groupedMessages.map((group) => (
          <MessageGroup
            key={`${group.userId}-${group.messages[0].id}`}
            username={group.username}
            avatar_url={group.avatar_url}
            messages={group.messages}
          />
        ))}
      </div>
    </ScrollArea>
  );
};