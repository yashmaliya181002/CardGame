"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, User, Copy, Check, LogOut, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "./ui/separator";

type Player = {
  name: string;
  isHost: boolean;
};

interface LobbyPageProps {
  tableId: string;
  isHost: boolean;
}

const MOCK_PLAYERS: Player[] = [
  { name: "Player 2", isHost: false },
  { name: "Player 3", isHost: false },
];

export function LobbyPage({ tableId, isHost }: LobbyPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [nickname, setNickname] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [numPlayers, setNumPlayers] = useState("4");
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedNickname = localStorage.getItem("nickname");
    if (storedNickname) {
      setNickname(storedNickname);
      const self = { name: storedNickname, isHost };
      // In a real app, this would come from a P2P connection
      setPlayers([self, ...MOCK_PLAYERS.slice(0, parseInt(numPlayers) -1)]);
    } else {
      router.push("/");
    }
    setIsLoading(false)
  }, [isHost, router, numPlayers]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tableId);
    setIsCopied(true);
    toast({ title: "Copied!", description: "Table code copied to clipboard." });
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const handleStartGame = () => {
    // Game start logic would go here
    toast({ title: "Starting Game!", description: "Get ready to play." });
  }
  
  const handleExitLobby = () => {
    router.push('/');
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
              <Select value={numPlayers} onValueChange={setNumPlayers}>
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
              {players.map((player, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={`https://placehold.co/40x40.png`} />
                      <AvatarFallback>{player.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{player.name} {player.name === nickname && "(You)"}</span>
                  </div>
                  {player.isHost ? (
                    <Crown className="w-5 h-5 text-amber-400" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
              ))}
               {Array.from({ length: requiredPlayersCount - currentPlayersCount }).map((_, index) => (
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
              {canStartGame ? "Start Game" : `Waiting for ${requiredPlayersCount - currentPlayersCount} more player(s)`}
            </Button>
          ) : (
            <p className="text-center text-muted-foreground italic">Waiting for the host to start the game...</p>
          )}
          <Button variant="destructive" className="w-full" onClick={handleExitLobby}>
            <LogOut className="mr-2 h-4 w-4" /> Exit Lobby
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
