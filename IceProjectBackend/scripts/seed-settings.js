#!/usr/bin/env node

/**
 * Database Seed Script - Site Settings
 * 
 * This script initializes the site settings in the database.
 * Run with: node scripts/seed-settings.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const SiteSettings = require("../src/models/SiteSettings");
const logger = require("../src/utils/logger");

const seedSettings = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not set");
    }

    logger.info("Connecting to MongoDB...");
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info("Connected to MongoDB");

    // Check if settings already exist
    const existingSettings = await SiteSettings.findOne({ key: "global" });
    
    if (existingSettings) {
      logger.info("Site settings already exist. Skipping seed.");
      console.log("\nCurrent settings:");
      console.log(JSON.stringify(existingSettings, null, 2));
      process.exit(0);
    }

    // Create default settings
    logger.info("Creating default site settings...");
    const settings = await SiteSettings.create({
      key: "global",
      contactInfo: {
        phone: "407-310-5007",
        email: "moe@icemansice.com",
        address: "501 Florida Central Pkwy Unit 521952, Longwood, FL 32750-5153",
        emergencyPhone: "407-310-5007",
        hours: "Mon-Fri: 6AM-8PM, Sat-Sun: 7AM-6PM",
      },
      companyInfo: {
        name: "IceMan's Ice",
        tagline: "Fresh Ice Delivered to Your Doorstep",
        description:
          "Pure, clean, and crystal-clear ice blocks and cubes for events, restaurants, and home.",
      },
      socialMedia: {
        facebook: "",
        twitter: "",
        instagram: "",
      },
    });

    logger.info("✓ Default site settings created successfully!");
    console.log("\nSettings created:");
    console.log(JSON.stringify(settings, null, 2));
    
    console.log("\n✓ Database seeding completed successfully!");
    console.log("\nYou can now:");
    console.log("1. View the landing page to see the contact information");
    console.log("2. Login as admin and go to /admin/settings to edit the settings");
    
    process.exit(0);
  } catch (error) {
    logger.error("Error seeding database:", error);
    console.error("\n✗ Database seeding failed!");
    console.error(error.message);
    process.exit(1);
  }
};

// Run the seed
seedSettings();
