import { AxiosError, isAxiosError } from 'axios';

/**
 * Return a meaningful error message to log
 */
export function getErrorMessage(error: Error): string {
  var msg = '';

  if (isAxiosError(error)) {
    msg += `${error.message} ${(error as AxiosError).response?.statusText}`;
    if ((error as AxiosError).response?.data) {
      msg += JSON.stringify((error as AxiosError).response?.data);
    }
    return msg;
  } else {
    msg = error.message;
  }

  return msg;
}
