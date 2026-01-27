# API Reference

This document describes the HTTP interface exposed by BYOS for TRMNL devices. All endpoints return JSON and are designed to be called by the device firmware. Use HTTPS in production.

## Base Requirements
- Include device MAC address in every request via the `ID` header.
- When available, include the issued API key via the `Access-Token` header.
- Responses include a `status` field; `0` or `200` indicates success.

## Endpoints

### `GET /api/setup`
Registers a device and returns credentials when a device is new or has been reset.

**Headers**
- `ID` (required): Device MAC address.

**Example**
```bash
curl -X GET http://<BASE_URL>/api/setup \
  -H "ID: 12:34:56:78:9A:BC"
```

**Success Response**
```json
{
  "status": 200,
  "api_key": "uniqueApiKeyGenerated",
  "friendly_id": "DEVICE_ABC123",
  "message": "Device successfully registered"
}
```

### `GET /api/display`
Returns the next screen for a device along with refresh and optional firmware instructions.

**Headers**
- `ID` (required): Device MAC address.
- `Access-Token` (recommended): Issued API key.
- Optional telemetry: `Refresh-Rate`, `Battery-Voltage`, `FW-Version`, `RSSI`.

**Example**
```bash
curl -X GET http://<BASE_URL>/api/display \
  -H "ID: 12:34:56:78:9A:BC" \
  -H "Access-Token: uniqueApiKey" \
  -H "Battery-Voltage: 3.7" \
  -H "FW-Version: 1.0.0" \
  -H "RSSI: -45"
```

**Success Response**
```json
{
  "status": 0,
  "image_url": "https://<BASE_URL>/api/bitmap/DEVICE_ID_TIMESTAMP.bmp",
  "filename": "DEVICE_ID_TIMESTAMP.bmp",
  "refresh_rate": 180,
  "reset_firmware": false,
  "update_firmware": false,
  "firmware_url": null,
  "special_function": "restart_playlist"
}
```

### `POST /api/log`
Captures device-side errors for later diagnosis.

**Headers**
- `ID` (required): Device MAC address.
- `Access-Token` (recommended): Issued API key.

**Body**
```json
{
  "message": "Human-readable description",
  "metadata": {
    "stack": "optional stack or telemetry"
  }
}
```

## Device Status Tracking
The server records the following fields on display requests to aid debugging and scheduling:
- Battery voltage
- Firmware version
- RSSI
- Last update time and next expected update
- Last refresh duration

## Screen Generation Pipeline
- Image format: 800x480 pixel 1-bit BMP.
- Renderer: Takumi (default) or Satori (`REACT_RENDERER` env var).
- Pipeline: JSX component → renderer (PNG) → Sharp (BMP) → TRMNL-specific header.
- Caching: 60-second cache with background revalidation by Next.js (development uses in-memory cache).

## Additional Endpoints

### Device Management
- `GET /api/display/current` - Get current screen for device (requires `Access-Token`)
- `GET /api/devices` - List all devices
- `GET /api/devices/{id}` - Get device by ID or friendly_id

### Playlists
- `GET /api/playlists/items` - List playlist items
- `PATCH /api/playlists/items/{id}` - Update playlist item visibility

### User
- `GET /api/me` - Get user data (stub response)

### Proxy Endpoints (forwarded to TRMNL API)
- `GET /api/categories` - Plugin categories
- `GET /api/ips` - TRMNL server IPs
- `GET /api/models` - Device models
- `GET /api/palettes` - Color palettes
- `POST /api/markup` - Render Liquid templates
- `GET /api/plugin_settings` - List plugin settings
- `POST /api/plugin_settings` - Create plugin setting
- `DELETE /api/plugin_settings/{id}` - Delete plugin setting
- `GET /api/plugin_settings/{id}/data` - Get plugin data
- `POST /api/plugin_settings/{id}/data` - Update plugin data
- `GET /api/plugin_settings/{id}/archive` - Download archive
- `POST /api/plugin_settings/{id}/archive` - Upload archive

## Authentication Notes
- Devices can authenticate by MAC address only, API key only, or both.
- Unknown devices with valid API keys auto-register.
- Proxy endpoints forward `Authorization` and `Access-Token` headers to TRMNL API.
- Production deployments should add middleware, rate limiting, and user management if required.
