
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
    type: 'lobby-update' | 'start-game' | 'join-request' | 'game-state-update' | 'player-action';
    payload: any;
}

export const usePeer = (
    playerId: string | null,
    nickname: string | null,
    tableId: string | undefined,
    isHost: boolean
) => {
    const router = useRouter();
    const { toast } = useToast();
    const [peer, setPeer] = useState<Peer | null>(null);
    const [peerId, setPeerId] = useState<string>('');
    const [players, setPlayers] = useState<Player[]>([]);
    const [connections, setConnections] = useState<DataConnection[]>([]);
    const [message, setMessage] = useState<Message | null>(null);
    const peerInstance = useRef<Peer | null>(null);

    const broadcast = useCallback((data: Message) => {
        connections.forEach(conn => conn.send(data));
    }, [connections]);

    useEffect(() => {
        if (!playerId || !nickname) {
            toast({ title: "Missing Identity", description: "Player ID or nickname not found. Redirecting to home.", variant: "destructive" });
            router.push('/');
            return;
        }

        import('peerjs').then(({ default: Peer }) => {
            if (peerInstance.current) return;

            const newPeer = new Peer();
            peerInstance.current = newPeer;
            setPeer(newPeer);

            newPeer.on('open', (id) => {
                console.log('PeerJS connection open. My ID is:', id);
                setPeerId(id);

                if (isHost) {
                    setPlayers([{ id: playerId, name: nickname, isHost: true }]);
                } else if (tableId) {
                    const conn = newPeer.connect(tableId, { reliable: true });
                    conn.on('open', () => {
                        console.log(`Connection to host ${tableId} opened.`);
                        setConnections(prev => [...prev, conn]);
                        conn.send({ type: 'join-request', payload: { id: playerId, name: nickname, isHost: false } });
                    });
                }
            });

            newPeer.on('connection', (conn) => {
                console.log(`Incoming connection from ${conn.peer}`);
                setConnections(prev => [...prev, conn]);

                conn.on('data', (data: any) => {
                    const receivedMessage = data as Message;
                    console.log('Host received data:', receivedMessage);
                    
                    if (receivedMessage.type === 'join-request' && isHost) {
                        const newPlayer = receivedMessage.payload as Player;
                        const updatedPlayers = [...players, newPlayer];
                        setPlayers(updatedPlayers);
                        
                        const numPlayers = localStorage.getItem('numPlayers') || '4';
                        broadcast({
                            type: 'lobby-update',
                            payload: { players: updatedPlayers, numPlayers: numPlayers }
                        });
                    }
                });
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
        }
    }, [isHost, tableId, playerId, nickname, router, toast, players, broadcast]);

    // Effect for handling data from connections for ALL peers
    useEffect(() => {
        if (!connections.length) return;

        const handleData = (data: any) => {
            const receivedMessage = data as Message;
            console.log('Client received data:', receivedMessage);
            setMessage(receivedMessage);
        };

        connections.forEach(conn => {
            conn.on('data', handleData);
        });

        return () => {
            connections.forEach(conn => {
                conn.off('data', handleData);
            });
        }
    }, [connections]);

    return { peer, peerId, players, setPlayers, broadcast, message };
};
