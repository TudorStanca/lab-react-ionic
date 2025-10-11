import { IonItem, IonLabel } from "@ionic/react";
import Game from "../models/Game";
import { memo } from "react";

interface GameItemProps {
  game: Game;
  onEdit: (id?: string) => void;
}

const GameItem = ({ game, onEdit }: GameItemProps) => {
  return (
    <IonItem onClick={() => onEdit(game.id)}>
      <IonLabel>
        <h2>{game.name}</h2>
        <p>Price: ${game.price.toFixed(2)}</p>
        <p>Launch Date: {new Date(game.launchDate).toLocaleDateString()}</p>
        <p>Status: {game.isCracked ? "Cracked" : "Not Cracked"}</p>
      </IonLabel>
    </IonItem>
  );
};

export default memo(GameItem);
