
"use client";

import { GamePage } from "@/components/game-page";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Game() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tableId = params.tableId as string;
  const isHost = searchParams.get("host") === "true";

  return <GamePage tableId={tableId} isHost={isHost} />;
}

export default function GamePageContainer() {
    return (
        <Suspense fallback={<div>Loading Game...</div>}>
            <Game />
        </Suspense>
    )
}
