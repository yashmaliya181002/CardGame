
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, User, Copy, Check, LogOut, Loader2, PartyPopper } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "./ui/separator";
import { db, doc, onSnapshot, updateDoc, arrayUnion, setDoc, getDoc, arrayRemove, deleteDoc } from "@/lib/firebase";
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
} from "@/components/ui/alert-dialog"

type Player = {
  id: string;
  name: string;
  isHost: boolean;
};

interface LobbyPageProps {
  tableId: string;
  isHost: boolean;
}

export function LobbyPage({ tableId, isHost }: LobbyPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [player, setPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [numPlayers, setNumPlayers] = useState("4");
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const nickname = typeof window !== 'undefined' ? localStorage.getItem("nickname") : null;
  const playerId = typeof window !== 'undefined' ? localStorage.getItem("playerId") : null;

  const leaveLobby = useCallback(async (isHostLeaving = false) => {
    if (player) {
      const lobbyDocRef = doc(db, "lobbies", tableId);
      
      if (isHostLeaving) {
        await deleteDoc(lobbyDocRef);
      } else {
        await updateDoc(lobbyDocRef, {
          players: arrayRemove(player)
        }).catch(err => console.log("Player may have already been removed."));
      }
    }
    router.push('/');
  }, [player, tableId, router]);


  useEffect(() => {
    if (!nickname || !playerId) {
      toast({ title: "Error", description: "You need a nickname to join a lobby.", variant: "destructive" });
      router.push("/");
      return;
    }

    const self: Player = { id: playerId, name: nickname, isHost };
    setPlayer(self);
    const lobbyDocRef = doc(db, "lobbies", tableId);

    const setupLobby = async () => {
      try {
        const docSnap = await getDoc(lobbyDocRef);
        if (isHost) {
          if (docSnap.exists() && docSnap.data().status === 'in-progress') {
             router.push(`/game/${tableId}?host=true`);
             return;
          }
          await setDoc(lobbyDocRef, {
            players: [self],
            numPlayers: parseInt(numPlayers),
            hostId: self.id,
            createdAt: new Date(),
            status: 'waiting'
          });
        } else {
           if (!docSnap.exists()) {
             toast({ title: "Lobby not found", description: "This lobby does not exist or has been closed.", variant: "destructive" });
             router.push('/');
             return;
           }
           if (docSnap.data().status === 'in-progress') {
             router.push(`/game/${tableId}`);
             return;
           }
           await updateDoc(lobbyDocRef, {
             players: arrayUnion(self)
           });
        }
      } catch (error) {
        console.error("Error setting up lobby: ", error);
        toast({ title: "Error", description: "Could not create or join the lobby.", variant: "destructive" });
        router.push('/');
        return;
      }
    };
    
    setupLobby();

    const unsubscribe = onSnapshot(lobbyDocRef, (docSnap) => {
      setIsLoading(false);
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.status === 'in-progress') {
            router.push(`/game/${tableId}?host=${player?.isHost ?? false}`);
            return;
        }
        setPlayers(data.players || []);
        setNumPlayers(data.numPlayers?.toString() || "4");
      } else {
        if (!isHost) {
            toast({ title: "Lobby closed", description: "The host has closed the lobby." });
            router.push('/');
        }
      }
    }, (error) => {
      console.error("Snapshot error: ", error);
      toast({ title: "Connection error", description: "Lost connection to the lobby.", variant: "destructive" });
      router.push('/');
    });

    return () => {
      unsubscribe();
      if(player && !player.isHost) {
          leaveLobby(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId, nickname, playerId, isHost, router, toast]);
  

  const handleNumPlayersChange = async (value: string) => {
    setNumPlayers(value);
    if(isHost) {
        const lobbyDocRef = doc(db, "lobbies", tableId);
        await updateDoc(lobbyDocRef, { numPlayers: parseInt(value) });
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tableId);
    setIsCopied(true);
    toast({ title: "Copied!", description: "Table code copied to clipboard." });
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const handleStartGame = async () => {
    if (canStartGame) {
      const lobbyDocRef = doc(db, "lobbies", tableId);
      await updateDoc(lobbyDocRef, { status: "in-progress" });
      // Navigation will be handled by the onSnapshot listener
    }
  }

  const currentPlayersCount = players.length;
  const requiredPlayersCount = parseInt(numPlayers);
  const canStartGame = isHost && currentPlayersCount === requiredPlayersCount;

  if (isLoading) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-yellow-100 p-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary"/>
              <p className="mt-4 text-lg">Joining lobby...</p>
          </div>
      )
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
          
          {isHost && (
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
          )}

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
                <div key={index} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg animate-pulse">
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
                    {isHost ? "If you leave, the lobby will be closed for everyone." : "You will be removed from the lobby and can rejoin later if there's space."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => leaveLobby(isHost)} className="bg-destructive hover:bg-destructive/90">Leave</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
