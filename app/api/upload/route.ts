import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

// Disable default body parser since we need to process multipart/form-data
export const config = {
    api: {
        bodyParser: false,
    },
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/csv', // .csv
];

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const type = formData.get('type') as string; // 'sales' or 'purchase'

        if (!file) {
            return NextResponse.json({ error: 'No file received.' }, { status: 400 });
        }

        if (file.size === 0) {
            return NextResponse.json({ error: 'File is empty.' }, { status: 400 });
        }

        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File size exceeds 10MB limit.' }, { status: 413 });
        }

        // Attempt to infer/validate extension just in case MIME is generic
        const ext = file.name.split('.').pop()?.toLowerCase();
        const isValidExt = ['xls', 'xlsx', 'csv'].includes(ext || '');

        if (!ALLOWED_MIME_TYPES.includes(file.type) && !isValidExt) {
            return NextResponse.json(
                { error: 'Invalid file format. Please upload an Excel (.xls/.xlsx) or CSV file.' },
                { status: 415 }
            );
        }

        // Create unique safe filename
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create safe upload directory if it doesn't exist
        const uploadDir = join(process.cwd(), '.tmp_uploads');
        try {
            await mkdir(uploadDir, { recursive: true });
        } catch (e: any) {
            if (e.code !== 'EEXIST') throw e;
        }

        const uniqueId = crypto.randomUUID();
        const safeFilename = `${type}_${uniqueId}.${ext}`;
        const destinationPath = join(uploadDir, safeFilename);

        // Save to disk securely
        await writeFile(destinationPath, buffer);

        return NextResponse.json(
            {
                message: 'File uploaded successfully',
                filename: file.name,
                storedPath: destinationPath,
                size: file.size,
                type: type
            },
            { status: 200 }
        );

    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: 'Failed to process file upload.' }, { status: 500 });
    }
}
