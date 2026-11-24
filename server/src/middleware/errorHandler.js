import multer from 'multer';
import { HttpError } from '../utils/http.js';

export function notFound(_req, res) {
  res.status(404).json({ message: 'Route not found.' });
}

// Last middleware: turns every error into a JSON response. Stack traces are only logged on the server.
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'The photo must be 5 MB or smaller.' : 'The photo upload failed.';
    return res.status(400).json({ message });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'The request body is not valid JSON.' });
  }
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map((e) => e.message).join(' ');
    return res.status(400).json({ message });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'A value in the request has the wrong format.' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'That record already exists.' });
  }

  console.error(err);
  return res.status(500).json({ message: 'Something went wrong on the server. Please try again.' });
}
