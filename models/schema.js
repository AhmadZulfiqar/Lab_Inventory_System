const mongoose = require('mongoose');
const systemSchema = new mongoose.Schema({
  labRoom: { 
    type: String, 
    required: true, 
    // enum: ['Lab 1', 'Lab 2', 'Lab 3', 'Lab 4'] 
  },
  specs: {
    processor: { type: String, default: 'i5 8th Gen' },
    ram: { type: String, default: '8GB' },
    SSD: { type: String,  },
    HDD: { type: String,  }
  },
  // Adding Mouse and Keyboard here
  peripherals: {
    mouse: {
      status: { 
        type: String, 
        // enum: ['Functional', 'Faulty', 'Missing'], 
        default: 'Functional' 
      }
    },
    keyboard: {
      status: { 
        type: String, 
        // enum: ['Functional', 'Faulty', 'Missing'], 
        default: 'Functional' 
      }
    }
  },
  
});
const System = mongoose.model('System', systemSchema);
module.exports = System;