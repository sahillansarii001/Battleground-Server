import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    communityLink: {
      type: String,
      default: "https://t.me/+sT2Jb1LqB_VlMzE1",
    },
    prizePool: {
      type: String,
      default: "50K",
    },
    pointsSystem: {
      perKill: { type: Number, default: 1 },
      placementPoints: {
        type: Map,
        of: Number,
        default: {
          1: 10,
          2: 6,
          3: 5,
          4: 4,
        },
      },
    },
    maps: {
      type: [String],
      default: ["ERANGEL", "MIRAMAR", "SANHOK", "VIKENDI"],
    },
    testingMode: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Settings", settingsSchema);
