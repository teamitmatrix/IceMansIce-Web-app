const mongoose = require("mongoose");

const driverSessionSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
    },
    deviceInfo: {
      type: {
        type: String,
        enum: ["mobile", "tablet", "desktop"],
        default: "mobile",
      },
      model: String,
      os: String,
      browser: String,
    },
    location: {
      latitude: {
        type: Number,
        min: -90,
        max: 90,
      },
      longitude: {
        type: Number,
        min: -180,
        max: 180,
      },
      accuracy: Number,
      timestamp: Date,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "on_route", "break"],
      default: "active",
    },
    shiftStartTime: {
      type: Date,
      default: Date.now,
    },
    shiftEndTime: {
      type: Date,
    },
    totalOrdersProcessed: {
      type: Number,
      default: 0,
    },
    totalAmountCollected: {
      type: Number,
      default: 0,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

driverSessionSchema.index({ driverId: 1 });
driverSessionSchema.index({ deviceId: 1 });
driverSessionSchema.index({ status: 1 });
driverSessionSchema.index({ isActive: 1 });
driverSessionSchema.index({ shiftStartTime: 1 });

driverSessionSchema.virtual("sessionDuration").get(function () {
  const endTime = this.shiftEndTime || new Date();
  const duration = endTime - this.shiftStartTime;
  return Math.floor(duration / 1000 / 60); // Duration in minutes
});

driverSessionSchema.methods.updateLocation = function (latitude, longitude, accuracy) {
  this.location = {
    latitude,
    longitude,
    accuracy,
    timestamp: new Date(),
  };
  this.lastActivity = new Date();
  return this.save();
};

driverSessionSchema.methods.endShift = function () {
  this.shiftEndTime = new Date();
  this.status = "inactive";
  this.isActive = false;
  return this.save();
};

driverSessionSchema.methods.addOrderProcessed = function (orderAmount) {
  this.totalOrdersProcessed += 1;
  this.totalAmountCollected += orderAmount;
  this.lastActivity = new Date();
  return this.save();
};

driverSessionSchema.statics.getActiveSession = function (driverId, deviceId) {
  return this.findOne({
    driverId,
    deviceId,
    isActive: true,
  });
};

driverSessionSchema.statics.getDriverStats = function (driverId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        driverId: new mongoose.Types.ObjectId(driverId),
        shiftStartTime: {
          $gte: startDate,
          $lte: endDate,
        },
      },
    },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        totalOrders: { $sum: "$totalOrdersProcessed" },
        totalAmount: { $sum: "$totalAmountCollected" },
        totalMinutes: {
          $sum: {
            $divide: [
              {
                $subtract: [
                  { $ifNull: ["$shiftEndTime", new Date()] },
                  "$shiftStartTime",
                ],
              },
              1000 * 60,
            ],
          },
        },
      },
    },
  ]);
};

module.exports = mongoose.model("DriverSession", driverSessionSchema);