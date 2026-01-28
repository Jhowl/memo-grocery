# Anti-Memo Grocery

## Project Overview
Anti-Memo Grocery is a price comparison dashboard for tracking grocery purchases. It helps you log items, compare unit prices across stores, and quickly spot the best value for each category.

## Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL
- Containerization: Docker + Docker Compose

## Setup Instructions (Docker)
1. Build and start the stack:
   ```bash
   docker-compose up --build
   ```
2. Open the app:
   - Frontend: http://localhost:8081
   - Backend API: http://localhost:8000

## Docker Configuration
- Services: `db` (PostgreSQL), `backend` (FastAPI), `frontend` (Vite)
- Ports:
  - Postgres: `5433` -> `5432`
  - Backend API: `8000`
  - Frontend: `8081` -> `5173`
- Environment:
  - `DATABASE_URL=postgresql://postgres:postgres@db:5432/antimemo`
  - `VITE_API_URL=http://localhost:8000`
- Volumes:
  - `postgres_data` for database persistence
  - `uploads` for stored images

## Usage Guidance
- Add categories and purchases from the "Log Purchase" page.
- View and compare products on the "Price Comparison" dashboard.
- Edit a product by clicking the pencil icon on a card.
- Click a product image to view it full-size.
- Delete a product using the trash icon.

## Notes
- Uploaded images are stored in the `uploads` Docker volume.
- The API base URL defaults to `http://localhost:8000` (see `VITE_API_URL` in `docker-compose.yml`).
