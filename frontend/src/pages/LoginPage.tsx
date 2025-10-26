import { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getLogger } from "../utils/AppLogger";
import { useHistory } from "react-router";
import { IonButton, IonContent, IonHeader, IonInput, IonLoading, IonPage, IonTitle, IonToolbar } from "@ionic/react";

const log = getLogger("LoginPage");

const LoginPage = () => {
  const { isAuthenticated, login, authenticationError, isAuthenticating } = useAuth();

  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const history = useHistory();

  const handleLogin = () => {
    log("handleLogin");
    login(username, password);
  };

  useEffect(() => {
    if (isAuthenticated) {
      log("User is authenticated, redirecting to home page.");
      history.replace("/games");
    }
  }, [isAuthenticated]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Login</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonInput placeholder="Username" value={username} onIonChange={(e) => setUsername(e.detail.value ?? "")} />
        <IonInput
          placeholder="Password"
          type="password"
          value={password}
          onIonChange={(e) => setPassword(e.detail.value ?? "")}
        />
        <IonLoading isOpen={isAuthenticating} />
        {authenticationError && <div>{authenticationError.message || "Failed to authenticate"}</div>}
        <IonButton onClick={handleLogin} disabled={isAuthenticating || !username || !password}>
          Login
        </IonButton>
      </IonContent>
    </IonPage>
  );
};

export default LoginPage;
