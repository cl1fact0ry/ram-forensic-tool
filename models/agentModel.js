import mongoose from 'mongoose';

const AgentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  os: {
    type: String,
    required: true,
    enum: ['Windows', 'Linux', 'MacOS'],
    default: 'Windows'
  },
  ipAddress: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending'],
    default: 'active'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  systemInfo: {
    cpuCores: { type: Number },
    totalMemory: { type: Number },
    architecture: { type: String },
    hostname: { type: String },
    username: { type: String },
    platform: { type: String },
    pythonVersion: { type: String },
    additionalInfo: { type: mongoose.Schema.Types.Mixed } // for any extra info
  },
  registeredAt: {
    type: Date,
    default: Date.now
  },
  agentDataHistory: [{
    ramData: {
      total: Number,
      available: Number,
      used: Number,
      percent: Number,
      free: Number,
      timestamp: Date
    },
    processData: [{
      pid: Number,
      name: String,
      cpuPercent: Number,
      memoryPercent: Number,
      username: String,
      status: String
    }],
    collectedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Create and export the model
const Agent = mongoose.model('Agent', AgentSchema);

export default Agent;
