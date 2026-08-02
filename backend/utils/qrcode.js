import QRCode from "qrcode";

const generateQR=async(data)=>{
     const qr=await QRCode.toDataURL(data);

     console.log(qr);
     return qr;
}

export default generateQR;