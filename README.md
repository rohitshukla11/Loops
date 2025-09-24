# BetterHalf.ai

Your AI companion for life - a personalized AI assistant that understands your schedule, preferences, and lifestyle to provide tailored recommendations and support. Built with privacy-first design using Golem Base, NEAR Protocol, and advanced encryption.

## 🏗️ Architecture

### Core Components

1. **Personalized Chat Interface**: AI conversation tailored to your lifestyle and preferences
2. **Calendar Integration**: Google Calendar analysis for schedule optimization and insights
3. **Memory Storage**: Golem Base for decentralized conversation and learning storage
4. **Blockchain Anchoring**: NEAR Protocol smart contracts for metadata and access control
5. **Encryption**: Randamu dcipher for threshold encryption and timelock policies
6. **UI**: React/Next.js web application with NEAR wallet integration
7. **Lifestyle Recommendations**: Personalized suggestions for meals, workouts, and daily optimization

### Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Blockchain**: NEAR Protocol (testnet/mainnet)
- **Storage**: Golem Base, Web3.Storage (backup)
- **Encryption**: CryptoJS, custom threshold encryption
- **Wallet**: NEAR Wallet API

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- NEAR testnet account
- Ethereum private key for Golem Base (get testnet funds from [ETH Warsaw Faucet](https://ethwarsaw.holesky.golemdb.io/faucet/))

### Installation

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd betterhalf-ai
npm install
```

2. **Set up environment variables**:
```bash
cp env.example .env.local
```

Edit `.env.local` with your configuration:
```env
NEXT_PUBLIC_NEAR_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ID=your-contract-id.testnet
NEXT_PUBLIC_WEB3_STORAGE_TOKEN=your_web3_storage_token
NEXT_PUBLIC_GOLEM_PRIVATE_KEY=your_ethereum_private_key
NEXT_PUBLIC_GOLEM_CHAIN_ID=60138453033
NEXT_PUBLIC_GOLEM_RPC_URL=https://ethwarsaw.holesky.golemdb.io/rpc
NEXT_PUBLIC_GOLEM_WS_URL=wss://ethwarsaw.holesky.golemdb.io/rpc/ws
```

3. **Deploy smart contracts**:
```bash
cd contracts
npm install
npm run build
npm run deploy
```

4. **Start the development server**:
```bash
npm run dev
```

Visit `http://localhost:3000` to see the application.

## 📖 Usage Guide

### For Users

1. **Connect Wallet**: Click "Connect Wallet" to link your NEAR account
2. **Start Chatting**: Type messages to interact with the AI assistant
3. **View History**: Access previous conversations and AI responses
4. **Manage Privacy**: Control how conversations are stored and encrypted
5. **View on Blockchain**: Conversations are anchored on NEAR blockchain

### For Developers

#### Creating a Memory

```typescript
import { getMemoryService } from '@/lib/memory-service'

const memoryService = getMemoryService()

// Create a new memory
const memory = await memoryService.createMemory(
  "User prefers dark mode in applications",
  "user_preference",
  "UI/UX",
  ["preferences", "ui", "dark-mode"],
  undefined, // access policy
  true // encrypt
)
```

#### Searching Memories

```typescript
// Search memories
const results = await memoryService.searchMemories({
  query: "dark mode",
  type: "user_preference",
  category: "UI/UX"
})

console.log(results.memories)
```

#### Managing Permissions

```typescript
// Grant permission to an AI agent
await memoryService.grantPermission(
  memoryId,
  "assistant-agent-1",
  ["read", "write"]
)

// Revoke permission
await memoryService.revokePermission(memoryId, "assistant-agent-1")
```

## 🔐 Security Features

### Encryption

- **AES-256-GCM** encryption for memory content
- **Threshold encryption** for shared access
- **Timelock policies** for time-based access control
- **Key derivation** using PBKDF2

### Access Control

- **Per-memory permissions** for fine-grained control
- **Agent-based access** for AI agent management
- **Owner-only operations** for critical actions
- **Blockchain-anchored policies** for transparency

### Privacy

- **Decentralized storage** via Golem Base
- **No central authority** for data access
- **User-controlled encryption keys**
- **Optional metadata obfuscation**

## 🏛️ Smart Contract API

### View Methods

```typescript
// Get memory anchor
get_memory_anchor(memoryId: string): MemoryAnchor | null

// Get user's memories
get_user_memories(accountId: string, limit?: number, offset?: number): MemoryAnchor[]

// Get memory permissions
get_memory_permissions(memoryId: string): string

// Search memories
search_memories(query: string, owner?: string, limit?: number): MemoryAnchor[]
```

### Change Methods

```typescript
// Create memory anchor
create_memory_anchor(memoryId: string, ipfsHash: string, accessPolicy: string): void

// Update memory anchor
update_memory_anchor(memoryId: string, ipfsHash: string, accessPolicy: string): void

// Delete memory anchor
delete_memory_anchor(memoryId: string): void

// Grant permission
grant_permission(memoryId: string, agentId: string, actions: string[]): void

// Revoke permission
revoke_permission(memoryId: string, agentId: string): void
```

## 🔧 Configuration

### NEAR Network

- **Testnet**: `testnet` (default)
- **Mainnet**: `mainnet`
- **Local**: `local`

### Golem Base

- **Chain ID**: `60138453033` (ETH Warsaw testnet)
- **RPC URL**: `https://ethwarsaw.holesky.golemdb.io/rpc`
- **WebSocket URL**: `wss://ethwarsaw.holesky.golemdb.io/rpc/ws`
- **Web3.Storage**: Optional backup storage

### Encryption

- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 (100,000 iterations)
- **Salt Length**: 32 bytes
- **IV Length**: 16 bytes

## 📊 API Examples

### Create Memory Request

```bash
curl -X POST http://localhost:3000/api/memories \
  -H "Content-Type: application/json" \
  -d '{
    "content": "User prefers morning meetings",
    "type": "user_preference",
    "category": "scheduling",
    "tags": ["meetings", "preferences"],
    "encrypt": true
  }'
```

### Search Memories Request

```bash
curl -X GET "http://localhost:3000/api/memories/search?query=meetings&type=user_preference"
```

### Grant Permission Request

```bash
curl -X POST http://localhost:3000/api/memories/{memoryId}/permissions \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "assistant-1",
    "actions": ["read", "write"]
  }'
```

## 🧪 Testing

### Unit Tests

```bash
npm run test
```

### Integration Tests

```bash
npm run test:integration
```

### Smart Contract Tests

```bash
cd contracts
npm run test
```

## 🚀 Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Smart Contracts (NEAR)

```bash
# Deploy to testnet
npm run contract:deploy

# Deploy to mainnet
NEAR_ENV=mainnet npm run contract:deploy
```

### Golem Base Setup

```bash
# Get testnet funds from ETH Warsaw Faucet
# Visit: https://ethwarsaw.holesky.golemdb.io/faucet/
# Enter your Ethereum address to receive testnet ETH

# Test Golem Base integration
npm run test:golem
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [Wiki](https://github.com/your-repo/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discord**: [Community Server](https://discord.gg/your-server)
- **Email**: support@your-domain.com

## 🙏 Acknowledgments

- NEAR Protocol for blockchain infrastructure
- Golem Base for decentralized storage
- Randamu for encryption utilities
- OpenServ AI for marketplace integration

---

**Built with ❤️ for the decentralized AI future**
