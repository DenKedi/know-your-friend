import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useCreateRoom, useJoinRoom } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");

  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();

  const handleCreate = () => {
    if (!name.trim()) {
      toast({ title: "Please enter your name", variant: "destructive" });
      return;
    }
    createRoom.mutate(
      { data: { hostName: name, totalRounds: 5 } },
      {
        onSuccess: (data) => {
          sessionStorage.setItem(`kyf_token_${data.roomCode}`, data.playerToken);
          sessionStorage.setItem(`kyf_id_${data.roomCode}`, data.playerId);
          setLocation(`/room/${data.roomCode}/lobby`);
        },
        onError: (err) => {
          toast({ title: "Failed to create room", description: err.error?.error, variant: "destructive" });
        },
      }
    );
  };

  const handleJoin = () => {
    if (!name.trim()) {
      toast({ title: "Please enter your name", variant: "destructive" });
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 4) {
      toast({ title: "Please enter a valid 4-character room code", variant: "destructive" });
      return;
    }
    joinRoom.mutate(
      { roomCode: roomCode.toUpperCase(), data: { playerName: name } },
      {
        onSuccess: (data) => {
          sessionStorage.setItem(`kyf_token_${data.roomCode}`, data.playerToken);
          sessionStorage.setItem(`kyf_id_${data.roomCode}`, data.playerId);
          setLocation(`/room/${data.roomCode}/lobby`);
        },
        onError: (err) => {
          toast({ title: "Failed to join room", description: err.error?.error, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 20% 30%, var(--color-primary) 0%, transparent 40%), radial-gradient(circle at 80% 70%, var(--color-secondary) 0%, transparent 40%)" }} />
      
      <Card className="w-full max-w-md relative z-10 border-4 border-black/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] bg-card">
        <CardHeader className="text-center pb-8">
          <CardTitle className="text-4xl md:text-5xl font-black uppercase tracking-tight mb-2 text-primary">
            Know Your<br/>Friend
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground font-medium">
            The social game of wild assumptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Your Name</label>
            <Input 
              placeholder="e.g. Gossip Girl" 
              className="text-lg py-6 font-bold bg-input border-2 border-transparent focus:border-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={15}
            />
          </div>
          
          <div className="pt-4 space-y-4">
            <Button 
              className="w-full text-lg py-6 font-bold hover:-translate-y-1 transition-transform" 
              onClick={handleCreate}
              disabled={createRoom.isPending || joinRoom.isPending}
            >
              Create New Game
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider">
                <span className="bg-card px-2 text-muted-foreground">Or join existing</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Input 
                placeholder="CODE" 
                className="text-center uppercase text-xl font-bold py-6 bg-input border-2 border-transparent focus:border-secondary"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={4}
              />
              <Button 
                variant="secondary" 
                className="py-6 px-8 text-lg font-bold hover:-translate-y-1 transition-transform"
                onClick={handleJoin}
                disabled={createRoom.isPending || joinRoom.isPending}
              >
                Join
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
