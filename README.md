# Calculator Aquatim

Water bill distribution calculator for apartment buildings. Splits water, sewage, and rain water costs among apartments based on meter readings.

Built for a specific Romanian apartment building served by [Aquatim](https://www.aquatim.ro/).

## Prerequisites

- **Node.js >= 25** (uses the built-in `node:sqlite` module)
- A `.nvmrc` file is provided for [nvm](https://github.com/nvm-sh/nvm) users

## Getting Started

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:4321`. The SQLite database (`data/aquatim.db`) is created automatically on first run and seeded with initial meter data.

## Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the Astro dev server           |
| `npm run build`   | Build for production                 |
| `npm run preview` | Preview the production build locally |
| `npm test`        | Run tests                            |

## Tech Stack

- **[Astro](https://astro.build/) 6** — SSR with the Node.js adapter (standalone mode)
- **[React](https://react.dev/) 19** — Interactive client components
- **SQLite** — Via Node's built-in `node:sqlite` (`DatabaseSync`)
- **[Pico CSS](https://picocss.com/) 2** — Minimal classless CSS framework
- **TypeScript**

## Project Structure

```
src/
├── components/     Astro layouts and React UI components
├── db/             Database schema, seed data, and query functions
├── lib/            Calculation logic
└── pages/
    ├── api/        REST API endpoints
    ├── bill/       Bill detail and creation pages
    └── *.astro     Home, history, settings pages
data/
└── aquatim.db      SQLite database (auto-created)
```

## Database

The database is a single SQLite file at `data/aquatim.db`. It's created automatically when the app starts. Schema is defined in `src/db/schema.ts`.

### Tables

| Table        | Purpose                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------- |
| **meters**   | Apartment water meters — name, rain water flag, active status, sort order, sub-meter relationships |
| **bills**    | Monthly bills — month, water/sewage/rain water costs, total volume                                 |
| **readings** | Historical meter readings linked to meters                                                         |
| **charges**  | Per-meter cost breakdown for each bill                                                             |

### Seed Data

On first run, 4 meters are created (see `src/db/seed.ts`). One meter ("Casa Flore") is configured as a sub-meter of another ("Ap. 2 Chiriasi").

## Calculation Logic

The core algorithm in `src/lib/calculate.ts` distributes bill costs:

- **Water & sewage costs** are split proportionally by consumption among root meters (non-sub-meters)
- **Rain water costs** are split equally among meters flagged as having rain water collection
- **Sub-meters** have their consumption deducted from their parent meter; the parent's share is then split between parent and sub-meters proportionally

## API Endpoints

| Endpoint           | Method | Description                                                    |
| ------------------ | ------ | -------------------------------------------------------------- |
| `/api/calculate`   | POST   | Calculate charge distribution for given bill data and readings |
| `/api/bills`       | GET    | List bills (paginated) or fetch a single bill by ID            |
| `/api/save-bill`   | POST   | Save a new bill with readings and charges                      |
| `/api/meters`      | GET    | List all active meters                                         |
| `/api/meters`      | POST   | Create a new meter                                             |
| `/api/meters/[id]` | PUT    | Update meter settings                                          |
| `/api/meters/[id]` | POST   | Record a meter reading                                         |

## Testing

Tests use Node's built-in `node:test` module with `node:assert` for assertions — no external test framework.

```bash
npm test
```

Test files follow the `*.test.ts` convention and live alongside the source code they test.

## Formatting

```bash
npx prettier --write .
```

Uses [Prettier](https://prettier.io/) with the [Astro plugin](https://github.com/withastro/prettier-plugin-astro).
