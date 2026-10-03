import React, {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useImperativeHandle,
} from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  MapContainer,
  Marker as LeafletMarker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export function Marker() {
  return null;
}

export function Callout() {
  return null;
}

function zoomForRegion(region) {
  const delta = Math.max(region?.latitudeDelta || 0.07, 0.001);
  return Math.max(5, Math.min(18, Math.round(Math.log2(360 / delta) - 1)));
}

function regionFromMap(map) {
  const center = map.getCenter();
  const bounds = map.getBounds();

  return {
    latitude: center.lat,
    longitude: center.lng,
    latitudeDelta: Math.abs(bounds.getNorth() - bounds.getSouth()),
    longitudeDelta: Math.abs(bounds.getEast() - bounds.getWest()),
  };
}

function MapController({ region, onRegionChangeComplete, forwardedRef }) {
  const map = useMap();

  useImperativeHandle(
    forwardedRef,
    () => ({
      animateToRegion(nextRegion, duration = 500) {
        map.flyTo(
          [nextRegion.latitude, nextRegion.longitude],
          zoomForRegion(nextRegion),
          { duration: Math.max(duration / 1000, 0.1) }
        );
      },
    }),
    [map]
  );

  useEffect(() => {
    if (!region) return;

    const center = map.getCenter();
    const moved =
      Math.abs(center.lat - region.latitude) > 0.0005 ||
      Math.abs(center.lng - region.longitude) > 0.0005;

    if (moved) {
      map.setView(
        [region.latitude, region.longitude],
        zoomForRegion(region),
        { animate: true }
      );
    }
  }, [map, region]);

  useMapEvents({
    moveend() {
      onRegionChangeComplete?.(regionFromMap(map));
    },
  });

  return null;
}

function findMarkerParts(markerElement) {
  const parts = Children.toArray(markerElement.props.children).filter(isValidElement);

  return {
    callout: parts.find((child) => child.type === Callout),
    visual: parts.find((child) => child.type !== Callout),
  };
}

function markerIcon(visual, isDraggable) {
  const style = StyleSheet.flatten(visual?.props?.style) || {};
  const transform = Array.isArray(style.transform) ? style.transform : [];
  const scale = transform.find((item) => item?.scale)?.scale || 1;
  const color = style.backgroundColor || (isDraggable ? "#111827" : "#2563EB");
  const opacity = style.opacity ?? 1;
  const size = isDraggable ? 28 : 22;

  return L.divIcon({
    className: "urbania-map-marker",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.28);opacity:${opacity};transform:scale(${scale})"><span style="display:block;width:6px;height:6px;border-radius:50%;background:white;margin:${(size - 12) / 2}px"></span></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const MapView = forwardRef(function MapView(
  {
    children,
    initialRegion,
    region,
    onRegionChangeComplete,
    style,
  },
  ref
) {
  const activeRegion = region || initialRegion || {
    latitude: 45.4642,
    longitude: 9.19,
    latitudeDelta: 0.07,
    longitudeDelta: 0.07,
  };

  const markers = Children.toArray(children).filter(
    (child) => isValidElement(child) && child.type === Marker
  );

  return (
    <View style={[style, styles.host]}>
      <MapContainer
        center={[activeRegion.latitude, activeRegion.longitude]}
        zoom={zoomForRegion(activeRegion)}
        scrollWheelZoom
        style={styles.map}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapController
          region={region}
          onRegionChangeComplete={onRegionChangeComplete}
          forwardedRef={ref}
        />

        {markers.map((markerElement, index) => {
          const { coordinate, draggable, onDragEnd, onPress } = markerElement.props;
          if (!coordinate) return null;

          const { callout, visual } = findMarkerParts(markerElement);
          const eventHandlers = {
            click: () => onPress?.(),
            dragend: (event) => {
              const point = event.target.getLatLng();
              onDragEnd?.({
                nativeEvent: {
                  coordinate: { latitude: point.lat, longitude: point.lng },
                },
              });
            },
          };

          return (
            <LeafletMarker
              key={markerElement.key || index}
              position={[coordinate.latitude, coordinate.longitude]}
              draggable={Boolean(draggable)}
              eventHandlers={eventHandlers}
              icon={markerIcon(visual, Boolean(draggable))}
            >
              {callout && (
                <Popup closeButton={false} maxWidth={280} minWidth={245}>
                  <Pressable onPress={callout.props.onPress}>
                    {callout.props.children}
                  </Pressable>
                </Popup>
              )}
            </LeafletMarker>
          );
        })}
      </MapContainer>
    </View>
  );
});

const styles = StyleSheet.create({
  host: {
    overflow: "hidden",
  },
  map: {
    width: "100%",
    height: "100%",
  },
});

export default MapView;
