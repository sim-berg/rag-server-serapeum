# Required Libraries for RAG Server

## Ollama JavaScript Client

**NPM Package Name:** `ollama`

**Installation:**
```bash
npm i ollama
```

**Basic Usage:**
```javascript
import ollama from 'ollama'

const response = await ollama.chat({
  model: 'llama3.1',
  messages: [{ role: 'user', content: 'Why is the sky blue?' }],
})
console.log(response.message.content)
```

**Environment Variables:** 
- No required environment variables
- Can be configured with a custom host if needed (default is `http://127.0.0.1:11434`)


## Logging Libraries

### Pino (Recommended for performance)
**NPM Package Name:** `pino`

**Installation:**
```bash
npm install pino
```

**Basic Usage:**
```javascript
const pino = require('pino')
const logger = pino()

logger.info('Server starting')
logger.error({ err }, 'An error occurred')
```

### Winston (Feature-rich alternative)
**NPM Package Name:** `winston`

**Installation:**
```bash
npm install winston
```

**Basic Usage:**
```javascript
const { createLogger, format, transports } = require('winston')
const logger = createLogger({
  level: 'info',
  format: format.json(),
  transports: [new transports.Console()]
})

logger.info('Server starting')
logger.error('An error occurred', err)
```

### Morgan (HTTP request logging for Express)
**NPM Package Name:** `morgan`

**Installation:**
```bash
npm install morgan
```

**Basic Usage:**
```javascript
const morgan = require('morgan')
app.use(morgan('combined'))
```

For Express.js applications, it's common to use Morgan for HTTP request logging and either Pino or Winston for application-level logging. Pino is recommended when performance is critical, while Winston is better when extensive features and flexibility are needed.