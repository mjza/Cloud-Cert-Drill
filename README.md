# CloudCert Drill

A local-first desktop training app for certification exam practice. CloudCert Drill lets you import and edit question banks, generate realistic mock exams, record answers automatically, review results, and track long-term performance.

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/Cloud-Cert-Drill.git
   cd Cloud-Cert-Drill
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment:
   ```bash
   cp .env.example .env
   ```

4. Initialize the database:
   ```bash
   npm run init:db
   ```

### Development

Start the development server (backend + frontend + desktop):
```bash
npm run dev
```

Or run individual modules:

- **Backend only**: `npm run dev:backend`
- **Backend with GraphQL**: `npm run dev:backend` then visit http://localhost:4317/graphql

### Database Commands

```bash
# Initialize database
npm run init:db

# Apply pending migrations
npm run migrate:db

# Seed sample data
npm run seed:db

# Check database status
npm run status:db

# Validate database schema
npm run validate:db

# Reset dev database (with backup)
npm run reset:db:dev
```

## Architecture

CloudCert Drill is organized as npm workspaces with four main modules:

### 1. Initializer (`initializer/`)

Owns all database setup, migrations, and seeding:
- Creates and initializes SQLite database
- Runs migrations in order with checksum verification
- Seeds initial data and optional dev data
- Validates database schema

**Commands:**
```bash
npm -w initializer run init      # Create and initialize DB
npm -w initializer run migrate   # Apply pending migrations
npm -w initializer run seed      # Seed data
npm -w initializer run validate  # Validate schema
npm -w initializer run status    # Show DB status
npm -w initializer run reset:dev # Reset for development
```

### 2. Backend (`backend/`)

GraphQL API service for all data operations:
- CRUD operations for questions, modules, topics
- Exam generation with weighted random selection
- Answer recording and statistics
- User management
- Import/export validation

**Running:**
```bash
npm -w backend run dev    # Development with hot reload
npm -w backend run build  # Build for production
```

**API:**
- GraphQL: `http://localhost:4317/graphql`
- Health Check: `http://localhost:4317/health`

### 3. Frontend (`frontend/`)

React UI for user interactions:
- User selection and creation
- Dashboard with statistics
- Exam generation and taking
- Question editor
- Import/export interface

### 4. Desktop (`desktop/`)

Electron wrapper for packaged distribution:
- Runs backend service
- Opens React UI in native window
- Manages app paths and data directories

## Database Schema

The SQLite database includes these core tables:

- **users** - User profiles and progress
- **topics** - Subject areas (EC2, S3, RDS, etc.)
- **modules** - Certification exams with topic weights
- **questions** - Multiple choice questions
- **options** - Answer choices for questions
- **exams** - Exam attempts with timing and status
- **exam_questions** - Questions selected for each exam
- **exam_answers** - User responses during exams
- **statistics** - Historical performance data
- **question_drafts** - In-progress question edits
- **app_settings** - Configuration key-value pairs

See [initializer/src/migrations](initializer/src/migrations/) for complete schema.

## Configuration

Environment variables (`.env`):

```env
APP_NAME=CloudCert Drill           # Application name
APP_ENV=development                # development, production
DATABASE_PATH=./data/database.sqlite # Relative to project root
BACKEND_HOST=127.0.0.1             # Backend listening address
BACKEND_PORT=4317                  # Backend port
SEED_ON_INIT=false                 # Auto-seed on init
SEED_MODE=dev                      # dev, minimal, none
LOG_LEVEL=info                     # debug, info, warn, error
```

## Development Workflow

### 1. Initialize Database

```bash
npm run init:db
```

This creates `./data/database.sqlite` with all required tables and optional sample data.

### 2. Start Backend

```bash
npm run dev:backend
```

GraphQL API is available at http://localhost:4317/graphql

### 3. Query GraphQL

Example query:
```graphql
query {
  health {
    status
    database
  }
  users {
    userId
    name
    createdAt
  }
  modules {
    id
    name
    topics {
      topic { name }
      percentage
    }
  }
}
```

Example mutation:
```graphql
mutation {
  upsertUserByName(name: "Alice") {
    userId
    name
  }
}
```

### 4. Test Exam Flow

```graphql
mutation {
  generateExam(input: {
    userId: "user-xxx"
    moduleId: "module-clf-c02"
    questionCount: 10
  }) {
    examId
    name
    questionCount
    durationMinutes
  }
}
```

## Project Structure

```
.
├── initializer/          # Database setup and migrations
│   ├── src/
│   │   ├── index.ts      # CLI entry point
│   │   ├── config/       # Environment loading
│   │   ├── db/           # Migration management
│   │   ├── commands/     # init, migrate, seed, validate
│   │   ├── migrations/   # SQL migration files
│   │   └── utils/        # Helpers
│   └── package.json
├── backend/              # GraphQL API
│   ├── src/
│   │   ├── index.ts      # Server startup
│   │   ├── config/       # Environment loading
│   │   ├── db/           # Runtime database connection
│   │   ├── graphql/      # GraphQL schema, resolvers
│   │   ├── services/     # Exam generation, logic
│   │   └── utils/        # Helpers, validation
│   └── package.json
├── frontend/             # React UI (planned)
├── desktop/              # Electron app (planned)
├── data/                 # Local database
├── .env.example          # Environment template
├── package.json          # Workspace root
└── README.md
```

## Exam Generation Algorithm

The backend generates exams using:

1. **Topic Allocation** - Distributes questions across topics based on module weights
2. **Weakness Weighting** - Questions user has failed more often get higher selection weight
3. **Randomization** - Weighted random selection ensures variety while targeting weak areas
4. **Option Shuffling** - Option order is shuffled per exam (unless locked)

See [backend/src/services/examGeneration.ts](backend/src/services/examGeneration.ts) for details.

## Validation Rules

- User names: Required, trimmed, case-insensitive unique
- Questions: Must have text, at least 2 options, at least 1 correct answer
- Options: Non-empty text
- Modules: Topic percentages must sum to 100 (±0.5 tolerance)
- Exams: Can only start once, cannot edit after submission
- Answers: Cannot record after exam expires or is submitted

## Next Steps

- [ ] Build frontend React UI
- [ ] Implement Electron desktop wrapper
- [ ] Add import/export for markdown questions
- [ ] Add statistics and charts
- [ ] Add tests for exam generation
- [ ] Add backup management
- [ ] Add question tags and search
- [ ] Performance optimization

## Contributing

See the [.github](.github/) folder for planning documents and architecture details.

## License

See [LICENSE](LICENSE) file.
