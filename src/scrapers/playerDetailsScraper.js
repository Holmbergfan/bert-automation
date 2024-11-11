// src/scrapers/playerDetailsScraper.js

const axios = require('axios');
const cheerio = require('cheerio');
const Bottleneck = require('bottleneck');
const Player = require('../models/Player');
const config = require('../config/config');
const logger = require('../utils/logger');

const limiter = new Bottleneck({
  minTime: 2000, // 2 seconds between requests
});

const fetchPlayerDetails = async (player) => {
  try {
    const response = await axios.get(`${config.baseUrl}/?subtopic=characters&name=${encodeURIComponent(player.name)}`);
    const html = response.data;
    const $ = cheerio.load(html);

    // Initialize an object to hold extracted data
    const extractedData = {};

    // Function to extract text based on field name
    const extractField = (fieldName) => {
      const field = $(`td:contains("${fieldName}")`).next().text().trim();
      return field || null;
    };

    // Extract basic information
    extractedData.name = extractField('Name:');
    extractedData.sex = extractField('Sex:');
    extractedData.profession = extractField('Profession:');
    extractedData.level = parseInt(extractField('Level:')) || 0;
    extractedData.residence = extractField('Residence:');
    extractedData.house = extractField('House:');
    extractedData.guildMembership = extractField('Guild Membership:');
    extractedData.lastLogin = extractField('Last login:');
    extractedData.accountStatus = extractField('Account Status:');

    // Extract Character Deaths
    const deaths = [];
    $('div#characters .BoxContentContainer table.TableContent.InnerBorder tr').each((index, element) => {
      if (index === 0) return; // Skip header row
      const date = $(element).find('td').eq(0).text().trim();
      const description = $(element).find('td').eq(1).text().trim();
      if (date && description) {
        deaths.push({ date, description });
      }
    });
    extractedData.deaths = deaths;

    // Extract Other Characters on the Account
    const otherCharacters = [];
    $('div#characters .BoxContentContainer table.Table12.InnerBorder tr').each((index, element) => {
      if (index === 0) return; // Skip header row
      const name = $(element).find('td').eq(0).text().replace(/\d+\.\s*/, '').trim(); // Remove numbering
      const levelVoc = $(element).find('td').eq(1).text().trim();
      const status = $(element).find('td').eq(2).text().trim();
      const viewButton = $(element).find('td').eq(3).find('button').text().trim();
      if (name && levelVoc && status && viewButton) {
        otherCharacters.push({ name, levelVoc, status, viewButton });
      }
    });
    extractedData.otherCharacters = otherCharacters;

    // Update the player document
    player.name = extractedData.name || player.name;
    player.sex = extractedData.sex || player.sex;
    player.profession = extractedData.profession || player.profession;
    player.level = extractedData.level || player.level;
    player.residence = extractedData.residence || player.residence;
    player.house = extractedData.house || player.house;
    player.guildMembership = extractedData.guildMembership || player.guildMembership;
    player.lastLogin = extractedData.lastLogin ? new Date(extractedData.lastLogin) : player.lastLogin;
    player.accountStatus = extractedData.accountStatus || player.accountStatus;
    player.deaths = extractedData.deaths || player.deaths;
    player.otherCharacters = extractedData.otherCharacters || player.otherCharacters;
    player.lastUpdated = new Date();
    await player.save();

    logger.info(`Updated details for player ${player.name}`);
  } catch (error) {
    logger.error(`Error fetching details for player ${player.name}: ${error.message}`);
  }
};

const scrapePlayerDetails = async () => {
  try {
    // Fetch players who haven't been updated recently
    const playersToUpdate = await Player.find({
      $or: [
        { lastUpdated: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }, // Older than 24 hours
        { lastUpdated: { $exists: false } },
      ],
    });

    logger.info(`Updating details for ${playersToUpdate.length} players`);

    // Use the limiter to schedule requests
    playersToUpdate.forEach((player) => {
      limiter.schedule(() => fetchPlayerDetails(player));
    });
  } catch (error) {
    logger.error(`Error in player details scraper: ${error.message}`);
  }
};

module.exports = scrapePlayerDetails;
