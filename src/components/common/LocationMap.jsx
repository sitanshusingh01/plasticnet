import { useEffect } from 'react'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Leaflet's default marker points at image paths that don't survive a
// bundler, without this the pin renders as a broken image icon.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

// This map runs on Leaflet and OpenStreetMap tiles rather than Google Maps.
// Same behaviour the reporting flow needs, tap or drag to set the pin, no
// API key required. Swap the TileLayer and Marker below for
// @react-google-maps/api if a billing enabled Google Maps key is added
// later, everything else in this file stays the same shape.
function ClickToPlace({ onMove }) {
  useMapEvents({
    click(event) {
      onMove(event.latlng.lat, event.latlng.lng)
    }
  })
  return null
}

function Recenter({ latitude, longitude }) {
  const map = useMap()
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude])
  return null
}

export default function LocationMap({ latitude, longitude, onMove, height = 260, interactive = true }) {
  return (
    <div className="overflow-hidden rounded-md border border-border dark:border-night-border" style={{ height }}>
      <MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[latitude, longitude]}
          draggable={interactive}
          eventHandlers={
            interactive
              ? {
                  dragend: (event) => {
                    const position = event.target.getLatLng()
                    onMove(position.lat, position.lng)
                  }
                }
              : {}
          }
        />
        {interactive && <ClickToPlace onMove={onMove} />}
        <Recenter latitude={latitude} longitude={longitude} />
      </MapContainer>
    </div>
  )
}
