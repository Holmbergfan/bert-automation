// src/scrapers/deathRecorder.js

const axios = require('axios');
const cheerio = require('cheerio');
const Death = require('../models/Death');
const config = require('../config/config'); // Ensure this has baseUrl or relevant configs
const logger = require('../utils/logger');

const scrapeDeathRecorder = async () => {
  try {
    const response = await axios.get(`${config.baseUrl}/?subtopic=latestdeaths`);
    const html = response.data;
    const $ = cheerio.load(html);

    // Selector for the deaths table
    const deathsTable = $('div#ContentColumn table.TableContent.InnerBorder');

    if (!deathsTable.length) {
      logger.error('No deaths table found on the page.');
      return;
    }

    const newDeaths = [];

    // Iterate over each table row excluding the header
    deathsTable.find('tr').each((index, element) => {
      if (index === 0) return; // Skip header row if present

      const columns = $(element).find('td');

      if (columns.length < 2) return; // Ensure there are enough columns

      const timestampStr = $(columns[0]).text().trim(); // e.g., "28.10.2024, 18:58:10"
      const deathDescription = $(columns[1]).html(); // HTML content for the death description

      // Parse the timestamp
      const timestamp = parseTimestamp(timestampStr);
      if (!timestamp) {
        logger.warn(`Invalid timestamp format: ${timestampStr}`);
        return;
      }

      // Parse the death description
      const { victim, killer, victimLevel, killerLevel, reason, isTeammateKill } = parseDeathDescription(deathDescription);

      if (!victim || !killer || !victimLevel) {
        logger.warn(`Incomplete death data: Victim - ${victim}, Killer - ${killer}`);
        return;
      }

      // Check for duplicate deaths (optional: based on timestamp and victim)
      // Adjust the uniqueness criteria as needed
      newDeaths.push({
        victim,
        killer,
        victimLevel,
        killerLevel,
        timestamp,
        reason,
        isTeammateKill,
      });
    });

    // Filter out already recorded deaths
    const deathsToInsert = [];

    for (const death of newDeaths) {
      const exists = await Death.findOne({
        victim: death.victim,
        killer: death.killer,
        timestamp: death.timestamp,
      });

      if (!exists) {
        deathsToInsert.push(death);
      }
    }

    if (deathsToInsert.length > 0) {
      await Death.insertMany(deathsToInsert);
      logger.info(`Recorded ${deathsToInsert.length} new deaths.`);
    } else {
      logger.info('No new deaths to record.');
    }

    logger.info('Death Recorder scraper executed successfully.');
  } catch (error) {
    logger.error(`Error in Death Recorder scraper: ${error.message}`);
  }
};

// Helper function to parse timestamp string to Date object
const parseTimestamp = (timestampStr) => {
  // Expected format: "28.10.2024, 18:58:10"
  const [datePart, timePart] = timestampStr.split(',');
  if (!datePart || !timePart) return null;

  const [day, month, year] = datePart.trim().split('.');
  const [hours, minutes, seconds] = timePart.trim().split(':');

  if (!day || !month || !year || !hours || !minutes || !seconds) return null;

  return new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`);
};

// Helper function to parse death description HTML
const parseDeathDescription = (descriptionHtml) => {
  const $ = cheerio.load(descriptionHtml);
  const victimAnchor = $('b a').first();
  const victim = victimAnchor.text().trim();

  let killer = '';
  let killerLevel = null;
  let reason = '';
  let isTeammateKill = false;

  const killerAnchor = $('b a').last();
  if (killerAnchor.length > 0) {
    killer = killerAnchor.text().trim();
    // Optionally, fetch killer level if needed by scraping their character page
    // For simplicity, we'll skip fetching killerLevel in this example
  } else {
    // Killer is an entity (e.g., "Minotaur Archer", "Wolf", "field item")
    killer = $(descriptionHtml).text().split(' killed at level ')[1].split(' by ')[1].trim().split(' (')[0];
  }

  // Extract victim level
  const levelMatch = $(descriptionHtml).text().match(/killed at level (\d+)/i);
  if (levelMatch && levelMatch[1]) {
    killerLevel = parseInt(levelMatch[1]);
  }

  // Check for "Unjustified" or other reasons
  const reasonMatch = $(descriptionHtml).text().match(/\(([^)]+)\)/);
  if (reasonMatch && reasonMatch[1]) {
    reason = reasonMatch[1].trim();
    if (reason.toLowerCase().includes('unjustified')) {
      isTeammateKill = true; // Example: Treat 'Unjustified' as teammate kill
    }
  }

  return { victim, killer, victimLevel: killerLevel || null, killerLevel: killerLevel || null, reason, isTeammateKill };
};

module.exports = scrapeDeathRecorder;
