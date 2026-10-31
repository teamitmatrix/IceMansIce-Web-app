// generateToken.js
const jwt = require("jsonwebtoken");

const secret = "your-super-secret-jwt-key-change-in-production"; // match config.jwt.secret in backend

const user = {
  id: "68b86fb6daa3d68ab816bd26", // _id of your inserted user
  email: "myadmin@example.com",
  role: "Admin",
  name: "Test Admin",
};

const token = jwt.sign(user, secret, { expiresIn: "1h" });

console.log("Bearer " + token);
