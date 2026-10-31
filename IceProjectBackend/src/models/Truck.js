const mongoose = require("mongoose");

const truckSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 10,
    },
    licensePlate: {
      type: String,
      trim: true,
      uppercase: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    capacity: {
      type: Number,
      min: 0,
    },
    currentLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isInService: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    clientId: {
      type: String,
      sparse: true,
    },
    clientVersion: {
      type: Number,
      default: 0,
    },
    serverVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);
truckSchema.index({ code: 1 }, { unique: true });
truckSchema.index({ name: 1 });
truckSchema.index({ driverId: 1 });
truckSchema.index({ isActive: 1 });
truckSchema.index({ isInService: 1 });
truckSchema.index({ currentLocation: "2dsphere" });

truckSchema.virtual("driverName").get(function () {
  return this.driverId ? this.driverId.name : null;
});

truckSchema.virtual("currentLoad").get(function () {
  return 0;
});

truckSchema.methods.assignDriver = function (driverId) {
  this.driverId = driverId;
  return this.save();
};

truckSchema.methods.updateLocation = function (latitude, longitude) {
  this.currentLocation.coordinates = [longitude, latitude];
  return this.save();
};

truckSchema.methods.setOutOfService = function (reason) {
  this.isInService = false;
  this.notes = reason;
  return this.save();
};

truckSchema.statics.findAvailable = function () {
  return this.find({
    isActive: true,
    isInService: true,
  }).populate("driverId", "name email");
};

truckSchema.statics.findByDriver = function (driverId) {
  return this.find({ driverId });
};

truckSchema.statics.findNearLocation = function (
  longitude,
  latitude,
  maxDistance = 10000
) {
  return this.find({
    currentLocation: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
    isActive: true,
    isInService: true,
  });
};

truckSchema.set("toJSON", {
  virtuals: true,
});

module.exports = mongoose.model("Truck", truckSchema);
