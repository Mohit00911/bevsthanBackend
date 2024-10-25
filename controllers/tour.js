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
  console.log(req.files);
  try {
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
      welcomeDrinks,
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

    // Function to upload and retrieve URLs of photos
    const uploadPhotos = async (photos) => {
      const uploadedPhotoUrls = [];
      if (!Array.isArray(photos)) {
        photos = [photos]; // Ensure photos is an array
      }

      for (const photo of photos) {
        if (photo && photo.path) {
          const uploadedPhoto = await cloudinary.uploader.upload(photo.path, {
            folder: 'tours',
          });
          uploadedPhotoUrls.push(uploadedPhoto.secure_url);
        }
      }
      return uploadedPhotoUrls;
    };

    // Process itineraries and upload photos (both siteSeenPhotos and carPhotos)
    const processItineraries = async (itineraries, siteSeenPhotoFiles, carPhotoFiles, mealPhotoFiles, hotelPhotoFiles) => {
      return Promise.all(itineraries.map(async (itinerary) => {
        let siteSeenPhotosUrls = [];
        let carPhotosUrls = [];
        let mealPhotosUrls = []; // Initialize mealPhotosUrls
        let hotelPhotosUrls = []; // For hotel photos
    
        // Upload site seen photos if they exist
        if (siteSeenPhotoFiles) {
          const siteFiles = Array.isArray(siteSeenPhotoFiles) ? siteSeenPhotoFiles : [siteSeenPhotoFiles];
          siteSeenPhotosUrls = await uploadPhotos(siteFiles);
        }
    
        // Upload car photos if they exist
        if (carPhotoFiles) {
          const carFiles = Array.isArray(carPhotoFiles) ? carPhotoFiles : [carPhotoFiles];
          carPhotosUrls = await uploadPhotos(carFiles);
        }
    
        // Upload meal photos if they exist
        if (mealPhotoFiles) {
          for (const category of Object.keys(mealPhotoFiles)) {
            for (const mealType of Object.keys(mealPhotoFiles[category])) {
              const mealFiles = Array.isArray(mealPhotoFiles[category][mealType]) 
                               ? mealPhotoFiles[category][mealType] 
                               : [mealPhotoFiles[category][mealType]];
              const mealPhotos = await uploadPhotos(mealFiles); // Upload meal photos
              mealPhotosUrls.push({
                type: mealType,
                photos: mealPhotos,
              });
            }
          }
        }
    
        // Upload hotel photos if they exist
        if (hotelPhotoFiles) {
          const hotelFiles = Array.isArray(hotelPhotoFiles) ? hotelPhotoFiles : [hotelPhotoFiles];
          hotelPhotosUrls = await uploadPhotos(hotelFiles);
        }
    
        return {
          ...itinerary,
          siteSeenPhotos: [
            ...(Array.isArray(itinerary.siteSeenPhotos) ? itinerary.siteSeenPhotos : []),
            ...siteSeenPhotosUrls
          ].filter(url => typeof url === 'string' && url.trim() !== ''),
          carName: itinerary.carName || "", // Include carName from itinerary
          carPhotos: [
            ...(Array.isArray(itinerary.carPhotos) ? itinerary.carPhotos : []),
            ...carPhotosUrls // Ensure all uploaded car photos are added
          ].filter(url => typeof url === 'string' && url.trim() !== ''),
          meals: mealPhotosUrls, // Include the processed meal photos
          hotelPhotos: [
            ...(Array.isArray(itinerary.hotelPhotos) ? itinerary.hotelPhotos : []),
            ...hotelPhotosUrls // Ensure all uploaded hotel photos are added
          ].filter(url => typeof url === 'string' && url.trim() !== ''),
        };
      }));
    };
    // Handle general tour image uploads
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
    const processTourItineraries = async (itineraries, siteSeenPhotos, carPhotos, mealPhotos, hotelPhotos) => {
      return await processItineraries(itineraries, siteSeenPhotos, carPhotos, mealPhotos, hotelPhotos);
    };

    // Parse itineraries for standard, deluxe, and premium tours
    let standardItineraries = JSON.parse(standardDetails)?.itineraries || [];
    let deluxeItineraries = JSON.parse(deluxeDetails)?.itineraries || [];
    let premiumItineraries = JSON.parse(premiumDetails)?.itineraries || [];

    if (req.files?.standardSiteSeenPhotos || req.files?.standardCarPhotos || req.files?.standardMealsPhotos || req.files?.standardHotelPhotos) {
      standardItineraries = await processTourItineraries(
        standardItineraries,
        req.files.standardSiteSeenPhotos,
        req.files.standardCarPhotos,
        req.files?.standardMealsPhotos,
        req.files?.standardHotelPhotos // Include hotel photos
      );
    }

    if (req.files?.deluxeSiteSeenPhotos || req.files?.deluxeCarPhotos || req.files?.deluxeMealsPhotos || req.files?.deluxeHotelPhotos) {
      deluxeItineraries = await processTourItineraries(
        deluxeItineraries,
        req.files.deluxeSiteSeenPhotos,
        req.files.deluxeCarPhotos,
        req.files?.deluxeMealsPhotos,
        req.files?.deluxeHotelPhotos // Include hotel photos
      );
    }

    if (req.files?.premiumSiteSeenPhotos || req.files?.premiumCarPhotos || req.files?.premiumMealsPhotos || req.files?.premiumHotelPhotos) {
      premiumItineraries = await processTourItineraries(
        premiumItineraries,
        req.files.premiumSiteSeenPhotos,
        req.files.premiumCarPhotos,
        req.files?.premiumMealsPhotos,
        req.files?.premiumHotelPhotos // Include hotel photos
      );
    }

    // Construct updated details objects
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

    // Add pricing directly to updated details
    updatedStandardDetails.pricing = JSON.parse(standardDetails).pricing;
    updatedDeluxeDetails.pricing = JSON.parse(deluxeDetails).pricing;
    updatedPremiumDetails.pricing = JSON.parse(premiumDetails).pricing;

    console.log(updatedStandardDetails);
    // Check if the tour already exists using the UUID
    let tour = await Tour.findOne({ uuid });

    if (tour) {
      // Update the existing tour
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
      tour.bannerImage = bannerImageUrl || tour.bannerImage;
      tour.images = imageUrls.length > 0 ? imageUrls : tour.images;
      tour.standardDetails = updatedStandardDetails;
      tour.deluxeDetails = updatedDeluxeDetails;
      tour.premiumDetails = updatedPremiumDetails;
      tour.knowBeforeYouGo = Array.isArray(knowBeforeYouGo) ? knowBeforeYouGo : [knowBeforeYouGo];
      tour.fixedDates = fixedDates;
      tour.openHours = openHours;
      tour.welcomeDrinks = welcomeDrinks;

      const updatedTour = await tour.save(); // Save the updated tour
      return res.status(200).json(updatedTour);
    } else {
      // Create a new tour
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
        bannerImage: bannerImageUrl || null,
        images: imageUrls.length > 0 ? imageUrls : [],
        standardDetails: updatedStandardDetails,
        deluxeDetails: updatedDeluxeDetails,
        premiumDetails: updatedPremiumDetails,
        knowBeforeYouGo: Array.isArray(knowBeforeYouGo) ? knowBeforeYouGo : [knowBeforeYouGo],
        fixedDates,
        openHours,
        welcomeDrinks,
      });
      const createdTour = await newTour.save();
      return res.status(201).json(createdTour);
    }
  } catch (error) {
    console.error('Error creating tour:', error);
    return res.status(500).json({ error: 'An error occurred while creating the tour.' });
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
    if (minPrice && maxPrice) {
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
    console.log("params", req.params)
    const tourId = req.params.tourId;

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
