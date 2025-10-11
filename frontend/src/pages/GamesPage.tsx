import {
  IonContent,
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

const GamesPage = () => {
  const { games, fetching, fetchingError } = useGames();
  const history = useHistory();

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>My Game App</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonLoading isOpen={fetching} message="Fetching games" />
        {games && (
          <IonList>
            {games.map((game) => (
              <GameItem key={game.id} game={game} onEdit={(id) => history.push(`/game/${id}`)} />
            ))}
          </IonList>
        )}
        {fetchingError && <div>{fetchingError.message || "Failed to fetch games"}</div>}
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
