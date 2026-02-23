<script setup lang="ts">
import type { Map as LeafletMap } from 'leaflet'

const props = defineProps<{
  polyline: string
}>()

const mapRef = ref<HTMLDivElement | null>(null)
let map: LeafletMap | null = null

// Inline Google encoded polyline decoder (no extra dep)
function decodePolyline(encoded: string): [number, number][] {
  const result: [number, number][] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encoded.length) {
    let shift = 0
    let result_ = 0
    let b: number
    do {
      b = encoded.charCodeAt(index++) - 63
      result_ |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dLat = result_ & 1 ? ~(result_ >> 1) : result_ >> 1
    lat += dLat

    shift = 0
    result_ = 0
    do {
      b = encoded.charCodeAt(index++) - 63
      result_ |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)
    const dLng = result_ & 1 ? ~(result_ >> 1) : result_ >> 1
    lng += dLng

    result.push([lat / 1e5, lng / 1e5])
  }
  return result
}

onMounted(async () => {
  if (!mapRef.value || !props.polyline) return

  const L = await import('leaflet')

  const coords = decodePolyline(props.polyline)
  if (coords.length === 0) return

  map = L.map(mapRef.value, {
    zoomControl: false,
    scrollWheelZoom: false,
    dragging: false,
    doubleClickZoom: false,
    touchZoom: false,
    keyboard: false,
    attributionControl: false
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18
  }).addTo(map)

  const polyline = L.polyline(coords, {
    color: '#3a9eae',
    weight: 3,
    opacity: 0.9
  }).addTo(map)

  map.fitBounds(polyline.getBounds(), { padding: [8, 8] })
})

onUnmounted(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div
    ref="mapRef"
    class="h-36 w-full rounded-lg overflow-hidden"
    aria-hidden="true"
  />
</template>
