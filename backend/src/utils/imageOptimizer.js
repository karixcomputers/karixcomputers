import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

/**
 * Ia o imagine urcată, îi face resize la max 1200px, 
 * o convertește în .webp pentru viteză și șterge originalul.
 */
export const optimizeImage = async (file) => {
    if (!file) return null;

    const filePath = file.path;
    const extension = path.extname(file.originalname);
    const filename = file.filename.replace(extension, '.webp');
    const outputPath = path.join('uploads', filename);

    try {
        await sharp(filePath)
            .resize(1200, 1200, {
                fit: 'inside',
                withoutEnlargement: true 
            })
            .webp({ quality: 80 }) // Calitate excelentă, dimensiune mică
            .toFile(outputPath);

        // Ștergem fișierul original (cel mare/greu)
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return filename;
    } catch (error) {
        console.error("❌ Eroare la optimizarea Sharp:", error);
        // Dacă eșuează, returnăm măcar numele fișierului original să nu crape site-ul
        return file.filename;
    }
};