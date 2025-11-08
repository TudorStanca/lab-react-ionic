import { IonItem, IonLabel, IonBadge } from "@ionic/react";
import Game from "../models/Game";
import { memo, useEffect, useState } from "react";
import { useFilesystem } from "../hooks/useFilesystem";
import { usePreferences } from "../hooks/usePreferences";
import { getGamePhoto } from "../services/GameApi";

interface GameItemProps {
  game: Game & { __pending?: boolean };
  onEdit: (id?: string) => void;
}

const GameItem = ({ game, onEdit }: GameItemProps) => {
  const [localPhoto, setLocalPhoto] = useState<string | undefined>(undefined);
  const { readFile, writeFile } = useFilesystem();
  const { get, set } = usePreferences();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!game || !game._id) return;
      try {
        const key = `localPhotoPath:${game._id}`;
        const path = await get(key);
        if (path) {
          try {
            const data = await readFile(path);
            if (!cancelled) setLocalPhoto(`data:image/jpeg;base64,${data}`);
            return;
          } catch {
            // if read fails, fall back to game.photo and attempt to recreate local copy
          }
        }

        if (game.photo) {
          // if server returned an HTTP URL (server-stored image), fetch it from the API
          if (
            typeof game.photo === "string" &&
            (game.photo.startsWith("http://") ||
              game.photo.startsWith("https://") ||
              game.photo.includes("/images/") ||
              game.photo.includes("/api/games/"))
          ) {
            // fetch the image from the backend API with authentication
            try {
              const dataUrl = await getGamePhoto(game._id!);
              if (dataUrl && !cancelled) {
                setLocalPhoto(dataUrl);
                // optionally cache it locally
                try {
                  const b64 = dataUrl.split(",")[1];
                  const filepath = `photo-${game._id}-${Date.now()}.jpeg`;
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

          try {
            const maybeB64 = game.photo.includes(",") ? game.photo.split(",")[1] : game.photo;
            const filepath = `photo-${game._id}-${Date.now()}.jpeg`;
            await writeFile(filepath, maybeB64);
            await set(key, filepath);
            if (!cancelled) setLocalPhoto(`data:image/jpeg;base64,${maybeB64}`);
            return;
          } catch {
            // ignore write failures and fall back to game.photo
          }
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [game, get, readFile, set, writeFile]);

  return (
    <IonItem onClick={() => onEdit(game._id)}>
      {(localPhoto || game.photo) && (
        <img
          src={localPhoto || game.photo}
          alt={game.name}
          style={{ width: 64, height: 64, objectFit: "cover", marginRight: 12, borderRadius: 6 }}
        />
      )}
      <IonLabel>
        <h2>
          {game.name} {game.__pending && <IonBadge color="medium">offline</IonBadge>}
        </h2>
        <p>Price: ${game.price.toFixed(2)}</p>
        <p>Launch Date: {new Date(game.launchDate).toLocaleDateString()}</p>
        <p>Status: {game.isCracked ? "Cracked" : "Not Cracked"}</p>
      </IonLabel>
    </IonItem>
  );
};

export default memo(GameItem);
