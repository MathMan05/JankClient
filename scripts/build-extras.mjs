import fs from 'node:fs/promises';
import path from 'node:path';
import { exec as execCb } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execCb);

const translationsDir = 'translations';
const distWebpageDir = 'dist/webpage';
const distTranslationsDir = path.join(distWebpageDir, 'translations');

export async function runBuildExtras() {
    await fs.mkdir(distWebpageDir, { recursive: true });
    await fs.mkdir(distTranslationsDir, { recursive: true });

    try {
        await fs.access(translationsDir);
        const dirents = await fs.readdir(translationsDir, { withFileTypes: true });
        const jsonFiles = dirents.filter(dirent => dirent.isFile() && dirent.name.endsWith('.json') && dirent.name !== 'qqq.json');

        const langobj = {};
        const copyPromises = [];
        const processPromises = [];

        for (const dirent of jsonFiles) {
            const lang = dirent.name;
            const filePath = path.join(translationsDir, lang);
            const langCode = path.basename(lang, '.json');
            const sourcePath = path.join(translationsDir, lang);
            const destPath = path.join(distTranslationsDir, lang);

            processPromises.push(
                fs.readFile(filePath)
                    .then(fileContent => {
                        const json = JSON.parse(fileContent.toString());
                        langobj[langCode] = json.readableName || langCode;
                        copyPromises.push(fs.copyFile(sourcePath, destPath));
                    })
                    .catch(() => {
                    })
            );
        }

        await Promise.all(processPromises);

        if (Object.keys(langobj).length > 0) {
            const langsJsPath = path.join(distTranslationsDir, 'langs.js');
            const langsJsContent = `const langs=${JSON.stringify(langobj)};\nexport { langs };`;
            await fs.writeFile(langsJsPath, langsJsContent);
        }

        if (copyPromises.length > 0) {
            await Promise.all(copyPromises);
        }

    } catch (err) {
        if (err.code === 'ENOENT') {
        } else {
            throw err;
        }
    }

    const getUpdatesPath = path.join(distWebpageDir, 'getupdates');
    try {
        const { stdout } = await exec('git rev-parse HEAD');
        const revision = stdout.trim();
        await fs.writeFile(getUpdatesPath, revision);
    } catch (error) {
        await fs.mkdir(path.dirname(getUpdatesPath), { recursive: true });
        await fs.writeFile(getUpdatesPath, 'unknown');
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    runBuildExtras().catch(err => {
        console.error("Build extras script failed when run directly:", err);
        process.exit(1);
    });
}