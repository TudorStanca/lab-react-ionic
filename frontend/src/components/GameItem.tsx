import { IonItem, IonLabel, IonBadge } from "@ionic/react";
import Game from "../models/Game";
import { memo } from "react";

interface GameItemProps {
  game: Game & { __pending?: boolean };
  onEdit: (id?: string) => void;
}

const GameItem = ({ game, onEdit }: GameItemProps) => {
  return (
    <IonItem onClick={() => onEdit(game._id)}>
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
