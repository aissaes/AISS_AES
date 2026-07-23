import QRCode from "qrcode";

const generateQR = async (data) => {
     const qr = await QRCode.toDataURL(data);
     return qr;
}

export default generateQR;