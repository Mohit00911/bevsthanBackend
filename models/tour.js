const mongoose = require('mongoose');

const tourDetailsSchema = new mongoose.Schema({
  uuid: { type: String, default: null },
  name: { type: String, default: null },
  overview: { type: String, default: null },
  location: { type: String, default: null },
  duration: { type: String },
  transportation: { type: Boolean, default: false },
  groupSize: { type: String },
  availableDates: { type: String },
  departureDetails: { type: String },
  knowBeforeYouGo: [{ type: String }],
  additionalInfo: [{ type: String }],
  bannerImage: { type: String, default: null },
  images: [{ type: String }],

  // Fixed Dates details
  fixedDates: {
    enabled: { type: Boolean, default: false },
    seatsAvailable: { type: Number, default: 0 },
    priceChangePerPerson: { type: Number, default: 0 },
  },

  // Open Hours details
  openHours: {
    enabled: { type: Boolean, default: false },
    pricePerPerson: { type: Number, default: 0 },
    groupSize: { type: Number, default: 0 },
    maxPeople: { type: Number, default: 0 },
  },

  standardDetails: {
    price: { type: Number },
    cancellationPolicy: { type: String },
    highlights: [{ type: String }],
    whatsIncluded: [{ type: String }],
    whatsExcluded: [{ type: String }],
    inclusions: [{ type: String }],
    exclusions: [{ type: String }],
    itineraries: [
      {
        title: { type: String },
        duration: { type: String },
        meals: [{ type: String }],
        image: { type: String },
        description: { type: String },
        day: { type: Number },
        hotelName: { type: String },
        hotelUrl: { type: String },
        siteSeenPhotos: { type: [String], default: [] } ,
        managerName: { type: String },
        managerImage: { type: String },
      },
    ],
  },

  deluxeDetails: {
    price: { type: Number },
    cancellationPolicy: { type: String },
    highlights: [{ type: String }],
    whatsIncluded: [{ type: String }],
    whatsExcluded: [{ type: String }],
    inclusions: [{ type: String }],
    exclusions: [{ type: String }],
    itineraries: [
      {
        title: { type: String },
        duration: { type: String },
        meals: [{ type: String }],
        image: { type: String },
        description: { type: String },
        day: { type: Number },
        hotelName: { type: String },
        hotelUrl: { type: String },
        siteSeenPhotos: { type: [String], default: [] } ,
        managerName: { type: String },
        managerImage: { type: String },
      },
    ],
  },

  premiumDetails: {
    price: { type: Number },
    cancellationPolicy: { type: String },
    highlights: [{ type: String }],
    whatsIncluded: [{ type: String }],
    whatsExcluded: [{ type: String }],
    inclusions: [{ type: String }],
    exclusions: [{ type: String }],
    itineraries: [
      {
        title: { type: String },
        duration: { type: String },
        meals: [{ type: String }],
        image: { type: String },
        description: { type: String },
        day: { type: Number },
        hotelName: { type: String },
        hotelUrl: { type: String },
        siteSeenPhotos: { type: [String], default: [] } ,
        managerName: { type: String },
        managerImage: { type: String },
      },
    ],
  },

  createdAt: { type: Date, default: Date.now },
  status: { type: String },
  reviews: [{ text: String, email: String, comment: String }],
});

const Tour = mongoose.model('Tour', tourDetailsSchema);

module.exports = Tour;
