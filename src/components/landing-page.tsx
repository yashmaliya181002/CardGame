
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "./ui/label";
import { Hand, Users, Swords, Trophy } from "lucide-react";
import { db, doc, setDoc } from "@/lib/firebase";

export function LandingPage() {
  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // On component mount, check if a nickname is already in local storage
    const storedNickname = localStorage.getItem("nickname");
    if (storedNickname) {
      setNickname(storedNickname);
    }
  }, []);

  const saveIdentity = () => {
    localStorage.setItem("nickname", nickname);
    // Create a simple unique ID for the player session
    if (!localStorage.getItem("playerId")) {
        localStorage.setItem("playerId", `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    }
  }

  const handleCreateGame = async () => {
    if (nickname.trim().length < 2) {
      toast({
        title: "Invalid Name",
        description: "Please enter a name with at least 2 characters.",
        variant: "destructive",
      });
      return;
    }
    const tableCode = Math.floor(1000 + Math.random() * 9000).toString();
    saveIdentity();
    
    const playerId = localStorage.getItem("playerId")!;
    const player = { id: playerId, name: nickname, isHost: true };
    
    try {
        const lobbyDocRef = doc(db, "lobbies", tableCode);
        await setDoc(lobbyDocRef, {
            players: [player],
            numPlayers: 4,
            hostId: playerId,
            createdAt: new Date(),
            status: 'waiting'
        });
        router.push(`/lobby/${tableCode}?host=true`);
    } catch (error) {
        console.error("Error creating lobby:", error);
        toast({
            title: "Error Creating Table",
            description: "Could not create a new game table. Please check your connection and try again.",
            variant: "destructive",
        });
    }
  };

  const handleJoinGame = () => {
    if (nickname.trim().length < 2) {
      toast({
        title: "Invalid Name",
        description: "Please enter a name with at least 2 characters.",
        variant: "destructive",
      });
      return;
    }
    if (!/^\d{4}$/.test(joinCode)) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid 4-digit table code.",
        variant: "destructive",
      });
      return;
    }
    saveIdentity();
    router.push(`/lobby/${joinCode}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-yellow-100 p-4 font-headline">
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-primary-foreground bg-primary py-2 px-4 rounded-lg shadow-lg inline-block animate-pulse">
        ♠️ Kaali Teeri
        </h1>
        <p className="text-xl mt-2 text-muted-foreground font-semibold">Real Card Battles</p>
      </div>

      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Welcome Player!</CardTitle>
          <CardDescription className="text-center">Enter your name to start</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            placeholder="Enter your name"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="text-center text-lg h-12"
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button onClick={handleCreateGame} className="w-full h-12 text-lg transition-transform transform hover:scale-105" size="lg">
            Create Table
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full h-12 text-lg transition-transform transform hover:scale-105" size="lg">
                Join Table
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Game</DialogTitle>
                <DialogDescription>Enter the 4-digit code from your host.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Label htmlFor="join-code" className="sr-only">Table Code</Label>
                <Input
                  id="join-code"
                  placeholder="4-Digit Code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  maxLength={4}
                  className="text-center text-lg h-12"
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button onClick={handleJoinGame}>Join Game</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>

      <Accordion type="single" collapsible className="w-full max-w-md mt-8">
        <AccordionItem value="item-1">
          <AccordionTrigger className="text-lg font-semibold">Game Rules Teaser</AccordionTrigger>
          <AccordionContent className="text-base space-y-2">
            <p className="flex items-center gap-2"><Users className="w-5 h-5 text-primary"/> <strong>Players:</strong> 4 to 8 players.</p>
            <p className="flex items-center gap-2"><Hand className="w-5 h-5 text-primary"/> <strong>Objective:</strong> Win tricks and score points based on your bid.</p>
            <p className="flex items-center gap-2"><Swords className="w-5 h-5 text-primary"/> <strong>Gameplay:</strong> Bid, choose a partner and a trump suit, and play your cards strategically.</p>
            <p className="flex items-center gap-2"><Trophy className="w-5 h-5 text-primary"/> <strong>Winning:</strong> The team that fulfills its contract wins the round!</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
