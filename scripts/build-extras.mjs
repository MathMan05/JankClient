import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const translationsDir = 'translations';
const distWebpageDir = 'dist/webpage'; // Base directory for webpage output
const distTranslationsDir = path.join(distWebpageDir, 'translations');

console.log('Running build extras script...');

try {
    fs.mkdirSync(distTranslationsDir, { recursive: true });
    console.log(`Ensured directory exists: ${distTranslationsDir}`);

    // --- Translations ---
    if (fs.existsSync(translationsDir)) {
        console.log(`Processing translations from: ${translationsDir}`);
        let langs = fs.readdirSync(translationsDir);
        langs = langs.filter((e) => e !== 'qqq.json' && e.endsWith('.json'));
        const langobj = {};
        for (const lang of langs) {
            const filePath = path.join(translationsDir, lang);
            try {
                const json = JSON.parse(fs.readFileSync(filePath).toString());
                const langCode = path.basename(lang, '.json');
                langobj[langCode] = json.readableName || langCode; // Use readableName or fallback
            } catch (parseError) {
                console.error(`Error parsing ${filePath}:`, parseError);
            }
        }

        // Write langs.js
        const langsJsPath = path.join(distTranslationsDir, 'langs.js');
        const langsJsContent = `const langs=${JSON.stringify(langobj)};\nexport { langs };`;
        fs.writeFileSync(langsJsPath, langsJsContent);
        console.log(`Generated ${langsJsPath}`);

        // Copy original translation files
        for (const lang of langs) {
            const sourcePath = path.join(translationsDir, lang);
            const destPath = path.join(distTranslationsDir, lang);
            fs.copyFileSync(sourcePath, destPath);
        }
        console.log(`Copied ${langs.length} translation JSON files to ${distTranslationsDir}`);
    } else {
         console.warn(`Translations directory ${translationsDir} not found, skipping.`);
    }


    // --- Commit Hash ---
    const getUpdatesPath = path.join(distWebpageDir, 'getupdates');
    try {
        // Ensure the directory exists before writing the file
        fs.mkdirSync(path.dirname(getUpdatesPath), { recursive: true });
        const revision = execSync('git rev-parse HEAD').toString().trim();
        fs.writeFileSync(getUpdatesPath, revision);
        console.log(`Wrote git revision ${revision} to ${getUpdatesPath}`);
    } catch (error) {
        console.warn('Could not get git revision:', error.message);
         // Ensure the directory exists even if git fails
        fs.mkdirSync(path.dirname(getUpdatesPath), { recursive: true });
        fs.writeFileSync(getUpdatesPath, 'unknown'); // Write placeholder
        console.log(`Wrote placeholder to ${getUpdatesPath}`);
    }

    console.log('Build extras script finished successfully.');

} catch (error) {
    console.error('Error during build extras script:', error);
    process.exit(1);
}