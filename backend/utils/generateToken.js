import crypto from "crypto";

const generateSessionToken = () => {
  return crypto.randomBytes(16).toString("hex");
};

export default generateSessionToken;