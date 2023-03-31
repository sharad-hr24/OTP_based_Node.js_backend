const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require('jsonwebtoken');

const app = express();
const secretKey = env.SECRET_KEY;

// Configure bodyParser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configure CORS
app.use(cors());

// Connect to MongoDB
mongoose.connect("mongodb://localhost/myapp", { useNewUrlParser: true });

// Create a schema for the user profile
const profileSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  firstName: { type: String, required: false, maxlength: 40 },
  lastName: { type: String, required: false, maxlength: 40 },
  OTP: { type: String, required: false, maxlength: 6 },
  //TODO
  is_loggedIn: { type: Boolean, required: false },
  city: { type: String, required: false },
  state: { type: String, required: false },
  country: { type: String, required: false },
});

// Create a model for the user profile
const Profile = mongoose.model("Profile", profileSchema);

// Generate and return a 6-digit OTP
function generateOTP() {
  const digits = "0123456789";
  let OTP = "";
  for (let i = 0; i < 6; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }
  return OTP;
}

// This function provides State and Country in output for the city been providedin the input
function getStateCountry(City){
    const apiKey = 'YOUR_API_KEY';
    
    fetch(`https://api.opencagedata.com/geocode/v1/json?q=${City}&key=${apiKey}`)
      .then(response => response.json())
      .then(data => {
        const results = data.results[0];
        const country = results.components.country;
        const state = results.components.state;
        return [country, state];
      })
      .catch(error => console.error(error));
}

// Endpoint for generating OTP which will be used for Login process
app.post("/generateOTP", async (req, res) => {
  const { email } = req.body;

  // Check if user exists in the database
  let profile = await Profile.findOne({ email });

  // If user doesn't exist, create a new account
  if (!profile) {
    profile = new Profile({ email });
  }

  // Generate OTP and save it to the user's account
  const otp = generateOTP();
  profile.OTP = otp;
  await profile.save();

  // Print the OTP in the console
  console.log(`OTP for ${email}: ${otp}`);

  res.send({ message: "OTP generated successfully" });
});

// Endpoint for logging in
app.post("/login", async (req, res) => {
  const { email, otp } = req.body;

  // Check if user exists in the database
  const profile = await Profile.findOne({ email });

  if (!user) {
    res.status(404).send({ error: "User not found" });
  } else if (profile.OTP !== otp) {
    res.status(401).send({ error: "Invalid OTP" });
  } else {
    // Clear OTP from the user's account
    user.otp = null;
    user.is_loggedIn = true;
    await user.save();

    res.send({ message: "Login successful" });
  }
});

// API endpoint for retrieving the user's profile
app.get("/profile/:email", async (req, res) => {
  const { email } = req.params;
  const profile = await Profile.findOne({ email });
  if (!profile) {
    res.status(404).json({ message: "Profile not found" });
  } else if (!profile.is_loggedIn) {
    res.status(404).json({ message: "User logged out, try login again !" });
  } else {
    res.status(200).json(profile);
  }
});

// API endpoint for updating the user's profile
app.put('/profile/:email', async (req, res) => {
    const { email } = req.params;
    const { firstName, lastName, city, state, country } = req.body;
  
    // Validate the input fields
    if (!firstName || firstName.length > 40) {
      return res.status(400).json({ message: 'First name is required and must be less than 40 characters' });
    }
    if (!lastName || lastName.length > 40) {
      return res.status(400).json({ message: 'Last name is required and must be less than 40 characters' });
    }
  
    //Validate Location
    const [country_from_DB, state_from_DB] = getStateCountry(city);
    if (state!==state_from_DB) {
      return res.status(400).json({ message: 'Discrepency wiht the State Inserted' });
    }
    if (country!==country_from_DB) {
      return res.status(400).json({ message: 'Discrepency wiht the Country Inserted' });
    }
  
    // Saving in the Database
    const profile = await Profile.findOne({ email });
    
    profile.firstName =firstName;
    profile.lastName = lastName;
    profile.city = city;
    profile.state =state;
    profile.country =country;
    await profile.save();
  
    res.status(200).json({ message: 'Profile is updated' });
  
  });

// Endpoint for logging in
app.post("/logout", async (req, res) => {
    const { email} = req.body;
  
    // Check if user exists in the database
    const profile = await Profile.findOne({ email });
  
    if (!user) {
      res.status(404).send({ error: "User not found" });
    } else if (!profile.is_loggedIn) {
      res.status(401).send({ error: "User already logged out" });
    } else {
      user.is_loggedIn = false;
      await user.save();
  
      res.send({ message: "Logged Out successful" });
    }
  });
  
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
