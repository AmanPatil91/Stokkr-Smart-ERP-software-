'use client';

import { useState, useCallback } from 'react';

type UploadType = 'sales' | 'purchase';

type FileUploadAreaProps = {
    title: string;
    type: UploadType;
    onUploadSuccess: (fileDetails: any) => void;
    onRemove: () => void;
};

export default function FileUploadArea({ title, type, onUploadSuccess, onRemove }: FileUploadAreaProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const processFile = async (file: File) => {
        setError(null);
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Upload failed');
            }

            setUploadedFileName(file.name);
            onUploadSuccess(data);
        } catch (err: any) {
            setError(err.message);
            setUploadedFileName(null);
            onRemove();
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            processFile(file);
        }
    }, []);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    };

    const clearFile = () => {
        setUploadedFileName(null);
        setError(null);
        onRemove();
    };

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col h-full">
            <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>

            {error && (
                <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
                    ⚠️ {error}
                </div>
            )}

            {!uploadedFileName ? (
                <div
                    className={`flex-grow border-2 border-dashed rounded-xl flex flex-col justify-center items-center p-8 transition-colors ${isDragging
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100'
                        }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {isUploading ? (
                        <div className="flex flex-col items-center justify-center space-y-3">
                            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-600 font-medium">Uploading securely...</p>
                        </div>
                    ) : (
                        <div className="text-center group cursor-pointer" onClick={() => document.getElementById(`file-input-${type}`)?.click()}>
                            <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200 text-gray-400 group-hover:text-blue-500 group-hover:border-blue-300 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                </svg>
                            </div>
                            <p className="text-gray-800 font-semibold mb-1">Click or drag file to this area to upload</p>
                            <p className="text-gray-500 text-sm">Supported formats: .xls, .xlsx, .csv (Max 10MB)</p>

                            <input
                                id={`file-input-${type}`}
                                type="file"
                                className="hidden"
                                accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                                onChange={handleFileInput}
                            />
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-grow flex flex-col justify-center border-2 border-green-200 bg-green-50 rounded-xl p-6">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                </svg>
                            </div>
                            <div>
                                <p className="font-semibold text-green-900 truncate max-w-[200px]" title={uploadedFileName}>{uploadedFileName}</p>
                                <p className="text-sm text-green-700">Ready for processing</p>
                            </div>
                        </div>

                        <button
                            onClick={clearFile}
                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="Remove file"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
