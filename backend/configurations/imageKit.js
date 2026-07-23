import ImageKit from "imagekit";
import "dotenv/config";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

export const uploadToImageKit = (fileBuffer, fileName, folder) => {
  return new Promise((resolve, reject) => {
    imagekit.upload({
      file: fileBuffer,
      fileName: fileName,
      folder: folder // folder-wise storage
    }, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

export default imagekit;
