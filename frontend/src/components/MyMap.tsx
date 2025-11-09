import { GoogleMap } from "@capacitor/google-maps";
import { useEffect, useRef } from "react";
import mapsApiKey from "../mapsApiKey";

interface MyMapProps {
  lat: number;
  lng: number;
  onMapClick: (lat: number, lng: number) => void;
}

const MyMap: React.FC<MyMapProps> = ({ lat, lng, onMapClick }) => {
  const mapRef = useRef<HTMLElement>(null);
  useEffect(myMapEffect, [mapRef.current, lat, lng]);

  return (
    <div className="component-wrapper">
      <capacitor-google-map
        ref={mapRef}
        style={{
          display: "block",
          width: 300,
          height: 400,
        }}
      ></capacitor-google-map>
    </div>
  );

  function myMapEffect() {
    let canceled = false;
    let googleMap: GoogleMap | null = null;
    createMap();
    return () => {
      canceled = true;
      googleMap?.removeAllMapListeners();
    };

    async function createMap() {
      if (!mapRef.current || canceled) {
        return;
      }
      googleMap = await GoogleMap.create({
        id: "my-cool-map",
        element: mapRef.current,
        apiKey: mapsApiKey,
        config: {
          center: { lat, lng },
          zoom: 8,
        },
      });
      console.log("gm created");
      if (canceled) return;
      const marker = await googleMap.addMarker({ coordinate: { lat, lng }, title: "My Game location" });
      if (canceled) return;
      await googleMap.setOnMapClickListener(({ latitude, longitude }) => {
        onMapClick(latitude, longitude);
      });
    }
  }
};

export default MyMap;

