const { connect } = require("mongoose");
const express = require('express');
const Tour = require("../models/tour");
const User = require("../models/users");
const multer = require('multer');
const app = express();

const cloudinary = require('cloudinary').v2;

// Middleware to parse JSON bodies
app.use(express.json());


const createTour = async (req, res) => {
  try {
    console.log("Request Body:", req.body);

    // Extracting tour data from request body
    const {
      uuid,
      name,
      overview,
      location,
      duration,
      groupSize,
      cancellationPolicy,
      transportation,
      availableDates,
      languages,
      departureDetails,
      additionalInfo,
      standardDetails,
      deluxeDetails,
      premiumDetails,
      knowBeforeYouGo,
      fixedDates,
      openHours,
    } = req.body;

    // Upload banner image to Cloudinary if available
    let bannerImageUrl = null;  
    if (req.files?.bannerImage) {
      const bannerImage = req.files.bannerImage[0];
      const uploadedBanner = await cloudinary.uploader.upload(bannerImage.path, {
        folder: 'tours',
      });
      bannerImageUrl = uploadedBanner.secure_url;
    }

    // Function to upload and retrieve URLs of site seen photos for itineraries
    const uploadSiteSeenPhotos = async (photos) => {
      if (!Array.isArray(photos)) {
        photos = [photos]; // Wrap single file object in an array
      }
      
      const uploadedPhotoUrls = [];
      for (const photo of photos) {
        if (photo && photo.path) { // Check if the photo object is valid
          const uploadedPhoto = await cloudinary.uploader.upload(photo.path, {
            folder: 'tours',
          });
          uploadedPhotoUrls.push(uploadedPhoto.secure_url);
        }
      }
      return uploadedPhotoUrls;
    };

    // Process itineraries and upload photos
    const processItineraries = async (itineraries, siteSeenPhotoFiles) => {
      return Promise.all(itineraries.map(async (itinerary, index) => {
        let siteSeenPhotosUrls = [];
        
        // If siteSeenPhotoFiles exists for the current itinerary
        if (siteSeenPhotoFiles && siteSeenPhotoFiles[index]) {
          const files = Array.isArray(siteSeenPhotoFiles[index]) ? siteSeenPhotoFiles[index] : [siteSeenPhotoFiles[index]];
          siteSeenPhotosUrls = await uploadSiteSeenPhotos(files);
        }
    
        return {
          ...itinerary,
          siteSeenPhotos: [
            ...(Array.isArray(itinerary.siteSeenPhotos) ? itinerary.siteSeenPhotos : []),
            ...siteSeenPhotosUrls
          ].filter(url => typeof url === 'string' && url.trim() !== ''),
        };
      }));
    };
    
    let imageUrls = [];
    if (req.files?.images) {
      const photos = req.files.images;
      for (let photo of photos) {
        const uploadedPhoto = await cloudinary.uploader.upload(photo.path, {
          folder: 'tours',
        });
        imageUrls.push(uploadedPhoto.secure_url);
      }
    }

    let standardItineraries = JSON.parse(standardDetails)?.itineraries || [];
    let deluxeItineraries = JSON.parse(deluxeDetails)?.itineraries || [];
    let premiumItineraries = JSON.parse(premiumDetails)?.itineraries || [];

    if (req.files?.standardSiteSeenPhotos) {
      standardItineraries = await processItineraries(standardItineraries, req.files.standardSiteSeenPhotos);
    }

    if (req.files?.deluxeSiteSeenPhotos) {
      deluxeItineraries = await processItineraries(deluxeItineraries, req.files.deluxeSiteSeenPhotos);
    }

    if (req.files?.premiumSiteSeenPhotos) {
      premiumItineraries = await processItineraries(premiumItineraries, req.files.premiumSiteSeenPhotos);
    }

    const updatedStandardDetails = {
      ...JSON.parse(standardDetails),
      itineraries: standardItineraries,
    };

    const updatedDeluxeDetails = {
      ...JSON.parse(deluxeDetails),
      itineraries: deluxeItineraries,
    };

    const updatedPremiumDetails = {
      ...JSON.parse(premiumDetails),
      itineraries: premiumItineraries,
    };
   
    // Check if the tour already exists using the UUID
    let tour = await Tour.findOne({ uuid });

    if (tour) {
      // If the tour exists, update the existing tour
      tour.name = name;
      tour.overview = overview;
      tour.location = location;
      tour.duration = duration;
      tour.groupSize = groupSize;
      tour.cancellationPolicy = cancellationPolicy;
      tour.transportation = transportation === 'true';
      tour.availableDates = availableDates;
      tour.languages = Array.isArray(languages) ? languages : [languages];
      tour.departureDetails = departureDetails;
      tour.additionalInfo = Array.isArray(additionalInfo) ? additionalInfo : [additionalInfo];
      tour.bannerImage = bannerImageUrl || tour.bannerImage; // Only update if a new image is uploaded
      tour.images = imageUrls.length > 0 ? imageUrls : tour.images; // Update images only if new ones are provided
      tour.standardDetails = updatedStandardDetails;
      tour.deluxeDetails = updatedDeluxeDetails;
      tour.premiumDetails = updatedPremiumDetails;
      tour.knowBeforeYouGo = Array.isArray(knowBeforeYouGo) ? knowBeforeYouGo : [knowBeforeYouGo];
      tour.fixedDates = fixedDates;
      tour.openHours = openHours;

      const updatedTour = await tour.save(); // Save the updated tour
      return res.status(200).json(updatedTour);
    } else {
      // Create a new tour if it does not exist
      const newTour = new Tour({
        uuid,
        name,
        overview,
        location,
        duration,
        groupSize,
        cancellationPolicy,
        transportation: transportation === 'true',
        availableDates,
        languages: Array.isArray(languages) ? languages : [languages],
        departureDetails,
        additionalInfo: Array.isArray(additionalInfo) ? additionalInfo : [additionalInfo],
        bannerImage: bannerImageUrl,
        images: imageUrls,
        standardDetails: updatedStandardDetails,
        deluxeDetails: updatedDeluxeDetails,
        premiumDetails: updatedPremiumDetails,
        knowBeforeYouGo: Array.isArray(knowBeforeYouGo) ? knowBeforeYouGo : [knowBeforeYouGo],
        fixedDates: fixedDates,
        openHours: openHours,
      });

      const savedTour = await newTour.save(); // Save the new tour
      return res.status(201).json(savedTour);
    }
  } catch (error) {
    console.error('Error creating/updating tour:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error });
  }
};

const deleteTour = async (req, res) => {
  try {
    const { uuid } = req.params; // Get UUID from request parameters
console.log(uuid)
    // Check if the tour exists
    const deletedTour = await Tour.findOneAndDelete({ uuid });

    if (!deletedTour) {
      return res.status(404).json({ error: 'Tour not found' });
    }

    // Respond with a success message
    res.status(200).json({ message: 'Tour deleted successfully' });
  } catch (error) {
    console.error('Error deleting tour:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error });
  }
};


const getAllTours = async (req, res) => {
  try {
    const { location, tourType, minPrice, maxPrice, durations } = req.body;
// console.log(location) 
    const tours = await Tour.find();
    const filteredTours = tours.filter((tour) => tour.status !== "disabled");

    let filteredToursByLocationAndName = filteredTours;
    if (location) {
    
      filteredToursByLocationAndName = filteredTours.filter((tour) => {
        const tourLocation = tour.location && tour.location.toLowerCase();
        // console.log(tourLocation)
        const tourName = tour.name && tour.name.toLowerCase();
        // console.log(tourName)
        const matchesLocation = tourLocation === location.toLowerCase();
        console.log(matchesLocation)
        const searchTermWords = location.toLowerCase().split(" ");
        const matchesSearchTerm = searchTermWords.every((word) =>
          tourName.includes(word)
        );
        return matchesLocation || matchesSearchTerm;
      });
    }

    let filteredToursByType = filteredToursByLocationAndName;
    if (tourType && tourType.length > 0) {
      filteredToursByType = filteredToursByLocationAndName.filter((tour) => {
        return tourType.every((tourTypeItem) => {
          return tour.tourType.includes(tourTypeItem);
        });
      });
    }
    

    let filteredToursByPrice = filteredToursByType;
    if (minPrice && maxPrice ) {
      filteredToursByPrice = filteredToursByType.filter((tour) => {
        const tourPrice = parseFloat(tour.cost[0].standardPrice);
        return (
          !isNaN(tourPrice) && tourPrice >= minPrice && tourPrice <= maxPrice
        );
      });
    }
 
    let filteredToursByDuration = filteredToursByPrice;
    if (durations && durations.length > 0) {
      filteredToursByDuration = filteredToursByPrice.filter((tour) => {
        const tourDurationNumbers = tour.duration.match(/\d+/g);
        const tourDurationNumber = tourDurationNumbers
          ? parseInt(tourDurationNumbers.join(""), 10)
          : 0;

        return durations.every((duration) => {
          return tourDurationNumber >= duration;
        });
      });
    }

    res.status(200).json(filteredToursByDuration);
  } catch (error) {
    console.error("Error fetching tours:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getToursForVendor = async (req, res) => {
  try {
    const { vendorId } = req.body;
    const tours = await Tour.find({ vendor: vendorId });
    res.status(200).json(tours);
  } catch (error) {
    console.error("Error fetching vendor tours:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const getTourDetails = async (req, res) => {
  try {
    const tourId = req.params.tourId;
 e
    const tours = await Tour.find({ uuid: tourId });
   
    res.status(200).json(tours) 
  
  } catch (error) {
    console.error("Error fetching vendor tours:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const updateTour = async (req, res) => {
  try {
    const { tourId } = req.params;
    const { comment, email } = req.body;

    if (comment) {
      const existingTour = await Tour.findOne({ uuid: tourId });

      if (!existingTour) {
        return res.status(404).json({ error: "Tour not found" });
      }

    
      existingTour.reviews.push(req.body);

      const updatedTour = await existingTour.save();
      return res.json({ message: "Tour updated successfully", tour: updatedTour });
    }

    const updatedTour = await Tour.findOneAndUpdate(
      { uuid: tourId },
      req.body,
      { new: true } // This option ensures that the updated document is returned
    );

    if (!updatedTour) {
      return res.status(404).json({ error: "Tour not found" });
    }

    return res.json({ message: "Tour updated successfully", tour: updatedTour });
  } catch (error) {
    console.error("Error updating tour:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getToursByLocationDate = async (req, res) => {
  try {
    const { location, date } = req.params;

    const tours = await Tour.find();
    const filteredTours = tours.filter((tour) => tour.status !== "disabled");

    const filteredToursByLocationAndName = filteredTours.filter((tour) => {
      const tourLocation = tour.location && tour.location.toLowerCase();
      const tourName = tour.name && tour.name.toLowerCase();
      const matchesLocation = tourLocation === location.toLowerCase();
      const searchTermWords = location.toLowerCase().split(" ");
      const matchesSearchTerm = searchTermWords.every((word) =>
        tourName.includes(word)
      );
      return matchesLocation || matchesSearchTerm;
    });

    res.json(filteredToursByLocationAndName);
  } catch (error) {
    console.error("Error updating tour:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getToursByFilter = async (req, res) => {
  try {
    const { location, date } = req.params;

    const { tourType, minPrice, maxPrice, durations } = req.body;

    const tours = await Tour.find();
    const filteredTours = tours.filter((tour) => tour.status !== "disabled");

    const filteredToursByLocation = filteredTours.filter(
      (tour) =>
        tour.location && tour.location.toLowerCase() === location.toLowerCase()
    );

    const filteredToursByType = filteredToursByLocation.filter((tour) => {
      return tourType.every((tourTypeItem) => {
        return tour.tourType.includes(tourTypeItem);
      });
    });

    const filteredToursByPrice = filteredToursByType.filter((tour) => {
      const tourPrice = parseFloat(tour.cost);
      return (
        !isNaN(tourPrice) && tourPrice >= minPrice && tourPrice <= maxPrice
      );
    });

    const filteredToursByDuration = filteredToursByPrice.filter((tour) => {
      const tourDurationNumbers = tour.duration.match(/\d+/g);
      const tourDurationNumber = tourDurationNumbers ? parseInt(tourDurationNumbers.join(""), 10) : 0;
  
      return durations.every((duration) => {
          return tourDurationNumber >= duration;
      });
  })
  

    res.json(filteredToursByDuration);
  } catch (error) {
    console.error("Error updating tour:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};


module.exports = {
  createTour,
  getAllTours,
  getToursForVendor,
  getTourDetails,
  updateTour,
  deleteTour,
  // getToursByLocationDate,
  getToursByFilter,
  // imageUpload
};
