import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import LocationMap from "@/components/LocationMap";

interface Channel {
  id: string;
  name: string;
  description: string;
}

export default function Index() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchNearbyChannels = async () => {
      if (!userLocation) return;

      const { data, error } = await supabase.rpc('get_channels_within_radius', {
        user_lat: userLocation.lat,
        user_lng: userLocation.lng,
        radius_km: 10
      });

      if (error) {
        toast({
          title: "Erreur",
          description: "Impossible de charger les canaux à proximité",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setChannels(data);
      }
    };

    if (userLocation) {
      fetchNearbyChannels();
    }
  }, [userLocation, toast]);

  const handleJoinChannel = async (channelId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour rejoindre un canal",
          variant: "destructive",
        });
        return;
      }

      navigate(`/channel/${channelId}`);
      
      toast({
        title: "Succès",
        description: "Vous avez rejoint le canal avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateChannel = async () => {
    if (!userLocation) {
      toast({
        title: "Erreur",
        description: "Votre position est nécessaire pour créer un canal",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('channels')
        .insert([
          {
            name: newChannelName,
            description: newChannelDescription,
            location: `POINT(${userLocation.lng} ${userLocation.lat})`
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setChannels([...channels, data]);
      setNewChannelName("");
      setNewChannelDescription("");
      setIsDialogOpen(false);

      toast({
        title: "Succès",
        description: "Le canal a été créé avec succès",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le canal",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <LocationMap onLocationSelect={setUserLocation} />
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Canaux à proximité</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Créer un canal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Créer un nouveau canal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du canal</Label>
                <Input
                  id="name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="Entrez le nom du canal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newChannelDescription}
                  onChange={(e) => setNewChannelDescription(e.target.value)}
                  placeholder="Entrez la description du canal"
                />
              </div>
              <Button 
                onClick={handleCreateChannel}
                disabled={!newChannelName || !newChannelDescription}
                className="w-full"
              >
                Créer le canal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <h3 className="text-lg font-semibold mb-2">{channel.name}</h3>
            <p className="text-gray-600 mb-4">{channel.description}</p>
            <Button onClick={() => handleJoinChannel(channel.id)}>
              Rejoindre
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}