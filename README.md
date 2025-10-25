# Ztomic-Swap Server

Backend service for the Ztomic-Swap platform that handles intent management, user data, and API endpoints for atomic swaps.

## Architecture

### Directory Structure
```
server/
├── data/
│   ├── intents.json    # Stores swap intents and their states
│   └── users.json      # Stores user identities and public keys
├── index.js           # Main server entry point
└── package.json       # Server dependencies and scripts
```

## API Endpoints

### Intents
- **GET `/intents`**
  - Retrieves all swap intents
  - Response: Array of intent objects
  ```typescript
  {
    id: number,
    initiator: string,
    fromToken: string,
    toToken: string,
    amount: string,
    status: "pending" | "active" | "completed" | "cancelled",
    interestedParties: string[],
    selectedCounterparty?: string,
    createdAt: string
  }
  ```

- **GET `/intents/:id`**
  - Retrieves specific intent by ID
  - Response: Single intent object or 404

- **POST `/intents`**
  - Creates new swap intent
  - Body: Intent creation data
  - Generates unique numeric ID using timestamp

- **PUT `/intents/:id`**
  - Updates intent status, interested parties, or selected counterparty
  - Body: Partial intent update data

- **DELETE `/intents/:id`**
  - Removes an intent from the system

### Users
- **GET `/users`**
  - Lists all registered users
  - Response: Array of user objects

- **GET `/users/:userName`**
  - Retrieves specific user data
  - Response: User public keys and identity

- **POST `/users`**
  - Registers new user
  - Body: User registration data with public keys

## Data Models

### Intent Schema
```typescript
interface Intent {
  id: number;
  initiator: string;
  initiatorAddress: string;
  fromToken: string;
  toToken: string;
  amount: string;
  status: "pending" | "active" | "completed" | "cancelled";
  interestedParties: string[];
  selectedCounterparty?: string;
  createdAt: string;
}
```

### User Schema
```typescript
interface User {
  identity: string;
  pubKeyX: string;
  pubKeyY: string;
  createdAt: string;
}
```

## Setup & Configuration

### Environment Variables
```env
PORT=3001              # Server port (default: 3001)
DATA_DIR=./data       # Data directory path
```

### Installation
```bash
# Install dependencies
npm install

# Start server
npm start

# Start in development mode
npm run dev
```

## Development

### Data Persistence
- Uses JSON files for data storage
- Automatic creation of data directory and files
- File-based operations with proper error handling

### Security Considerations
- CORS enabled for development
- Handles concurrent file operations
- Data validation for all endpoints

### Error Handling
- Proper HTTP status codes
- Detailed error messages
- File operation error recovery

## Integration with Frontend

### Proxy Configuration
Frontend Next.js app proxies requests to this server:
```typescript
// In client/app/api/[...route]/route.ts
const EXTERNAL_API = process.env.EXTERNAL_API_URL || 'http://localhost:3001'
```

