import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Channel {
  id: string;
  name: string;
  description: string;
}

export default function Index() {
  const [channels, setChannels] = useState<Channel[]>([]);

  useEffect(() => {
    const fetchChannels = async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*');
      
      if (!error && data) {
        setChannels(data);
      }
    };

    fetchChannels();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h2 className="text-2xl font-bold mb-6">Canaux disponibles</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <h3 className="text-lg font-semibold mb-2">{channel.name}</h3>
            <p className="text-gray-600 mb-4">{channel.description}</p>
            <Button>
              Rejoindre
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}