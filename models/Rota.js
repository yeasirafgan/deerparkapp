//models/Rota.js

import mongoose from 'mongoose';

const rotaSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true, // Name of the rota (from the uploaded file)
      trim: true, // Trims whitespace from the start and end
    },
    weekStart: {
      type: Date,
      required: true, // Start date of the rota week
    },
    parsedData: [
      {
        staff: {
          type: String,
          default: 'Unknown', // Staff name
          trim: true, // Trims whitespace from the start and end
        },
        post: {
          type: String,
          default: 'N/A', // Post or position of the staff member
          trim: true, // Trims whitespace from the start and end
        },
        monday: {
          type: String,
          default: '',
          trim: true, // Trims whitespace from the start and end
        },
        tuesday: {
          type: String,
          default: '',
          trim: true, // Trims whitespace from the start and end
        },
        wednesday: {
          type: String,
          default: '',
          trim: true, // Trims whitespace from the start and end
        },
        thursday: {
          type: String,
          default: '',
          trim: true, // Trims whitespace from the start and end
        },
        friday: {
          type: String,
          default: '',
          trim: true, // Trims whitespace from the start and end
        },
        saturday: {
          type: String,
          default: '',
          trim: true, // Trims whitespace from the start and end
        },
        sunday: {
          type: String,
          default: '',
          trim: true, // Trims whitespace from the start and end
        },
      },
    ],
    // uploadedBy field has been removed
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

export default mongoose.models.Rota || mongoose.model('Rota', rotaSchema);
