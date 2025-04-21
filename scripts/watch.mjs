import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { rimraf } from 'rimraf';
import swc from '@swc/core';
import { runBuildExtras } from './build-extras.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const srcDir = path.resolve(projectRoot, 'src');
const distDir = path.resolve(projectRoot, 'dist');

const compilableExtensions = ['.ts', '.js', '.mjs', '.cjs'];

let buildTimeout;
let isBuilding = false;

async function compileFileWithSwc(inputFile, outputFile) {
  try {
    const options = {
      filename: inputFile,
      sourceMaps: true,
    };
    const output = await swc.transformFile(inputFile, options);
    await fs.mkdir(path.dirname(outputFile), { recursive: true });
    const writePromises = [fs.writeFile(outputFile, output.code)];
    if (output.map) {
      const mapFileName = `${path.basename(outputFile)}.map`;
      const finalCode = `${output.code}\n//# sourceMappingURL=${mapFileName}`;
      writePromises[0] = fs.writeFile(outputFile, finalCode);
      writePromises.push(fs.writeFile(`${outputFile}.map`, output.map));
    }
    await Promise.all(writePromises);
  } catch (error) {
    console.error(`SWC compilation failed for ${inputFile}: ${error}`);
    throw error;
  }
}

async function processDirectory(inputPath, outputPath) {
  let entries;
  try {
    entries = await fs.readdir(inputPath, { withFileTypes: true });
  } catch (readdirError) {
    console.error(`Failed to read directory ${inputPath}: ${readdirError}`);
    throw readdirError;
  }

  const tasks = [];
  for (const entry of entries) {
    const currentInputPath = path.join(inputPath, entry.name);
    const currentOutputPath = path.join(outputPath, entry.name);

    if (entry.isDirectory()) {
      tasks.push(processDirectory(currentInputPath, currentOutputPath));
    } else {
      const ext = path.extname(entry.name);
      if (compilableExtensions.includes(ext)) {
        const outputJsPath = currentOutputPath.replace(/\.\w+$/, '.js');
        tasks.push(compileFileWithSwc(currentInputPath, outputJsPath));
      } else {
        tasks.push((async () => {
          try {
            await fs.mkdir(path.dirname(currentOutputPath), { recursive: true });
            await fs.copyFile(currentInputPath, currentOutputPath);
          } catch (copyError) {
            console.error(`Failed to copy ${currentInputPath} to ${currentOutputPath}: ${copyError}`);
          }
        })());
      }
    }
  }

  try {
    await Promise.all(tasks);
  } catch (processingError) {
    console.error(`Error processing tasks in directory ${inputPath}: ${processingError}`);
    throw processingError;
  }
}

async function runBuildSequence(isInitial = false) {
  if (isBuilding) {
    console.info("Build already in progress, skipping...");
    return;
  }
  isBuilding = true;
  const overallStartTime = performance.now();
  if (!isInitial) {
    console.info("Change detected, running build sequence...");
  }

  try {
    console.info(`Starting step: prebuild... (rimraf ${distDir})`);
    const rimrafStartTime = performance.now();
    await rimraf(distDir);
    const rimrafEndTime = performance.now();
    console.info(`Step "prebuild" completed successfully in ${((rimrafEndTime - rimrafStartTime) / 1000).toFixed(2)}s.`);

    console.info("Starting parallel steps: build:compile and build:extras...");
    const parallelStartTime = performance.now();

    const compilePromise = (async () => {
      const stepName = 'build:compile';
      const stepStartTime = performance.now();
      console.info(`Starting step: ${stepName}... (Using @swc/core)`);
      try {
        await processDirectory(srcDir, distDir);
        const stepEndTime = performance.now();
        console.info(`Step "${stepName}" completed successfully in ${((stepEndTime - stepStartTime) / 1000).toFixed(2)}s.`);
      } catch (err) {
        const stepEndTime = performance.now();
        console.error(`Step "${stepName}" failed after ${((stepEndTime - stepStartTime) / 1000).toFixed(2)}s.`);
        throw err;
      }
    })();

    const extrasPromise = (async () => {
      const stepName = 'build:extras';
      const stepStartTime = performance.now();
      console.info(`Starting step: ${stepName}... (Running imported function)`);
      try {
        await runBuildExtras();
        const stepEndTime = performance.now();
        console.info(`Step "${stepName}" completed successfully in ${((stepEndTime - stepStartTime) / 1000).toFixed(2)}s.`);
      } catch (err) {
        const stepEndTime = performance.now();
        console.error(`Step "${stepName}" failed after ${((stepEndTime - stepStartTime) / 1000).toFixed(2)}s.`);
        throw err;
      }
    })();

    await Promise.all([compilePromise, extrasPromise]);

    const parallelEndTime = performance.now();
    console.info(`Parallel steps (compile & extras) finished in ${((parallelEndTime - parallelStartTime) / 1000).toFixed(2)}s.`);

    const overallEndTime = performance.now();
    console.info(`Full build sequence completed successfully in ${((overallEndTime - overallStartTime) / 1000).toFixed(2)}s.`);

  } catch (error) {
    const overallEndTime = performance.now();
    console.error(`Build sequence failed overall after ${((overallEndTime - overallStartTime) / 1000).toFixed(2)}s.`);
  } finally {
    isBuilding = false;
  }
}

console.info("Performing initial build sequence...");
await runBuildSequence(true);

console.info(`Watching for changes in ${srcDir}...`);
try {
  const watcher = fs.watch(srcDir, { recursive: true });
  for await (const event of watcher) {
    if (event.filename) {
      clearTimeout(buildTimeout);
      buildTimeout = setTimeout(() => runBuildSequence(false), 200);
    } else {
      clearTimeout(buildTimeout);
      buildTimeout = setTimeout(() => runBuildSequence(false), 200);
    }
  }
} catch (err) {
  console.error(`Watcher error: ${err}`);
  process.exit(1);
}