import multer from "multer";

const storage = multer.memoryStorage(); // Store files in memory so we can send buffer to ImageKit

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, JPEG, and PNG are allowed."));
  }
};

export const uploadExam = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 10MB limit
  fileFilter
});

