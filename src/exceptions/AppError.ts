export class AppError extends Error {
	public statusCode: number;
	public errors?: object;

	constructor(statusCode: number, message: string, errors: object | undefined = undefined) {
		super(message);
		this.statusCode = statusCode;
		this.errors = errors;
	}
}
