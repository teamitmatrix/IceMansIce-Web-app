const express = require("express");
const crypto = require("crypto");
const Joi = require("joi");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const config = require("../config");
const logger = require("../utils/logger");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/rbac");
const { getDAL } = require("../dal");
const { sendPasswordResetEmail } = require("../services/emailService");

const router = express.Router();

// Helper: join address object into a single string
function joinAddress(addr) {
  if (!addr) return "";
  if (typeof addr === "string") return addr.trim();
  try {
    const { street, city, stateZip, state, zipCode, country } = addr || {};
    // Prefer new combined stateZip field; fall back to old state + zipCode
    const statePart = stateZip || [state, zipCode].filter(Boolean).join(" ").trim();
    return [street, city, statePart, country]
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean)
      .join(", ");
  } catch {
    return "";
  }
}

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  licenseNumber: Joi.string().optional(),
  vehicleInfo: Joi.string().optional(),
  isActive: Joi.boolean().optional(),
  phone: Joi.string()
    .pattern(/^\+?[0-9]+$/)
    .min(10)
    .required(),
  address: Joi.alternatives().try(
    Joi.string().min(3),
    Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      stateZip: Joi.string().required(),
      country: Joi.string().optional(),
    })
  ).optional(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid("customer", "driver", "admin").required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
  role: Joi.string().valid("customer", "driver", "admin").optional(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
  confirmPassword: Joi.string().valid(Joi.ref("newPassword")).required().messages({
    "any.only": "Passwords do not match",
  }),
});

router.post("/register", async (req, res, next) => {
  try {
    console.log("Registration request body:", req.body);

    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      console.log("Validation error:", error.details[0].message);
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const dal = getDAL();
    // Normalize email to lowercase and trim to avoid case/whitespace mismatches
    const normalizedEmail = String(value.email).trim().toLowerCase();
    
    // Check email uniqueness (email is required by schema, but check explicitly for safety)
    if (normalizedEmail && normalizedEmail.length > 0) {
      const existingUser = await dal.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(409).json({
          error: "User already exists",
          message: "Email is already registered",
        });
      }
    }

    // Normalize role casing before creating user
    const role = String(value.role).toLowerCase();
    // Normalize address to a single string for storage
    const addressString = joinAddress(value.address);
    const newUserData = { ...value, role, address: addressString };
    
    // Only include email if not empty (sparse index requires undefined, not empty string)
    if (normalizedEmail && normalizedEmail.length > 0) {
      newUserData.email = normalizedEmail;
    }
    
    console.log("Creating user with data:", newUserData);
    // Create user without email verification
    const user = await dal.createUser({
      ...newUserData
    });

    // If the user is a customer, create a corresponding customer record
    if (user.role === "customer") {
      console.log("Creating customer record for user:", user.id);
      const customerData = {
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: typeof user.address === 'string' ? user.address : joinAddress(user.address),
        paymentTerms: "net30",
        creditLimit: 1000,
        isActive: true,
      };

      try {
        await dal.createCustomer(customerData);
        console.log("Customer record created successfully");
      } catch (customerError) {
        console.error("Failed to create customer record:", customerError);
        // Continue with user creation even if customer creation fails
      }
    }

    // Send success response without email verification
    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error("Registration error:", { error, message: error.message, stack: error.stack });
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    try {
      const dal = getDAL();
      const normalizedEmail = String(value.email).trim().toLowerCase();
      const user = await dal.getUserByEmail(normalizedEmail);
      if (!user) {
        logger.error("Login failed: User not found", { email: normalizedEmail });
        return res.status(401).json({
          error: "Authentication failed",
          message: "Invalid email or password",
          code: "USER_NOT_FOUND",
        });
      }

      // Role is optional: proceed based on stored role; if provided and mismatched, still continue
      const requestedRole = value.role
        ? String(value.role).toLowerCase()
        : undefined;
      const storedRole = String(user.role || "").toLowerCase();



      const isValidPassword = await bcrypt.compare(value.password, user.password);
      if (!isValidPassword) {
        logger.error("Login failed: Invalid password", { userId: user.id, email: user.email });
        return res.status(401).json({
          error: "Authentication failed",
          message: "Invalid email or password",
          code: "INVALID_PASSWORD",
        });
      }

      const accessToken = jwt.sign(
        { userId: user.id, email: user.email, role: storedRole },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      const refreshToken = jwt.sign(
        { userId: user.id, type: "refresh" },
        config.jwt.refreshSecret,
        { expiresIn: config.jwt.refreshExpiresIn }
      );

      logger.info("User logged in successfully", {
        userId: user.id,
        email: user.email,
      });

      const userJson = typeof user.toJSON === "function" ? user.toJSON() : user;

      res.json({
        message: "Login successful",
        user: {
          id: userJson.id || user.id,
          name: userJson.name || user.name,
          email: userJson.email || user.email,
          phone: userJson.phone || user.phone,
          address: userJson.address || user.address,
          addressString:
            userJson.addressString ||
            (typeof user.address === "string" ? user.address : undefined),
          role: storedRole,
        },
        accessToken,
        refreshToken,
      });
    } catch (error) {
      logger.error("Login error (inner):", { error, message: error.message, stack: error.stack });
      next(error);
    }
  } catch (error) {
    logger.error("Login error (outer):", { error, message: error.message, stack: error.stack });
    next(error);
  }
});


// Request a password reset email (Resend). Always returns a generic success
// message so callers cannot probe whether an email is registered.
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const genericMessage =
      "If an account exists for that email, a password reset link has been sent.";

    const dal = getDAL();
    const normalizedEmail = String(value.email).trim().toLowerCase();
    const user = await dal.getUserByEmail(normalizedEmail);

    if (!user) {
      return res.json({ success: true, message: genericMessage });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const frontendBase = (config.frontend.url || "https://icemansice.com").replace(
      /\/$/,
      ""
    );
    const resetUrl = `${frontendBase}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetUrl, user.name);
      logger.info("Password reset email sent", { userId: user.id, email: user.email });
    } catch (emailError) {
      logger.error("Failed to send password reset email", {
        userId: user.id,
        email: user.email,
        error: emailError.message,
        statusCode: emailError.statusCode,
        resendError: emailError.resendError,
      });
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      return res.status(503).json({
        error: "Email Delivery Failed",
        message: "Unable to send password reset email. Please try again later.",
        // Include Resend reason in non-production to speed up debugging
        ...(config.server.env !== "production"
          ? { detail: emailError.message }
          : {}),
      });
    }

    return res.json({ success: true, message: genericMessage });
  } catch (err) {
    next(err);
  }
});

// Complete password reset using the one-time token from the email link
router.post("/reset-password", async (req, res, next) => {
  try {
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(value.token)
      .digest("hex");

    const User = require("../models/User");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        error: "Invalid Token",
        message: "This password reset link is invalid or has expired.",
      });
    }

    // Assign plain password; User pre-save hook hashes it once
    user.password = value.newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    logger.info("Password reset completed", { userId: user.id, email: user.email });

    return res.json({
      message: "Password has been reset successfully",
      success: true,
    });
  } catch (err) {
    next(err);
  }
});



router.post("/refresh", async (req, res, next) => {
  try {
    const { error, value } = refreshSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: "Validation Error",
        message: error.details[0].message,
      });
    }

    const decoded = jwt.verify(value.refreshToken, config.jwt.refreshSecret);
    if (decoded.type !== "refresh") {
      return res.status(401).json({
        error: "Invalid token",
        message: "Invalid refresh token",
      });
    }

    const dal = getDAL();
    const user = await dal.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: "Invalid token",
        message: "User not found",
      });
    }

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      message: "Token refreshed successfully",
      accessToken,
    });
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        error: "Invalid token",
        message: "Invalid or expired refresh token",
      });
    }
    next(error);
  }
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const dal = getDAL();
    const user = await dal.getUserById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        error: "User not found",
        message: "User profile not found",
      });
    }
    console.log("Authenticated user:", user);
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
        createdAt: user.createdAt,

      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
