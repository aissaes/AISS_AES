import imagekit from "../../configurations/imageKit.js";

// --- IMAGE UPLOAD HANDLER ---
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded." });
    }

    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: "Invalid file format. Please upload a JPEG, PNG, or WEBP image." });
    }

    const uploadResponse = await imagekit.upload({
      file: req.file.buffer,
      fileName: req.file.originalname,
      folder: "/answer_scripts",
      useUniqueFileName: true
    });

    return res.status(200).json({
      success: true,
      message: "Image uploaded successfully",
      imageUrl: uploadResponse.url,
      fileId: uploadResponse.fileId
    });

  } catch (error) {
    console.error("ImageKit Upload Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to upload image to ImageKit"
    });
  }
};

// --- PDF UPLOAD HANDLER ---
export const uploadPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    // Security Check: Ensure the uploaded file is actually a PDF
    if (req.file.mimetype !== "application/pdf") {
      return res.status(400).json({ error: "Invalid file format. Please upload a PDF." });
    }

    const uploadResponse = await imagekit.upload({
      file: req.file.buffer,
      fileName: req.file.originalname,
      folder: "/teacher_materials",
      useUniqueFileName: true
    });

    return res.status(200).json({
      success: true,
      message: "PDF uploaded successfully",
      pdfUrl: uploadResponse.url,
      fileId: uploadResponse.fileId
    });

  } catch (error) {
    console.error("ImageKit PDF Upload Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to upload PDF to ImageKit"
    });
  }
};

// --- GET IMAGEKIT AUTH PARAMETERS FOR CLIENT-SIDE UPLOADS ---
export const getAuthenticationParameters = async (req, res) => {
  try {
    const { uploadType } = req.query;
    const authParams = imagekit.getAuthenticationParameters();

    let folder = "/general";
    if (uploadType === "materials") {
      folder = "/teacher_materials";
    }

    return res.status(200).json({
      ...authParams,
      publicKey: imagekit.options.publicKey || process.env.IMAGEKIT_PUBLIC_KEY,
      folder
    });
  } catch (error) {
    console.error("ImageKit Auth Parameters Error:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to generate ImageKit auth parameters"
    });
  }
};
