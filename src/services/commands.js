const logger = require('../utils/logger');
const CommandLoader = require('../utils/commandLoader');

class CommandHandler {
  constructor(client) {
    this.client = client;
    this.commands = {};
    this.loadCommands();
  }

  async loadCommands() {
    const commandConfigs = await CommandLoader.loadCommands();
    
    // Map command configurations to handler methods
    Object.entries(commandConfigs).forEach(([name, config]) => {
      if (typeof this[config.handler] === 'function') {
        this.commands[name] = this[config.handler].bind(this);
      } else {
        logger.error(`Handler ${config.handler} not found for command ${name}`);
      }
    });

    this.commandConfigs = commandConfigs;
  }

  async handleCommand(command, event) {
    try {
      // Split the command and arguments
      const args = event.msg.substring(1).split(' '); // Remove ! and split
      const baseCommand = args[0].toLowerCase();
      event.args = args.slice(1); // Store remaining arguments

      const handler = this.commands[baseCommand];
      if (handler) {
        await handler(event);
      } else {
        await this.sendMessage(event.invoker.clid, `Unknown command: ${baseCommand}`);
      }
    } catch (error) {
      logger.error(`Error handling command: ${error.message}`);
    }
  }

  async sendMessage(clientId, message) {
    await this.client.sendTextMessage(clientId, 1, message);
  }

  async handleHelp(event) {
    const commandList = Object.entries(this.commandConfigs)
      .map(([name, config]) => `!${name} - ${config.description}${config.example ? `\n  Example: ${config.example}` : ''}`)
      .join('\n');
    
    await this.sendMessage(event.invoker.clid, `Available commands:\n${commandList}`);
  }

  // Command handlers
  async handlePing(event) {
    await this.sendMessage(event.invoker.clid, "Pong!");
  }

  async handleMassPoke(event) {
    try {
      const message = event.args.join(' ') || 'Mass poke from admin!';
      if (!message) {
        await this.sendMessage(event.invoker.clid, "Please provide a message for the mass poke!");
        return;
      }

      const clients = await this.client.clientList();
      let pokedCount = 0;
      
      for (const client of clients) {
        if (client.type === 1 || client.clid === event.invoker.clid) continue;
        
        await this.client.clientPoke(client.clid, message);
        pokedCount++;
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      await this.sendMessage(
        event.invoker.clid, 
        `Mass poke sent to ${pokedCount} client${pokedCount !== 1 ? 's' : ''} with message: "${message}"`
      );
    } catch (error) {
      logger.error(`Error in masspoke: ${error.message}`);
      await this.sendMessage(event.invoker.clid, "Failed to execute mass poke.");
    }
  }

  async handleMassKick(event) {
    try {
      const reason = event.args.join(' ') || 'No reason provided';
      const clients = await this.client.clientList();
      
      for (const client of clients) {
        // Skip the bot itself, query clients, and the command invoker
        if (client.type === 1 || client.clid === event.invoker.clid) continue;
        
        // Updated kick command parameters
        await this.client.clientKick({
          clid: client.clid,
          reasonid: 5, // Server kick (4 for channel kick, 5 for server kick)
          reasonmsg: reason
        });

        // Small delay to prevent flooding
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      await this.sendMessage(event.invoker.clid, `Mass kick executed with reason: ${reason}`);
    } catch (error) {
      logger.error(`Error in masskick: ${error.message}`);
      await this.sendMessage(event.invoker.clid, "Failed to execute mass kick.");
    }
  }

  async handleMassMove(event) {
    try {
      const channelName = event.args.join(' ');
      if (!channelName) {
        await this.sendMessage(event.invoker.clid, "Please specify a channel name!");
        return;
      }

      const channels = await this.client.channelList();
      const targetChannel = channels.find(c => 
        c.name.toLowerCase().includes(channelName.toLowerCase())
      );
      
      if (!targetChannel) {
        await this.sendMessage(event.invoker.clid, `Channel "${channelName}" not found!`);
        return;
      }

      const clients = await this.client.clientList();
      let movedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      
      for (const client of clients) {
        // Skip specific client types
        if (client.type === 1 || // Skip ServerQuery clients
            client.clid === event.invoker.clid || // Skip command invoker
            client.cid === targetChannel.cid) { // Skip clients already in target
          skippedCount++;
          continue;
        }
        
        try {
          await this.client.clientMove(client.clid, targetChannel.cid);
          movedCount++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (moveError) {
          failedCount++;
          logger.error(`Failed to move client ${client.clid}: ${moveError.message}`);
        }
      }
      
      // Provide detailed feedback
      const feedback = [
        `Channel: ${targetChannel.name}`,
        `Moved: ${movedCount} client${movedCount !== 1 ? 's' : ''}`,
        `Skipped: ${skippedCount} (already in channel/query clients)`,
        failedCount > 0 ? `Failed: ${failedCount}` : null
      ].filter(Boolean).join('\n');
      
      await this.sendMessage(event.invoker.clid, feedback);
    } catch (error) {
      logger.error(`Error in massmove: ${error.message}`);
      await this.sendMessage(event.invoker.clid, "Failed to execute mass move.");
    }
  }

  async handleJoin(event) {
    try {
      const invoker = event.invoker;
      const targetChannelId = invoker.cid;
      const self = await this.client.whoami();
      
      // Get current channel info
      const currentChannel = await this.client.getChannelById(self.clientId);
      
      // Don't move if we're in the status channel
      if (currentChannel && currentChannel.name.includes('Bert Bot')) {
        await this.sendMessage(
          event.invoker.clid,
          "Cannot move: Bot must remain in status channel"
        );
        return;
      }
      
      // Move the bot to the invoker's channel
      await this.client.clientMove(self.clientId, targetChannelId);
      
      await this.sendMessage(
        event.invoker.clid, 
        `Joined channel ${invoker.channelName || targetChannelId}`
      );
    } catch (error) {
      logger.error(`Error in join: ${error.message}`);
      await this.sendMessage(event.invoker.clid, "Failed to join channel.");
    }
  }
}

module.exports = CommandHandler;