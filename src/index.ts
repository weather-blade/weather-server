import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import apiRouter from './routes/api.route.js';
import { cors } from './middleware/cors.js';
import { notFound } from './middleware/notFound.js';
import { ErrorHandler } from './exceptions/ErrorHandler.js';

dotenv.config();

const app = express();

app.use(morgan('dev'));

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(compression());

app.use(cors);

app.use('/api', apiRouter);

app.use(ErrorHandler.handleError);

app.use(notFound);

const port = process.env.PORT || 8080;
app.listen(port, () => {
	console.log(`[server] Server is running at http://localhost:${port}`);
});
