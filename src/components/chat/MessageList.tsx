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
    <ScrollArea ref={scrollRef} className="flex-1 p-4">
      <div className="space-y-6">
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