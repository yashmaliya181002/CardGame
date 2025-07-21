
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Loader2, Swords } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { db, doc, onSnapshot } from "@/lib/firebase";

type Player = {
  id: string;
  name: string;
  isHost: boolean;
};

interface GamePageProps {
  tableId: string;
  isHost: boolean;
}

export function GamePage({ tableId }: GamePageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const playerId = typeof window !== 'undefined' ? localStorage.getItem("playerId") : null;

  useEffect(() => {
    if (!playerId) {
      toast({ title: "Error", description: "You are not part of this game.", variant: "destructive" });
      router.push("/");
      return;
    }

    const lobbyDocRef = doc(db, "lobbies", tableId);

    const unsubscribe = onSnapshot(lobbyDocRef, (docSnap) => {
      setIsLoading(false);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPlayers(data.players || []);
        if (data.status !== 'in-progress') {
            toast({ title: "Game Over", description: "The host has ended the game." });
            router.push('/');
        }
      } else {
        toast({ title: "Game not found", description: "This game session does not exist.", variant: "destructive" });
        router.push('/');
      }
    }, (error) => {
      console.error("Snapshot error: ", error);
      toast({ title: "Connection error", description: "Lost connection to the game.", variant: "destructive" });
      router.push('/');
    });

    return () => unsubscribe();
  }, [tableId, playerId, router, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-yellow-100 p-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Loading game...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-yellow-100 p-4 font-headline">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2">
                 <Swords className="w-8 h-8 text-primary"/>
                <CardTitle className="text-3xl">Kaali Teeri</CardTitle>
            </div>
          <CardDescription>Game in progress...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* This is where the main game board will go */}
          <div className="flex justify-center items-center h-64 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">Game Board Placeholder</p>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-center text-lg">Players</h3>
            <div className="flex justify-center gap-4">
              {players.map((p) => (
                <div key={p.id} className="flex flex-col items-center gap-2">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={`https://placehold.co/64x64.png`} data-ai-hint="avatar" />
                    <AvatarFallback>{p.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{p.name} {p.id === playerId && "(You)"}</span>
                    {p.isHost && <Crown className="w-4 h-4 text-amber-400" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
