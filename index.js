const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const multer = require('multer');

const wishlist = require('./controllers/wishlist.js')
const authRouter = require('./controllers/auth.js');
const tourController = require('./controllers/tour.js')
const categegories = require('./controllers/categories.js')
const attributes = require('./controllers/attributes.js')
// const imageUploader=require('./controllers/tour.js')
const imageUploader = require('./controllers/cloudinary.js')
const testimonials = require('./controllers/testimonials.js')
const contactUs = require('./controllers/contactUs.js')
const paymentController = require('./services/paymentService.js'
)
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cors = require('cors');
app.use(express.json({ limit: '50mb' }));
const port = process.env.PORT || 4000;
const uri = "mongodb+srv://rawat009111:fSQGtHMkkia3YhjZ@tours.qpddv9d.mongodb.net/?retryWrites=true&w=majority";
const mongoose = require('mongoose');
require('dotenv').config();
app.use(bodyParser.json({ limit: '70mb' }));
app.use(bodyParser.urlencoded({ limit: '70mb', extended: true }));
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


mongoose.connect(uri, {});
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'tours', // Cloudinary folder name
    allowed_formats: ['jpg', 'png', 'jpeg'], // Allowed formats
    transformation: [
      {
        quality: 'auto:low', // Automatically compress images with low quality
        fetch_format: 'auto', // Convert to the best format based on user device
      },
    ],
  },
});

// Create multer instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit for each file
});
const db = mongoose.connection;
db.on('error', (err) => {
  console.error('Error connecting to MongoDB:', err);
});
db.once('open', () => {
  console.log('Connected to MongoDB');
});
app.use(cors());
app.use(bodyParser.json());
app.post('/user/signup', authRouter.signup);
app.post('/user/login', authRouter.login);
app.post('/expert/signup', authRouter.vendorSignup);
app.post('/expert/login', authRouter.vendorLogin);
app.post('/api/createTours', upload.fields([
  { name: 'bannerImage', maxCount: 1 },  // Single file upload for banner image
  { name: 'images', maxCount: 10 },
  { name: 'standardSiteSeenPhotos', maxCount: 10 },   // Multiple file upload for photos
  { name: 'deluxeSiteSeenPhotos', maxCount: 10 },
  { name: 'premiumSiteSeenPhotos', maxCount: 10 },


  { name: "standardCarPhotos", maxCount: 50 },
  { name: "deluxeCarPhotos", maxCount: 50 },
  { name: "premiumCarPhotos", maxCount: 50 },


  { name: "premiumMealsPhotos", maxCount: 50 },
  { name: "standardMealsPhotos", maxCount: 50 },
  { name: "deluxeMealsPhotos", maxCount: 50 },
  { name: "standardHotelPhotos", maxCount: 50 },
  { name: "deluxeHotelPhotos", maxCount: 50 },
  { name: "premiumHotelPhotos", maxCount: 50 },



]), tourController.createTour);
app.delete('/api/deleteTour/:uuid', tourController.deleteTour);


app.post('/api/updateUser', authRouter.updateUser)
app.post('/api/getUser', authRouter.getUser)
app.post('/api/contactus', contactUs.submitContactForm);
app.post('/api/allTours', tourController.getAllTours);
app.post('/api/checkout', paymentController.checkout);
app.post('/api/paymentVerification', paymentController.paymentVerification);
app.post('/api/userBooking', paymentController.userBooking);
app.post('/api/getBookedUserDetails', paymentController.getBookedUserDetails);
app.post('/api/getBookedTours/:vendorId', paymentController.getBookedToursByVendor);
app.post('/api/updateTourStatus', paymentController.updateBookedToursByVendor);
app.post('/api/getBookedToursbyUser/:userId', paymentController.getBookedToursByUser);
// app.get('/api/tours/:location/:date', tourController.getToursByLocationDate);
app.post('/api/tours/:location/:date', tourController.getToursByFilter);
app.get('/api/getTestimonials', testimonials.getAllTestimonials);
app.post('/api/createTestimonial', testimonials.createTestimonial);
app.post('/api/vendorTours', tourController.getToursForVendor);
app.post('/api/updateTour/:tourId', tourController.updateTour);
app.get('/api/getTour/:tourId', tourController.getTourDetails);
app.get('/api/getkey', (req, res) => res.status(200).json("rzp_test_51M4AB2hSU08Ih"))
app.post('/uploadImage', imageUploader.imageUpload);
app.post('/api/addToWishlist', wishlist.addToWishlist);
app.get('/api/wishlist/:userId', wishlist.getWishlist);
app.post('/api/removeFromWishlist', wishlist.removeFromWishlist);
app.post('/api/categories', categegories.createCategories)
app.get('/api/categories', categegories.getCategories)
app.delete('/api/categories/:id', categegories.deleteCategory)

app.post('/api/attributes', attributes.createAttribute)
app.get('/api/attributes', attributes.getAttributes)
app.post('/api/attributes/:id/sub-attributes', attributes.addSubAttribute)
app.delete('/api/attributes/:attributeId/sub-attributes/:subAttributeId', attributes.deleteSubattribute)
app.delete('/api/attributes/:id', attributes.deleteAttribute)

app.get('/', (req, res) => {
  res.send('Hello, Express with MongoDB!');
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Server is running on port ${port}`);
});