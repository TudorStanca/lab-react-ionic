import {
  IonButton,
  IonContent,
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
} from "@ionic/react";
import { add } from "ionicons/icons";
import { useHistory } from "react-router-dom";
import GameItem from "../components/GameItem";
import { useGames } from "../contexts/GameContext";
import { handleApiError } from "../services/ErrorHandler";
import { useAuth } from "../contexts/AuthContext";

const GamesPage = () => {
  const { games, fetching, fetchingError, loadMore } = useGames();
  const { logout, username } = useAuth();
  const history = useHistory();

  const handleLogout = () => {
    logout();
    history.replace("/login");
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
      </IonHeader>
      <IonContent>
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
