const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema(
  {
    routeNumber: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    truckId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Truck",
    },
    status: {
      type: String,
      enum: ["planned", "in_progress", "completed", "cancelled"],
      default: "planned",
    },
    stops: [
      {
        customerId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Customer",
          required: true,
        },
        sequence: {
          type: Number,
          required: true,
        },
        estimatedArrival: {
          type: Date,
        },
        actualArrival: {
          type: Date,
        },
        estimatedDeparture: {
          type: Date,
        },
        actualDeparture: {
          type: Date,
        },
        status: {
          type: String,
          enum: ["pending", "in_progress", "completed", "skipped"],
          default: "pending",
        },
        notes: {
          type: String,
          maxlength: 500,
        },
        orders: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SalesOrder",
          },
        ],
        deliveries: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SalesOrder",
          },
        ],
        pickups: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SalesOrder",
          },
        ],
      },
    ],
    startLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
      address: String,
    },
    endLocation: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
      address: String,
    },
    estimatedDistance: {
      type: Number,
      min: 0,
    },
    actualDistance: {
      type: Number,
      min: 0,
    },
    estimatedDuration: {
      type: Number,
      min: 0,
    },
    actualDuration: {
      type: Number,
      min: 0,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
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

routeSchema.index({ routeNumber: 1 }, { unique: true });
routeSchema.index({ date: 1 });
routeSchema.index({ driverId: 1 });
routeSchema.index({ truckId: 1 });
routeSchema.index({ status: 1 });
routeSchema.index({ "stops.customerId": 1 });

routeSchema.virtual("efficiency").get(function () {
  if (!this.estimatedDuration || this.actualDuration === 0) return null;
  return (this.estimatedDuration / this.actualDuration) * 100;
});

routeSchema.virtual("completionPercentage").get(function () {
  if (!this.stops.length) return 0;
  const completed = this.stops.filter(
    (stop) => stop.status === "completed"
  ).length;
  return (completed / this.stops.length) * 100;
});

routeSchema.virtual("totalStops").get(function () {
  return this.stops.length;
});

routeSchema.virtual("completedStops").get(function () {
  return this.stops.filter((stop) => stop.status === "completed").length;
});

routeSchema.methods.startRoute = function () {
  this.status = "in_progress";
  this.startTime = new Date();
  return this.save();
};

routeSchema.methods.completeRoute = function () {
  this.status = "completed";
  this.endTime = new Date();
  if (this.startTime) {
    this.actualDuration = (this.endTime - this.startTime) / (1000 * 60);
  }
  return this.save();
};

routeSchema.methods.addStop = function (customerId, sequence) {
  this.stops.push({
    customerId,
    sequence,
    status: "pending",
  });
  return this.save();
};

routeSchema.methods.updateStopStatus = function (
  customerId,
  status,
  notes = ""
) {
  const stop = this.stops.find(
    (s) => s.customerId.toString() === customerId.toString()
  );
  if (stop) {
    stop.status = status;
    stop.notes = notes;
    if (status === "in_progress" && !stop.actualArrival) {
      stop.actualArrival = new Date();
    } else if (status === "completed" && !stop.actualDeparture) {
      stop.actualDeparture = new Date();
    }
  }
  return this.save();
};

routeSchema.statics.generateRouteNumber = async function (date) {
  const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
  const lastRoute = await this.findOne({
    routeNumber: { $regex: `^RT-${dateStr}-` },
  }).sort({ routeNumber: -1 });

  const lastNumber = lastRoute
    ? parseInt(lastRoute.routeNumber.split("-")[2])
    : 0;

  return `RT-${dateStr}-${String(lastNumber + 1).padStart(3, "0")}`;
};

routeSchema.statics.findByDriver = function (driverId, date) {
  const query = { driverId };
  if (date) {
    query.date = {
      $gte: new Date(date.setHours(0, 0, 0, 0)),
      $lt: new Date(date.setHours(23, 59, 59, 999)),
    };
  }
  return this.find(query).sort({ date: 1, routeNumber: 1 });
};

routeSchema.statics.findActive = function () {
  return this.find({
    status: { $in: ["planned", "in_progress"] },
  }).populate("driverId", "name email");
};

routeSchema.set("toJSON", {
  virtuals: true,
});

module.exports = mongoose.model("Route", routeSchema);
