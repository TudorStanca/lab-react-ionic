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
import { useNetwork } from "../hooks/useNetwork";

const log = getLogger("EditGamePage");

const EditGamePage = () => {
  const { games, saving, savingError, saveGame } = useGames();
  const history = useHistory();
  const { id } = useParams<{ id?: string }>();
  const { networkStatus } = useNetwork();

  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [launchDate, setLaunchDate] = useState("");
  const [isCracked, setIsCracked] = useState(false);
  const [game, setGame] = useState<Game | undefined>(undefined);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  useEffect(() => {
    log("useEffect");
    const existingGame = games?.find((g) => g._id === id);

    if (!isDirty) {
      if (existingGame) {
        setName(existingGame.name);
        setPrice(existingGame.price);
        setLaunchDate(existingGame.launchDate);
        setIsCracked(existingGame.isCracked);
        setIsDirty(false);
      }
    }

    setGame(existingGame);
  }, [games, id, isDirty]);

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

        if (networkStatus && networkStatus.connected === false) {
          history.replace("/games");
          return;
        }
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
          <IonInput
            value={name}
            onIonChange={(e) => {
              setName(e.detail.value ?? "");
              setIsDirty(true);
            }}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Price</IonLabel>
          <IonInput
            type="number"
            value={String(price)}
            onIonChange={(e) => {
              setPrice(Number(e.detail.value) || 0);
              setIsDirty(true);
            }}
          />
        </IonItem>

        <IonItem>
          <IonLabel position="stacked">Launch Date</IonLabel>
          <IonDatetime
            value={launchDate}
            onIonChange={(e) => {
              setLaunchDate((e.detail.value as string) ?? "");
              setIsDirty(true);
            }}
          />
        </IonItem>

        <IonItem>
          <IonLabel>Is Cracked</IonLabel>
          <IonCheckbox
            checked={isCracked}
            onIonChange={(e) => {
              setIsCracked(Boolean(e.detail.checked));
              setIsDirty(true);
            }}
          />
        </IonItem>
        <IonLoading isOpen={saving} />
        {savingError && <div>{handleApiError(savingError) || "Failed to save game."}</div>}
      </IonContent>
    </IonPage>
  );
};

export default EditGamePage;
