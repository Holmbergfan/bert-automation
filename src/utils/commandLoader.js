
const path = require('path');
const fs = require('fs').promises;
const logger = require('./logger');

class CommandLoader {
  static async loadCommands() {
    try {
      const commandsPath = path.join(__dirname, '../config/commands.json');
      const rawData = await fs.readFile(commandsPath, 'utf8');
      const commands = JSON.parse(rawData);
      
      // Validate command structure
      Object.entries(commands).forEach(([name, config]) => {
        if (!config.handler || !config.description) {
          throw new Error(`Invalid command configuration for ${name}`);
        }
      });

      return commands;
    } catch (error) {
      logger.error(`Error loading commands: ${error.message}`);
      return {};
    }
  }
}

module.exports = CommandLoader;