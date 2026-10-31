const express = require("express");
const router = express.Router();
const SiteSettings = require("../models/SiteSettings");
const { sendEmergencyOrderEmail, sendRegularOrderEmail } = require("../services/emailService");
const logger = require("../utils/logger");

/**
 * @swagger
 * /orders/emergency:
 *   post:
 *     summary: Submit emergency ice delivery request
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyName
 *               - contactPerson
 *               - phone
 *               - email
 *               - address
 *               - city
 *               - state
 *               - zip
 *               - requestDate
 *               - deliveryTime
 *               - iceType
 *               - quantity
 *               - storageUnit
 *     responses:
 *       200:
 *         description: Order submitted successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post("/emergency", async (req, res) => {
  try {
    const {
      companyName,
      contactPerson,
      phone,
      email,
      street,
      city,
      state,
      zip,
      dateOfRequest,
      preferredDeliveryTime,
      products,
      storageUnitNeeded,
      specialInstructions,
    } = req.body;

    // Validate required fields
    if (!companyName || !contactPerson || !phone || !street || !city || !state || !zip || 
        !dateOfRequest || !preferredDeliveryTime || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    // Validate email format if provided
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Get settings to retrieve order email
    const settings = await SiteSettings.getSettings();
    const recipientEmail = settings.emailSettings?.orderFormsEmail || "moe@icemansice.com";

    // Send email
    await sendEmergencyOrderEmail(req.body, recipientEmail);

    logger.info(`Emergency order request submitted from ${companyName} (${email})`);

    res.json({
      success: true,
      message: "Your emergency ice delivery request has been submitted successfully! We'll contact you shortly.",
    });
  } catch (error) {
    logger.error("Error processing emergency order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit order. Please call us directly at 407-310-5007.",
    });
  }
});

/**
 * @swagger
 * /orders/regular:
 *   post:
 *     summary: Submit regular customer order request
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *               - contact
 *               - productType
 *               - deliveryDay
 *     responses:
 *       200:
 *         description: Order submitted successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post("/regular", async (req, res) => {
  try {
    const { name, address, phone, email, products, requestedDeliveryDay, additionalNotes } = req.body;

    // Validate required fields
    if (!name || !address || !phone || !products || !Array.isArray(products) || products.length === 0 || !requestedDeliveryDay) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    // Validate email format if provided
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Get settings to retrieve order email
    const settings = await SiteSettings.getSettings();
    const recipientEmail = settings.emailSettings?.orderFormsEmail || "moe@icemansice.com";

    // Send email
    await sendRegularOrderEmail(req.body, recipientEmail);

    logger.info(`Regular order request submitted from ${name} (${email})`);

    res.json({
      success: true,
      message: "Your order request has been submitted successfully! We'll process it shortly.",
    });
  } catch (error) {
    logger.error("Error processing regular order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit order. Please call us directly at 407-310-5007.",
    });
  }
});

module.exports = router;
