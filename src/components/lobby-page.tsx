
"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Peer, DataConnection } from "peerjs";
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

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
  peerId: string;
}

export type Message = {
    type: 'lobby-update' | 'start-game' | 'join-request' | 'welcome';
    payload: any;
}

const PEER_PREFIX = "kaali-teeri-";

interface LobbyPageProps {
  tableId: string;
  isHost: boolean;
}

export function LobbyPage({ tableId, isHost }: LobbyPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isCopied, setIsCopied] = useState(false);
  const [numPlayers, setNumPlayers] = useState("4");
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  
  const nickname = useMemo(() => typeof window !== 'undefined' ? localStorage.getItem("nickname") : "Player", []);
  const playerId = useMemo(() => typeof window !== 'undefined' ? localStorage.getItem("playerId") : "player_id", []);

  const broadcast = useCallback((data: Message) => {
    connectionsRef.current.forEach(conn => conn.send(data));
  }, []);

  const handleStartGame = useCallback(() => {
    if (isHost) {
      broadcast({ type: 'start-game', payload: { tableId } });
      router.push(`/game/${tableId}?host=true`);
    }
  }, [isHost, tableId, broadcast, router]);

  useEffect(() => {
    if (!playerId || !nickname) {
      router.push('/');
      return;
    }

    import('peerjs').then(({ default: Peer }) => {
      let peer: Peer;
      const peerIdForConnection = isHost 
        ? `${PEER_PREFIX}${tableId}` 
        : `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        peer = new Peer(peerIdForConnection, {
          // For a real production app, you'd host your own PeerJS server
        });
      } catch (error) {
        console.error("Failed to create peer:", error);
        toast({ title: "Connection Error", description: "Could not initialize network service. Please try again.", variant: "destructive" });
        router.push('/');
        return;
      }

      peerRef.current = peer;

      peer.on('open', (id) => {
        setIsLoading(false);
        if (isHost) {
          const hostPlayer = { id: playerId, name: nickname, isHost: true, peerId: id };
          setPlayers([hostPlayer]);
        } else {
          const hostPeerId = `${PEER_PREFIX}${tableId}`;
          const conn = peer.connect(hostPeerId, { reliable: true });
          
          conn.on('open', () => {
            connectionsRef.current.set(hostPeerId, conn);
            conn.send({ 
              type: 'join-request', 
              payload: { 
                player: { id: playerId, name: nickname, isHost: false, peerId: id } 
              } 
            });
          });
          
          conn.on('data', (data) => handleMessage(data as Message, conn.peer, conn));
          conn.on('error', (err) => console.error("Connection error:", err));
        }
      });

      peer.on('connection', (conn) => {
        if (isHost) {
          conn.on('data', (data) => handleMessage(data as Message, conn.peer, conn));
          conn.on('error', (err) => console.error("Host connection error:", err));
        }
      });

      peer.on('error', (err) => {
        console.error("PeerJS error:", err);
        if (err.type === 'peer-unavailable') {
            toast({ title: "Lobby Not Found", description: "The host is not available or the code is incorrect.", variant: "destructive" });
        } else {
            toast({ title: "Connection Error", description: `Could not connect: ${err.message}`, variant: "destructive" });
        }
        router.push('/');
      });

      const handleMessage = (message: Message, fromPeerId: string, conn: DataConnection) => {
        if (isHost && message.type === 'join-request') {
          const newPlayer = message.payload.player as Player;
          connectionsRef.current.set(newPlayer.peerId, conn);
          
          // Welcome the new player and give them the current state
          const updatedPlayers = [...players, newPlayer];
          conn.send({ type: 'welcome', payload: { players: updatedPlayers, numPlayers }});

          // Inform everyone else about the new player
          setPlayers(updatedPlayers);
          broadcast({ type: 'lobby-update', payload: { players: updatedPlayers, numPlayers } });
        } else if (!isHost && message.type === 'welcome') {
          setPlayers(message.payload.players);
          setNumPlayers(message.payload.numPlayers);
        } else if (message.type === 'lobby-update') {
           setPlayers(message.payload.players);
           setNumPlayers(message.payload.numPlayers.toString());
        } else if (message.type === 'start-game') {
          router.push(`/game/${message.payload.tableId}?host=${isHost}`);
        }
      };

    });

    return () => {
      peerRef.current?.destroy();
      connectionsRef.current.forEach(conn => conn.close());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, nickname, isHost, tableId, router, toast]);


  const handleNumPlayersChange = (value: string) => {
    setNumPlayers(value);
    if(isHost) {
      broadcast({ type: 'lobby-update', payload: { players, numPlayers: value } });
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tableId);
    setIsCopied(true);
    toast({ title: "Copied!", description: "Table code copied to clipboard." });
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const handleExitLobby = () => {
      peerRef.current?.destroy();
      router.push('/');
  }

  const currentPlayersCount = players.length;
  const requiredPlayersCount = parseInt(numPlayers);
  const canStartGame = isHost && currentPlayersCount >= 2 && currentPlayersCount === requiredPlayersCount;

  if (isLoading) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-yellow-100 p-4 font-headline">
         <Loader2 className="w-12 h-12 animate-spin text-primary" />
         <p className="mt-4 text-lg">{isHost ? "Creating lobby..." : "Joining lobby..."}</p>
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
              <h2 className="text-4xl font-bold tracking-widest text-primary">{tableId}</h2>
              <Button size="icon" variant="ghost" onClick={handleCopyCode}>
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
