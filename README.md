# BYOS Next.js for TRMNL 🖥️

[![License](https://img.shields.io/github/license/usetrmnl/byos_next)](https://github.com/usetrmnl/byos_next/blob/main/LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Integrated-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](https://github.com/usetrmnl/byos_next/pulls)
[![GitHub Stars](https://img.shields.io/github/stars/usetrmnl/byos_next?style=social)](https://github.com/usetrmnl/byos_next/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/usetrmnl/byos_next?style=social)](https://github.com/usetrmnl/byos_next/network/members)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fusetrmnl%2Fbyos_nextjs&demo-title=BYOS%20Next.js&demo-description=Bring-Your-Own-Server%20built%20with%20Next.js%20for%20the%20TRMNL%20iot%20device&demo-url=https%3A%2F%2Fbyos-nextjs.vercel.app%2F&demo-image=https%3A%2F%2Fbyos-nextjs.vercel.app%2Fbyos-nextjs-screenshot.png&project-name=byos-nextjs&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D)

## 📖 Table of Contents
- [Overview](#-overview)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [How It Works](#-how-it-works)
- [Installation](#-installation)
- [Usage](#-usage)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [Community](#-community)

## 🚀 Overview

**BYOS (Build Your Own Server) Next.js** is a community-maintained library for the TRMNL device, designed to provide a flexible and customizable server solution. This Next.js implementation offers a robust, modern approach to device management and display generation.

## ✨ Features
![screenshot of byos-nextjs, overview page](public/byos-nextjs-overview.png)
![screenshot of byos-nextjs, device page](public/byos-nextjs-device.png)

live demo: [https://byos-nextjs.vercel.app/](https://byos-nextjs.vercel.app/)

- 🔧 Customizable device management
- 🖼️ Dynamic screen generation
- 🚀 Easy deployment to Vercel
- 📊 Comprehensive logging system
- 🔒 Secure API key management
- 💻 Modern tech stack (Next.js 16, React 19, Tailwind CSS v4)
- 🐳 Docker support for local development
- 🧹 Clean, standardized codebase with Biome for formatting
- ⚠️ Using a canary version of Shadcn for Tailwind v4 support; be cautious with AI-generated code.

## 🗺️ Roadmap

This project is in the **Alpha** stage. Here's our development roadmap:

### Current Progress
- ✅ Core functionality for device management
- ✅ Dynamic screen generation
- ✅ Supabase integration
- ✅ Recipes framework
- ✅ Codebase refactoring and standardization
- ✅ Improved initialization flow (2025-03-11)
- ✅ "No database" mode for simpler deployments (2025-03-11)
- ✅ Playlist support for device scheduling

### Coming Soon
- 🔄 More pixelated fonts
- 🔄 More template recipes
- 🔄 MySQL/local file support
- 🔄 Demo mode for testing without affecting production devices

### Future Plans
- 📝 Enhanced documentation
- 🧪 Testing framework
- 🔒 Advanced authentication options

### Reporting Issues
If you encounter any problems:

1. **GitHub Issues**: Open an issue on our [GitHub repository](https://github.com/usetrmnl/byos_next/issues)
2. **Email**: Send details to [manglekuo@gmail.com](mailto:manglekuo@gmail.com)
3. **Discussions**: Reply to my message in the TRMNL Discord server

## 🏁 Quick Start

### Option 1: Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fusetrmnl%2Fbyos_nextjs&demo-title=BYOS%20Next.js&demo-description=Bring-Your-Own-Server%20built%20with%20Next.js%20for%20the%20TRMNL%20iot%20device&demo-url=https%3A%2F%2Fbyos-nextjs.vercel.app%2F&demo-image=https%3A%2F%2Fbyos-nextjs.vercel.app%2Fbyos-nextjs-screenshot.png&project-name=byos-nextjs&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D)

1. Click the Vercel deployment button
2. Link a free Supabase database
3. Follow the deployment instructions
4. Open the deployed app and initialize the database tables
5. Point your device to the deployed app (see [How It Works](#-how-it-works) for details)

> **Note for local development**: once setup, sync enviroment variables to your local development by:
> 1. go to [https://supabase.com/dashboard/project/_/settings/integrations](https://supabase.com/dashboard/project/_/settings/integrations)
> 2. if not linked already, link your supabase project to vercel
> 3. under Vercel Integration, find "manage", turn on "preview" and "development", and then "Resync environment variables"
>4. now using `vercel link` and `vercel env pull`, you should see these environment variables in your local `.env.local` file:
```
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
POSTGRES_DATABASE
POSTGRES_HOST
POSTGRES_PASSWORD
POSTGRES_PRISMA_URL
DATABASE_URL
DATABASE_URL_NON_POOLING
POSTGRES_USER
SUPABASE_ANON_KEY
SUPABASE_JWT_SECRET
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL
```

### Option 2: Local Development Setup

#### Prerequisites
- Node.js (v20 or later)
- pnpm, npm, or yarn
- Git

#### Installation Steps
```bash
# Clone the repository
git clone https://github.com/usetrmnl/byos_next
cd byos_next

# Install dependencies
pnpm install # or npm install or yarn install
```

#### Database Setup

**Option A: Using Supabase (Recommended)**

Set up a Supabase account and add these environment variables to your `.env.local` file:
```
DATABASE_URL
```

Manually initialize the database tables in your Supabase SQL editor by running the migration files in order:
Run the migration files from the `migrations/` directory in order:
1. `0000_initial_schema.sql` - Creates all base tables
2. `0001_add_device_status_fields.sql` - Adds device status fields
3. `0002_add_playlist_index_to_devices.sql` - Adds playlist index tracking
4. `0003_add_playlists.sql` - Adds playlist support (if not already in initial schema)


**Option B: Using Docker (Local PostgreSQL)**

You can use Docker Compose to run a local PostgreSQL database:

```bash
# Set a password for PostgreSQL
export POSTGRES_PASSWORD=your_password_here

# Start PostgreSQL and the Next.js app
docker-compose up -d

# The database will be available at localhost:5432
# Update your .env.local with:
# DATABASE_URL=postgres://postgres:your_password_here@localhost:5432/byos_db?sslmode=disable
```

Then run the migration SQL scripts in your local database.

**Option C: No Database Mode**

The application can run without a database connection. In this mode:
- Device setup is skipped
- Default screens are served (e.g., "album")
- No device management features are available
- Useful for testing screen generation without database setup

Simply start the development server without database environment variables:
```bash
# Start development server
pnpm run dev # or npm run dev or yarn run dev
```

The app will automatically detect the missing database connection and operate in "noDB" mode.

### Code Formatting
This project uses Biome for code formatting. To format your code:

```bash
# Format code
pnpm lint
```

## 🔍 How It Works

### 1. Device Interaction Endpoints

The BYOS architecture provides three main endpoints for device interaction:

#### Setup Endpoint (`/api/setup`)
- **Purpose**: Device registration and API key generation
- **Usage**: Called when a device is reset or lacks an API key
- **Request Flow**:
  - Device sends MAC address in request headers
  - Server checks if the device exists in the database
  - If new, generates a unique API key and friendly device ID
  - Returns API key to the device for future authentication

```bash
curl -X GET http://[YOUR BASE URL]/api/setup \
-H "Content-Type: application/json" \
-H "ID: 12:34:56:78:9A:BC"
```

**Response Example**:
```json
{
   "status": 200,
   "api_key": "uniqueApiKeyGenerated",
   "friendly_id": "DEVICE_ABC123",
   "message": "Device successfully registered"
}
```

#### Display Endpoint (`/api/display`)
- **Purpose**: Primary endpoint for screen content delivery
- **Usage**: Called repeatedly by the device after setup to get new screens
- **Key Functions**:
  1. Provides the URL for the next screen to display
  2. Specifies how long the device should sleep before requesting again
  3. Can optionally signal firmware reset/update requirements
  4. Tracks device status (battery voltage, firmware version, RSSI, refresh duration)
  5. Supports playlist-based screen scheduling with time and day-of-week restrictions
  
**Request Headers**:
- `ID`: Device MAC address (required)
- `Access-Token`: Device API key (optional, but recommended)
- `Refresh-Rate`: Current device refresh rate in seconds (optional)
- `Battery-Voltage`: Current battery voltage (optional)
- `FW-Version`: Firmware version string (optional)
- `RSSI`: WiFi signal strength in dBm (optional)

```bash
curl -X GET http://[YOUR BASE URL]/api/display \
-H "Content-Type: application/json" \
-H "ID: 12:34:56:78:9A:BC" \
-H "Access-Token: uniqueApiKey" \
-H "Battery-Voltage: 3.7" \
-H "FW-Version: 1.0.0" \
-H "RSSI: -45"
```

**Response Example**:
```json
{
   "status": 0,
   "image_url": "https://your-base-url/api/bitmap/DEVICE_ID_TIMESTAMP.bmp",
   "filename": "DEVICE_ID_TIMESTAMP.bmp",
   "refresh_rate": 180,
   "reset_firmware": false,
   "update_firmware": false,
   "firmware_url": null,
   "special_function": "restart_playlist"
}
```

> **Note**: The `refresh_rate` is specified in seconds. The default is 180 seconds (3 minutes), but this can be customized per device through refresh schedules or playlist items.

> **Note**: This implementation does not currently handle button functionality.

#### Log Endpoint (`/api/log`)
- **Purpose**: Error and issue reporting
- **Usage**: Called when errors or issues occur on the device
- **Behavior**: Logs are stored in the Supabase database for troubleshooting

### 2. Screen Generation Approach

Unlike the official Ruby/Python implementations, this Next.js implementation:

- **Generates screens on-demand**: When a device requests a display update
- **Leverages Next.js caching**: Uses built-in caching mechanisms for performance
- **Dynamic BMP generation**: The bitmap URL is a dynamic API endpoint
- **Efficient revalidation**: 
  - First request may take longer to generate the screen
  - Subsequent requests are served from cache while revalidating in the background
  - This approach provides both speed and fresh content

#### Technical Specifications
- **Image Format**: 800x480 pixel 1-bit bitmap (.bmp)
- **Rendering**: Uses Satori for dynamic image generation
- **Rendering Pipeline**: 
  JSX component → pre-satori wrapper → Satori (SVG) → Vercel ImageResponse (PNG) → Jimp (BMP) → fixed header to fit TRMNL display
- **Caching Strategy**: 
  - Development: 60-second memory cache with revalidation
  - Production: Next.js built-in caching with 60-second default revalidation
- **Default Refresh Rate**: 180 seconds (3 minutes) for devices

### 3. Device Status Tracking

The system automatically tracks device status information when devices make display requests:

- **Battery Voltage**: Monitored to track device power levels
- **Firmware Version**: Tracks device firmware for compatibility
- **RSSI**: WiFi signal strength for network diagnostics
- **Last Update Time**: Timestamp of the last successful request
- **Next Expected Update**: Calculated based on refresh rate
- **Last Refresh Duration**: Time taken for the last screen refresh

This information is stored in the `devices` table and can be viewed in the device management interface.

### 4. Authentication Considerations

**Important**: This implementation does not include a comprehensive authentication system.

- **No user management**: Unlike some official implementations, there is no built-in user field in the database
- **Basic device authentication**: Verifies device MAC address and/or API key
- **Flexible authentication**: Devices can authenticate by MAC address only, API key only, or both
- **Auto-registration**: Unknown devices with valid API keys are automatically registered
- **Production deployment recommendations**:
  - Implement your own authentication layer (e.g., NextAuth, SupabaseAuth)
  - Use middleware for request validation
  - Update the database schema to include user management if needed
  - Consider rate limiting and other security measures

## 📋 Playlists

The system supports playlist-based screen scheduling for devices. Playlists allow you to:

- **Schedule screens by time**: Show different screens during specific time ranges (e.g., morning vs. evening)
- **Schedule by day of week**: Display different content on weekdays vs. weekends
- **Set custom durations**: Control how long each screen is displayed
- **Automatic rotation**: Devices automatically cycle through playlist items based on time and day restrictions

To use playlists:
1. Create a playlist in the playlists interface
2. Add playlist items with screen IDs, durations, and optional time/day restrictions
3. Assign the playlist to a device
4. Enable playlist mode on the device

When a device uses a playlist, it will automatically display the appropriate screen based on the current time and day of week, cycling through items that match the current conditions.

## 🧪 Recipes

The project includes a recipes section to visualize and test components in both direct rendering and bitmap (BMP) rendering forms. This helps develop and test components for the TRMNL device.

### How Recipes Work

Visit `[base url]/recipes` to view the recipes page.

To set up your own screen recipe, use the following structure:

1. Create your component folder in the `app/recipes/screens` directory following any existing recipes.
2. Add your component and data fetching logic (if needed)
3. Add an entry to `app/recipes/screens.json`

Each recipe is defined in `app/recipes/screens.json` and can be accessed via its slug (e.g., `/recipes/album`, `/recipes/bitcoin-price`).

This allows you to code and preview before pointing your device to any of the screens. Recipes support:
- Responsive Tailwind CSS classes
- Dynamic data fetching
- Time-based and day-of-week scheduling (for playlists)
- Custom props and configuration

For more details, see the [Recipes README](app/recipes/README.md).

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on:
- Reporting bugs
- Suggesting features
- Submitting pull requests

### Ways to Contribute
- Report issues on GitHub
- Submit pull requests
- Improve documentation
- Share use cases and feedback

## 🌐 Community

- 📢 [GitHub Discussions](https://github.com/usetrmnl/byos_next/discussions)
- 🐦 [Twitter @usetrmnl](https://twitter.com/usetrmnl)
- 💬 Join our community channels

## 📚 Learn More
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [TRMNL Device Website](https://usetrmnl.com)
- [Satori Documentation](https://github.com/vercel/satori) - For understanding the rendering pipeline

## 🐳 Docker Support

This project includes Docker Compose configuration for local development with PostgreSQL. See `docker-compose.yml` for details.

To use Docker:
1. Set the `POSTGRES_PASSWORD` environment variable
2. Run `docker-compose up -d` to start PostgreSQL and the Next.js app
3. The database will be available at `localhost:5432`
4. Update your `.env.local` with the appropriate `DATABASE_URL`

## 📄 License

This project is open-source and available under the MIT License.