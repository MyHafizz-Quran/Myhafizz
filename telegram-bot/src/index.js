import 'dotenv/config';
import { createBot } from './bot.js';

// Validate required environment variables
const required = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_ADMIN_CHAT_ID', 'DATABASE_URL'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(`❌ Variables d'environnement manquantes : ${missing.join(', ')}`);
  console.error('Copiez .env.example en .env et renseignez les valeurs.');
  process.exit(1);
}

console.log('🕌 Démarrage du bot MyHafizz Admin...');
console.log('   Base : Neon');
console.log(`   Admin Chat ID : ${process.env.TELEGRAM_ADMIN_CHAT_ID}`);

const bot = createBot();

// Launch the bot
bot.launch();

// Graceful shutdown
process.once('SIGINT', () => {
  console.log('\n⏹️  Arrêt du bot (SIGINT)...');
  bot.stop('SIGINT');
});

process.once('SIGTERM', () => {
  console.log('\n⏹️  Arrêt du bot (SIGTERM)...');
  bot.stop('SIGTERM');
});
