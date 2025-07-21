"use client";

import { LobbyPage } from "@/components/lobby-page";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Lobby() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tableId = params.tableId as string;
  const isHost = searchParams.get("host") === "true";

  return <LobbyPage tableId={tableId} isHost={isHost} />;
}

export default function LobbyPageContainer() {
    return (
        <Suspense fallback={<div>Loading Lobby...</div>}>
            <Lobby />
        </Suspense>
    )
}
