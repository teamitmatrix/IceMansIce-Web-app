# IceMan's Ice

Web app for IceMan's Ice: a Next.js frontend and an Express backend in one repository.

| Folder | App |
| --- | --- |
| `IceProjectFrontend` | Customer, driver, and admin interface (Next.js) |
| `IceProjectBackend` | Sales API, customer portal, and QuickBooks Online integration (Node.js, Express, MongoDB) |

## Prerequisites

- Node.js 18 or newer
- MongoDB
- Redis (backend background jobs)

## Backend

```bash
cd IceProjectBackend
npm install
cp env.example .env
npm run dev
```

The API listens on `PORT` from `.env` (default `3000`). Fill in `.env` before starting. Do not commit that file.

## Frontend

```bash
cd IceProjectFrontend
npm install
npm run dev
```

Create `IceProjectFrontend/.env.local` and point it at the API:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Next.js also defaults to port `3000`. If the backend is already using that port, start the frontend on another one:

```bash
npm run dev -- -p 3001
```

Open [http://localhost:3001](http://localhost:3001).

## More detail

- Frontend notes: `IceProjectFrontend/README.md`
- Backend setup, API, and deployment: `IceProjectBackend/README.md`
