import React, { useState, useRef } from "react";
import {
  IonButton,
  IonContent,
  IonSearchbar,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonList,
  IonLoading,
  IonPage,
  IonTitle,
  IonToolbar,
  IonLabel,
  IonSegment,
  IonSegmentButton,
} from "@ionic/react";
import { add } from "ionicons/icons";
import { useHistory } from "react-router-dom";
import GameItem from "../components/GameItem";
import { useGames } from "../contexts/GameContext";
import { handleApiError } from "../services/ErrorHandler";
import { useAuth } from "../contexts/AuthContext";
import { useNetwork } from "../hooks/useNetwork";

const GamesPage = () => {
  const { games, fetching, fetchingError, loadMore } = useGames();
  const { search } = useGames();
  const { logout, username } = useAuth();
  const history = useHistory();

  const { networkStatus } = useNetwork();

  const handleLogout = () => {
    logout();
    history.replace("/login");
  };

  const [q, setQ] = useState<string | undefined>(undefined);
  const [isCrackedState, setIsCrackedState] = useState<boolean | undefined>(undefined);

  const onSearchInput = (val: string) => {
    const next = val && val.length > 0 ? val : undefined;
    setQ(next);

    if (search) {
      search(next, isCrackedState);
    }
  };

  const onSegmentChange = (value: string) => {
    let next: boolean | undefined = undefined;
    if (value === "true") {
      next = true;
    }
    if (value === "false") {
      next = false;
    }

    setIsCrackedState(next);

    if (search) {
      search(q, next);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{username} Game App</IonTitle>
          <IonButton size="small" fill="clear" onClick={handleLogout}>
            Logout
          </IonButton>
        </IonToolbar>
        <IonLabel>
          <p>Network status: {networkStatus.connected ? "Online" : "Offline"}</p>
        </IonLabel>
      </IonHeader>
      <IonContent>
        <div style={{ padding: "0 12px" }}>
          <IonSearchbar
            value={q}
            placeholder="Search by name"
            debounce={500}
            onIonInput={(e) => onSearchInput((e as unknown as CustomEvent).detail?.value)}
          />

          <IonSegment
            value={typeof isCrackedState === "undefined" ? "all" : String(isCrackedState)}
            onIonChange={(e) => onSegmentChange((e as unknown as CustomEvent).detail?.value)}
          >
            <IonSegmentButton value="all">
              <IonLabel>All</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="true">
              <IonLabel>Cracked</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="false">
              <IonLabel>Not cracked</IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </div>
        <IonLoading isOpen={fetching} message="Fetching games" />
        {games && (
          <IonList>
            {games.map((game) => (
              <GameItem key={game._id} game={game} onEdit={(id) => history.push(`/game/${id}`)} />
            ))}
          </IonList>
        )}

        <IonInfiniteScroll
          threshold="100px"
          onIonInfinite={async (ev) => {
            if (loadMore) {
              await loadMore();
            }
            (ev.target as HTMLIonInfiniteScrollElement).complete();
          }}
        >
          <IonInfiniteScrollContent loadingText="Loading more games..." />
        </IonInfiniteScroll>
        {fetchingError && <div>{handleApiError(fetchingError) || "Failed to fetch games"}</div>}
        <IonFab vertical="bottom" horizontal="end" slot="fixed">
          <IonFabButton onClick={() => history.push("/game")}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>
      </IonContent>
    </IonPage>
  );
};

export default GamesPage;
