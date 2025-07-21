
"use client"
import { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { useRouter } from 'next/navigation';

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

export const usePeer = (playerId: string | null, nickname: string | null, isHost: boolean, tableId?: string) => {
  const router = useRouter();
  const [peer, setPeer] = useState<Peer | null>(null);
  const [peerId, setPeerId] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const peerInstance = useRef<Peer | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        import('peerjs').then(({ default: Peer }) => {
            const newPeer = isHost 
                ? new Peer() 
                : new Peer();

            peerInstance.current = newPeer;
            setPeer(newPeer);

            newPeer.on('open', (id) => {
                console.log('My peer ID is: ' + id);
                setPeerId(id);
                if (isHost) {
                    setPlayers([{ id: playerId!, name: nickname!, isHost: true }]);
                } else if (tableId) {
                    const conn = newPeer.connect(tableId);
                    conn.on('open', () => {
                        console.log(`Connected to host: ${tableId}`);
                        setConnections([conn]);
                        setIsConnected(true);
                    });
                }
            });

            newPeer.on('connection', (conn) => {
                console.log(`Incoming connection from ${conn.peer}`);
                setConnections(prev => [...prev, conn]);
            });

            return () => {
                newPeer.destroy();
            };
        });
    }
  }, [isHost, tableId, playerId, nickname]);

  const broadcast = useCallback((data: any) => {
    connections.forEach(conn => conn.send(data));
  }, [connections]);

  useEffect(() => {
    if (!peer) return;

    const handleData = (data: any, conn: DataConnection) => {
      console.log('Received data:', data);
      if (data.type === 'lobby-update') {
        setPlayers(data.payload.players);
      }
      if (data.type === 'start-game') {
        router.push(`/game/${data.payload.tableId}?players=${data.payload.numPlayers}`);
      }
      if (data.type === 'num-players-update') {
        // Logic for non-host clients to update player count if needed
      }
    };
    
    connections.forEach(conn => {
        conn.on('data', (data) => handleData(data, conn));
    });

    return () => {
        connections.forEach(conn => {
            conn.off('data', handleData);
        });
    }
  }, [peer, connections, router]);

  return { peer, peerId, players, setPlayers, isConnected, connections, broadcast };
};
