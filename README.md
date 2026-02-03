# ChorusLab Frontend

ChorusLab is a video composition tool designed to help creators overlay lyrical text onto video backgrounds with musical accompaniment. It provides a visual interface for synchronizing lyrics with audio tracks, making it ideal for creating lyric videos, karaoke tracks, or music visualizations.

## Core Features

* **Lyric & Video Composition:** Combine video backgrounds with custom text overlays specifically designed for song lyrics.
* **Music Integration:** Import audio tracks to synchronize with your visual elements.
* **Project Persistence:** Save your compositions as "Projects" to the local database, allowing you to return to your edits later.
* **Real-time Preview:** View your video, text, and audio layers rendered together in real-time.
* **Modern Editor UI:** A clean, dark-mode interface built for content creation without distraction.

## Tech Stack

* **Framework:** [React](https://react.dev/) (v18)
* **Build Tool:** [Vite](https://vitejs.dev/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **HTTP Client:** [Axios](https://axios-http.com/)
* **Icons:** [Lucide React](https://lucide.dev/)

## Prerequisites

* Node.js (v18+ recommended)
* npm (Node Package Manager)
* **ChorusLab Backend** running on port `3001` (required for saving projects).

## Installation

1.  Navigate to the frontend directory:
    ```bash
    cd choruslab-frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

## Usage

### Development Server
Start the Vite development server. This will launch the app at `http://localhost:5173` (by default).

```bash
npm run dev
