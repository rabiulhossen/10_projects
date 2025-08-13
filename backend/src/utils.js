export function errorPayload(err) {
	if (!err) return 'unknown_error';
	if (err.response && err.response.data) return err.response.data;
	if (err.data) return err.data;
	return err.message || String(err);
}