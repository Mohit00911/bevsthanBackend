const User = require("../models/users.js");
const Vendor = require("../models/vendors.js");

const otpGenerator = require("otp-generator");
const twilio = require("twilio");
const crypto = require("crypto-js");
const jwt = require("jsonwebtoken");
const { configDotenv } = require("dotenv");
configDotenv();
const generateToken = (userId) => {
  return jwt.sign({ userId }, "okjnlk", { expiresIn: "1h" });
};
const comparePasswords = (inputPassword, hashedPassword) => {
  // Hash the input password using the same algorithm and compare with the stored hashed password
  const hashedInputPassword = crypto
    .SHA256(inputPassword)
    .toString(crypto.enc.Hex);
  return hashedInputPassword === hashedPassword;
};

const signup = async (req, res) => {
  try {
    const {
      confirmPassword,
      email,
      firstName,
      lastName,
      password,
      accountType,
      phone,
    } = req.body;
    let UserModel;

    if (accountType === "user") {
      UserModel = User;
    } else if (accountType === "vendor") {
      UserModel = Vendor;
    } else {
      return res.status(400).json({ error: "Invalid account type" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }
    const existingUser = await UserModel.findOne({ email });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "User with this email already exists" });
    } else {
      // const hashedPassword = crypto.SHA256(password).toString(crypto.enc.Hex);
      const otp = otpGenerator.generate(6, {
        upperCase: false,
        specialChars: false,
        alphabets: false,
      });

      const newUser = new UserModel({
        firstName,
        lastName,
        email,
        // password: hashedPassword,
        password,
        accountType,
        confirmPassword,
        phone,
      });

      const savedUser = await newUser.save();

      res
        .status(201)
        .json({ message: "User created successfully", user: savedUser });
    }
  } catch (error) {
    console.error("Error signing up:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
const login = async (req, res) => {
  try {
    const { email, password, accountType } = req.body;

    let UserModel;

    if (accountType === "user") {
      UserModel = User;
    } else if (accountType === "vendor") {
      UserModel = Vendor;
    } else {
      return res.status(400).json({ error: "Invalid account type" });
    }

    const existingUser = await UserModel.findOne({ email });

    if (!existingUser) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const passwordsMatch = password == existingUser.password;

    if (!passwordsMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken(existingUser._id);

    const { firstName, lastName, _id } = existingUser;

    res.status(200).json({
      message: "Login successful",
      token,
      accountType,
      _id,
      user: {
        firstName,
        lastName,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getUser = async (req, res) => {
  try {
  
    const { token } = req.body;

    
    const user = await User.findOne({ _id: token});

    if (!user) {
   
      return res.status(404).json({ error: "User not found" });
    }

    // If the user is found, send the user details to the frontend
    res.status(200).json(user);
  } catch (error) {
    // If an error occurs during the process, handle it
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};



const updateUser = async (req, res) => {
  try {
   
    const { _id, firstName, email, lastName, phone, addressLine1, addressLine2, state,city,country, postalCode,about, specialRequests ,profilePic} = req.body;


    const user = await User.findById(_id);

    // Update user details
    user.firstName = firstName;
    user.email = email;
    user.lastName = lastName;
    user.phone = phone;
    user.addressLine1 = addressLine1;
    user.addressLine2 = addressLine2;
    user.state = state;
    user.postalCode = postalCode;
    user.specialRequests = specialRequests;
    user.about = about;
    user.city = city;
    user.country = country;
    user.profilePic = profilePic;
    // Save the updated user details
    await user.save();

    res.status(200).json({ message: 'User details updated successfully' });
  } catch (error) {
    console.error('Error updating user details:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = updateUser;

updateUser;
module.exports = {
  signup,
  login,
  updateUser,
  getUser
};
