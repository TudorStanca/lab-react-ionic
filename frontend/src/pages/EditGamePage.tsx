import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonLoading,
  IonPage,
  IonTitle,
  IonToolbar,
  IonDatetime,
  IonCheckbox,
  IonItem,
  IonLabel,
} from "@ionic/react";
import { getLogger } from "../utils/AppLogger";
import { useHistory, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Game from "../models/Game";
import { useGames } from "../contexts/GameContext";
import { handleApiError } from "../services/ErrorHandler";

const log = getLogger("EditGamePage");

const EditGamePage = () => {
  const { games, saving, savingError, saveGame } = useGames();
  const history = useHistory();
  const { id } = useParams<{ id?: string }>();

  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [launchDate, setLaunchDate] = useState("");
  const [isCracked, setIsCracked] = useState(false);
  const [game, setGame] = useState<Game | undefined>(undefined);

  const existingGame = games?.find((g) => g.id === id);

  useEffect(() => {
    log("useEffect");

    if (existingGame) {
      setName(existingGame.name);
      setPrice(existingGame.price);
      setLaunchDate(existingGame.launchDate);
      setIsCracked(existingGame.isCracked);
    }

    setGame(existingGame);
  }, [existingGame, id]);

  const handleSave = () => {
    const editedGame = game
      ? ({ ...game, name, price, launchDate, isCracked } as Game)
      : ({ name, price, launchDate, isCracked } as Game);

    if (!saveGame) {
      log("saveGame is not available");

      return;
    }

    saveGame(editedGame)
      .then(() => {
        log("Game saved successfully");
        history.goBack();
      })
      .catch((error) => {
        log("Error saving game:", handleApiError(error) || error.message);
      });
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{game ? "Edit Game" : "Create Game"}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSave}>Save</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonItem>
          <IonLabel position="stacked">Name</IonLabel>
          <IonInput value={name} onIonChange={(e) => setName(e.detail.value ?? "")} />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Price</IonLabel>
          <IonInput type="number" value={String(price)} onIonChange={(e) => setPrice(Number(e.detail.value) || 0)} />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Launch Date</IonLabel>
          <IonDatetime value={launchDate} onIonChange={(e) => setLaunchDate((e.detail.value as string) ?? "")} />
        </IonItem>

        <IonItem>
          <IonLabel>Is Cracked</IonLabel>
          <IonCheckbox checked={isCracked} onIonChange={(e) => setIsCracked(Boolean(e.detail.checked))} />
        </IonItem>
        <IonLoading isOpen={saving} />
        {savingError && <div>{handleApiError(savingError) || "Failed to save game."}</div>}
      </IonContent>
    </IonPage>
  );
};

export default EditGamePage;
