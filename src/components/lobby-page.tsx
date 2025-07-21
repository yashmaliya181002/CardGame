
"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, User, Copy, Check, LogOut, Loader2, PartyPopper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "./ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePeer } from "@/hooks/use-peer";

interface LobbyPageProps {
  tableId: string;
  isHost: boolean;
}

export function LobbyPage({ tableId, isHost }: LobbyPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [numPlayers, setNumPlayers] = useState("4");
  
  const nickname = useMemo(() => typeof window !== 'undefined' ? localStorage.getItem("nickname") : "Player", []);
  const playerId = useMemo(() => typeof window !== 'undefined' ? localStorage.getItem("playerId") : "player_id", []);

  const { peer, peerId, players, setPlayers, broadcast, message } = usePeer(playerId, nickname, tableId, isHost);

  // Effect for handling incoming messages from peers
  useEffect(() => {
    if (!message) return;

    switch (message.type) {
        case 'lobby-update':
            setPlayers(message.payload.players);
            setNumPlayers(message.payload.numPlayers.toString());
            break;
        case 'start-game':
            router.push(`/game/${message.payload.tableId}?host=${isHost}&players=${message.payload.numPlayers}`);
            break;
    }
  }, [message, router, setPlayers, isHost]);


  // Effect for host to add themself to player list
  useEffect(() => {
    if (isHost && peerId && playerId && nickname) {
        setPlayers([{ id: playerId, name: nickname, isHost: true }]);
    }
  }, [isHost, peerId, playerId, nickname, setPlayers]);


  const handleNumPlayersChange = (value: string) => {
    const newNumPlayers = parseInt(value, 10);
    setNumPlayers(value);
    if(isHost) {
      const updatedPlayers = players.slice(0, newNumPlayers);
      setPlayers(updatedPlayers);
      broadcast({type: 'lobby-update', payload: { players: updatedPlayers, numPlayers: value }});
    }
  }

  const handleCopyCode = () => {
    if(!peerId) return;
    navigator.clipboard.writeText(peerId);
    setIsCopied(true);
    toast({ title: "Copied!", description: "Table code copied to clipboard." });
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const handleStartGame = () => {
    if (isHost) {
      broadcast({ type: 'start-game', payload: { tableId: peerId, numPlayers: requiredPlayersCount } });
      router.push(`/game/${peerId}?host=true&players=${requiredPlayersCount}`);
    }
  }

  const handleExitLobby = () => {
      peer?.destroy();
      router.push('/');
  }

  const currentPlayersCount = players.length;
  const requiredPlayersCount = parseInt(numPlayers);
  const canStartGame = isHost && currentPlayersCount === requiredPlayersCount;

  if (isHost && !peerId) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-yellow-100 p-4 font-headline">
         <Loader2 className="w-12 h-12 animate-spin text-primary" />
         <p className="mt-4 text-lg">Creating lobby...</p>
       </div>
     );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-yellow-100 p-4 font-headline">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Game Lobby</CardTitle>
          <CardDescription>Waiting for players to join</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">TABLE CODE</p>
            <div className="flex items-center gap-2 mt-2">
              <h2 className="text-4xl font-bold tracking-widest text-primary">{isHost ? peerId : tableId}</h2>
              <Button size="icon" variant="ghost" onClick={handleCopyCode} disabled={!peerId && !tableId}>
                {isCopied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <label htmlFor="num-players" className="font-semibold">Number of Players:</label>
            <Select value={numPlayers} onValueChange={handleNumPlayersChange} disabled={!isHost}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select players" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 Players</SelectItem>
                <SelectItem value="5">5 Players</SelectItem>
                <SelectItem value="6">6 Players</SelectItem>
                <SelectItem value="7">7 Players</SelectItem>
                <SelectItem value="8">8 Players</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />
          
          <div>
            <h3 className="font-semibold mb-4 text-center text-lg">Players ({currentPlayersCount}/{requiredPlayersCount})</h3>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {players.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={`https://placehold.co/40x40.png`} data-ai-hint="avatar" />
                      <AvatarFallback>{p.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{p.name} {p.id === playerId && "(You)"}</span>
                  </div>
                  {p.isHost ? (
                    <Crown className="w-5 h-5 text-amber-400" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              ))}
               {Array.from({ length: Math.max(0, requiredPlayersCount - currentPlayersCount) }).map((_, index) => (
                <div key={`waiting-${index}`} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg animate-pulse">
                   <Avatar>
                      <AvatarFallback>?</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-muted-foreground">Waiting for player...</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {isHost ? (
            <Button onClick={handleStartGame} disabled={!canStartGame} className="w-full h-12 text-lg">
              {canStartGame ? <><PartyPopper className="mr-2"/>Start Game</> : `Waiting for ${requiredPlayersCount - currentPlayersCount} more player(s)`}
            </Button>
          ) : (
            <p className="text-center text-muted-foreground italic">Waiting for the host to start the game...</p>
          )}
          <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                    <LogOut className="mr-2 h-4 w-4" /> Exit Lobby
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to leave?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {isHost ? "If you leave, the lobby will be closed for everyone." : "You will be removed from the lobby."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleExitLobby} className="bg-destructive hover:bg-destructive/90">Leave</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
