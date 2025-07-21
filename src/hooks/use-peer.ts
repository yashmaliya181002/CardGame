
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Peer, DataConnection } from 'peerjs';
import { useRouter } from 'next/navigation';
import { useToast } from './use-toast';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

export type Message = {
    type: 'lobby-update' | 'start-game' | 'join-request';
    payload: any;
}

// A Map to store connections to other peers
const connections = new Map<string, DataConnection>();

export const usePeer = (
    playerId: string | null,
    nickname: string | null,
    hostId: string | undefined // The ID of the host to connect to
) => {
    const router = useRouter();
    const { toast } = useToast();
    const [peer, setPeer] = useState<Peer | null>(null);
    const [peerId, setPeerId] = useState<string>('');
    const [players, setPlayers] = useState<Player[]>([]);
    const [message, setMessage] = useState<Message | null>(null);
    const peerInstance = useRef<Peer | null>(null);

    const isHost = !hostId;

    const broadcast = useCallback((data: Message) => {
        for (const conn of connections.values()) {
            conn.send(data);
        }
    }, []);

    const handleNewData = useCallback((data: any) => {
        const receivedMessage = data as Message;
        console.log('Received data:', receivedMessage);

        if (isHost && receivedMessage.type === 'join-request') {
            const newPlayer = receivedMessage.payload.player as Player;
            const conn = peerInstance.current?.connect(receivedMessage.payload.peerId);
            
            conn?.on('open', () => {
                connections.set(receivedMessage.payload.peerId, conn);
                const updatedPlayers = [...players, newPlayer];
                setPlayers(updatedPlayers);
                
                broadcast({
                    type: 'lobby-update',
                    payload: { players: updatedPlayers, numPlayers: '4' } // Default to 4 players for now
                });
            });

        } else {
             setMessage(receivedMessage);
        }

    }, [isHost, players, setPlayers, broadcast]);


    useEffect(() => {
        if (!playerId || !nickname) {
            router.push('/');
            return;
        }
        
        // Ensure this effect runs only once.
        if (peerInstance.current) return;

        import('peerjs').then(({ default: Peer }) => {
            const newPeer = new Peer();
            peerInstance.current = newPeer;
            setPeer(newPeer);

            newPeer.on('open', (id) => {
                console.log('My peer ID is: ' + id);
                setPeerId(id);

                if (isHost) {
                     setPlayers([{ id: playerId, name: nickname, isHost: true }]);
                } else if (hostId) {
                    const conn = newPeer.connect(hostId, { reliable: true });
                    conn.on('open', () => {
                        connections.set(hostId, conn);
                        // Send a join request with the client's own peer ID
                        conn.send({ 
                            type: 'join-request', 
                            payload: { 
                                peerId: id, // The new player's peer ID
                                player: { id: playerId, name: nickname, isHost: false } 
                            } 
                        });
                    });
                     conn.on('data', handleNewData);
                }
            });

            newPeer.on('connection', (conn) => {
                console.log('Received new connection from ' + conn.peer);
                // For host, handle join requests
                if (isHost) {
                    conn.on('data', handleNewData);
                }
            });

            newPeer.on('error', (err) => {
                console.error("PeerJS error:", err);
                toast({ title: "Connection Error", description: `Could not connect: ${err.message}`, variant: "destructive" });
                router.push('/');
            });
        });

        return () => {
            peerInstance.current?.destroy();
            peerInstance.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array ensures this runs only once

    return { peer, peerId, players, setPlayers, broadcast, message };
};
