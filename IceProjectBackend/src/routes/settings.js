const express = require("express");
const router = express.Router();
const SiteSettings = require("../models/SiteSettings");
const { authenticate } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const logger = require("../utils/logger");

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Get site settings (public)
 *     tags: [Settings]
 *     responses:
 *       200:
 *         description: Site settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SiteSettings'
 *       500:
 *         description: Server error
 */
router.get("/", async (req, res) => {
  try {
    const settings = await SiteSettings.getSettings();
    
    // Add no-cache headers to prevent stale data
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    // Return only public-facing settings
    res.json({
      contactInfo: settings.contactInfo,
      companyInfo: settings.companyInfo,
      socialMedia: settings.socialMedia,
    });
  } catch (error) {
    logger.error("Error fetching settings:", error);
    res.status(500).json({ 
      message: "Failed to fetch settings",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @swagger
 * /settings:
 *   put:
 *     summary: Update site settings (admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contactInfo:
 *                 type: object
 *                 properties:
 *                   phone:
 *                     type: string
 *                   email:
 *                     type: string
 *                   address:
 *                     type: string
 *                   emergencyPhone:
 *                     type: string
 *                   hours:
 *                     type: string
 *               companyInfo:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   tagline:
 *                     type: string
 *                   description:
 *                     type: string
 *               socialMedia:
 *                 type: object
 *                 properties:
 *                   facebook:
 *                     type: string
 *                   twitter:
 *                     type: string
 *                   instagram:
 *                     type: string
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.put(
  "/",
  authenticate,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const { contactInfo, companyInfo, socialMedia, emailSettings } = req.body;
      
      logger.info(`Settings update request from user ${req.user.id}:`, {
        contactInfo,
        companyInfo,
        socialMedia,
        emailSettings
      });
      
      // Validate email if provided
      if (contactInfo?.email && !/^\S+@\S+\.\S+$/.test(contactInfo.email)) {
        return res.status(400).json({ message: "Invalid contact email format" });
      }
      
      // Validate order forms email if provided
      if (emailSettings?.orderFormsEmail && !/^\S+@\S+\.\S+$/.test(emailSettings.orderFormsEmail)) {
        return res.status(400).json({ message: "Invalid order forms email format" });
      }
      
      const updates = {};
      if (contactInfo) updates.contactInfo = contactInfo;
      if (companyInfo) updates.companyInfo = companyInfo;
      if (socialMedia) updates.socialMedia = socialMedia;
      if (emailSettings) updates.emailSettings = emailSettings;
      
      const settings = await SiteSettings.updateSettings(updates, req.user.id);
      
      logger.info(`Settings updated successfully by user ${req.user.id}. New values:`, {
        contactInfo: settings.contactInfo,
        companyInfo: settings.companyInfo,
        socialMedia: settings.socialMedia,
        emailSettings: settings.emailSettings
      });
      
      res.json({
        message: "Settings updated successfully",
        settings: {
          contactInfo: settings.contactInfo,
          companyInfo: settings.companyInfo,
          socialMedia: settings.socialMedia,
          emailSettings: settings.emailSettings,
        },
      });
    } catch (error) {
      logger.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  }
);

/**
 * @swagger
 * /settings/admin:
 *   get:
 *     summary: Get all settings including metadata (admin only)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full settings with metadata
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.get(
  "/admin",
  authenticate,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      // getSettings will auto-create if doesn't exist
      const settings = await SiteSettings.getSettings();
      
      // Try to populate updatedBy if it exists
      if (settings.updatedBy) {
        await settings.populate("updatedBy", "username email");
      }
      
      res.json(settings);
    } catch (error) {
      logger.error("Error fetching admin settings:", error);
      res.status(500).json({ 
        message: "Failed to fetch settings",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

/**
 * @swagger
 * /settings/initialize:
 *   post:
 *     summary: Initialize settings (creates default settings if not exist)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Settings initialized successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient role
 */
router.post(
  "/initialize",
  authenticate,
  requireRole(["admin"]),
  async (req, res) => {
    try {
      const settings = await SiteSettings.getSettings();
      logger.info(`Settings initialized by user ${req.user.id}`);
      
      res.json({
        message: "Settings initialized successfully",
        settings: {
          contactInfo: settings.contactInfo,
          companyInfo: settings.companyInfo,
          socialMedia: settings.socialMedia,
        },
      });
    } catch (error) {
      logger.error("Error initializing settings:", error);
      res.status(500).json({ 
        message: "Failed to initialize settings",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

module.exports = router;
