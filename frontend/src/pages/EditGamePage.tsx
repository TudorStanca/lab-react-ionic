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
import { usePhotos } from "../hooks/usePhotos";
import { useFilesystem } from "../hooks/useFilesystem";
import { usePreferences } from "../hooks/usePreferences";
import { getGamePhoto } from "../services/GameApi";

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
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [photoError, setPhotoError] = useState<string | undefined>(undefined);
  const { takePhoto } = usePhotos();
  const { writeFile, readFile, deleteFile } = useFilesystem();
  const { get, set } = usePreferences();

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
        setPhoto(existingGame?.photo);

        (async () => {
          try {
            if (existingGame && existingGame._id) {
              const key = `localPhotoPath:${existingGame._id}`;
              const storedPath = await get(key);
              if (storedPath) {
                try {
                  const data = await readFile(storedPath);
                  setPhoto(`data:image/jpeg;base64,${data}`);
                  return;
                } catch {
                  // failed to read local file; we'll try to recreate from server photo
                }
              }

              if (existingGame.photo) {
                // if server returned an HTTP URL (server-stored image), fetch it from the API
                if (
                  typeof existingGame.photo === "string" &&
                  (existingGame.photo.startsWith("http://") ||
                    existingGame.photo.startsWith("https://") ||
                    existingGame.photo.includes("/images/") ||
                    existingGame.photo.includes("/api/games/"))
                ) {
                  // fetch the image from the backend API with authentication
                  try {
                    const dataUrl = await getGamePhoto(existingGame._id);
                    if (dataUrl) {
                      setPhoto(dataUrl);
                      // optionally cache it locally
                      try {
                        const b64 = dataUrl.split(",")[1];
                        const filepath = `photo-${existingGame._id}-${Date.now()}.jpeg`;
                        await writeFile(filepath, b64);
                        await set(key, filepath);
                      } catch {
                        // ignore cache write failures
                      }
                    }
                  } catch {
                    // if fetch fails, ignore
                  }
                  return;
                }

                // only create a local file if the stored photo is a data URL/base64
                if (typeof existingGame.photo === "string" && existingGame.photo.startsWith("data:")) {
                  const maybeB64 = existingGame.photo.includes(",")
                    ? existingGame.photo.split(",")[1]
                    : existingGame.photo;
                  const filepath = `photo-${existingGame._id}-${Date.now()}.jpeg`;
                  try {
                    await writeFile(filepath, maybeB64);
                    await set(key, filepath);
                  } catch {
                    // ignore write failures
                  }
                }
              }
            }
          } catch {
            // ignore
          }
        })();
      }
    }

    setGame(existingGame);
  }, [games, id, isDirty, get, readFile, set, writeFile]);

  const handleSave = () => {
    const editedGame = game
      ? ({ ...game, name, price, launchDate, isCracked } as Game)
      : ({ name, price, launchDate, isCracked } as Game);

    if (photo) {
      editedGame.photo = photo;
    }

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
        {game && (
          <div style={{ padding: 12 }}>
            {photo && (
              <div style={{ marginBottom: 12 }}>
                <img src={photo} alt="game" style={{ maxWidth: "100%", borderRadius: 8 }} />
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <IonButton
                onClick={async () => {
                  setPhotoError(undefined);
                  try {
                    const newPhoto = await takePhoto();
                    setPhoto(newPhoto.webviewPath);
                    setIsDirty(true);
                    try {
                      if (game && game._id) {
                        const key = `localPhotoPath:${game._id}`;
                        try {
                          const prev = await get(key);
                          if (prev) {
                            await deleteFile(prev);
                          }
                        } catch {
                          // ignore delete errors
                        }
                        await set(key, newPhoto.filepath);
                      }
                    } catch {
                      // ignore preference write failures
                    }
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : String(err ?? "Failed to take photo");
                    setPhotoError(msg);
                    console.error("takePhoto failed", err);
                  }
                }}
              >
                Take Photo
              </IonButton>
              {photoError && <div style={{ color: "#c00", marginTop: 8 }}>{photoError}</div>}
            </div>
          </div>
        )}
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
