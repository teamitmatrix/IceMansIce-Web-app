const mongoose = require("mongoose");

/**
 * @swagger
 * components:
 *   schemas:
 *     SiteSettings:
 *       type: object
 *       properties:
 *         key:
 *           type: string
 *           description: Unique key for the settings group
 *         contactInfo:
 *           type: object
 *           properties:
 *             phone:
 *               type: string
 *             email:
 *               type: string
 *             address:
 *               type: string
 *             emergencyPhone:
 *               type: string
 *             hours:
 *               type: string
 *         companyInfo:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             tagline:
 *               type: string
 *             description:
 *               type: string
 *         emailSettings:
 *           type: object
 *           properties:
 *             orderFormsEmail:
 *               type: string
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         updatedBy:
 *           type: string
 */
const siteSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "global",
      enum: ["global"], // Only one settings document
    },
    contactInfo: {
      phone: {
        type: String,
        required: true,
        trim: true,
        default: "407-310-5007",
      },
      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        default: "moe@icemansice.com",
        match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
      },
      address: {
        type: String,
        required: true,
        default: "501 Florida Central Pkwy Unit 521952, Longwood, FL 32750-5153",
      },
      emergencyPhone: {
        type: String,
        trim: true,
        default: "407-310-5007",
      },
      hours: {
        type: String,
        default: "Mon-Fri: 6AM-8PM, Sat-Sun: 7AM-6PM",
      },
    },
    companyInfo: {
      name: {
        type: String,
        default: "IceMan's Ice",
      },
      tagline: {
        type: String,
        default: "Fresh Ice Delivered to Your Doorstep",
      },
      description: {
        type: String,
        default:
          "Pure, clean, and crystal-clear ice blocks and cubes for events, restaurants, and home.",
      },
    },
    emailSettings: {
      orderFormsEmail: {
        type: String,
        trim: true,
        lowercase: true,
        default: "moe@icemansice.com",
        match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
      },
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Ensure only one settings document exists
siteSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ key: "global" });
  if (!settings) {
    // Create default settings if they don't exist
    settings = await this.create({
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
    });
  }
  return settings;
};

siteSettingsSchema.statics.updateSettings = async function (updates, userId) {
  const settings = await this.getSettings();
  
  // Merge updates with existing settings
  if (updates.contactInfo) {
    Object.assign(settings.contactInfo, updates.contactInfo);
    settings.markModified('contactInfo'); // Mark nested object as modified
  }
  if (updates.companyInfo) {
    Object.assign(settings.companyInfo, updates.companyInfo);
    settings.markModified('companyInfo'); // Mark nested object as modified
  }
  if (updates.emailSettings) {
    Object.assign(settings.emailSettings, updates.emailSettings);
    settings.markModified('emailSettings'); // Mark nested object as modified
  }
  
  settings.updatedBy = userId;
  await settings.save();
  
  return settings;
};

module.exports = mongoose.model("SiteSettings", siteSettingsSchema);
