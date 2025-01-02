import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}

export const MessageInput = ({ value, onChange, onSubmit, disabled }: MessageInputProps) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-4 border-t bg-white">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Écrivez votre message..."
        className="flex-1"
        disabled={disabled}
      />
      <Button type="submit" disabled={disabled || !value.trim()}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
};