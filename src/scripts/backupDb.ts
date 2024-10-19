import child_process from 'node:child_process';
import util from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import { Auth, google } from 'googleapis';
import { configDotenv } from 'dotenv';

/**
 * Creates zip from sqlite database and uploads it to google drive
 */
export async function backupDb() {
	console.log('Starting database backup');

	configDotenv();

	const inputPath = './prisma/database.sqlite3';
	const today = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
	const outputPath = `./prisma/database.${today}.sqlite3.gz`;

	try {
		await zipFile(inputPath, outputPath);
		await uploadFile(outputPath);
	} catch (err) {
		console.error('Error occurred while trying to upload database backup: ', err);
	}

	fs.unlinkSync(outputPath);
}

async function zipFile(inputFilePath: string, outputFilePath: string) {
	const execPromise = util.promisify(child_process.exec);
	await execPromise(`gzip -c ${inputFilePath} > ${outputFilePath}`);
	console.log(`File "${inputFilePath}" has been gzipped to "${outputFilePath}"`);
}

async function uploadFile(filePath: string) {
	const auth = new Auth.GoogleAuth({
		keyFile: './SA_key.json',
		scopes: ['https://www.googleapis.com/auth/drive'],
	});

	const drive = google.drive({ version: 'v3', auth });

	const res = await drive.files.create({
		requestBody: {
			name: path.basename(filePath),
			mimeType: 'application/gzip',
			parents: [process.env.GDRIVE_FOLDER_ID!],
		},
		media: {
			mimeType: 'application/gzip',
			body: fs.createReadStream(filePath),
		},
	});

	console.log('File uploaded successfully');
	console.log(`File size: ${(fs.statSync(filePath).size / 1000000).toFixed(2)} MB`);
}
