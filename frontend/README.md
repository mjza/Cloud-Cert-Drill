# CloudCert Drill - Frontend

React + TypeScript web application for certification exam practice.

## Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Fast build tool and dev server
- **React Router** - Routing
- **TanStack Query** - Server state management
- **Apollo Client** - GraphQL client
- **Zustand** - Client state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation
- **TailwindCSS** - Styling
- **Recharts** - Charts and analytics

## Project Structure

```
src/
  app/              # App entry point, router, providers
  api/              # GraphQL queries, mutations, client setup
    graphqlClient.ts
    queries/        # Query definitions
    mutations/      # Mutation definitions
  components/       # Reusable UI components
    layout/         # Layout components
    forms/          # Form components
    tables/         # Table components
    exam/           # Exam-specific components
    questionEditor/ # Question editor components
  features/         # Feature modules
    users/          # User management and start page
    dashboard/      # User dashboard
    exams/          # Exam taking and management
    questions/      # Question management
    importExport/   # Import/export functionality
    statistics/     # Statistics and reporting
  hooks/            # Custom React hooks
  utils/            # Utility functions
  styles/           # Global styles
```

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will run at `http://localhost:5173`

Make sure the backend is running at `http://localhost:4000/graphql`

### Build

```bash
npm run build
```

### Linting

```bash
npm run lint
npm run type-check
```

### Testing

```bash
npm run test
```

## Key Features

### User Management
- User start page with tile selection
- Create or return to existing users by name
- No authentication (local-first)

### Dashboard
- Overall statistics (average score, total exams, questions answered)
- Strong and weak topics
- Recent exam history table
- New exam and question editor buttons

### Exam Taking (Coming Soon)
- Module and question count selection
- Exam instructions with certification-style content
- Active exam interface with timer
- Question navigation and marking for review
- Automatic answer saving
- Exam submission with confirmation

### Question Editor (Coming Soon)
- Question list with filtering and search
- Inline question and option editing
- Draft saving and review
- Validation before submission

### Import/Export (Coming Soon)
- Markdown file import
- Question bank export
- JSON backup and restore

## Environment Variables

Create a `.env.local` file:

```env
VITE_GRAPHQL_ENDPOINT=http://localhost:4000/graphql
```

## Performance

- Vite HMR for fast development
- Code splitting by route
- Apollo caching for GraphQL data
- React Query stale-time configuration

## Accessibility

- Semantic HTML elements
- ARIA labels on form inputs
- Keyboard navigation support
- Contrast-compliant color scheme
- Focus visible states

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Contributing

- Follow TypeScript strict mode
- Use React hooks (no class components)
- Keep components focused and composable
- Write tests for features
- Use TailwindCSS for styling
