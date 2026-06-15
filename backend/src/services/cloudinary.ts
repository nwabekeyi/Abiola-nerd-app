import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
export async function uploadDocument(file: Express.Multer.File, folder: string) {
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, resource_type: 'auto' }, (err, result) => {
      if (err || !result) reject(err); else resolve({ url: result.secure_url, publicId: result.public_id });
    });
    Readable.from(file.buffer).pipe(stream);
  });
}
