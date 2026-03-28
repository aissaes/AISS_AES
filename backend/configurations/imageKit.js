import ImageKit from "imagekit";
import "dotenv/config";

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_WFeQX8UkftEzxi+FHlGACEOfj1k=",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "private_rj5r/x7luPhB2y5915FgN/m12nU=",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/LAzy/"
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